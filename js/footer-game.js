/* The reaction speed test on the landing page lives under the footer. Hovering (or focusing) the
 * signpost with the links reveals it, and it stays open once it has been revealed.
 * On touch screens it is always visible (see css/fx.css). */
(function () {
  var game = document.getElementById('games');
  var post = document.querySelector('.signpost-footer .sp-post');
  if (!game || !post || !game.classList.contains('games--landing')) return;
  var noHover = window.matchMedia('(hover: none)').matches;
  if (noHover) { game.removeAttribute('inert'); return; }
  var opened = false;
  function open() {
    if (opened) return;
    opened = true;
    game.removeAttribute('inert');
    game.classList.add('is-open');
    if (window.fx) window.fx.sound('reveal');
    // bring it into view once it has unrolled
    setTimeout(function () {
      var r = game.getBoundingClientRect();
      if (r.bottom > window.innerHeight || r.top < 0) window.scrollTo({ top: window.scrollY + r.bottom - window.innerHeight + 24, behavior: 'smooth' });
    }, 500);
  }
  post.addEventListener('mouseenter', open);
  post.addEventListener('focusin', open);
})();
