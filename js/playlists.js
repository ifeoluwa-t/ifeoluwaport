/* "Playlists I made" (Side-Quests): fills the four cards with each playlist's live name and cover from /api/playlists
 * (Spotify's public oEmbed, cached at the edge for a day). While it loads the cards shimmer. If the request fails, the cards
 * stay as four coloured "Playlist" covers and still link to the right Spotify playlists. */
(function () {
  var row = document.getElementById('pl-row');
  if (!row) return;
  var cards = Array.prototype.slice.call(row.querySelectorAll('.pl-card'));
  cards.forEach(function (c) { c.classList.add('is-loading'); });

  function show(card, p) {
    var name = (p && p.title) || 'Playlist';
    card.querySelector('.pl-name').textContent = name;
    card.setAttribute('aria-label', 'Open ' + name + ' on Spotify');
    var cover = card.querySelector('.pl-cover'), img = cover.querySelector('img');
    function placeholder() { cover.classList.add('no-art'); img.hidden = true; card.classList.remove('is-loading'); }
    if (p && p.image) {
      img.alt = name + ' playlist cover';
      img.onload = function () { cover.classList.remove('no-art'); img.hidden = false; card.classList.remove('is-loading'); };
      img.onerror = placeholder;
      img.src = p.image;
    } else placeholder();
  }

  var ctl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
  fetch('/api/playlists', ctl ? { signal: ctl.signal } : undefined)
    .then(function (r) { if (!r.ok) throw new Error('playlists ' + r.status); return r.json(); })
    .then(function (list) {
      var byId = {};
      (Array.isArray(list) ? list : []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
      cards.forEach(function (c) { show(c, byId[c.getAttribute('data-id')]); });
    })
    .catch(function () { cards.forEach(function (c) { show(c, null); }); })
    .then(function () { clearTimeout(timer); });
})();
