(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Live visitor clock using the browser/device timezone for the visitor's current location. */
(function(){var time=$('visitor-time'),date=$('visitor-date');if(!time)return;var zone='',fmt={};function tick(){var now=new Date(),z='UTC';try{z=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch(e){}try{if(z!==zone){zone=z;fmt.t=new Intl.DateTimeFormat(undefined,{timeZone:z,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});fmt.d=new Intl.DateTimeFormat(undefined,{timeZone:z,weekday:'short',month:'short',day:'numeric',year:'numeric'});fmt.o=new Intl.DateTimeFormat(undefined,{timeZone:z,timeZoneName:'shortOffset'})}time.textContent=fmt.t.format(now).toUpperCase();if(date){var o=fmt.o.formatToParts(now).find(function(p){return p.type==='timeZoneName'});date.textContent=fmt.d.format(now)+' · '+(o?o.value:'UTC');date.title='Live local time · '+zone}}catch(e){time.textContent=now.toLocaleTimeString();if(date)date.textContent=now.toLocaleDateString()+' · Local time'}}tick();setInterval(tick,1000);addEventListener('focus',tick);document.addEventListener('visibilitychange',function(){if(!document.hidden)tick()})})();
function pulse(id){if(reduced)return;var el=$(id);el.classList.remove('updated');void el.offsetWidth;el.classList.add('updated')}
/* Reusable dashboard navigation */
var panels=Array.from(document.querySelectorAll('.tool-panel')),cards=Array.from(document.querySelectorAll('.nav-card[data-panel]'));
function activatePanel(id){var panelId=id==='scientific'?'math':id;panels.forEach(function(p){p.classList.toggle('active',p.id===panelId)});cards.forEach(function(c){var active=c.dataset.panel===id;c.classList.toggle('active',active);c.setAttribute('aria-pressed',String(active))});if(panelId==='math')$('calc-display').setAttribute('aria-label','Calculator display');}
cards.forEach(function(c){c.addEventListener('click',function(){var id=c.dataset.panel;if(id==='scientific')setCalcMode('scientific');else if(id==='math')setCalcMode('basic');activatePanel(id)})});
/* Math and scientific calculator. Safe recursive-descent parser; no eval(). */
var expr='',fresh=true,display=$('calc-display'),line=$('calc-expression'),calcMode='basic',angleMode='deg',inverseMode=false;
var basicKeys=[
 ['AC','clear','utility'],['⌫','back','utility'],['(','(','utility'],[')',')','utility'],
 ['7','7'],['8','8'],['9','9'],['÷','/','op'],
 ['4','4'],['5','5'],['6','6'],['×','*','op'],
 ['1','1'],['2','2'],['3','3'],['−','-','op'],
 ['+/-','sign','utility'],['0','0'],['.','.'],['+','+','op'],
 ['√','sqrt','utility'],['00','00','utility'],['%','%','utility'],['=','equal','equal']
];
var scientificKeys=[
 ['sin','sin','utility'],['cos','cos','utility'],['tan','tan','utility'],['rad','rad','utility'],['deg','deg','mode-key'],
 ['log','log','utility'],['ln','ln','utility'],['(','(','utility'],[')',')','utility'],['inv','inv','utility'],
 ['!','!','utility'],['AC','clear','utility'],['%','%','utility'],['⌫','back','utility'],['÷','/','op'],
 ['^','^','utility'],['7','7'],['8','8'],['9','9'],['×','*','op'],
 ['√','sqrt','utility'],['4','4'],['5','5'],['6','6'],['−','-','op'],
 ['π','pi','utility'],['1','1'],['2','2'],['3','3'],['+','+','op'],
 ['e','e','utility'],['00','00'],['0','0'],['.','.'],['=','equal','equal']
];
function render(){display.textContent=expr||'0'}
function insertToken(token){if(fresh&&/^[0-9.]$/.test(token))expr='';fresh=false;expr+=token;render()}
function formatResult(value){return String(Number(value.toPrecision(12)))}
function factorial(n){if(n<0||!Number.isInteger(n)||n>170)throw Error('Factorial needs a whole number from 0 to 170');var out=1;for(var j=2;j<=n;j++)out*=j;return out}
function tokenize(source){
 var tokens=[],i=0,number=/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i,identifier=/^[a-zπ]+/i;
 while(i<source.length){if(/\s/.test(source[i])){i++;continue}
  var rest=source.slice(i),nm=rest.match(number),im=rest.match(identifier);
  if(nm){tokens.push({type:'number',value:Number(nm[0])});i+=nm[0].length;continue}
  if(im){var name=im[0].toLowerCase().replace('π','pi');tokens.push({type:'name',value:name});i+=im[0].length;continue}
  if('+-*/%^!()'.indexOf(source[i])!==-1){tokens.push({type:'op',value:source[i++]});continue}
  throw Error('Unsupported character: '+source[i]);
 }
 return tokens
}
function evaluate(source){
 var t=tokenize(source),i=0;
 function peek(){return t[i]}
 function take(value){if(peek()&&peek().value===value){i++;return true}return false}
 function primary(){
  var token=peek();if(!token)throw Error('Incomplete expression');
  if(take('+'))return unary();
  if(take('-'))return -unary();
  if(take('(')){var grouped=addition();if(!take(')'))throw Error('Missing closing bracket');return grouped}
  if(token.type==='number'){i++;return token.value}
  if(token.type==='name'){
   i++;var name=token.value;
   if(name==='pi')return Math.PI;if(name==='e')return Math.E;
   if(!['sin','cos','tan','asin','acos','atan','sqrt','log','ln','abs'].includes(name))throw Error('Unknown function: '+name);
   if(!take('('))throw Error('Add ( after '+name);
   var arg=addition();if(!take(')'))throw Error('Missing ) after '+name);
   var angle=angleMode==='deg'?Math.PI/180:1,result;
   if(name==='sin')result=Math.sin(arg*angle);
   else if(name==='cos')result=Math.cos(arg*angle);
   else if(name==='tan')result=Math.tan(arg*angle);
   else if(name==='asin')result=Math.asin(arg)/angle;
   else if(name==='acos')result=Math.acos(arg)/angle;
   else if(name==='atan')result=Math.atan(arg)/angle;
   else if(name==='sqrt'){if(arg<0)throw Error('Square root of a negative number');result=Math.sqrt(arg)}
   else if(name==='log'){if(arg<=0)throw Error('Log requires a positive number');result=Math.log10(arg)}
   else if(name==='ln'){if(arg<=0)throw Error('Ln requires a positive number');result=Math.log(arg)}
   else result=Math.abs(arg);
   if(!Number.isFinite(result))throw Error('Math error');return result;
  }
  throw Error('Unexpected token');
 }
 function postfix(){var value=primary();while(peek()&&(peek().value==='!'||peek().value==='%')){var op=t[i++].value;value=op==='!'?factorial(value):value/100}return value}
 function power(){var value=postfix();if(take('^'))value=Math.pow(value,unary());return value}
 function unary(){return power()}
 function multiplication(){var value=unary();while(peek()&&['*','/','%'].includes(peek().value)){var op=t[i++].value,next=unary();if((op==='/'||op==='%')&&next===0)throw Error('Cannot divide by zero');value=op==='*'?value*next:op==='/'?value/next:value%next}return value}
 function addition(){var value=multiplication();while(peek()&&(peek().value==='+'||peek().value==='-')){var op=t[i++].value,next=multiplication();value=op==='+'?value+next:value-next}return value}
 var result=addition();if(i<t.length)throw Error('Check your expression');if(!Number.isFinite(result))throw Error('Math error');return result
}
function setCalcMode(mode){
 calcMode=mode;var keypad=$('calc-keys');keypad.innerHTML='';keypad.className='calc-keys '+mode;
 document.querySelectorAll('[data-calc-mode]').forEach(function(button){var active=button.dataset.calcMode===mode;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});if($('math').classList.contains('active'))cards.forEach(function(card){var active=card.dataset.panel==='math';card.classList.toggle('active',active);card.setAttribute('aria-pressed',String(active))});
 (mode==='scientific'?scientificKeys:basicKeys).forEach(function(item,index){
  var button=document.createElement('button');button.type='button';button.textContent=item[0];button.dataset.action=item[1];button.className=item[2]||'';
  if(item[1]==='rad'||item[1]==='deg'){button.classList.toggle('selected',item[1]===angleMode);button.classList.add('mode-key')}
  if(item[1]==='inv')button.classList.toggle('selected',inverseMode);
  button.style.setProperty('--bubble-index',String(index%5));button.setAttribute('aria-label',item[0]);
  button.addEventListener('click',function(){act(item[1])});keypad.appendChild(button)
 });
}
function act(key){
 if(key==='clear'){expr='';line.textContent='Ready';fresh=true;render();return}
 if(key==='back'){expr=expr.slice(0,-1);fresh=false;render();return}
 if(key==='equal'){if(!expr)return;try{var original=expr,answer=evaluate(expr);window.lastAnswer=answer;line.textContent=original+' =';expr=formatResult(answer);fresh=true;render()}catch(error){line.textContent=error.message}return}
 if(key==='rad'||key==='deg'){angleMode=key;setCalcMode(calcMode);line.textContent='Angle mode: '+key.toUpperCase();return}
 if(key==='inv'){inverseMode=!inverseMode;setCalcMode(calcMode);line.textContent=inverseMode?'Inverse functions enabled':'Standard functions enabled';return}
 if(key==='sign'){if(expr)expr='-('+expr+')';render();fresh=false;return}
 if(['sin','cos','tan','log','ln','sqrt'].includes(key)){
  var fn=(inverseMode&&['sin','cos','tan'].includes(key))?'a'+key:key;
  expr+=fn+'(';fresh=false;render();return
 }
 if(key==='pi'||key==='e'){insertToken(key);return}
 if(key==='00'){insertToken('00');return}
 if(key==='!'){if(expr){expr+='!';fresh=false;render()}return}
 if(key==='%'){if(expr){expr+='%';fresh=false;render()}return}
 if(key==='('||key===')'){if(fresh&&key==='(')expr='';expr+=key;fresh=false;render();return}
 if(['/','*','-','+','^'].includes(key)){expr+=key;fresh=false;render();return}
 if(/^[0-9.]$/.test(key)){insertToken(key);return}
}
document.querySelectorAll('[data-calc-mode]').forEach(function(button){button.addEventListener('click',function(){setCalcMode(button.dataset.calcMode)})});
setCalcMode('basic');render();
document.addEventListener('keydown',function(e){
 if(!$('math').classList.contains('active')||e.target.matches('input,select,textarea'))return;
 if(/^[0-9.+\-*/()%^]$/.test(e.key)){e.preventDefault();act(e.key)}
 else if(e.key==='Enter'||e.key==='='){e.preventDefault();act('equal')}
 else if(e.key==='Backspace'){e.preventDefault();act('back')}
 else if(e.key==='Escape'){e.preventDefault();act('clear')}
});
/* Currency converter: Frankfurter API, supported currency list and honest status. */
var currencyInfo={
AED:['UAE Dirham','ae'],AUD:['Australian Dollar','au'],BDT:['Bangladeshi Taka','bd'],BRL:['Brazilian Real','br'],CAD:['Canadian Dollar','ca'],CHF:['Swiss Franc','ch'],CNY:['Chinese Yuan','cn'],CZK:['Czech Koruna','cz'],DKK:['Danish Krone','dk'],EGP:['Egyptian Pound','eg'],EUR:['Euro','eu'],GBP:['British Pound','gb'],GHS:['Ghanaian Cedi','gh'],HKD:['Hong Kong Dollar','hk'],HUF:['Hungarian Forint','hu'],IDR:['Indonesian Rupiah','id'],ILS:['Israeli New Shekel','il'],INR:['Indian Rupee','in'],JPY:['Japanese Yen','jp'],KES:['Kenyan Shilling','ke'],KRW:['South Korean Won','kr'],LKR:['Sri Lankan Rupee','lk'],MXN:['Mexican Peso','mx'],MYR:['Malaysian Ringgit','my'],NOK:['Norwegian Krone','no'],NPR:['Nepalese Rupee','np'],NZD:['New Zealand Dollar','nz'],PHP:['Philippine Peso','ph'],PKR:['Pakistani Rupee','pk'],PLN:['Polish Zloty','pl'],SAR:['Saudi Riyal','sa'],SEK:['Swedish Krona','se'],SGD:['Singapore Dollar','sg'],THB:['Thai Baht','th'],TRY:['Turkish Lira','tr'],TWD:['New Taiwan Dollar','tw'],USD:['US Dollar','us'],VND:['Vietnamese Dong','vn'],ZAR:['South African Rand','za']
};
var currencyCodes=Object.keys(currencyInfo).sort();
function fillCurrencySelect(id,selected){var el=$(id);currencyCodes.forEach(function(code){var op=document.createElement('option');op.value=code;op.textContent=code+' · '+currencyInfo[code][0];if(code===selected)op.selected=true;el.appendChild(op)})}
fillCurrencySelect('currency-from','USD');fillCurrencySelect('currency-to','INR');
function flagUrl(code){var country=currencyInfo[code]&&currencyInfo[code][1];return country?'https://flagcdn.com/w40/'+country+'.png':null}
function updateCurrencyIdentity(side){var code=$('currency-'+side).value,info=currencyInfo[code],img=$('currency-'+side+'-flag'),fallback=$('currency-'+side+'-fallback');$('currency-'+side+'-code').textContent=code;$('currency-'+side+'-name').textContent=info?info[0]:'Currency';var src=flagUrl(code);img.onerror=function(){img.classList.add('hidden');fallback.classList.remove('hidden')};img.onload=function(){img.classList.remove('hidden');fallback.classList.add('hidden')};if(src){fallback.classList.add('hidden');img.classList.remove('hidden');img.src=src;img.alt=info[0]+' flag'}else{img.removeAttribute('src');img.classList.add('hidden');fallback.textContent=code.slice(0,1)||'¤';fallback.classList.remove('hidden');img.alt='Flag unavailable'}} 
['from','to'].forEach(function(side){$('currency-'+side).addEventListener('change',function(){updateCurrencyIdentity(side)})});
function currencyStatus(message,state){$('currency-status').textContent=message;$('currency-status').className='status-line'+(state?' '+state:'')}
function currencyLive(ready,label){$('currency-live-dot').classList.toggle('ready',ready);$('currency-live-label').textContent=label}
$('currency-convert').addEventListener('click',async function(){var amount=Number($('currency-amount').value),from=$('currency-from').value,to=$('currency-to').value,btn=this;if(!Number.isFinite(amount)||amount<0){currencyStatus('Enter a valid amount greater than or equal to zero.','error');currencyLive(false,'RATE STATUS · INVALID INPUT');return}btn.disabled=true;btn.textContent='Fetching rate…';currencyLive(false,'RATE STATUS · LOADING');currencyStatus('Connecting to Frankfurter exchange rates…');$('currency-result').textContent='…';try{var rate,date;if(from===to){rate=1;date='No external rate needed'}else{var url='https://api.frankfurter.dev/v2/rate/'+encodeURIComponent(from.toLowerCase())+'/'+encodeURIComponent(to.toLowerCase());var response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Exchange-rate service returned '+response.status);var data=await response.json();if(typeof data.rate!=='number')throw Error('Rate unavailable for this currency pair');rate=data.rate;date=data.date||'Latest available'}$('currency-result').textContent=(amount*rate).toLocaleString(undefined,{maximumFractionDigits:6})+' '+to;pulse('currency-result');$('currency-meta').textContent=from===to?'Same currency selected. No exchange required.':'1 '+from+' = '+rate.toLocaleString(undefined,{maximumFractionDigits:8})+' '+to+' · Reference rate date: '+date;$('currency-result-meta').textContent=from===to?'No exchange required.':('Reference exchange rate · '+date);$('currency-live-label').textContent=from===to?'RATE STATUS · SAME CURRENCY':'RATE STATUS · RATE LOADED';currencyLive(from!==to,$('currency-live-label').textContent);currencyStatus(from===to?'Same currency selected.':'Exchange rate loaded successfully.','success')}catch(err){$('currency-result').textContent='—';$('currency-result-meta').textContent='No result available. Check your connection or try again later.';$('currency-meta').textContent='Rates could not be retrieved.';currencyLive(false,'RATE STATUS · OFFLINE / ERROR');currencyStatus('Could not load rates. '+(navigator.onLine?'The rate service may be unavailable.':'You appear to be offline.'),'error')}finally{btn.disabled=false;btn.textContent='Convert currency ↗'}});
$('currency-swap').addEventListener('click',function(){var a=$('currency-from').value;$('currency-from').value=$('currency-to').value;$('currency-to').value=a;updateCurrencyIdentity('from');updateCurrencyIdentity('to')});
/* Unit converter: screenshot-matched category library and grouped unit pickers. */
var unitCatalog={
 length:[
  {group:'Metric Units',units:[
   ['Decimeter (dm)','dm',.1],['Light year (ly)','ly',9.4607304725808e15],['Millimeter (mm)','mm',.001],['Kilometer (km)','km',1000],['Centimeter (cm)','cm',.01],['Meter (m)','m',1],['Micrometer (µm)','um',1e-6],['Parsec (pc)','pc',3.085677581491367e16],['Astronomical unit (AU)','AU',149597870700],['Lunar distance (LD)','LD',384400000],['Picometer (pm)','pm',1e-12],['Nanometer (nm)','nm',1e-9]
  ]},
  {group:'Imperial Units',units:[
   ['Furlong (fur)','fur',201.168],['Fathom (fm)','fm',1.8288],['Yard (yd)','yd',.9144],['Nautical mile (nmi)','nmi',1852],['Foot (ft)','ft',.3048],['Mile (mi)','mi',1609.344],['Inch (in)','in',.0254]
  ]},
  {group:'Chinese Units',units:[
   ['Zhàng (丈)','zhang',10/3],['Fēn (分)','fen',1/300],['Háo (毫)','hao',1/30000],['Chǐ (尺)','chi',1/3],['Lǐ (里)','li',500],['Cùn (寸)','cun',1/30],['Lǐ (厘)','li-small',1/3000]
  ]}
 ],
 area:[
  {group:'Metric Units',units:[
   ['Square meter (m²)','m2',1],['Square decimeter (dm²)','dm2',.01],['Square centimeter (cm²)','cm2',.0001],['Square kilometer (km²)','km2',1e6],['Square millimeter (mm²)','mm2',1e-6],['Are (ar)','ar',100],['Hectare (ha)','ha',10000]
  ]},
  {group:'Imperial Units',units:[
   ['Square mile (mi²)','mi2',2589988.110336],['Square rod (rd²)','rd2',25.29285264],['Square yard (yd²)','yd2',.83612736],['Square foot (ft²)','ft2',.09290304],['Acre (ac)','ac',4046.8564224],['Square inch (in²)','in2',.00064516]
  ]},
  {group:'Chinese Units',units:[
   ['Square chi (尺²)','chi2',1/9],['Qǐng (顷)','qing',66666.6666667],['Mǔ (亩)','mu',666.6666667],['Square cùn (寸²)','cun2',1/900]
  ]}
 ],
 volume:[
  {group:'Metric Units',units:[
   ['Hectoliter (hl)','hl',.1],['Cubic meter (m³)','m3',1],['Cubic centimeter (cm³)','cm3',1e-6],['Deciliter (dl)','dl',.0001],['Centiliter (cl)','cl',.00001],['Cubic decimeter (dm³)','dm3',.001],['Liter (l)','l',.001],['Cubic millimeter (mm³)','mm3',1e-9],['Milliliter (ml)','ml',1e-6]
  ]},
  {group:'Imperial Units',units:[
   ['Cubic foot (ft³)','ft3',.028316846592],['US fluid ounce (US fl oz)','usfloz',.0000295735295625],['Cubic yard (yd³)','yd3',.764554857984],['Cubic inch (in³)','in3',.000016387064],['Acre-foot (af³)','af3',1233.4818375475],['UK gallon (UK gal)','ukgal',.00454609],['US gallon (US gal)','usgal',.003785411784],['UK fluid ounce (UK fl oz)','ukfloz',.0000284130625]
  ]}
 ],
 mass:[
  {group:'Metric Units',units:[
   ['Gram (g)','g',.001],['Microgram (µg)','ug',1e-9],['Quintal (q)','q',100],['Carat (ct)','ct',.0002],['Ton (t)','t',1000],['Milligram (mg)','mg',1e-6],['Kilogram (kg)','kg',1]
  ]},
  {group:'Imperial Units',units:[
   ['Short ton (st)','short-ton',907.18474],['Long ton (lt)','long-ton',1016.0469088],['Ounce (oz)','oz',.028349523125],['Grain (gr)','gr',.00006479891],['Dram (dr)','dr',.0017718451953125],['Short hundredweight (sh cwt)','sh-cwt',45.359237],['Pound (lb)','lb',.45359237],['Stone (st)','stone',6.35029318],['Long hundredweight (lg cwt)','lg-cwt',50.80234544]
  ]},
  {group:'Chinese Units',units:[
   ['Jīn (斤)','jin',.5],['Dàn (担)','dan',50],['Qián (钱)','qian',.005],['Liǎng (两)','liang',.05]
  ]}
 ],
 temperature:[
  {group:'Temperature Units',units:[
   ['Degree Rankine (°R)','R'],['Degree Celsius (°C)','C'],['Degree Réaumur (°Re)','Re'],['Degree Fahrenheit (°F)','F'],['Kelvin (K)','K']
  ]}
 ],
 speed:[
  {group:'Speed Units',units:[
   ['Speed of light (c)','c'],['Kilometer/second (km/s)','km/s'],['Mile/hour (mph)','mph'],['Mach (Ma)','Ma'],['Inch/second (in/s)','in/s'],['Meter/second (m/s)','m/s'],['Kilometer/hour (km/h)','km/h']
  ]}
 ],
 pressure:[
  {group:'Pressure Units',units:[
   ['Millimeter of water (mmH₂O)','mmH2O'],['Pounds/square foot (psf)','psf'],['Kilogram-force/square centimeter (kgf/cm²)','kgf/cm2'],['Pounds/square inch (psi)','psi'],['Millimeter of mercury (mmHg)','mmHg'],['Bar (bar)','bar'],['Inch of mercury (inHg)','inHg'],['Millibar (mbar)','mbar'],['Hectopascal (hPa)','hPa'],['Standard atmosphere (atm)','atm'],['Kilopascal (kPa)','kPa'],['Kilogram-force/square meter (kgf/m²)','kgf/m2'],['Megapascal (MPa)','MPa']
  ]}
 ],
 power:[
  {group:'Power Units',units:[
   ['Joule/second (J/s)','J/s'],['British thermal unit/second (Btu/s)','Btu/s'],['Metric horsepower (PS)','PS'],['Kilogram-meter/second (kg·m/s)','kgm/s'],['Kilocalorie/second (kcal/s)','kcal/s'],['Watt (W)','W'],['Imperial horsepower (hp)','hp'],['Foot-pound/second (ft·lb/s)','ftlb/s'],['Newton-meter/second (N·m/s)','Nms'],['Kilowatt (kW)','kW']
  ]}
 ],
 energy:[
  {group:'Energy Units',units:[
   ['Joule (J)','J'],['Kilojoule (kJ)','kJ'],['Megajoule (MJ)','MJ'],['Calorie (cal)','cal'],['Kilocalorie (kcal)','kcal'],['Watt-hour (Wh)','Wh'],['Kilowatt-hour (kWh)','kWh'],['Electronvolt (eV)','eV'],['British thermal unit (BTU)','BTU'],['Foot-pound (ft·lb)','ftlb']
  ]}
 ],
 time:[
  {group:'Time Units',units:[
   ['Nanosecond (ns)','ns'],['Microsecond (µs)','us'],['Millisecond (ms)','ms'],['Second (s)','s'],['Minute (min)','min'],['Hour (h)','h'],['Day (d)','d'],['Week (wk)','wk'],['Month (30 days)','month'],['Year (365 days)','year']
  ]}
 ],
 concentration:[
  {group:'Mass concentration',units:[
   ['Gram/liter (g/L)','g/L',1],['Gram/deciliter (g/dL)','g/dL',10],['Milligram/milliliter (mg/mL)','mg/mL',1],['Milligram/deciliter (mg/dL)','mg/dL',.01],['Milligram/liter (mg/L)','mg/L',.001],['Microgram/milliliter (µg/mL)','µg/mL',.001],['Microgram/deciliter (µg/dL)','µg/dL',1e-5],['Microgram/liter (µg/L)','µg/L',1e-6],['Nanogram/milliliter (ng/mL)','ng/mL',1e-6],['Nanogram/liter (ng/L)','ng/L',1e-9],['Picogram/milliliter (pg/mL)','pg/mL',1e-9]
  ]},
  {group:'Molar concentration',units:[
   ['Mole/liter (mol/L)','mol/L',1],['Millimole/liter (mmol/L)','mmol/L',1e-3],['Micromole/liter (µmol/L)','µmol/L',1e-6],['Nanomole/liter (nmol/L)','nmol/L',1e-9],['Picomole/liter (pmol/L)','pmol/L',1e-12]
  ]}
 ],
 numberSystem:[
  {group:'Number Systems',units:[
   ['Binary BIN','2'],['Octal OCT','8'],['Decimal DEC','10'],['Hexadecimal HEX','16']
  ]}
 ]
};
var unitCategoryMeta={
 length:['Length','i-length'],area:['Area','i-area'],volume:['Volume','i-volume'],mass:['Weight','i-weight'],
 temperature:['Temperature','i-temperature'],speed:['Speed','i-speed'],pressure:['Pressure','i-pressure'],
 power:['Power','i-power'],energy:['Energy','i-energy'],time:['Time','i-time'],concentration:['Concentration','i-flask'],numberSystem:['Number system','i-number']
};
var unitCategory='length',unitSelections={},unitPickerTarget='unit-from',unitSearchValue='';
var unitDefaults={length:['m','km'],area:['m2','ha'],volume:['l','ml'],mass:['kg','g'],temperature:['C','F'],speed:['m/s','km/h'],pressure:['kPa','mmHg'],power:['W','kW'],energy:['J','kJ'],time:['s','min'],concentration:['mg/dL','mg/L'],numberSystem:['2','10']};
function allUnits(category){return unitCatalog[category].reduce(function(all,group){return all.concat(group.units.map(function(u){return {label:u[0],value:u[1],factor:u[2],group:group.group}}))},[])}
function unitInfo(category,value){return allUnits(category).find(function(u){return u.value===value})}
function setUnitButton(id,category,value){var info=unitInfo(category,value);$(id).innerHTML=(info?info.label:'Select unit')+'<span>⌄</span>'}
function currentUnitPair(){return unitSelections[unitCategory]||unitDefaults[unitCategory]}
function updateUnitButtons(){var pair=currentUnitPair();setUnitButton('unit-from-trigger',unitCategory,pair[0]);setUnitButton('unit-to-trigger',unitCategory,pair[1]);$('unit-value').type=unitCategory==='numberSystem'?'text':'number';$('unit-value').inputMode=unitCategory==='numberSystem'?'text':'none';$('unit-value').dataset.virtualKeyboard=unitCategory==='numberSystem'?'false':'true';$('unit-value').placeholder=unitCategory==='numberSystem'?'Enter a number in selected base':'Enter a value'}
function renderUnitCategories(){
 var root=$('unit-pills');root.innerHTML='';
 Object.keys(unitCategoryMeta).forEach(function(key){
  var meta=unitCategoryMeta[key],button=document.createElement('button');button.type='button';button.className='category-pill'+(key===unitCategory?' active':'');button.dataset.category=key;
  button.innerHTML='<svg aria-hidden="true"><use href="#'+meta[1]+'"></use></svg><span>'+meta[0]+'</span>';
  button.addEventListener('click',function(){unitCategory=key;unitSelections[key]=unitDefaults[key].slice();renderUnitCategories();updateUnitButtons();$('unit-result').textContent='—';$('unit-formula').textContent='';$('unit-status').textContent=meta[0]+' selected.';$('unit-status').className='status-line';if(matchMedia('(pointer:coarse)').matches)button.blur()});
  root.appendChild(button)
 });
}
function openUnitPicker(target){
 unitPickerTarget=target;unitSearchValue='';$('unit-picker-search').value='';$('unit-picker-search-wrap').classList.toggle('hidden',unitCategory==='numberSystem');
 $('unit-picker-title').textContent='Select unit';renderUnitPicker();$('unit-picker-overlay').classList.remove('hidden');$('unit-picker-overlay').setAttribute('aria-hidden','false');document.body.style.overflow='';
 if(unitCategory!=='numberSystem')$('unit-picker-search').focus();
}
function renderUnitPicker(){
 var list=$('unit-picker-list');list.innerHTML='';var groups=unitCatalog[unitCategory],query=unitSearchValue.trim().toLowerCase();
 groups.forEach(function(group){
  var matches=group.units.filter(function(unit){return !query||unit[0].toLowerCase().includes(query)||unit[1].toLowerCase().includes(query)});
  if(!matches.length)return;
  var heading=document.createElement('div');heading.className='unit-picker-group';heading.textContent=group.group;list.appendChild(heading);
  matches.forEach(function(unit){
   var button=document.createElement('button');button.type='button';button.className='unit-picker-option'+(currentUnitPair()[unitPickerTarget==='unit-from'?0:1]===unit[1]?' selected':'');button.textContent=unit[0];
   button.addEventListener('click',function(){var pair=currentUnitPair().slice();pair[unitPickerTarget==='unit-from'?0:1]=unit[1];unitSelections[unitCategory]=pair;updateUnitButtons();closeUnitPicker()});list.appendChild(button)
  })
 });
 if(!list.children.length){var empty=document.createElement('div');empty.className='unit-picker-group';empty.textContent='No matching units';list.appendChild(empty)}
}
function closeUnitPicker(){$('unit-picker-overlay').classList.add('hidden');$('unit-picker-overlay').setAttribute('aria-hidden','true');document.body.style.overflow='';var trigger=$(unitPickerTarget==='unit-from'?'unit-from-trigger':'unit-to-trigger');if(trigger)trigger.focus({preventScroll:true})}
renderUnitCategories();unitSelections.length=unitDefaults.length.slice();updateUnitButtons();
$('unit-from-trigger').addEventListener('click',function(){openUnitPicker('unit-from')});
$('unit-to-trigger').addEventListener('click',function(){openUnitPicker('unit-to')});
$('unit-picker-cancel').addEventListener('click',closeUnitPicker);
$('unit-picker-overlay').addEventListener('click',function(e){if(e.target===$('unit-picker-overlay'))closeUnitPicker()});
$('unit-picker-search').addEventListener('input',function(){unitSearchValue=this.value;renderUnitPicker()});
function tempToC(v,u){if(u==='C')return v;if(u==='F')return (v-32)*5/9;if(u==='K')return v-273.15;if(u==='R')return v*5/9-273.15;if(u==='Re')return v*1.25;return NaN}
function cToTemp(c,u){if(u==='C')return c;if(u==='F')return c*9/5+32;if(u==='K')return c+273.15;if(u==='R')return (c+273.15)*9/5;if(u==='Re')return c*.8;return NaN}
var speedFactors={'c':299792458,'km/s':1000,'mph':.44704,'Ma':340.29,'in/s':.0254,'m/s':1,'km/h':1/3.6};
var pressureFactors={'mmH2O':9.80665,'psf':47.88025898,'kgf/cm2':98066.5,'psi':6894.757293,'mmHg':133.322387415,'bar':100000,'inHg':3386.389,'mbar':100,'hPa':100,'atm':101325,'kPa':1000,'kgf/m2':9.80665,'MPa':1e6};
var powerFactors={'J/s':1,'Btu/s':1055.05585262,'PS':735.49875,'kgm/s':9.80665,'kcal/s':4184,'W':1,'hp':745.6998716,'ftlb/s':1.355817948,'Nms':1,'kW':1000};
var energyFactors={'J':1,'kJ':1000,'MJ':1e6,'cal':4.184,'kcal':4184,'Wh':3600,'kWh':3600000,'eV':1.602176634e-19,'BTU':1055.05585262,'ftlb':1.355817948};
var timeFactors={'ns':1e-9,'us':1e-6,'ms':.001,'s':1,'min':60,'h':3600,'d':86400,'wk':604800,'month':2592000,'year':31536000};
function unitStatus(message,state){$('unit-status').textContent=message;$('unit-status').className='status-line'+(state?' '+state:'')}
function showUnitResult(value,unit,formula){$('unit-result').textContent=value+' '+unit;pulse('unit-result');$('unit-formula').textContent=formula}
$('unit-convert').addEventListener('click',function(){
 var raw=$('unit-value').value.trim(),pair=currentUnitPair(),from=pair[0],to=pair[1],result,formula='';
 if(!raw){unitStatus('Enter a value to convert.','error');return}
 if(unitCategory==='numberSystem'){
  var fb=Number(from),tb=Number(to),parsed=parseInt(raw,fb);
  if(!Number.isFinite(parsed)||parsed<0||parsed.toString(fb)!==raw.toLowerCase()){unitStatus('Enter a valid whole number for the selected source base.','error');return}
  result=parsed.toString(tb).toUpperCase();showUnitResult(result,'Base '+tb,'Converted '+raw.toUpperCase()+' from '+fb+' to '+tb+'.');unitStatus('Number-system conversion complete.','success');return
 }
 var value=Number(raw);if(!Number.isFinite(value)){unitStatus('Enter a valid number.','error');return}
 var fromInfo=unitInfo(unitCategory,from),toInfo=unitInfo(unitCategory,to);
 if(!fromInfo||!toInfo){unitStatus('Select valid source and target units.','error');return}
 if(unitCategory==='concentration'&&fromInfo.group!==toInfo.group){unitStatus('Mass ↔ molar conversion needs the analyte molecular weight. Use the Clinical Lab Calculator for this conversion.','error');return}
 if(unitCategory==='temperature')result=cToTemp(tempToC(value,from),to);
 else{
  var factorMap=unitCategory==='speed'?speedFactors:unitCategory==='pressure'?pressureFactors:unitCategory==='power'?powerFactors:unitCategory==='energy'?energyFactors:unitCategory==='time'?timeFactors:null;
  result=factorMap?value*factorMap[from]/factorMap[to]:value*fromInfo.factor/toInfo.factor;
 }
 if(!Number.isFinite(result)){unitStatus('Conversion unavailable for this unit pair.','error');return}
 showUnitResult(Number(result.toPrecision(11)).toLocaleString(undefined,{maximumFractionDigits:10}),toInfo.label,'Converted '+value+' '+fromInfo.label+' to '+toInfo.label+'.');
 unitStatus('Conversion complete.','success')
});
$('unit-swap').addEventListener('click',function(){var pair=currentUnitPair().slice();unitSelections[unitCategory]=[pair[1],pair[0]];updateUnitButtons()});

/* Clinical lab calculator: separate mass and molar concentration modes. */
var analytes={'glucose':{name:'Glucose',mw:180.156},'urea':{name:'Urea',mw:60.06},'creatinine':{name:'Creatinine',mw:113.12},'cholesterol':{name:'Total cholesterol',mw:386.65},'total cholesterol':{name:'Total cholesterol',mw:386.65},'hdl cholesterol':{name:'HDL cholesterol',mw:null,reason:'HDL is a heterogeneous lipoprotein particle; no single molecular weight is suitable for conversion.'},'ldl cholesterol':{name:'LDL cholesterol',mw:null,reason:'LDL is a heterogeneous lipoprotein particle; no single molecular weight is suitable for conversion.'},'vldl cholesterol':{name:'VLDL cholesterol',mw:null,reason:'VLDL is a heterogeneous lipoprotein particle; no single molecular weight is suitable for conversion.'},'ast':{name:'AST / SGOT',mw:null,reason:'AST is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'sgot':{name:'AST / SGOT',mw:null,reason:'AST is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'alt':{name:'ALT / SGPT',mw:null,reason:'ALT is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'sgpt':{name:'ALT / SGPT',mw:null,reason:'ALT is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'alp':{name:'Alkaline phosphatase',mw:null,reason:'ALP is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'ggt':{name:'Gamma-glutamyl transferase',mw:null,reason:'GGT is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'ldh':{name:'Lactate dehydrogenase',mw:null,reason:'LDH is an enzyme activity assay, usually reported in U/L, not mass or molar concentration.'},'total protein':{name:'Total protein',mw:null,reason:'Total protein is a mixture of proteins and has no single molecular weight.'},'globulin':{name:'Globulin',mw:null,reason:'Globulin is a mixture of proteins and has no single molecular weight.'},'tibc':{name:'TIBC',mw:null,reason:'TIBC is a binding-capacity measurement, not a single molecular species.'},'uric acid':{name:'Uric acid',mw:168.11},'bilirubin':{name:'Total bilirubin',mw:584.66},'direct bilirubin':{name:'Direct bilirubin',mw:584.66},'lactate':{name:'Lactate',mw:90.08},'triglycerides':{name:'Triglycerides',mw:885.7},'vitamin b12':{name:'Vitamin B12',mw:1355.37},'b12':{name:'Vitamin B12',mw:1355.37},'25-oh vitamin d':{name:'25-OH Vitamin D',mw:400.64},'vitamin d3':{name:'Vitamin D3',mw:384.64},'t3':{name:'Total T3',mw:650.97},'total t3':{name:'Total T3',mw:650.97},'ft3':{name:'Free T3',mw:650.97},'free t3':{name:'Free T3',mw:650.97},'t4':{name:'Total T4',mw:776.87},'total t4':{name:'Total T4',mw:776.87},'ft4':{name:'Free T4',mw:776.87},'free t4':{name:'Free T4',mw:776.87},'testosterone':{name:'Testosterone',mw:288.42},'total testosterone':{name:'Testosterone',mw:288.42},'progesterone':{name:'Progesterone',mw:314.46},'estradiol':{name:'Estradiol (E2)',mw:272.38},'e2':{name:'Estradiol (E2)',mw:272.38},'cortisol':{name:'Cortisol',mw:362.46},'albumin':{name:'Albumin',mw:66500},'sodium':{name:'Sodium',mw:22.9898},'potassium':{name:'Potassium',mw:39.0983},'chloride':{name:'Chloride',mw:35.45},'calcium':{name:'Calcium',mw:40.078},'magnesium':{name:'Magnesium',mw:24.305},'phosphate':{name:'Phosphate',mw:94.97},'iron':{name:'Iron',mw:55.845},'ferritin':{name:'Ferritin',mw:null,reason:'Ferritin is heterogeneous; no single clinically reliable molecular weight is used for conversion.'},'prolactin':{name:'Prolactin (PRL)',mw:null,reason:'Prolactin has molecular variants and assay-specific calibration; use a validated laboratory conversion factor.'},'prl':{name:'Prolactin (PRL)',mw:null,reason:'Prolactin has molecular variants and assay-specific calibration; use a validated laboratory conversion factor.'},'procalcitonin':{name:'Procalcitonin (PCT)',mw:null,reason:'Use the assay-specific validated unit relationship; do not infer a molar conversion.'},'tsh':{name:'TSH',mw:null,reason:'TSH is normally reported in mIU/L or µIU/mL activity units, not mass or molar concentration.'},'lh':{name:'Luteinizing hormone (LH)',mw:null,reason:'LH is normally reported in IU/L; no universal mass-to-molar conversion is valid.'},'fsh':{name:'Follicle-stimulating hormone (FSH)',mw:null,reason:'FSH is normally reported in IU/L; no universal mass-to-molar conversion is valid.'},'anti tpo':{name:'Anti-TPO antibody',mw:null,reason:'Anti-TPO is reported in assay-specific IU/mL; no universal molecular-weight conversion exists.'},'anti-tpo':{name:'Anti-TPO antibody',mw:null,reason:'Anti-TPO is reported in assay-specific IU/mL; no universal molecular-weight conversion exists.'},'anti tg':{name:'Anti-thyroglobulin antibody',mw:null,reason:'Anti-TG is reported in assay-specific IU/mL; no universal molecular-weight conversion exists.'},'anti-tg':{name:'Anti-thyroglobulin antibody',mw:null,reason:'Anti-TG is reported in assay-specific IU/mL; no universal molecular-weight conversion exists.'}};
var labKind='mass',labSelections={mass:['mg/dL','g/L'],molar:['mmol/L','µmol/L']};
var labMassGroups=[
 {group:'Mass concentration units',units:[['Gram/liter (g/L)','g/L',1],['Gram/deciliter (g/dL)','g/dL',10],['Milligram/milliliter (mg/mL)','mg/mL',1],['Milligram/liter (mg/L)','mg/L',.001],['Milligram/deciliter (mg/dL)','mg/dL',.01],['Microgram/milliliter (µg/mL)','µg/mL',.001],['Microgram/liter (µg/L)','µg/L',1e-6],['Microgram/deciliter (µg/dL)','µg/dL',1e-5],['Nanogram/milliliter (ng/mL)','ng/mL',1e-6],['Nanogram/liter (ng/L)','ng/L',1e-9],['Picogram/milliliter (pg/mL)','pg/mL',1e-9]]}
];
var labMolarGroups=[{group:'Molar concentration units',units:[['Mole/liter (mol/L)','mol/L',1],['Millimole/liter (mmol/L)','mmol/L',1e-3],['Micromole/liter (µmol/L)','µmol/L',1e-6],['Nanomole/liter (nmol/L)','nmol/L',1e-9],['Picomole/liter (pmol/L)','pmol/L',1e-12]]}];
var labActivityGroups=[{group:'Hormone / antibody activity units',units:[['International unit/liter (IU/L)','IU/L',1],['Milli-international unit/liter (mIU/L)','mIU/L',1e-3],['International unit/milliliter (IU/mL)','IU/mL',1000],['Micro-international unit/milliliter (µIU/mL)','µIU/mL',.001]]}];
function allLabUnits(){return labMassGroups.concat(labMolarGroups,labActivityGroups).reduce(function(all,group){return all.concat(group.units.map(function(u){return {label:u[0],value:u[1],factor:u[2],group:group.group}}))},[])}
function labUnitInfo(value){return allLabUnits().find(function(u){return u.value===value})}
function setLabTrigger(id,value){var info=labUnitInfo(value);$(id).innerHTML=(info?info.label:'Select unit')+'<span>⌄</span>'}
function updateLabButtons(){var pair=labSelections[labKind];setLabTrigger('lab-from-trigger',pair[0]);setLabTrigger('lab-to-trigger',pair[1])}
function openLabPicker(target){unitPickerTarget=target;var groups=labMassGroups.concat(labMolarGroups,labActivityGroups),list=$('lab-picker-list');list.innerHTML='';$('lab-picker-title').textContent='Select unit';groups.forEach(function(group){var heading=document.createElement('div');heading.className='unit-picker-group';heading.textContent=group.group;list.appendChild(heading);group.units.forEach(function(unit){var button=document.createElement('button');button.type='button';button.className='unit-picker-option'+(labSelections[labKind][target==='lab-from'?0:1]===unit[1]?' selected':'');button.textContent=unit[0];button.addEventListener('click',function(){var pair=labSelections[labKind].slice();pair[target==='lab-from'?0:1]=unit[1];labSelections[labKind]=pair;updateLabButtons();closeLabPicker()});list.appendChild(button)})});$('lab-picker-overlay').classList.remove('hidden');document.body.style.overflow=''}
function closeLabPicker(){$('lab-picker-overlay').classList.add('hidden');document.body.style.overflow=''}
function renderLabModes(){document.querySelectorAll('[data-lab-kind]').forEach(function(button){var active=button.dataset.labKind===labKind;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})}
document.querySelectorAll('[data-lab-kind]').forEach(function(button){button.addEventListener('click',function(){
 labKind=button.dataset.labKind;renderLabModes();
 var calculations=labKind==='calculations';
 $('lab-conversion-workspace').classList.toggle('hidden',calculations);
 $('lab-calculations-workspace').classList.toggle('hidden',!calculations);
 if(!calculations){labSelections[labKind]=labSelections[labKind]|| (labKind==='mass'?['mg/dL','g/L']:['mmol/L','µmol/L']);updateLabButtons();$('lab-result').textContent='—';$('lab-formula').textContent='';$('lab-status').textContent=labKind==='mass'?'Mass concentration mode selected.':'Molar concentration mode selected.';$('lab-status').className='status-line'}
 })});
updateLabButtons();renderLabModes();renderMolarOptions();
document.querySelectorAll('[data-lab-concentration]').forEach(function(button){button.addEventListener('click',function(){labKind=button.dataset.labConcentration;document.querySelectorAll('[data-lab-concentration]').forEach(function(b){var on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});$('lab-mass-workspace').classList.toggle('hidden',labKind!=='mass');$('lab-molar-workspace').classList.toggle('hidden',labKind!=='molar');if(labKind==='mass'){labSelections.mass=labSelections.mass||['mg/dL','g/L'];updateLabButtons();$('lab-status').textContent='Mass concentration mode selected.';$('lab-status').className='status-line'}else{$('lab-molar-status').textContent='Molar concentration mode selected.';$('lab-molar-status').className='status-line'}})});

$('lab-from-trigger').addEventListener('click',function(){openLabPicker('lab-from')});
$('lab-to-trigger').addEventListener('click',function(){openLabPicker('lab-to')});
$('lab-picker-cancel').addEventListener('click',closeLabPicker);
$('lab-picker-overlay').addEventListener('click',function(e){if(e.target===$('lab-picker-overlay'))closeLabPicker()});
$('lab-mw-mode').addEventListener('change',function(){$('lab-mw-manual-wrap').classList.toggle('hidden',this.value!=='manual')});
function getAnalyte(){return analytes[$('lab-test').value.trim().toLowerCase()]||null}
$('lab-test').addEventListener('input',function(){var a=getAnalyte();$('lab-analyte-note').textContent=a?(a.mw?'Selected '+a.name+' · approximate molecular weight '+a.mw+' g/mol. Verify the analyte, specimen and method.':a.name+' · '+a.reason):'Choose a listed analyte or enter a verified molecular weight manually. Activity-unit assays cannot be converted to molar concentration.'});
$('lab-convert').addEventListener('click',function(){
 var raw=$('lab-value').value,v=Number(raw),pair=labSelections[labKind],from=pair[0],to=pair[1],fromInfo=labUnitInfo(from),toInfo=labUnitInfo(to),result,formula='';
 if(raw===''||!Number.isFinite(v)){$('lab-status').textContent='Enter a valid result value.';$('lab-status').className='status-line error';return}
 if(!fromInfo||!toInfo){$('lab-status').textContent='Select valid source and target units.';$('lab-status').className='status-line error';return}
 var fromMass=fromInfo.group===labMassGroups[0].group,toMass=toInfo.group===labMassGroups[0].group,fromMolar=fromInfo.group===labMolarGroups[0].group,toMolar=toInfo.group===labMolarGroups[0].group,fromActivity=fromInfo.group===labActivityGroups[0].group,toActivity=toInfo.group===labActivityGroups[0].group;
 if(fromActivity||toActivity){if(!fromActivity||!toActivity){$('lab-status').textContent='Activity units (IU, mIU, µIU) cannot be converted to mass or molar concentration. Select activity units on both sides.';$('lab-status').className='status-line error';return}result=v*fromInfo.factor/toInfo.factor;formula='Activity-unit scaling: '+from+' → '+to+'. Assay calibration is unchanged.'}
 else if(fromMass&&toMass){result=v*fromInfo.factor/toInfo.factor;formula='Mass concentration: '+from+' → '+to+'.'}
 else if(fromMolar&&toMolar){result=v*fromInfo.factor/toInfo.factor;formula='Molar concentration: '+from+' → '+to+'.'}
 else if((fromMass&&toMolar)||(fromMolar&&toMass)){
  var selectedAnalyte=getAnalyte();if(selectedAnalyte&&selectedAnalyte.mw===null){$('lab-status').textContent=selectedAnalyte.reason+' Select activity units where applicable, or use a validated assay-specific conversion.';$('lab-status').className='status-line error';return}var mw;if($('lab-mw-mode').value==='manual')mw=Number($('lab-mw').value);else{var analyte=selectedAnalyte;mw=analyte&&analyte.mw?analyte.mw:NaN}
  if(!(mw>0)||!Number.isFinite(mw)){$('lab-status').textContent='Select a supported analyte or enter molecular weight in g/mol for mass ↔ molar conversion.';$('lab-status').className='status-line error';return}
  if(fromMass){var gramsPerLiter=v*fromInfo.factor;result=(gramsPerLiter/mw)/toInfo.factor;formula='Mass → molar: '+v+' '+from+' × '+fromInfo.factor+' g/L ÷ '+mw+' g/mol, then scaled to '+to+'.'}
  else{var molesPerLiter=v*fromInfo.factor;result=(molesPerLiter*mw)/toInfo.factor;formula='Molar → mass: '+v+' '+from+' × '+fromInfo.factor+' mol/L × '+mw+' g/mol, then scaled to '+to+'.'}
 }
 if(!Number.isFinite(result)){$('lab-status').textContent='Conversion could not be calculated.';$('lab-status').className='status-line error';return}
 $('lab-result').textContent=Number(result.toPrecision(10)).toLocaleString(undefined,{maximumFractionDigits:10})+' '+to;pulse('lab-result');$('lab-formula').textContent=formula;$('lab-status').textContent='Lab conversion complete. Confirm analyte, specimen and method-specific units before clinical use.';$('lab-status').className='status-line success'
});
$('lab-swap')&&$('lab-swap').addEventListener('click',function(){var pair=labSelections[labKind].slice();labSelections[labKind]=[pair[1],pair[0]];updateLabButtons()});


var molarProfiles={
'glucose':{source:'mg/dL',mw:180.156},'urea':{source:'mg/dL',mw:60.06},'creatinine':{source:'mg/dL',mw:113.12},'total cholesterol':{source:'mg/dL',mw:386.65},'triglycerides':{source:'mg/dL',mw:885.7},'uric acid':{source:'mg/dL',mw:168.11},'bilirubin':{source:'mg/dL',mw:584.66},'lactate':{source:'mg/dL',mw:90.08},'vitamin b12':{source:'pg/mL',mw:1355.37},'25-oh vitamin d':{source:'ng/mL',mw:400.64},'vitamin d3':{source:'ng/mL',mw:384.64},'t3':{source:'ng/dL',mw:650.97},'t4':{source:'µg/dL',mw:776.87},'ft3':{source:'pg/mL',mw:650.97},'ft4':{source:'ng/dL',mw:776.87},'testosterone':{source:'ng/dL',mw:288.42},'progesterone':{source:'ng/mL',mw:314.46},'estradiol / e2':{source:'pg/mL',mw:272.38},'cortisol':{source:'µg/dL',mw:362.46},'albumin':{source:'g/dL',mw:66500},'sodium':{source:'mmol/L',directMolar:true},'potassium':{source:'mmol/L',directMolar:true},'chloride':{source:'mmol/L',directMolar:true},'calcium':{source:'mg/dL',mw:40.078},'magnesium':{source:'mg/dL',mw:24.305},'phosphate':{source:'mg/dL',mw:94.97},'iron':{source:'µg/dL',mw:55.845},
'ferritin':{source:'ng/mL',reason:'Ferritin is heterogeneous; no single clinically valid molecular weight exists. Use mass units.'},'prolactin / prl':{source:'ng/mL',reason:'Prolactin molecular forms and assay calibration vary. Use mass units or an assay-validated factor.'},'procalcitonin':{source:'ng/mL',reason:'Use mass concentration units for procalcitonin; a generic molar conversion is not validated.'},'tsh':{source:'µIU/mL',activity:true,reason:'TSH is calibrated in immunoassay activity units; no universal activity-to-molar conversion exists.'},'lh':{source:'IU/L',activity:true,reason:'LH is calibrated in IU/L; no universal activity-to-molar conversion exists.'},'fsh':{source:'IU/L',activity:true,reason:'FSH is calibrated in IU/L; no universal activity-to-molar conversion exists.'},'anti tpo':{source:'IU/mL',activity:true,reason:'Anti-TPO is assay-specific IU/mL; do not convert it to molar concentration.'},'anti tg':{source:'IU/mL',activity:true,reason:'Anti-TG is assay-specific IU/mL; do not convert it to molar concentration.'}};
var molarMassFactors={'g/L':1,'g/dL':10,'mg/mL':1,'mg/L':.001,'mg/dL':.01,'µg/mL':.001,'µg/L':1e-6,'µg/dL':1e-5,'ng/mL':1e-6,'ng/L':1e-9,'pg/mL':1e-9};
var molarFactors={'mol/L':1,'mmol/L':1e-3,'µmol/L':1e-6,'nmol/L':1e-9,'pmol/L':1e-12};
var activityFactors={'IU/L':1,'mIU/L':.001,'IU/mL':1000,'µIU/mL':.001,'µIU/L':1e-6};
var molarTest=$('lab-molar-test'),molarOut=$('lab-molar-output-unit');
function renderMolarOptions(){var key=molarTest.value.trim().toLowerCase(),p=molarProfiles[key];molarOut.innerHTML='<option value="">Select output unit</option>';$('lab-molar-result').textContent='—';if(!p){$('lab-molar-source-note').textContent='Choose a test to display its expected source unit.';return}$('lab-molar-source-note').textContent='Expected input unit for '+molarTest.value+': '+p.source+'. Enter the reported result in this unit.';var opts=p.activity?Object.keys(activityFactors):p.directMolar?Object.keys(molarFactors):p.mw?Object.keys(molarFactors):Object.keys(molarMassFactors);opts.forEach(function(u){var o=document.createElement('option');o.value=u;o.textContent=u;molarOut.appendChild(o)});molarOut.value=p.activity?p.source:p.directMolar?'mmol/L':p.mw?'nmol/L':'µg/L'}
molarTest.addEventListener('change',renderMolarOptions);
$('lab-molar-convert').addEventListener('click',function(){var raw=$('lab-molar-value').value,v=Number(raw),p=molarProfiles[molarTest.value.trim().toLowerCase()],u=molarOut.value;function fail(m){$('lab-molar-status').textContent=m;$('lab-molar-status').className='status-line error';$('lab-molar-result').textContent='—'}if(raw===''||!Number.isFinite(v)||v<0)return fail('Enter a valid non-negative result.');if(!p)return fail('Select a test.');if(!u)return fail('Select an output unit.');var result,formula;if(p.activity){if(!(u in activityFactors))return fail(p.reason);result=v*activityFactors[p.source]/activityFactors[u];formula='Activity-unit scaling: '+v+' '+p.source+' → '+u+'. This is not a molar conversion.'}else if(p.directMolar){if(!(u in molarFactors))return fail('Choose a molar output unit.');result=v*molarFactors[p.source]/molarFactors[u];formula='Molar unit scaling: '+v+' '+p.source+' → '+u+'.'}else if(p.mw){if(!(u in molarFactors))return fail('Choose a molar output unit.');var gL=v*molarMassFactors[p.source];result=(gL/p.mw)/molarFactors[u];formula=v+' '+p.source+' = '+gL+' g/L; ÷ '+p.mw+' g/mol, then scaled to '+u+'.'}else{if(!(u in molarMassFactors))return fail(p.reason);result=v*molarMassFactors[p.source]/molarMassFactors[u];formula='Mass-unit conversion only: '+v+' '+p.source+' → '+u+'. '+p.reason}if(!Number.isFinite(result))return fail('Conversion is outside the supported numerical range.');$('lab-molar-result').textContent=Number(result.toPrecision(10)).toLocaleString(undefined,{maximumFractionDigits:10})+' '+u;$('lab-molar-formula').textContent=formula;$('lab-molar-status').textContent='Converted. Verify the assay, specimen and reporting unit before clinical use.';$('lab-molar-status').className='status-line success';pulse('lab-molar-result')});

/* Derived clinical calculations. HOMA1-IR is a linear approximation, not Oxford HOMA2. */
var labCalcDefinitions={
 quicki:{title:'QUICKI is a logarithmic fasting insulin-sensitivity index. Use fasting plasma insulin in µIU/mL and glucose in mg/dL.',formula:'QUICKI = 1 ÷ [log10(fasting insulin) + log10(fasting glucose)].',fields:[['insulin','Fasting insulin (µIU/mL)','number','10'],['glucose','Fasting glucose (mg/dL)','number','90']]},
 fib4:{title:'FIB-4 is a non-invasive fibrosis risk stratification score for selected adult populations. It is not a diagnosis.',formula:'FIB-4 = age × AST ÷ [platelets × √ALT]. AST/ALT in U/L; platelets in 10⁹/L.',fields:[['age','Age (years)','number','45'],['ast','AST (U/L)','number','35'],['alt','ALT (U/L)','number','40'],['platelets','Platelets (10⁹/L)','number','220']]},
 eag:{title:'Converts HbA1c to estimated average glucose using the ADAG relationship. It is an estimate, not a substitute for measured glucose.',formula:'eAG (mg/dL) = 28.7 × HbA1c (%) − 46.7.',fields:[['hba1c','HbA1c (%)','number','7']]},
 mentzer:{title:'Mentzer index is a screening aid for microcytosis, not a definitive distinction between iron deficiency and thalassaemia trait.',formula:'Mentzer index = MCV (fL) ÷ RBC count (10¹²/L).',fields:[['mcv','MCV (fL)','number','70'],['rbc','RBC count (10¹²/L)','number','5']]},
 tsat:{title:'Transferrin saturation estimates the fraction of transferrin iron-binding capacity occupied by iron. Iron and TIBC must use the same units.',formula:'TSAT (%) = serum iron ÷ TIBC × 100.',fields:[['iron','Serum iron','number','80'],['tibc','TIBC','number','320']]},
 homa:{title:'HOMA1 estimates insulin resistance (IR), insulin sensitivity (%S) and beta-cell function (%B) from fasting insulin and glucose. This is the original linear HOMA1 model, not Oxford HOMA2.',formula:'HOMA1-IR = insulin × glucose (mmol/L) ÷ 22.5. HOMA1-%S = 100 ÷ HOMA1-IR. HOMA1-%B = 20 × insulin ÷ [glucose (mmol/L) − 3.5].',fields:[['insulin','Fasting insulin (µIU/mL)','number','2'],['glucose','Fasting glucose','number','90'],['glucoseUnit','Glucose unit','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]]]},
 egfr:{title:'Adult race-free 2021 CKD-EPI creatinine equation. Intended for age 18 years and older.',formula:'eGFR = 142 × min(SCr/κ,1)^α × max(SCr/κ,1)^−1.200 × 0.9938^Age × 1.012 (female). κ = 0.7 female / 0.9 male; α = −0.241 female / −0.302 male.',fields:[['age','Age (years)','number','45'],['sex','Sex used by equation','select','male',[['male','Male'],['female','Female']]],['creatinine','Serum creatinine','number','1.0'],['creatinineUnit','Creatinine unit','select','mg/dL',[['mg/dL','mg/dL'],['µmol/L','µmol/L']]]]},
 crcl:{title:'Cockcroft–Gault estimates creatinine clearance. This is not the same as indexed eGFR.',formula:'CrCl = [(140 − age) × weight (kg)] ÷ [72 × SCr (mg/dL)]; multiply by 0.85 for female.',fields:[['age','Age (years)','number','45'],['sex','Sex used by equation','select','male',[['male','Male'],['female','Female']]],['weight','Body weight (kg)','number','70'],['creatinine','Serum creatinine','number','1.0'],['creatinineUnit','Creatinine unit','select','mg/dL',[['mg/dL','mg/dL'],['µmol/L','µmol/L']]]]},
 fena:{title:'FENa uses paired urine and serum sodium and creatinine concentrations. Samples should be collected close together.',formula:'FENa (%) = (urine Na × serum creatinine) ÷ (serum Na × urine creatinine) × 100.',fields:[['urineNa','Urine sodium (mmol/L)','number','20'],['serumNa','Serum sodium (mmol/L)','number','140'],['serumCr','Serum creatinine','number','1.0'],['urineCr','Urine creatinine','number','100'],['creatinineUnit','Creatinine unit for both values','select','mg/dL',[['mg/dL','mg/dL'],['µmol/L','µmol/L']]]]},
 anion:{title:'Calculates the anion gap without potassium, with optional albumin correction.',formula:'AG = Na − (Cl + HCO₃). Albumin-corrected AG = AG + 2.5 × (4.0 − albumin [g/dL]).',fields:[['sodium','Sodium (mmol/L)','number','140'],['chloride','Chloride (mmol/L)','number','104'],['bicarbonate','Bicarbonate / CO₂ (mmol/L)','number','24'],['albumin','Albumin (optional, g/dL)','number','4']]},
 calcium:{title:'Albumin-adjusted total calcium. This is an estimate; ionized calcium is preferred when protein binding is abnormal or the patient is critically ill.',formula:'Corrected Ca (mg/dL) = measured Ca + 0.8 × (4.0 − albumin [g/dL]).',fields:[['calcium','Measured total calcium','number','9.0'],['calciumUnit','Calcium unit','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]],['albumin','Albumin','number','3.5'],['albuminUnit','Albumin unit','select','g/dL',[['g/dL','g/dL'],['g/L','g/L']]]]},
 sodium:{title:'Reports both the classic Katz (1.6) and Hillier (2.4) glucose correction estimates.',formula:'Corrected Na = measured Na + factor × [(glucose − 100) ÷ 100], with glucose in mg/dL. Factors shown: 1.6 and 2.4.',fields:[['sodium','Measured sodium (mmol/L)','number','130'],['glucose','Blood glucose','number','400'],['glucoseUnit','Glucose unit','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]]]},
 osmolality:{title:'Calculated serum osmolality from sodium, glucose and serum urea.',formula:'Calculated osmolality = 2 × Na + glucose (mmol/L) + urea (mmol/L). If glucose is mg/dL, divide by 18; if urea is mg/dL, divide by 6.006.',fields:[['sodium','Sodium (mmol/L)','number','140'],['glucose','Glucose','number','100'],['glucoseUnit','Glucose unit','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]],['urea','Serum urea','number','30'],['ureaUnit','Urea unit','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]]]},
 ionized:{title:'Enter a measured ionized calcium result and convert units. Direct ion-selective electrode measurement remains the accurate method.',formula:'1 mmol/L ionized calcium = 4.008 mg/dL.',fields:[['ionized','Measured ionized calcium','number','1.20'],['ionizedUnit','Ionized calcium unit','select','mmol/L',[['mmol/L','mmol/L'],['mg/dL','mg/dL']]]]},
 estimatedIonized:{title:'Approximate ionized calcium using the formula supplied: total calcium × 6 ÷ (albumin + 6). Calcium must be mg/dL and albumin g/dL. This is not a validated substitute for direct ionized calcium measurement.',formula:'Estimated iCa ≈ (total calcium × 6) ÷ (albumin + 6).',fields:[['totalCalcium','Total serum calcium (mg/dL)','number','9.0'],['albumin','Albumin (g/dL)','number','4.0']]},
 buncr:{title:'BUN-to-creatinine ratio using both inputs in mg/dL.',formula:'BUN/Creatinine ratio = BUN ÷ serum creatinine.',fields:[['bun','BUN (mg/dL)','number','14'],['creatinine','Serum creatinine (mg/dL)','number','1.0']]},
 globulin:{title:'Derived globulin and albumin-to-globulin ratio from measured total protein and albumin.',formula:'Globulin = total protein − albumin. A/G ratio = albumin ÷ globulin.',fields:[['protein','Total protein (g/dL)','number','7.0'],['albumin','Albumin (g/dL)','number','4.0']]},
 ldl:{title:'Friedewald calculated LDL cholesterol. Use a consistent unit for all three lipid values.',formula:'LDL-C = total cholesterol − HDL-C − triglycerides/5 (mg/dL), or TG/2.2 (mmol/L). Do not use when TG ≥400 mg/dL (4.52 mmol/L).',fields:[['total','Total cholesterol','number','180'],['hdl','HDL cholesterol','number','45'],['triglycerides','Triglycerides','number','150'],['lipidUnit','Lipid unit for all values','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]]]},
 nonhdl:{title:'Non-HDL cholesterol from total cholesterol and HDL-C.',formula:'Non-HDL-C = total cholesterol − HDL-C.',fields:[['total','Total cholesterol','number','180'],['hdl','HDL cholesterol','number','45'],['lipidUnit','Lipid unit','select','mg/dL',[['mg/dL','mg/dL'],['mmol/L','mmol/L']]]]},
 cholratio:{title:'Total cholesterol to HDL-C ratio. Risk marker, not a standalone treatment target.',formula:'TC/HDL ratio = total cholesterol ÷ HDL-C.',fields:[['total','Total cholesterol','number','180'],['hdl','HDL cholesterol','number','45']]},
 deritis:{title:'AST/ALT (De Ritis) ratio. Interpret with absolute enzyme activities and clinical context.',formula:'De Ritis ratio = AST ÷ ALT.',fields:[['ast','AST (U/L)','number','35'],['alt','ALT (U/L)','number','40']]},
 apri:{title:'APRI is a non-invasive fibrosis risk score, not a diagnosis.',formula:'APRI = [(AST ÷ AST ULN) × 100] ÷ platelets (10⁹/L).',fields:[['ast','AST (U/L)','number','35'],['astuln','AST upper limit of normal (U/L)','number','40'],['platelets','Platelets (10⁹/L)','number','220']]},
 rratio:{title:'R ratio compares ALT and ALP relative to their upper reference limits.',formula:'R = (ALT ÷ ALT ULN) ÷ (ALP ÷ ALP ULN).',fields:[['alt','ALT (U/L)','number','80'],['altuln','ALT upper limit of normal (U/L)','number','40'],['alp','ALP (U/L)','number','140'],['alpuln','ALP upper limit of normal (U/L)','number','120']]}
};
function renderLabCalcFields(){
 var key=$('lab-calc-type').value,def=labCalcDefinitions[key],root=$('lab-calc-fields');root.replaceChildren();$('lab-calc-description').textContent=def.title;
 def.fields.forEach(function(field){
  var wrap=document.createElement('div');wrap.className='field';
  var label=document.createElement('label');label.htmlFor='lab-calc-'+field[0];label.textContent=field[1];wrap.appendChild(label);
  var input;
  if(field[2]==='select'){
   input=document.createElement('select');input.className='glass-select';
   field[4].forEach(function(option){var opt=document.createElement('option');opt.value=option[0];opt.textContent=option[1];input.appendChild(opt)});
  }else{input=document.createElement('input');input.className='glass-input';input.type='number';input.step='any';input.inputMode='decimal';input.min='0';}
  input.id='lab-calc-'+field[0];input.dataset.calcField=field[0];if(field[2]!=='select'){input.dataset.virtualKeyboard='true';input.inputMode='none';}input.value=field[3];wrap.appendChild(input);root.appendChild(wrap);
 });
}
function calcNumber(key){var el=$('lab-calc-'+key);if(!el||el.value.trim()==='')return NaN;return Number(el.value)}
function calcUnit(key){var el=$('lab-calc-'+key);return el?el.value:''}
function calcFail(message){$('lab-calc-result').textContent='—';$('lab-calc-formula').textContent='';$('lab-calc-status').textContent=message;$('lab-calc-status').className='status-line error'}
function calcSuccess(result,formula,note){$('lab-calc-result').textContent=result;pulse('lab-calc-result');$('lab-calc-formula').textContent=formula;$('lab-calc-status').textContent=note;$('lab-calc-status').className='status-line success'}
function positiveFields(keys){for(var i=0;i<keys.length;i++){var v=calcNumber(keys[i]);if(!Number.isFinite(v)||v<=0)return false}return true}
function runLabCalc(){
 var key=$('lab-calc-type').value,age,sex,scr,glucose,albumin,unit,mg,mmol,result,formula,note;
 if(key==='homa'){
  if(!positiveFields(['insulin','glucose']))return calcFail('Enter positive fasting insulin and fasting glucose values.');
  var fastingInsulin=calcNumber('insulin');
  glucose=calcNumber('glucose');mmol=calcUnit('glucoseUnit')==='mmol/L'?glucose:glucose/18.0182;
  var homaIR=fastingInsulin*mmol/22.5;
  if(!Number.isFinite(homaIR)||homaIR<=0)return calcFail('Unable to calculate HOMA1 indices from these values.');
  var homaSensitivity=100/homaIR,betaAvailable=mmol>3.5,homaBeta=betaAvailable?20*fastingInsulin/(mmol-3.5):NaN;
  return calcSuccess('IR: '+homaIR.toFixed(2)+'  |  Sensitivity: '+homaSensitivity.toFixed(1)+'%  |  Beta function: '+(betaAvailable?homaBeta.toFixed(1)+'%':'not calculable'),'HOMA1-IR = insulin × glucose (mmol/L) ÷ 22.5. HOMA1-%S = 100 ÷ HOMA1-IR. HOMA1-%B = 20 × insulin ÷ (glucose − 3.5).','HOMA1 linear estimate only, not Oxford HOMA2. '+(betaAvailable?'All three HOMA1 outputs were calculated.':'HOMA1-%B is undefined at fasting glucose ≤3.5 mmol/L; IR and sensitivity are still shown.')+' Use paired fasting samples. These indices are not standalone diagnostic cut-offs and must not guide treatment alone.');
 }
 if(key==='quicki'){if(!positiveFields(['insulin','glucose']))return calcFail('Enter positive fasting insulin and glucose values.');var quicki=1/(Math.log10(calcNumber('insulin'))+Math.log10(calcNumber('glucose')));return calcSuccess(quicki.toFixed(4),'QUICKI = 1 ÷ [log10(fasting insulin µIU/mL) + log10(fasting glucose mg/dL)].','Research index only. Use paired fasting plasma values and assay-consistent inputs; no universal diagnostic cut-off.');}
 if(key==='fib4'){if(!positiveFields(['age','ast','alt','platelets']))return calcFail('Enter positive age, AST, ALT and platelet values.');if(calcNumber('age')<18||calcNumber('age')>120)return calcFail('FIB-4 input age must be 18–120 years.');var fib=calcNumber('age')*calcNumber('ast')/(calcNumber('platelets')*Math.sqrt(calcNumber('alt')));return calcSuccess(fib.toFixed(2),'FIB-4 = age × AST ÷ [platelets × √ALT].','Use only in an appropriate adult clinical context. Performance is limited in acute illness and some age groups; interpret with validated local pathways and follow-up tests.');}
 if(key==='eag'){var a1c=calcNumber('hba1c');if(!Number.isFinite(a1c)||a1c<3||a1c>20)return calcFail('Enter HbA1c between 3% and 20% for this estimate.');var eag=28.7*a1c-46.7;return calcSuccess(eag.toFixed(0)+' mg/dL · '+(eag/18.0182).toFixed(1)+' mmol/L','eAG (mg/dL) = 28.7 × HbA1c (%) − 46.7.','Estimated population-average relationship. Conditions affecting red-cell lifespan or haemoglobin variants can make HbA1c/eAG misleading.');}
 if(key==='mentzer'){if(!positiveFields(['mcv','rbc']))return calcFail('Enter positive MCV and RBC count.');var mi=calcNumber('mcv')/calcNumber('rbc');return calcSuccess(mi.toFixed(2),'Mentzer index = MCV (fL) ÷ RBC count (10¹²/L).','Screening clue only. It cannot confirm iron deficiency or thalassaemia; correlate with ferritin, iron studies, smear and haemoglobin analysis.');}
 if(key==='tsat'){if(!positiveFields(['iron','tibc']))return calcFail('Enter positive serum iron and TIBC in the same units.');var sat=calcNumber('iron')/calcNumber('tibc')*100;return calcSuccess(sat.toFixed(1)+'%','TSAT (%) = serum iron ÷ TIBC × 100.','Interpret with ferritin, inflammation, transferrin and clinical context. Use matched units and specimen timing. Values above 100% are possible but should prompt verification of units and results.');}
 if(key==='egfr'||key==='crcl'){
  age=calcNumber('age');sex=calcUnit('sex');scr=calcNumber('creatinine');
  if(!Number.isFinite(age)||age<18||age>120||!Number.isFinite(scr)||scr<=0)return calcFail('Enter age 18–120 years and a positive serum creatinine.');
  if(calcUnit('creatinineUnit')==='µmol/L')scr/=88.4;
  if(key==='egfr'){
   var female=sex==='female',k=female?.7:.9,alpha=female?-.241:-.302,ratio=scr/k;
   result=142*Math.pow(Math.min(ratio,1),alpha)*Math.pow(Math.max(ratio,1),-1.2)*Math.pow(.9938,age)*(female?1.012:1);
   return calcSuccess(result.toFixed(1)+' mL/min/1.73 m²','2021 CKD-EPI creatinine equation (race-free). SCr converted to mg/dL using 88.4 µmol/L per mg/dL.','Adult estimate only; intended for standardized IDMS-traceable creatinine. Not validated here for pregnancy, children, rapidly changing creatinine or extremes of muscle mass. A single eGFR does not diagnose chronic kidney disease.');
  }
  var weight=calcNumber('weight');if(!Number.isFinite(weight)||weight<=0)return calcFail('Enter a positive body weight in kilograms.');
  result=((140-age)*weight)/(72*scr)*(sex==='female'?.85:1);
  return calcSuccess(result.toFixed(1)+' mL/min','Cockcroft–Gault estimate. Creatinine converted to mg/dL before calculation.','Creatinine clearance estimate, not indexed eGFR. Drug dosing decisions require the applicable product and clinical guidance.');
 }
 if(key==='fena'){
  if(!positiveFields(['urineNa','serumNa','serumCr','urineCr']))return calcFail('Enter positive paired urine/serum sodium and creatinine values.');
  result=(calcNumber('urineNa')*calcNumber('serumCr'))/(calcNumber('serumNa')*calcNumber('urineCr'))*100;
  return calcSuccess(result.toFixed(2)+'%','FENa = (urine Na × serum creatinine) ÷ (serum Na × urine creatinine) × 100.','Interpret cautiously: diuretics, CKD, sepsis and several renal conditions reduce diagnostic reliability. Urine and serum samples should be paired.');
 }
 if(key==='anion'){
  if(!positiveFields(['sodium','chloride','bicarbonate']))return calcFail('Enter positive sodium, chloride and bicarbonate values.');
  var ag=calcNumber('sodium')-calcNumber('chloride')-calcNumber('bicarbonate');
  albumin=calcNumber('albumin');
  if($('lab-calc-albumin')&&$('lab-calc-albumin').value.trim()!==''&&Number.isFinite(albumin)&&albumin>0){
   var corrected=ag+2.5*(4-albumin);
   return calcSuccess('AG '+ag.toFixed(1)+' · Albumin-corrected '+corrected.toFixed(1)+' mmol/L','AG = Na − (Cl + HCO₃). Corrected AG = AG + 2.5 × (4 − albumin [g/dL]).','Albumin correction is an estimate; interpret with laboratory method, clinical context and acid–base assessment.');
  }
  return calcSuccess(ag.toFixed(1)+' mmol/L','AG = Na − (Cl + HCO₃), without potassium.','Albumin was not entered, so no albumin correction was applied.');
 }
 if(key==='calcium'){
  if(!positiveFields(['calcium','albumin']))return calcFail('Enter positive total calcium and albumin values.');
  var ca=calcNumber('calcium'),alb=calcNumber('albumin');
  if(calcUnit('albuminUnit')==='g/L')alb/=10;
  if(calcUnit('calciumUnit')==='mmol/L')ca*=4.008;
  var correctedCa=ca+.8*(4-alb);
  var out=calcUnit('calciumUnit')==='mmol/L'?(correctedCa/4.008).toFixed(2)+' mmol/L':correctedCa.toFixed(2)+' mg/dL';
  return calcSuccess(out,'Corrected Ca = measured Ca + 0.8 × (4.0 − albumin [g/dL]).','Rough estimate only. Albumin-correction equations can be inaccurate in critical illness or abnormal protein binding; consider measured ionized calcium.');
 }
 if(key==='sodium'){
  if(!positiveFields(['sodium','glucose']))return calcFail('Enter positive sodium and glucose values.');
  glucose=calcNumber('glucose');mg=calcUnit('glucoseUnit')==='mmol/L'?glucose*18.0182:glucose;
  var corrected16=calcNumber('sodium')+1.6*(mg-100)/100,corrected24=calcNumber('sodium')+2.4*(mg-100)/100;
  return calcSuccess('Katz: '+corrected16.toFixed(1)+' · Hillier: '+corrected24.toFixed(1)+' mmol/L','Corrected Na = measured Na + factor × [(glucose mg/dL − 100) ÷ 100].','Both commonly used correction factors are shown because the estimate varies with the formula and clinical setting.');
 }
 if(key==='osmolality'){
  if(!positiveFields(['sodium','glucose','urea']))return calcFail('Enter positive sodium, glucose and serum urea values.');
  glucose=calcNumber('glucose');var glucoseMmol=calcUnit('glucoseUnit')==='mmol/L'?glucose:glucose/18.0182;
  var urea=calcNumber('urea'),ureaMmol=calcUnit('ureaUnit')==='mmol/L'?urea:urea/6.006;
  result=2*calcNumber('sodium')+glucoseMmol+ureaMmol;
  return calcSuccess(result.toFixed(1)+' mOsm/kg','Calculated osmolality = 2 × Na + glucose (mmol/L) + urea (mmol/L). Glucose mg/dL ÷ 18.018; urea mg/dL ÷ 6.006.','Uses total serum urea, not BUN. Use values from the same sample; measured osmolality is required to calculate an osmolal gap.');
 }
 if(key==='estimatedIonized'){if(!positiveFields(['totalCalcium','albumin']))return calcFail('Enter positive total calcium and albumin values.');var totalCa=calcNumber('totalCalcium'),albuminForIca=calcNumber('albumin');var estimatedIca=totalCa*6/(albuminForIca+6);return calcSuccess(estimatedIca.toFixed(2)+' mg/dL (estimated)','Estimated iCa ≈ (total calcium × 6) ÷ (albumin + 6). Inputs: calcium mg/dL; albumin g/dL.','Approximation only, not a universal validated equation. Protein binding, pH and clinical state affect ionized calcium. Direct ion-selective electrode measurement is preferred; do not use this estimate in place of measured iCa for clinical decisions.');}
 if(key==='ionized'){if(!positiveFields(['ionized']))return calcFail('Enter a positive measured ionized calcium result.');var ion=calcNumber('ionized'),io=calcUnit('ionizedUnit')==='mmol/L'?ion*4.008:ion/4.008;return calcSuccess(calcUnit('ionizedUnit')==='mmol/L'?io.toFixed(2)+' mg/dL':io.toFixed(3)+' mmol/L','Measured ionized calcium conversion: 1 mmol/L = 4.008 mg/dL.','Converts a measured result only. Ionized calcium cannot be reliably calculated from total calcium and albumin. Follow analyser reference interval and sample handling requirements.');}
 if(key==='buncr'){if(!positiveFields(['bun','creatinine']))return calcFail('Enter positive BUN and creatinine values in mg/dL.');return calcSuccess((calcNumber('bun')/calcNumber('creatinine')).toFixed(2),'BUN/Creatinine ratio = BUN ÷ serum creatinine.','Both inputs must be in mg/dL. This ratio is nonspecific and requires clinical context.');}
 if(key==='globulin'){if(!positiveFields(['protein','albumin']))return calcFail('Enter positive total protein and albumin values.');var tp=calcNumber('protein'),alb2=calcNumber('albumin'),glob=tp-alb2;if(glob<=0)return calcFail('Total protein must be greater than albumin.');return calcSuccess('Globulin: '+glob.toFixed(2)+' g/dL · A/G ratio: '+(alb2/glob).toFixed(2),'Globulin = total protein − albumin. A/G ratio = albumin ÷ globulin.','Derived chemistry indices only. Verify units and laboratory reference intervals.');}
 if(key==='nonhdl'){if(!positiveFields(['total','hdl']))return calcFail('Enter positive total cholesterol and HDL-C values.');var nh=calcNumber('total')-calcNumber('hdl');if(nh<0)return calcFail('HDL-C cannot exceed total cholesterol. Check values and units.');return calcSuccess(nh.toFixed(2)+(calcUnit('lipidUnit')==='mmol/L'?' mmol/L':' mg/dL'),'Non-HDL-C = total cholesterol − HDL-C.','Use values from the same specimen and identical units. Interpret with overall cardiovascular risk.');}
 if(key==='cholratio'){if(!positiveFields(['total','hdl']))return calcFail('Enter positive total cholesterol and HDL-C values.');return calcSuccess((calcNumber('total')/calcNumber('hdl')).toFixed(2),'TC/HDL-C ratio = total cholesterol ÷ HDL-C.','Risk marker only, not a diagnosis or independent treatment target.');}
 if(key==='deritis'){if(!positiveFields(['ast','alt']))return calcFail('Enter positive AST and ALT activities.');return calcSuccess((calcNumber('ast')/calcNumber('alt')).toFixed(2),'De Ritis ratio = AST ÷ ALT.','Interpret alongside absolute enzyme values, reference intervals and clinical context.');}
 if(key==='apri'){if(!positiveFields(['ast','astuln','platelets']))return calcFail('Enter positive AST, AST ULN and platelet count.');var apri=((calcNumber('ast')/calcNumber('astuln'))*100)/calcNumber('platelets');return calcSuccess(apri.toFixed(2),'APRI = [(AST ÷ AST ULN) × 100] ÷ platelets (10⁹/L).','Non-invasive risk score only. Use validated population-specific pathways; not a diagnosis.');}
 if(key==='rratio'){if(!positiveFields(['alt','altuln','alp','alpuln']))return calcFail('Enter positive ALT, ALT ULN, ALP and ALP ULN.');var rr=(calcNumber('alt')/calcNumber('altuln'))/(calcNumber('alp')/calcNumber('alpuln'));return calcSuccess('R ratio: '+rr.toFixed(2)+' · Pattern: '+(rr>=5?'hepatocellular':rr<=2?'cholestatic':'mixed'),'R = (ALT ÷ ALT ULN) ÷ (ALP ÷ ALP ULN).','Pattern classification aid. Use contemporaneous ALT/ALP and laboratory ULNs; investigate clinically.');}
 if(key==='ldl'){
  if(!positiveFields(['total','hdl','triglycerides']))return calcFail('Enter positive total cholesterol, HDL and triglycerides.');
  var tc=calcNumber('total'),hdl=calcNumber('hdl'),tg=calcNumber('triglycerides'),si=calcUnit('lipidUnit')==='mmol/L';
  var tgMg=si?tg*88.57:tg;
  if(tgMg>=400)return calcFail('Friedewald LDL is not valid when triglycerides are ≥400 mg/dL (4.52 mmol/L). Use a validated alternative or direct LDL measurement.');
  result=si?tc-hdl-tg/2.2:tc-hdl-tg/5;
  if(result<0)return calcFail('Calculated LDL is negative. Check the input units and values; do not report this result.');
  return calcSuccess(result.toFixed(2)+(si?' mmol/L':' mg/dL'),'Friedewald: LDL-C = total cholesterol − HDL-C − TG/5 (mg/dL), or TG/2.2 (mmol/L).','Friedewald estimate. It may be inaccurate with non-fasting samples, high triglycerides or altered lipoprotein composition.');
 }
}
$('lab-calc-type').addEventListener('change',function(){renderLabCalcFields();$('lab-calc-result').textContent='—';$('lab-calc-formula').textContent='Select a calculation and enter the required values.';$('lab-calc-status').textContent='Ready to calculate.';$('lab-calc-status').className='status-line'});
$('lab-calc-run').addEventListener('click',runLabCalc);
$('lab-calc-reset').addEventListener('click',function(){renderLabCalcFields();$('lab-calc-result').textContent='—';$('lab-calc-formula').textContent='Select a calculation and enter the required values.';$('lab-calc-status').textContent='Values reset.';$('lab-calc-status').className='status-line'});
renderLabCalcFields();

/* Pointer-driven key feedback: release, cancel or leaving the app clears enlargement. */
var pressedCalcKey=null;
function clearCalcKeyPress(){if(pressedCalcKey){pressedCalcKey.classList.remove('is-pressed');pressedCalcKey=null}}
document.addEventListener('pointerdown',function(e){var key=e.target.closest('.calc-keys button');if(!key||key.disabled)return;clearCalcKeyPress();pressedCalcKey=key;key.classList.add('is-pressed')},{passive:true});
window.addEventListener('pointerup',clearCalcKeyPress,{passive:true});
window.addEventListener('pointercancel',clearCalcKeyPress,{passive:true});
window.addEventListener('blur',clearCalcKeyPress);
document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(!$('unit-picker-overlay').classList.contains('hidden'))closeUnitPicker();if(!$('lab-picker-overlay').classList.contains('hidden'))closeLabPicker()}});

/* Shared touch-friendly numeric keypad for every numeric converter and clinical field. */
(function(){
 var pad=$('virtual-keypad'),target=null;
 if(!pad)return;
 function eligible(el){return el&&el.matches('input')&&(el.dataset.virtualKeyboard==='true'||el.type==='number'||el.inputMode==='decimal')&&!el.readOnly&&!el.disabled;}
 function open(el){if(!eligible(el))return;target=el;var t=$('virtual-keypad-toggle');if(t)t.setAttribute('aria-pressed',String(!pad.classList.contains('hidden')));}
 function close(blur){pad.classList.add('hidden');var old=target;target=null;var t=$('virtual-keypad-toggle');if(t)t.setAttribute('aria-pressed','false');if(blur&&old)old.blur();}
 document.addEventListener('focusin',function(e){if(eligible(e.target))open(e.target);else if(!e.target.closest('#virtual-keypad')&&!e.target.closest('#virtual-keypad-toggle'))close(false);});
 document.addEventListener('click',function(e){var el=e.target.closest('input');if(el&&eligible(el))open(el);var t=e.target.closest('#virtual-keypad-toggle');if(t){if(pad.classList.contains('hidden')){if(!target){target=document.activeElement;if(!eligible(target))target=document.querySelector('.tool-panel.active input[data-virtual-keyboard="true"]')}if(target)pad.classList.remove('hidden')}else close(false);t.setAttribute('aria-pressed',String(!pad.classList.contains('hidden')));}});
 function update(value){if(!target)return;var input=target,current=input.value||'';
 if(value==='clear')current='';
 else if(value==='back')current=current.slice(0,-1);
 else if(value==='done'){close(true);return;}
 else if(value==='-'){current=current.startsWith('-')?current.slice(1):'-'+current;}
 else if(value==='.' ){if(current.includes('.'))return;current=current?current+'.':'0.';}
 else current+=value;
 input.value=current;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 pad.addEventListener('pointerdown',function(e){if(e.target.closest('button'))e.preventDefault()});
 pad.addEventListener('click',function(e){var b=e.target.closest('[data-vk]');if(b)update(b.dataset.vk)});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pad.classList.contains('hidden'))close(false)});
})();
})();