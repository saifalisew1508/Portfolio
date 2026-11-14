(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function pulse(id){if(reduced)return;var el=$(id);el.classList.remove('updated');void el.offsetWidth;el.classList.add('updated')}
/* Reusable dashboard navigation */
var panels=Array.from(document.querySelectorAll('.tool-panel')),cards=Array.from(document.querySelectorAll('.nav-card[data-panel]'));
function activatePanel(id){panels.forEach(function(p){p.classList.toggle('active',p.id===id)});cards.forEach(function(c){var active=c.dataset.panel===id;c.classList.toggle('active',active);c.setAttribute('aria-pressed',String(active))});if(id==='math')$('calc-display').setAttribute('aria-label','Calculator display');}
cards.forEach(function(c){c.addEventListener('click',function(){activatePanel(c.dataset.panel)})});
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
 document.querySelectorAll('[data-calc-mode]').forEach(function(button){var active=button.dataset.calcMode===mode;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});
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
 numberSystem:[
  {group:'Number Systems',units:[
   ['Binary BIN','2'],['Octal OCT','8'],['Decimal DEC','10'],['Hexadecimal HEX','16']
  ]}
 ]
};
var unitCategoryMeta={
 currency:['Currency','i-currency'],length:['Length','i-length'],area:['Area','i-area'],volume:['Volume','i-volume'],mass:['Weight','i-weight'],
 temperature:['Temperature','i-temperature'],speed:['Speed','i-speed'],pressure:['Pressure','i-pressure'],
 power:['Power','i-power'],energy:['Energy','i-energy'],time:['Time','i-time'],numberSystem:['Number system','i-number']
};
var unitCategory='length',unitSelections={},unitPickerTarget='unit-from',unitSearchValue='';
var unitDefaults={length:['m','km'],area:['m2','ha'],volume:['l','ml'],mass:['kg','g'],temperature:['C','F'],speed:['m/s','km/h'],pressure:['kPa','mmHg'],power:['W','kW'],energy:['J','kJ'],time:['s','min'],numberSystem:['2','10']};
function allUnits(category){return unitCatalog[category].reduce(function(all,group){return all.concat(group.units.map(function(u){return {label:u[0],value:u[1],factor:u[2],group:group.group}}))},[])}
function unitInfo(category,value){return allUnits(category).find(function(u){return u.value===value})}
function setUnitButton(id,category,value){var info=unitInfo(category,value);$(id).innerHTML=(info?info.label:'Select unit')+'<span>⌄</span>'}
function currentUnitPair(){return unitSelections[unitCategory]||unitDefaults[unitCategory]}
function updateUnitButtons(){var pair=currentUnitPair();setUnitButton('unit-from-trigger',unitCategory,pair[0]);setUnitButton('unit-to-trigger',unitCategory,pair[1]);$('unit-value').type=unitCategory==='numberSystem'?'text':'number';$('unit-value').inputMode=unitCategory==='numberSystem'?'text':'decimal';$('unit-value').placeholder=unitCategory==='numberSystem'?'Enter a number in selected base':'Enter a value'}
function renderUnitCategories(){
 var root=$('unit-pills');root.innerHTML='';
 Object.keys(unitCategoryMeta).forEach(function(key){
  var meta=unitCategoryMeta[key],button=document.createElement('button');button.type='button';button.className='category-pill'+(key===unitCategory?' active':'');button.dataset.category=key;
  button.innerHTML='<svg aria-hidden="true"><use href="#'+meta[1]+'"></use></svg><span>'+meta[0]+'</span>';
  button.addEventListener('click',function(){if(key==='currency'){activatePanel('currency');if(matchMedia('(pointer:coarse)').matches)button.blur();return}unitCategory=key;unitSelections[key]=unitDefaults[key].slice();renderUnitCategories();updateUnitButtons();$('unit-result').textContent='—';$('unit-formula').textContent='';$('unit-status').textContent=meta[0]+' selected.';$('unit-status').className='status-line';if(matchMedia('(pointer:coarse)').matches)button.blur()});
  root.appendChild(button)
 });
}
function openUnitPicker(target){
 unitPickerTarget=target;unitSearchValue='';$('unit-picker-search').value='';$('unit-picker-search-wrap').classList.toggle('hidden',unitCategory==='numberSystem');
 $('unit-picker-title').textContent='Select unit';renderUnitPicker();$('unit-picker-overlay').classList.remove('hidden');document.body.style.overflow='hidden';
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
function closeUnitPicker(){$('unit-picker-overlay').classList.add('hidden');document.body.style.overflow=''}
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
var analytes={'glucose':{name:'Glucose',mw:180.156},'urea':{name:'Urea',mw:60.06},'creatinine':{name:'Creatinine',mw:113.12},'cholesterol':{name:'Cholesterol',mw:386.65},'uric acid':{name:'Uric acid',mw:168.11},'bilirubin':{name:'Bilirubin',mw:584.66},'lactate':{name:'Lactate',mw:90.08},'triglycerides':{name:'Triglycerides',mw:885.7}};
var labKind='mass',labSelections={mass:['mg/dL','g/L'],molar:['mmol/L','µmol/L']};
var labMassGroups=[
 {group:'Mass concentration units',units:[['Gram/liter (g/L)','g/L',1],['Gram/deciliter (g/dL)','g/dL',10],['Milligram/milliliter (mg/mL)','mg/mL',1],['Milligram/liter (mg/L)','mg/L',.001],['Milligram/deciliter (mg/dL)','mg/dL',.01],['Microgram/milliliter (µg/mL)','µg/mL',.001],['Microgram/liter (µg/L)','µg/L',1e-6],['Microgram/deciliter (µg/dL)','µg/dL',1e-5],['Nanogram/milliliter (ng/mL)','ng/mL',1e-6],['Nanogram/liter (ng/L)','ng/L',1e-9],['Picogram/milliliter (pg/mL)','pg/mL',1e-9]]}
];
var labMolarGroups=[
 {group:'Molar concentration units',units:[['Mole/liter (mol/L)','mol/L',1],['Millimole/liter (mmol/L)','mmol/L',1e-3],['Micromole/liter (µmol/L)','µmol/L',1e-6],['Nanomole/liter (nmol/L)','nmol/L',1e-9],['Picomole/liter (pmol/L)','pmol/L',1e-12]]}
];
function allLabUnits(){return labMassGroups.concat(labMolarGroups).reduce(function(all,group){return all.concat(group.units.map(function(u){return {label:u[0],value:u[1],factor:u[2],group:group.group}}))},[])}
function labUnitInfo(value){return allLabUnits().find(function(u){return u.value===value})}
function setLabTrigger(id,value){var info=labUnitInfo(value);$(id).innerHTML=(info?info.label:'Select unit')+'<span>⌄</span>'}
function updateLabButtons(){var pair=labSelections[labKind];setLabTrigger('lab-from-trigger',pair[0]);setLabTrigger('lab-to-trigger',pair[1])}
function openLabPicker(target){unitPickerTarget=target;var groups=labMassGroups.concat(labMolarGroups),list=$('lab-picker-list');list.innerHTML='';$('lab-picker-title').textContent='Select unit';groups.forEach(function(group){var heading=document.createElement('div');heading.className='unit-picker-group';heading.textContent=group.group;list.appendChild(heading);group.units.forEach(function(unit){var button=document.createElement('button');button.type='button';button.className='unit-picker-option'+(labSelections[labKind][target==='lab-from'?0:1]===unit[1]?' selected':'');button.textContent=unit[0];button.addEventListener('click',function(){var pair=labSelections[labKind].slice();pair[target==='lab-from'?0:1]=unit[1];labSelections[labKind]=pair;updateLabButtons();closeLabPicker()});list.appendChild(button)})});$('lab-picker-overlay').classList.remove('hidden');document.body.style.overflow='hidden'}
function closeLabPicker(){$('lab-picker-overlay').classList.add('hidden');document.body.style.overflow=''}
function renderLabModes(){document.querySelectorAll('[data-lab-kind]').forEach(function(button){var active=button.dataset.labKind===labKind;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})}
document.querySelectorAll('[data-lab-kind]').forEach(function(button){button.addEventListener('click',function(){labKind=button.dataset.labKind;labSelections[labKind]=labSelections[labKind]|| (labKind==='mass'?['mg/dL','g/L']:['mmol/L','µmol/L']);renderLabModes();updateLabButtons();$('lab-result').textContent='—';$('lab-formula').textContent='';$('lab-status').textContent=labKind==='mass'?'Mass concentration mode selected.':'Molar concentration mode selected.';$('lab-status').className='status-line'})});
updateLabButtons();renderLabModes();
$('lab-from-trigger').addEventListener('click',function(){openLabPicker('lab-from')});
$('lab-to-trigger').addEventListener('click',function(){openLabPicker('lab-to')});
$('lab-picker-cancel').addEventListener('click',closeLabPicker);
$('lab-picker-overlay').addEventListener('click',function(e){if(e.target===$('lab-picker-overlay'))closeLabPicker()});
$('lab-mw-mode').addEventListener('change',function(){$('lab-mw-manual-wrap').classList.toggle('hidden',this.value!=='manual')});
function getAnalyte(){return analytes[$('lab-test').value.trim().toLowerCase()]||null}
$('lab-test').addEventListener('input',function(){var a=getAnalyte();$('lab-analyte-note').textContent=a?'Selected '+a.name+' · preset molecular weight '+a.mw+' g/mol. Verify the analyte and method before clinical use.':'Select a listed analyte or enter molecular weight manually.'});
$('lab-convert').addEventListener('click',function(){
 var raw=$('lab-value').value,v=Number(raw),pair=labSelections[labKind],from=pair[0],to=pair[1],fromInfo=labUnitInfo(from),toInfo=labUnitInfo(to),result,formula='';
 if(raw===''||!Number.isFinite(v)){$('lab-status').textContent='Enter a valid result value.';$('lab-status').className='status-line error';return}
 if(!fromInfo||!toInfo){$('lab-status').textContent='Select valid source and target units.';$('lab-status').className='status-line error';return}
 var fromMass=fromInfo.group===labMassGroups[0].group,toMass=toInfo.group===labMassGroups[0].group;
 if(fromMass&&toMass){result=v*fromInfo.factor/toInfo.factor;formula='Mass concentration: '+from+' → '+to+'.'}
 else if(!fromMass&&!toMass){result=v*fromInfo.factor/toInfo.factor;formula='Molar concentration: '+from+' → '+to+'.'}
 else{
  var mw;if($('lab-mw-mode').value==='manual')mw=Number($('lab-mw').value);else{var analyte=getAnalyte();mw=analyte?analyte.mw:NaN}
  if(!(mw>0)||!Number.isFinite(mw)){$('lab-status').textContent='Select a supported analyte or enter molecular weight in g/mol for mass ↔ molar conversion.';$('lab-status').className='status-line error';return}
  if(fromMass){var gramsPerLiter=v*fromInfo.factor;result=(gramsPerLiter/mw)/toInfo.factor;formula='Mass → molar: '+v+' '+from+' × '+fromInfo.factor+' g/L ÷ '+mw+' g/mol, then scaled to '+to+'.'}
  else{var molesPerLiter=v*fromInfo.factor;result=(molesPerLiter*mw)/toInfo.factor;formula='Molar → mass: '+v+' '+from+' × '+fromInfo.factor+' mol/L × '+mw+' g/mol, then scaled to '+to+'.'}
 }
 if(!Number.isFinite(result)){$('lab-status').textContent='Conversion could not be calculated.';$('lab-status').className='status-line error';return}
 $('lab-result').textContent=Number(result.toPrecision(10)).toLocaleString(undefined,{maximumFractionDigits:10})+' '+to;pulse('lab-result');$('lab-formula').textContent=formula;$('lab-status').textContent='Lab conversion complete. Confirm analyte, specimen and method-specific units before clinical use.';$('lab-status').className='status-line success'
});
$('lab-swap')&&$('lab-swap').addEventListener('click',function(){var pair=labSelections[labKind].slice();labSelections[labKind]=[pair[1],pair[0]];updateLabButtons()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(!$('unit-picker-overlay').classList.contains('hidden'))closeUnitPicker();if(!$('lab-picker-overlay').classList.contains('hidden'))closeLabPicker()}});
})();