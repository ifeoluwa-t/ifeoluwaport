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
    ['Cry (Just A Little) [General C\'mamane Remix]', 'Bingo Players', 'C9a86kKfUGk', 'Dance'],
    ['Conflict of the Mind', 'AURORA', '7TF91Zk8L5w', 'Indie'],
    ['Rora', 'Asake', 'Mz1zjBwUzoc', 'Afrobeats'],
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
    ['War In Ba Sing Se', 'J0vanny', 'GfKmLnQhqBU', 'Electronic'],
    ['Everywhere, Everything', 'Noah Kahan & Gracie Abrams', 'dJPdkhsr0gU', 'Folk'],
    ['Come and Get Your Love', 'Redbone', 'BA4rSO-h9Io', 'Rock'],
    ['Anifowose', 'Olamide', 'E2S_NQAt0bM', 'Hip-Hop'],
    ['FUN', 'Rema', 'sObg5b2nx44', 'Afrobeats']
  ];
  // The nav-bar music icon starts one of these three, alternating between them. After that the
  // rest of the playlist plays on shuffle whenever next is pressed (or a song ends).
  var DEFAULT_TITLES = ['Outro', 'Into The Unknown (Instrumental)'];
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
  // ---------------------------------------------------------------------------------------------
  // THE ONE MUSIC WIDGET (every page except Side-Quests, which has its own player)
  // A single element that is both the icon and the player bar. Its states:
  //   idle        no music yet: just the icon (press it to start a song)
  //   open        the bar: song, play / pause, next, close
  //   folded      the bar tucked back into the icon (music keeps playing or stays paused)
  // Nothing else on the page is a music button, so two icons can never show. It is never hidden, it stays on the
  // side the visitor dragged it to (remembered in localStorage) and it expands inward from that side.
  // ---------------------------------------------------------------------------------------------
  var SIDE_KEY = 'sqMusicSide', EDGE = 14;
  function getSide() { try { return localStorage.getItem(SIDE_KEY) === 'R' ? 'R' : 'L'; } catch (e) { return 'L'; } }
  function setSide(v) { try { localStorage.setItem(SIDE_KEY, v); } catch (e) {} }

  var css = document.createElement('style');
  css.textContent =
    '.mk{--mk-c:#0052ff;--mk-h:#0043cf;position:fixed;left:14px;right:auto;bottom:14px;z-index:9990;display:flex;align-items:center;gap:10px;box-sizing:border-box;max-width:calc(100vw - 28px);padding:5px;border-radius:999px;background:#fff;color:#0c0054;font-family:Poppins,system-ui,sans-serif;box-shadow:0 10px 30px rgba(7,0,46,.35);touch-action:none;user-select:none;-webkit-user-select:none;scale:0;opacity:0;transition:padding .3s ease,gap .3s ease}' +
    '.mk.is-right{left:auto;right:14px}' +
    '.mk.is-in{opacity:1;scale:1;animation:mkPop .7s cubic-bezier(.3,1.6,.5,1) both}' +
    '@keyframes mkPop{0%{scale:0}55%{scale:1.22}78%{scale:.92}100%{scale:1}}' +
    '.mk.is-dragging{cursor:grabbing;transition:none}' +
    '.mk:not(.is-mini){padding:6px 8px 6px 14px}' +
    '.mk-text{min-width:0;line-height:1.15}.mk-text b{display:block;font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}' +
    '.mk-text i{display:block;font-style:normal;font-size:.68rem;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}' +
    '.mk button{display:inline-flex;align-items:center;justify-content:center;flex:none;width:32px;height:32px;padding:0;border:0;border-radius:50%;cursor:pointer;background:var(--mk-c);color:#fff;transition:background-color .2s}' +
    '.mk button:hover{background:var(--mk-h)}.mk button.mk-prev,.mk button.mk-next,.mk button.mk-x{background:transparent;color:#0c0054}.mk button.mk-prev:hover,.mk button.mk-next:hover,.mk button.mk-x:hover{background:#e9f1ff}' +
    '.mk button:focus-visible{outline:2px solid #0c0054;outline-offset:2px}.mk svg{width:14px;height:14px}.mk .i-pause{display:none}.mk.on .i-pause{display:block}.mk.on .i-play{display:none}' +
    '.mk .mk-ico{display:none;width:32px;height:32px}.mk .mk-ico svg{width:17px;height:17px}' +
    '.mk.is-mini{gap:0}.mk.is-mini .mk-text,.mk.is-mini .mk-prev,.mk.is-mini .mk-play,.mk.is-mini .mk-next,.mk.is-mini .mk-x{display:none}.mk.is-mini .mk-ico{display:inline-flex}' +
    '.mk.is-mini.on .mk-ico{animation:mkPulse 3.2s ease-in-out infinite}@keyframes mkPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,82,255,.35)}50%{box-shadow:0 0 0 7px rgba(0,82,255,0)}}' +
    '.mk-yt{position:fixed;left:-9999px;top:0;width:200px;height:200px;overflow:hidden;pointer-events:none}' +
    'html.mk-right .fx-sound{bottom:68px}' +
    '@media (prefers-reduced-motion:reduce){.mk{transition:none}.mk.is-in{animation:none}.mk.is-mini.on .mk-ico{animation:none}}';
  document.head.appendChild(css);

  var NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/></svg>';
  var pill = document.createElement('div');
  pill.className = 'mk is-mini';
  pill.setAttribute('role', 'region');
  pill.setAttribute('aria-label', 'Music player');
  pill.innerHTML =
    '<button type="button" class="mk-ico" id="nav-music" aria-label="Play music">' + NOTE + '</button>' +
    '<span class="mk-text" aria-live="polite"><b></b><i></i></span>' +
    '<button type="button" class="mk-prev" aria-label="Previous song"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2.4v14H6zM20 5.4v13.2a.8.8 0 0 1-1.25.66L9.6 12.66a.8.8 0 0 1 0-1.32l9.15-6.6A.8.8 0 0 1 20 5.4z"/></svg></button>' +
    '<button type="button" class="mk-play" aria-label="Play"><svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button>' +
    '<button type="button" class="mk-next" aria-label="Next song"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.6 5H18v14h-2.4zM4 5.4v13.2a.8.8 0 0 0 1.25.66l9.15-6.6a.8.8 0 0 0 0-1.32L5.25 4.74A.8.8 0 0 0 4 5.4z"/></svg></button>' +
    '<button type="button" class="mk-x" aria-label="Close the music bar"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg></button>';
  var holder = document.createElement('div');
  holder.className = 'mk-yt';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = '<div id="mk-yt"></div>';
  document.body.appendChild(pill);
  document.body.appendChild(holder);
  var ico = pill.querySelector('.mk-ico'), playBtn = pill.querySelector('.mk-play');

  // which side it lives on: the visitor's choice, and only ever changed by dragging it
  function applySide(side) { pill.classList.toggle('is-right', side === 'R'); document.documentElement.classList.toggle('mk-right', side === 'R'); }
  applySide(getSide());
  setTimeout(function () { pill.classList.add('is-in'); }, 700);   // pops in shortly after the page loads

  var player = null, playing = false, tick = 0, cur = 0, consented = false, hasPlayer = false, ctl = null, hideTimer = 0;
  // intent: the visitor wants music playing (so a browser that blocks autoplay on a new page does not turn that into a pause)
  var intent = false, userPaused = false, resumeArmed = false;
  // the songs played before this one, newest last, kept for the whole visit so the previous button works across pages
  var HIST_KEY = 'sqMusicHist', hist = [];
  try { hist = JSON.parse(sessionStorage.getItem(HIST_KEY) || '[]').filter(function (i) { return typeof i === 'number' && SONGS[i]; }); } catch (e) { hist = []; }
  function saveHist() { try { sessionStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(-30))); } catch (e) {} }
  function label() {
    pill.querySelector('b').textContent = hasPlayer ? SONGS[cur][0] : '';
    pill.querySelector('i').textContent = hasPlayer ? SONGS[cur][1] : '';
  }
  function sync() {
    pill.classList.toggle('on', playing);
    ico.setAttribute('aria-label', hasPlayer ? 'Show the music player' : 'Play music');
    ico.setAttribute('data-cursor', hasPlayer ? 'open' : 'play');
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  // the bar stays open for 3 seconds, then folds into the icon; touching it keeps it open a little longer
  function fold() {
    clearTimeout(hideTimer);
    var hadFocus = pill.contains(document.activeElement) && document.activeElement !== ico;
    pill.classList.add('is-mini');
    if (hadFocus) ico.focus({ preventScroll: true });
  }
  function armHide() { clearTimeout(hideTimer); hideTimer = setTimeout(fold, 3000); }
  function wake() { pill.classList.remove('is-mini'); armHide(); }
  pill.addEventListener('pointerdown', function () { if (!pill.classList.contains('is-mini')) armHide(); });
  pill.addEventListener('focusin', function () { if (!pill.classList.contains('is-mini')) armHide(); });
  pill.querySelector('.mk-x').addEventListener('click', fold);

  function setPlaying(on) { playing = on; sync(); }
  function persist() {
    if (!player || !player.getCurrentTime) return;   // not loaded yet: keep what was saved
    var t = 0;
    try { t = player.getCurrentTime(); } catch (e) {}
    if (consented) write({ i: cur, t: Math.floor(t), at: Date.now(), paused: !(playing || intent) });   // only saved once they said yes
  }
  function stopAll() {
    clearInterval(tick); clearTimeout(hideTimer);
    try { if (player && player.destroy) player.destroy(); } catch (e) {}
    write(null); hist = []; saveHist(); intent = false; userPaused = false;
    player = null; playing = false; hasPlayer = false; consented = false; ctl = null; window.sqMusic = null;
    // the player is gone; the widget goes back to being just the icon, and the player's holder is renewed for the next start
    var fresh = document.createElement('div'); fresh.id = 'mk-yt'; holder.textContent = ''; holder.appendChild(fresh);
    label(); sync(); fold();
  }

  // pick another song (next, previous or the end of a song), remembering where we came from
  function goTo(i, fromHistory) {
    if (!player || !player.loadVideoById) return;
    if (!fromHistory && i !== cur) { hist.push(cur); saveHist(); }
    cur = i; intent = true; userPaused = false;
    label(); player.loadVideoById(SONGS[cur][2]);
    if (consented) write({ i: cur, t: 0, at: Date.now(), paused: false });
  }
  // Browsers (Safari, Firefox, and Chrome for new visitors) will not start sound on a new page by themselves.
  // If music was playing on the last page, the first tap, click or key press on this one starts it again.
  function armResume() {
    if (resumeArmed) return;
    resumeArmed = true;
    var evs = ['pointerdown', 'keydown', 'touchend', 'click'];
    function done() { evs.forEach(function (t) { window.removeEventListener(t, go, true); }); }
    function go() {
      if (intent && !playing && player && player.playVideo) { try { player.playVideo(); } catch (e) {} }
      if (playing) done();
    }
    evs.forEach(function (t) { window.addEventListener(t, go, true); });
    var chk = setInterval(function () { if (playing) { done(); clearInterval(chk); } }, 2000);
  }

  function init(saved, cons, openBar) {
    consented = cons; cur = saved.i; hasPlayer = true;
    // Pick up where the song would be by now, allowing for the time the page took to load.
    var startAt = Math.max(0, Math.floor((saved.t || 0) + (saved.paused ? 0 : Math.min(6, (Date.now() - (saved.at || Date.now())) / 1000))));
    intent = !saved.paused; userPaused = false;
    label(); sync();
    if (openBar) wake(); else fold();
    function boot() {
      player = new YT.Player('mk-yt', {
        videoId: SONGS[cur][2], width: '200', height: '200',
        playerVars: { autoplay: saved.paused ? 0 : 1, start: startAt, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: function (e) { e.target.setVolume(window.SQ_VOLUME); if (intent) { e.target.playVideo(); armResume(); } },
          onAutoplayBlocked: function () { armResume(); },
          onStateChange: function (e) {
            if (e.data === 0) { goTo(shuffleNext(cur)); }
            else if (e.data === 1 || e.data === 3) { try { player.setVolume(window.SQ_VOLUME); } catch (x) {} setPlaying(true); }
            else if (e.data === 2) {
              // a real pause (the visitor's, or while playing) is remembered; a browser holding back autoplay is not
              if (userPaused || playing) { setPlaying(false); intent = false; persist(); }
            }
          },
          onError: function () { goTo(shuffleNext(cur)); }
        }
      });
      tick = setInterval(function () { if (playing) persist(); }, 1000);
    }
    if (window.YT && window.YT.Player) boot();
    else {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) prev(); boot(); };
      if (!document.getElementById('mk-yt-api')) { var sc = document.createElement('script'); sc.id = 'mk-yt-api'; sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); }
    }
    ctl = { toggle: function () {
      if (!player || !player.playVideo) return;
      if (playing) { userPaused = true; intent = false; player.pauseVideo(); }
      else { userPaused = false; intent = true; player.playVideo(); }
    } };
    window.sqMusic = {
      consented: cons,
      playing: function () { return playing; },
      keep: function () { consented = true; window.sqMusic.consented = true; persist(); },
      stop: stopAll,
      showBar: wake
    };
  }

  playBtn.addEventListener('click', function () { if (ctl) ctl.toggle(); armHide(); });
  pill.querySelector('.mk-next').addEventListener('click', function () { goTo(shuffleNext(cur)); armHide(); });
  // previous: back to the song before this one; with nothing before it (or a few seconds in) it restarts this song
  pill.querySelector('.mk-prev').addEventListener('click', function () {
    if (!player || !player.loadVideoById) return;
    var t = 0; try { t = player.getCurrentTime(); } catch (e) {}
    if (hist.length && t < 4) { var back = hist.pop(); saveHist(); goTo(back, true); }
    else { try { player.seekTo(0, true); if (!playing) { userPaused = false; intent = true; player.playVideo(); } } catch (e) {} }
    armHide();
  });
  // the icon: the first press starts a song (carried to the next page without asking); after that it opens the bar
  ico.addEventListener('click', function () {
    if (!hasPlayer) init({ i: nextDefault(), t: 0, at: Date.now(), paused: false }, true, true);
    else wake();
  });
  window.addEventListener('pagehide', persist);

  // ---- dragging: the icon and the open bar both slide along the bottom; letting go settles on the nearest corner ----
  var dragSt = null, dragMoved = false;
  function onMove(e) {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    var dx = e.clientX - dragSt.x;
    if (!dragMoved && Math.abs(dx) < 6) return;            // under 6px it is still a tap
    if (!dragMoved) {
      dragMoved = true;
      pill.classList.add('is-dragging'); clearTimeout(hideTimer);
      pill.style.right = 'auto';
    }
    pill.style.left = Math.max(EDGE, Math.min(window.innerWidth - pill.offsetWidth - EDGE, dragSt.left + dx)) + 'px';
  }
  function endDrag(e) {
    if (!dragSt || dragSt.id !== e.pointerId) return;
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', endDrag); window.removeEventListener('pointercancel', endDrag);
    dragSt = null;
    if (!dragMoved) return;
    var r = pill.getBoundingClientRect();
    var side = r.left + r.width / 2 > window.innerWidth / 2 ? 'R' : 'L';
    pill.classList.remove('is-dragging');
    pill.style.left = ''; pill.style.right = '';
    applySide(side); setSide(side);                         // the only place the side ever changes
    var nl = pill.getBoundingClientRect().left;
    if (pill.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pill.animate([{ transform: 'translateX(' + (r.left - nl) + 'px)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.3,1)' });
    }
    if (!pill.classList.contains('is-mini')) armHide();
    setTimeout(function () { dragMoved = false; }, 0);
  }
  pill.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    dragSt = { id: e.pointerId, x: e.clientX, left: pill.getBoundingClientRect().left };
    dragMoved = false;
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  });
  pill.addEventListener('click', function (e) { if (dragMoved) { e.stopPropagation(); e.preventDefault(); } }, true);   // a drag is never a click

  // music carried over from the last page: just the icon, the song carries on
  var saved = read();
  if (saved && typeof saved.i === 'number' && SONGS[saved.i]) init(saved, true, false);
  else sync();
})();
