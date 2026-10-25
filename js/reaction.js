/* Reaction Speed Test — see #reaction in index.html, api/reaction.js for the shared stats + leaderboard. */
(function () {
  const panel = document.getElementById('rx-panel');
  if (!panel) return;

  const el = (id) => document.getElementById(id);
  const titleEl = el('rx-title');
  const bigEl = el('rx-big');
  const subEl = el('rx-sub');
  const compareEl = el('rx-compare');
  const teaseEl = el('rx-tease');
  const liveEl = el('rx-live');
  const claimEl = el('rx-claim');
  const claimText = el('rx-claim-text');
  const claimName = el('rx-claim-name');
  const claimMsg = el('rx-claim-msg');
  const boardEl = el('rx-board');
  const boardView = el('rx-board-view');
  const boardTrack = el('rx-board-track');

  const TYPICAL_MS = 250;
  const STORE_KEY = 'rx-attempts';
  const MIN_VALID = 100;
  const MAX_VALID = 2000;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  let state = 'idle';
  let timer = 0;
  let t0 = 0;
  let lastEndAt = 0;
  let streakSoon = 0; // false starts in a row
  let global = null; // { average, fastest, count, players, board } once the API answers; null = offline
  let claim = null;  // { token, ms } while a "add your name" offer is open

  /* ---------- teasing lines ---------- */
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const VERDICTS = {
    lightning: ['Lightning fast ⚡', 'Are you even human? 🤖', 'Did you cheat? Genuinely asking. 👀', 'Blink and you would have missed that ⚡'],
    sharp: ['Sharp!', 'Okay okay, we see you 😏', 'Fast enough to catch a falling pen 🖊️', 'Respectable. A cat would be impressed 🐱'],
    decent: ['Not bad', 'Not bad... for a human 🙂', 'Solid. Could you go quicker? Probably 🤔', 'Is the coffee kicking in yet? ☕'],
    slow: ['Were you sleeping? 😴', 'A sloth just overtook you 🦥', 'Hello? Anyone home? 📞', 'Loading... your reflexes ⏳', 'Is this thing on? 🥱'],
  };
  const SOON_SUBS = ['Tap to try again.', 'Patience, grasshopper. Tap to try again.', 'Trigger-happy! Tap to try again.', 'Eager much? Tap to try again.', 'The blue was NOT ready. Tap to try again.'];
  const SOON_STREAK = ['Twice in a row? Someone is impatient 😅', 'Three false starts. Are you guessing? 🎲', 'Take a breath. Wait for the blue. 🧘'];
  function verdict(ms) {
    if (ms < 200) return pick(VERDICTS.lightning);
    if (ms < 300) return pick(VERDICTS.sharp);
    if (ms <= 400) return pick(VERDICTS.decent);
    return pick(VERDICTS.slow);
  }

  /* ---------- this visitor's attempts (localStorage, never required) ---------- */
  function loadMine() {
    try {
      const a = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(a) ? a.filter((n) => Number.isInteger(n)) : [];
    } catch (e) { return []; }
  }
  let mine = loadMine();
  function saveMine() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(mine.slice(-200))); } catch (e) { /* private mode etc. */ }
  }

  /* ---------- rendering ---------- */
  function setState(next, o) {
    state = next;
    panel.dataset.state = next;
    titleEl.textContent = o.title || '';
    titleEl.hidden = !o.title;
    bigEl.textContent = o.big || '';
    bigEl.hidden = !o.big;
    subEl.textContent = o.sub || '';
    subEl.hidden = !o.sub;
    panel.setAttribute('aria-label', o.label);
    liveEl.textContent = o.live || '';
  }

  function renderStats() {
    const avg = mine.length ? Math.round(mine.reduce((a, b) => a + b, 0) / mine.length) : null;
    const best = mine.length ? Math.min.apply(null, mine) : null;
    const online = !!(global && global.count > 0);
    const ms = (v) => (v == null ? '—' : v + ' ms');
    el('rx-mine').textContent = ms(avg);
    el('rx-best').textContent = ms(best);
    el('rx-players-count').textContent = online && global.players > 0 ? global.players.toLocaleString() : '—';
    el('rx-everyone').textContent = online ? ms(global.average) : '—';
    el('rx-fastest').textContent = online ? ms(global.fastest) : '—';
  }

  /* ---------- leaderboard: horizontally scrolling strip ---------- */
  function makeItem(entry, i) {
    const it = document.createElement('span');
    it.className = 'rx-board-item';
    const rank = document.createElement('span');
    rank.className = 'rx-board-rank';
    rank.textContent = '#' + (i + 1);
    const name = document.createElement('span');
    name.textContent = entry.name; // textContent: names are never treated as HTML
    const ms = document.createElement('span');
    ms.className = 'rx-board-ms';
    ms.textContent = entry.ms + ' ms';
    it.append(rank, name, ms);
    return it;
  }

  let boardKey = '';
  function renderBoard() {
    const board = global && Array.isArray(global.board) ? global.board : null;
    if (!board) { boardEl.hidden = true; return; }
    boardEl.hidden = false;
    const key = JSON.stringify(board);
    if (key === boardKey) return; // don't restart the scroll for identical data
    boardKey = key;
    boardTrack.textContent = '';
    boardView.classList.remove('is-moving', 'is-static');
    boardTrack.style.removeProperty('--rx-dur');
    boardView.style.removeProperty('--rx-dur');

    if (!board.length) {
      const p = document.createElement('p');
      p.className = 'rx-board-empty';
      p.textContent = 'Nobody is on the board yet. Be the first! 🏁';
      boardTrack.appendChild(p);
      boardTrack.style.width = '100%';
      boardTrack.style.justifyContent = 'center';
      return;
    }
    boardTrack.style.width = '';
    boardTrack.style.justifyContent = '';

    const set = document.createElement('div');
    set.style.display = 'contents';
    board.forEach((b, i) => set.appendChild(makeItem(b, i)));
    boardTrack.appendChild(set);

    if (reduceMotion && reduceMotion.matches) { boardView.classList.add('is-static'); return; }

    // Seamless loop: repeat the set until one half is wider than the strip, then duplicate that half.
    const need = boardView.clientWidth || 600;
    const w = boardTrack.scrollWidth + 12;
    const copies = Math.max(1, Math.ceil(need / w));
    for (let c = 1; c < copies; c++) boardTrack.appendChild(set.cloneNode(true));
    const half = Array.from(boardTrack.children);
    half.forEach((n) => { const d = n.cloneNode(true); d.setAttribute('aria-hidden', 'true'); boardTrack.appendChild(d); });
    boardTrack.style.setProperty('--rx-dur', Math.max(20, Math.round((w * copies) / 60)) + 's');
    boardView.style.setProperty('--rx-dur', Math.max(20, Math.round((w * copies) / 60)) + 's');
    boardView.classList.add('is-moving');
  }

  function compareLine(ms) {
    const online = !!(global && global.count > 0);
    const ref = online ? global.average : TYPICAL_MS;
    const who = online ? 'the average visitor' : 'a typical human (~' + TYPICAL_MS + 'ms)';
    const d = ref - ms;
    if (d === 0) return "You're right on " + who + '.';
    return "You're " + Math.abs(d) + 'ms ' + (d > 0 ? 'faster' : 'slower') + ' than ' + who + '.';
  }

  // A second, cheekier line: personal best, own trend, and tries-so-far milestones.
  function teaseLine(ms, prevMine) {
    const tries = prevMine.length + 1;
    const prevBest = prevMine.length ? Math.min.apply(null, prevMine) : null;
    const prevAvg = prevMine.length ? prevMine.reduce((a, b) => a + b, 0) / prevMine.length : null;
    if (tries % 5 === 0) return "That's try number " + tries + '. We are not judging. We are, a little. 😌';
    if (prevBest != null && ms < prevBest) return 'New personal best! 🔥 Your old self is shaking.';
    if (prevBest != null && ms === prevBest) return 'Exactly your best. Spooky. 👻';
    if (prevAvg != null && ms > prevAvg + 120) return 'Getting sleepy? Your average is better than that. 😏';
    if (prevBest == null) return pick(['First try logged. No pressure. (A little pressure.)', 'Okay, that is the baseline. Now beat it. 😈']);
    return pick(['Again? Go on, you know you want to. 😏', 'One more. Just one. We both know it is not one.', 'The panel is judging you. Quietly. 👀']);
  }

  /* ---------- "add your name" offer ---------- */
  function hideClaim() {
    claim = null;
    claimEl.hidden = true;
    claimMsg.textContent = '';
    claimMsg.classList.remove('is-error');
  }
  function offerClaim(j, ms) {
    claim = { token: j.claim, ms: ms };
    claimText.textContent = "🏆 " + ms + ' ms would be #' + j.rank + ' on the leaderboard! Add your name?';
    claimEl.hidden = false;
    claimMsg.textContent = '';
    claimMsg.classList.remove('is-error');
    try { claimName.value = localStorage.getItem('rx-name') || ''; } catch (e) { /* ignore */ }
  }
  claimEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!claim) return;
    const name = claimName.value.trim();
    const saveBtn = claimEl.querySelector('.rx-claim-save');
    saveBtn.disabled = true;
    claimMsg.classList.remove('is-error');
    claimMsg.textContent = 'Saving...';
    fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim: claim.token, name: name }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j: j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j && j.error ? j.error : 'Could not save. Try again.');
        try { localStorage.setItem('rx-name', name); } catch (err) { /* ignore */ }
        useStats(j);
        const row = (j.board || []).find((b) => b.ms === claim.ms);
        const who = row ? row.name : name;
        hideClaim();
        teaseEl.textContent = "You're on the board, " + who + '! Go on, defend it. 🏅';
      })
      .catch((err) => {
        claimMsg.classList.add('is-error');
        claimMsg.textContent = err && err.message ? err.message : 'Could not save. Try again.';
      })
      .then(() => { saveBtn.disabled = false; });
  });
  el('rx-claim-skip').addEventListener('click', () => { hideClaim(); });

  /* ---------- game ---------- */
  function showIdle() {
    setState('idle', { title: 'Test your reaction speed.', sub: 'Tap to start.', label: 'Reaction speed test. Press to start.', live: '' });
  }

  function start() {
    compareEl.textContent = '';
    teaseEl.textContent = '';
    hideClaim();
    setState('waiting', { title: 'Wait for blue...', label: 'Waiting. Press as soon as the panel turns blue.', live: 'Wait for blue.' });
    timer = setTimeout(go, 1500 + Math.random() * 3500);
  }

  function go() {
    setState('go', { big: 'CLICK!', label: 'Now! Press!', live: 'Click now!' });
    t0 = performance.now();
  }

  function tooSoon() {
    clearTimeout(timer);
    lastEndAt = performance.now();
    streakSoon++;
    const sub = pick(SOON_SUBS);
    setState('soon', { title: 'Too soon! 🙈', sub: sub, label: 'Too soon. Press to try again.', live: 'Too soon! ' + sub });
    teaseEl.textContent = streakSoon >= 2 ? SOON_STREAK[Math.min(streakSoon - 2, SOON_STREAK.length - 1)] : '';
  }

  function react() {
    const ms = Math.round(performance.now() - t0);
    lastEndAt = performance.now();
    if (ms < MIN_VALID) return tooSoon(); // faster than a human can: counts as anticipating
    streakSoon = 0;
    const line = compareLine(ms); // against the average as it was before this attempt
    const prev = mine.slice();
    const v = verdict(ms);
    setState('result', { big: ms + ' ms', title: v, sub: 'Tap to go again.', label: 'Result ' + ms + ' milliseconds. Press to try again.', live: ms + ' milliseconds. ' + v });
    compareEl.textContent = line;
    teaseEl.textContent = teaseLine(ms, prev);
    if (ms <= MAX_VALID) {
      mine.push(ms);
      saveMine();
      renderStats();
      submit(ms);
    }
  }

  function onPress() {
    if (state === 'waiting') return tooSoon();
    if (state === 'go') return react();
    if (performance.now() - lastEndAt < 400) return; // swallow the tail of a frantic double-tap
    start();
  }

  panel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    onPress();
  });
  panel.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      onPress();
    }
  });

  /* ---------- shared stats (game keeps working if any of this fails) ---------- */
  function useStats(j) {
    if (j && typeof j.count === 'number' && j.count > 0 && Number.isFinite(j.average) && Number.isFinite(j.fastest)) {
      global = {
        average: j.average, fastest: j.fastest, count: j.count,
        players: Number.isFinite(j.players) ? j.players : 0,
        board: Array.isArray(j.board)
          ? j.board.filter((b) => b && typeof b.name === 'string' && Number.isFinite(b.ms)).slice(0, 10)
          : [],
      };
    }
    renderStats();
    renderBoard();
  }

  function fetchStats() {
    fetch('/api/reaction', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(useStats)
      .catch(() => { global = null; renderStats(); renderBoard(); });
  }

  function submit(ms) {
    fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ms: ms }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        useStats(j);
        // still on this result screen? then offer the leaderboard spot
        if (j && j.qualifies && j.claim && state === 'result') offerClaim(j, ms);
      })
      .catch(() => { /* offline or rate-limited: local stats already updated */ });
  }

  showIdle();
  renderStats();
  renderBoard();
  fetchStats();
})();
