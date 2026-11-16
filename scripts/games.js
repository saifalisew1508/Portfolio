(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
/* Visitor-local clock for the arcade header. */
(function(){
 var time=$('visitor-time'),date=$('visitor-date');
 if(!time)return;
 function tick(){
  var now=new Date(),zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  time.textContent=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now).toUpperCase();
  if(date){var day=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(now);var offset=Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'longOffset'}).formatToParts(now).find(function(part){return part.type==='timeZoneName'});date.textContent=day+', '+(offset?offset.value:'GMT').replace(/^GMT([+-])0(\\d)/,'GMT$1$2');}
 }
 tick();window.setInterval(tick,1000);
})();
/* BUBBLE SHOOTER — responsive arcade engine */
var canvas=$('bubble-canvas'),ctx=canvas.getContext('2d'),cols=['#ff6488','#55d6ef','#a78bfa','#f8c65b','#62dc9b'],R=21,grid=[],score=0,left=30,shot=0,aim={x:360,y:160},shooter={x:360,y:710},current=0,next=1;
var bubbleModes={rookie:{rows:5,shots:38,pressure:8,label:'ROOKIE'},pro:{rows:6,shots:30,pressure:6,label:'PRO'},expert:{rows:7,shots:24,pressure:4,label:'EXPERT'}};
var bubbleMode='pro',combo=0,powerCharge=0,powerArmed=false,paused=false,gameEnded=false,soundEnabled=false,audioContext=null,particles=[],particleFrame=0;
var shotAnimating=false;var bestScore=0;try{bestScore=Number(localStorage.getItem('bubble-best-score')||0)}catch(e){}
function randColor(){return Math.floor(Math.random()*cols.length)}
function bubblePos(r,c){return {x:25+c*42+(r%2?21:0),y:25+r*36}}
function playBubbleTone(freq,duration){if(!soundEnabled)return;try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume();var osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.055,audioContext.currentTime+.012);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration+.02)}catch(e){}}
function updateBubbleHud(){
 $('bubble-score').textContent=score;$('bubble-left').textContent=left;$('bubble-best').textContent=bestScore;$('bubble-combo').textContent='×'+combo;$('bubble-next').textContent='●';$('bubble-next').style.color=cols[next];
 $('bubble-level-label').textContent=bubbleModes[bubbleMode].label+' MODE';$('bubble-stage-level').textContent=bubbleModes[bubbleMode].label+' / '+String(shot+1).padStart(2,'0');
 $('bubble-power-fill').style.width=(powerCharge/8*100)+'%';$('bubble-power-count').textContent=powerCharge>=8?'READY':powerCharge+'/8';$('bubble-power').disabled=powerCharge<8&&!powerArmed;$('bubble-power').classList.toggle('armed',powerArmed);$('bubble-power').setAttribute('aria-pressed',String(powerArmed));$('bubble-power').setAttribute('aria-label',powerCharge>=8?'Arm pulse power shot':'Pulse charge '+powerCharge+' of 8');
}
function drawCircle(x,y,color,rad,glow){
 ctx.save();if(glow){ctx.shadowColor=cols[color];ctx.shadowBlur=glow}
 ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);var g=ctx.createRadialGradient(x-rad*.34,y-rad*.4,1,x,y,rad);g.addColorStop(0,'#ffffff');g.addColorStop(.17,cols[color]);g.addColorStop(.72,cols[color]);g.addColorStop(1,'#10182a');ctx.fillStyle=g;ctx.fill();ctx.lineWidth=1.8;ctx.strokeStyle=cols[color];ctx.stroke();
 ctx.shadowBlur=0;ctx.beginPath();ctx.ellipse(x-rad*.28,y-rad*.36,rad*.25,rad*.12,-.55,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.62)';ctx.fill();ctx.restore();
}
function drawBubble(){
 ctx.clearRect(0,0,720,760);var bg=ctx.createLinearGradient(0,0,0,760);bg.addColorStop(0,'#101f39');bg.addColorStop(.58,'#0a1427');bg.addColorStop(1,'#080f1e');ctx.fillStyle=bg;ctx.fillRect(0,0,720,760);
 for(var s=0;s<38;s++){var sx=(s*193+37)%720,sy=(s*127+51)%740;ctx.fillStyle='rgba(147,199,255,'+(s%3===0?'.32':'.13')+')';ctx.fillRect(sx,sy,2,2)}
 ctx.strokeStyle='rgba(105,180,233,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,260);ctx.lineTo(710,260);ctx.stroke();
 ctx.setLineDash([4,8]);ctx.strokeStyle='rgba(105,180,233,.12)';ctx.beginPath();ctx.moveTo(10,260);ctx.lineTo(10,735);ctx.moveTo(710,260);ctx.lineTo(710,735);ctx.stroke();ctx.setLineDash([]);
 for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c]>=0){var p=bubblePos(r,c);drawCircle(p.x,p.y,grid[r][c],R,2)}
 if(!paused&&!gameEnded){
  var dx=aim.x-shooter.x,dy=aim.y-shooter.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,rx=shooter.x,ry=shooter.y,remaining=620;
  for(var bounce=0;bounce<3&&remaining>0&&uy<-.015;bounce++){
   var wallT=ux<0?(R-rx)/ux:(ux>0?(720-R-rx)/ux:Infinity),topT=(R-ry)/uy,limit=Math.min(remaining,wallT>0?wallT:Infinity,topT>0?topT:Infinity),bubbleT=Infinity;
   for(var gr=0;gr<grid.length;gr++)for(var gc=0;gc<grid[gr].length;gc++)if(grid[gr][gc]>=0){var bp0=bubblePos(gr,gc),ox=rx-bp0.x,oy=ry-bp0.y,bb=2*(ox*ux+oy*uy),cc=ox*ox+oy*oy-(R*1.92)*(R*1.92),disc=bb*bb-4*cc;if(disc>=0){var tt=(-bb-Math.sqrt(disc))/2;if(tt>8&&tt<bubbleT)bubbleT=tt;}}
   if(bubbleT<limit)limit=bubbleT;for(var t=12;t<limit;t+=20){ctx.beginPath();ctx.arc(rx+ux*t,ry+uy*t,2.3,0,Math.PI*2);ctx.fillStyle=powerArmed?'rgba(255,199,105,.82)':'rgba(173,222,255,.68)';ctx.fill();}
   var ex=rx+ux*limit,ey=ry+uy*limit;ctx.beginPath();ctx.arc(ex,ey,4,0,Math.PI*2);ctx.fillStyle='#a7e9ff';ctx.fill();remaining-=limit;
   if(bubbleT<=limit||topT<=wallT)break;rx=ex;ry=ey;ux=-ux;
  }
  ctx.beginPath();ctx.arc(aim.x,aim.y,6,0,Math.PI*2);ctx.strokeStyle=powerArmed?'#ffd27c':'#a7e9ff';ctx.lineWidth=1.5;ctx.stroke();
 }
 drawCircle(shooter.x,shooter.y,current,R,powerArmed?22:8);
 ctx.beginPath();ctx.arc(shooter.x,shooter.y+24,38,Math.PI,Math.PI*2);ctx.strokeStyle='rgba(124,185,255,.24)';ctx.lineWidth=5;ctx.stroke();
 drawCircle(665,710,next,14,5);ctx.fillStyle='#91a9cc';ctx.font='10px monospace';ctx.fillText('NEXT',648,677);
 particles.forEach(function(p){ctx.save();ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore()});
 if(paused||gameEnded){ctx.fillStyle='rgba(4,9,20,.7)';ctx.fillRect(0,0,720,760);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 34px sans-serif';ctx.fillText(paused?'PAUSED':(left>0?'FIELD CLEARED':'SESSION OVER'),360,350);ctx.fillStyle='#a9c4e9';ctx.font='15px monospace';ctx.fillText(paused?'Resume when you are ready':(left>0?'Excellent run. Start another round.':'Restart to try again.'),360,383);ctx.textAlign='start'}
 updateBubbleHud();
}
function animateBubbleParticles(){if(particleFrame)return;particleFrame=requestAnimationFrame(function step(){particles.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life-=.025});particles=particles.filter(function(p){return p.life>0});drawBubble();if(particles.length)particleFrame=requestAnimationFrame(step);else particleFrame=0})}
function burstBubble(x,y,color,count){for(var i=0;i<count;i++){var a=Math.random()*Math.PI*2,speed=1+Math.random()*4;particles.push({x:x,y:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-1,life:.7+Math.random()*.3,size:2+Math.random()*3,color:cols[color]})}animateBubbleParticles()}
function resetBubble(){
 var mode=bubbleModes[bubbleMode];grid=[];for(var r=0;r<10;r++){grid[r]=[];for(var c=0;c<16-(r%2);c++)grid[r][c]=r<mode.rows?randColor():-1}
 score=0;left=mode.shots;shot=0;combo=0;powerCharge=0;powerArmed=false;paused=false;gameEnded=false;particles=[];aim={x:360,y:160};current=randColor();next=randColor();
 $('bubble-status').textContent='Ready. Drag to aim, then release to fire.';$('bubble-pause').innerHTML='<span>Ⅱ</span> Pause';$('bubble-pause').setAttribute('aria-pressed','false');$('bubble-tip').textContent='Aim at matching clusters. Floating bubbles drop for bonus points.';drawBubble();
}
function neighbors(r,c){var d=r%2===0?[[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]]:[[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];return d.map(function(v){return[r+v[0],c+v[1]]})}
function connected(r,c,color,seen){var k=r+','+c;if(seen[k]||!grid[r]||grid[r][c]!==color)return[];seen[k]=1;var out=[[r,c]];neighbors(r,c).forEach(function(n){out=out.concat(connected(n[0],n[1],color,seen))});return out}
function dropFloating(){var seen={},stack=[];for(var c=0;c<grid[0].length;c++)if(grid[0][c]>=0)stack.push([0,c]);while(stack.length){var a=stack.pop(),k=a.join(',');if(seen[k]||!grid[a[0]]||grid[a[0]][a[1]]<0)continue;seen[k]=1;neighbors(a[0],a[1]).forEach(function(n){if(grid[n[0]]&&grid[n[0]][n[1]]>=0)stack.push(n)})}var dropped=0;grid.forEach(function(row,r){row.forEach(function(v,c){if(v>=0&&!seen[r+','+c]){grid[r][c]=-1;dropped++}})});score+=dropped*20;return dropped}
function saveBubbleBest(){if(score>bestScore){bestScore=score;try{localStorage.setItem('bubble-best-score',String(bestScore))}catch(e){}}}
function endBubble(won){gameEnded=true;paused=false;saveBubbleBest();$('bubble-status').textContent=won?'You cleared the field! New personal-best potential unlocked.':'Out of shots. Try a different angle next run.';playBubbleTone(won?880:190,.22);drawBubble()}
function animateBubbleProjectile(target,color,done){
 shotAnimating=true;var start={x:shooter.x,y:shooter.y},began=performance.now(),duration=270;
 function frame(now){var t=Math.min(1,(now-began)/duration),ease=1-Math.pow(1-t,3);drawBubble();var x=start.x+(target.x-start.x)*ease,y=start.y+(target.y-start.y)*ease;drawCircle(x,y,color,R,14);if(t<1)requestAnimationFrame(frame);else{shotAnimating=false;done()}}
 requestAnimationFrame(frame);
}
function shoot(x,y){
 if(left<=0||paused||gameEnded||shotAnimating)return;var dx=x-shooter.x,dy=y-shooter.y;if(dy>-25)return;
 var hit=null,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,rx=shooter.x,ry=shooter.y,travel=0;
 for(var bounce=0;bounce<3&&travel<620;bounce++){
  var wallT=ux<0?(R-rx)/ux:(ux>0?(720-R-rx)/ux:Infinity),topT=(R-ry)/uy,limit=Math.min(wallT>0?wallT:Infinity,topT>0?topT:Infinity,620-travel),bubbleT=Infinity;
  for(var rr0=0;rr0<grid.length;rr0++)for(var cc0=0;cc0<grid[rr0].length;cc0++)if(grid[rr0][cc0]>=0){var bp=bubblePos(rr0,cc0),ox=rx-bp.x,oy=ry-bp.y,bb=2*(ox*ux+oy*uy),cc=ox*ox+oy*oy-(R*1.9)*(R*1.9),disc=bb*bb-4*cc;if(disc>=0){var tt=(-bb-Math.sqrt(disc))/2;if(tt>1&&tt<bubbleT)bubbleT=tt;}}
  if(bubbleT<limit)limit=bubbleT;hit={x:rx+ux*limit,y:ry+uy*limit};travel+=limit;
  if(bubbleT<=limit||topT<=wallT)break;rx=hit.x;ry=hit.y;ux=-ux;
 }
 if(!hit)hit={x:Math.max(R,Math.min(720-R,x)),y:Math.max(R,Math.min(680,y))};
 var best=null,dist=1e9;
 for(var rr=0;rr<grid.length;rr++)for(var cc=0;cc<grid[rr].length;cc++)if(grid[rr][cc]<0){var adjacent=neighbors(rr,cc).some(function(n){return grid[n[0]]&&grid[n[0]][n[1]]>=0});if(!adjacent)continue;var bp=bubblePos(rr,cc),dd=Math.hypot(bp.x-hit.x,bp.y-hit.y);if(dd<dist){dist=dd;best=[rr,cc]}}
 if(!best){var near=null,nd=Infinity;for(var ar=0;ar<grid.length;ar++)for(var ac=0;ac<grid[ar].length;ac++)if(grid[ar][ac]>=0){var ap=bubblePos(ar,ac),ad=Math.hypot(ap.x-hit.x,ap.y-hit.y);if(ad<nd){nd=ad;near=[ar,ac]}}if(near)neighbors(near[0],near[1]).forEach(function(n){if(grid[n[0]]&&n[1]>=0&&n[1]<grid[n[0]].length&&grid[n[0]][n[1]]<0){var np=bubblePos(n[0],n[1]),dd=Math.hypot(np.x-hit.x,np.y-hit.y);if(dd<dist){dist=dd;best=n}}})}
 if(!best){$('bubble-status').textContent='No free landing slot. Try another angle.';drawBubble();return;}
 if(!best)return;var landing=bubblePos(best[0],best[1]),shotColor=current;animateBubbleProjectile(landing,shotColor,function(){grid[best[0]][best[1]]=shotColor;var impact=bubblePos(best[0],best[1]),cleared=0,popped=[];
 if(powerArmed&&powerCharge>=8){for(var pr=0;pr<grid.length;pr++)for(var pc=0;pc<grid[pr].length;pc++)if(grid[pr][pc]>=0){var pp=bubblePos(pr,pc);if(Math.hypot(pp.x-impact.x,pp.y-impact.y)<=R*2.55){popped.push([pr,pc,grid[pr][pc]]);grid[pr][pc]=-1;cleared++}}score+=cleared*25;powerCharge=0;powerArmed=false;combo=0;$('bubble-status').textContent='PULSE HIT! '+cleared+' bubbles cleared.';playBubbleTone(720,.16)}
 else{var group=connected(best[0],best[1],current,{});if(group.length>=3){group.forEach(function(a){popped.push([a[0],a[1],grid[a[0]][a[1]]]);grid[a[0]][a[1]]=-1});cleared=group.length;combo++;score+=cleared*10*(1+Math.min(combo-1,5)*.25);powerCharge=Math.min(8,powerCharge+cleared);$('bubble-status').textContent=(combo>1?'COMBO ×'+combo+'! ':'Nice shot! ')+cleared+' bubbles popped.';$('bubble-tip').textContent=combo>1?'Keep the chain alive to build your score multiplier.':'Every clear charges your Pulse shot.';playBubbleTone(430+Math.min(combo,5)*85,.12)}
 else{combo=0;$('bubble-status').textContent='No match. Reposition for the next shot.';playBubbleTone(240,.08)}}
 popped.forEach(function(a){var p=bubblePos(a[0],a[1]);burstBubble(p.x,p.y,a[2],5)});
 var dropped=dropFloating();if(dropped){$('bubble-status').textContent+=' '+dropped+' floating bubbles dropped!';playBubbleTone(660,.14)}
 left--;shot++;saveBubbleBest();
 if(grid.every(function(row){return row.every(function(v){return v<0})})){endBubble(true);return}
 if(shot%bubbleModes[bubbleMode].pressure===0&&left>0){var row=[];for(var z=0;z<16;z++)row.push(randColor());grid.unshift(row);grid.pop();$('bubble-status').textContent='Ceiling advanced. Keep moving!';if(grid.some(function(line,r){return line.some(function(v){return v>=0&&bubblePos(r,0).y>=shooter.y-95})})){endBubble(false);return}}
 if(left<=0){endBubble(false);return}
 current=next;next=randColor();drawBubble();
 });
}
var aiming=false,activePointer=null,aimOrigin=null,aimStartedAt=0,aimMoved=false;
function updateAim(e){var b=canvas.getBoundingClientRect();aim={x:(e.clientX-b.left)*720/b.width,y:(e.clientY-b.top)*760/b.height};if(aimOrigin&&Math.hypot(e.clientX-aimOrigin.x,e.clientY-aimOrigin.y)>7)aimMoved=true;if(aim.y>=shooter.y-20)aim.y=shooter.y-21;drawBubble()}
canvas.addEventListener('pointermove',function(e){if(aiming&&activePointer!==e.pointerId)return;if(!paused&&!gameEnded)updateAim(e)});
canvas.addEventListener('pointerdown',function(e){if(paused||gameEnded||left<=0)return;if(e.button!==undefined&&e.button!==0)return;e.preventDefault();aiming=true;activePointer=e.pointerId;aimOrigin={x:e.clientX,y:e.clientY};aimStartedAt=performance.now();aimMoved=false;if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);updateAim(e);$('bubble-status').textContent='Aiming… release to fire.'});
canvas.addEventListener('pointerup',function(e){if(!aiming||activePointer!==e.pointerId)return;updateAim(e);var deliberate=e.pointerType==='mouse'||aimMoved||(performance.now()-aimStartedAt)>=180;aiming=false;activePointer=null;aimOrigin=null;if(deliberate)shoot(aim.x,aim.y);else{$('bubble-status').textContent='Drag to aim before releasing.';drawBubble()}});
canvas.addEventListener('pointercancel',function(e){if(activePointer===e.pointerId){aiming=false;activePointer=null;aimOrigin=null;drawBubble()}});
$('bubble-new').onclick=function(){aiming=false;activePointer=null;aimOrigin=null;resetBubble()};
$('bubble-level').onchange=function(){bubbleMode=this.value;resetBubble()};
$('bubble-pause').onclick=function(){if(gameEnded)return;paused=!paused;aiming=false;activePointer=null;this.innerHTML=paused?'<span>▶</span> Resume':'<span>Ⅱ</span> Pause';this.setAttribute('aria-pressed',String(paused));$('bubble-status').textContent=paused?'Game paused. Take a breather.':'Back in the field. Aim your next shot.';drawBubble()};
$('bubble-sound').onclick=function(){soundEnabled=!soundEnabled;this.innerHTML=soundEnabled?'<span>♫</span> Sound on':'<span>♫</span> Sound off';this.setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)playBubbleTone(520,.1)};
$('bubble-power').onclick=function(){if(powerCharge<8)return;powerArmed=!powerArmed;$('bubble-status').textContent=powerArmed?'Pulse armed. Your next shot clears an impact zone.':'Pulse cancelled.';drawBubble()};
resetBubble();
/* SUDOKU */
var puzzle=[],solution=[],board=[],selected=-1,mistakes=0;
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function validSudoku(b,r,c,n){for(var i=0;i<9;i++)if(b[r*9+i]===n||b[i*9+c]===n)return false;var sr=Math.floor(r/3)*3,sc=Math.floor(c/3)*3;for(var y=sr;y<sr+3;y++)for(var x=sc;x<sc+3;x++)if(b[y*9+x]===n)return false;return true}
function solveSudoku(b){for(var i=0;i<81;i++)if(!b[i]){var r=Math.floor(i/9),c=i%9;for(var n of shuffle([1,2,3,4,5,6,7,8,9]))if(validSudoku(b,r,c,n)){b[i]=n;if(solveSudoku(b))return true;b[i]=0}return false}return true}
function renderSudoku(){var root=$('sudoku-board');root.innerHTML='';board.forEach(function(v,i){var b=document.createElement('button');b.className='sudoku-cell'+(puzzle[i]?' fixed':'')+(selected===i?' selected':'');b.textContent=v||'';if(selected>=0){var same=board[selected];if(i!==selected&&((Math.floor(i/9)===Math.floor(selected/9))||(i%9===selected%9)||(Math.floor(Math.floor(i/9)/3)===Math.floor(Math.floor(selected/9)/3)&&Math.floor((i%9)/3)===Math.floor((selected%9)/3))))b.classList.add('peer');if(same&&v===same)b.classList.add('same')}if(v&&puzzle[i]===0&&solution[i]!==v)b.classList.add('wrong');b.onclick=function(){selected=i;renderSudoku();var focused=root.children[selected];if(focused)focused.focus()};root.appendChild(b)});$('sudoku-mistakes').textContent=mistakes}
function newSudoku(){solution=Array(81).fill(0);solveSudoku(solution);puzzle=solution.slice();var remove=Number($('sudoku-level').value);shuffle(Array.from({length:81},function(_,i){return i})).slice(0,remove).forEach(function(i){puzzle[i]=0});board=puzzle.slice();selected=-1;mistakes=0;$('sudoku-status').textContent='New puzzle ready.';renderSudoku()}
function setSudoku(n){if(selected<0){$('sudoku-status').textContent='Select an empty cell first.';return}if(puzzle[selected])return;board[selected]=n;if(n&&n!==solution[selected])mistakes++;renderSudoku();$('sudoku-status').textContent=board.every(function(v,i){return v===solution[i]})?'Solved! Perfect work.':n?'Number entered.':'Cell cleared.'}
for(var n=1;n<=9;n++){(function(v){var b=document.createElement('button');b.className='arcade-btn';b.textContent=v;b.onclick=function(){setSudoku(v)};$('sudoku-pad').appendChild(b)})(n)}var erase=document.createElement('button');erase.className='arcade-btn';erase.textContent='⌫';erase.onclick=function(){setSudoku(0)};$('sudoku-pad').appendChild(erase);$('sudoku-new').onclick=newSudoku;$('sudoku-check').onclick=function(){$('sudoku-status').textContent=board.every(function(v,i){return v===solution[i]})?'Solved! Every row, column and box is correct.':'Not solved yet. Check highlighted mistakes and empty cells.'};$('sudoku-level').onchange=newSudoku;newSudoku();
document.addEventListener('keydown',function(e){
 var panel=$('sudoku-panel'),root=$('sudoku-board'),active=document.activeElement;
 if(!panel||!panel.classList.contains('active')||!root||!root.contains(active))return;
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 var delta=0;
 if(e.key==='ArrowUp')delta=-9;else if(e.key==='ArrowDown')delta=9;else if(e.key==='ArrowLeft')delta=-1;else if(e.key==='ArrowRight')delta=1;
 if(delta){e.preventDefault();selected=Math.max(0,Math.min(80,(selected<0?0:selected)+delta));renderSudoku();var cells=root.querySelectorAll('.sudoku-cell');if(cells[selected])cells[selected].focus();return}
 if(/^[1-9]$/.test(e.key)){e.preventDefault();setSudoku(Number(e.key));var cells=root.querySelectorAll('.sudoku-cell');if(cells[selected])cells[selected].focus();return}
 if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){e.preventDefault();setSudoku(0);var cells=root.querySelectorAll('.sudoku-cell');if(cells[selected])cells[selected].focus()}
});
/* CHESS: local legal chess, optional simple computer opponent, friend hot-seat mode. */
var chess=new Chess(),selectedSquare=null,legalTargets=[],chessMode='computer',aiThinking=false;
var pieceGlyph={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟︎',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
var pieceValues={p:100,n:320,b:330,r:500,q:900,k:20000};
function chessOver(){return chess.game_over()}
function renderChess(){
 var root=$('chess-board');root.innerHTML='';
 chess.board().forEach(function(row,r){row.forEach(function(p,c){
  var sq='abcdefgh'[c]+(8-r),el=document.createElement('button');
  el.className='chess-square '+((r+c)%2?'dark':'light');
  if(selectedSquare===sq)el.classList.add('selected');
  if(legalTargets.indexOf(sq)>=0)el.classList.add(p?'capture':'target');
  el.textContent=p?pieceGlyph[p.color+p.type]:'';
  el.setAttribute('aria-label',sq+(p?' '+p.color+' '+p.type:' empty'));
  el.disabled=aiThinking;
  el.onclick=function(){clickChess(sq)};
  root.appendChild(el);
 })});
 var turn=chess.turn()==='w'?'White':'Black';
 var status=chess.in_checkmate()?'Checkmate. '+(turn==='White'?'Black':'White')+' wins.':chess.in_stalemate()?'Draw by stalemate.':chess.in_draw()?'Draw.':turn+' to move'+(chess.in_check()?' · Check':'');
 if(aiThinking)status='Computer is thinking…';
 $('chess-status').textContent=status;
 $('chess-moves').textContent=chess.history().length?chess.history().reduce(function(out,m,i){return out+(i%2===0?Math.floor(i/2+1)+'. ':'')+m+(i%2===1?'\n':' ')},''):'No moves yet.';
}
function chessFeedback(message){$('chess-feedback').textContent=message}
function evaluateChess(){
 var board=chess.board(),score=0;
 board.forEach(function(row,r){row.forEach(function(p,c){if(!p)return;var value=pieceValues[p.type]||0,center=(3.5-Math.abs(3.5-c))+(3.5-Math.abs(3.5-r));value+=center*(p.type==='n'||p.type==='b'?5:2);score+=(p.color==='b'?value:-value);})});
 if(chess.in_checkmate())score+=chess.turn()==='w'?100000:-100000;
 return score;
}
function chooseComputerMove(){
 var moves=chess.moves({verbose:true}),best=null,bestScore=-Infinity;
 moves.forEach(function(move){
  chess.move(move);var score;
  if(chess.game_over())score=evaluateChess();
  else{
   score=evaluateChess();
   var replies=chess.moves({verbose:true}),worst=Infinity;
   replies.forEach(function(reply){chess.move(reply);worst=Math.min(worst,evaluateChess());chess.undo()});
   if(replies.length)score=worst;
  }
  chess.undo();
  score+=Math.random()*.01;
  if(score>bestScore){bestScore=score;best=move}
 });
 return best;
}
function computerTurn(){
 if(chessMode!=='computer'||chess.turn()!=='b'||chessOver())return;
 aiThinking=true;renderChess();chessFeedback('Computer is choosing a move…');
 window.setTimeout(function(){
  var move=chooseComputerMove();
  if(move)chess.move(move);
  aiThinking=false;selectedSquare=null;legalTargets=[];renderChess();
  chessFeedback(move?'Computer played '+move.san+'.':'No legal move available.');
 },220);
}
function clickChess(sq){
 if(aiThinking||chessOver()||(chessMode==='computer'&&chess.turn()==='b'))return;
 var piece=chess.get(sq);
 if(selectedSquare&&legalTargets.indexOf(sq)>=0){
  var move=chess.move({from:selectedSquare,to:sq,promotion:'q'});
  if(move){
   selectedSquare=null;legalTargets=[];renderChess();
   chessFeedback(move.san+(move.flags.indexOf('p')>=0?' (promoted to queen)':''));
   if(chessMode==='computer'&&chess.turn()==='b')computerTurn();
   return;
  }
 }
 if(piece&&piece.color===chess.turn()){
  selectedSquare=sq;legalTargets=chess.moves({square:sq,verbose:true}).map(function(m){return m.to});
  chessFeedback(legalTargets.length?'Choose a highlighted destination.':'No legal moves for this piece.');
 }else{selectedSquare=null;legalTargets=[];chessFeedback('Select a piece of the side to move.')}
 renderChess();
}
function setChessMode(mode){
 chessMode=mode;aiThinking=false;selectedSquare=null;legalTargets=[];chess.reset();
 document.querySelectorAll('[data-chess-mode]').forEach(function(button){var active=button.dataset.chessMode===mode;button.classList.toggle('primary',active);button.setAttribute('aria-pressed',String(active))});
 $('chess-mode-note').textContent=mode==='computer'?'You play White. The computer plays Black.':'Two players take turns on this device. Pass the device after each move.';
 chessFeedback(mode==='computer'?'New game started. Your move as White.':'Friend mode started. White moves first.');
 renderChess();
}
document.querySelectorAll('[data-chess-mode]').forEach(function(button){button.addEventListener('click',function(){setChessMode(button.dataset.chessMode)})});
var friendNameInput=$('chess-friend-username'),friendChallengeButton=$('chess-challenge-friend');
if(friendNameInput&&friendChallengeButton){
 friendChallengeButton.addEventListener('click',function(){
  var username=friendNameInput.value.trim();
  if(!/^[A-Za-z0-9_-]{3,25}$/.test(username)){chessFeedback('Enter a valid Chess.com username (3–25 letters, numbers, _ or -).');friendNameInput.focus();return}
  window.open('https://www.chess.com/play/'+encodeURIComponent(username),'_blank','noopener,noreferrer');
  chessFeedback('Opening the Chess.com challenge page for '+username+'.');
 });
 friendNameInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();friendChallengeButton.click()}});
}
$('chess-undo').onclick=function(){
 if(aiThinking)return;
 chess.undo();
 if(chessMode==='computer'&&chess.turn()==='b'&&chess.history().length)chess.undo();
 selectedSquare=null;legalTargets=[];renderChess();chessFeedback('Last turn undone.');
};
$('chess-reset').onclick=function(){setChessMode(chessMode)};
renderChess();

