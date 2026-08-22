/* Strips a near-white studio background from a photo/illustration and
   replaces the <img> with a <canvas> holding the true alpha cutout,
   so it can sit cleanly on dark, colored section backgrounds. */
function chromaKeyWhiteToTransparent(img, { lowThreshold = 232, highThreshold = 250 } = {}) {
  const draw = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let data;
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      return; // CORS-tainted canvas (e.g. file:// protocol) — keep original img
    }

    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const whiteness = Math.min(r, g, b);
      if (whiteness >= highThreshold) {
        px[i + 3] = 0;
      } else if (whiteness > lowThreshold) {
        const t = (whiteness - lowThreshold) / (highThreshold - lowThreshold);
        px[i + 3] = Math.round(px[i + 3] * (1 - t));
      }
    }
    ctx.putImageData(data, 0, 0);

    canvas.className = img.className;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', img.alt || '');
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    img.replaceWith(canvas);
  };

  if (img.complete && img.naturalWidth) draw();
  else img.addEventListener('load', draw, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('[data-cutout]').forEach(img => chromaKeyWhiteToTransparent(img));

  /* ---------- Sticky header shadow ---------- */
  const header = document.getElementById('site-header');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav toggle ---------- */
  const toggle = document.getElementById('nav-toggle');
  const navWrap = document.getElementById('nav-wrap');

  const setToggleState = (isOpen) => {
    navWrap.classList.toggle('open', isOpen);
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.textContent = isOpen ? 'close x' : '/menu';
  };

  toggle.addEventListener('click', () => {
    setToggleState(!navWrap.classList.contains('open'));
  });

  document.querySelectorAll('.main-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => setToggleState(false));
  });

  /* ---------- Active nav link by current page ---------- */
  const currentPage = document.body.dataset.page;
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === currentPage);
  });

  /* ---------- Auto-scrolling, draggable card marquee ----------
     Auto-advances slowly by default. The viewer can drag (mouse),
     swipe (touch), or trackpad-scroll it at any time — that pauses
     auto-advance, which resumes a couple of seconds after they let go.
     The track's contents are duplicated in the HTML so wrapping the
     scroll position at the halfway point loops it seamlessly. */
  function initMarquee(root, { speed = 40, resumeDelay = 2200, mobileBreakpoint = null } = {}) {
    const track = root.querySelector('.marquee-track');
    if (!track) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = mobileBreakpoint ? window.matchMedia(`(max-width: ${mobileBreakpoint}px)`) : null;

    let hovering = false;
    let interacting = false;
    let dragging = false;
    let dragged = false;
    let startX = 0;
    let startScrollLeft = 0;
    let resumeTimer = null;
    let lastTime = null;

    const isEnabled = () => !mobileQuery || mobileQuery.matches;

    function scheduleResume() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { interacting = false; }, resumeDelay);
    }

    function wrap() {
      const half = track.scrollWidth / 2;
      if (half <= 0) return;
      if (root.scrollLeft <= 0) root.scrollLeft += half;
      else if (root.scrollLeft >= half) root.scrollLeft -= half;
    }

    function step(time) {
      if (lastTime == null) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      if (isEnabled() && !hovering && !interacting && !reduceMotion.matches) {
        root.scrollLeft += (speed * dt) / 1000;
      }
      wrap();
      requestAnimationFrame(step);
    }

    root.addEventListener('mouseenter', () => { hovering = true; });
    root.addEventListener('mouseleave', () => { hovering = false; });

    root.addEventListener('wheel', () => {
      interacting = true;
      scheduleResume();
    }, { passive: true });

    root.addEventListener('pointerdown', (e) => {
      interacting = true;
      dragged = false;
      clearTimeout(resumeTimer);
      if (e.pointerType === 'mouse') {
        dragging = true;
        startX = e.clientX;
        startScrollLeft = root.scrollLeft;
        root.classList.add('is-dragging');
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* no active pointer session — safe to ignore */ }
        e.preventDefault();
      }
    });

    root.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) dragged = true;
      root.scrollLeft = startScrollLeft - dx;
    });

    function endInteraction() {
      dragging = false;
      root.classList.remove('is-dragging');
      interacting = false;
      scheduleResume();
    }
    root.addEventListener('pointerup', endInteraction);
    root.addEventListener('pointercancel', endInteraction);

    root.addEventListener('touchend', scheduleResume, { passive: true });

    // Suppress the click-through navigation on a card if the user was
    // actually dragging rather than tapping/clicking.
    root.addEventListener('click', (e) => {
      if (dragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    requestAnimationFrame(step);
  }

  const workMarquee = document.querySelector('.work-marquee');
  if (workMarquee) initMarquee(workMarquee, { speed: 40 });

  const eventsMarquee = document.querySelector('.events-marquee');
  if (eventsMarquee) initMarquee(eventsMarquee, { speed: 34, mobileBreakpoint: 640 });

  const storytellingMarquee = document.querySelector('.storytelling-marquee');
  if (storytellingMarquee) initMarquee(storytellingMarquee, { speed: 36 });

  /* ---------- Generic "detail popup" modal ----------
     Shared open/close/backdrop/Escape wiring for any modal that
     collapses homepage content behind a "+" nudge. `populate` fills
     in the modal's fields from the button that triggered it. */
  function initDetailModal(modal, buttons, populate) {
    if (!modal || !buttons.length) return;
    let lastFocused = null;

    const open = (button) => {
      lastFocused = document.activeElement;
      populate(modal, button);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      modal.querySelector('.skill-modal-close').focus();
    };

    const close = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (lastFocused) lastFocused.focus();
    };

    buttons.forEach(btn => btn.addEventListener('click', () => open(btn)));
    modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  }

  /* "What I Do" skill cards */
  initDetailModal(
    document.getElementById('skill-modal'),
    document.querySelectorAll('.skill[data-skill-title]'),
    (modal, button) => {
      modal.querySelector('.skill-modal-title').textContent = button.dataset.skillTitle;
      modal.querySelector('.skill-modal-body').textContent = button.dataset.skillDetail;
    }
  );

  /* "I've Worked At" experience cards */
  initDetailModal(
    document.getElementById('exp-modal'),
    document.querySelectorAll('.exp-card[data-exp-company]'),
    (modal, button) => {
      modal.querySelector('#exp-modal-title').textContent = button.dataset.expCompany;
      modal.querySelector('#exp-modal-role').textContent = button.dataset.expRole;
      modal.querySelector('#exp-modal-date').textContent = button.dataset.expDate;
      modal.querySelector('#exp-modal-logo').setAttribute('data-label', button.dataset.expLogo || '');

      const body = modal.querySelector('#exp-modal-body');
      body.innerHTML = '';
      button.dataset.expDetail.split('||').forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph.trim();
        body.appendChild(p);
      });
    }
  );

});
