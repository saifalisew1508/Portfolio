(function(){
'use strict';
if(document.querySelector('.global-glass-nav'))return;
var path=location.pathname.split('/').pop()||'index.html';
var isHome=path===''||path==='index.html';
var links=[['home','Home','index.html#home'],['about','About','index.html#about'],['resume','Resume','index.html#resume'],['contact','Contact','index.html#contact']];
var icons={
home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z"/></svg>',
about:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
resume:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6m-6 4h6"/></svg>',
contact:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
more:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
};
var nav=document.createElement('nav');nav.className='global-glass-nav';nav.setAttribute('aria-label','Main navigation');
var html=links.map(function(item){return '<a class="global-nav-item" data-nav="'+item[0]+'" href="'+item[2]+'">'+icons[item[0]]+'<span>'+item[1]+'</span></a>'}).join('');
html+='<div class="global-nav-more"><button class="global-nav-item global-more-toggle" type="button" data-nav="more" aria-expanded="false" aria-haspopup="true">'+icons.more+'<span>More</span></button><div class="global-more-menu" aria-label="More pages"><a href="games.html">Games arcade</a><a href="calculator.html">Calculator</a><a href="music.html">Music player</a><a href="projects.html">Projects</a></div></div>';
nav.innerHTML=html;var indicator=document.createElement('span');indicator.className='global-nav-indicator';indicator.setAttribute('aria-hidden','true');nav.insertBefore(indicator,nav.firstChild);document.body.appendChild(nav);
var items=Array.from(nav.querySelectorAll('[data-nav]')),more=nav.querySelector('.global-nav-more'),toggle=nav.querySelector('.global-more-toggle'),menu=nav.querySelector('.global-more-menu'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,indicatorReady=false;
function moveIndicator(item){if(!item)return;var navRect=nav.getBoundingClientRect(),rect=item.getBoundingClientRect(),x=rect.left-navRect.left,y=rect.top-navRect.top;if(!indicatorReady||reduced){indicator.style.width=rect.width+'px';indicator.style.height=rect.height+'px';indicator.style.transform='translate3d('+x+'px,'+y+'px,0)';indicatorReady=true;indicator.classList.add('is-ready');return}indicator.style.width=rect.width+'px';indicator.style.height=rect.height+'px';indicator.style.transform='translate3d('+x+'px,'+y+'px,0)';}
function setActive(key){var selected=null;items.forEach(function(item){var active=item.dataset.nav===key;item.classList.toggle('active',active);if(active)selected=item;if(item.dataset.nav==='more')item.setAttribute('aria-current',active?'page':'false');else if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')});moveIndicator(selected)}
function activeForLocation(){if(!isHome)return 'more';var hash=location.hash.replace('#','');if(hash==='about')return 'about';if(hash==='resume')return 'resume';if(hash==='contact')return 'contact';return 'home'}
function closeMenu(){more.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
function openMenu(){more.classList.add('open');toggle.setAttribute('aria-expanded','true');setActive('more')}
toggle.addEventListener('click',function(){if(more.classList.contains('open')){closeMenu();setActive(activeForLocation())}else openMenu()});
document.addEventListener('click',function(e){if(!e.target.closest('.global-nav-more'))closeMenu()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeMenu();toggle.focus();setActive(activeForLocation())}});
nav.querySelectorAll('.global-nav-item[href]').forEach(function(a){a.addEventListener('click',function(){closeMenu();setActive(a.dataset.nav)})});
/* Animate the handoff between the More destinations without breaking modified clicks. */
document.body.classList.add('global-page-enter');
document.body.addEventListener('animationend',function(e){if(e.animationName==='globalPageEnter')document.body.classList.remove('global-page-enter')});
menu.querySelectorAll('a[href]').forEach(function(a){
 a.addEventListener('click',function(e){
  if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var destination=a.href;
  if(!destination||destination===location.href)return;
  e.preventDefault();
  closeMenu();
  document.body.classList.remove('global-page-enter');
  document.body.classList.add('global-page-leaving');
  window.setTimeout(function(){location.href=destination},220);
 });
});
window.addEventListener('resize',function(){var active=items.find(function(item){return item.classList.contains('active')});if(active)moveIndicator(active)},{passive:true});
setActive(activeForLocation());
if(isHome){
 var sectionIds=['home','about','resume','contact'].map(function(id){return document.getElementById(id)}).filter(Boolean);
 function updateFromScroll(){if(location.hash&&location.hash!=='#home')return;var marker=window.scrollY+Math.min(window.innerHeight*.36,260),current=sectionIds[0];sectionIds.forEach(function(s){if(s.offsetTop<=marker)current=s});var key=current.id;setActive(key)}
 var queued=false;window.addEventListener('scroll',function(){if(!queued){queued=true;requestAnimationFrame(function(){updateFromScroll();queued=false})}},{passive:true});
 window.addEventListener('resize',updateFromScroll,{passive:true});
 window.addEventListener('hashchange',function(){setActive(activeForLocation())});
 window.addEventListener('load',updateFromScroll,{once:true});updateFromScroll();
}else setActive('more');
})();