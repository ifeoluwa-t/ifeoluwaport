/* Side-Quests extras: the song list in "Recent listens" fades at the bottom while there is more to scroll to. */
(function () {
  var list = document.getElementById('rot-list');
  if (!list) return;
  function check() {
    var more = list.scrollHeight - list.clientHeight > 4;
    list.classList.toggle('is-scrollable', more);
    list.classList.toggle('is-end', !more || list.scrollTop + list.clientHeight >= list.scrollHeight - 3);
  }
  list.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  if ('ResizeObserver' in window) new ResizeObserver(check).observe(list);
  if ('MutationObserver' in window) new MutationObserver(check).observe(list, { childList: true });   // the songs are added by js/side-quests.js
  check();
})();
