/* Loads the ray-traced glass engine only on desktop-class pointers.
   Mobile keeps a native backdrop-filter treatment to protect scroll performance. */
(function () {
  'use strict';
  var scene = document.getElementById('site-glass-scene');
  if (!scene) return;
  var MAX_GLASS = 16;
  var MAX_CARDS = 14;
  var used = 0;
  function mark(el) {
    if (!el || el.hasAttribute('glass') || used >= MAX_GLASS) return;
    el.setAttribute('glass', '');
    used += 1;
  }
  function collect() {
    mark(document.querySelector('.site-header'));
    mark(document.querySelector('.global-glass-nav'));
    Array.from(scene.querySelectorAll('.glass-card')).slice(0, MAX_CARDS).forEach(function (card) {
      if (used < MAX_GLASS) mark(card);
    });
  }
  collect();
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1 || used >= MAX_GLASS) return;
        if (node.matches && node.matches('.glass-card') && used < MAX_GLASS) mark(node);
        if (node.querySelectorAll) Array.from(node.querySelectorAll('.glass-card')).forEach(function (card) {
          if (used < MAX_GLASS) mark(card);
        });
      });
    });
  });
  observer.observe(scene, { childList:true, subtree:true });
  var desktop = window.matchMedia('(min-width:761px) and (pointer:fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (desktop && !reduced) {
    import('https://cdn.jsdelivr.net/gh/MuhammadaliMS/liquid-glass@1/dist/liquid-glass.js')
      .then(function () { scene.setAttribute('data-raytraced', 'true'); })
      .catch(function (error) { console.warn('Ray-traced glass unavailable; using CSS fallback.', error); });
  }
})();
