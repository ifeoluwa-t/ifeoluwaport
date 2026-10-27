/* Keeps the Side-Quests music going when a visitor leaves for another page, if they say so.
 * - Side-Quests page: exposes the playlist (window.SQ_SONGS) and clears any saved session.
 * - Every other page: if music was kept (sessionStorage "sqMusic"), resumes it in a small
 *   floating player with pause and close, and keeps saving its place so it follows the visitor. */
(function () {
  var KEY = 'sqMusic';
  // Alternates Afro / world picks with everything else, so no two similar songs sit side by side.
  var SONGS = window.SQ_SONGS = [
    ['Remember Me', 'Fireboy DML', '7nhFhG0IuaE', 'Afrobeats'],
    ['august', 'Taylor Swift', 'nn_0zPAfyo8', 'Pop'],
    ['l\'abe igi', 'Tega Ethan', 'NUangWG1IYE', 'Alté'],
    ['Slick (Remix)', 'Victony, Summer Walker & Don Toliver', 'ksnN8PMf30I', 'R&B'],
    ['October Passed Me By', 'girl in red', 'c8W4WRNz3gM', 'Indie'],
    ['U.F.O', 'June Sometimes', 'vNC3lCFdAzg', 'Alté'],
    ['Bo Gogo (Magical Remix)', 'Kelvin Momo, Dlala Thukzin & Da Muziqal Chef', 'xGyzVSleWcQ', 'Amapiano'],
    ['Divinize', 'ROSALÍA', 'OxDmGz60hws', 'Latin'],
    ['Sunshine', 'Baaba J', 't_SNGKA8o8k', 'Afrobeats'],
    ['The Louvre', 'Lorde', 'fN6KvLfd9sE', 'Pop'],
    ['Pluto (Remember You)', 'DJ Clock ft. Beatenberg', 'kF-f2nIVDn4', 'Dance'],
    ['Doors', 'Noah Kahan', 'IAYJ4iTDkQ0', 'Folk'],
    ['Adaugo', 'The Cavemen', 'YctG0C4fce0', 'Highlife'],
    ['Ok Love You Bye', 'Olivia Dean', 'rtS9c4PdEVs', 'Soul'],
    ['Bridgertn', 'Ayra Starr', 'waJE7BGVn-k', 'Afrobeats'],
    ['Non-Stop', 'Hamilton (Original Broadway Cast)', 'vYbdQAeO0vo', 'Musical'],
    ['Lion', 'Little Simz & Obongjayar', '6KiGnxlxLQg', 'Hip-Hop'],
    ['Damage Gets Done', 'Hozier & Brandi Carlile', 'HvDhLl68ZHw', 'Folk'],
    ['Black Friday (pretty like the sun)', 'Lost Frequencies & Tom Odell', 'j79lPX5ZjLc', 'Dance'],
    ['Little Freak', 'Harry Styles', '4UAZkexQ7Cg', 'Pop'],
    ['Into The Unknown (Instrumental)', 'Kristen Anderson-Lopez & Robert Lopez', 'mBrAj8ukGDE', 'Soundtrack'],
    ['Like a Prayer (Choir Version)', 'I\'ll Take You There Choir', 'pMPKTwESkxs', 'Choral'],
    ['Coping Mechanism', 'Omah Lay & Elmah', 'VWqdBp3OfVg', 'Afrobeats'],
    ['Cry (Just A Little)', 'Bingo Players', 'ZBpWdwXzpMk', 'Dance'],
    ['Worship', 'Asake & DJ Snake', 'RQOg16kmFJM', 'Afro-house'],
    ['All Of You (Instrumental)', 'Lin-Manuel Miranda', '1mtHDkxIi28', 'Soundtrack'],
    ['Gone', 'NF & Julia Michaels', 'f5ZaOGLZHoU', 'Hip-Hop'],
    ['The Wonder Years', 'Jon Bellion', 'WVDtoaO5C70', 'Pop'],
    ['Propeller', 'JAE5, BNXN & Dave', 'yEiGnvgL4fA', 'Afrobeats'],
    ['In a Lake', 'Mitski', 'pUERvd0D_XI', 'Indie'],
    ['Bandana', 'Fireboy DML & Asake', 'gCLUIzOsgGg', 'Afrobeats'],
    ['HEATED', 'Beyoncé', 'YgKr4mzPBCM', 'Dance'],
    ['Shinunoga E-Wa', 'Fujii Kaze', '3zh9Wb1KuW8', 'J-Pop'],
    ['É Hlu', 'Outgun Onkar & Sinmidele', '5hLrpc12o4A', 'Worship'],
    ['party 4 u', 'Charli xcx', 'fKrTCGGEiWY', 'Pop'],
    ['Not Strong Enough', 'boygenius', 'RV1-GJJf2Pg', 'Indie'],
    ['Shekere', 'Simone Glad & El-Jay', 'ia2SgkvijK0', 'Afro-house'],
    ['People Watching', 'Conan Gray', 'BKMe7AS7MK0', 'Pop'],
    ['Blue Bucket of Gold', 'Sufjan Stevens', 'erqpdc9W8F8', 'Folk'],
    ['Unwritten', 'Natasha Bedingfield', 'b7k0a5hYnSI', 'Pop'],
    ['Outro', 'M83', '1cEy4UyYHI0', 'Electronic'],
    ['All Of You', 'Encanto Cast', 'sReEGWewGg4', 'Soundtrack'],
    ['Echoes In Rain', 'Enya', 'oSVg3umy8_Q', 'Ambient'],
    ['Live Life', 'Show Dem Camp & Tems', 'gxXMhMApfW0', 'Alté'],
    ['Gratitude', 'Anendlessocean', 'LzAdpgIOzXI', 'Worship'],
    ['Everywhere, Everything', 'Noah Kahan & Gracie Abrams', 'dJPdkhsr0gU', 'Folk']
  ];
  // The nav-bar music icon starts one of these three, alternating between them. After that the
  // rest of the playlist plays on shuffle whenever next is pressed (or a song ends).
  var DEFAULT_TITLES = ['Outro', 'All Of You (Instrumental)', 'Into The Unknown (Instrumental)'];
  var DEFAULTS = DEFAULT_TITLES.map(function (t) { for (var k = 0; k < SONGS.length; k++) if (SONGS[k][0] === t) return k; return 0; });
  function nextDefault() {
    var n = 0;
    try { n = parseInt(localStorage.getItem('mkDefault'), 10) || 0; localStorage.setItem('mkDefault', String((n + 1) % DEFAULTS.length)); } catch (e) { n = Math.floor(Math.random() * DEFAULTS.length); }
    return DEFAULTS[n % DEFAULTS.length];
  }
  var bag = [];
  function shuffleNext(cur) {
    if (!bag.length) {
      for (var k = 0; k < SONGS.length; k++) if (DEFAULTS.indexOf(k) < 0 && k !== cur) bag.push(k);
      for (var m = bag.length - 1; m > 0; m--) { var r = Math.floor(Math.random() * (m + 1)), tmp = bag[m]; bag[m] = bag[r]; bag[r] = tmp; }
    }
    return bag.pop();
  }
  function read() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } }
  function write(v) { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY); } catch (e) {} }
  window.sqMusicStore = { read: read, write: write };
  window.SQ_VOLUME = 30;   // 0-100: songs start soft

  // ---------- "Still want to listen?" when a visitor leaves for another page while music plays ----------
  // Asked once, on the page where they started the music. Saying yes carries it to every page after that.
  (function () {
    var css = document.createElement('style');
    css.textContent =
      '.sq2-ask{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,0,46,.7);opacity:0;transition:opacity .2s ease}' +
      '.sq2-ask[hidden]{display:none}.sq2-ask.is-open{opacity:1}' +
      '.sq2-ask-card{width:min(380px,100%);padding:26px 24px 22px;border-radius:22px;background:#fff;color:#0c0054;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:Poppins,system-ui,sans-serif}' +
      '.sq2-ask-card h2{margin:0 0 8px;font-family:var(--font-display,inherit);font-weight:400;font-size:1.9rem;line-height:1.05;color:#0052ff}' +
      '.sq2-ask-card p{margin:0 0 20px;font-size:.95rem;line-height:1.45}' +
      '.sq2-ask-btns{display:flex;flex-direction:column;gap:10px}' +
      '.sq2-ask-btns button{padding:12px 18px;border:0;border-radius:999px;font-family:inherit;font-weight:600;font-size:.92rem;cursor:pointer;transition:background-color .2s ease}' +
      '.sq2-ask-yes{background:#0052ff;color:#fff}.sq2-ask-yes:hover{background:#0a00cb}' +
      '.sq2-ask-no{background:#e9f1ff;color:#0c0054}.sq2-ask-no:hover{background:#bfd4ff}' +
      '.sq2-ask-btns button:focus-visible{outline:2px solid #0c0054;outline-offset:2px}' +
      '@media (prefers-reduced-motion:reduce){.sq2-ask{transition:none}}';
    document.head.appendChild(css);

    var dlg = null, pending = null, back = null;
    function build() {
      dlg = document.createElement('div');
      dlg.className = 'sq2-ask';
      dlg.hidden = true;
      dlg.setAttribute('role', 'dialog');
      dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('aria-labelledby', 'sq2-ask-t');
      dlg.innerHTML =
        '<div class="sq2-ask-card"><h2 id="sq2-ask-t">Still want to listen?</h2>' +
        '<p>Keep the music going while you look around the rest of the site?</p>' +
        '<div class="sq2-ask-btns"><button type="button" class="sq2-ask-yes">Yes, keep playing</button>' +
        '<button type="button" class="sq2-ask-no">No, stop it</button></div></div>';
      document.body.appendChild(dlg);
      dlg.querySelector('.sq2-ask-yes').addEventListener('click', function () { go(true); });
      dlg.querySelector('.sq2-ask-no').addEventListener('click', function () { go(false); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    }
    function open(url) {
      if (!dlg) build();
      pending = url; back = document.activeElement;
      dlg.hidden = false;
      void dlg.offsetWidth;
      dlg.classList.add('is-open');
      dlg.querySelector('.sq2-ask-yes').focus();
    }
    function close() {
      if (!dlg) return;
      dlg.classList.remove('is-open'); dlg.hidden = true; pending = null;
      if (back && back.focus) back.focus({ preventScroll: true });
    }
    function go(keep) {
      var url = pending;
      if (keep) window.sqMusic.keep(); else window.sqMusic.stop();
      dlg.hidden = true;
      if (url) window.location.href = url;
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg && !dlg.hidden) close(); });
    document.addEventListener('click', function (e) {
      var m = window.sqMusic;
      if (!m || m.consented || !m.playing()) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      e.preventDefault();
      open(u.href);
    }, true);
  })();

  if (document.body && document.body.getAttribute('data-page') === 'side-quests') {
    // Arriving from another page with music playing: the Side Quests player picks it up and carries on.
    var carried = read();
    if (carried && typeof carried.i === 'number' && SONGS[carried.i]) {
      var gone = carried.paused ? 0 : Math.min(6, (Date.now() - (carried.at || Date.now())) / 1000);
      window.SQ_RESUME = { i: carried.i, t: Math.max(0, Math.floor((carried.t || 0) + gone)), paused: !!carried.paused };
    }
    write(null);
    return;
  }
  var navBtn = document.getElementById('nav-music');
  var ctl = null;   // set once a player exists on this page

  function init(saved, consented) {
  var cur = saved.i, player = null, playing = false, tick = 0;
  // Pick up where the song would be by now, allowing for the time the page took to load.
  var startAt = Math.max(0, Math.floor((saved.t || 0) + (saved.paused ? 0 : Math.min(6, (Date.now() - (saved.at || Date.now())) / 1000))));

  var css = document.createElement('style');
  css.textContent =
    '.mk{position:fixed;left:14px;bottom:14px;z-index:9990;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:6px 8px 6px 14px;border-radius:999px;background:#fff;color:#0c0054;font-family:Poppins,system-ui,sans-serif;box-shadow:0 8px 24px rgba(12,0,84,.28)}' +
    '.mk-text{min-width:0;line-height:1.15}.mk-text b{display:block;font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}' +
    '.mk-text i{display:block;font-style:normal;font-size:.68rem;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}' +
    '.mk button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:50%;cursor:pointer;background:#0052ff;color:#fff;transition:background-color .2s}' +
    '.mk button:hover{background:#0a00cb}.mk button.mk-next{background:transparent;color:#0c0054}.mk button.mk-next:hover{background:#e9f1ff}.mk button.mk-x{background:transparent;color:#0c0054}.mk button.mk-x:hover{background:#e9f1ff}' +
    '.mk button:focus-visible{outline:2px solid #0052ff;outline-offset:2px}.mk svg{width:14px;height:14px}.mk .i-pause{display:none}.mk.on .i-pause{display:block}.mk.on .i-play{display:none}' +
    '.mk-yt{position:fixed;left:-9999px;top:0;width:200px;height:200px;overflow:hidden;pointer-events:none}' +
    '.mk{transition:padding .3s ease,gap .3s ease}' +
    '.mk-mini-ico{display:none;width:38px;height:38px;border:0;border-radius:50%;background:#0052ff;color:#fff;cursor:pointer;align-items:center;justify-content:center}.mk-mini-ico svg{width:18px;height:18px}' +
    '.mk.is-mini{padding:5px;gap:0}.mk.is-mini .mk-text,.mk.is-mini .mk-play,.mk.is-mini .mk-next,.mk.is-mini .mk-x{display:none}.mk.is-mini .mk-mini-ico{display:inline-flex}' +
    '.mk.is-mini.on .mk-mini-ico{animation:mkPulse 3.2s ease-in-out infinite}@keyframes mkPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,82,255,.3)}50%{box-shadow:0 0 0 7px rgba(0,82,255,0)}}' +
    '@media (prefers-reduced-motion:reduce){.mk.is-mini.on .mk-mini-ico{animation:none}}';
  document.head.appendChild(css);

  var pill = document.createElement('div');
  pill.className = 'mk';
  pill.setAttribute('role', 'region');
  pill.setAttribute('aria-label', 'Music player');
  pill.innerHTML =
    '<button type="button" class="mk-mini-ico" aria-label="Show the music player"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/></svg></button>' +
    '<span class="mk-text"><b></b><i></i></span>' +
    '<button type="button" class="mk-play" aria-label="Play"><svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button>' +
    '<button type="button" class="mk-next" aria-label="Next song"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.6 5H18v14h-2.4zM4 5.4v13.2a.8.8 0 0 0 1.25.66l9.15-6.6a.8.8 0 0 0 0-1.32L5.25 4.74A.8.8 0 0 0 4 5.4z"/></svg></button>' +
    '<button type="button" class="mk-x" aria-label="Stop the music"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg></button>';
  var holder = document.createElement('div');
  holder.className = 'mk-yt';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = '<div id="mk-yt"></div>';
  document.body.appendChild(pill);
  document.body.appendChild(holder);

  var playBtn = pill.querySelector('.mk-play');

  // The bar only stays for 3 seconds, then it hibernates into a single music icon; tapping the icon brings it back.
  var hideTimer = 0, miniBtn = pill.querySelector('.mk-mini-ico');
  function armHide() { clearTimeout(hideTimer); hideTimer = setTimeout(function () { pill.classList.add('is-mini'); }, 3000); }
  function wake() { pill.classList.remove('is-mini'); armHide(); }
  miniBtn.addEventListener('click', wake);
  var carriedOn = consented;   // came from another page where the music was already allowed to carry on
  pill.addEventListener('pointerdown', function () { if (!pill.classList.contains('is-mini')) armHide(); });
  pill.addEventListener('focusin', function () { if (!pill.classList.contains('is-mini')) armHide(); });
  if (carriedOn) pill.classList.add('is-mini'); else armHide();   // already allowed: just the icon, no bar
  function label() {
    pill.querySelector('b').textContent = SONGS[cur][0];
    pill.querySelector('i').textContent = SONGS[cur][1];
  }
  function setPlaying(on) { playing = on; pill.classList.toggle('on', on); if (navBtn) navBtn.classList.remove('is-carried'); if (navBtn) { navBtn.classList.toggle('is-on', on); navBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); navBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music'); } playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play'); }
  function persist() {
    if (!player || !player.getCurrentTime) return;   // not loaded yet: keep what was saved
    var t = 0;
    try { t = player && player.getCurrentTime ? player.getCurrentTime() : 0; } catch (e) {}
    if (consented) write({ i: cur, t: Math.floor(t), at: Date.now(), paused: !playing });   // only saved once they said yes
  }
  function stopAll() {
    clearInterval(tick);
    try { if (player && player.destroy) player.destroy(); } catch (e) {}
    write(null);
    pill.remove(); holder.remove();
    ctl = null; window.sqMusic = null;
    if (navBtn) { navBtn.classList.remove('is-on'); navBtn.setAttribute('aria-pressed', 'false'); navBtn.setAttribute('aria-label', 'Play music'); }
  }
  label();

  function boot() {
    player = new YT.Player('mk-yt', {
      videoId: SONGS[cur][2], width: '200', height: '200',
      playerVars: { autoplay: saved.paused ? 0 : 1, start: startAt, rel: 0, playsinline: 1, modestbranding: 1 },
      events: {
        onReady: function (e) { e.target.setVolume(window.SQ_VOLUME); if (!saved.paused) e.target.playVideo(); },
        onStateChange: function (e) {
          if (e.data === 0) { cur = shuffleNext(cur); label(); player.loadVideoById(SONGS[cur][2]); }
          else if (e.data === 1 || e.data === 3) { try { player.setVolume(window.SQ_VOLUME); } catch (x) {} setPlaying(true); }
          else if (e.data === 2) { setPlaying(false); persist(); }
        },
        onError: function () { cur = shuffleNext(cur); label(); player.loadVideoById(SONGS[cur][2]); }
      }
    });
    tick = setInterval(function () { if (playing) persist(); }, 1000);
  }
  if (window.YT && window.YT.Player) boot();
  else {
    window.onYouTubeIframeAPIReady = boot;
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  playBtn.addEventListener('click', function () { if (!player || !player.playVideo) return; if (playing) player.pauseVideo(); else player.playVideo(); });
  pill.querySelector('.mk-next').addEventListener('click', function () {
    if (!player || !player.loadVideoById) return;
    cur = shuffleNext(cur); label(); player.loadVideoById(SONGS[cur][2]); if (consented) write({ i: cur, t: 0, at: Date.now(), paused: false });
  });
  // The cross only puts the bar away: the music keeps playing (the nav icon brings the bar back).
  var HIDE_KEY = 'sqMusicBarHidden';
  function barHidden(v) { try { if (v === undefined) return sessionStorage.getItem(HIDE_KEY) === '1'; if (v) sessionStorage.setItem(HIDE_KEY, '1'); else sessionStorage.removeItem(HIDE_KEY); } catch (e) {} return !!v; }
  function applyHidden() { pill.style.display = barHidden() ? 'none' : ''; }
  pill.querySelector('.mk-x').setAttribute('aria-label', 'Close the music bar');

  pill.querySelector('.mk-x').addEventListener('click', function () {
    clearTimeout(hideTimer);
    if (playing) { pill.classList.add('is-mini'); }           // music is playing: the bar folds into the icon, which stays
    else { barHidden(true); applyHidden(); }                    // paused: the bar goes away completely
  });
  applyHidden();

  // The bar / icon can be dragged left and right along the bottom of the screen; let go and it settles on the nearest edge.
  var SIDE_KEY = 'sqMusicBarSide', EDGE = 14;
  function sideNow() { try { return sessionStorage.getItem(SIDE_KEY) === 'R' ? 'R' : 'L'; } catch (e) { return 'L'; } }
  function edgeLeft(side) { return side === 'R' ? Math.max(EDGE, window.innerWidth - pill.offsetWidth - EDGE) : EDGE; }
  function applySide() { pill.style.left = edgeLeft(sideNow()) + 'px'; }
  applySide();
  window.addEventListener('resize', applySide);
  new MutationObserver(applySide).observe(pill, { attributes: true, attributeFilter: ['class'] });   // folding / unfolding changes its width
  var dragSt = null, dragMoved = false;
  pill.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    dragSt = { id: e.pointerId, x: e.clientX, left: pill.getBoundingClientRect().left };
    dragMoved = false;
  });
  pill.addEventListener('pointermove', function (e) {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    var dx = e.clientX - dragSt.x;
    if (!dragMoved && Math.abs(dx) < 6) return;
    if (!dragMoved) { dragMoved = true; try { pill.setPointerCapture(e.pointerId); } catch (x) {} pill.style.transition = 'none'; pill.style.cursor = 'grabbing'; clearTimeout(hideTimer); }
    pill.style.left = Math.max(EDGE, Math.min(window.innerWidth - pill.offsetWidth - EDGE, dragSt.left + dx)) + 'px';
  });
  function endDrag(e) {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    dragSt = null;
    pill.style.cursor = '';
    if (dragMoved) {
      var mid = pill.getBoundingClientRect().left + pill.offsetWidth / 2;
      try { sessionStorage.setItem(SIDE_KEY, mid > window.innerWidth / 2 ? 'R' : 'L'); } catch (x) {}
      pill.style.transition = 'left .28s cubic-bezier(.2,.8,.3,1)';
      applySide();
      setTimeout(function () { pill.style.transition = ''; }, 320);
      if (!pill.classList.contains('is-mini')) armHide();
    }
  }
  pill.addEventListener('pointerup', endDrag);
  pill.addEventListener('pointercancel', endDrag);
  pill.addEventListener('click', function (e) { if (dragMoved) { e.stopPropagation(); e.preventDefault(); dragMoved = false; } }, true);
  pill.style.touchAction = 'none';

  window.addEventListener('pagehide', persist);
  window.sqMusic = {
    consented: consented,
    playing: function () { return playing; },
    keep: function () { consented = true; window.sqMusic.consented = true; persist(); },
    stop: stopAll,
    showBar: function () { barHidden(false); pill.style.display = ''; wake(); }
  };
  ctl = { toggle: function () { if (!player || !player.playVideo) return; if (playing) player.pauseVideo(); else player.playVideo(); } };
  }

  var saved = read();
  if (saved && typeof saved.i === 'number' && SONGS[saved.i]) {
    if (navBtn && !saved.paused) navBtn.classList.add('is-carried');   // music is carrying on from the last page: the top icon never appears
    init(saved, true);
  }

  // The music icon in the nav bar: first press starts one of the three default songs, then it plays / pauses.
  if (navBtn) {
    navBtn.addEventListener('click', function () {
      if (!ctl) { try { sessionStorage.removeItem('sqMusicBarHidden'); } catch (e) {} init({ i: nextDefault(), t: 0, at: Date.now(), paused: false }, false); }
      else if (window.sqMusic && window.sqMusic.showBar && (function () { try { return sessionStorage.getItem('sqMusicBarHidden') === '1'; } catch (e) { return false; } })()) window.sqMusic.showBar();   // bar was put away: bring it back
      else ctl.toggle();
    });
  }
})();