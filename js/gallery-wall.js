/* Brand storytelling on the landing page: two rows of project cards that drift by themselves,
 * the top row one way and the bottom row the other, across the full width of the screen.
 * The drift never ends: it only slows while the pointer is over the cards; dragging nudges both rows. */
(function () {
  var wall = document.getElementById('gw');
  if (!wall) return;
  var cards = Array.prototype.slice.call(wall.querySelectorAll('.gw-item'));
  if (!cards.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Every card is white; only the small tag takes a colour of its own, by kind of piece.
  cards.forEach(function (c) {
    var pill = c.querySelector('.gw-pill');
    if (pill) pill.setAttribute('data-kind', pill.textContent.trim().toLowerCase());
  });

  // Two rows: even cards on top, odd cards below.
  var rows = [{ cards: [], dir: -1, speed: 34 }, { cards: [], dir: 1, speed: 28 }];
  cards.forEach(function (c, i) { rows[i % 2].cards.push(c); });
  var SIZE = [1, 0.8, 0.92, 0.86, 0.96, 0.82];   // picture heights vary a little so the rows feel hand-hung

  // Links are draggable by the browser by default, which would steal the drag: turn that off.
  cards.forEach(function (c) { c.setAttribute('draggable', 'false'); });
  wall.addEventListener('dragstart', function (e) { e.preventDefault(); });
  wall.innerHTML = '';
  rows.forEach(function (r) {
    var row = document.createElement('div');
    row.className = 'gw-row';
    var track = document.createElement('div');
    track.className = 'gw-track';
    r.cards.forEach(function (c) { track.appendChild(c); });
    row.appendChild(track);
    wall.appendChild(row);
    r.track = track; r.originals = r.cards.slice(); r.offset = 0; r.setW = 0;
  });

  var W = 0, hover = false, drag = null, suppress = 0, nudge = 0, coast = 0, raf = 0, last = 0, visible = true;

  function layout() {
    W = wall.clientWidth;
    var mobile = W < 640;
    var base = mobile ? 150 : Math.max(190, Math.min(260, W * 0.17));
    rows.forEach(function (r, ri) {
      // remove clones, size the originals
      Array.prototype.slice.call(r.track.querySelectorAll('[data-clone]')).forEach(function (n) { n.remove(); });
      r.originals.forEach(function (c, i) {
        var ar = parseFloat(c.getAttribute('data-ar')) || 1.78;
        var h = Math.round(base * SIZE[(i * 2 + ri) % SIZE.length]);
        var w = Math.round(h * ar);
        var m = c.querySelector('.gw-media');
        m.style.height = h + 'px'; m.style.width = w + 'px';
      });
      var gap = parseFloat(getComputedStyle(r.track).columnGap) || 22;
      r.setW = r.track.scrollWidth + gap;                       // one full set of cards, plus the gap that follows it
      // repeat the set until it covers the screen twice over, so the loop never shows an end
      var copies = Math.ceil(W / r.setW) + 2;                  // always enough cards to fill the panel at any point of the loop
      for (var k = 0; k < copies; k++) {
        r.originals.forEach(function (c) {
          var cl = c.cloneNode(true);
          cl.setAttribute('data-clone', '');
          cl.setAttribute('aria-hidden', 'true');
          cl.setAttribute('tabindex', '-1');
          r.track.appendChild(cl);
        });
      }
    });
    paint();
  }
  function wrap(v, w) { v = v % w; return v > 0 ? v - w : v; }   // keep the offset in (-w, 0]
  function paint() {
    rows.forEach(function (r) {
      if (!r.setW) return;
      var o = wrap(r.offset - nudge, r.setW);
      // the row moving right starts one set to the left so there is always a card at the left edge
      r.track.style.transform = 'translate3d(' + (r.dir === 1 ? o - r.setW : o) + 'px,0,0)';
    });
  }
  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag && Math.abs(coast) > 0.05) {
      // after a drag the rows glide on a little, slowing to a stop
      rows.forEach(function (r) { r.offset = wrap(r.offset + coast, r.setW || 1); });
      coast *= 0.93;
    } else if (!drag) {
      coast = 0;
      if (!reduce) rows.forEach(function (r) { r.offset = wrap(r.offset + r.dir * r.speed * (hover ? 0.35 : 1) * dt, r.setW || 1); });   // slows (never stops) while the pointer is over the cards
    }
    paint();
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  wall.classList.add('is-ready');
  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(wall); else window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }, { rootMargin: '100px' }).observe(wall);
  document.addEventListener('visibilitychange', kick);
  kick();

  // pause while a card is being looked at
  wall.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
  wall.addEventListener('pointerleave', function () { hover = false; });

  // drag / swipe nudges both rows (they move in opposite directions, like the drift)
  wall.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || !e.isPrimary) return;
    coast = 0;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: performance.now(), v: 0, on: false, touch: e.pointerType !== 'mouse' };
  });
  wall.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.hypot(dx, dy) < 6) return;
      if (drag.touch && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // vertical swipe scrolls the page
      drag.on = true; wall.classList.add('is-dragging'); wall.setPointerCapture(e.pointerId);
    }
    var stepX = e.clientX - drag.lastX, now = performance.now();
    drag.v = drag.v * 0.5 + (stepX / Math.max(1, now - drag.lastT) * 16) * 0.5;
    nudge -= stepX;
    drag.lastX = e.clientX; drag.lastT = now;
    paint();
  });
  function end(e) {
    var d = drag; drag = null;
    if (!d) return;
    if (d.on) {
      suppress = performance.now() + 250;
      wall.classList.remove('is-dragging');
      if (wall.hasPointerCapture && wall.hasPointerCapture(e.pointerId)) wall.releasePointerCapture(e.pointerId);
      // fold the nudge into the rows so the drift carries on from where they were dragged to
      rows.forEach(function (r) { r.offset = wrap(r.offset - nudge, r.setW || 1); });
      nudge = 0;
      coast = (performance.now() - d.lastT < 90 && !reduce) ? Math.max(-40, Math.min(40, d.v)) : 0;   // fling only if let go while moving
    }
  }
  // sideways scrolling (trackpad swipe, or shift + wheel) moves the cards; up-and-down scrolling still scrolls the page
  var wheelTimer = 0;
  wall.addEventListener('wheel', function (e) {
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (!d) return;
    e.preventDefault();
    if (e.deltaMode === 1) d *= 16;
    coast = 0;
    rows.forEach(function (r) { r.offset = wrap(r.offset - d, r.setW || 1); });
    paint();
  }, { passive: false });

  wall.addEventListener('pointerup', end);
  wall.addEventListener('pointercancel', end);
  wall.addEventListener('click', function (e) {
    if (performance.now() < suppress) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();
