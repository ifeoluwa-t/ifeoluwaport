/* Case-study "In this file" contents: builds a list from every [data-toc] section,
   highlights the section being read, and scrolls to one on click. */
(function () {
  const targets = Array.from(document.querySelectorAll('[data-toc]'));
  if (targets.length < 2) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WIDE = window.matchMedia('(min-width: 1580px)');

  const arrow = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.83 11H20v2H7.83l5.36 5.36-1.41 1.42L4 12l7.78-7.78 1.41 1.42z"/></svg>';
  const listIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"/></svg>';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cs-toc-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'cs-toc');
  toggle.innerHTML = listIcon + '<span>In this file</span>';

  const nav = document.createElement('nav');
  nav.className = 'cs-toc';
  nav.id = 'cs-toc';
  nav.setAttribute('aria-label', 'In this file');
  nav.innerHTML =
    '<a class="cs-toc-back" href="work.html" aria-label="Back to all work">' + arrow + 'All work</a>' +
    '<div><span class="cs-toc-label">In this file</span><ul class="cs-toc-list"></ul></div>';
  const list = nav.querySelector('.cs-toc-list');

  const links = targets.map((t) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'cs-toc-link';
    a.href = '#' + t.id;
    a.textContent = t.dataset.toc;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (t === targets[0]) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (!WIDE.matches) close();
    });
    li.appendChild(a);
    list.appendChild(li);
    return a;
  });

  document.body.append(toggle, nav);

  function open() { nav.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); }
  function close() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => (nav.classList.contains('is-open') ? close() : open()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('pointerdown', (e) => {
    if (!WIDE.matches && nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) close();
  });

  // Wide screens keep the list permanently open once it appears.
  function syncMode() { nav.classList.toggle('is-open', WIDE.matches ? true : nav.classList.contains('is-open')); if (WIDE.matches) toggle.setAttribute('aria-expanded', 'true'); }
  (WIDE.addEventListener ? WIDE.addEventListener('change', syncMode) : WIDE.addListener(syncMode));

  // Show once the hero has scrolled away; highlight the section being read.
  let ticking = false;
  function update() {
    ticking = false;
    const hero = targets[0];
    document.body.classList.toggle('cs-toc-on', hero.getBoundingClientRect().bottom < window.innerHeight * 0.35);
    const line = window.innerHeight * 0.35;
    let current = 0;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top <= line) current = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = links.length - 1 < 0 ? 0 : current;
    links.forEach((a, i) => {
      const on = i === current;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  syncMode();
  update();
})();
