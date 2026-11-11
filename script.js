(() => {
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
if(window.VanillaTilt){VanillaTilt.init(document.querySelectorAll('.info-card,.resume-panel,.project-card,.contact-card'),{max:6,speed:500,scale:1.015,gyroscope:true,gyroscopeMinAngleX:-25,gyroscopeMaxAngleX:25,gyroscopeMinAngleY:-25,gyroscopeMaxAngleY:25});}
// GPU fluid smoke: browser-side WebGL simulation (works on static Vercel hosting).
const fogCanvas=document.getElementById('fog-canvas');
const startFluidFog=()=>{
 if(!fogCanvas){console.warn('Fluid canvas #fog-canvas is missing');return;}
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(typeof window.WebGLFluid!=='function'){console.warn('WebGLFluid library did not load');return;}
 try{
  const mobile=window.matchMedia('(max-width: 760px)').matches;
  window.WebGLFluid(fogCanvas,{
   TRIGGER:'hover',
   IMMEDIATE:true,
   AUTO:true,
   INTERVAL:3200,
   SIM_RESOLUTION:mobile?64:128,
   DYE_RESOLUTION:mobile?384:768,
   DENSITY_DISSIPATION:0.97,
   VELOCITY_DISSIPATION:0.42,
   PRESSURE:0.82,
   PRESSURE_ITERATIONS:18,
   CURL:32,
   SPLAT_RADIUS:0.28,
   SPLAT_FORCE:5200,
   SPLAT_COUNT:2,
   SPLAT_COLOR:{r:0.22,g:0.31,b:0.82},
   COLORFUL:false,
   SHADING:true,
   COLOR_UPDATE_SPEED:0,
   TRANSPARENT:true,
   BACK_COLOR:{r:0,g:0,b:0},
   BLOOM:true,
   BLOOM_ITERATIONS:6,
   BLOOM_RESOLUTION:mobile?128:256,
   BLOOM_INTENSITY:0.48,
   BLOOM_THRESHOLD:0.18,
   BLOOM_SOFT_KNEE:0.7,
   SUNRAYS:false
  });
  // The canvas is intentionally pointer-events:none so links remain clickable.
  // Forward real document pointer movement to the fluid engine's canvas listener.
  let pointerInside=false,lastX=-1,lastY=-1;
  const forwardPointer=event=>{
   const x=event.clientX,y=event.clientY;
   if(x<0||y<0||x>window.innerWidth||y>window.innerHeight)return;
   if(!pointerInside){
    pointerInside=true;
    fogCanvas.dispatchEvent(new MouseEvent('mouseenter',{clientX:x,clientY:y,bubbles:false}));
   }
   if(Math.abs(x-lastX)+Math.abs(y-lastY)<1.5)return;
   lastX=x;lastY=y;
   fogCanvas.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y,bubbles:true,view:window}));
  };
  document.addEventListener('pointermove',forwardPointer,{passive:true});
  window.addEventListener('blur',()=>{pointerInside=false;lastX=lastY=-1;});
  document.documentElement.classList.add('fluid-fog-ready');
 }catch(error){console.error('Fluid WebGL initialization failed:',error)}
};
if(window.WebGLFluid)startFluidFog();
else window.addEventListener('load',startFluidFog,{once:true});
// Reliable mobile navigation: click-to-scroll plus scroll-position-based active state.
const nav=[...document.querySelectorAll('.mobile-nav a, .desktop-nav a')];
const navBars=[...document.querySelectorAll('.mobile-nav,.desktop-nav')];
const moveNavIndicator=bar=>{
 const indicator=bar.querySelector('.nav-indicator'),active=bar.querySelector('a.active');
 if(!indicator||!active)return;
 const barRect=bar.getBoundingClientRect(),linkRect=active.getBoundingClientRect();
 indicator.style.width=linkRect.width+'px';
 indicator.style.height=linkRect.height+'px';
 indicator.style.transform='translate3d('+(linkRect.left-barRect.left)+'px,'+(linkRect.top-barRect.top)+'px,0)';
 indicator.classList.add('is-ready');
};
const syncNavIndicators=()=>navBars.forEach(moveNavIndicator);
const sections=['home','about','resume','projects','music','contact'].map(id=>document.getElementById(id)).filter(Boolean);
nav.forEach(link=>link.addEventListener('click',event=>{
 const target=document.querySelector(link.getAttribute('href'));
 if(!target)return;
 event.preventDefault();
 target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 history.replaceState(null,'',link.getAttribute('href'));
}));
let scrollTick=false;
const updateActive=()=>{
 const marker=window.scrollY+window.innerHeight*.42;
 let current=sections[0];
 for(const section of sections){if(section.offsetTop<=marker)current=section;}
 nav.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+current.id));
 syncNavIndicators();scrollTick=false;
};
window.addEventListener('scroll',()=>{if(!scrollTick){requestAnimationFrame(updateActive);scrollTick=true}},{passive:true});
window.addEventListener('resize',()=>{updateActive();syncNavIndicators()},{passive:true});updateActive();requestAnimationFrame(syncNavIndicators);

