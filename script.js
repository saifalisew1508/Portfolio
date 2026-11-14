(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
const year=$('#year'); if(year)year.textContent=String(new Date().getFullYear());

if(!reduced&&window.VanillaTilt){try{VanillaTilt.init($$('.info-card,.resume-panel,.project-card,.contact-card'),{max:6,speed:500,scale:1.015,gyroscope:true,gyroscopeMinAngleX:-25,gyroscopeMaxAngleX:25,gyroscopeMinAngleY:-25,gyroscopeMaxAngleY:25});}catch(e){console.warn('Tilt unavailable',e);}}

// Animated WebGL fog on desktop and mobile, with a lower simulation cost on phones.
const fog=$('#fog-canvas');
const startFog=()=>{if(!fog||reduced||typeof window.WebGLFluid!=='function')return;try{
 const mobile=matchMedia('(max-width:760px)').matches||coarse;
 window.WebGLFluid(fog,{TRIGGER:'hover',IMMEDIATE:true,AUTO:true,INTERVAL:mobile?4200:3200,SIM_RESOLUTION:mobile?64:128,DYE_RESOLUTION:mobile?384:768,DENSITY_DISSIPATION:.97,VELOCITY_DISSIPATION:.42,PRESSURE:.82,PRESSURE_ITERATIONS:18,CURL:32,SPLAT_RADIUS:.28,SPLAT_FORCE:mobile?3600:5200,SPLAT_COUNT:mobile?1:2,SPLAT_COLOR:{r:.22,g:.31,b:.82},COLORFUL:false,SHADING:true,COLOR_UPDATE_SPEED:0,TRANSPARENT:true,BACK_COLOR:{r:0,g:0,b:0},BLOOM:!mobile,BLOOM_ITERATIONS:6,BLOOM_RESOLUTION:mobile?128:256,BLOOM_INTENSITY:.48,BLOOM_THRESHOLD:.18,BLOOM_SOFT_KNEE:.7,SUNRAYS:false});
 let inside=false,lastX=-1,lastY=-1;const forwardPointer=e=>{const x=e.clientX,y=e.clientY;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>innerWidth||y>innerHeight)return;if(!inside){inside=true;fog.dispatchEvent(new MouseEvent('mouseenter',{clientX:x,clientY:y,bubbles:false}));}if(Math.abs(x-lastX)+Math.abs(y-lastY)<1.5)return;lastX=x;lastY=y;fog.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y,bubbles:true,view:window}));};
 document.addEventListener('pointermove',forwardPointer,{passive:true});addEventListener('blur',()=>{inside=false;lastX=lastY=-1;});document.documentElement.classList.add('fluid-fog-ready');
 }catch(e){console.warn('WebGL background unavailable',e);}};
if(!reduced){if(window.WebGLFluid)startFog();else addEventListener('load',startFog,{once:true});}

// Navigation remains usable as ordinary anchor links if this script fails.
const links=$$('.mobile-nav > a,.desktop-nav > a'),bars=$$('.mobile-nav,.desktop-nav');
const sections=['home','about','resume','projects','music','contact'].map(id=>document.getElementById(id)).filter(Boolean);
const indicators=()=>bars.forEach(bar=>{const mark=$('.nav-indicator',bar),active=$('a.active',bar);if(!mark||!active)return;const b=bar.getBoundingClientRect(),a=active.getBoundingClientRect();mark.style.width=a.width+'px';mark.style.height=a.height+'px';mark.style.transform='translate3d('+(a.left-b.left)+'px,'+(a.top-b.top)+'px,0)';mark.classList.add('is-ready');});
links.forEach(link=>link.addEventListener('click',e=>{const href=link.getAttribute('href');if(!href||href[0]!=='#')return;const target=document.getElementById(href.slice(1));if(!target)return;e.preventDefault();target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});history.replaceState(null,'',href);}));
let queued=false;const updateNav=()=>{const marker=scrollY+Math.min(innerHeight*.36,260);let current=sections[0];sections.forEach(s=>{if(s.offsetTop<=marker)current=s;});const activeId=(current.id==='projects'||current.id==='music')?'resume':current.id;links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+activeId));indicators();queued=false;};
addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateNav);}},{passive:true});addEventListener('resize',updateNav,{passive:true});addEventListener('load',updateNav,{once:true});updateNav();

