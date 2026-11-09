(() => {
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();\nif(window.VanillaTilt){VanillaTilt.init(document.querySelectorAll('[data-tilt]'));}
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
const nav=[...document.querySelectorAll('.mobile-nav a')],sections=['home','about','resume','projects','contact'].map(id=>document.getElementById(id)).filter(Boolean);
if('IntersectionObserver'in window){const ob=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)nav.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id))}),{rootMargin:'-35% 0px -55% 0px'});sections.forEach(s=>ob.observe(s))}
const form=document.getElementById('contact-form'),status=document.getElementById('form-status'),button=form&&form.querySelector('button');
if(form)form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const data=Object.fromEntries(new FormData(form).entries());if(data._honey)return;button.disabled=true;status.textContent='Sending your message…';try{const response=await fetch('https://formsubmit.co/ajax/md.saif2752@gmail.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...data,_subject:'New portfolio message from '+data.name,_template:'table'})});const result=await response.json();if(!response.ok||result.success===false)throw new Error(result.message||'Message could not be sent');form.reset();status.textContent='Message sent! Thanks for reaching out. I’ll get back to you soon.'}catch(error){status.textContent='Could not send right now. Please email md.saif2752@gmail.com directly.'}finally{button.disabled=false}});
})();