// Resolve visitor timezone from public IP; fall back to the device timezone if unavailable.
const timeEl=document.getElementById('visitor-time'),dateEl=document.getElementById('visitor-date');
let visitorZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
let visitorLocale=navigator.language||'en-IN';
const renderClock=()=>{
 const now=new Date();
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:visitorZone,hour:'2-digit',hourCycle:'h23'}).format(now));
 if(timeEl)timeEl.textContent=new Intl.DateTimeFormat(visitorLocale,{timeZone:visitorZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now);
 if(dateEl)dateEl.textContent=new Intl.DateTimeFormat(visitorLocale,{timeZone:visitorZone,weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);
 document.body.dataset.theme=(hour>=7&&hour<19)?'day':'night';
};
renderClock();setInterval(renderClock,1000);
fetch('https://ipapi.co/json/',{headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error('Timezone lookup unavailable');return r.json()}).then(info=>{
 if(info&&info.timezone){visitorZone=info.timezone;if(info.languages)visitorLocale=info.languages.split(',')[0];renderClock();}
}).catch(()=>renderClock());
const form=document.getElementById('contact-form'),status=document.getElementById('form-status'),button=form&&form.querySelector('button');
if(form)form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form).entries());if(data._honey)return;button.disabled=true;status.textContent='Sending your message…';try{const response=await fetch('https://formsubmit.co/ajax/md.saif2752@gmail.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...data,_subject:'New portfolio message from '+data.name,_template:'table'})});const result=await response.json();if(!response.ok||result.success===false)throw new Error(result.message||'Message could not be sent');form.reset();status.textContent='Message sent! Thanks for reaching out. I’ll get back to you soon.'}catch(error){status.textContent='Could not send right now. Please email md.saif2752@gmail.com directly.'}finally{button.disabled=false}});

// Simple YouTube Music link library. No embedded video player or audio extraction.
const musicList=document.getElementById('music-tracklist');
const musicCount=document.getElementById('music-count');
const loadMusicLinks=async()=>{
 if(!musicList)return;
 try{
  const response=await fetch('music/playlist.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Playlist unavailable');
  const data=await response.json();
  const tracks=Array.isArray(data.tracks)?data.tracks.filter(track=>track&&typeof track.url==='string'):[];
  musicList.innerHTML='';
  musicCount.textContent=String(tracks.length).padStart(2,'0')+' TRACKS';
  tracks.forEach((track,index)=>{
   let id='';
   try{const u=new URL(track.url);id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||'';}catch{}
   if(!id)return;
   const link=document.createElement('a');
   link.className='music-track';link.href='https://music.youtube.com/watch?v='+encodeURIComponent(id);
   link.target='_blank';link.rel='noopener noreferrer';
   const number=document.createElement('span');number.className='track-index';number.textContent=String(index+1).padStart(2,'0');
   const details=document.createElement('span');details.className='track-details';
   const title=document.createElement('strong');title.textContent='Track '+String(index+1).padStart(2,'0');
   const artist=document.createElement('small');artist.textContent='Listen on YouTube Music';
   details.append(title,artist);
   const action=document.createElement('span');action.className='track-state';action.textContent='↗';
   link.append(number,details,action);musicList.append(link);
  });
  if(!musicList.children.length)throw new Error('No valid tracks in playlist');
 }catch(error){musicCount.textContent='LIBRARY UNAVAILABLE';musicList.textContent='Could not load music/playlist.json';console.error(error);}
};
loadMusicLinks();

// Scroll reveal enters from the direction the visitor is moving.
const revealTargets=[...document.querySelectorAll('.hero,.about-section,.resume-section,.projects-section,.contact-section,.music-section')];
revealTargets.forEach(el=>el.classList.add('scroll-reveal'));
let previousScrollY=window.scrollY;
if('IntersectionObserver'in window){
 const revealObserver=new IntersectionObserver(entries=>{
  const movingDown=window.scrollY>=previousScrollY;previousScrollY=window.scrollY;
  entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.remove('reveal-from-up');if(!movingDown)entry.target.classList.add('reveal-from-up');requestAnimationFrame(()=>entry.target.classList.add('is-visible'))}
   else if(entry.boundingClientRect.top>0||entry.boundingClientRect.bottom<0){entry.target.classList.remove('is-visible')}
  });
 },{threshold:.08,rootMargin:'0px 0px -5% 0px'});
 revealTargets.forEach(el=>revealObserver.observe(el));
}else{revealTargets.forEach(el=>el.classList.add('is-visible'))}
})();