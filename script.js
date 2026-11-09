(() => {
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
if(window.VanillaTilt){VanillaTilt.init(document.querySelectorAll('[data-tilt]'));}
const canvas=document.getElementById('fog-canvas'),ctx=canvas&&canvas.getContext('2d');
if(canvas&&ctx&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
let w=0,h=0,dpr=1,points=[];
const resize=()=>{dpr=Math.min(window.devicePixelRatio||1,1.6);w=window.innerWidth;h=window.innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)};
resize();window.addEventListener('resize',resize,{passive:true});
const add=(x,y)=>{points.push({x,y,r:12,life:1,dx:(Math.random()-.5)*.45,dy:(Math.random()-.5)*.45,hue:Math.random()>.5?220:252});if(points.length>28)points.shift()};
let last=0;window.addEventListener('pointermove',e=>{const now=performance.now();if(now-last>24){add(e.clientX,e.clientY);last=now}},{passive:true});
window.addEventListener('pointerdown',e=>{for(let i=0;i<4;i++)add(e.clientX+(Math.random()-.5)*34,e.clientY+(Math.random()-.5)*34)},{passive:true});
const draw=()=>{ctx.clearRect(0,0,w,h);points=points.filter(p=>p.life>.015);for(const p of points){p.r+=.72;p.life*=.974;p.x+=p.dx;p.y+=p.dy;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3.4);g.addColorStop(0,'hsla('+p.hue+',95%,67%,'+(.105*p.life)+')');g.addColorStop(.38,'hsla('+p.hue+',90%,55%,'+(.045*p.life)+')');g.addColorStop(1,'hsla('+p.hue+',90%,45%,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r*3.4,0,Math.PI*2);ctx.fill()}requestAnimationFrame(draw)};draw()
}
// Reliable mobile navigation: click-to-scroll plus scroll-position-based active state.
const nav=[...document.querySelectorAll('.mobile-nav a')];
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
 scrollTick=false;
};
window.addEventListener('scroll',()=>{if(!scrollTick){requestAnimationFrame(updateActive);scrollTick=true}},{passive:true});
window.addEventListener('resize',updateActive,{passive:true});updateActive();

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
})();