// Accessible More dropdown; closes on outside click, Escape, or navigation.
$$('.more-toggle').forEach(button=>button.addEventListener('click',()=>{const parent=button.closest('.nav-more'),open=!parent.classList.contains('open');$$('.nav-more').forEach(item=>{item.classList.remove('open');$('.more-toggle',item).setAttribute('aria-expanded','false');});if(open){parent.classList.add('open');button.setAttribute('aria-expanded','true');}}));
document.addEventListener('click',event=>{if(!event.target.closest('.nav-more'))$('.nav-more').forEach(item=>{item.classList.remove('open');$('.more-toggle',item).setAttribute('aria-expanded','false');});});
document.addEventListener('keydown',event=>{if(event.key==='Escape')$('.nav-more').forEach(item=>{item.classList.remove('open');$('.more-toggle',item).setAttribute('aria-expanded','false');});});

// Visitor-local clock and automatic theme. The browser's IANA timezone follows the visitor's device settings; no IP lookup or fixed country timezone.
const time=$('#visitor-time'),date=$('#visitor-date'),locale=navigator.language||'en-US';
let visitorZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const renderClock=()=>{const now=new Date();visitorZone=Intl.DateTimeFormat().resolvedOptions().timeZone||visitorZone||'UTC';const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:visitorZone,hour:'2-digit',hourCycle:'h23'}).format(now));if(time)time.textContent=new Intl.DateTimeFormat(locale,{timeZone:visitorZone,hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);if(date)date.textContent=new Intl.DateTimeFormat(locale,{timeZone:visitorZone,weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZoneName:'short'}).format(now);document.body.dataset.theme=hour>=7&&hour<19?'day':'night';};
renderClock();setInterval(renderClock,1000);

// Contact form: timeout and JSON error handling prevent a stuck submit state.
const form=$('#contact-form'),status=$('#form-status'),submit=form&&$('button[type=submit]',form);
if(form)form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form).entries());if(data._honey)return;if(submit)submit.disabled=true;if(status)status.textContent='Sending your message…';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{
 const response=await fetch('https://formsubmit.co/ajax/md.saif2752@gmail.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name:data.name,email:data.email,message:data.message,_subject:'New portfolio message from '+data.name,_template:'table'}),signal:controller.signal});
 const result=await response.json().catch(()=>({}));if(!response.ok||result.success===false)throw new Error(result.message||'Message service error');form.reset();if(status)status.textContent='Message sent! Thanks for reaching out.';
 }catch(err){if(status)status.textContent=err.name==='AbortError'?'Request timed out. Please try again or email md.saif2752@gmail.com.':'Could not send right now. Please email md.saif2752@gmail.com directly.';}finally{clearTimeout(timeout);if(submit)submit.disabled=false;}});

