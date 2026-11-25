/* Load the official ray-traced Liquid Glass engine on desktop and mobile.
   The component supplies its own CSS fallback when WebGL is unavailable. */
(function () {
  'use strict';
  var scene = document.getElementById('site-glass-scene');
  if (!scene) return;

  // Use the library's own API. A lower dim keeps the scene bright enough to read.
  scene.setAttribute('dim', '0.25');
  var registered = new Set();
  var maxGlass = 16;

  function register(el) {
    if (!el || registered.has(el) || registered.size >= maxGlass) return;
    el.setAttribute('glass', '');
    registered.add(el);
  }
  function collect(root) {
    if (!root) return;
    if (root.matches && root.matches('.site-header, .global-glass-nav, .glass-card')) register(root);
    if (root.querySelectorAll) root.querySelectorAll('.site-header, .global-glass-nav, .glass-card').forEach(register);
  }

  collect(scene);
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) collect(node);
      });
    });
  });
  observer.observe(scene, { childList: true, subtree: true });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.setAttribute('reduce-motion', '');
  }

  // Do not disable the real renderer based on screen size, pointer type or reduced motion.
  // The upstream component manages GPU limits and falls back if WebGL is unavailable.
  import('https://cdn.jsdelivr.net/gh/MuhammadaliMS/liquid-glass@1/dist/liquid-glass.js')
    .then(function () {
      scene.setAttribute('data-raytraced', 'true');
      scene.removeAttribute('data-engine-fallback');
    })
    .catch(function (error) {
      scene.setAttribute('data-engine-fallback', 'true');
      console.warn('Liquid Glass engine failed to load; using CSS fallback.', error);
    });
})();
