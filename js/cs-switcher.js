/* One switcher for every project page (css/case-study-polish.css styles it).
 *
 * It upgrades two things:
 *   - every .cs-tabs-card (Business products, Design Sprint tabs, Stablecoin topics, Consumer product pages): a list of tabs
 *     beside (or above) a picture. Tabs get a number badge, a highlight pill that slides between them, a description that
 *     opens like an accordion, and a thin progress bar while the card cycles by itself.
 *   - every .cs-flip (the Consumer website before / after): a two-way "Redesigned | Previously" control built the same way.
 *
 * Behaviour, the same everywhere:
 *   - it moves on to the next item every 4 seconds while nobody is using it (and only while it is on screen), and the
 *     progress bar shows the time left; hovering or focusing it pauses the cycle, leaving it carries on
 *   - a mouse resting on a tab selects it; a tap or click selects it on touch screens and with the keyboard
 *   - arrow keys move between tabs, Home / End jump to the first / last, Enter or Space select (proper tablist / tab / tabpanel)
 *   - the pictures are all loaded up front so the crossfade never flashes blank
 *   - with reduced motion nothing cycles by itself and everything swaps at once
 */
(function () {
  var STEP = 4000;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var uid = 0;

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  /* The engine: tabs[] and panels[] go together; onChange(i, user) is called for each change. */
  function engine(root, tabs, o) {
    var cur = Math.max(0, tabs.findIndex(function (t) { return t.classList.contains('is-active'); }));
    var pill = o.pill, vertical = o.vertical;
    var timer = 0, started = 0, left = STEP, paused = false, visible = false;
    var autoplay = !reduce.matches && tabs.length > 1 && o.autoplay !== false;

    /* Where the active tab ends up once its description has finished opening (and the old one has finished closing).
       Measured on a hidden copy of the list with no transitions, so the pill can slide straight to its final spot and size
       instead of aiming at a tab that is still half open. */
    function finalBox() {
      var list = tabs[cur].parentNode, host = list.parentNode;
      var copy = list.cloneNode(true);
      copy.classList.add('cs-measuring');
      copy.style.cssText = 'position:absolute;left:' + list.offsetLeft + 'px;top:' + list.offsetTop + 'px;width:' + list.offsetWidth + 'px;visibility:hidden;pointer-events:none';
      var items = copy.querySelectorAll('.cs-tab-item');
      Array.prototype.forEach.call(items, function (it, k) { it.classList.toggle('is-active', k === cur); });
      host.appendChild(copy);
      var t = items[cur], box = { x: t.offsetLeft, y: t.offsetTop, w: t.offsetWidth, h: t.offsetHeight };
      host.removeChild(copy);
      return box;
    }
    function place() {
      if (!pill) return;
      var b = finalBox();
      pill.style.setProperty('--px', b.x + 'px');
      pill.style.setProperty('--py', b.y + 'px');
      pill.style.setProperty('--pw', b.w + 'px');
      pill.style.setProperty('--ph', b.h + 'px');
    }
    function bar(i) { return tabs[i].querySelector('.cs-tab-bar i'); }
    function runBar(ms, from) {
      tabs.forEach(function (t, k) { var b = bar(k); if (b) { b.style.animation = 'none'; b.style.transform = 'scaleX(0)'; } });
      var b = bar(cur); if (!b || !autoplay) return;
      void b.offsetWidth;
      b.style.transform = '';
      b.style.animation = 'cs-sw-fill ' + ms + 'ms linear ' + (-(STEP - ms)) + 'ms forwards';
      b.style.animationPlayState = paused ? 'paused' : 'running';
    }
    function schedule(ms) {
      clearTimeout(timer); timer = 0;
      left = ms;
      runBar(ms);
      if (!autoplay || paused || !visible || document.hidden) return;
      started = performance.now();
      timer = setTimeout(function () { select((cur + 1) % tabs.length, false); }, ms);
    }
    function select(i, user) {
      if (i < 0 || i >= tabs.length) return;
      var changed = i !== cur;
      cur = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('aria-expanded', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      place();
      setTimeout(place, 520);   // again once the description has finished opening, so the pill ends exactly on the item
      if (changed || user === 'init') o.onChange(i, user);
      schedule(STEP);
    }
    function pause() { if (paused) return; paused = true; if (timer) { left = Math.max(300, left - (performance.now() - started)); clearTimeout(timer); timer = 0; } var b = bar(cur); if (b) b.style.animationPlayState = 'paused'; }
    function resume() {
      if (!paused) return; paused = false;
      var b = bar(cur); if (b) b.style.animationPlayState = 'running';
      if (autoplay && visible && !document.hidden && !timer) { started = performance.now(); timer = setTimeout(function () { select((cur + 1) % tabs.length, false); }, left); }
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, true); });
      t.addEventListener('keydown', function (e) {
        var d = null, n = tabs.length;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = (cur + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = (cur - 1 + n) % n;
        else if (e.key === 'Home') d = 0;
        else if (e.key === 'End') d = n - 1;
        if (d === null) return;
        e.preventDefault(); select(d, true); tabs[d].focus();
      });
      // a mouse resting on a tab selects it (touch screens use a tap, so nothing here depends on hover)
      var intent = 0;
      t.addEventListener('mouseenter', function () { if (!canHover.matches) return; if (cur !== i) select(i, true); });
      t.addEventListener('mouseleave', function () { clearTimeout(intent); });
    });
    root.addEventListener('mouseenter', function () { if (canHover.matches) pause(); });
    root.addEventListener('mouseleave', function () { if (canHover.matches) resume(); });
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) resume(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { clearTimeout(timer); timer = 0; if (!paused) left = Math.max(300, left - (performance.now() - started)); } else if (!paused) schedule(left); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) { if (!timer && !paused) schedule(left); } else { clearTimeout(timer); timer = 0; if (!paused) left = Math.max(300, left - (performance.now() - started)); }
      }, { threshold: 0.35 }).observe(root);
    } else visible = true;
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(root); else window.addEventListener('resize', place);
    window.addEventListener('load', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    select(cur, 'init');
    return { select: select, pause: pause, resume: resume };
  }

  /* ---------- tabs cards ---------- */
  function tabsCard(card) {
    var list = card.querySelector('.cs-tabs-list');
    var tabs = Array.prototype.slice.call(card.querySelectorAll('.cs-tab-item'));
    var panels = Array.prototype.slice.call(card.querySelectorAll('.cs-tabs-image'));
    if (!list || tabs.length < 1 || !panels.length) return;
    var id = 'cs-sw' + (++uid);
    card.classList.add('cs-sw');
    list.setAttribute('role', 'tablist');
    var pill = el('span', 'cs-sw-pill'); pill.setAttribute('aria-hidden', 'true');
    list.insertBefore(pill, list.firstChild);
    var vertical = !card.classList.contains('cs-tabs-card--wide') && !card.classList.contains('cs-tabs-card--duo');

    tabs.forEach(function (t, i) {
      var title = t.querySelector('.cs-tab-title');
      var desc = t.querySelector('.cs-tab-desc');
      var num = el('span', 'cs-tab-num'); num.textContent = (i < 9 ? '0' : '') + (i + 1); num.setAttribute('aria-hidden', 'true');
      var main = el('span', 'cs-tab-main');
      if (title) main.appendChild(title);
      if (desc) {
        var body = el('span', 'cs-tab-body'), inner = el('span', 'cs-tab-body-in');
        inner.appendChild(desc); body.appendChild(inner); main.appendChild(body);
      }
      var chev = el('span', 'cs-tab-chev'); chev.setAttribute('aria-hidden', 'true');
      var bar = el('span', 'cs-tab-bar'); bar.setAttribute('aria-hidden', 'true'); bar.appendChild(document.createElement('i'));
      t.textContent = '';
      t.appendChild(num); t.appendChild(main); if (desc) t.appendChild(chev); t.appendChild(bar);
      t.classList.toggle('has-desc', !!desc);
      t.id = id + '-t' + i; t.setAttribute('role', 'tab');
      if (panels[i]) { panels[i].id = id + '-p' + i; t.setAttribute('aria-controls', panels[i].id); panels[i].setAttribute('role', 'tabpanel'); panels[i].setAttribute('aria-labelledby', t.id); }
    });
    // every picture is fetched up front, so a change never shows a blank frame
    Array.prototype.forEach.call(card.querySelectorAll('img'), function (im) { im.loading = 'eager'; im.decoding = 'async'; if (im.decode) im.decode().catch(function () {}); });

    engine(card, tabs, {
      pill: pill, vertical: vertical,
      onChange: function (i) {
        panels.forEach(function (p, k) {
          var was = p.classList.contains('is-active');
          p.classList.toggle('is-active', k === i);
          p.setAttribute('aria-hidden', k === i ? 'false' : 'true');
          p.classList.remove('is-leaving');
          if (was && k !== i && !reduce.matches) {     // the old picture fades out on top of the new one (no blank frame between them)
            void p.offsetWidth;
            p.classList.add('is-leaving');
            clearTimeout(p._leave); p._leave = setTimeout(function () { p.classList.remove('is-leaving'); }, 320);
          }
        });
      }
    });
  }

  /* ---------- the before / after card ---------- */
  function flipCard(card) {
    var parent = card.parentNode;
    var seg = el('div', 'cs-seg cs-sw'); seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', 'Choose a version of the page');
    var pill = el('span', 'cs-sw-pill'); pill.setAttribute('aria-hidden', 'true'); seg.appendChild(pill);
    var names = ['Redesigned', 'Previously'], tabs = [];
    names.forEach(function (n, i) {
      var b = el('button', 'cs-tab-item cs-seg-item'); b.type = 'button';
      var num = el('span', 'cs-tab-num'); num.textContent = '0' + (i + 1); num.setAttribute('aria-hidden', 'true');
      var lab = el('span', 'cs-tab-title'); lab.textContent = n;
      var bar = el('span', 'cs-tab-bar'); bar.setAttribute('aria-hidden', 'true'); bar.appendChild(document.createElement('i'));
      b.appendChild(num); b.appendChild(lab); b.appendChild(bar); b.setAttribute('role', 'tab');
      if (i === 0) b.classList.add('is-active');
      seg.appendChild(b); tabs.push(b);
    });
    parent.insertBefore(seg, card);
    Array.prototype.forEach.call(card.querySelectorAll('img'), function (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); });
    var api = engine(seg, tabs, {
      pill: pill, vertical: false,
      onChange: function (i) { var on = i === 1; card.classList.toggle('is-previous', on); card.setAttribute('aria-pressed', String(on)); }
    });
    card.addEventListener('mouseenter', function () { if (canHover.matches) api.pause(); });
    card.addEventListener('mouseleave', function () { if (canHover.matches) api.resume(); });
    // a tap on the picture itself (or Enter / Space on it) flips it too: keep the control in step
    new MutationObserver(function () { var want = card.classList.contains('is-previous') ? 1 : 0; if (!tabs[want].classList.contains('is-active')) api.select(want, true); }).observe(card, { attributes: true, attributeFilter: ['class'] });
  }

  document.querySelectorAll('.cs-tabs-card').forEach(tabsCard);
  document.querySelectorAll('.cs-flip').forEach(flipCard);
})();
