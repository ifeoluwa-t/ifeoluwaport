/* Shared playful touches (see css/fx.css):
 *  - springy press on the buttons that matter, and "Email me" turning into "Say hello" on hover
 *  - a small cursor label (drag / view / play) over things you can drag, open or play
 *  - tiny sounds, OFF until the visitor switches them on (button, bottom-right)
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var KEY = 'fxSound';

  /* ---------------- sound ---------------- */
  var on = false;
  try { on = localStorage.getItem(KEY) === '1'; } catch (e) {}
  var ctx = null;
  function ac() {
    if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, t0, dur, type, vol, f2) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  var NOTES = [262, 294, 330, 349, 392, 440, 494, 523];   // Do Re Mi Fa Sol La Ti Do: each side-quest tile plays the next note
  // A soft piano note: a few sine partials that start with a tiny hammer touch and fade away,
  // the higher ones faster, through a gentle low-pass so it never gets sharp.
  function piano(freq, t0, vol, dur, bright) {
    var c = ac(); if (!c) return;
    var out = c.createGain();
    out.gain.value = vol;
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, freq * (bright || 5));
    lp.Q.value = 0.5;
    lp.connect(out); out.connect(c.destination);
    var partials = [[1, 1, 1], [2, 0.42, 0.7], [3, 0.2, 0.5], [4, 0.1, 0.35], [5, 0.05, 0.25]];   // [multiple, level, how long it lasts]
    partials.forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(p[1], t0 + 0.008);                       // soft hammer
      g.gain.exponentialRampToValueAtTime(p[1] * 0.35, t0 + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * p[2]);                // ring out
      o.connect(g); g.connect(lp);
      o.start(t0); o.stop(t0 + dur * p[2] + 0.05);
    });
  }
  var lastTile = -1;
  function sound(name, i) {
    if (!on) return;
    var c = ac(); if (!c) return;
    var t = c.currentTime;
    if (name === 'click') { tone(520, t, 0.08, 'sine', 0.06, 330); }
    else if (name === 'tile') { if (t - lastTile < 0.14) return; lastTile = t; piano(NOTES[(i || 0) % NOTES.length], t, 0.11, 1.2); }   // a fast spin does not pile up notes
    else if (name === 'sign') {            // the footer signposts: each link has its own short, soft note
      var SIGN = [523, 587, 659, 784, 880, 1047, 698];                       // Work Events Storytelling Side-Quests LinkedIn X Instagram
      piano(SIGN[(i || 0) % SIGN.length], t, 0.07, 0.5, 4);
    }
    else if (name === 'reveal') { tone(392, t, 0.12, 'triangle', 0.08); tone(523, t + 0.1, 0.12, 'triangle', 0.08); tone(659, t + 0.2, 0.22, 'triangle', 0.09); }
    else if (name === 'go') { tone(880, t, 0.16, 'square', 0.05); }
    else if (name === 'soon') { tone(180, t, 0.25, 'sawtooth', 0.05, 110); }
    else if (name === 'done') { tone(523, t, 0.1, 'triangle', 0.08); tone(784, t + 0.09, 0.2, 'triangle', 0.08); }
  }
  window.fx = { sound: sound, isOn: function () { return on; } };

  var sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'fx-sound';
  sw.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path class="fx-waves" d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="fx-slash" d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span></span>';
  var swLabel = sw.querySelector('span');
  function paintSwitch() {
    sw.setAttribute('aria-pressed', on ? 'true' : 'false');
    sw.setAttribute('aria-label', on ? 'Turn button sounds off' : 'Turn button sounds on');
    swLabel.textContent = on ? 'Sound on' : 'Sound off';
  }
  paintSwitch();
  sw.addEventListener('click', function () {
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    paintSwitch();
    if (on) sound('click');
  });
  document.body.appendChild(sw);

  var CLICKY = '.hero-cta-btn, .sp-btn, .btn-pill, .btn-pill-light, .sq2-cta, .game-btn, .nav-music, .bk-link, .bk-btn, .gw-item';
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest(CLICKY) : null;
    if (t) sound('click');
  }, true);

  // hovering a footer signpost link plays its note (only if sound is on)
  Array.prototype.forEach.call(document.querySelectorAll('.sp-sign'), function (a, idx) {
    a.addEventListener('mouseenter', function () { sound('sign', idx); });
    a.addEventListener('focus', function () { sound('sign', idx); });
  });

  /* ---------------- springy buttons (only the ones that matter) ---------------- */
  var PRESS = '.hero-cta-btn, .sp-btn--solid, .sp-btn--icon, .btn-pill, .btn-pill-light, .sq2-cta, .game-btn, .bk-link, .nav-mail';
  Array.prototype.forEach.call(document.querySelectorAll(PRESS), function (el) { el.classList.add('fx-press'); });

  // "Email me" turns into "Say hello"
  Array.prototype.forEach.call(document.querySelectorAll('a.sp-btn--solid'), function (el) {
    var orig = el.textContent;
    if (!/email me/i.test(orig)) return;
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    el.addEventListener('mouseenter', function () { el.textContent = 'Say hello'; });
    el.addEventListener('mouseleave', function () { el.textContent = orig; });
    el.addEventListener('focus', function () { el.textContent = 'Say hello'; });
    el.addEventListener('blur', function () { el.textContent = orig; });
  });

  /* ---------------- cursor label ---------------- */
  if (fine && !reduce) {
    var cur = document.createElement('div');
    cur.className = 'fx-cursor';
    cur.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cur);
    var MAP = [
      ['#nav-music', function () { var b = document.getElementById('nav-music'); return b && b.classList.contains('is-on') ? 'pause' : 'play'; }],
      ['.sq2-cta', 'play'], ['.sq2-music', 'music'],
      ['.rx-panel', 'tap'],
      ['.gw-item', 'view'], ['.gw', 'drag'],
      ['.sqw-car', 'view'], ['.sqw-photo', 'view'], ['.sqw-stage', 'drag'],
      ['.bk-photo', 'view'], ['.bk-stage', 'drag'],
      ['.og-focus', 'close'], ['.og-card', 'open'], ['.og', 'drag'],
      ['.work-card', 'view']
    ];
    var x = 0, y = 0, shown = '';
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      var label = '';
      var t = e.target;
      if (t && t.closest) {
        for (var i = 0; i < MAP.length; i++) {
          if (t.closest(MAP[i][0])) { label = typeof MAP[i][1] === 'function' ? MAP[i][1]() : MAP[i][1]; break; }
        }
      }
      if (label !== shown) { shown = label; cur.textContent = label; cur.classList.toggle('is-on', !!label); }
      cur.style.transform = 'translate(' + (x + 16) + 'px,' + (y + 18) + 'px)';
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); shown = ''; });
  }
})();
