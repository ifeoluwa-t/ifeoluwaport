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
  var galleryRow = document.querySelector('.sqw-stage');

  // Default spots: only the empty blue bands of the landing screen, never on a photo.
  // "top" = between the nav and the photos, "bottom" = just below the photos.
  function place() {
    if (!layer || !gallery || !galleryRow) return;
    illos.forEach(function (el) {
      if (el.hasAttribute('data-moved')) return;
      var x = parseFloat(el.getAttribute('data-x')), y = parseFloat(el.getAttribute('data-y'));
      var top = el.getAttribute('data-band') === 'bottom'
        ? gallery.offsetTop + galleryRow.offsetHeight * 0.8 + y
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

  // ---------- Lightbox: click a picture to see it large ----------
  var lb = null, lbImg = null, lbReturn = null;
  function openLightbox(img) {
    if (!img) return;
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'sq2-lb';
      lb.hidden = true;
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.setAttribute('aria-label', 'Picture');
      lbImg = document.createElement('img');
      lb.appendChild(lbImg);
      lb.addEventListener('click', closeLightbox);
      document.body.appendChild(lb);
    }
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    lbReturn = document.activeElement;
    lb.hidden = false;
    void lb.offsetWidth;
    lb.classList.add('is-open');
  }
  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.classList.remove('is-open');
    setTimeout(function () { lb.hidden = true; }, reduce.matches ? 0 : 200);
    if (lbReturn && lbReturn.focus) lbReturn.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });

  // ---------- Ferris wheel gallery (port of the 21st.dev "Ferris Wheel Gallery") ----------
  // Ten pictures ride a wheel; the one at the top is "on view" and shown beside it, at its own
  // true shape. The section pins while the page scrolls, and scrolling turns the wheel one picture
  // at a time. The wheel can also be dragged (that scrolls the page by the same amount).
  (function () {
    var root = document.getElementById('sqw');
    if (!root) return;
    var mount = root.querySelector('.sqw-mount');
    var data = Array.prototype.slice.call(root.querySelectorAll('.sqw-data li')).map(function (li) {
      return { title: li.getAttribute('data-title'), src: li.getAttribute('data-src'), alt: li.getAttribute('data-alt'),
               w: +li.getAttribute('data-w') || 1, h: +li.getAttribute('data-h') || 1 };
    });
    var n = data.length;
    if (!n) return;
    var step = 360 / n, EASE = 0.1;
    var shown = -1, angle = 0, running = false, dragging = false, suppress = 0;

    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

    // ----- build -----
    var rim = '';
    for (var k = 0; k < 24; k++) {
      rim += '<span class="sqw-light" style="left:' + (50 + Math.sin(k * Math.PI / 12) * 50) + '%;top:' + (50 - Math.cos(k * Math.PI / 12) * 50) + '%"></span>';
    }
    var cars = '';
    data.forEach(function (d, i) {
      var a = -i * step * Math.PI / 180;
      cars += '<span class="sqw-spoke" style="transform:rotate(' + (-90 - i * step) + 'deg)"></span>' +
        '<div class="sqw-anchor" style="left:' + (50 + Math.sin(a) * 50) + '%;top:' + (50 - Math.cos(a) * 50) + '%"><div class="sqw-counter">' +
        '<div class="sqw-hang"><div class="sqw-pendulum"><span class="sqw-rope"></span>' +
        '<button type="button" class="sqw-car" aria-label="View ' + d.title + ', ' + (i + 1) + ' of ' + n + '"><span class="sqw-thumb"><img src="' + d.src + '" alt="" draggable="false" decoding="async"></span></button>' +
        '</div></div></div></div>';
    });
    mount.innerHTML =
      '<div class="sqw-grid" role="region" aria-roledescription="carousel" aria-label="Side-quests gallery">' +
        '<div class="sqw-left">' +
          '<div class="sqw-stage">' +
            '<div class="sqw-square">' +
              '<svg class="sqw-stand" viewBox="0 0 400 400" fill="none" aria-hidden="true"><path d="M200 184 146 362M200 184 254 362M124 362H276" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' +
              '<div class="sqw-wheel"><span class="sqw-ring2"></span>' + rim + cars + '</div>' +
              '<div class="sqw-hub" aria-hidden="true"><i>SPIN<br><span class="sqw-the">THE</span><br>WHEEL</i></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sqw-detail">' +
          '<div class="sqw-photo"><span class="sqw-photo-a"><img alt="" draggable="false"></span><span class="sqw-photo-b"><img alt="" draggable="false"></span></div>' +
          '<h3 class="sqw-name"></h3>' +
        '</div>' +
        '<span class="sqw-live" role="status" aria-live="polite"></span>' +
      '</div>';

    var wheel = mount.querySelector('.sqw-wheel');
    var counters = Array.prototype.slice.call(mount.querySelectorAll('.sqw-counter'));
    var carsEl = Array.prototype.slice.call(mount.querySelectorAll('.sqw-car'));
    var stage = mount.querySelector('.sqw-stage');
    var photo = mount.querySelector('.sqw-photo');
    var imgA = mount.querySelector('.sqw-photo-a img'), imgB = mount.querySelector('.sqw-photo-b img');
    var spanA = imgA.parentNode, spanB = imgB.parentNode;
    var name = mount.querySelector('.sqw-name'), live = mount.querySelector('.sqw-live');

    // Phones and tablets: the big picture is sized to fill whatever is left of the first screen, above the
    // music bar, so the whole gallery (wheel, name and picture) is seen without scrolling.
    var smallMQ = window.matchMedia('(max-width: 899px)');
    function fit() {
      if (!smallMQ.matches) { photo.style.removeProperty('--fit-h'); return; }
      var top = photo.getBoundingClientRect().top + window.scrollY;
      photo.style.setProperty('--fit-h', Math.max(150, window.innerHeight - top - 18) + 'px');
    }
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    window.addEventListener('load', fit);

    function paint(a) {
      wheel.style.transform = 'rotate(' + a + 'deg)';
      for (var i = 0; i < counters.length; i++) counters[i].style.transform = 'rotate(' + (-a) + 'deg)';
    }
    function showDetail(i) {
      var d = data[i], prev = shown;
      imgB.src = imgA.src || d.src;
      imgA.src = d.src;
      imgA.alt = d.alt || d.title;
      photo.style.setProperty('--ar', (d.w / d.h).toFixed(4));
      name.textContent = d.title;
      carsEl.forEach(function (c, k) {
        c.classList.toggle('is-on', k === i);
        if (k === i) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
      if (prev >= 0 && !reduce.matches && spanA.animate) {
        spanA.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-out' });
        spanB.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: 'ease-out' });
      }
      if (prev >= 0 && window.fx) window.fx.sound('tile', i);   // each tile has its own note (only if the visitor switched sound on)
      shown = i;
      live.textContent = (i + 1) + ' of ' + n + ': ' + d.title;
    }

    // ----- endless turning: page scroll, drag + fling, and a gentle idle drift all spin it, either way -----
    // On phones the picture that is chosen is the one at the bottom of the wheel (nearest the big picture);
    // on larger screens it is the one at the top.
    function off() { return smallMQ.matches ? n / 2 : 0; }
    var tAngle = 0, vel = 0, lastY = window.scrollY, idleAt = 0, visible = false, hover = false;
    var PX_PER_PICTURE = 320, DRIFT = 7;                      // scroll distance per picture; idle drift in degrees per second
    var lastT = performance.now();

    function frame(now) {
      var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (!dragging) {
        if (Math.abs(vel) > 0.02) { tAngle += vel; vel *= 0.94; idleAt = now; }          // fling coasting to a stop
        else if (!reduce.matches && !hover && now - idleAt > 1200) tAngle += DRIFT * dt;  // never fully stops
      }
      angle += (tAngle - angle) * (reduce.matches ? 1 : (dragging ? 0.35 : 0.14));
      paint(angle);
      var idx = ((Math.round(angle / step) + off()) % n + n) % n;
      if (idx !== shown) showDetail(idx);
      if (running) requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); } }
    function stop() { running = false; }
    function turnTo(i) {                                       // shortest way round to picture i
      var cur = ((Math.round(tAngle / step) + off()) % n + n) % n, d = i - cur;
      if (d > n / 2) d -= n; else if (d < -n / 2) d += n;
      vel = 0; tAngle = Math.round(tAngle / step) * step + d * step; idleAt = performance.now();
    }
    // (scrolling the page no longer turns the wheel; it turns by dragging, the arrow keys, tapping a picture, and its own slow drift)
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { rootMargin: '150px' }).observe(root);
    } else { visible = true; start(); }
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    stage.addEventListener('pointerleave', function () { hover = false; });

    if (smallMQ.matches) { tAngle = angle = ((n - off()) % n) * step; }   // start on the first picture, at the bottom
    showDetail(0); paint(0); fit(); setTimeout(fit, 400);
    carsEl.forEach(function (c, i) { c.addEventListener('click', function () { if (performance.now() >= suppress) turnTo(i); }); });
    root.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        vel = 0; tAngle = Math.round(tAngle / step) * step + (e.key === 'ArrowRight' ? step : -step); idleAt = performance.now();
      }
    });

    // ----- drag: grab the wheel and turn it either way, as far as you like; it keeps coasting when let go -----
    var drag = null;
    function pointerAngle(e) {
      var r = wheel.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      return { a: Math.atan2(dy, dx) * 180 / Math.PI, r: Math.hypot(dx, dy) };
    }
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !e.isPrimary) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, last: pointerAngle(e).a, on: false, touch: e.pointerType !== 'mouse', v: 0, t: performance.now() };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      if (!drag.on) {
        var mx = e.clientX - drag.x, my = e.clientY - drag.y;
        if (Math.hypot(mx, my) < 6) return;
        if (drag.touch && Math.abs(my) > Math.abs(mx)) { drag = null; return; }   // vertical swipe = normal page scroll
        drag.on = true; dragging = true; vel = 0; drag.last = pointerAngle(e).a;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add('is-dragging');
      }
      var p = pointerAngle(e);
      if (p.r < 24) return;
      var d = p.a - drag.last;
      if (d > 180) d -= 360; else if (d < -180) d += 360;
      drag.last = p.a;
      tAngle += d;
      drag.v = drag.v * 0.6 + d * 0.4;                          // smoothed speed of the last few moves
      drag.t = performance.now();
      e.preventDefault();
    });
    function endDrag(e) {
      var d = drag; drag = null;
      if (!d || !d.on) return;
      if (stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      stage.classList.remove('is-dragging');
      suppress = performance.now() + 250;
      dragging = false;
      vel = performance.now() - d.t < 90 ? clamp(d.v, -14, 14) : 0;   // fling only if let go while still moving
      idleAt = performance.now();
      if (reduce.matches) tAngle = Math.round(tAngle / step) * step;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  })();

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
    var SONGS = window.SQ_SONGS;   // the playlist lives in js/music-keep.js, so other pages can resume it
    var titleEl = document.getElementById('sq2-song-title');
    var artistEl = document.getElementById('sq2-song-artist');
    var playBtn = document.getElementById('sq2-play');
    var player = null, current = Math.floor(Math.random() * SONGS.length), apiLoading = false, queued = null, playing = false;

    function announce() { document.dispatchEvent(new CustomEvent('sqmusic', { detail: { index: current, playing: playing } })); }
    function show() {
      titleEl.textContent = SONGS[current][0];
      artistEl.textContent = SONGS[current][1];
      announce();
    }
    function setPlaying(on) {
      playing = on;
      announce();
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
            onReady: function (e) { e.target.setVolume(window.SQ_VOLUME); e.target.playVideo(); },
            onStateChange: function (e) {
              if (e.data === 0) start(current + 1);                  // ended: next song
              else if (e.data === 1 || e.data === 3) { try { player.setVolume(window.SQ_VOLUME); } catch (x) {} setPlaying(true); }
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

    // Used by the "still want to listen?" prompt when the visitor leaves for another page.
    window.sqMusic = {
      playing: function () { return playing; },
      index: function () { return current; },
      play: function (i) { start(i); },
      toggle: function () { playBtn.click(); },
      shuffle: function () { start(Math.floor(Math.random() * SONGS.length)); },
      next: function () { start(current + 1); },
      prev: function () { start(current - 1); },
      keep: function () {
        var t = 0;
        try { t = player.getCurrentTime(); } catch (e) {}
        if (window.sqMusicStore) window.sqMusicStore.write({ i: current, t: Math.floor(t), at: Date.now() });
      },
      stop: function () { try { player.stopVideo(); } catch (e) {} if (window.sqMusicStore) window.sqMusicStore.write(null); }
    };
  })();
})();

  // "Listen to music with me": a nudge above the player that presses play for the visitor.
  (function () {
    var cta = document.getElementById('sq2-cta'), player = document.getElementById('sq2-music'), play = document.getElementById('sq2-play');
    if (!cta || !player || !play) return;
    cta.addEventListener('click', function () { if (!player.classList.contains('is-playing')) play.click(); });
    function sync() { cta.classList.toggle('is-quiet', player.classList.contains('is-playing')); }
    if (window.MutationObserver) new MutationObserver(sync).observe(player, { attributes: true, attributeFilter: ['class'] });
    sync();
    // The nudge only stays for 5 seconds, then it is removed from the page for good.
    setTimeout(function () {
      cta.classList.add('is-quiet');
      setTimeout(function () {
        // an empty block of the same size takes its place, so the wheel does not jump
        var gap = document.createElement('div');
        gap.className = 'sq2-cta-gap';
        gap.setAttribute('aria-hidden', 'true');
        gap.style.height = (cta.offsetHeight + 12) + 'px';
        cta.replaceWith(gap);
      }, 350);
    }, 5000);
  })();

  // The music bar is fixed at the bottom of the screen from the moment the page loads (like the nav bar).
  // This empty slot keeps its place in the layout so the wheel does not shift.
  (function () {
    var bar = document.getElementById('sq2-music');
    if (!bar) return;
    var slot = document.createElement('div');
    slot.className = 'sq2-music-slot';
    bar.parentNode.insertBefore(slot, bar);
    document.body.appendChild(bar);        // straight into <body>, so nothing on the page can stack above it
    function measure() { slot.style.height = bar.offsetHeight + 'px'; }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
  })();

  // ---------- On rotation: the playlist list plays through the music bar ----------
  (function () {
    var list = document.getElementById('rot-list');
    var songs = window.SQ_SONGS;
    if (!list || !songs) return;
    var titleEl = document.getElementById('rot-title'), artistEl = document.getElementById('rot-artist'), kicker = document.getElementById('rot-kicker');
    var playBtn = document.getElementById('rot-play'), shuffleBtn = document.getElementById('rot-shuffle'), count = document.getElementById('rot-count');
    var rows = [], started = false;
    count.textContent = songs.length + ' songs';
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
    // The list is drawn in small batches as you scroll it (nothing here downloads audio: a song is only
    // fetched, one at a time, when it is played).
    var BATCH = 8, drawn = 0, current = 0, sentinel = document.createElement('li');
    sentinel.className = 'rot-more'; sentinel.setAttribute('aria-hidden', 'true');
    function row(i) {
      var s = songs[i], li = document.createElement('li');
      li.innerHTML = '<button type="button" class="rot-row" aria-label="Play ' + esc(s[0]) + ' by ' + esc(s[1]) + '"><span class="rot-row-n">' + (i < 9 ? '0' : '') + (i + 1) + '</span><span class="rot-row-t"><strong>' + esc(s[0]) + '</strong><span>' + esc(s[1]) + '</span></span><span class="rot-genre" data-genre="' + esc(s[3] || '') + '">' + esc(s[3] || '') + '</span><span class="rot-eq" aria-hidden="true"><i></i><i></i><i></i></span></button>';
      var b = li.firstChild;
      b.addEventListener('click', function () {
        started = true;
        if (window.sqMusic && window.sqMusic.index() === i && window.sqMusic.playing()) window.sqMusic.toggle();
        else if (window.sqMusic) window.sqMusic.play(i);
      });
      rows[i] = b;
      return li;
    }
    function drawMore(upTo) {
      var end = Math.min(songs.length, Math.max(drawn + BATCH, (upTo || 0) + 1));
      for (; drawn < end; drawn++) list.insertBefore(row(drawn), sentinel);
      if (drawn >= songs.length) { sentinel.remove(); if (io) io.disconnect(); }
    }
    var io = null;
    list.appendChild(sentinel);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) drawMore(); }, { root: list, rootMargin: '0px 0px 120px 0px' });
      io.observe(sentinel);
    }
    drawMore();
    if (!io) drawMore(songs.length);          // very old browsers: just draw them all
    function paint(i, playing) {
      titleEl.textContent = songs[i][0]; artistEl.textContent = songs[i][1];
      kicker.textContent = playing ? 'Now playing' : (started ? 'Paused' : 'Up next');
      document.body.classList.toggle('rot-playing', !!playing);
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      current = i;
      if (i >= drawn) drawMore(i);              // the playing song's row always exists
      rows.forEach(function (r, k) { if (r) r.classList.toggle('is-current', k === i && (started || playing)); });
    }
    document.addEventListener('sqmusic', function (e) {
      if (e.detail.playing) started = true;
      paint(e.detail.index, e.detail.playing);
    });
    playBtn.addEventListener('click', function () { if (window.sqMusic) window.sqMusic.toggle(); });
    shuffleBtn.addEventListener('click', function () { if (window.sqMusic) window.sqMusic.shuffle(); });
    paint(window.sqMusic ? window.sqMusic.index() : 0, false);
  })();

  // ---------- playlist: previous / next, the bar steps aside, and the suggestion box ----------
  (function () {
    var prevBtn = document.getElementById('rot-prev'), nextBtn = document.getElementById('rot-next');
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', function () { if (window.sqMusic) window.sqMusic.prev(); });
      nextBtn.addEventListener('click', function () { if (window.sqMusic) window.sqMusic.next(); });
    }

    // The fixed music bar hides while the "On rotation" section is on screen (it has its own controls),
    // and comes back once you scroll on to the footer.
    var section = document.getElementById('on-rotation'), bar = document.getElementById('sq2-music');
    if (section && bar && 'IntersectionObserver' in window) {
      // watches the middle band of the screen, so the bar is back as soon as the footer takes over
      new IntersectionObserver(function (es) { bar.classList.toggle('is-away', es[0].isIntersecting); }, { rootMargin: '-30% 0px -30% 0px' }).observe(section);
    }

    // "What should I read, listen to or watch next?"
    var form = document.getElementById('rot-suggest');
    if (!form) return;
    var text = document.getElementById('rot-text'), name = document.getElementById('rot-name'), btn = document.getElementById('rot-submit'), msg = document.getElementById('rot-msg');
    function grow() { text.style.height = 'auto'; text.style.height = Math.min(text.scrollHeight, 120) + 'px'; }
    text.addEventListener('input', grow);
    function say(t, ok) { msg.className = 'rot-suggest-msg' + (ok ? ' is-ok' : ''); msg.textContent = t; }
    function mailFallback(t, n) {
      var body = 'Suggestion: ' + t + (n ? '\n\nFrom: ' + n : '');
      var a = document.createElement('a');
      a.href = 'mailto:hi@ifeoluwa.xyz?subject=' + encodeURIComponent('A suggestion for you') + '&body=' + encodeURIComponent(body);
      a.textContent = 'Send it by email instead';
      msg.className = 'rot-suggest-msg';
      msg.textContent = "That didn't go through just now. ";
      msg.appendChild(a);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = text.value.trim(), n = name.value.trim();
      if (t.length < 3) { say('Tell me what you have in mind first.', false); text.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t, name: n, website: form.elements.website.value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
        .then(function (res) {
          if (res.ok) {
            say('Thank you' + (n ? ', ' + n : '') + '! I will check it out.', true);
            text.value = ''; name.value = ''; grow();
          } else if (res.status === 400 || res.status === 429) {
            say(res.d.error || 'Something went wrong. Try again.', false);
          } else {
            mailFallback(t, n);
          }
        })
        .catch(function () { mailFallback(t, n); })
        .then(function () { btn.disabled = false; btn.textContent = 'Put me on'; });
    });
  })();

// Phones: the music bar is hidden, so the music icon in the top bar plays / pauses the playlist instead.
(function () {
  var btn = document.getElementById('nav-music'), play = document.getElementById('sq2-play'), player = document.getElementById('sq2-music');
  if (!btn || !play || !player) return;
  function sync() {
    var on = player.classList.contains('is-playing');
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  }
  btn.addEventListener('click', function () { play.click(); });
  if (window.MutationObserver) new MutationObserver(sync).observe(player, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('sqmusic', sync);
  sync();
})();
