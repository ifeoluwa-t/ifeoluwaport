/* Events journal for the landing page: a 3D book you flip through (idea: a travel-journal
 * page-flip gallery). Pages come from the <li> items in #bk. On wide screens it shows two
 * pages at a time; on narrow screens, one. Arrows, arrow keys, or a drag/swipe turn the page. */
(function () {
  var root = document.getElementById('bk');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var data = Array.prototype.slice.call(root.querySelectorAll('.bk-data li')).map(function (li) {
    var g = function (k) { return li.getAttribute('data-' + k) || ''; };
    return { kind: g('kind') || 'event', title: g('title'), caption: g('caption'), tag: g('tag'), src: g('src'), w: +g('w') || 1, h: +g('h') || 1,
             alt: g('alt'), kicker: g('kicker'), text: g('text'), note: g('note'), link: g('link'), label: g('label') };
  });
  if (!data.length) return;

  var single = false, spread = 0, nSpreads = 0, leaves = [], viewport = null, stage = null, prev = null, next = null, count = null, live = null, suppress = 0;
  var FAN = 9;   // px each page further down the stack peeks out

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function pageHTML(p, side, idx) {
    var cls = 'bk-page bk-page--' + side;
    if (!p) return '<div class="' + cls + ' bk-page--blank"></div>';
    if (p.kind === 'intro') return '<div class="' + cls + '"><span class="bk-kicker">' + esc(p.kicker) + '</span><p class="bk-hero">' + esc(p.text) + '</p><span class="bk-note">' + esc(p.note) + ' &rarr;</span></div>';
    if (p.kind === 'outro') return '<div class="' + cls + '"><span class="bk-kicker">Want more?</span><p class="bk-hero">' + esc(p.text) + '</p><a class="bk-link" href="' + esc(p.link) + '">' + esc(p.label) + ' &rarr;</a></div>';
    var tilt = (idx % 2 ? 1.6 : -1.8);
    return '<div class="' + cls + '"><a class="bk-photo" href="events.html" style="--tilt:' + tilt + 'deg" aria-label="' + esc(p.title) + ' (opens the Events page)"><img src="' + esc(p.src) + '" width="' + p.w + '" height="' + p.h + '" alt="' + esc(p.alt) + '" draggable="false" loading="lazy" decoding="async"></a>' +
      '<h3 class="bk-title">' + esc(p.title) + '</h3><p class="bk-caption">' + esc(p.caption) + '</p><span class="bk-tag">' + esc(p.tag) + '</span></div>';
  }

  function build() {
    root.classList.remove('is-ready');
    var old = root.querySelector('.bk-viewport'); if (old) old.remove();
    var oldNav = root.querySelector('.bk-nav'); if (oldNav) oldNav.remove();
    var oldLive = root.querySelector('.bk-live'); if (oldLive) oldLive.remove();

    var avail = root.clientWidth || window.innerWidth;
    single = avail < 700;
    var vhMax = window.innerHeight * 0.7;
    var pw = single ? Math.min(avail * 0.8, vhMax / 1.3) : Math.min(avail / 2, 500, vhMax / 1.3);
    pw = Math.floor(pw);
    var ph = Math.floor(pw * 1.3);
    // leaves: a leaf's front is a right-hand page, its back a left-hand page
    var leafPages = [];
    if (single) { for (var i = 0; i < data.length; i++) leafPages.push({ front: i, back: -1 }); nSpreads = data.length; }
    else {
      for (var j = 0; 2 * j + 1 < data.length; j++) leafPages.push({ front: 2 * j + 1, back: 2 * j + 2 < data.length ? 2 * j + 2 : -1 });
      nSpreads = leafPages.length + 1;
    }
    spread = Math.max(0, Math.min(nSpreads - 1, spread));

    viewport = document.createElement('div');
    viewport.className = 'bk-viewport' + (single ? ' is-single' : '');
    viewport.style.perspective = Math.round(pw * (single ? 4.2 : 3.6)) + 'px';
    stage = document.createElement('div');
    stage.className = 'bk-stage';
    stage.style.width = (single ? pw : pw * 2) + 'px';
    stage.style.height = ph + 'px';
    stage.style.setProperty('--pw', pw + 'px');
    stage.style.setProperty('--ph', ph + 'px');
    stage.style.setProperty('--spine', single ? '0px' : '50%');
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Events journal: use the arrow keys to turn the pages');
    var html = '';
    if (!single) {
      html += '<div class="bk-base">' + pageHTML(data[0], 'left', 0) + '</div>';
      html += '<div class="bk-base bk-base--right">' + pageHTML(null, 'right') + '</div>';
    }
    leafPages.forEach(function (lp, k) {
      html += '<div class="bk-leaf" data-k="' + k + '"><div class="bk-face bk-face--front">' + pageHTML(data[lp.front], 'right', lp.front) + '</div>' +
        '<div class="bk-face bk-face--back">' + (lp.back >= 0 ? pageHTML(data[lp.back], 'left', lp.back) : pageHTML(null, 'left')) + '</div></div>';
    });
    stage.innerHTML = html;
    viewport.appendChild(stage);
    root.appendChild(viewport);
    leaves = Array.prototype.slice.call(stage.querySelectorAll('.bk-leaf'));

    var nav = document.createElement('div');
    nav.className = 'bk-nav';
    nav.innerHTML = '<button type="button" class="bk-btn" data-d="-1" aria-label="Previous pages"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<span class="bk-count" aria-hidden="true"></span>' +
      '<button type="button" class="bk-btn" data-d="1" aria-label="Next pages"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    root.appendChild(nav);
    live = document.createElement('span');
    live.className = 'bk-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    root.appendChild(live);
    prev = nav.children[0]; next = nav.children[2]; count = nav.children[1];
    prev.addEventListener('click', function () { go(spread - 1); });
    next.addEventListener('click', function () { go(spread + 1); });
    wire();
    root.classList.add('is-ready');
    place(true);
  }

  // Put every leaf where it belongs for the current spread: flipped ones to the left, the rest on the right.
  function place(instant) {
    var flipped = spread;    // number of leaves already turned over
    leaves.forEach(function (leaf, k) {
      var isFlipped = k < flipped;
      var m = isFlipped ? flipped - 1 - k : k - flipped;      // 0 = the leaf on top of its stack
      var angle = isFlipped ? -180 : 0;
      var z = (isFlipped ? 1 : -1) * m * 0.4;
      leaf.style.transitionDelay = instant || reduce ? '0s' : (Math.abs(k - (spread - 0.5)) * 0.04) + 's';
      if (instant) leaf.style.transition = 'none';
      leaf.style.transform = 'rotateY(' + angle + 'deg) translateX(' + Math.min(m, 4) * FAN + 'px) translateZ(' + z + 'px)';
      leaf.style.zIndex = String(100 - m);
      if (instant) { void leaf.offsetWidth; leaf.style.transition = ''; }
    });
    prev.disabled = spread <= 0; next.disabled = spread >= nSpreads - 1;
    count.textContent = (spread + 1) + ' / ' + nSpreads;
    var a = single ? data[spread] : data[Math.min(2 * spread + 1, data.length - 1)];
    live.textContent = (a && a.title ? a.title + '. ' : '') + 'Page ' + (spread + 1) + ' of ' + nSpreads;
  }
  function go(s) {
    s = Math.max(0, Math.min(nSpreads - 1, s));
    if (s === spread) return;
    spread = s;
    place(false);
  }

  function wire() {
    var d = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !e.isPrimary) return;
      d = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, touch: e.pointerType !== 'mouse' };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!d || d.id !== e.pointerId) return;
      var dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.on) {
        if (Math.hypot(dx, dy) < 8) return;
        if (d.touch && Math.abs(dy) > Math.abs(dx)) { d = null; return; }   // vertical swipe scrolls the page
        d.on = true; stage.classList.add('is-dragging'); stage.setPointerCapture(e.pointerId);
      }
    });
    function end(e) {
      var s = d; d = null;
      if (!s || !s.on) return;
      stage.classList.remove('is-dragging');
      if (stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      suppress = performance.now() + 250;
      var dx = e.clientX - s.x;
      if (Math.abs(dx) > 40) go(spread + (dx < 0 ? 1 : -1));
    }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('click', function (e) { if (performance.now() < suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });
    root.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(spread + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(spread - 1); }
    });
  }

  build();
  var lastW = root.clientWidth, lastH = window.innerHeight, t = 0;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      if (Math.abs(root.clientWidth - lastW) < 2 && Math.abs(window.innerHeight - lastH) < 60) return;   // ignore phone address-bar jiggle
      lastW = root.clientWidth; lastH = window.innerHeight;
      var keep = single ? spread : spread * 2;      // keep roughly the same page when switching layouts
      var wasSingle = single;
      build();
      if (wasSingle !== single) { spread = single ? Math.min(keep, nSpreads - 1) : Math.min(Math.round(keep / 2), nSpreads - 1); place(true); }
    }, 150);
  });
})();
