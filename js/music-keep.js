/* Keeps the Side-Quests music going when a visitor leaves for another page, if they say so.
 * - Side-Quests page: exposes the playlist (window.SQ_SONGS) and clears any saved session.
 * - Every other page: if music was kept (sessionStorage "sqMusic"), resumes it in a small
 *   floating player with pause and close, and keeps saving its place so it follows the visitor. */
(function () {
  var KEY = 'sqMusic';
  // Alternates Afro / world picks with everything else, so no two similar songs sit side by side.
  var SONGS = window.SQ_SONGS = [
    ['Remember Me', 'Fireboy DML', '7nhFhG0IuaE'],
    ['august', 'Taylor Swift', 'nn_0zPAfyo8'],
    ['Slick (Remix)', 'Victony, Summer Walker & Don Toliver', 'ksnN8PMf30I'],
    ['October Passed Me By', 'girl in red', 'c8W4WRNz3gM'],
    ['Bo Gogo (Magical Remix)', 'Kelvin Momo, Dlala Thukzin & Da Muziqal Chef', 'xGyzVSleWcQ'],
    ['Divinize', 'ROSALÍA', 'OxDmGz60hws'],
    ['Pluto (Remember You)', 'DJ Clock ft. Beatenberg', 'kF-f2nIVDn4'],
    ['Doors', 'Noah Kahan', 'IAYJ4iTDkQ0'],
    ['Bridgertn', 'Ayra Starr', 'waJE7BGVn-k'],
    ['Cry (Just A Little)', 'Bingo Players', 'ZBpWdwXzpMk'],
    ['Coping Mechanism', 'Omah Lay & Elmah', 'VWqdBp3OfVg'],
    ['party 4 u', 'Charli xcx', 'fKrTCGGEiWY'],
    ['Live Life', 'Show Dem Camp & Tems', 'gxXMhMApfW0'],
    ['STORM II', 'GENER8ION & Yung Lean', 'w0T83nZDOEc'],
    ['Bandana', 'Fireboy DML & Asake', 'gCLUIzOsgGg'],
    ['The Wonder Years', 'Jon Bellion', 'WVDtoaO5C70'],
    ['Like a Prayer (Choir Version)', "I'll Take You There Choir", 'pMPKTwESkxs'],
    ['In a Lake', 'Mitski', 'pUERvd0D_XI']
  ];
  function read() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } }
  function write(v) { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY); } catch (e) {} }
  window.sqMusicStore = { read: read, write: write };

  if (document.body && document.body.getAttribute('data-page') === 'side-quests') { write(null); return; }
  var saved = read();
  if (!saved || typeof saved.i !== 'number' || !SONGS[saved.i]) return;

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
    '.mk-yt{position:fixed;left:-9999px;top:0;width:200px;height:200px;overflow:hidden;pointer-events:none}';
  document.head.appendChild(css);

  var pill = document.createElement('div');
  pill.className = 'mk';
  pill.setAttribute('role', 'region');
  pill.setAttribute('aria-label', 'Music player');
  pill.innerHTML =
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
  function label() {
    pill.querySelector('b').textContent = SONGS[cur][0];
    pill.querySelector('i').textContent = SONGS[cur][1];
  }
  function setPlaying(on) { playing = on; pill.classList.toggle('on', on); playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play'); }
  function persist() {
    if (!player || !player.getCurrentTime) return;   // not loaded yet: keep what was saved
    var t = 0;
    try { t = player && player.getCurrentTime ? player.getCurrentTime() : 0; } catch (e) {}
    write({ i: cur, t: Math.floor(t), at: Date.now(), paused: !playing });
  }
  function stopAll() {
    clearInterval(tick);
    try { if (player && player.destroy) player.destroy(); } catch (e) {}
    write(null);
    pill.remove(); holder.remove();
  }
  label();

  function boot() {
    player = new YT.Player('mk-yt', {
      videoId: SONGS[cur][2], width: '200', height: '200',
      playerVars: { autoplay: saved.paused ? 0 : 1, start: startAt, rel: 0, playsinline: 1, modestbranding: 1 },
      events: {
        onReady: function (e) { if (!saved.paused) e.target.playVideo(); },
        onStateChange: function (e) {
          if (e.data === 0) { cur = (cur + 1) % SONGS.length; label(); player.loadVideoById(SONGS[cur][2]); }
          else if (e.data === 1 || e.data === 3) setPlaying(true);
          else if (e.data === 2) { setPlaying(false); persist(); }
        },
        onError: function () { cur = (cur + 1) % SONGS.length; label(); player.loadVideoById(SONGS[cur][2]); }
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
    cur = (cur + 1) % SONGS.length; label(); player.loadVideoById(SONGS[cur][2]); write({ i: cur, t: 0, at: Date.now(), paused: false });
  });
  pill.querySelector('.mk-x').addEventListener('click', stopAll);
  window.addEventListener('pagehide', persist);
})();
