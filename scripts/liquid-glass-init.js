/* Self-hosted Zerowing Liquid Glass engine; register only existing visible tiles. */
(function () {
  'use strict';
  var scene = document.getElementById('site-glass-scene');
  if (!scene) return;

  scene.setAttribute('dim', '0.25');
  var registered = new Set();
  var maxGlass = 16;
  var contentLimit = 15; // one remaining slot for the shared navigation dock

  function register(el) {
    if (!el || registered.has(el) || registered.size >= maxGlass) return;
    el.setAttribute('glass', '');
    registered.add(el);
  }

  function visible(el) {
    return !!(el && el.getClientRects && el.getClientRects().length);
  }

  function collect(root) {
    if (!root) return;
    var nav = root.matches && root.matches('.global-glass-nav')
      ? root : (root.querySelector && root.querySelector('.global-glass-nav'));
    if (nav) register(nav);

    function addTile(tile) {
      if (visible(tile) && registered.size < contentLimit) register(tile);
    }
    if (root.matches && root.matches('.glass-card, .resume-panel') && !root.matches('.global-glass-nav')) addTile(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('.glass-card, .resume-panel').forEach(addTile);
    }
  }

  collect(scene);
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === 'attributes') {
        collect(record.target);
        if (record.target.parentElement) collect(record.target.parentElement);
      }
      record.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) collect(node);
      });
    });
  });
  observer.observe(scene, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class','hidden','style']
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.setAttribute('reduce-motion', '');
  }
  import('/vendor/liquid-glass.js')
    .then(function () {
      scene.setAttribute('data-raytraced', 'true');
      scene.removeAttribute('data-engine-fallback');
    })
    .catch(function (error) {
      scene.setAttribute('data-engine-fallback', 'true');
      console.error('Self-hosted Liquid Glass engine failed to load.', error);
    });
})();
