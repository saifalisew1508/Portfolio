/* Self-hosted Zerowing Liquid Glass engine; no upstream/CDN runtime dependency. */
(function () {
  'use strict';
  var scene = document.getElementById('site-glass-scene');
  if (!scene) return;
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
    var priority = '.site-header, .global-glass-nav, .resume-panel';
    var secondary = '.glass-card';
    if (root.matches && root.matches(priority)) register(root);
    if (root.querySelectorAll) root.querySelectorAll(priority).forEach(register);
    if (root.matches && root.matches(secondary)) register(root);
    if (root.querySelectorAll) root.querySelectorAll(secondary).forEach(register);
  }
  collect(scene);
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) collect(node);
      });
    });
  });
  observer.observe(scene, { childList:true, subtree:true });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) scene.setAttribute('reduce-motion', '');
  import('/vendor/liquid-glass.js')
    .then(function () { scene.setAttribute('data-raytraced', 'true'); scene.removeAttribute('data-engine-fallback'); })
    .catch(function (error) { scene.setAttribute('data-engine-fallback', 'true'); console.error('Self-hosted Liquid Glass engine failed to load.', error); });
})();
