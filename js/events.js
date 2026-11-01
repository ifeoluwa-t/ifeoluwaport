/* Events page: horizontal accordion. One panel is open at a time; opening it starts the
   photo story (progress bars + captions from each photo's alt) in step with the text. */
(function () {
  var acc = document.getElementById('ev-acc');
  if (!acc) return;
  var items = Array.prototype.slice.call(acc.querySelectorAll('.ev-item'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wide = window.matchMedia('(min-width: 900px)');
  var canHover = window.matchMedia('(hover: hover)');
  var STEP = 2600;

  var stories = items.map(function (item) {
    var box = item.querySelector('[data-slides]');
    var cap = item.querySelector('.ev-cap');
    var slides = box ? Array.prototype.slice.call(box.querySelectorAll('.ev-slide')) : [];
    var bars = Array.prototype.slice.call(item.querySelectorAll('.ev-bars i'));
    var s = { i: 0, timer: null, paused: false };

    function caption() {
      if (!box || !cap) return;
      cap.classList.add('is-swap');
      setTimeout(function () {
        cap.textContent = slides[s.i].getAttribute('alt') || '';
        cap.classList.remove('is-swap');
      }, 220);
    }
    function paint() {
      slides.forEach(function (el, k) { el.classList.toggle('is-current', k === s.i); });
      bars.forEach(function (b, k) {
        b.classList.remove('on');
        b.classList.toggle('done', k < s.i);
      });
      if (bars[s.i] && !reduce.matches) {
        bars[s.i].style.setProperty('--dur', STEP + 'ms');
        void bars[s.i].offsetWidth;
        bars[s.i].classList.add('on');
      }
    }
    function go(k) {
      if (!slides.length) return;
      s.i = (k + slides.length) % slides.length;
      paint();
      caption();
      arm();
    }
    function arm() {
      clearTimeout(s.timer);
      if (reduce.matches || s.paused || !item.classList.contains('is-open') || document.hidden) return;
      s.timer = setTimeout(function () { go(s.i + 1); }, STEP);
    }
    s.start = function () { s.i = 0; paint(); if (cap && box) cap.textContent = slides[0].getAttribute('alt') || ''; arm(); };
    s.stop = function () { clearTimeout(s.timer); s.i = 0; slides.forEach(function (el, k) { el.classList.toggle('is-current', k === 0); }); bars.forEach(function (b) { b.classList.remove('on', 'done'); }); };
    s.go = go;
    s.arm = arm;

    if (box) {
      box.addEventListener('click', function (e) {
        if (!item.classList.contains('is-open')) return;
        var r = box.getBoundingClientRect();
        go(e.clientX - r.left < r.width / 3 ? s.i - 1 : s.i + 1);
      });
      box.addEventListener('mouseenter', function () { s.paused = true; clearTimeout(s.timer); bars[s.i] && bars[s.i].classList.remove('on'); bars[s.i] && bars[s.i].classList.add('done'); });
      box.addEventListener('mouseleave', function () { s.paused = false; bars[s.i] && bars[s.i].classList.remove('done'); paint(); arm(); });
    }
    return s;
  });

  function resetVideo(item) { if (item._resetVideo) item._resetVideo(); }

  // A row only counts as "hovered" when the mouse really moved: a page that scrolls under a resting pointer (our own scroll
  // into view) must not open or close cards by itself.
  var lastMove = 0;
  document.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') lastMove = performance.now(); }, { passive: true });
  function moved() { return performance.now() - lastMove < 350; }

  var header = document.getElementById('site-header');
  function navClear() { return (header ? header.getBoundingClientRect().bottom : 56) + 18; }   // just below the sticky nav

  // One place that opens or closes a card, so the class, both buttons' aria-expanded and the photo story always agree.
  function setOpen(item, on) {
    var k = items.indexOf(item);
    var was = item.classList.contains('is-open');
    item.classList.toggle('is-open', on);
    var t = item.querySelector('.ev-toggle'), x = item.querySelector('.ev-close');
    t.setAttribute('aria-expanded', on ? 'true' : 'false');
    t.tabIndex = on ? -1 : 0;
    if (x) { x.setAttribute('aria-expanded', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; }
    if (was && !on) { stories[k].stop(); resetVideo(item); }
    if (on && !was) stories[k].start();
  }

  // Smoothly bring the opening card fully into view, just below the sticky nav. The card's final position is worked out up
  // front (a card above it that is closing shrinks the page), so there is one smooth scroll rather than a jump at the end.
  function bringIntoView(item, prevOpen) {
    var smooth = reduce.matches ? 'instant' : 'smooth';
    var clear = navClear(), finalTop, target;
    if (wide.matches) {
      finalTop = item.getBoundingClientRect().top;
      if (prevOpen && items.indexOf(prevOpen) < items.indexOf(item)) {
        finalTop -= Math.max(0, prevOpen.getBoundingClientRect().height - prevClosedH(prevOpen));
      }
      target = openFinalHeight(item);
    } else {
      // stacked rows: the open height depends on the text, so wait for the card to finish opening and use its real size
      var r = item.getBoundingClientRect();
      finalTop = r.top; target = r.height;
    }
    if (finalTop >= clear - 2 && finalTop + target <= window.innerHeight - 8) return;       // already fully visible
    window.scrollTo({ top: Math.max(0, window.scrollY + finalTop - clear), behavior: smooth });
  }
  function prevClosedH(it) {      // the height of a closed row
    var tg = it.querySelector('.ev-toggle');
    return tg ? tg.getBoundingClientRect().height + 2 * parseFloat(getComputedStyle(it.querySelector('.ev-pic')).marginTop || 10) : 116;
  }
  function openFinalHeight(it) {  // the height the open card will have once it has finished growing
    var probe = parseFloat(getComputedStyle(it.querySelector('.ev-stage')).gridTemplateRows.split(' ').pop());
    var val = getComputedStyle(acc.closest('.ev-section')).getPropertyValue('--ev-open-h');
    var tmp = document.createElement('div');
    tmp.style.cssText = 'position:absolute;visibility:hidden;height:' + val.trim() + ';width:0';
    acc.closest('.ev-section').appendChild(tmp);
    var h = tmp.getBoundingClientRect().height;
    tmp.remove();
    return h || probe || 590;
  }

  function activate(item, focus, how) {
    if (item.classList.contains('is-open')) return;
    var prevOpen = items.filter(function (it) { return it.classList.contains('is-open'); })[0] || null;
    items.forEach(function (it) { setOpen(it, it === item); });
    if (focus) item.querySelector('.ev-toggle').focus({ preventScroll: true });
    // A card opened by resting the mouse on it stays put (a scroll would slide a different row under the pointer);
    // clicks, taps, the keyboard and links bring it fully into view.
    if (how !== 'hover') setTimeout(function () { bringIntoView(item, prevOpen); }, wide.matches ? 60 : (reduce.matches ? 60 : 800));
  }

  function closeItem(item, returnFocus) {
    if (!item.classList.contains('is-open')) return;
    setOpen(item, false);
    if (returnFocus) item.querySelector('.ev-toggle').focus({ preventScroll: true });
  }

  // Desktop mouse: once the pointer leaves the whole accordion, every panel closes.
  var leaveTimer;
  function closeAll() {
    items.forEach(function (it) {
      if (!it.classList.contains('is-open') || it.querySelector('.ev-video.is-playing')) return;
      setOpen(it, false);
    });
  }
  acc.addEventListener('mouseleave', function () {
    if (!wide.matches || !canHover.matches || !moved()) return;
    leaveTimer = setTimeout(closeAll, 250);
  });
  acc.addEventListener('mouseenter', function () { clearTimeout(leaveTimer); });
  // Touch / small screens: tapping anywhere outside the cards returns the page to its default.
  document.addEventListener('click', function (e) {
    if (wide.matches && canHover.matches) return;
    if (e.target.closest && e.target.closest('.ev-item')) return;
    closeAll();
  });

  items.forEach(function (item, k) {
    var toggle = item.querySelector('.ev-toggle');
    toggle.tabIndex = item.classList.contains('is-open') ? -1 : 0;
    toggle.addEventListener('click', function () { activate(item); });
    var closeBtn = item.querySelector('.ev-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { closeItem(item, true); });
    toggle.addEventListener('keydown', function (e) {
      var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (e.key === 'Home') d = -k;
      else if (e.key === 'End') d = items.length - 1 - k;
      if (d === undefined) return;
      e.preventDefault();
      activate(items[Math.max(0, Math.min(items.length - 1, k + d))], true);
    });
    // Desktop mouse: resting on a strip opens it after a brief moment.
    var intent;
    item.addEventListener('mouseenter', function () {
      if (!wide.matches || !canHover.matches || item.classList.contains('is-open') || !moved()) return;
      intent = setTimeout(function () { activate(item, false, 'hover'); }, 150);
    });
    item.addEventListener('mouseleave', function () { clearTimeout(intent); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = items.filter(function (it) { return it.classList.contains('is-open'); })[0];
    if (open) closeItem(open, true);
  });

  document.addEventListener('visibilitychange', function () {
    items.forEach(function (item, k) { if (item.classList.contains('is-open')) stories[k].arm(); });
  });

  // Video card (Onchain Festival): nothing loads until the viewer taps play.
  items.forEach(function (item) {
    var box = item.querySelector('[data-video]');
    if (!box) return;
    var video = box.querySelector('video');
    var btn = item.querySelector('[data-play-video]');
    var started = false;

    function start() {
      started = true;
      video.muted = false;
      video.controls = true;
      var p = video.play();
      if (p && p.then) p.then(function () { box.classList.add('is-playing'); }).catch(function () {
        video.muted = true;
        video.play().then(function () { box.classList.add('is-playing'); }).catch(function () {});
      });
    }
    item._resetVideo = function () {
      if (!started) return;
      started = false;
      video.pause();
      video.currentTime = 0;
      video.controls = false;
      box.classList.remove('is-playing');
    };
    box.addEventListener('click', function (e) {
      if (!item.classList.contains('is-open') || started) return;
      e.preventDefault();
      start();
    });
    if (btn) btn.addEventListener('click', function () { if (!started) start(); else if (video.paused) video.play(); else video.pause(); });
    video.addEventListener('ended', item._resetVideo);
  });

  // Deep link: events.html#fbi-africa-meetup opens that panel.
  var hash = location.hash.slice(1);
  var target = hash && document.getElementById(hash);
  if (target && target.classList.contains('ev-item')) activate(target);
})();
