(function(){
'use strict';
if(document.querySelector('.global-glass-nav'))return;
var path=location.pathname.split('/').pop()||'index.html',isHome=path===''||path==='index.html';
var desktopLinks=[['home','Home','/'],['about','About','/'],['resume','Resume','/'],['projects','Projects','/'],['contact','Contact','/']];
var mobileLinks=[['home','Home','/'],['about','About','/'],['resume','Resume','/'],['projects','Projects','/'],['contact','Contact','/']];
var icons={home:'<svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z"/></svg>',about:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',resume:'<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6m-6 4h6"/></svg>',projects:'<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM8 7V4h8v3M4 11h16"/></svg>',contact:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',links:'<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1 0l2-2A5 5 0 0 0 12 4l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>',game:'<svg viewBox="0 0 24 24"><path d="M6 9h12a4 4 0 0 1 3.8 5.3l-1 3A2 2 0 0 1 17 18l-2-2H9l-2 2a2 2 0 0 1-3.8-.7l-1-3A4 4 0 0 1 6 9Z"/><path d="M7 12v4m-2-2h4m7-1h.01M18 15h.01"/></svg>',more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>'};
var nav=document.createElement('nav');nav.className='global-glass-nav';nav.setAttribute('aria-label','Primary navigation');
var html='<div class="global-nav-links desktop-nav-links">'+desktopLinks.map(function(a){return '<a class="global-nav-item" data-nav="'+a[0]+'" data-scroll-target="'+a[0]+'" href="'+a[2]+'">'+icons[a[0]]+'<span>'+a[1]+'</span></a>'}).join('')+'</div>';
html+='<div class="global-nav-links mobile-nav-links">'+mobileLinks.map(function(a){return '<a class="global-nav-item" data-nav="'+a[0]+'" href="'+a[2]+'">'+icons[a[0]]+'<span>'+a[1]+'</span></a>'}).join('')+'</div>';
html+='<div class="global-nav-more"><button class="global-nav-item global-more-toggle" type="button" data-nav="more" aria-label="More options" aria-expanded="false" aria-haspopup="true">'+icons.more+'</button><div class="global-more-menu" aria-label="More pages and appearance"><p class="global-menu-heading">MORE</p><a href="/music">Music</a><a href="/game">Game</a><a href="/calculator">Calculator</a><div class="global-menu-divider"></div><p class="global-menu-heading">APPEARANCE</p><div class="global-theme-options" role="group" aria-label="Appearance options"></div></div></div>'
nav.innerHTML=html;
var indicator=document.createElement('span');indicator.className='global-nav-indicator';indicator.setAttribute('aria-hidden','true');nav.insertBefore(indicator,nav.firstChild);document.body.appendChild(nav);
var more=nav.querySelector('.global-nav-more'),toggle=nav.querySelector('.global-more-toggle'),menu=nav.querySelector('.global-more-menu'),themeOptions=nav.querySelector('.global-theme-options'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var desktopQuery=window.matchMedia('(min-width: 761px)');
function links(){return Array.from(nav.querySelectorAll((desktopQuery.matches?'.desktop-nav-links':'.mobile-nav-links')+' .global-nav-item'))}
function currentKey(){if(!isHome){if(location.hash==='#projects')return 'projects';if(path==='projects.html')return 'projects';if(path==='index.html'&&location.hash==='#resume')return 'resume';return 'more'}var h=location.hash.slice(1);return h==='about'?'about':h==='resume'?'resume':h==='projects'?'projects':h==='contact'?'contact':'home'}
var activeKey=currentKey(),indicatorReady=false;
function moveIndicator(item,instant){if(!item)return;var nr=nav.getBoundingClientRect(),r=item.getBoundingClientRect(),x=r.left-nr.left,y=r.top-nr.top;indicator.style.width=r.width+'px';indicator.style.height=r.height+'px';indicator.style.transform='translate3d('+x+'px,'+y+'px,0)';if(!indicatorReady||instant||reduced){indicator.style.transition='none';indicatorReady=true;indicator.classList.add('is-ready');requestAnimationFrame(function(){indicator.style.removeProperty('transition')})}else indicator.classList.add('is-ready')}
function activeItem(){return links().find(function(a){return a.dataset.nav===activeKey})||nav.querySelector('.global-more-toggle')}
function setActive(key){activeKey=key;var all=Array.from(nav.querySelectorAll('.global-nav-item'));all.forEach(function(a){var active=a.dataset.nav===key;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});moveIndicator(activeItem())}
function hoverItem(item){if(!item)return;moveIndicator(item)}
nav.addEventListener('pointerover',function(e){if(e.pointerType==='touch')return;var item=e.target.closest('.global-nav-item');if(item&&nav.contains(item))hoverItem(item)});
nav.addEventListener('pointerleave',function(){if(!navDrag)moveIndicator(activeItem())});
var navDrag=null;
function itemAt(x,y){var el=document.elementFromPoint(x,y);return el&&el.closest?el.closest('.global-nav-item'):null}
function scrollToSection(key){
 if(location.pathname!=='/'&&location.pathname!=='/index.html'){try{sessionStorage.setItem('saif-scroll-target',key)}catch(e){}location.href='/';return}
 var section=document.getElementById(key);if(!section)return;
 history.replaceState(null,'','/');
 section.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
 activeKey=key;setActive(key);closeMenu();
}
function activateDragged(item){
 if(!item)return;
 if(item.dataset.scrollTarget){scrollToSection(item.dataset.scrollTarget);return}
 var href=item.getAttribute('href');if(!href){if(item===toggle)openMenu();return}
 location.href=new URL(href,location.href).href;
}
nav.addEventListener('pointerdown',function(e){
 if(e.button!==0||e.pointerType==='touch')return;
 var item=e.target.closest('.global-nav-item');if(!item)return;
 navDrag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,origin:activeItem(),target:item};
 indicator.classList.add('is-dragging');
});
window.addEventListener('pointermove',function(e){
 if(!navDrag||e.pointerId!==navDrag.pointerId)return;
 if(Math.hypot(e.clientX-navDrag.startX,e.clientY-navDrag.startY)>6)navDrag.moved=true;
 if(!navDrag.moved)return;
 var item=itemAt(e.clientX,e.clientY);
 if(item&&nav.contains(item)){navDrag.target=item;moveIndicator(item)}
 else{navDrag.target=null;moveIndicator(navDrag.origin)}
},{passive:true});
window.addEventListener('pointerup',function(e){
 if(!navDrag||e.pointerId!==navDrag.pointerId)return;
 var drag=navDrag;navDrag=null;indicator.classList.remove('is-dragging');
 if(!drag.moved){moveIndicator(activeItem());return}
 var target=itemAt(e.clientX,e.clientY);
 if(target&&nav.contains(target))activateDragged(target);
 else moveIndicator(drag.origin);
},true);
window.addEventListener('pointercancel',function(){
 if(!navDrag)return;var origin=navDrag.origin;navDrag=null;indicator.classList.remove('is-dragging');moveIndicator(origin)
});
nav.addEventListener('focusin',function(e){var item=e.target.closest('.global-nav-item');if(item)moveIndicator(item)});
nav.addEventListener('focusout',function(e){if(!nav.contains(e.relatedTarget))moveIndicator(activeItem())});
function refreshThemeOptions(){var mode=window.SiteTheme?window.SiteTheme.getMode():'auto',hour=new Date().getHours(),night=hour>=19||hour<7,forced=night?'day':'night',label=night?'Force day mode':'Force night mode',symbol=night?'☀':'☾';themeOptions.innerHTML='<button type="button" data-theme-mode="auto" class="'+(mode==='auto'?'selected':'')+'" aria-pressed="'+(mode==='auto'?'true':'false')+'"><span>◐</span> Auto</button><button type="button" data-theme-mode="'+forced+'" class="'+(mode===forced?'selected':'')+'" aria-pressed="'+(mode===forced?'true':'false')+'"><span>'+symbol+'</span> '+label+'</button>'}
function closeMenu(){more.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
function openMenu(){more.classList.add('open');toggle.setAttribute('aria-expanded','true');refreshThemeOptions();moveIndicator(toggle)}
toggle.addEventListener('click',function(){if(more.classList.contains('open')){closeMenu();moveIndicator(activeItem())}else openMenu()});
themeOptions.addEventListener('click',function(e){var b=e.target.closest('[data-theme-mode]');if(!b)return;if(window.SiteTheme)window.SiteTheme.setMode(b.dataset.themeMode);refreshThemeOptions();closeMenu();moveIndicator(activeItem())});
menu.querySelectorAll('a[href]').forEach(function(a){a.addEventListener('click',function(e){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();var dest=a.href;closeMenu();document.body.classList.add('global-page-leaving');window.setTimeout(function(){location.href=dest},210)})});
nav.addEventListener('click',function(e){var a=e.target.closest('.global-nav-item[href]');if(!a)return;if(a.dataset.scrollTarget){e.preventDefault();scrollToSection(a.dataset.scrollTarget);return}activeKey=a.dataset.nav;closeMenu();});
document.addEventListener('click',function(e){if(!e.target.closest('.global-nav-more'))closeMenu()});
document.addEventListener('click',function(e){var a=e.target.closest('a[data-scroll-target]');if(!a||nav.contains(a))return;e.preventDefault();scrollToSection(a.dataset.scrollTarget)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&more.classList.contains('open')){closeMenu();moveIndicator(activeItem());toggle.focus()}});
window.addEventListener('site-theme-change',refreshThemeOptions);
window.addEventListener('resize',function(){var item=activeItem();moveIndicator(item,true)},{passive:true});
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',function(){setActive(activeKey)});else desktopQuery.addListener(function(){setActive(activeKey)});
try{var pending=sessionStorage.getItem('saif-scroll-target');if(pending){sessionStorage.removeItem('saif-scroll-target');window.addEventListener('load',function(){var target=document.getElementById(pending);if(target){target.scrollIntoView({behavior:'auto',block:'start'});activeKey=pending;setActive(activeKey)}},{once:true})}}catch(e){}
document.body.classList.add('global-page-enter');
document.body.addEventListener('animationend',function(e){if(e.animationName==='globalPageEnter')document.body.classList.remove('global-page-enter')});
setActive(activeKey);refreshThemeOptions();
if(isHome){var ids=['home','about','resume','projects','contact'].map(function(id){return document.getElementById(id)}).filter(Boolean),queued=false;function updateScroll(){if(location.hash&&location.hash!=='#home')return;var marker=window.scrollY+Math.min(window.innerHeight*.36,260),cur=ids[0];ids.forEach(function(s){if(s.offsetTop<=marker)cur=s});var key=cur.id;activeKey=key;setActive(activeKey)}window.addEventListener('scroll',function(){if(!queued){queued=true;requestAnimationFrame(function(){updateScroll();queued=false})}},{passive:true});window.addEventListener('hashchange',function(){setActive(currentKey())});window.addEventListener('load',updateScroll,{once:true});updateScroll()}
})();