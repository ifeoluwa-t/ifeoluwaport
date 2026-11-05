/* The private dashboard's script (see dashboard.html and api/admin.js). Everything from the server is put on the page with textContent, never as HTML. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var items = [];

  function api(method, body) {
    var opt = { method: method, credentials: 'same-origin', cache: 'no-store' };
    if (body) { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body); }
    return fetch('/api/admin', opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    });
  }
  function fmt(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function show(authed) { $('login').hidden = authed; $('app').hidden = !authed; if (!authed) $('pw').focus(); }

  /* everything from the server is put on the page with textContent, never as HTML */
  function render() {
    var q = $('search').value.trim().toLowerCase();
    var shown = items.filter(function (s) { return !q || s.text.toLowerCase().indexOf(q) > -1 || (s.name || '').toLowerCase().indexOf(q) > -1; });
    $('count').textContent = q ? shown.length + ' of ' + items.length + ' suggestions' : items.length + (items.length === 1 ? ' suggestion' : ' suggestions') + ' in total';
    var ul = $('list'); ul.textContent = '';
    if (!shown.length) {
      var e = document.createElement('li'); e.className = 'empty';
      e.textContent = items.length ? 'Nothing matches that search.' : 'No suggestions yet.';
      ul.appendChild(e); return;
    }
    shown.forEach(function (s) {
      var li = document.createElement('li'); li.className = 'item';
      var main = document.createElement('div');
      var t = document.createElement('p'); t.className = 'text'; t.textContent = s.text;
      var m = document.createElement('p'); m.className = 'meta'; m.textContent = (s.name || 'Anonymous') + ' · ' + fmt(s.at);
      main.appendChild(t); main.appendChild(m);
      var acts = document.createElement('div'); acts.className = 'acts';
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn--small btn--danger'; del.textContent = 'Delete';
      del.addEventListener('click', function () { confirmDelete(acts, del, s); });
      acts.appendChild(del);
      li.appendChild(main); li.appendChild(acts); ul.appendChild(li);
    });
  }
  function confirmDelete(acts, del, s) {
    del.hidden = true;
    var yes = document.createElement('button'); yes.type = 'button'; yes.className = 'btn btn--small btn--danger is-sure'; yes.textContent = 'Yes, delete';
    var no = document.createElement('button'); no.type = 'button'; no.className = 'btn btn--small btn--ghost'; no.textContent = 'Cancel';
    function undo() { yes.remove(); no.remove(); del.hidden = false; }
    no.addEventListener('click', undo);
    yes.addEventListener('click', function () {
      yes.disabled = true; no.disabled = true; yes.textContent = 'Deleting…';
      api('POST', { action: 'delete', id: s.id }).then(function (r) {
        if (r.ok || r.status === 404) { items = items.filter(function (x) { return x.id !== s.id; }); render(); }
        else if (r.status === 401) show(false);
        else { undo(); $('app-msg').textContent = r.d.error || 'Could not delete that.'; }
      });
    });
    acts.appendChild(yes); acts.appendChild(no); no.focus();
  }

  function load() {
    return api('GET').then(function (r) {
      if (r.status === 401) { show(false); return; }
      if (!r.ok) { show(true); $('app-msg').textContent = r.d.error || 'Could not load the data.'; return; }
      $('app-msg').textContent = '';
      show(true);
      items = r.d.suggestions || [];
      render();
      var x = r.d.reaction || {};
      $('rx-plays').textContent = x.plays == null ? '–' : x.plays.toLocaleString();
      $('rx-avg').textContent = x.average == null ? '–' : x.average + ' ms';
      $('rx-fast').textContent = x.fastest == null ? '–' : x.fastest + ' ms';
      $('rx-fast-at').textContent = x.fastest == null ? '' : x.fastestAt ? 'Set ' + fmt(x.fastestAt) : 'Date not recorded (it will be from the next record)';
    }).catch(function () { show(true); $('app-msg').textContent = 'Could not load the data.'; });
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = $('login-btn'); b.disabled = true; $('login-msg').textContent = '';
    api('POST', { action: 'login', password: $('pw').value }).then(function (r) {
      if (r.ok) { $('pw').value = ''; return load(); }
      $('login-msg').textContent = r.d.error || 'Could not log in.';
    }).catch(function () { $('login-msg').textContent = 'Could not reach the server.'; })
      .then(function () { b.disabled = false; });
  });
  $('logout').addEventListener('click', function () { api('POST', { action: 'logout' }).then(function () { items = []; show(false); }); });
  $('search').addEventListener('input', render);

  /* CSV: quotes doubled; a cell that starts with = + - @ gets a leading ' so a spreadsheet never runs it as a formula */
  function cell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }
  $('export').addEventListener('click', function () {
    var rows = [['Date', 'Name', 'Suggestion', 'ID']].concat(items.map(function (s) { return [s.at, s.name || 'Anonymous', s.text, s.id]; }));
    var csv = '﻿' + rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'suggestions-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  load();
})();
