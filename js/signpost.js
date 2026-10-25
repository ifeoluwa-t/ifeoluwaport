/* Signpost footer: slide the signs in (staggered) when the post scrolls into view. */
(function () {
  const signs = document.getElementById('sp-signs');
  if (!signs) return;
  if (!('IntersectionObserver' in window)) { signs.classList.add('is-in'); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { signs.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.25 });
  io.observe(signs);
})();
