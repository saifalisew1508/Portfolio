/* Liquid Glass refraction for .glass-card
 * Builds one SVG displacement map per card (bent edges, flat centre) and
 * feeds it to backdrop-filter: url(#...). Chromium-based browsers only;
 * Safari / Firefox keep the normal frosted-glass fallback automatically. */
(function () {
  'use strict';

  var ua = navigator.userAgent;
  var isChromium = /Chrome\/|Chromium\/|CriOS/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
  var supported = isChromium &&
    window.CSS && CSS.supports &&
    CSS.supports('backdrop-filter', 'url(#a) blur(2px)');
  if (!supported) return;

  var NS = 'http://www.w3.org/2000/svg';
  var host = document.createElementNS(NS, 'svg');
  host.setAttribute('width', '0');
  host.setAttribute('height', '0');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  var defs = document.createElementNS(NS, 'defs');
  host.appendChild(defs);
  document.body.appendChild(host);

  var SCALE = 34;      // refraction strength (px of displacement at the edge)
  var BEZEL = 0.16;    // edge band width as a fraction of the shorter side
  var uid = 0;

  function mapFor(w, h) {
    var b = Math.max(10, Math.min(w, h) * BEZEL);
    // R channel = horizontal push, G channel = vertical push, 128 = no push.
    var svg =
      '<svg xmlns="' + NS + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs>' +
      '<linearGradient id="l" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="rgb(255,128,128)"/><stop offset="1" stop-color="rgb(255,128,128)" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="r" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="rgb(0,128,128)" stop-opacity="0"/><stop offset="1" stop-color="rgb(0,128,128)"/></linearGradient>' +
      '<linearGradient id="t" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(128,255,128)"/><stop offset="1" stop-color="rgb(128,255,128)" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="d" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(128,0,128)" stop-opacity="0"/><stop offset="1" stop-color="rgb(128,0,128)"/></linearGradient>' +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="rgb(128,128,128)"/>' +
      '<rect width="' + b + '" height="' + h + '" fill="url(#l)"/>' +
      '<rect x="' + (w - b) + '" width="' + b + '" height="' + h + '" fill="url(#r)"/>' +
      '<rect width="' + w + '" height="' + b + '" fill="url(#t)"/>' +
      '<rect y="' + (h - b) + '" width="' + w + '" height="' + b + '" fill="url(#d)"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function build(el) {
    var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (w < 40 || h < 40) return;
    var id = el.__lgId || (el.__lgId = 'lg-' + (++uid));
    var f = document.getElementById(id);
    if (!f) {
      f = document.createElementNS(NS, 'filter');
      f.id = id;
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.setAttribute('filterUnits', 'userSpaceOnUse');
      f.setAttribute('primitiveUnits', 'userSpaceOnUse');
      var img = document.createElementNS(NS, 'feImage');
      img.setAttribute('result', 'map');
      var blur = document.createElementNS(NS, 'feGaussianBlur');
      blur.setAttribute('in', 'map');
      blur.setAttribute('stdDeviation', '3');
      blur.setAttribute('result', 'softmap');
      var disp = document.createElementNS(NS, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'softmap');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');
      disp.setAttribute('scale', SCALE);
      f.appendChild(img); f.appendChild(blur); f.appendChild(disp);
      defs.appendChild(f);
    }
    f.setAttribute('x', 0); f.setAttribute('y', 0);
    f.setAttribute('width', w); f.setAttribute('height', h);
    var im = f.firstChild;
    im.setAttribute('x', 0); im.setAttribute('y', 0);
    im.setAttribute('width', w); im.setAttribute('height', h);
    im.setAttribute('href', mapFor(w, h));
    el.style.setProperty('--lg-filter', 'url(#' + id + ')');
    el.classList.add('lg-refract');
  }

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) { build(e.target); });
  }) : null;

  function init() {
    document.querySelectorAll('.glass-card').forEach(function (el) {
      build(el);
      if (ro) ro.observe(el);
      el.addEventListener('pointermove', function (ev) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--lg-x', (ev.clientX - r.left) + 'px');
        el.style.setProperty('--lg-y', (ev.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
