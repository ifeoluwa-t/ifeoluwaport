/* Case-study pages: the nav turns solid once the page scrolls, and section text fades up as it comes
   into view. Nothing is hidden until this script has run (the .cs-anim class is added first), so
   content still shows if JavaScript is off or fails, and reduced-motion visitors see everything at once. */
(function () {
  var header = document.getElementById('site-header');
  if (header) {
    var setScrolled = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || (reduce && reduce.matches)) return;

  var targets = document.querySelectorAll(
    '.cs-page .cs-narrative .cs-section-label, .cs-page .cs-narrative .cs-challenge-tag, .cs-page .cs-narrative .cs-section-heading, ' +
    '.cs-page .cs-narrative .cs-section-intro, .cs-page .cs-narrative .cs-pullquote, .cs-page .cs-narrative .cs-approach-list li, ' +
    '.cs-page main > section .cs-section-label, .cs-page main > section .cs-section-heading, .cs-page main > section .cs-section-intro, ' +
    '.cs-page main > section .cs-carousel-label, .cs-page main > section .cs-screens-head, .cs-page main > section .cs-tabs-card, ' +
    '.cs-page main > section .cs-flip, .cs-page main > section .cs-results-stats, .cs-page main > section .cs-results-links, ' +
    '.cs-page main > section .cs-more-grid, .cs-page main > section .cs-decks, .cs-page main > section .cs-testimonials, ' +
    '.cs-page main > section .cs-wins'
  );
  if (!targets.length) return;

  document.documentElement.classList.add('cs-anim');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  // A short stagger within each section, so the parts arrive in order rather than all at once.
  var seen = new Map();
  Array.prototype.forEach.call(targets, function (el) {
    var section = el.closest('section') || el.parentElement;
    var n = seen.get(section) || 0;
    seen.set(section, n + 1);
    el.classList.add('cs-reveal');
    el.style.setProperty('--d', Math.min(n * 90, 360) + 'ms');
    observer.observe(el);
  });
})();