/* CHESS ONLINE ROOMS + VOICE */
var chessRoom=null,chessSeat=0,chessApplyingRemote=false;
function chessRoomStatus(message){var el=$('chess-network-status');if(el)el.textContent=message;}
function chessRoomSnapshot(){return {fen:chess.fen(),history:chess.history(),turn:chess.turn()};}
function applyChessRoomState(snapshot){
 if(!snapshot||!snapshot.fen||snapshot.fen===chess.fen())return;
 chessApplyingRemote=true;
 try{if(Array.isArray(snapshot.history)){chess.reset();snapshot.history.forEach(function(san){chess.move(san)});if(chess.fen()!==snapshot.fen)chess.load(snapshot.fen);}else chess.load(snapshot.fen);selectedSquare=null;legalTargets=[];renderChess();chessFeedback('Opponent moved. Your turn.');}
 catch(error){console.warn('Could not apply remote chess state',error);}
 chessApplyingRemote=false;
}
function chessRoomPlayers(room){var names=room.players.map(function(p){return p.name}).join(' · ');$('chess-room-info').hidden=false;$('chess-room-code').textContent=room.id;$('chess-room-players').textContent=names;}
async function chessCreateOrJoin(action){
 try{
  if(!window.ArcadeNetwork)throw new Error('Multiplayer client did not load. Refresh the page.');
  chessRoom&&chessRoom.close();chessRoom=window.ArcadeNetwork.createRoom('chess');
  chessRoom.addEventListener('room',function(e){chessRoomPlayers(e.detail);chessRoom.syncPeers().catch(function(){});});
  chessRoom.addEventListener('sync',function(e){var room=e.detail;if(room.state)applyChessRoomState(room.state);chessRoomPlayers(room);chessRoom.syncPeers().catch(function(){});});
  chessRoom.addEventListener('error',function(e){chessRoomStatus(e.detail.message);});
  chessRoom.addEventListener('voice-status',function(e){chessRoomStatus(e.detail);});
  var name=prompt('Enter your player name')||'Player';
  var data=action==='create'?await chessRoom.create(name,2):await chessRoom.join($('chess-room-id').value,name);
  chessSeat=chessRoom.seat;setChessMode('friend');chessRoomPlayers(data.room);
  if(action==='create'){await chessRoom.update(chessRoomSnapshot());chessRoomStatus('Room created. Share '+data.roomId+' with your friend. You are White.');}
  else if(data.room.state){applyChessRoomState(data.room.state);chessRoomStatus('Joined room '+data.roomId+'. You are '+(chessSeat===0?'White':'Black')+'.');}
  else chessRoomStatus('Joined room '+data.roomId+'. Waiting for the room owner to start.');
  $('chess-mic').disabled=false;$('chess-speaker').disabled=false;$('chess-leave-room').hidden=false;document.querySelectorAll('[data-chess-mode]').forEach(function(button){button.disabled=true;});
 }catch(error){chessRoomStatus(error.message);}
}
$('chess-create-room').addEventListener('click',function(){chessCreateOrJoin('create')});
$('chess-join-room').addEventListener('click',function(){chessCreateOrJoin('join')});
var originalOnlineChessClick=clickChess;
clickChess=function(sq){
 if(chessRoom&&!chessApplyingRemote){
  if(chess.turn()!==(chessSeat===0?'w':'b')){chessFeedback('Wait for your turn.');return;}
  var before=chess.history().length;originalOnlineChessClick(sq);
  if(chess.history().length>before){chessRoom.update(chessRoomSnapshot()).then(function(ok){if(!ok)chessRoomStatus('Board changed remotely. Synced latest position.');}).catch(function(e){chessRoomStatus(e.message);});}
  return;
 }
 originalOnlineChessClick(sq);
};
var oldChessUndo=$('chess-undo').onclick,oldChessReset=$('chess-reset').onclick;
$('chess-undo').onclick=function(){if(chessRoom){chessFeedback('Undo is disabled in online matches.');return;}if(oldChessUndo)oldChessUndo();};
$('chess-reset').onclick=function(){if(chessRoom){chessFeedback('Leave the online room before restarting.');return;}if(oldChessReset)oldChessReset();};
$('chess-mic').onclick=async function(){if(!chessRoom)return;try{if(!chessRoom.micOn){await chessRoom.enableMic();this.textContent='🎙 Mute microphone';}else{chessRoom.setMic(false);this.textContent='🎙 Enable microphone';}}catch(error){chessRoomStatus(error.message);}};
$('chess-speaker').onclick=function(){if(!chessRoom)return;chessRoom.setSpeaker(!chessRoom.speakerOn);this.textContent=chessRoom.speakerOn?'🔊 Speaker on':'🔇 Speaker off';};


$('chess-leave-room').onclick=function(){if(chessRoom)chessRoom.close();chessRoom=null;$('chess-room-info').hidden=true;$('chess-leave-room').hidden=true;$('chess-mic').disabled=true;$('chess-speaker').disabled=true;$('chess-mic').textContent='🎙 Enable microphone';$('chess-speaker').textContent='🔊 Speaker on';document.querySelectorAll('[data-chess-mode]').forEach(function(button){button.disabled=false;});setChessMode('computer');chessRoomStatus('Left online room.');};
})();
