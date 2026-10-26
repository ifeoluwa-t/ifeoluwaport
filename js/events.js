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

  function activate(item, focus) {
    if (item.classList.contains('is-open')) return;
    items.forEach(function (it, k) {
      var on = it === item;
      var wasOpen = it.classList.contains('is-open');
      it.classList.toggle('is-open', on);
      var t = it.querySelector('.ev-toggle');
      t.setAttribute('aria-expanded', on ? 'true' : 'false');
      t.tabIndex = on ? -1 : 0;
      if (wasOpen && !on) { stories[k].stop(); resetVideo(it); }
      if (on) stories[k].start();
    });
    if (focus) item.querySelector('.ev-toggle').focus({ preventScroll: true });
    if (!wide.matches) {
      setTimeout(function () {
        var top = item.getBoundingClientRect().top;
        if (top < 70 || top > window.innerHeight * 0.5) {
          window.scrollTo({ top: window.scrollY + top - 84, behavior: reduce.matches ? 'auto' : 'smooth' });
        }
      }, 120);
    }
  }

  // Desktop mouse: once the pointer leaves the whole accordion, every panel closes.
  var leaveTimer;
  function closeAll() {
    items.forEach(function (it, k) {
      if (!it.classList.contains('is-open') || it.querySelector('.ev-video.is-playing')) return;
      it.classList.remove('is-open');
      var t = it.querySelector('.ev-toggle');
      t.setAttribute('aria-expanded', 'false');
      t.tabIndex = 0;
      stories[k].stop();
      resetVideo(it);
    });
  }
  acc.addEventListener('mouseleave', function () {
    if (!wide.matches || !canHover.matches) return;
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
      if (!wide.matches || !canHover.matches || item.classList.contains('is-open')) return;
      intent = setTimeout(function () { activate(item); }, 150);
    });
    item.addEventListener('mouseleave', function () { clearTimeout(intent); });
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
