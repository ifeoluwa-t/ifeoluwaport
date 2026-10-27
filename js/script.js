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

  /* ---------- "View All Work" mobile expand ----------
     On mobile the homepage Work grid shows only its top 3 projects;
     tapping "View All Work" reveals the other 3 in place instead of
     leaving for the Work page. Desktop/tablet keep the plain link. */
  const workExpandBtn = document.querySelector('[data-view-all-work]');
  const workGrid = document.querySelector('.work-grid');
  if (workExpandBtn && workGrid) {
    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const defaultLabel = workExpandBtn.textContent;

    workExpandBtn.addEventListener('click', (e) => {
      if (!mobileQuery.matches) return;
      e.preventDefault();
      const expanded = workGrid.classList.toggle('is-expanded');
      workExpandBtn.textContent = expanded ? 'Show Less' : defaultLabel;
    });

    mobileQuery.addEventListener('change', (e) => {
      if (!e.matches) {
        workGrid.classList.remove('is-expanded');
        workExpandBtn.textContent = defaultLabel;
      }
    });
  }

  /* ---------- Scroll reveal choreography ----------
     Splits section headings into word-level spans and cascades
     cards/copy in as they cross into view. Entirely opt-in: the
     html.js-reveal class (added below) is the only thing that makes
     any of this invisible-until-revealed, so a reduced-motion
     preference just leaves everything statically visible. */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function splitIntoWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = 'true';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(textNode => {
      const parts = textNode.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (part.trim() === '') { frag.appendChild(document.createTextNode(part)); return; }
        const span = document.createElement('span');
        span.className = 'reveal-word';
        span.textContent = part;
        frag.appendChild(span);
      });
      textNode.replaceWith(frag);
    });
  }

  function initScrollReveal() {
    if (prefersReducedMotion.matches) return;
    document.documentElement.classList.add('js-reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.classList.contains('reveal-heading')) {
          el.querySelectorAll('.reveal-word').forEach((word, i) => {
            word.style.setProperty('--stagger', `${Math.min(i * 45, 360)}ms`);
          });
        }
        el.classList.add('is-visible');
        observer.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    // Headings: word-level stagger, varies with whatever text each one holds.
    document.querySelectorAll('.section-heading:not(.hero-name)').forEach(h => {
      splitIntoWords(h);
      h.classList.add('reveal-heading');
      observer.observe(h);
    });

    // Cards/copy: cascade in with a per-section rhythm rather than one
    // repeated fade-up everywhere.
    const groups = [
      { selector: '.who-i-am-copy > p', variant: 'up', stagger: 100 },
      { selector: '.skills-grid > .skill', variant: 'up', stagger: 70 },
      { selector: '.experience-grid > .exp-card', variant: 'alt', stagger: 90 },
      { selector: '.exp-media-grid > .exp-media-card', variant: 'scale', stagger: 100 },
      { selector: '.sq-grid > .sq-card', variant: 'sq-fade', stagger: 90 },
      { selector: '.work-slide-cards > .slide-card', variant: 'up', stagger: 80 },
      { selector: '.contact-cta-row > .btn', variant: 'up', stagger: 80 },
      { selector: '.social-icons > .social-icon', variant: 'up', stagger: 60 },
      { selector: '.sq-social-icons > .sq-social-icon', variant: 'up', stagger: 60 },
      { selector: '.brands-logos > .exp-logo--lg', variant: 'up', stagger: 70 },
      { selector: '.work-outro-heading, .sq-outro-heading', variant: 'up', stagger: 0 },
    ];

    groups.forEach(({ selector, variant, stagger }) => {
      document.querySelectorAll(selector).forEach((el, i) => {
        const v = variant === 'alt' ? (i % 2 === 0 ? 'left' : 'right') : variant;
        el.dataset.reveal = v;
        el.style.setProperty('--stagger', `${Math.min(i * stagger, 480)}ms`);
        observer.observe(el);
      });
    });
  }

  initScrollReveal();

  /* ---------- Magnetic hover on buttons + nav links ----------
     Fine pointer + motion-OK only. Touch devices and reduced-motion
     users just get the plain, fully normal hover states — nothing
     here is required for the site to work. */
  function initMagneticButtons() {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches || prefersReducedMotion.matches) return;

    // Buttons already lift on :hover via CSS — since this inline
    // transform takes over that property while active, bake an
    // equivalent lift bias in here too so the pull doesn't read as
    // replacing the lift. Kept subtle (small multipliers) — this used
    // to pull much harder and read as too much motion.
    document.querySelectorAll('.btn-pill, .btn-pill-solid, .btn-pill-light').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${relX * 0.1}px, ${relY * 0.12 - 1.5}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    // Nav links get no magnetic pull at all — color change only, via
    // the plain :hover rule in style.css.
  }

  initMagneticButtons();

  /* ---------- Hero highlight card ----------
     An original recreation of the rotating photo+caption card on
     growxy.framer.website's landing page: every slide sits absolutely
     stacked in the same fixed-size box, and this just swaps which one
     is .is-active on an interval, crossfading via the CSS transition
     on .hero-highlight-slide. Pauses while the tab is hidden rather
     than racing to catch up when it becomes visible again. */
  function initHeroHighlightCard() {
    const card = document.getElementById('hero-highlight-card');
    if (!card) return;
    const slides = Array.from(card.querySelectorAll('.hero-highlight-slide'));
    if (slides.length < 2 || prefersReducedMotion.matches) return;

    let index = 0;
    const ROTATE_MS = 3500;

    function advance() {
      slides[index].classList.remove('is-active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('is-active');
    }

    let timer = setInterval(advance, ROTATE_MS);
    document.addEventListener('visibilitychange', () => {
      clearInterval(timer);
      if (!document.hidden) timer = setInterval(advance, ROTATE_MS);
    });
  }

  initHeroHighlightCard();

  /* ---------- Hero side-element alignment ----------
     Both side elements stay on their original side — the highlight
     card on the right, the one-liner/logo stack on the left — each
     aligned to the nearer end of the wordmark: the card's right edge
     lines up with the "a", and the stack's left edge lines up with
     the "I". Measured directly off the rendered glyphs (see the
     wrapped .hero-name-first/.hero-name-last spans in index.html)
     rather than a guessed fixed offset, since the wordmark's own
     rendered width shifts with viewport size and the font-size
     clamp. Desktop only (>900px) — below that breakpoint both
     elements are back in normal document flow, so any inline
     left/right here is cleared. */
  function alignHeroSideElements() {
    const hero = document.querySelector('.hero');
    const inner = document.querySelector('.hero-inner');
    const name = document.querySelector('.hero-name');
    const first = document.querySelector('.hero-name-first');
    const last = document.querySelector('.hero-name-last');
    const oLetter = document.querySelector('.hero-name-o');
    const lLetter = document.querySelector('.hero-name-l');
    const card = document.querySelector('.hero-cta');
    const stack = document.querySelector('.hero-left-stack');
    const row = document.querySelector('.hero-row');
    const photo = document.querySelector('.hero-photo');
    const kicker = document.querySelector('.hero-kicker');
    if (!hero || !inner || !name || !first || !last || !oLetter || !lLetter || !card || !stack || !row || !photo || !kicker) return;

    const desktop = window.matchMedia('(min-width: 901px)');

    function align() {
      if (!desktop.matches) {
        card.style.left = '';
        card.style.right = '';
        card.style.top = '';
        stack.style.left = '';
        stack.style.right = '';
        stack.style.top = '';
        photo.style.width = '';
        photo.style.transform = '';
        kicker.style.left = '';
        return;
      }
      /* Very large screens (wider than a 1536px laptop): the whole hero content scales up with the screen (CSS zoom
         on .hero-inner) so it keeps the proportions of the laptop layout and the photo still ends on the section's
         base. Below that width nothing changes (factor 1). All measurements here are visual pixels, so values written
         back as CSS are divided by the zoom factor z. */
      let z = 1;
      if (window.innerWidth > 1536 && window.CSS && CSS.supports('zoom', '1.2')) {
        z = Math.max(1, Math.min(window.innerWidth / 1536, window.innerHeight / 864, 3));
      }
      document.documentElement.style.setProperty('--hero-zoom', z.toFixed(4));
      const innerRect = inner.getBoundingClientRect();
      const nameRect = name.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const oRect = oLetter.getBoundingClientRect();
      const lRect = lLetter.getBoundingClientRect();

      /* Below the wordmark's own rendered bottom edge, not a fixed
         clamp — the wordmark's height itself scales with its
         font-size clamp, so a fixed top would drift out of sync
         (sitting too high, overlapping the letters) whenever that
         relationship isn't exactly what it was when the clamp was
         tuned. Uses the whole element's box, not just the first/last
         letters, since a middle letter's own ascender/descender can
         render lower or higher than either of those. */
      const top = (nameRect.bottom - innerRect.top) / z + 24;
      card.style.top = top + 'px';
      card.style.right = ((innerRect.right - lastRect.right) / z) + 'px';
      card.style.left = 'auto';

      stack.style.top = top + 'px';
      stack.style.left = ((firstRect.left - innerRect.left) / z) + 'px';
      stack.style.right = 'auto';

      /* Sized as big as it can go while reaching all the way down to
         the section's own bottom edge (row.top is fixed by the flow
         above it, unaffected by the photo's own size, so this is
         safe to measure up front). The one-liner text on the left
         has no background of its own, so that side stays a hard
         boundary (leftBound); the floating highlight card on the
         right does have an opaque background and already renders in
         front of the photo (z-index 5 vs. the photo row's 3), so the
         photo is free to extend behind it, right up to the card's
         own far edge (rightBound) — recovering the width that used
         to be reserved as empty symmetric gap on both sides. Real
         photo, so width/height stay locked to its natural aspect
         ratio rather than stretching. */
      const stackRect = stack.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const margin = 4;
      const leftBound = stackRect.right + margin;
      const rightBound = cardRect.right - margin;
      const maxWidthByBounds = rightBound - leftBound;

      const heroRect = hero.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const aspect = 950 / 1000; // natural height/width of hero-headshot.png
      const heightBudget = heroRect.bottom - rowRect.top;
      const widthFromHeight = heightBudget / aspect;

      const photoWidth = Math.max(160, Math.min(760 * z, maxWidthByBounds, widthFromHeight));

      photo.style.transform = 'none';
      photo.style.width = (photoWidth / z) + 'px';
      const naturalRect = photo.getBoundingClientRect();

      /* Positioned (not resized — width/height are untouched above)
         so the head's actual apex — measured directly from the
         source PNG's alpha cutout at 53.15% of the photo's own
         width, not its bounding-box center — lands on the midpoint
         between "O" and "L". */
      const APEX_FRACTION = 0.5315;
      /* The page's own centre line (the hero container is centred), so the
         head and "hi, i'm" sit exactly in the middle of the page. */
      const target = (innerRect.left + innerRect.right) / 2;
      const desiredLeft = target - photoWidth * APEX_FRACTION;
      photo.style.transform = `translateX(${(desiredLeft - naturalRect.left) / z}px)`;

      /* "hi, i'm" shifted off its default centered position (over the
         whole wordmark) to sit right over that same O/L midpoint.
         Positioned via left/position rather than transform: the
         kicker already has its own CSS entrance animation that sets
         transform (translateY), and animation-fill-mode:both makes
         that replace the whole property outright once it finishes —
         exactly the bug hero-photo hit earlier — so transform here
         would just get overwritten. left has no such conflict. */
      kicker.style.position = 'relative';
      kicker.style.left = '0px';
      const kickerRect = kicker.getBoundingClientRect();
      const kickerCenter = (kickerRect.left + kickerRect.right) / 2;
      kicker.style.left = ((target - kickerCenter) / z) + 'px';
    }

    align();
    window.addEventListener('resize', align);
    if (document.fonts && document.fonts.ready) {
      /* fonts.ready can resolve a frame or two before the browser
         actually repaints with the swapped-in font, so a measurement
         taken right on resolution can still reflect the fallback
         font's (narrower) metrics — double rAF pushes the re-measure
         past that repaint. */
      document.fonts.ready.then(() => {
        requestAnimationFrame(() => requestAnimationFrame(align));
      });
    }
  }

  alignHeroSideElements();

  /* ---------- Draggable pill strip ("What I Do") ----------
     Touch already gets native swipe + momentum for free on an
     overflow-x:auto track — this only adds click-and-drag for mouse
     users, plus a simple friction-based momentum fling on release so
     it doesn't feel like it stops dead. */
  function initPillStripDrag() {
    const track = document.getElementById('pill-strip-track');
    if (!track) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let momentumId = null;

    function stopMomentum() {
      if (momentumId) {
        cancelAnimationFrame(momentumId);
        momentumId = null;
      }
    }

    function momentumStep() {
      track.scrollLeft -= velocity;
      velocity *= 0.94;
      if (Math.abs(velocity) > 0.4) {
        momentumId = requestAnimationFrame(momentumStep);
      } else {
        momentumId = null;
      }
    }

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      stopMomentum();
      track.classList.add('is-dragging');
      startX = e.clientX;
      startScroll = track.scrollLeft;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      track.scrollLeft = startScroll - (e.clientX - startX);

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = ((e.clientX - lastX) / dt) * 16;
        lastX = e.clientX;
        lastT = now;
      }
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
      if (!prefersReducedMotion.matches && Math.abs(velocity) > 0.4) {
        momentumId = requestAnimationFrame(momentumStep);
      }
    });

    track.addEventListener('dragstart', (e) => e.preventDefault());
  }

  initPillStripDrag();

  /* ---------- Side Quests carousel ("Ebbtide" port) ----------
     A vanilla-JS/CSS reimplementation of the "Ebbtide" Framer
     component's core mechanics (no React/Framer/framer-motion —
     original at framerusercontent.com/modules/.../Ebbtide.js):
     seamless auto-scrolling track, drag-with-momentum (mirrors
     initPillStripDrag's physics just above, transform-driven instead
     of native scrollLeft since the track has to loop seamlessly),
     hover-to-grow tiles with dimmed siblings, and a blurred backdrop
     that crossfades to whichever tile is hovered. Autoscroll pauses
     under prefers-reduced-motion; drag/hover stay available either
     way, same split initPillStripDrag already uses (motion is
     optional, the interaction itself isn't). */
  function initSideQuestsCarousel() {
    const track = document.getElementById('sq-carousel-track');
    const viewport = track && track.parentElement;
    const haze = document.getElementById('sq-carousel-haze');
    if (!track || !viewport || !haze) return;

    const seedTiles = Array.from(track.children);
    const GAP = 16;
    const PACE = 34; // px/s autoscroll speed

    let loopWidth = 0;
    let offset = 0;
    let hovered = null;
    let isDragging = false;

    function apply() {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    /* Haze reads the tile's own placeholder gradient via computed
       style for now — once real <img>/<video> tiles replace the
       placeholders, swap this for reading the media element's own
       source (e.g. a data-haze-bg attribute) instead. */
    function bindTile(tile) {
      const media = tile.querySelector('.sq-tile-media');
      tile.addEventListener('pointerenter', () => {
        if (isDragging) return;
        hovered = tile;
        tile.classList.add('is-hovered');
        track.classList.add('has-hover');
        if (media) {
          const bg = window.getComputedStyle(media).backgroundImage;
          if (bg && bg !== 'none') haze.style.backgroundImage = bg;
        }
        haze.classList.add('is-visible');
      });
      tile.addEventListener('pointerleave', () => {
        tile.classList.remove('is-hovered');
        if (hovered === tile) {
          hovered = null;
          track.classList.remove('has-hover');
          haze.classList.remove('is-visible');
        }
      });
    }

    // Clone enough extra copies of the 5 seed tiles so the track
    // always spans at least two viewport-widths, however wide the
    // viewport is — the loop wraps within one seed-set's width, so
    // there always has to be a full extra copy on either side of
    // whatever's currently in view.
    function buildLoop() {
      track.querySelectorAll('[data-clone]').forEach((el) => el.remove());
      const seedWidth = seedTiles.reduce((sum, el) => sum + el.getBoundingClientRect().width + GAP, 0);
      const copies = Math.max(2, Math.ceil((viewport.clientWidth * 2) / seedWidth) + 1);
      for (let i = 0; i < copies; i++) {
        seedTiles.forEach((el) => {
          const clone = el.cloneNode(true);
          clone.setAttribute('data-clone', '');
          track.appendChild(clone);
          bindTile(clone);
        });
      }
      return seedWidth;
    }

    seedTiles.forEach(bindTile);
    loopWidth = buildLoop();
    window.addEventListener('resize', () => { loopWidth = buildLoop(); });

    let last = performance.now();
    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (!prefersReducedMotion.matches && !isDragging && !hovered && loopWidth > 0) {
        offset += PACE * dt;
        if (offset >= loopWidth) offset -= loopWidth;
        apply();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    let startX = 0, startOffset = 0, lastX = 0, lastT = 0, velocity = 0, momentumId = null;

    function stopMomentum() {
      if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
    }
    function momentumStep() {
      offset += velocity;
      if (loopWidth > 0) {
        offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      }
      apply();
      velocity *= 0.94;
      if (Math.abs(velocity) > 0.3) {
        momentumId = requestAnimationFrame(momentumStep);
      } else {
        momentumId = null;
      }
    }

    track.addEventListener('pointerdown', (e) => {
      isDragging = true;
      stopMomentum();
      track.classList.add('is-dragging');
      startX = e.clientX;
      startOffset = offset;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      offset = startOffset - (e.clientX - startX);
      if (loopWidth > 0) {
        offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      }
      apply();
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = -((e.clientX - lastX) / dt) * 16;
        lastX = e.clientX;
        lastT = now;
      }
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('is-dragging');
      if (!prefersReducedMotion.matches && Math.abs(velocity) > 0.3) {
        momentumId = requestAnimationFrame(momentumStep);
      }
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('dragstart', (e) => e.preventDefault());
  }

  initSideQuestsCarousel();

  /* ---------- Footer mascot ("Interactive Footer" port) ----------
     Vanilla port of a Framer "Interactive Footer" component's
     eye-tracking character (no React/framer-motion) — a Minion (see
     the "MINION" CSS rules) standing in for the source's illustrated
     artwork: the eyes ease toward the pointer (or, when one's
     hovered/focused, toward whichever [data-footer-link] instead),
     the whole character gets a subtle pointer-driven tilt/3D depth
     and a slow idle float, and it blinks on a randomized timer — all
     plain rAF + CSS custom properties, paused off-screen
     (IntersectionObserver) or when the tab is hidden, and skipped
     under prefers-reduced-motion (eyes just stay centered, no
     blink/tilt/float). */
  function initFooterMascot() {
    const mascot = document.getElementById('footer-mascot');
    const footer = document.getElementById('site-footer');
    if (!mascot || !footer) return;

    const eyes = Array.from(mascot.querySelectorAll('[data-eye]'));
    const pupils = eyes.map((eye) => eye.querySelector('.footer-pupil'));

    if (prefersReducedMotion.matches) return; // CSS fallback already centers the pupils

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let gazeTarget = null;

    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    });

    document.querySelectorAll('[data-footer-link]').forEach((link) => {
      link.addEventListener('pointerenter', () => { gazeTarget = link; });
      link.addEventListener('pointerleave', () => { if (gazeTarget === link) gazeTarget = null; });
      link.addEventListener('focus', () => { gazeTarget = link; });
      link.addEventListener('blur', () => { if (gazeTarget === link) gazeTarget = null; });
    });

    function gazePoint() {
      if (gazeTarget) {
        const r = gazeTarget.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      return pointer;
    }

    let blinkStart = null;
    let nextBlinkAt = performance.now() + 2600 + Math.random() * 3200;
    function blinkValue(now) {
      if (blinkStart === null && now >= nextBlinkAt) {
        blinkStart = now;
        nextBlinkAt = now + 3600 + Math.random() * 4700;
      }
      if (blinkStart === null) return 0;
      const elapsed = now - blinkStart;
      if (elapsed <= 65) return elapsed / 65;
      if (elapsed <= 180) return 1 - (elapsed - 65) / 115;
      blinkStart = null;
      return 0;
    }

    let visible = true;
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { rootMargin: '60px' }).observe(footer);

    const current = { tilt: 0, depthX: 0, depthY: 0 };
    let last = performance.now();

    function tick(now) {
      requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      if (!visible || document.hidden) return;

      mascot.style.setProperty('--mascot-blink', blinkValue(now).toFixed(3));

      const mRect = mascot.getBoundingClientRect();
      const cx = mRect.left + mRect.width / 2;
      const cy = mRect.top + mRect.height / 2;
      const gaze = gazePoint();

      eyes.forEach((eye, i) => {
        const eRect = eye.getBoundingClientRect();
        const ex = eRect.left + eRect.width / 2;
        const ey = eRect.top + eRect.height / 2;
        const dx = gaze.x - ex;
        const dy = gaze.y - ey;
        const dist = Math.hypot(dx, dy, Math.max(110, eRect.width * 1.55));
        const travel = eRect.width * 0.22;
        const px = (dx / dist) * travel;
        const py = (dy / dist) * travel;
        pupils[i].style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
      });

      const nx = Math.max(-1, Math.min(1, (pointer.x - cx) / (window.innerWidth / 2)));
      const ny = Math.max(-1, Math.min(1, (pointer.y - cy) / (window.innerHeight / 2)));
      const blend = 1 - Math.exp(-dt / 150);
      current.tilt += (nx * 4 - current.tilt) * blend;
      current.depthX += (-ny * 5 - current.depthX) * blend;
      current.depthY += (nx * 5 - current.depthY) * blend;
      const breathe = Math.sin(now / 1600) * 6;

      mascot.style.setProperty('--mascot-tilt', current.tilt.toFixed(2) + 'deg');
      mascot.style.setProperty('--mascot-depth-x', current.depthX.toFixed(2) + 'deg');
      mascot.style.setProperty('--mascot-depth-y', current.depthY.toFixed(2) + 'deg');
      mascot.style.setProperty('--mascot-breathe', breathe.toFixed(2) + 'px');
    }
    requestAnimationFrame(tick);

    // Tap/click to blink on demand, same as the source's blinkOnPress.
    mascot.style.pointerEvents = 'auto';
    mascot.addEventListener('pointerdown', () => {
      blinkStart = performance.now();
      nextBlinkAt = blinkStart + 3600 + Math.random() * 4700;
    });
  }

  initFooterMascot();

  /* ---------- Tools orbit ("Team Section" port) ----------
     Vanilla port of a Framer "Team Section" component's interactive
     bits — the orbiting itself is pure CSS (see the .tools-orbit
     rules in style.css); this just handles the two things CSS can't
     do alone: pausing every ring/avatar the instant ANY chip is
     hovered (a single shared .is-paused class, exactly like the
     source's global isPaused flag — not per-item), and pausing the
     whole thing while it's off-screen via IntersectionObserver, so it
     costs nothing once you've scrolled past it. */
  function initToolsOrbit() {
    const root = document.getElementById('tools-orbit');
    if (!root) return;

    /* The rings are turned here (not by CSS keyframes) so a chip can be dragged
       round its ring. Each ring has its own phase in degrees; every chip is
       counter-rotated by its ring's phase plus its own fixed offset so it
       always stays upright. Default motion: ring 1 and 3 clockwise, ring 2
       anticlockwise, one turn per 36 seconds. */
    const rings = Array.from(root.querySelectorAll('.tools-orbit-ring')).map((el, i) => ({
      el,
      dir: i === 1 ? -1 : 1,
      phase: 0,
      avatars: Array.from(el.querySelectorAll('.tools-orbit-item')).map((item) => ({
        el: item.querySelector('.tools-orbit-avatar'),
        angle: parseFloat(item.style.getPropertyValue('--angle')) || 0
      }))
    }));
    const DEG_PER_SEC = 360 / 36;

    function render() {
      rings.forEach((r) => {
        r.el.style.transform = 'rotate(' + r.phase + 'deg)';
        r.avatars.forEach((a) => {
          a.el.style.transform = 'translate(-50%, -50%) rotate(' + (-a.angle - r.phase) + 'deg)';
        });
      });
    }
    render();

    let hovered = false;
    let visible = true;
    let dragging = false;

    function sync() {
      root.classList.toggle('is-paused', hovered || dragging || !visible);
    }

    root.querySelectorAll('.tools-orbit-avatar').forEach((avatar) => {
      avatar.addEventListener('mouseenter', () => { hovered = true; sync(); });
      avatar.addEventListener('mouseleave', () => { hovered = false; sync(); });

      // Drag a chip round the circle: only the angle around the centre matters, so a
      // chip can never leave its ring. Every ring turns by the same angle, so the
      // rest follow the direction it is dragged in. Letting go resumes the default drift.
      let lastAngle = 0;
      const pointerAngle = (e) => {
        const r = root.getBoundingClientRect();
        return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
      };
      avatar.addEventListener('pointerdown', (e) => {
        dragging = true;
        lastAngle = pointerAngle(e);
        avatar.classList.add('is-dragged');
        try { avatar.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
        sync();
      });
      avatar.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const a = pointerAngle(e);
        let d = a - lastAngle;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        lastAngle = a;
        rings.forEach((r) => { r.phase += d; });
        render();
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        avatar.classList.remove('is-dragged');
        sync();
      };
      avatar.addEventListener('pointerup', end);
      avatar.addEventListener('pointercancel', end);
      avatar.addEventListener('dragstart', (e) => e.preventDefault());
    });

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    }, { rootMargin: '100px 0px 100px 0px', threshold: 0 }).observe(root);

    let last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!prefersReducedMotion.matches && visible && !hovered && !dragging) {
        rings.forEach((r) => { r.phase += r.dir * DEG_PER_SEC * dt; });
        render();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  initToolsOrbit();

  /* ---------- Products Launched tabs card ----------
     Vanilla port of a Framer "Tabs card" component (see the CASE
     STUDY PAGE / PRODUCTS LAUNCHED block in style.css for the visual
     side): a column of tab rows beside one shared image panel, where
     selecting a tab swaps which image shows. Matches the source
     component's own behavior split — desktop switches on hover,
     touch/mobile switches on tap — rather than picking one for both.
     Harmless no-op on any page without a .cs-tabs-card. */
  function initProductTabs() {
    document.querySelectorAll('.cs-tabs-card').forEach(card => {
      const tabs = Array.from(card.querySelectorAll('.cs-tab-item'));
      const images = Array.from(card.querySelectorAll('.cs-tabs-image'));
      if (!tabs.length || !images.length) return;

      const setActive = (index) => {
        tabs.forEach((tab, i) => tab.classList.toggle('is-active', i === index));
        images.forEach((img, i) => img.classList.toggle('is-active', i === index));
      };

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => setActive(i));
      });

      const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (canHover) {
        tabs.forEach((tab, i) => {
          tab.addEventListener('mouseenter', () => setActive(i));
        });
      }
    });
  }

  initProductTabs();

  /* ---------- Flyer slideshows inside a tabs card ----------
     A [data-slideshow] image slot crossfades through its .cs-slide
     children every data-interval ms (default 2000). It only advances
     while its tab is the active one, the page is visible, and the user
     hasn't asked for reduced motion (then it just shows the first). */
  function initSlideshows() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-slideshow]').forEach(box => {
      const slides = Array.from(box.querySelectorAll('.cs-slide'));
      if (slides.length < 2) return;
      const delay = parseInt(box.dataset.interval, 10) || 2000;
      let current = 0;
      setInterval(() => {
        if (document.hidden || (box.classList.contains('cs-tabs-slideshow') && !box.classList.contains('is-active'))) return;
        slides[current].classList.remove('is-current');
        current = (current + 1) % slides.length;
        slides[current].classList.add('is-current');
      }, delay);
    });
  }

  initSlideshows();

  /* ---------- Auto-scrolling strips ([data-autoscroll]) ----------
     A seamless auto-scrolling line of flyers that can also be dragged
     with momentum — the same transform-driven loop as the app-screens
     carousel above, minus the flip-to-previous behaviour. It pauses while
     a mouse is over it, while dragging, off-screen, and with reduced motion. */
  function initAutoStrips() {
    document.querySelectorAll('[data-autoscroll]').forEach(setUpAutoStrip);
  }

  function setUpAutoStrip(viewport) {
    const track = viewport.querySelector('.cs-screens-track');
    if (!track) return;

    const seeds = Array.from(track.children);
    const GAP = 16;
    const PACE = 40; // px/s
    let loopWidth = 0;
    let offset = 0;
    let isDragging = false;
    let inView = true;
    let mouseOver = false;

    const apply = () => { track.style.transform = `translate3d(${-offset}px, 0, 0)`; };
    const wrap = (v) => (loopWidth > 0 ? ((v % loopWidth) + loopWidth) % loopWidth : v);

    function buildLoop() {
      track.querySelectorAll('[data-clone]').forEach((el) => el.remove());
      const seedWidth = seeds.reduce((sum, el) => sum + el.getBoundingClientRect().width + GAP, 0);
      const copies = Math.max(2, Math.ceil((viewport.clientWidth * 2) / seedWidth) + 1);
      for (let i = 0; i < copies; i++) {
        seeds.forEach((el) => {
          const clone = el.cloneNode(true);
          clone.setAttribute('data-clone', '');
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        });
      }
      loopWidth = seedWidth;
    }
    buildLoop();
    window.addEventListener('resize', () => { buildLoop(); offset = wrap(offset); apply(); });

    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; },
      { rootMargin: '100px 0px' }).observe(viewport);

    viewport.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') mouseOver = true; });
    viewport.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mouseOver = false; });

    let last = performance.now();
    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (inView && !prefersReducedMotion.matches && !isDragging && !mouseOver && loopWidth > 0) {
        offset = wrap(offset + PACE * dt);
        apply();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    let startX = 0, startOffset = 0, lastX = 0, lastT = 0, velocity = 0, momentumId = null;
    function stopMomentum() { if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; } }
    function momentumStep() {
      offset = wrap(offset + velocity);
      apply();
      velocity *= 0.94;
      momentumId = Math.abs(velocity) > 0.3 ? requestAnimationFrame(momentumStep) : null;
    }

    viewport.addEventListener('pointerdown', (e) => {
      isDragging = true;
      stopMomentum();
      viewport.classList.add('is-dragging');
      startX = e.clientX;
      startOffset = offset;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      offset = wrap(startOffset - (e.clientX - startX));
      apply();
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = -((e.clientX - lastX) / dt) * 16;
        lastX = e.clientX;
        lastT = now;
      }
    });
    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove('is-dragging');
      if (!prefersReducedMotion.matches && Math.abs(velocity) > 0.3) {
        momentumId = requestAnimationFrame(momentumStep);
      }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('dragstart', (e) => e.preventDefault());
  }

  initAutoStrips();

  /* ---------- Before/after screens carousel ----------
     One straight line of .cs-screen cards that auto-scrolls on a
     seamless loop and can be dragged with momentum — same transform-
     driven physics as initSideQuestsCarousel above. Each card flips
     between its redesigned and "Previously" screen: on hover for a
     mouse, on tap for touch (reverting by itself after a few seconds).
     Autoscroll pauses while a mouse is over the strip or any card is
     showing its old screen, so what you're looking at doesn't slide
     away; cards without an older counterpart simply don't flip.
     Hover/tap are delegated from the track, so the cloned loop copies
     work too. */
  function initScreensCarousel() {
    const viewport = document.getElementById('cs-screens');
    const track = viewport && viewport.querySelector('.cs-screens-track');
    if (!track) return;

    const seedCards = Array.from(track.children);
    const GAP = 16;
    const PACE = 40; // px/s autoscroll speed
    const TAP_REVERT_MS = 3000;

    let loopWidth = 0;
    let offset = 0;
    let isDragging = false;
    let inView = true;
    let tapTimer = null;

    function apply() {
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }
    function wrap(value) {
      return loopWidth > 0 ? ((value % loopWidth) + loopWidth) % loopWidth : value;
    }
    // Only cards that actually have an older screen can flip.
    function setPrevious(card, on) {
      if (card && card.querySelector('.cs-screen-img--old')) card.classList.toggle('is-previous', on);
    }
    function clearPrevious() {
      track.querySelectorAll('.cs-screen.is-previous').forEach((c) => c.classList.remove('is-previous'));
    }

    // The loop wraps within one seed-set's width, so the track needs
    // enough clones to span two viewport widths past it.
    function buildLoop() {
      track.querySelectorAll('[data-clone]').forEach((el) => el.remove());
      const seedWidth = seedCards.reduce((sum, el) => sum + el.getBoundingClientRect().width + GAP, 0);
      const copies = Math.max(2, Math.ceil((viewport.clientWidth * 2) / seedWidth) + 1);
      for (let i = 0; i < copies; i++) {
        seedCards.forEach((el) => {
          const clone = el.cloneNode(true);
          clone.setAttribute('data-clone', '');
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        });
      }
      loopWidth = seedWidth;
    }
    buildLoop();
    window.addEventListener('resize', () => { buildLoop(); offset = wrap(offset); apply(); });

    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
    }, { rootMargin: '100px 0px' }).observe(viewport);

    let mouseOver = false;
    viewport.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') mouseOver = true; });
    viewport.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mouseOver = false; });

    track.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse' || isDragging) return;
      const card = e.target.closest('.cs-screen');
      if (card && !card.contains(e.relatedTarget)) setPrevious(card, true);
    });
    track.addEventListener('pointerout', (e) => {
      if (e.pointerType !== 'mouse') return;
      const card = e.target.closest('.cs-screen');
      if (card && !card.contains(e.relatedTarget)) setPrevious(card, false);
    });

    let last = performance.now();
    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (inView && !prefersReducedMotion.matches && !isDragging && !mouseOver && loopWidth > 0 &&
          !track.querySelector('.cs-screen.is-previous')) {
        offset = wrap(offset + PACE * dt);
        apply();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    let startX = 0, startOffset = 0, lastX = 0, lastT = 0, velocity = 0;
    let moved = false, downCard = null, momentumId = null;

    function stopMomentum() {
      if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
    }
    function momentumStep() {
      offset = wrap(offset + velocity);
      apply();
      velocity *= 0.94;
      momentumId = Math.abs(velocity) > 0.3 ? requestAnimationFrame(momentumStep) : null;
    }

    viewport.addEventListener('pointerdown', (e) => {
      isDragging = true;
      moved = false;
      downCard = e.target.closest('.cs-screen');
      stopMomentum();
      if (e.pointerType === 'mouse') clearPrevious();
      viewport.classList.add('is-dragging');
      startX = e.clientX;
      startOffset = offset;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      if (Math.abs(e.clientX - startX) > 6) moved = true;
      offset = wrap(startOffset - (e.clientX - startX));
      apply();
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        velocity = -((e.clientX - lastX) / dt) * 16;
        lastX = e.clientX;
        lastT = now;
      }
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove('is-dragging');

      if (e.type === 'pointerup' && e.pointerType !== 'mouse' && !moved && downCard) {
        const wasPrevious = downCard.classList.contains('is-previous');
        clearTimeout(tapTimer);
        clearPrevious();
        if (!wasPrevious) {
          setPrevious(downCard, true);
          tapTimer = setTimeout(clearPrevious, TAP_REVERT_MS);
        }
      } else if (e.pointerType === 'mouse' && e.type === 'pointerup') {
        const under = document.elementFromPoint(e.clientX, e.clientY);
        setPrevious(under && under.closest('.cs-screen'), true);
      }

      if (!prefersReducedMotion.matches && Math.abs(velocity) > 0.3) {
        momentumId = requestAnimationFrame(momentumStep);
      }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('dragstart', (e) => e.preventDefault());
  }

  initScreensCarousel();

  /* ---------- Hover-flip cards (.cs-flip) ----------
     A single image that flips to its "previous" version. A mouse
     flips it with plain CSS :hover; this adds the other two ways in —
     a tap on touch/pen, and Enter/Space from the keyboard — each
     toggling .is-previous. (Mouse clicks are deliberately ignored so
     they don't fight the hover.) */
  function initFlipCards() {
    document.querySelectorAll('.cs-flip').forEach((card) => {
      const toggle = () => {
        const on = card.classList.toggle('is-previous');
        card.setAttribute('aria-pressed', String(on));
      };
      card.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') toggle(); });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  initFlipCards();

  /* ---------- Text reveal on scroll ----------
     Port of the Framer "ScrollRevealText" component (Characters mode, "Default"
     preset). The text is split into characters; each one fades (opacity .3 -> 1),
     changes colour (hidden -> revealed, via color-mix) and slides in from 7px to
     the left, one after another in a rolling wave:
       time        = progress * (DUR + (units - 1) * STAGGER)
       unit p      = clamp((time - index * STAGGER) / DUR, 0, 1)
     [data-text-reveal] elements sharing a parent read as ONE continuous sequence.
     Progress comes from the locked About panel on desktop (0 when it locks, 1 when
     it releases) and from the viewport window OFFSET_START -> OFFSET_END (% of the
     screen height, the component's own 80 -> 20) everywhere else. With reduced
     motion the text is left plain and fully readable. */
  function initTextRevealScroll() {
    const targets = Array.from(document.querySelectorAll('[data-text-reveal]'));
    if (!targets.length || prefersReducedMotion.matches) return;

    const STAGGER = 0.2;
    const DUR = 0.7;
    const X_OFFSET = 7;               // px each character slides in from
    const OFFSET_START = 80;
    const OFFSET_END = 20;
    const COLOR_HIDDEN = '#bfd4ff';   // brand periwinkle
    const COLOR_REVEALED = '#0c0054'; // brand navy

    // Siblings reveal together as one sequence.
    const groups = new Map();
    targets.forEach((el) => {
      const key = el.parentElement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });

    const instances = Array.from(groups.values()).map((elements) => {
      const chars = [];
      let unit = 0;
      elements.forEach((root) => {
        const text = root.textContent;
        root.textContent = '';
        root.setAttribute('aria-label', text.trim());
        text.split(/(\s+)/).forEach((token) => {
          if (token === '') return;
          if (/^\s+$/.test(token)) { root.appendChild(document.createTextNode(token)); return; }
          // Each word is one unbreakable unit, so lines only ever wrap between words.
          const word = document.createElement('span');
          word.setAttribute('aria-hidden', 'true');
          word.style.whiteSpace = 'nowrap';
          Array.from(token).forEach((ch) => {
            const span = document.createElement('span');
            span.textContent = ch;
            span.style.display = 'inline-block';
            span.style.willChange = 'transform, opacity, color';
            span.style.opacity = '0.3';
            span.style.color = COLOR_HIDDEN;
            span.style.transform = 'translateX(' + (-X_OFFSET) + 'px)';
            word.appendChild(span);
            chars.push({ el: span, unit: unit++ });
          });
          root.appendChild(word);
        });
      });
      return { elements, chars, units: unit, visible: true, visibleSet: new Set() };
    });

    function apply(inst, progress) {
      const totalTime = DUR + (inst.units - 1) * STAGGER;
      const time = progress * totalTime;
      inst.chars.forEach((c) => {
        const p = inst.units <= 1 ? progress : Math.max(0, Math.min(1, (time - c.unit * STAGGER) / DUR));
        c.el.style.opacity = (0.3 + p * 0.7).toFixed(3);
        c.el.style.transform = 'translateX(' + (-X_OFFSET + X_OFFSET * p).toFixed(1) + 'px)';
        c.el.style.color = 'color-mix(in srgb, ' + COLOR_REVEALED + ' ' + Math.round(p * 100) + '%, ' + COLOR_HIDDEN + ')';
      });
    }

    let ticking = false;
    function compute() {
      ticking = false;
      const vh = window.innerHeight;
      instances.forEach((inst) => {
        if (!inst.visible) return;
        let progress;
        const pin = inst.elements[0].closest('[data-reveal-pin]');
        if (pin && window.innerWidth > 900) {
          // Locked panel: starts as it locks under the nav, finishes as it releases.
          const pinRect = pin.getBoundingClientRect();
          const panel = pin.firstElementChild;
          const runway = Math.max(1, pinRect.height - panel.getBoundingClientRect().height);
          const stickyTop = parseFloat(getComputedStyle(panel).top) || 0;
          progress = (stickyTop - pinRect.top) / runway;
        } else {
          const rect = inst.elements[0].parentElement.getBoundingClientRect();
          const range = (OFFSET_START - OFFSET_END) / 100 * vh;
          progress = (OFFSET_START / 100 * vh - rect.top) / range;
        }
        apply(inst, Math.min(1, Math.max(0, progress)));
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const inst = instances.find((it) => it.elements.includes(entry.target));
        if (!inst) return;
        if (entry.isIntersecting) inst.visibleSet.add(entry.target);
        else inst.visibleSet.delete(entry.target);
        inst.visible = inst.visibleSet.size > 0;
      });
      onScroll();
    }, { rootMargin: '200px 0px 200px 0px', threshold: 0 });
    targets.forEach((el) => io.observe(el));

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    compute();
  }

  initTextRevealScroll();

  /* ---------- Scroll-linked "zoom settle" image reveal ----------
     An original recreation of the scroll-scale effect used on
     growxy.framer.website's own About/portfolio images: each tagged
     image starts scaled up (oversized inside an overflow:hidden
     wrapper) while it's still below the fold, and settles down to
     its natural scale(1) as it scrolls up into the top third of the
     viewport — then locks there and doesn't reverse on scroll-back,
     same as the reference. Progress is recomputed on scroll (rAF-
     throttled) and stops updating an image entirely once it's fully
     settled, so this costs nothing once you've scrolled past it. */
  function initScrollScaleReveal() {
    const images = Array.from(document.querySelectorAll('[data-scroll-scale]'));
    if (!images.length) return;

    if (prefersReducedMotion.matches) {
      images.forEach(img => { img.style.transform = 'scale(1)'; });
      return;
    }

    const START_SCALE = 1.25;
    let pending = images.slice();
    let ticking = false;

    function update() {
      ticking = false;
      const vh = window.innerHeight;
      const startTrigger = vh;
      const endTrigger = vh * 0.25;

      pending = pending.filter(img => {
        const rect = img.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (startTrigger - rect.top) / (startTrigger - endTrigger)));
        const scale = START_SCALE - (START_SCALE - 1) * progress;
        img.style.transform = `scale(${scale})`;
        return progress < 1;
      });

      if (!pending.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  initScrollScaleReveal();

  /* ---------- Page transitions ----------
     Two stacked cards (present in the HTML, covering by default) —
     an accent card and a solid cover card carrying the current
     page's title — hold on load, then lift away together to reveal
     the page, reading as directed rather than a hard reload. Each
     page knows its own title from its own body[data-page], so no
     state needs to be handed across the navigation. The stagger
     between the two cards (accent leads covering, cover leads
     revealing) lives entirely in CSS via transition-delay; this just
     toggles the classes and times the navigate. Reduced motion gets
     the overlay hidden entirely in CSS, and this skips wiring up the
     click intercept to match — links just navigate instantly, same
     as a plain static site. */
  function initPageTransitions() {
    // Page transitions are switched off for now. Set to true (and remove the
    // `display: none` rule on .page-transition in style.css) to bring them back.
    const TRANSITIONS_ENABLED = false;
    const overlay = document.querySelector('.page-transition');
    if (!TRANSITIONS_ENABLED || !overlay || prefersReducedMotion.matches) return;

    const PAGE_TITLES = {
      home: 'Home',
      work: 'Work',
      events: 'Events',
      storytelling: 'Storytelling',
      'side-quests': 'Side Quests',
      contact: 'Contact',
    };

    const LOAD_DELAY = 50;          // let the first paint land before animating
    const ENTRY_REVEAL_DELAY = 250; // brief hold, fully covered, before lifting away
    const EXIT_DURATION = 760;      // stagger + transition time to fully re-cover

    const titleEl = overlay.querySelector('.loader-title');

    setTimeout(() => {
      overlay.classList.add('is-loading');
      setTimeout(() => {
        overlay.classList.add('is-revealed');
      }, ENTRY_REVEAL_DELAY);
    }, LOAD_DELAY);

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = e.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      let url;
      try { url = new URL(link.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (!/\.html?$/.test(url.pathname)) return;
      if (url.pathname === window.location.pathname) return;

      e.preventDefault();
      // Snap back to the resting (untitled) state — no title fade on
      // the way out, that's the destination's job — and re-cover.
      overlay.classList.remove('is-loading');
      overlay.classList.remove('is-revealed');
      setTimeout(() => { window.location.href = link.href; }, EXIT_DURATION);
    });
  }

  initPageTransitions();

  /* ---------- Sticky scroll-driven events gallery ----------
     Scrolling through the tall .events-scroller track advances which
     slide is "active" (cross-faded in) while .events-scroller-sticky
     stays pinned to the viewport — an original recreation of Framer's
     "ImageScroller" component. Progress is computed the same way its
     scroll-linked animation is: 0 when the track's top reaches the
     viewport top, 1 when the track's bottom reaches the viewport
     bottom. Clicking a thumbnail scrolls straight to that slide's
     middle instead of requiring a scrub through every one before it. */
  function initEventsScroller() {
    const container = document.getElementById('events-scroller');
    if (!container) return;
    const sticky = container.querySelector('.events-scroller-sticky');
    const slides = Array.from(container.querySelectorAll('.events-scroller-slide'));
    const thumbs = Array.from(container.querySelectorAll('.events-scroller-thumb'));
    const total = slides.length;
    if (!total) return;

    let activeIndex = 0;
    function setActive(index) {
      if (index === activeIndex && slides[index].classList.contains('is-active')) return;
      activeIndex = index;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      thumbs.forEach((thumb, i) => thumb.classList.toggle('is-active', i === index));
    }

    function update() {
      const rect = container.getBoundingClientRect();
      const scrollableHeight = container.offsetHeight - sticky.offsetHeight;
      if (scrollableHeight <= 0) { setActive(0); return; }
      const scrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, scrolled / scrollableHeight));
      setActive(Math.min(total - 1, Math.floor(progress * total)));
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => {
        const scrollableHeight = container.offsetHeight - sticky.offsetHeight;
        const targetProgress = (i + 0.5) / total;
        const containerTop = container.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: containerTop + targetProgress * scrollableHeight, behavior: 'smooth' });
      });
    });
  }

  initEventsScroller();

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
      modal.querySelector('button[data-modal-close], a[data-modal-close]').focus();
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

  /* "I've Worked At" experience cards */
  initDetailModal(
    document.getElementById('exp-modal'),
    document.querySelectorAll('.exp-card[data-exp-company]'),
    (modal, button) => {
      modal.querySelector('#exp-modal-title').textContent = button.dataset.expCompany;
      modal.querySelector('#exp-modal-role').textContent = button.dataset.expRole;
      modal.querySelector('#exp-modal-date').textContent = button.dataset.expDate;
      modal.querySelector('#exp-modal-logo').innerHTML = button.querySelector('.exp-logo').innerHTML;

      const body = modal.querySelector('#exp-modal-body');
      body.innerHTML = '';
      button.dataset.expDetail.split('||').forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph.trim();
        body.appendChild(p);
      });
    }
  );

  /* Video recap thumbnails: load into a modal on tap, paused, so the
     viewer decides when to actually start playback. A large play icon
     (matching the thumbnail's) sits over the paused video and hides
     itself once playback actually starts. */
  function initVideoModal() {
    const modal = document.getElementById('video-modal');
    const triggers = document.querySelectorAll('[data-video-src]');
    if (!modal || !triggers.length) return;

    const panel = modal.querySelector('.video-modal-panel');
    const video = modal.querySelector('.video-modal-player');
    const playIcon = modal.querySelector('.video-modal-play-icon');

    initDetailModal(modal, triggers, (modal, button) => {
      video.src = button.dataset.videoSrc;
      video.poster = button.dataset.videoPoster || '';
      panel.style.setProperty('--video-aspect', button.dataset.videoAspect || '4 / 5');
      panel.classList.remove('is-playing');
    });

    playIcon.addEventListener('click', () => video.play());
    video.addEventListener('play', () => panel.classList.add('is-playing'));
    video.addEventListener('pause', () => panel.classList.remove('is-playing'));

    const stopVideo = () => { video.pause(); video.currentTime = 0; panel.classList.remove('is-playing'); };
    modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', stopVideo));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') stopVideo(); });
  }

  initVideoModal();

  /* ---------- Hero animated gradient (WebGL) ----------
     Ported from a React/shadcn "Velaris" component to plain JS/WebGL
     since this project has no React, TypeScript, Tailwind, or shadcn
     build tooling — same simplex-noise fragment shader, no framework
     required. Recolored to the site's own blue palette. Mounted as a
     canvas behind .hero-inner; the section's existing CSS background
     (solid navy + radial gradient + noise texture) stays in place
     underneath as the fallback for prefers-reduced-motion or when
     WebGL isn't available. */
  function initHeroGradient() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-gradient-canvas';
    hero.insertBefore(canvas, hero.firstChild);

    const gl = canvas.getContext('webgl');
    if (!gl) { canvas.remove(); return; }

    const vertexShaderGLSL = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderGLSL = `
      precision highp float;
      varying vec2 vUv;

      uniform vec2  u_resolution;
      uniform float u_time;
      uniform float u_grain;
      uniform vec3  u_colors[4];
      uniform vec3  u_bg;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
          dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;
        float ratio = u_resolution.x / u_resolution.y;
        vec2 p = uv - 0.5;
        p.x *= ratio;

        float t = u_time * 0.1;

        float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
        float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
        float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

        vec3 col = u_bg;

        float dist = length(p) * 1.5;
        float vignette = 1.0 - smoothstep(0.3, 1.2, dist);

        col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
        col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
        col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
        col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

        float glow = smoothstep(0.8, 0.0, dist) * 0.3;
        col += u_colors[1] * glow;

        col = mix(col * 0.2, col, vignette);

        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
        col += (grain - 0.5) * u_grain * 0.1;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderGLSL));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderGLSL));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const locs = {
      res: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      colors: gl.getUniformLocation(program, 'u_colors'),
      bg: gl.getUniformLocation(program, 'u_bg'),
    };

    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ];
    };

    // The site's own blue palette (periwinkle/blue/indigo/navy) —
    // bg matches .hero's existing solid navy fallback so there's no
    // color jump once the canvas takes over.
    const bg = '#0c0054';
    const colors = ['#bfd4ff', '#0052ff', '#0a00cb', '#0c0054'];
    const speed = 0.6;
    const grain = 0.15;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = hero.clientWidth * dpr;
      canvas.height = hero.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(hero);
    resize();

    const colorsFlat = new Float32Array(colors.slice(0, 4).flatMap(hexToRgb));
    const bgRgb = hexToRgb(bg);

    let raf;
    const render = (t) => {
      gl.uniform2f(locs.res, canvas.width, canvas.height);
      gl.uniform1f(locs.time, t * 0.001 * speed);
      gl.uniform1f(locs.grain, grain);
      gl.uniform3f(locs.bg, bgRgb[0], bgRgb[1], bgRgb[2]);
      gl.uniform3fv(locs.colors, colorsFlat);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    window.addEventListener('pagehide', () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    });
  }

  initHeroGradient();

});
