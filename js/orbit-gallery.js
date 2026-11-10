/* Events orbit: the pictures sit on a ring, each turned so its top points outward. The ring turns by itself, one
 * picture at a time: every 2.5 seconds it steps round so the next picture reaches the anchor (the right-hand side on wide
 * screens, the bottom on small ones, always the side nearest the big card), and that picture pops up large in the featured
 * card beside the ring with its event name under it. Tap any picture to feature it at once (the timer starts again);
 * tap the big card to open that event on the events page. Drag the ring to spin it (it keeps coasting a little).
 * Auto-turning pauses while the pointer or focus is on the ring or the card, while the section is off screen, and
 * for good with reduced motion (then pictures are chosen by hand and swap instantly). */
(function () {
  var box = document.getElementById('og');
  if (!box) return;
  var ring = box.querySelector('.og-ring');
  var cards = Array.prototype.slice.call(box.querySelectorAll('.og-card'));
  var feat = document.getElementById('og-feature');
  var fCard = document.getElementById('og-feature-card');
  var fName = document.getElementById('og-feature-name');
  var spanA = feat.querySelector('.og-feature-a'), spanB = feat.querySelector('.og-feature-b');
  var imgA = spanA.querySelector('img'), imgB = spanB.querySelector('img');
  var fTitle = fName.querySelector('strong'), fSub = fName.querySelector('span');
  var n = cards.length;
  if (!n) return;

  // Keep the space under the picture as tall as the tallest caption, so the picture and the page never jump when the caption changes.
  function reserveCaption() {
    var w = fName.offsetWidth; if (!w) return;
    var ghost = fName.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;min-height:0;width:' + w + 'px';
    feat.appendChild(ghost);
    var gt = ghost.querySelector('strong'), gs = ghost.querySelector('span'), max = 0;
    cards.forEach(function (k) {
      gt.textContent = k.getAttribute('data-title') || ''; gs.textContent = k.getAttribute('data-sub') || '';
      max = Math.max(max, ghost.getBoundingClientRect().height);
    });
    feat.removeChild(ghost);
    if (max) fName.style.minHeight = Math.ceil(max) + 'px';
  }
  var capTimer = 0;
  function reserveSoon() { clearTimeout(capTimer); capTimer = setTimeout(reserveCaption, 120); }
  window.addEventListener('resize', reserveSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserveCaption);
  reserveCaption();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wideMQ = window.matchMedia('(min-width: 1100px)');

  var rot = 0, vel = 0, size = 0, R = 0, cardPx = 0, frozen = 0, dragging = false, visible = true, raf = 0, last = 0;
  var STEP = 360 / n;               // degrees between neighbouring pictures
  var EVERY = 2500;                 // ms each picture stays featured
  var TURN = 700;                   // ms the ring takes to step round
  var tween = null, cur = -1, timer = 0, paused = false, loaded = false;

  function layout() {
    size = box.clientWidth;                                // the ring fills its column
    var card = Math.round(size * 0.14);                    // small enough that neighbours never overlap
    box.style.setProperty('--card', card + 'px');
    R = size / 2 - card * 0.75;
    cardPx = card;
    paint();
  }
  var spinner = box.querySelector('.og-spinner');
  var hint = document.getElementById('og-hint'), HINT = hint ? hint.textContent : '', spinMs = 0, idleMs = 0, teased = false, lineAt = -1;
  var TEASES = ['You play a lot \u{1F602}', 'That tickles', 'Stoppppp \u{1F629}', 'Want a toy?', 'I\u2019m dizzy \u{1F635}\u200D\u{1F4AB}', 'Enough!', 'Your fingers \u{1F440}'];   // one new line for every 3 seconds of spinning
  function paint() {
    if (spinner) spinner.style.transform = 'rotate(' + (rot * 4) + 'deg)';   // the fidget spinner turns with the ring, four times as fast
    for (var i = 0; i < n; i++) {
      var a = rot + (360 / n) * i;
      cards[i].style.transform = 'rotate(' + a + 'deg) translateY(' + (-R) + 'px)';
    }
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tween) {                                          // stepping round to put a picture on the anchor
      var p = Math.min(1, (now - tween.t0) / tween.dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      rot = tween.from + (tween.to - tween.from) * e;
      if (p >= 1) tween = null;
    } else if (frozen) vel = 0;                           // a picture is being pointed at: coasting holds still
    else if (!dragging) {
      if (Math.abs(vel) > 0.02) { rot += vel; vel *= 0.94; if (Math.abs(vel) <= 0.02) { vel = 0; schedule(); } }
      else vel = 0;
    }
    // only a hold that stays on the spinner for 3 straight seconds counts: letting go resets it, and the hint goes back after a short rest
    if (hint) {
      if (dragging) { spinMs += dt * 1000; idleMs = 0; }
      else { spinMs = 0; idleMs += dt * 1000; if (idleMs > 3000 && teased) { hint.textContent = HINT; teased = false; lineAt = -1; } }
      var li = Math.floor(spinMs / 3000) - 1;
      if (li >= 0) { li = Math.min(li, TEASES.length - 1); if (li !== lineAt) { hint.textContent = TEASES[li]; lineAt = li; teased = true; } }
    }
    paint();
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ---- the featured card ----
  function isReal(i) {                                  // a tile with a picture that loaded: empty or broken tiles are never featured
    var c = cards[i], im = c.querySelector('img');
    return !!(im && im.getAttribute('src') && !c.hasAttribute('data-empty') && !(im.complete && im.naturalWidth === 0));
  }
  function nextReal(from) {
    for (var k = 1; k <= n; k++) { var i = (((from + k) % n) + n) % n; if (isReal(i)) return i; }
    return -1;
  }
  function anchor() { return wideMQ.matches ? 90 : 180; }   // the side of the ring nearest the big card: right on wide screens, bottom below
  function angleFor(i) { return anchor() - STEP * i; }      // the ring angle that puts picture i on the anchor
  function rotateTo(i, instant) {
    var d = ((angleFor(i) - rot) % 360 + 540) % 360 - 180;  // the short way round
    vel = 0;
    if (instant || reduce) { tween = null; rot += d; paint(); }
    else { tween = { from: rot, to: rot + d, t0: performance.now(), dur: TURN }; kick(); }
  }

  var cache = {}, token = 0;
  function preload(i) {
    if (i < 0 || cache[i]) return;
    var im = new Image(); im.decoding = 'async'; im.src = cards[i].querySelector('img').currentSrc || cards[i].querySelector('img').src; cache[i] = im;
  }
  function feature(i) {
    if (i < 0 || i === cur) return;
    var c = cards[i], img = c.querySelector('img'), src = img.currentSrc || img.src;
    var prev = cur, t = ++token;
    cur = i;
    cards.forEach(function (k, j) { k.classList.toggle('is-featured', j === i); if (j === i) k.setAttribute('aria-current', 'true'); else k.removeAttribute('aria-current'); });
    var ar = ((+img.getAttribute('width') || 1) / (+img.getAttribute('height') || 1)).toFixed(4);
    preload(i);
    function apply() {                                  // swap once the picture is decoded, so nothing flashes
      if (t !== token) return;                          // a newer picture was chosen meanwhile
      var running = spanB.getAnimations ? spanB.getAnimations() : [];
      var from = running.length ? getComputedStyle(spanB).opacity : 1;
      running.forEach(function (a) { a.cancel(); });
      imgB.src = imgA.src || src; imgB.alt = '';
      imgA.src = src; imgA.alt = img.alt;
      feat.style.setProperty('--ar', ar);
      var title = c.getAttribute('data-title') || '', sub = c.getAttribute('data-sub') || '';
      fTitle.textContent = title; fSub.textContent = sub;
      var ev = c.getAttribute('data-event');
      if (ev) {                                          // a picture of an event: the card opens that event on the events page
        fCard.href = 'events#' + ev;
        fCard.setAttribute('aria-label', 'Open ' + title + ' on the events page');
      } else {                                           // a picture with no event page behind it: the card is just a picture, not a link
        fCard.removeAttribute('href');
        fCard.removeAttribute('aria-label');
      }
      if (prev >= 0 && !reduce && spanB.animate) {
        spanB.animate([{ opacity: from }, { opacity: 0 }], { duration: 480, easing: 'ease-in-out' });
        if (fCard.animate) fCard.animate([{ transform: 'scale(0.955)' }, { transform: 'scale(1)' }], { duration: 560, easing: 'cubic-bezier(0.2, 1.25, 0.4, 1)' });
      }
    }
    var im = cache[i];
    if (im.complete && im.naturalWidth) apply();
    else if (im.decode) im.decode().then(apply, apply);
    else im.addEventListener('load', apply, { once: true });
    preload(nextReal(i));                               // the next one is ready before it is needed
  }

  // ---- the 2.5 second beat ----
  function schedule() {
    clearTimeout(timer); timer = 0;
    if (reduce || paused || !visible || document.hidden || dragging || vel) return;
    timer = setTimeout(function () { timer = 0; var i = nextReal(cur); if (i >= 0) { rotateTo(i); feature(i); } schedule(); }, EVERY);
  }
  function pause() { paused = true; clearTimeout(timer); timer = 0; }
  function resume() { paused = false; schedule(); }
  function pick(i) { if (!isReal(i)) return; feature(i); rotateTo(i); schedule(); }

  box.classList.add('is-ready');
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(box); else window.addEventListener('resize', layout);
  feat.hidden = false;
  rot = angleFor(0); paint();
  feature(nextReal(-1));
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !loaded) { loaded = true; cards.forEach(function (c) { var im = c.querySelector('img'); if (im) im.loading = 'eager'; }); } kick(); if (visible) schedule(); else { clearTimeout(timer); timer = 0; } }, { rootMargin: '100px' }).observe(box);
  document.addEventListener('visibilitychange', function () { kick(); schedule(); });
  if (wideMQ.addEventListener) wideMQ.addEventListener('change', function () { rotateTo(cur, true); });
  kick();
  schedule();

  // pointing at, or tabbing into, the ring or the card holds the beat until you leave
  [box, feat].forEach(function (el) {
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pause(); });
    el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { frozen = 0; resume(); } });
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', function (e) { if (!el.contains(e.relatedTarget)) resume(); });
  });

  cards.forEach(function (c, i) {
    // pointing at any picture stops coasting dead, so nothing moves under the cursor
    c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { frozen = 1; vel = 0; } });
    c.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') frozen = 0; });
    c.addEventListener('click', function () { if (performance.now() < suppress) return; pick(i); });
  });

  // ---- drag: turn the ring by following the pointer around its centre ----
  var drag = null, suppress = 0;
  function ang(e) { var r = box.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
  box.addEventListener('dragstart', function (e) { e.preventDefault(); });
  box.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !e.isPrimary || false) return;
    vel = 0; tween = null;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, a: ang(e), on: false, touch: e.pointerType !== 'mouse', v: 0, t: performance.now() };
  });
  box.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.hypot(dx, dy) < 7) return;
      if (drag.touch && Math.abs(dy) > Math.abs(dx) * 1.4) { drag = null; return; }   // a mostly vertical swipe scrolls the page
      drag.on = true; dragging = true; clearTimeout(timer); timer = 0; box.classList.add('is-dragging', 'has-spun'); box.setPointerCapture(e.pointerId); drag.a = ang(e);
    }
    var a = ang(e), d = a - drag.a;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    drag.a = a; rot += d; drag.v = drag.v * 0.5 + d * 0.5; drag.t = performance.now();
    paint();
  });
  function end(e) {
    var d = drag; drag = null;
    if (!d || !d.on) return;
    dragging = false; box.classList.remove('is-dragging');
    if (box.hasPointerCapture && box.hasPointerCapture(e.pointerId)) box.releasePointerCapture(e.pointerId);
    suppress = performance.now() + 250;
    vel = (performance.now() - d.t < 90) ? Math.max(-14, Math.min(14, d.v)) : 0;
    kick(); schedule();
  }
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);

  // Tapping the fidget spinner flicks it round and throws a few sparks.
  var spin = box.querySelector('.og-spin');
  function sparkle() {
    if (reduce || !spin.animate) return;
    var COLS = ['#0052ff', '#bfd4ff', '#0a00cb', '#e9f1ff'];
    for (var k = 0; k < 12; k++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('class', 'og-spark');
      var size = 8 + Math.random() * 10;
      s.style.width = s.style.height = size + 'px';
      s.innerHTML = '<path d="M12 1.5 14 10 22.5 12 14 14 12 22.5 10 14 1.5 12 10 10Z" fill="' + COLS[k % COLS.length] + '"/>';
      spin.appendChild(s);
      var a = Math.random() * Math.PI * 2, dist = spin.offsetWidth * (0.5 + Math.random() * 0.45);
      var anim = s.animate([
        { transform: 'translate(-50%,-50%) translate(0,0) scale(0.3) rotate(0deg)', opacity: 1 },
        { transform: 'translate(-50%,-50%) translate(' + Math.cos(a) * dist + 'px,' + Math.sin(a) * dist + 'px) scale(1) rotate(120deg)', opacity: 0 }
      ], { duration: 520 + Math.random() * 280, easing: 'cubic-bezier(.2,.8,.3,1)' });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(s);
    }
  }
  if (spin) spin.addEventListener('click', function () {
    if (performance.now() < suppress) return;
    box.classList.add('has-spun');
    tween = null; vel = Math.max(vel, 0) + 10;       // a flick
    kick();
    sparkle();
  });
})();
