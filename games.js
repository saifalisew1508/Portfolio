(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
/* Visitor-local clock for the arcade header. */
(function(){
 var time=$('visitor-time'),date=$('visitor-date');
 if(!time)return;
 var locale=navigator.language||'en-US';
 function tick(){
  var now=new Date(),zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  time.textContent=new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:true}).format(now);
  if(date)date.textContent=new Intl.DateTimeFormat(locale,{timeZone:zone,weekday:'short',day:'2-digit',month:'short'}).format(now);
 }
 tick();window.setInterval(tick,30000);
})();
/* BUBBLE SHOOTER */
var canvas=$('bubble-canvas'),ctx=canvas.getContext('2d'),cols=['#ff6488','#55d6ef','#a78bfa','#f8c65b','#62dc9b'],R=21,grid=[],score=0,left=30,shot=0,aim={x:360,y:160},shooter={x:360,y:710},current=0,next=1;
function randColor(){return Math.floor(Math.random()*cols.length)}
function bubblePos(r,c){return {x:25+c*42+(r%2?21:0),y:25+r*36}}
function drawCircle(x,y,color,rad){ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);var g=ctx.createRadialGradient(x-rad*.35,y-rad*.4,2,x,y,rad);g.addColorStop(0,'#ffffff');g.addColorStop(.18,cols[color]);g.addColorStop(1,'#10182a');ctx.fillStyle=g;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=cols[color];ctx.stroke()}
function drawBubble(){ctx.clearRect(0,0,720,760);ctx.fillStyle='#0b1426';ctx.fillRect(0,0,720,760);ctx.strokeStyle='#283b60';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(8,260);ctx.lineTo(712,260);ctx.stroke();for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c]>=0){var p=bubblePos(r,c);drawCircle(p.x,p.y,grid[r][c],R)}ctx.beginPath();ctx.moveTo(shooter.x,shooter.y);ctx.lineTo(aim.x,aim.y);ctx.strokeStyle='#ffffff33';ctx.setLineDash([6,8]);ctx.stroke();ctx.setLineDash([]);drawCircle(shooter.x,shooter.y,current,R);drawCircle(665,710,next,14);ctx.fillStyle='#91a4c8';ctx.font='13px monospace';ctx.fillText('NEXT',640,675);$('bubble-score').textContent=score;$('bubble-left').textContent=left;$('bubble-next').textContent='●';$('bubble-next').style.color=cols[next]}
function resetBubble(){grid=[];for(var r=0;r<10;r++){grid[r]=[];for(var c=0;c<16-(r%2);c++)grid[r][c]=r<6?randColor():-1}score=0;left=30;shot=0;current=randColor();next=randColor();$('bubble-status').textContent='Ready. Take your first shot.';drawBubble()}
function neighbors(r,c){var d=[[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]];if(r%2===1)d=[[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]];return d.map(function(v){return[r+v[0],c+v[1]]})}
function connected(r,c,color,seen){var k=r+','+c;if(seen[k]||!grid[r]||grid[r][c]!==color)return[];seen[k]=1;var out=[[r,c]];neighbors(r,c).forEach(function(n){out=out.concat(connected(n[0],n[1],color,seen))});return out}
function dropFloating(){var seen={},stack=[];for(var c=0;c<grid[0].length;c++)if(grid[0][c]>=0)stack.push([0,c]);while(stack.length){var a=stack.pop(),k=a.join(',');if(seen[k]||!grid[a[0]]||grid[a[0]][a[1]]<0)continue;seen[k]=1;neighbors(a[0],a[1]).forEach(function(n){if(grid[n[0]]&&grid[n[0]][n[1]]>=0)stack.push(n)})}var dropped=0;grid.forEach(function(row,r){row.forEach(function(v,c){if(v>=0&&!seen[r+','+c]){grid[r][c]=-1;dropped++}})});score+=dropped*20}
function shoot(x,y){if(left<=0||$('bubble-status').textContent.indexOf('won')>=0)return;var dx=x-shooter.x,dy=y-shooter.y;if(dy>-25)return;var hit=null;for(var s=1;s<=50;s++){var px=shooter.x+dx*s/50,py=shooter.y+dy*s/50;if(px<R||px>720-R||py<R){hit={x:px,y:py};break}for(var r=0;r<grid.length&&!hit;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c]>=0){var p=bubblePos(r,c);if(Math.hypot(px-p.x,py-p.y)<R*1.85){hit={x:px,y:py};break}}}if(!hit)hit={x:Math.max(R,Math.min(720-R,x)),y:Math.max(R,Math.min(680,y))};var best=null,dist=1e9;for(var rr=0;rr<grid.length;rr++)for(var cc=0;cc<grid[rr].length;cc++)if(grid[rr][cc]<0){var adjacent=neighbors(rr,cc).some(function(n){return grid[n[0]]&&grid[n[0]][n[1]]>=0});if(!adjacent)continue;var bp=bubblePos(rr,cc),dd=Math.hypot(bp.x-hit.x,bp.y-hit.y);if(dd<dist){dist=dd;best=[rr,cc]}}if(!best)return;grid[best[0]][best[1]]=current;var group=connected(best[0],best[1],current,{});if(group.length>=3){group.forEach(function(a){grid[a[0]][a[1]]=-1});score+=group.length*10;dropFloating();$('bubble-status').textContent='Nice shot! '+group.length+' bubbles popped.'}else $('bubble-status').textContent='Keep matching colors.';left--;shot++;if(grid.every(function(row){return row.every(function(v){return v<0})}))$('bubble-status').textContent='You won! Board cleared.';else if(left<=0)$('bubble-status').textContent='Out of bubbles. Start a new game.';else if(shot%5===0){var row=[];for(var z=0;z<16;z++)row.push(randColor());grid.unshift(row);grid.pop()}current=next;next=randColor();drawBubble()}
var aiming=false,activePointer=null;
function updateAim(e){var b=canvas.getBoundingClientRect();aim={x:(e.clientX-b.left)*720/b.width,y:(e.clientY-b.top)*760/b.height};if(aim.y>=shooter.y-20)aim.y=shooter.y-21;drawBubble()}
canvas.addEventListener('pointermove',function(e){if(aiming&&activePointer!==e.pointerId)return;updateAim(e)});
canvas.addEventListener('pointerdown',function(e){if(e.button!==undefined&&e.button!==0)return;e.preventDefault();aiming=true;activePointer=e.pointerId;if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);updateAim(e);$('bubble-status').textContent='Aim your shot, then release to fire.'});
canvas.addEventListener('pointerup',function(e){if(!aiming||activePointer!==e.pointerId)return;updateAim(e);aiming=false;activePointer=null;shoot(aim.x,aim.y)});
canvas.addEventListener('pointercancel',function(e){if(activePointer===e.pointerId){aiming=false;activePointer=null;drawBubble()}});
$('bubble-new').onclick=function(){aiming=false;activePointer=null;resetBubble()};resetBubble();
/* SUDOKU */
var puzzle=[],solution=[],board=[],selected=-1,mistakes=0;
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function validSudoku(b,r,c,n){for(var i=0;i<9;i++)if(b[r*9+i]===n||b[i*9+c]===n)return false;var sr=Math.floor(r/3)*3,sc=Math.floor(c/3)*3;for(var y=sr;y<sr+3;y++)for(var x=sc;x<sc+3;x++)if(b[y*9+x]===n)return false;return true}
function solveSudoku(b){for(var i=0;i<81;i++)if(!b[i]){var r=Math.floor(i/9),c=i%9;for(var n of shuffle([1,2,3,4,5,6,7,8,9]))if(validSudoku(b,r,c,n)){b[i]=n;if(solveSudoku(b))return true;b[i]=0}return false}return true}
function renderSudoku(){var root=$('sudoku-board');root.innerHTML='';board.forEach(function(v,i){var b=document.createElement('button');b.className='sudoku-cell'+(puzzle[i]?' fixed':'')+(selected===i?' selected':'');b.textContent=v||'';if(selected>=0){var same=board[selected];if(i!==selected&&((Math.floor(i/9)===Math.floor(selected/9))||(i%9===selected%9)||(Math.floor(Math.floor(i/9)/3)===Math.floor(Math.floor(selected/9)/3)&&Math.floor((i%9)/3)===Math.floor((selected%9)/3))))b.classList.add('peer');if(same&&v===same)b.classList.add('same')}if(v&&puzzle[i]===0&&solution[i]!==v)b.classList.add('wrong');b.onclick=function(){selected=i;renderSudoku()};root.appendChild(b)});$('sudoku-mistakes').textContent=mistakes}
function newSudoku(){solution=Array(81).fill(0);solveSudoku(solution);puzzle=solution.slice();var remove=Number($('sudoku-level').value);shuffle(Array.from({length:81},function(_,i){return i})).slice(0,remove).forEach(function(i){puzzle[i]=0});board=puzzle.slice();selected=-1;mistakes=0;$('sudoku-status').textContent='New puzzle ready.';renderSudoku()}
function setSudoku(n){if(selected<0){$('sudoku-status').textContent='Select an empty cell first.';return}if(puzzle[selected])return;board[selected]=n;if(n&&n!==solution[selected])mistakes++;renderSudoku();$('sudoku-status').textContent=board.every(function(v,i){return v===solution[i]})?'Solved! Perfect work.':n?'Number entered.':'Cell cleared.'}
for(var n=1;n<=9;n++){(function(v){var b=document.createElement('button');b.className='arcade-btn';b.textContent=v;b.onclick=function(){setSudoku(v)};$('sudoku-pad').appendChild(b)})(n)}var erase=document.createElement('button');erase.className='arcade-btn';erase.textContent='⌫';erase.onclick=function(){setSudoku(0)};$('sudoku-pad').appendChild(erase);$('sudoku-new').onclick=newSudoku;$('sudoku-check').onclick=function(){$('sudoku-status').textContent=board.every(function(v,i){return v===solution[i]})?'Solved! Every row, column and box is correct.':'Not solved yet. Check highlighted mistakes and empty cells.'};$('sudoku-level').onchange=newSudoku;newSudoku();
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
$('chess-undo').onclick=function(){
 if(aiThinking)return;
 chess.undo();
 if(chessMode==='computer'&&chess.turn()==='b'&&chess.history().length)chess.undo();
 selectedSquare=null;legalTargets=[];renderChess();chessFeedback('Last turn undone.');
};
$('chess-reset').onclick=function(){setChessMode(chessMode)};
renderChess();
})();