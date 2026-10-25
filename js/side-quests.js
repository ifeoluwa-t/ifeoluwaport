/* Side-Quests playground: an auto-scrolling, draggable row plus hover/tap story cards. Movement is transform-only. No libraries. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // ---------- Illustrations: scattered over the page, draggable, each with its own sound ----------
  var audio = null;
  function ac() {
    if (!audio) { var C = window.AudioContext || window.webkitAudioContext; if (C) audio = new C(); }
    if (audio && audio.state === 'suspended') audio.resume();
    return audio;
  }
  function tone(f, t0, dur, type, vol, f2) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t0, dur, vol, f1, f2, q) {
    var c = ac(); if (!c) return;
    var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource(); s.buffer = buf;
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1;
    var t = c.currentTime + t0;
    f.frequency.setValueAtTime(f1, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  var SOUNDS = {
    music: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.25, 'triangle', 0.22); }); },
    book: function () { noise(0, 0.16, 0.5, 3500, 1500, 0.8); noise(0.18, 0.14, 0.4, 3000, 1200, 0.8); },
    volley: function () { [0, 0.22, 0.38].forEach(function (t, i) { tone(190 - i * 20, t, 0.16, 'sine', 0.45 - i * 0.12, 55); }); },
    camera: function () { noise(0, 0.04, 0.6, 5000, 0, 0.7); tone(1800, 0, 0.03, 'square', 0.08); noise(0.1, 0.05, 0.5, 3500, 0, 0.7); },
    cake: function () { [392, 392, 440, 392, 523, 494].forEach(function (f, i) { tone(f, i * 0.2 + (i > 1 ? 0.05 : 0), i === 1 ? 0.12 : 0.22, 'triangle', 0.22); }); },
    pill: function () { for (var i = 0; i < 7; i++) noise(i * 0.045 + Math.random() * 0.02, 0.03, 0.3, 4200 + Math.random() * 1800, 0, 2); },
    art: function () { noise(0, 0.45, 0.35, 700, 3200, 0.6); tone(880, 0.3, 0.5, 'sine', 0.15); tone(1320, 0.36, 0.45, 'sine', 0.1); },
    baton: function () { noise(0, 0.28, 0.5, 400, 1800, 0.9); tone(320, 0.3, 0.05, 'square', 0.18, 140); }
  };

  var illos = Array.prototype.slice.call(document.querySelectorAll('.sq2-illo'));
  var layer = document.querySelector('.sq2-illos');
  var gallery = document.querySelector('.sq2-gallery');
  var galleryRow = document.querySelector('.sq2-row');

  // Default spots: only the empty blue bands of the landing screen, never on a photo.
  // "top" = between the nav and the photos, "bottom" = just below the photos.
  function place() {
    if (!layer || !gallery || !galleryRow) return;
    illos.forEach(function (el) {
      if (el.hasAttribute('data-moved')) return;
      var x = parseFloat(el.getAttribute('data-x')), y = parseFloat(el.getAttribute('data-y'));
      var top = el.getAttribute('data-band') === 'bottom'
        ? gallery.offsetTop + galleryRow.offsetTop + galleryRow.offsetHeight + y
        : y;
      el.style.left = (x * (layer.clientWidth - el.offsetWidth) / 100) + 'px';
      el.style.top = top + 'px';
    });
  }
  place();
  window.addEventListener('resize', place);
  window.addEventListener('load', place);
  setTimeout(place, 600);

  illos.forEach(function (el) {
    var sx = 0, sy = 0, ox = 0, oy = 0, dragged = false, down = false;
    el.addEventListener('pointerdown', function (e) {
      down = true; dragged = false; sx = e.clientX; sy = e.clientY;
      var r = el.getBoundingClientRect(), lr = layer.getBoundingClientRect();
      ox = r.left - lr.left; oy = r.top - lr.top;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragged && Math.abs(dx) + Math.abs(dy) < 6) return;
      dragged = true; el.classList.add('is-held'); el.setAttribute('data-moved', '');
      var lr = layer.getBoundingClientRect();
      var x = Math.max(0, Math.min(layer.clientWidth - el.offsetWidth, ox + dx));
      var y = Math.max(0, Math.min(layer.clientHeight - el.offsetHeight, oy + dy));
      el.style.left = x + 'px'; el.style.top = y + 'px';
    });
    function up() { down = false; el.classList.remove('is-held'); }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', function () {
      if (dragged) { dragged = false; return; }  // that was a drag, not a tap
      var kind = el.getAttribute('data-illo');
      var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (SOUNDS[kind]) SOUNDS[kind]();
      if (reduce.matches) return;
      el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop');
      setTimeout(function () { el.classList.remove('is-pop'); }, 1200);
      if (kind === 'music') {
        ['♪', '♫', '♪'].forEach(function (ch, i) {
          var n = document.createElement('span');
          n.className = 'sq2-note'; n.textContent = ch;
          n.style.left = (cx - 8 + i * 14) + 'px'; n.style.top = cy + 'px';
          document.body.appendChild(n);
          var an = n.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translate(' + (i - 1) * 40 + 'px,-90px) rotate(' + (i - 1) * 25 + 'deg)', opacity: 0 }], { duration: 1100 + i * 150, easing: 'ease-out' });
          an.onfinish = function () { n.remove(); };
        });
      } else if (kind === 'cake' || kind === 'volley' || kind === 'pill' || kind === 'art' || kind === 'baton') {
        burst(cx, cy);
      }
    });
    // keep the page from scrolling away while an illo is held on touch screens
    el.addEventListener('touchmove', function (e) { if (down) e.preventDefault(); }, { passive: false });
  });

  var cursor = null;
  var boost = 1;

  // Confetti pop where a tile is tapped or clicked.
  function burst(x, y) {
    if (reduce.matches || !document.body.animate) return;
    var cols = ['#ffd23f', '#ff6b5a', '#b8f53a', '#ffffff', '#0052ff'];
    for (var i = 0; i < 16; i++) {
      var p = document.createElement('span');
      var size = 6 + Math.random() * 8;
      p.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + (Math.random() > 0.5 ? size : size * 0.45) +
        'px;border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';background:' + cols[i % cols.length] + ';pointer-events:none;z-index:90;';
      document.body.appendChild(p);
      var ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 110;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30;
      var anim = p.animate([
        { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + (dy + 70) + 'px)) scale(0.6) rotate(' + (Math.random() * 540 - 270) + 'deg)', opacity: 0 }
      ], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(p);
    }
  }

  // The rows speed up while the page is being scrolled, then settle back.
  (function () {
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var d = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (!reduce.matches) boost = Math.min(5, boost + d * 0.05);
    }, { passive: true });
    (function decay() {
      boost = 1 + (boost - 1) * 0.94;
      requestAnimationFrame(decay);
    })();
  })();

  // A "drag" bubble that follows the mouse over the gallery.
  (function () {
    var gallery = document.querySelector('.sq2-gallery');
    if (!gallery || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || reduce.matches) return;
    cursor = document.createElement('div');
    cursor.className = 'sq2-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = 'drag';
    document.body.appendChild(cursor);
    var rows = gallery.querySelector('.sq2-rows');
    rows.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      cursor.style.transform = 'translate(' + (e.clientX + 16) + 'px,' + (e.clientY + 16) + 'px)';
      cursor.classList.add('is-on');
    });
    rows.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
  })();

  function setUpRow(row) {
    var track = row.querySelector('.sq2-track');
    if (!track) return;
    var dir = parseFloat(row.getAttribute('data-dir')) || -1;          // -1: moves left, 1: moves right
    var speed = parseFloat(row.getAttribute('data-speed')) || 22;      // px per second
    var seeds = Array.prototype.slice.call(track.children);
    var loopWidth = 0, offset = 0, dragging = false, paused = false, inView = true, moved = false;

    function wrap(v) { return loopWidth > 0 ? ((v % loopWidth) + loopWidth) % loopWidth : v; }
    function apply() { track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)'; }

    function build() {
      Array.prototype.slice.call(track.querySelectorAll('[data-clone]')).forEach(function (n) { n.remove(); });
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var w = seeds.reduce(function (s, el) { return s + el.getBoundingClientRect().width + gap; }, 0);
      loopWidth = w;
      var copies = Math.max(2, Math.ceil((row.clientWidth * 2) / w) + 1);
      for (var i = 0; i < copies; i++) {
        seeds.forEach(function (el) {
          var c = el.cloneNode(true);
          c.setAttribute('data-clone', '');
          c.setAttribute('aria-hidden', 'true');
          c.setAttribute('tabindex', '-1');
          track.appendChild(c);
        });
      }
    }

    if (reduce.matches) {
      // Manual scroll only: native overflow scrolling, no clones, no motion.
      track.style.transform = 'none';
      return;
    }

    build();
    offset = dir < 0 ? 0 : wrap(loopWidth * 0.4);
    apply();
    window.addEventListener('resize', function () { build(); offset = wrap(offset); apply(); });
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(row);

    var last = performance.now();
    (function tick(now) {
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (inView && !dragging && !paused && loopWidth > 0) {
        offset = wrap(offset - dir * speed * boost * dt);
        apply();
      }
      requestAnimationFrame(tick);
    })(last);

    // Drag / swipe sideways; resumes on release.
    var startX = 0, startOffset = 0, lastX = 0, lastT = 0, velocity = 0, momentum = null;
    row.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      if (momentum) { cancelAnimationFrame(momentum); momentum = null; }
      startX = lastX = e.clientX; startOffset = offset; lastT = performance.now(); velocity = 0;
      row.classList.add('is-dragging');
      if (cursor) cursor.textContent = 'grab';
      try { row.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    row.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 6) moved = true;
      offset = wrap(startOffset - (e.clientX - startX));
      apply();
      var now = performance.now(), d = now - lastT;
      if (d > 0) { velocity = -((e.clientX - lastX) / d) * 16; lastX = e.clientX; lastT = now; }
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      row.classList.remove('is-dragging');
      if (cursor) cursor.textContent = 'drag';
      if (!moved) burst(e.clientX, e.clientY);
      if (Math.abs(velocity) > 0.3) {
        (function glide() {
          offset = wrap(offset + velocity); apply();
          velocity *= 0.94;
          momentum = Math.abs(velocity) > 0.3 ? requestAnimationFrame(glide) : null;
        })();
      }
    }
    row.addEventListener('pointerup', end);
    row.addEventListener('pointercancel', end);
    row.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  Array.prototype.slice.call(document.querySelectorAll('.sq2-row')).forEach(setUpRow);

  // ---------- Story: hover/tap/focus a highlighted word to show its quest card ----------
  var pop = document.getElementById('sq2-pop');
  var terms = Array.prototype.slice.call(document.querySelectorAll('.sq2-term'));
  var current = null, popTimer = null;

  function showPop(term) {
    clearTimeout(popTimer);
    var tpl = document.getElementById('sq2-q-' + term.getAttribute('data-quest'));
    if (!pop || !tpl) return;
    if (current && current !== term) current.setAttribute('aria-expanded', 'false');
    current = term;
    term.setAttribute('aria-expanded', 'true');
    pop.textContent = '';
    pop.appendChild(tpl.content.cloneNode(true));
    pop.hidden = false;
    var host = pop.offsetParent || pop.parentElement;
    var hb = host.getBoundingClientRect(), tb = term.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = tb.left - hb.left + tb.width / 2 - w / 2;
    left = Math.max(0, Math.min(left, host.clientWidth - w));
    var above = tb.top - hb.top - h - 10;
    var top = above >= -80 ? above : tb.bottom - hb.top + 10; // flip below if there is no room above
    if (window.innerWidth < 700) top = tb.bottom - hb.top + 10;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    void pop.offsetWidth;
    pop.classList.add('is-open');
  }
  function hidePop() {
    clearTimeout(popTimer);
    if (!pop) return;
    pop.classList.remove('is-open');
    if (current) current.setAttribute('aria-expanded', 'false');
    current = null;
    popTimer = setTimeout(function () { pop.hidden = true; }, 200);
  }
  function hideSoon() { clearTimeout(popTimer); popTimer = setTimeout(hidePop, 220); }

  terms.forEach(function (term) {
    term.setAttribute('aria-expanded', 'false');
    term.addEventListener('mouseenter', function () { showPop(term); });
    term.addEventListener('mouseleave', hideSoon);
    term.addEventListener('focus', function () { showPop(term); });
    term.addEventListener('blur', hideSoon);
    term.addEventListener('click', function (e) {
      e.stopPropagation();
      if (current === term && pop.classList.contains('is-open') && window.matchMedia('(hover: none)').matches) hidePop();
      else showPop(term);
    });
  });
  if (pop) {
    pop.addEventListener('mouseenter', function () { clearTimeout(popTimer); });
    pop.addEventListener('mouseleave', hideSoon);
  }
  document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target)) hidePop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePop(); });

  // ---------- Now-playing bar: prev / play-pause / next, one song per genre ----------
  (function () {
    var root = document.getElementById('sq2-music');
    if (!root) return;
    var SONGS = [
      ['Did You See', 'J Hus', '3rk6_Ax0mQo'],
      ['I Like Me Better', 'Lauv', 'BcqxLCWn-CE'],
      ['Drive', 'Black Coffee & David Guetta', 'vu1QsEUVLQs'],
      ['Rapid Fire', 'Cruel Santino', 'hMuFO9nhtfA'],
      ['Space Song', 'Beach House', 'RBtlPT23PTM'],
      ['Levitating', 'Dua Lipa', 'TUVcZfQe-Kw'],
      ['In The End', 'Linkin Park', 'eVTXPUF4Oz4'],
      ['Levels', 'Avicii', '_ovdm2yX4MA'],
      ['Way Maker', 'Sinach', 'QM8jQHE5AAk'],
      ['Last Last', 'Burna Boy', '421w1j87fEM']
    ];
    var titleEl = document.getElementById('sq2-song-title');
    var artistEl = document.getElementById('sq2-song-artist');
    var playBtn = document.getElementById('sq2-play');
    var player = null, current = 0, apiLoading = false, queued = null, playing = false;

    function show() {
      titleEl.textContent = SONGS[current][0];
      artistEl.textContent = SONGS[current][1];
    }
    function setPlaying(on) {
      playing = on;
      root.classList.toggle('is-playing', on);
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }
    function loadApi(cb) {
      if (window.YT && window.YT.Player) return cb();
      queued = cb;
      if (apiLoading) return;
      apiLoading = true;
      window.onYouTubeIframeAPIReady = function () { if (queued) queued(); };
      var t = document.createElement('script');
      t.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(t);
    }
    function start(i) {
      current = (i + SONGS.length) % SONGS.length;
      show();
      var id = SONGS[current][2];
      if (player && player.loadVideoById) { player.loadVideoById(id); setPlaying(true); return; }
      loadApi(function () {
        if (player) { player.loadVideoById(SONGS[current][2]); return; }
        player = new YT.Player('sq2-yt', {
          videoId: SONGS[current][2],
          width: '200', height: '200',
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: function (e) { e.target.playVideo(); },
            onStateChange: function (e) {
              if (e.data === 0) start(current + 1);                  // ended: next song
              else if (e.data === 1 || e.data === 3) setPlaying(true);
              else if (e.data === 2) setPlaying(false);
            },
            onError: function () { start(current + 1); }              // not playable: skip on
          }
        });
      });
    }
    playBtn.addEventListener('click', function () {
      if (!player) { start(current); return; }                       // first press loads the player
      if (playing) player.pauseVideo(); else player.playVideo();
    });
    document.getElementById('sq2-next').addEventListener('click', function () { start(current + 1); });
    document.getElementById('sq2-prev').addEventListener('click', function () { start(current - 1); });
    show();
  })();
})();
