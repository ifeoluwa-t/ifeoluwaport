/* Landing hero extra: the photo swaps to the 3D portrait when you hover it (a tap toggles it on touch screens). */
(function () {
  var hero = document.querySelector('.hero');
  var photo = document.querySelector('.hero-photo');
  if (!hero || !photo) return;
  var img = photo.querySelector('.hero-photo-img:not(.hero-photo-img--3d)');

  // ---- photo swap: hit-test the part of the picture where you actually are (not the empty corners)
  function overPhoto(x, y) {
    var r = img.getBoundingClientRect();
    return x >= r.left + r.width * 0.18 && x <= r.left + r.width * 0.92 && y >= r.top + r.height * 0.04 && y <= r.bottom;
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    photo.classList.toggle('is-3d', overPhoto(e.clientX, e.clientY));
  }, { passive: true });
  document.addEventListener('pointerleave', function () { photo.classList.remove('is-3d'); });
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    if (overPhoto(e.clientX, e.clientY)) photo.classList.toggle('is-3d');
  }, { passive: true });
})();
