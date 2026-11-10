(() => {
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
if(window.VanillaTilt){VanillaTilt.init(document.querySelectorAll('.info-card,.resume-panel,.project-card,.contact-card'),{max:6,speed:500,scale:1.015,gyroscope:true,gyroscopeMinAngleX:-25,gyroscopeMaxAngleX:25,gyroscopeMinAngleY:-25,gyroscopeMaxAngleY:25});}
const canvas=document.getElementById('fog-canvas'),ctx=canvas&&canvas.getContext('2d');
if(canvas&&ctx&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
let w=0,h=0,dpr=1,points=[];
const resize=()=>{dpr=Math.min(window.devicePixelRatio||1,1.6);w=window.innerWidth;h=window.innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)};
resize();window.addEventListener('resize',resize,{passive:true});
const add=(x,y)=>{points.push({x,y,r:10,life:1,dx:(Math.random()-.5)*.65,dy:(Math.random()-.5)*.65,hue:Math.random()>.5?215:252});if(points.length>20)points.shift()};
let last=0;window.addEventListener('pointermove',e=>{const now=performance.now();if(now-last>24){add(e.clientX,e.clientY);last=now}},{passive:true});
window.addEventListener('pointerdown',e=>{for(let i=0;i<4;i++)add(e.clientX+(Math.random()-.5)*34,e.clientY+(Math.random()-.5)*34)},{passive:true});
const draw=()=>{ctx.clearRect(0,0,w,h);points=points.filter(p=>p.life>.015);for(const p of points){p.r+=.72;p.life*=.96;p.x+=p.dx;p.y+=p.dy;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2.6);g.addColorStop(0,'hsla('+p.hue+',100%,62%,'+(.13*p.life)+')');g.addColorStop(.32,'hsla('+p.hue+',95%,58%,'+(.055*p.life)+')');g.addColorStop(1,'hsla('+p.hue+',90%,48%,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.6,0,Math.PI*2);ctx.fill()}requestAnimationFrame(draw)};draw()
}
// Reliable mobile navigation: click-to-scroll plus scroll-position-based active state.
const nav=[...document.querySelectorAll('.mobile-nav a, .desktop-nav a')];
const navBars=[...document.querySelectorAll('.mobile-nav,.desktop-nav')];
const moveNavIndicator=bar=>{const indicator=bar.querySelector('.nav-indicator'),active=bar.querySelector('a.active');if(!indicator||!active)return;const barRect=bar.getBoundingClientRect(),linkRect=active.getBoundingClientRect();indicator.style.width=linkRect.width+'px';indicator.style.height=linkRect.height+'px';indicator.style.transform='translate3d('+(linkRect.left-barRect.left)+'px,'+(linkRect.top-barRect.top)+'px,0)';indicator.classList.add('is-ready')};
const syncNavIndicators=()=>navBars.forEach(moveNavIndicator);
const sections=['home','about','resume','projects','contact'].map(id=>document.getElementById(id)).filter(Boolean);
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

// Dynamic YouTube playlist loaded from music/playlist.json.
const player=document.getElementById('music-player');
const playBtn=document.getElementById('music-play');
const titleEl=document.getElementById('music-current-title');
const artistEl=document.getElementById('music-current-artist');
const extraMetaEl=document.getElementById('music-extra-meta');
const statusEl=document.getElementById('music-status');
const trackList=document.getElementById('music-tracklist');
const countEl=document.getElementById('music-count');
const albumArtEl=document.getElementById('music-album-art');
let tracks=[],activeTrack=0,ytPlayer=null,ytReady=false;
const renderTrackList=()=>{
 trackList.innerHTML='';
 countEl.textContent=String(tracks.length).padStart(2,'0')+' TRACKS';
 tracks.forEach((track,index)=>{
  const button=document.createElement('button');button.type='button';button.className='music-track'+(index===activeTrack?' active':'');button.setAttribute('role','listitem');
  const number=document.createElement('span');number.className='track-index';number.textContent=String(index+1).padStart(2,'0');
  const details=document.createElement('span');details.className='track-details';
  const title=document.createElement('strong');title.textContent=track.title;
  const artist=document.createElement('small');artist.textContent=track.artist||'Artist not listed';
  const meta=document.createElement('small');meta.className='track-meta-extra';meta.textContent=[track.album,track.genre].filter(Boolean).join(' · ')||'Album / genre unavailable';
  details.append(title,artist,meta);
  const state=document.createElement('span');state.className='track-state';state.textContent=index===activeTrack?'♫':'▶';
  button.append(number,details,state);button.addEventListener('click',()=>selectTrack(index,true));trackList.append(button);
 });
};
const updatePlayingState=playing=>{
 player.classList.toggle('is-playing',playing);playBtn.textContent=playing?'Ⅱ':'▶';
 playBtn.setAttribute('aria-label',playing?'Pause music':'Play music');
 statusEl.textContent=playing?'NOW PLAYING':'PAUSED';
};
const selectTrack=(index,autoplay)=>{
 if(!tracks.length)return;
 activeTrack=(index+tracks.length)%tracks.length;const track=tracks[activeTrack];
 titleEl.textContent=track.title;artistEl.textContent=track.artist||'Artist not listed';
 extraMetaEl.textContent=[track.album,track.genre].filter(Boolean).join(' · ')||'Album / genre unavailable';
 albumArtEl.style.backgroundImage='url("https://i.ytimg.com/vi/'+track.videoId+'/hqdefault.jpg")';
 albumArtEl.classList.add('has-art');albumArtEl.textContent='';
 [...trackList.querySelectorAll('.music-track')].forEach((button,i)=>{button.classList.toggle('active',i===activeTrack);button.querySelector('.track-state').textContent=i===activeTrack?'♫':'▶'});
 if(ytReady&&ytPlayer){ytPlayer.loadVideoById(track.videoId);if(!autoplay)ytPlayer.pauseVideo()}
 else statusEl.textContent='LOADING YOUTUBE PLAYER';
};
playBtn.addEventListener('click',()=>{
 if(!tracks.length)return;
 if(!ytReady||!ytPlayer){statusEl.textContent='YOUTUBE PLAYER LOADING';return}
 const state=ytPlayer.getPlayerState();
 if(state===1)ytPlayer.pauseVideo();else if(state===2)ytPlayer.playVideo();else ytPlayer.playVideo();
});
document.getElementById('music-prev').addEventListener('click',()=>selectTrack(activeTrack-1,true));
document.getElementById('music-next').addEventListener('click',()=>selectTrack(activeTrack+1,true));
const loadPlaylist=async()=>{
 try{
  const response=await fetch('music/playlist.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Playlist JSON unavailable');
  const data=await response.json();
  tracks=Array.isArray(data.tracks)?data.tracks.filter(t=>t.videoId):[];
  if(!tracks.length)throw new Error('Playlist is empty');
  renderTrackList();selectTrack(0,false);statusEl.textContent='LIBRARY READY';
 }catch(error){countEl.textContent='LIBRARY OFFLINE';trackList.textContent='Could not load music/playlist.json';statusEl.textContent='LIBRARY UNAVAILABLE'}
};
window.onYouTubeIframeAPIReady=()=>{
 ytPlayer=new YT.Player('youtube-player',{width:'100%',height:'100%',videoId:tracks[activeTrack]?.videoId||'',playerVars:{playsinline:1,rel:0,modestbranding:1,origin:window.location.origin},events:{
  onReady:()=>{ytReady=true;if(tracks.length){ytPlayer.cueVideoById(tracks[activeTrack].videoId);statusEl.textContent='READY TO PLAY'}},
  onStateChange:event=>{if(event.data===YT.PlayerState.PLAYING)updatePlayingState(true);else if(event.data===YT.PlayerState.PAUSED||event.data===YT.PlayerState.ENDED)updatePlayingState(false);if(event.data===YT.PlayerState.ENDED)selectTrack(activeTrack+1,true)},
  onError:()=>{statusEl.textContent='VIDEO UNAVAILABLE'}
 }});
};
const ytScript=document.createElement('script');ytScript.src='https://www.youtube.com/iframe_api';document.head.appendChild(ytScript);
loadPlaylist();

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