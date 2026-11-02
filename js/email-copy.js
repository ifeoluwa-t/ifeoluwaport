/* Email links on a desktop (a mouse and hover): clicking copies the address instead of opening the mail app.
 * Hovering shows a "Click to copy" tooltip (and the "copy" cursor label from js/fx.js); after a click a small
 * "Email copied!" confirmation fades after about 2 seconds and is announced to screen readers.
 * Touch screens keep the normal mailto behaviour, and so does any browser that cannot copy. */
(function () {
  var desktop = window.matchMedia('(hover: hover) and (pointer: fine)');
  var links = Array.prototype.slice.call(document.querySelectorAll('a[href^="mailto:"]'));
  if (!links.length) return;

  var css = document.createElement('style');
  css.textContent =
    '.ec-tip{position:fixed;z-index:10001;padding:6px 12px;border-radius:999px;background:#0c0054;color:#fff;font:500 12px/1.3 Poppins,system-ui,sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transform:translate(-50%,4px);transition:opacity .15s ease,transform .15s ease}' +
    '.ec-tip.is-on{opacity:1;transform:translate(-50%,0)}' +
    '.ec-tip::after{content:"";position:absolute;left:50%;bottom:-4px;width:8px;height:8px;margin-left:-4px;background:#0c0054;transform:rotate(45deg);border-radius:1px}' +
    '.ec-toast{position:fixed;left:50%;bottom:28px;z-index:10001;padding:11px 20px;border-radius:999px;background:#0c0054;color:#fff;font:600 14px/1.3 Poppins,system-ui,sans-serif;box-shadow:0 12px 30px rgba(7,0,46,.35);opacity:0;pointer-events:none;transform:translate(-50%,10px);transition:opacity .25s ease,transform .25s ease}' +
    '.ec-toast.is-on{opacity:1;transform:translate(-50%,0)}' +
    '@media (prefers-reduced-motion:reduce){.ec-tip,.ec-toast{transition:none}}';
  document.head.appendChild(css);

  var tip = document.createElement('div'); tip.className = 'ec-tip'; tip.setAttribute('aria-hidden', 'true'); tip.textContent = 'Click to copy';
  var toast = document.createElement('div'); toast.className = 'ec-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(tip); document.body.appendChild(toast);

  function address(a) { return a.getAttribute('href').replace(/^mailto:/i, '').split('?')[0]; }
  function showTip(a) {
    if (!desktop.matches) return;
    var r = a.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - 70, Math.max(70, r.left + r.width / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - 40) + 'px';
    tip.classList.add('is-on');
  }
  function hideTip() { tip.classList.remove('is-on'); }
  var timer = 0;
  function say(msg) {
    toast.textContent = '';
    void toast.offsetWidth;
    toast.textContent = msg;                                   // a fresh text node so the screen reader announces it every time
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('is-on'); }, 2000);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {            // the older way, for pages that are not secure or browsers without the Clipboard API
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  links.forEach(function (a) {
    a.addEventListener('mouseenter', function () { showTip(a); });
    a.addEventListener('mouseleave', hideTip);
    a.addEventListener('focus', function () { if (a.matches(':focus-visible')) showTip(a); });
    a.addEventListener('blur', hideTip);
    a.addEventListener('click', function (e) {
      if (!desktop.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      copy(address(a)).then(function () { hideTip(); say('Email copied!'); }, function () { window.location.href = a.href; });   // cannot copy: open the mail app instead
    });
  });
  window.addEventListener('scroll', hideTip, { passive: true });
})();
