/* "Playlists I made" (Side-Quests): fills the four cards with each playlist's live name and cover from /api/playlists
 * (Spotify's public oEmbed, cached at the edge for a day). While it loads the cards shimmer. If /api/playlists is not there
 * (a plain static preview, say) the page asks Spotify's oEmbed directly, which allows browser requests. Only if that fails
 * too do the cards stay as four coloured "Playlist" covers, still linking to the right Spotify playlists. */
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
    if (p && typeof p.image === 'string' && /^https:\/\//.test(p.image)) {
      img.alt = name + ' playlist cover';
      img.onload = function () { cover.classList.remove('no-art'); img.hidden = false; card.classList.remove('is-loading'); };
      img.onerror = placeholder;
      img.src = p.image;
    } else placeholder();
  }

  function withTimeout(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms);
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }
  // the same answer /api/playlists gives, asked of Spotify straight from the browser
  function direct() {
    return Promise.all(cards.map(function (c) {
      var id = c.getAttribute('data-id');
      return withTimeout('https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/playlist/' + id), 8000)
        .then(function (r) { if (!r.ok) throw new Error('oembed ' + r.status); return r.json(); })
        .then(function (j) { return { id: id, title: j.title || null, image: j.thumbnail_url || null }; })
        .catch(function () { return { id: id, title: null, image: null }; });
    }));
  }
  function apply(list) {
    var byId = {};
    (Array.isArray(list) ? list : []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
    cards.forEach(function (c) { show(c, byId[c.getAttribute('data-id')]); });
  }

  withTimeout('/api/playlists', 8000)
    .then(function (r) { if (!r.ok) throw new Error('playlists ' + r.status); return r.json(); })
    .catch(direct)
    .then(apply, function () { cards.forEach(function (c) { show(c, null); }); });
})();
