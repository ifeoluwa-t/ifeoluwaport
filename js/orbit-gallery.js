/* Events orbit: the pictures sit on a ring, each turned so its top points outward, and the ring turns
 * slowly by itself. Drag to spin it (it keeps coasting a little). Tap a picture and it opens in the middle
 * of the ring at its own shape (always inside the ring's inner circle), with a line about it under the
 * ring.  Tap the big picture, tap anywhere else, or press Esc to put it back. Scrolling the page does not move it. */
(function () {
  var box = document.getElementById('og');
  if (!box) return;
  var ring = box.querySelector('.og-ring');
  var cards = Array.prototype.slice.call(box.querySelectorAll('.og-card'));
  var focus = box.querySelector('.og-focus');
  var fImg = focus.querySelector('img');
  var cap = document.getElementById('og-caption');
  var detail = document.querySelector('.og-detail');
  var fTitles = [cap.querySelector('strong'), detail.querySelector('strong')], fSubs = [cap.querySelector('span'), detail.querySelector('span')];
  function say(t, s) { fTitles.forEach(function (e) { e.textContent = t; }); fSubs.forEach(function (e) { e.textContent = s; }); }
  var n = cards.length;
  if (!n) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var rot = 0, vel = 0, size = 0, R = 0, rFree = 0, cardPx = 0, frozen = 0, dragging = false, hover = false, visible = true, raf = 0, last = 0, picked = -1;
  var AUTO = 4;                    // degrees per second when nobody is touching it

  function layout() {
    size = box.clientWidth;                                // the ring fills its column (up to 760px)
    var card = Math.round(size * 0.14);                    // small enough that neighbours never overlap
    box.style.setProperty('--card', card + 'px');
    R = size / 2 - card * 0.75;
    cardPx = card;
    rFree = R - card / 2 - 8;                              // radius of the empty circle inside the ring, with a little margin
    if (picked >= 0) fit(cards[picked].querySelector('img'));
    paint();
  }
  function paint() {
    for (var i = 0; i < n; i++) {
      var a = rot + (360 / n) * i;
      cards[i].style.transform = 'rotate(' + a + 'deg) translateY(' + (-R) + 'px)';
    }
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (frozen) vel = 0;                                  // a picture is being pointed at: everything holds still
    else if (!dragging) {
      if (Math.abs(vel) > 0.02) { rot += vel; vel *= 0.94; }
      else { vel = 0; if (!reduce && picked < 0) rot += AUTO * (hover ? 0.25 : 1) * dt; }   // the ring rests while a picture is open
    }
    paint();
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // size the big picture at its own shape, so even its corners stay inside the ring's empty circle
  function fit(img) {
    var w = img.naturalWidth || +img.getAttribute('width') || 1, h = img.naturalHeight || +img.getAttribute('height') || 1;
    var a = w / h, diam = Math.max(40, 2 * rFree - 12);          // the corners may not go past this circle
    var hh = diam / Math.sqrt(a * a + 1), ww = hh * a;
    fImg.style.width = Math.round(ww) + 'px'; fImg.style.height = Math.round(hh) + 'px';
  }

  // ---- open a picture in the middle ----
  function open(i) {
    var c = cards[i], img = c.querySelector('img');
    if (picked >= 0) cards[picked].classList.remove('is-picked'), cards[picked].setAttribute('aria-pressed', 'false');
    picked = i;
    c.classList.add('is-picked'); c.setAttribute('aria-pressed', 'true');
    fImg.src = img.currentSrc || img.src; fImg.alt = img.alt;
    fit(img);
    say(c.getAttribute('data-title') || '', c.getAttribute('data-sub') || '');
    box.classList.add('has-focus');
    focus.hidden = false;
    if (!reduce && focus.animate) {
      var cr = c.getBoundingClientRect(), fr = focus.getBoundingClientRect();
      var dx = (cr.left + cr.width / 2) - (fr.left + fr.width / 2), dy = (cr.top + cr.height / 2) - (fr.top + fr.height / 2);
      var s = Math.max(0.12, cr.width / Math.max(1, fr.width));
      focus.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(0.2, 1.1, 0.35, 1)' });
    }
  }
  function close() {
    if (picked < 0) return;
    cards[picked].classList.remove('is-picked'); cards[picked].setAttribute('aria-pressed', 'false');
    var back = cards[picked];
    picked = -1;
    box.classList.remove('has-focus');
    focus.hidden = true;
    say('', '');
    kick();
  }

  box.classList.add('is-ready');
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(box); else window.addEventListener('resize', layout);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }, { rootMargin: '100px' }).observe(box);
  document.addEventListener('visibilitychange', kick);
  kick();

  box.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
  box.addEventListener('pointerleave', function () { hover = false; frozen = 0; });

  cards.forEach(function (c, i) {
    c.setAttribute('aria-pressed', 'false');
    // pointing at any picture stops the ring dead (spin and coasting), so nothing moves under the cursor
    c.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { frozen = 1; vel = 0; } });
    c.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') frozen = 0; });
    c.addEventListener('click', function () { if (performance.now() < suppress) return; if (picked === i) close(); else open(i); });
  });
  focus.addEventListener('click', function () { if (performance.now() >= suppress) close(); });
  box.addEventListener('click', function (e) { if (performance.now() >= suppress && picked >= 0 && !e.target.closest('.og-card') && !e.target.closest('.og-focus')) close(); });
  // a tap anywhere else on the page also puts the picture back (a tap on another picture swaps to that one)
  document.addEventListener('click', function (e) {
    if (picked < 0 || performance.now() < suppress) return;
    var t = e.target;
    if (t.closest && (t.closest('.og-card') || t.closest('.og-focus'))) return;
    close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // ---- drag: turn the ring by following the pointer around its centre ----
  var drag = null, suppress = 0;
  function ang(e) { var r = box.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
  box.addEventListener('dragstart', function (e) { e.preventDefault(); });
  box.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !e.isPrimary || (e.target.closest && e.target.closest('.og-focus'))) return;
    vel = 0;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, a: ang(e), on: false, touch: e.pointerType !== 'mouse', v: 0, t: performance.now() };
  });
  box.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.hypot(dx, dy) < 7) return;
      if (drag.touch && Math.abs(dy) > Math.abs(dx) * 1.4) { drag = null; return; }   // a mostly vertical swipe scrolls the page
      drag.on = true; dragging = true; box.classList.add('is-dragging'); box.setPointerCapture(e.pointerId); drag.a = ang(e);
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
    kick();
  }
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
})();
