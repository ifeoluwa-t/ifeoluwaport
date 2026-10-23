/* Storytelling page: tile -> story smooth scroll, hash update, brief highlight.
   Tiles and "Back to all stories" are real anchors, so they still work
   without JavaScript; this only adds the polish. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function highlight(el) {
    if (!el || !el.classList.contains('st-story') || reduce.matches) return;
    el.classList.remove('is-highlight');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-highlight');
    setTimeout(function () { el.classList.remove('is-highlight'); }, 1100);
  }

  function go(hash, push) {
    var id = decodeURIComponent(hash.slice(1));
    var el = id && document.getElementById(id);
    if (!el) return false;
    if (el.hidden) setFilter(el.getAttribute('data-cat') || 'all'); // open the story's own tab first
    el.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (push && window.location.hash !== hash) history.pushState(null, '', hash);
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    // Wait for the scroll to settle (instantly under reduced motion).
    setTimeout(function () { highlight(el); }, reduce.matches ? 0 : 450);
    return true;
  }

  // ---------- Filter tabs (All / Decks / Articles / Others) ----------
  var filters = document.querySelector('.st-filters');
  var tabs = filters ? Array.prototype.slice.call(filters.querySelectorAll('.st-filter')) : [];
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));

  function restripe() {
    // Keep backgrounds and image sides alternating across whichever stories are showing.
    var n = 0;
    document.querySelectorAll('.st-story').forEach(function (s) {
      if (s.hidden) return;
      s.classList.toggle('st-story--pale', n % 2 === 0);
      s.classList.toggle('st-story--periwinkle', n % 2 === 1);
      s.classList.toggle('st-story--reverse', n % 2 === 1);
      n++;
    });
  }

  function setFilter(name) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-filter') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var sec = document.getElementById('st-gallery');
    if (sec) sec.setAttribute('data-filter', name);
    items.forEach(function (el) {
      var match = name === 'all' || el.getAttribute('data-cat') === name;
      // Tiles follow the tab. Detail sections stay tucked away on "All" (the tiles
      // carry a short description there) and appear for a single category.
      el.hidden = el.classList.contains('st-story') ? (name === 'all' || !match) : !match;
    });
    restripe();
  }

  if (filters) {
    filters.hidden = false;
    setFilter('all');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { setFilter(t.getAttribute('data-filter')); });
    });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    if (go(a.getAttribute('href'), true)) e.preventDefault();
  });

  window.addEventListener('popstate', function () {
    if (window.location.hash) go(window.location.hash, false);
  });

  // Shared link such as storytelling.html#with-love-onboard
  window.addEventListener('load', function () {
    if (window.location.hash) setTimeout(function () { go(window.location.hash, false); }, 700);
  });
})();
