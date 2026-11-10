/* Visitor name. A visitor can type their first name into the hero ("hi ___, I'm"); the site then uses it in three places:
 * the hero kicker, the "nice one" line after a round of the reaction game, and the closing heading ("Tolu, are you building...").
 * The name lives in this browser only (localStorage "visitorName", or in memory for this page if storage is blocked).
 * It is never sent anywhere, and it is always put on the page with textContent. Runs on every page; each part finds its own
 * element and does nothing if the page does not have it. */
(function () {
  'use strict';
  var KEY = 'visitorName';
  var MAX = 20;
  var memory = '';
  var storageBlocked = false;

  /* ---------- the name: clean, store, read ---------- */
  function clean(raw) {
    var s = String(raw == null ? '' : raw).normalize('NFC').replace(/<[^>]*>/g, '');   // any HTML tag goes first, then every other disallowed character
    s = s.replace(/\s+/g, ' ').replace(/[^\p{L}\p{M} '’-]/gu, '').replace(/ {2,}/g, ' ').trim();
    s = Array.from(s).slice(0, MAX).join('').trim();
    if (!/\p{L}/u.test(s)) return '';
    if (s === s.toLowerCase()) {
      s = s.split(' ').map(function (w) {
        var c = Array.from(w);
        return c.length ? c[0].toLocaleUpperCase() + c.slice(1).join('') : w;
      }).join(' ');
    }
    return s;
  }
  function stored() {
    if (storageBlocked) return clean(memory);
    try { return clean(localStorage.getItem(KEY)); } catch (e) { storageBlocked = true; return clean(memory); }
  }
  function save(name) {
    memory = name;
    try {
      if (name) localStorage.setItem(KEY, name); else localStorage.removeItem(KEY);
      storageBlocked = false;
    } catch (e) { storageBlocked = true; }
  }

  var name = stored();
  var fieldSync = function () {};

  /* ---------- the closing heading ---------- */
  var heading = document.querySelector('.sp-bubble h2');
  var headText = heading && heading.firstChild && heading.firstChild.nodeType === 3 && /^Are you building/.test(heading.firstChild.nodeValue) ? heading.firstChild : null;
  var headOriginal = headText ? headText.nodeValue : '';
  var headName = null;
  function renderHeading() {
    if (!headText) return;
    if (headName) { headName.parentNode.removeChild(headName); headName = null; }
    headText.nodeValue = headOriginal;
    if (!name) return;
    headText.nodeValue = 'a' + headOriginal.slice(1);   // "Are you building..." -> "are you building..."
    headName = document.createTextNode(name + ', ');
    heading.insertBefore(headName, headText);
  }

  /* ---------- the game's "nice one" line (index and side-quests) ---------- */
  var panel = document.getElementById('rx-panel');
  var nice = null;
  function renderNice() {
    if (!nice) return;
    nice.textContent = name ? 'nice one, ' + name : 'nice one';
    nice.hidden = panel.dataset.state !== 'result';
  }
  if (panel) {
    var big = document.getElementById('rx-big');
    nice = document.createElement('p');
    nice.className = 'rx-nice';
    nice.hidden = true;
    if (big && big.parentNode === panel) panel.insertBefore(nice, big.nextSibling); else panel.appendChild(nice);
    new MutationObserver(renderNice).observe(panel, { attributes: true, attributeFilter: ['data-state'] });
  }

  function render() {
    renderHeading();
    renderNice();
    fieldSync();
  }

  /* ---------- the hero field (homepage) ---------- */
  var kicker = document.querySelector('.hero-kicker');
  if (kicker && document.body.getAttribute('data-page') === 'home') {
    var tail = ", I'm";
    kicker.textContent = '';
    kicker.classList.add('has-nick');
    var field = document.createElement('span');
    field.className = 'hk-field';
    var mirror = document.createElement('span');   // same text as the input, invisible: it gives the field its width
    mirror.className = 'hk-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'hk-input';
    input.name = 'visitor-nickname';
    input.maxLength = MAX;
    input.autocomplete = 'off';
    input.setAttribute('autocapitalize', 'words');
    input.spellcheck = false;
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('data-1p-ignore', '');
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('aria-label', 'Optional: type your first name and this page will use it');
    var cursor = document.createElement('span');   // the blinking bar shown while the field is empty and not in use
    cursor.className = 'hk-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    field.append(mirror, input, cursor);
    kicker.append('hi ', field, tail);

    var timer = 0;
    function size() {
      mirror.textContent = input.value || '\u200b';   // an empty mirror would have no line, and the field would change height
      field.classList.toggle('is-empty', input.value === '');
    }
    function commit(rewrite) {
      clearTimeout(timer);
      var next = clean(input.value);
      if (next !== name) { name = next; save(name); render(); }
      if (rewrite) { input.value = name; size(); }
    }
    fieldSync = function () {
      if (document.activeElement !== input && input.value !== name) { input.value = name; size(); }
    };
    input.addEventListener('input', function () {
      size();
      clearTimeout(timer);
      timer = setTimeout(function () { commit(false); }, 400);
    });
    input.addEventListener('blur', function () { commit(true); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      else if (e.key === 'Escape') {
        e.preventDefault();
        clearTimeout(timer);
        input.value = name;
        size();
        input.blur();
      }
    });
    kicker.addEventListener('click', function (e) { if (e.target !== input) input.focus(); });
    input.value = name;
    size();
  }

  /* other open tabs stay in sync */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== null) return;
    name = stored();
    render();
  });

  render();
})();
