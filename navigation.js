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
/* Add a persistent Auto / Force Day / Force Night control beside the header CTA. */
var header=document.querySelector('.site-header'),cta=header&&header.querySelector('.header-cta');
if(header&&cta&&!header.querySelector('.theme-control')){
 var actions=document.createElement('div');actions.className='header-actions';
 var menuButton=document.createElement('button');menuButton.type='button';menuButton.className='theme-menu-toggle';menuButton.setAttribute('aria-label','Theme settings');menuButton.setAttribute('aria-haspopup','true');menuButton.setAttribute('aria-expanded','false');menuButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
 var themeControl=document.createElement('div');themeControl.className='theme-control';
 var themeMenu=document.createElement('div');themeMenu.className='theme-menu';themeMenu.setAttribute('role','group');themeMenu.setAttribute('aria-label','Choose appearance');
 function refreshThemeMenu(){var mode=window.SiteTheme?window.SiteTheme.getMode():'auto',hour=new Date().getHours(),timeTheme=hour>=7&&hour<19?'day':'night',forced=timeTheme==='day'?'night':'day',label=forced==='day'?'Force day mode':'Force night mode',symbol=forced==='day'?'☀':'☾';themeMenu.innerHTML='<p class="theme-menu-title">APPEARANCE</p><button type="button" data-theme-mode="auto" '+(mode==='auto'?'class="selected" aria-pressed="true"':'aria-pressed="false"')+'><span>◐</span> Auto <small>By local time</small></button><button type="button" data-theme-mode="'+forced+'" '+(mode===forced?'class="selected"':'')+' aria-pressed="'+(mode===forced?'true':'false')+'><span>'+symbol+'</span> '+label+'</button>';}
 themeControl.append(menuButton,themeMenu);header.insertBefore(actions,cta);actions.append(cta,themeControl);

 function closeThemeMenu(){themeControl.classList.remove('open');menuButton.setAttribute('aria-expanded','false')}
 menuButton.addEventListener('click',function(){var open=!themeControl.classList.contains('open');themeControl.classList.toggle('open',open);menuButton.setAttribute('aria-expanded',String(open));refreshThemeMenu()});
 themeMenu.addEventListener('click',function(e){var button=e.target.closest('[data-theme-mode]');if(!button)return;if(window.SiteTheme)window.SiteTheme.setMode(button.dataset.themeMode);refreshThemeMenu();closeThemeMenu()});
 document.addEventListener('click',function(e){if(!e.target.closest('.theme-control'))closeThemeMenu()});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&themeControl.classList.contains('open')){closeThemeMenu();menuButton.focus()}});
 window.addEventListener('site-theme-change',refreshThemeMenu);refreshThemeMenu();
}
var items=Array.from(nav.querySelectorAll('[data-nav]')),more=nav.querySelector('.global-nav-more'),toggle=nav.querySelector('.global-more-toggle'),menu=nav.querySelector('.global-more-menu'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,indicatorReady=false;
function moveIndicator(item){if(!item)return;var navRect=nav.getBoundingClientRect(),rect=item.getBoundingClientRect(),x=rect.left-navRect.left,y=rect.top-navRect.top;if(!indicatorReady||reduced){indicator.style.width=rect.width+'px';indicator.style.height=rect.height+'px';indicator.style.transform='translate3d('+x+'px,'+y+'px,0)';indicatorReady=true;indicator.classList.add('is-ready');return}indicator.style.width=rect.width+'px';indicator.style.height=rect.height+'px';indicator.style.transform='translate3d('+x+'px,'+y+'px,0)';}
var navDrag=null;
function navItemAt(x,y){var el=document.elementFromPoint(x,y);return el&&el.closest?el.closest('.global-nav-item[data-nav]'):null}
nav.addEventListener('pointerdown',function(e){if(e.button!==0&&e.button!==2)return;var item=e.target.closest('.global-nav-item[data-nav]');if(!item)return;navDrag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,origin:items.find(function(i){return i.classList.contains('active')})||item,target:item};indicator.classList.add('is-dragging');});
window.addEventListener('pointermove',function(e){if(!navDrag||e.pointerId!==navDrag.pointerId)return;if(Math.hypot(e.clientX-navDrag.startX,e.clientY-navDrag.startY)>7)navDrag.moved=true;if(!navDrag.moved)return;var target=navItemAt(e.clientX,e.clientY);if(target){navDrag.target=target;moveIndicator(target)}else{navDrag.target=null;moveIndicator(navDrag.origin)}});
window.addEventListener('pointerup',function(e){if(!navDrag||e.pointerId!==navDrag.pointerId)return;var drag=navDrag;navDrag=null;indicator.classList.remove('is-dragging');if(!drag.moved){moveIndicator(drag.origin);return}var target=navItemAt(e.clientX,e.clientY);if(target){if(target.matches('a[href]')){setActive(target.dataset.nav);window.location.href=target.href}else if(target.classList.contains('global-more-toggle')){openMenu()}}else{setActive(drag.origin.dataset.nav)}});
window.addEventListener('pointercancel',function(){if(!navDrag)return;var origin=navDrag.origin;navDrag=null;indicator.classList.remove('is-dragging');setActive(origin.dataset.nav)});
nav.addEventListener('contextmenu',function(e){if(e.target.closest('.global-nav-item'))e.preventDefault()});
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