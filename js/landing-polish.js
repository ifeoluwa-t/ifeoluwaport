/* Landing page extras.
 * Company logo tooltips in the hero: on a mouse or the keyboard the tooltip is pure CSS (hover / focus). On a touch screen a
 * tap on a logo shows its company name; it goes away when you tap anywhere else, or after about 2 seconds. */
(function () {
  var logos = Array.prototype.slice.call(document.querySelectorAll('.hero-worked-at-logo'));
  if (!logos.length) return;
  var timer = 0;
  function hideAll() { clearTimeout(timer); logos.forEach(function (l) { l.classList.remove('is-tip'); }); }
  logos.forEach(function (l) {
    l.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;       // a mouse already has the hover tooltip
      var wasOn = l.classList.contains('is-tip');
      hideAll();
      if (wasOn) return;
      l.classList.add('is-tip');
      timer = setTimeout(hideAll, 2000);
    });
  });
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    if (!e.target.closest || !e.target.closest('.hero-worked-at-logo')) hideAll();
  }, { passive: true });
  window.addEventListener('scroll', hideAll, { passive: true });
})();
