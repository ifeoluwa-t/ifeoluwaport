/* The reaction speed test on the landing page: the curtain reveal.
 * Where it fits (phones and tablets included) the game sits behind the page, pinned to the bottom of the screen, and the raised page layer (hero
 * through footer) carries a bottom margin as tall as the game, so at the very end of the page the footer slides up like
 * a curtain and uncovers it. Until then it is hidden (visibility) so it can't be clicked or tabbed to behind the page.
 * Fallback: with reduced motion, on iOS, on very short screens, or if the game would be taller than the screen,
 * the game just follows the footer in normal flow (css/fx.css), always visible and playable. */
(function () {
  var game = document.getElementById('games');
  var layer = document.getElementById('page-layer');
  if (!game || !layer || !game.classList.contains('games--landing')) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var on = false, shown = false, ticking = false;

  function curtainOK() {
    return !reduce.matches && !iOS && window.innerHeight >= 560 && game.offsetHeight <= window.innerHeight * 0.85;
  }
  function measure() { root.style.setProperty('--game-h', game.offsetHeight + 'px'); }
  function check() {
    ticking = false;
    if (!on) return;
    var uncovered = layer.getBoundingClientRect().bottom < window.innerHeight - 1;
    if (uncovered === shown) return;
    shown = uncovered;
    game.classList.toggle('is-revealed', uncovered);
    if (uncovered && window.fx) window.fx.sound('reveal');
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(check); } }
  function setMode() {
    var was = on;
    on = curtainOK();
    root.classList.toggle('has-curtain', on);
    if (on) measure();
    if (was !== on) { shown = false; game.classList.remove('is-revealed'); }
    check();
  }

  setMode();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setMode);
  if (reduce.addEventListener) reduce.addEventListener('change', setMode);
  // the game changes height as results and the leaderboard come in: keep the layer's margin matched to it
  if ('ResizeObserver' in window) new ResizeObserver(function () { if (on) { measure(); onScroll(); } }).observe(game);
  window.addEventListener('load', setMode);
})();
