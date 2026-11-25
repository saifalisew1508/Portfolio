/* Liquid Glass v2 for .glass-card
 * - Edge refraction: SVG displacement map bends the background near the edges
 * - Chromatic edges: red, green and blue bend by slightly different amounts,
 *   which creates the rainbow fringe seen on real liquid glass
 * - Shine: pointer-following highlight (here) + slow diagonal sweep (CSS)
 * Chromium only (Chrome, Edge, Samsung Internet, Android Chrome).
 * Other browsers keep the normal glass from style.css.
 */
(function () {
  'use strict';

  var ua = navigator.userAgent;
  var isChromium = /Chrome\/|Chromium\/|CriOS|EdgA?\//.test(ua) && !/iPhone|iPad|iPod/.test(ua);
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 760px)').matches;
  var supported = !coarse && isChromium && window.CSS && CSS.supports &&
    CSS.supports('backdrop-filter', 'url(#a) blur(2px)');

  // Tune here. Everything else reads from these values.
  var CONFIG = {
    scale: 72,     // pronounced lens bend concentrated around the bezel
    bezel: 0.27,   // wider curved edge band for visible background distortion
    chroma: 0.16,  // stronger RGB separation at the glass edge
    soft: 1.25        // blur on the map: higher = smoother, rounder bend
  };

  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  var host = document.createElementNS(NS, 'svg');
  host.setAttribute('width', '0');
  host.setAttribute('height', '0');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  var defs = document.createElementNS(NS, 'defs');
  host.appendChild(defs);

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Eased ramp: strong at the card edge, fading to nothing toward the centre.
  function gradSvg(id, x2, y2, rgb, mirror) {
    var stops = [[0, 1], [0.25, 0.75], [0.5, 0.42], [0.75, 0.16], [1, 0]];
    if (mirror) stops = stops.map(function (p) { return [1 - p[0], p[1]]; }).reverse();
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">' +
      stops.map(function (p) {
        return '<stop offset="' + p[0] + '" stop-color="rgb(' + rgb + ')" stop-opacity="' + p[1] + '"/>';
      }).join('') + '</linearGradient>';
  }

  // Displacement map: R = horizontal push, G = vertical push, 128 = no push.
  function mapFor(w, h) {
    var b = Math.max(12, Math.min(w, h) * CONFIG.bezel);
    var svg =
      '<svg xmlns="' + NS + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs>' +
      gradSvg('l', 1, 0, '255,128,128', false) +
      gradSvg('r', 1, 0, '0,128,128', true) +
      gradSvg('t', 0, 1, '128,255,128', false) +
      gradSvg('d', 0, 1, '128,0,128', true) +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="rgb(128,128,128)"/>' +
      '<rect width="' + b + '" height="' + h + '" fill="url(#l)"/>' +
      '<rect x="' + (w - b) + '" width="' + b + '" height="' + h + '" fill="url(#r)"/>' +
      '<rect width="' + w + '" height="' + b + '" fill="url(#t)"/>' +
      '<rect y="' + (h - b) + '" width="' + w + '" height="' + b + '" fill="url(#d)"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Keep only one colour channel from each bent copy, then screen them back together.
  var ISOLATE = {
    R: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
    G: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
    B: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
  };

  function makeFilter(id) {
    var f = el('filter', {
      id: id,
      filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB'
    }, defs);
    el('feImage', { result: 'map', preserveAspectRatio: 'none' }, f);
    el('feGaussianBlur', { in: 'map', stdDeviation: CONFIG.soft, result: 'soft' }, f);

    // Three bends with slightly different strength. The difference is the rainbow edge.
    [['R', 1 + CONFIG.chroma], ['G', 1], ['B', 1 - CONFIG.chroma]].forEach(function (lane) {
      var k = lane[0];
      el('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'soft',
        result: 'd' + k,
        scale: CONFIG.scale * lane[1],
        xChannelSelector: 'R',
        yChannelSelector: 'G'
      }, f);
      el('feColorMatrix', { in: 'd' + k, type: 'matrix', values: ISOLATE[k], result: 'c' + k }, f);
    });
    el('feBlend', { in: 'cR', in2: 'cG', mode: 'screen', result: 'rg' }, f);
    el('feBlend', { in: 'rg', in2: 'cB', mode: 'screen' }, f);
    return f;
  }

  function setBox(f, w, h) {
    f.setAttribute('x', 0);
    f.setAttribute('y', 0);
    f.setAttribute('width', w);
    f.setAttribute('height', h);
    var img = f.firstChild;
    img.setAttribute('x', 0);
    img.setAttribute('y', 0);
    img.setAttribute('width', w);
    img.setAttribute('height', h);
    img.setAttribute('href', mapFor(w, h));
  }

  function build(card) {
    var w = Math.round(card.offsetWidth), h = Math.round(card.offsetHeight);
    if (w < 40 || h < 40) return; // hidden or tiny: wait for ResizeObserver
    if (supported) {
      if (!card.__lgFilter) {
        var id = 'lg-' + (++uid);
        card.__lgFilter = makeFilter(id);
        card.style.setProperty('--lg-filter', 'url(#' + id + ')');
      }
      setBox(card.__lgFilter, w, h);
    }
    card.classList.add('lg-refract');
  }

  // Shine follows finger or mouse. Updates are throttled to one per frame.
  function track(card) {
    var raf = 0, x = 0, y = 0;
    function paint() {
      raf = 0;
      card.style.setProperty('--lg-x', x + 'px');
      card.style.setProperty('--lg-y', y + 'px');
    }
    function onPoint(ev) {
      var r = card.getBoundingClientRect();
      x = ev.clientX - r.left;
      y = ev.clientY - r.top;
      if (!raf) raf = requestAnimationFrame(paint);
    }
    card.addEventListener('pointermove', onPoint, { passive: true });
    card.addEventListener('pointerdown', onPoint, { passive: true });
  }

  function init() {
    document.body.appendChild(host);
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
      entries.forEach(function (e) { build(e.target); });
    }) : null;
    function attach(card) {
      if (card.__lgAttached) return;
      card.__lgAttached = true;
      build(card);
      if (ro && !coarse) ro.observe(card);
      if (!coarse) track(card);
    }
    document.querySelectorAll('.glass-card').forEach(attach);
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('.glass-card')) attach(node);
            if (node.querySelectorAll) node.querySelectorAll('.glass-card').forEach(attach);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
                   
