/* Events page: tap a card to open its details in place (one open at a time). */
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.ev-item'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setOpen(item, open) {
    var btn = item.querySelector('.ev-toggle');
    var panel = item.querySelector('.ev-detail');
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
  }

  items.forEach(function (item) {
    item.querySelector('.ev-toggle').addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');
      items.forEach(function (other) { if (other !== item) setOpen(other, false); });
      setOpen(item, willOpen);
      if (willOpen) {
        item.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'nearest' });
      }
    });
  });

  // Photo slideshows (e.g. FBI Africa Meetup): the images alternate while the card is
  // hovered (mouse) or open (tap); otherwise it rests on the first image.
  items.forEach(function (item) {
    var box = item.querySelector('[data-slides]');
    if (!box) return;
    var slides = Array.prototype.slice.call(box.querySelectorAll('.ev-slide'));
    if (slides.length < 2 || reduce.matches) return;
    var delay = parseInt(box.getAttribute('data-interval'), 10) || 1800;
    var hovering = false, current = 0, timer = null;

    function show(i) {
      slides[current].classList.remove('is-current');
      current = i;
      slides[current].classList.add('is-current');
    }
    function active() { return hovering || item.classList.contains('is-open'); }
    function tick() {
      if (!active()) { stop(); show(0); return; }
      show((current + 1) % slides.length);
    }
    function start() { if (!timer) timer = setInterval(tick, delay); }
    function stop() { clearInterval(timer); timer = null; }

    item.addEventListener('mouseenter', function () { hovering = true; start(); });
    item.addEventListener('mouseleave', function () {
      hovering = false;
      if (!item.classList.contains('is-open')) { stop(); show(0); }
    });
    item.querySelector('.ev-toggle').addEventListener('click', function () {
      if (item.classList.contains('is-open')) start();
      else if (!hovering) { stop(); show(0); }
    });
  });

  // Video card (Onchain Festival): nothing loads until the viewer taps the play icon
  // (or the "Play the video" button). It then plays with sound and native controls.
  items.forEach(function (item) {
    var box = item.querySelector('[data-video]');
    if (!box) return;
    var video = box.querySelector('video');
    var btn = item.querySelector('[data-play-video]');
    var toggle = item.querySelector('.ev-toggle');
    var started = false;

    function start() {
      if (!item.classList.contains('is-open')) toggle.click(); // open the card first
      started = true;
      video.muted = false;
      video.controls = true;
      var p = video.play();
      if (p && p.then) p.then(function () { box.classList.add('is-playing'); }).catch(function () {
        // Some browsers refuse sound on autoplay: fall back to muted, controls let them unmute.
        video.muted = true;
        video.play().then(function () { box.classList.add('is-playing'); }).catch(function () {});
      });
    }
    function reset() {
      if (!started) return;
      started = false;
      video.pause();
      video.currentTime = 0;
      video.controls = false;
      box.classList.remove('is-playing');
    }

    // Before the first play, a tap on the thumbnail means "play". Once playing, the
    // native controls own the clicks and they must not close the card.
    box.addEventListener('click', function (e) {
      if (started) { e.stopPropagation(); return; }
      // Closed card: the thumbnail just opens the card. Play is offered on the video once open.
      if (!item.classList.contains('is-open')) return;
      e.preventDefault();
      e.stopPropagation();
      start();
    }, true);
    box.addEventListener('click', function (e) { if (started) e.stopPropagation(); });

    if (btn) btn.addEventListener('click', function () { if (!started) start(); else if (video.paused) video.play(); else video.pause(); });
    video.addEventListener('ended', reset);
    new MutationObserver(function () { if (!item.classList.contains('is-open')) reset(); })
      .observe(item, { attributes: true, attributeFilter: ['class'] });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    items.forEach(function (item) { setOpen(item, false); });
  });
})();