// Wait for both the playlist and YouTube API; either may load first.
const list=$('#music-tracklist'),count=$('#music-count'),title=$('#music-current-title'),musicStatus=$('#music-player-status');
let tracks=[],activeIndex=-1,player=null,apiReady=!!(window.YT&&window.YT.Player),playerReady=false;
const setMusicStatus=m=>{if(musicStatus)musicStatus.textContent=m;};
const markTrack=()=>{if(list)$$('.music-track',list).forEach((el,i)=>{const active=i===activeIndex;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'true':'false');});if(title)title.textContent=activeIndex<0?'Choose a track':tracks[activeIndex].title||'Track '+String(activeIndex+1).padStart(2,'0');};
const playTrack=i=>{if(!tracks.length)return;activeIndex=(i+tracks.length)%tracks.length;markTrack();if(player&&playerReady){player.loadVideoById(tracks[activeIndex].id);setMusicStatus('Loading selected track…');}else setMusicStatus('Player is loading. Try again in a moment.');};
const createPlayer=()=>{const mount=$('#youtube-player');if(!apiReady||player||!mount||!tracks.length)return;player=new window.YT.Player('youtube-player',{width:'100%',height:'100%',videoId:tracks[0].id,playerVars:{enablejsapi:1,playsinline:1,controls:1,rel:0,origin:location.origin},events:{
 onReady:()=>{playerReady=true;setMusicStatus('Ready. Choose a track to play.');if(activeIndex>=0)playTrack(activeIndex);},
 onStateChange:e=>{const s=window.YT.PlayerState;if(e.data===s.PLAYING)setMusicStatus('Playing');else if(e.data===s.PAUSED)setMusicStatus('Paused');else if(e.data===s.BUFFERING)setMusicStatus('Buffering…');else if(e.data===s.ENDED)setMusicStatus('Track finished');},
 onError:e=>setMusicStatus('This video cannot be embedded (YouTube error '+e.data+'). Choose another track.')
 }});};
window.onYouTubeIframeAPIReady=()=>{apiReady=true;createPlayer();};
const renderTracks=()=>{if(!list)return;list.replaceChildren();tracks.forEach((track,i)=>{const b=document.createElement('button');b.type='button';b.className='music-track';b.setAttribute('aria-label','Play track '+(i+1));const n=document.createElement('span');n.className='track-index';n.textContent=String(i+1).padStart(2,'0');const d=document.createElement('span');d.className='track-details';const strong=document.createElement('strong');strong.textContent=track.title||'Track '+String(i+1).padStart(2,'0');const small=document.createElement('small');small.textContent='Play on this page';d.append(strong,small);const action=document.createElement('span');action.className='track-state';action.textContent='▶';b.append(n,d,action);b.addEventListener('click',()=>playTrack(i));list.append(b);});markTrack();};
const loadPlaylist=async()=>{if(!list)return;try{const response=await fetch('music/playlist.json',{cache:'no-store'});if(!response.ok)throw new Error('Playlist HTTP '+response.status);const data=await response.json();tracks=(Array.isArray(data.tracks)?data.tracks:[]).map(track=>{try{const url=new URL(track.url);if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname))return null;const id=url.hostname==='youtu.be'?url.pathname.split('/')[1]:(url.searchParams.get('v')||url.pathname.match(/\/embed\/([^/]+)/)?.[1]);return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?{id,title:typeof track.title==='string'?track.title:''}:null;}catch(_){return null;}}).filter(Boolean);if(!tracks.length)throw new Error('No valid YouTube videos');if(count)count.textContent=String(tracks.length).padStart(2,'0')+' TRACKS';renderTracks();setMusicStatus('Select a track below to start playback.');createPlayer();}catch(err){if(count)count.textContent='LIBRARY UNAVAILABLE';list.textContent='Could not load the music library. Please try again later.';setMusicStatus('Music library could not be loaded.');console.warn('Playlist unavailable',err);}};
loadPlaylist();
if(!apiReady){const api=document.createElement('script');api.src='https://www.youtube.com/iframe_api';api.async=true;api.onerror=()=>setMusicStatus('YouTube player API could not load. Check your connection.');document.head.append(api);}else createPlayer();

// Progressive reveal only; no content is hidden if IntersectionObserver is unavailable.
const reveal=$$('.section-wrap',$('main')||document);
if('IntersectionObserver'in window&&!reduced){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('section-arrived');observer.unobserve(entry.target);}}),{threshold:.06,rootMargin:'0px 0px -8% 0px'});reveal.forEach(section=>observer.observe(section));}else reveal.forEach(section=>section.classList.add('section-arrived'));
const socials=$('.socials');if(socials&&'IntersectionObserver'in window&&!reduced){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){socials.classList.add('is-formed');observer.unobserve(socials);}}),{threshold:.15});observer.observe(socials);}else if(socials)socials.classList.add('is-formed');
})();