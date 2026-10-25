/* Hero line field: a grid of thin vertical lines that drift in slow folds and bend
 * away from the pointer. Plain canvas 2D, ~15k points a frame at desktop size.
 * Paused while the hero is off-screen or the tab is hidden; with prefers-reduced-motion
 * it draws one still frame (no drift, no pointer response). */
(function () {
  const hero = document.querySelector('.hero, .sq2-gallery');
  if (!hero) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-lines';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const grad = hero.querySelector('.hero-gradient-canvas');
  if (grad) grad.after(canvas); else hero.insertBefore(canvas, hero.firstChild);

  let W = 0, H = 0, gap = 10;
  const STEP = 16;
  const R = 170; // pointer reach, px
  let px = -9999, py = -9999, tx = -9999, ty = -9999;
  let strength = 0, active = false;
  let raf = 0, inView = true;

  function size() {
    W = hero.clientWidth;
    H = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gap = W < 640 ? 8 : 10;
    if (reduce) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    const foldCx = W * (0.55 + 0.18 * Math.sin(t * 0.11));
    for (let x = gap / 2; x < W + gap; x += gap) {
      const near = Math.exp(-Math.pow((x - px) / R, 2)) * strength;
      ctx.strokeStyle = 'rgba(191, 212, 255,' + (0.14 + 0.5 * near).toFixed(3) + ')';
      ctx.beginPath();
      for (let y = -STEP; y <= H + STEP; y += STEP) {
        // slow overlapping waves
        let dx = 22 * Math.sin(x * 0.0042 + y * 0.0058 - t * 0.35) + 11 * Math.sin(x * 0.011 - y * 0.004 + t * 0.5);
        // a diagonal fold where the lines bunch up
        const fx = x - (foldCx + y * 0.32);
        dx -= fx * 0.32 * Math.exp(-Math.pow(fx / 130, 2));
        // pointer bulge: lines bow away from the cursor
        if (strength > 0.001) {
          const ddx = x - px, ddy = y - py;
          dx += ddx * 0.5 * strength * Math.exp(-(ddx * ddx + ddy * ddy) / (R * R));
        }
        if (y === -STEP) ctx.moveTo(x + dx, y); else ctx.lineTo(x + dx, y);
      }
      ctx.stroke();
    }
  }

  function frame(ms) {
    raf = 0;
    px += (tx - px) * 0.16;
    py += (ty - py) * 0.16;
    strength += ((active ? 1 : 0) - strength) * 0.08;
    draw(ms / 1000);
    if (inView && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !reduce && inView && !document.hidden) raf = requestAnimationFrame(frame); }

  size();
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(hero); else window.addEventListener('resize', size);
  if (reduce) return;

  window.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const inside = x >= 0 && x <= r.width && y >= 0 && y <= r.height;
    if (inside) {
      if (!active) { px = x; py = y; } // appear under the pointer instead of sweeping in
      tx = x; ty = y;
    }
    active = inside;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { active = false; });
  window.addEventListener('blur', () => { active = false; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; kick(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', kick);
  kick();
})();
