import {duels,peaks} from './data.js';
import {shuffle,pointsFor,parseCSV,buildDuelDeck,createRoundQueue,normalizeSettings} from './engine.js';
import {topicImages} from './images.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function topicVisual(name,compact=false){
  const image=topicImages[name]||topicImages[name.replace(/:\s*\(.*\)$/, '').trim()];
  return image?`<span class="topic-visual${compact?' compact':''}"><img src="${escape(image)}" alt="" decoding="async" draggable="false"></span>`:'<span class="topic-visual custom-visual" aria-hidden="true">Custom trend</span>';
}
let mode='duel',deck=[],index=0,score=0,streak=0,maxStreak=0,results=[],answered=false,done=false,imported=null;
let revealing=false,animationController=new AbortController(),recentPairs=[];
let settings=normalizeSettings(),sessionLimit=0,completed=0,correctAnswers=0,roundQueue;
try{settings=normalizeSettings(JSON.parse(localStorage.getItem('trendduel-settings')||'{}'));}catch{}
try{const saved=JSON.parse(localStorage.getItem('trendduel-recent-pairs')||'[]');if(Array.isArray(saved))recentPairs=saved.filter(v=>typeof v==='string').slice(-40);}catch{}
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function animate(duration,update){
  const signal=animationController.signal;
  return new Promise(resolve=>{
    if(signal.aborted){resolve(false);return;}
    if(reducedMotion.matches||duration===0){update(1);resolve(true);return;}
    let frame;const began=performance.now();
    const abort=()=>{cancelAnimationFrame(frame);resolve(false);};signal.addEventListener('abort',abort,{once:true});
    function tick(now){const t=Math.min((now-began)/duration,1);update(1-Math.pow(1-t,3));if(t<1)frame=requestAnimationFrame(tick);else{signal.removeEventListener('abort',abort);resolve(true);}}
    frame=requestAnimationFrame(tick);
  });
}
let best=0;try{best=Number(localStorage.getItem('trendduel-best-v1'))||0;}catch{}
function start(nextMode=mode){
  animationController.abort();animationController=new AbortController();revealing=false;
  mode=nextMode;index=score=streak=maxStreak=0;results=[];answered=done=false;
  completed=correctAnswers=0;sessionLimit=mode==='duel'&&imported?1:settings.length;
  roundQueue=createRoundQueue(()=>mode==='duel'?(imported?[{...imported,topics:shuffle(imported.topics)}]:buildDuelDeck(duels,recentPairs)):shuffle(peaks).map(r=>({...r,options:shuffle(r.options)})));
  deck=roundQueue.nextBatch();
  $('duel-mode').classList.toggle('active',mode==='duel');$('calendar-mode').classList.toggle('active',mode==='peak');
  $('duel-mode').setAttribute('aria-pressed',mode==='duel');$('calendar-mode').setAttribute('aria-pressed',mode==='peak');
  $('data').innerHTML=mode==='duel'&&imported?'Imported CSV <span>ⓘ</span>':'Demo dataset <span>ⓘ</span>';
  render();
}
function stats(){
  $('round').textContent=String(Math.max(1,completed+(done||answered&&!revealing?0:1))).padStart(2,'0');$('total').textContent=sessionLimit?`/ ${sessionLimit}`:'/ ∞';
  $('session-label').textContent=sessionLimit?`${sessionLimit} round${sessionLimit===1?'':'s'}`:'Endless session';
  $('end-session').disabled=completed===0||revealing||done;
  $('score').textContent=score;$('streak').innerHTML=`${streak} <span class="flame">ϟ</span>`;
  $('best').innerHTML=`PERSONAL BEST <strong>${best}</strong>`;
  $('progress').innerHTML=results.map(win=>`<i class="${win?'win':'loss'}"></i>`).join('')+(!done?'<i class="current"></i>':'');
  $('progress').setAttribute('aria-label',`${completed} rounds answered, ${correctAnswers} correct. Recent results shown.`);
}
function render(){
  stats();const r=deck[index];
  $('meta').innerHTML=mode==='duel'?`<span>◎ ${escape(r.region)}</span><span>▦ ${escape(r.period)}</span>`:`<span>◎ Worldwide</span><span>▦ ${r.year}</span><span>Illustrative curve</span>`;
  $('question').textContent=mode==='duel'?'Which was searched more?':`What peaked in ${r.peak} ${r.year}?`;
  $('hint').textContent=mode==='duel'?'Pick the higher average search interest.':'Read the curve. Name the moment.';
  $('play-area').innerHTML=mode==='duel'?`<div class="duel">${r.topics.map((t,i)=>`<button class="trend-card" data-choice="${i}" aria-label="Choose ${escape(t.name)}"><div class="card-top"><span class="category">${escape(t.category)}</span><span class="key">${i+1}</span></div>${topicVisual(t.name)}<h3>${escape(t.name)}</h3><div class="card-caption">${r.demo?'Search term · demo round':'Search term · imported comparison'}</div><div class="card-bottom"><span class="value-label">I think this was bigger</span><b>↗</b></div></button>`).join('')}<div class="versus" aria-hidden="true">VS</div></div>`:peakHTML(r);
  $('play-area').querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.choice))));
  $('feedback').className='feedback';$('feedback').innerHTML=`<span>Make your move.</span><span class="keyboard-tip">Use <kbd>1</kbd>–<kbd>${mode==='duel'?2:4}</kbd> to choose</span>`;
}
function peakHTML(r){
  const pts=r.values.map((v,i)=>`${20+i*60},${130-v*1.1}`).join(' ');
  return `<div class="chart-panel"><div class="chart-caption"><span>Relative interest · illustrative</span><span>100 — peak</span></div><svg viewBox="0 0 700 145" preserveAspectRatio="none" role="img" aria-label="Illustrative monthly search interest in ${r.year}: ${r.values.map((v,i)=>`${['January','February','March','April','May','June','July','August','September','October','November','December'][i]} ${v}`).join(', ')}"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d9ff65" stop-opacity=".25"/><stop offset="100%" stop-color="#d9ff65" stop-opacity="0"/></linearGradient></defs>${[20,75,130].map(y=>`<line x1="20" x2="680" y1="${y}" y2="${y}" stroke="#3d4048" stroke-dasharray="3 6"/>`).join('')}<polygon points="20,130 ${pts} 680,130" fill="url(#fill)"/><polyline points="${pts}" fill="none" stroke="#d9ff65" stroke-width="3" vector-effect="non-scaling-stroke"/>${r.values.map((v,i)=>v===100?`<circle cx="${20+i*60}" cy="20" r="5" fill="#d9ff65"/>`:'').join('')}</svg><div class="months"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></div><div class="options">${r.options.map((v,i)=>`<button class="option" data-choice="${i}">${topicVisual(v,true)}<span>${escape(v)}</span></button>`).join('')}</div>`;
}
async function choose(choice){
  if(answered||done||!Number.isInteger(choice)||choice<0||choice>=(mode==='duel'?2:4))return;
  answered=true;revealing=true;const r=deck[index];const winner=mode==='duel'?(r.topics[0].value>r.topics[1].value?0:1):r.options.indexOf(r.answer);
  $('end-session').disabled=true;
  const buttons=[...$('play-area').querySelectorAll('[data-choice]')];
  buttons.forEach((b,i)=>{b.disabled=true;b.classList.toggle('picked',i===choice);});
  $('feedback').className='feedback';$('feedback').innerHTML='<span class="revealing-label">Revealing the result<span>…</span></span>';
  if(mode==='duel'){
    const total=r.topics.reduce((sum,t)=>sum+t.value,0);
    buttons.forEach(b=>{b.querySelector('.card-bottom').innerHTML='<div class="reveal-result"><div class="reveal-numbers"><strong class="interest">0%</strong><span class="index-value">0.0 / 100</span></div><div class="interest-track"><span></span></div><small>Share of this pair’s interest</small></div>';});
    const revealed=await animate(settings.reveal,t=>buttons.forEach((b,i)=>{const share=r.topics[i].value/total*100;b.querySelector('.interest').textContent=`${(share*t).toFixed(1)}%`;b.querySelector('.index-value').textContent=`${(r.topics[i].value*t).toFixed(1)} / 100`;b.querySelector('.interest-track span').style.width=`${share*t}%`;}));
    if(!revealed)return;
  }else if(!await animate(Math.min(settings.reveal,550),()=>{}))return;
  const oldScore=score;
  const correct=choice===winner;completed++;if(correct)correctAnswers++;results=[...results,correct].slice(-10);streak=correct?streak+1:0;maxStreak=Math.max(maxStreak,streak);const points=correct?pointsFor(streak):0;score+=points;
  if(mode==='duel'&&!imported){recentPairs=[...recentPairs,r.id].slice(-40);try{localStorage.setItem('trendduel-recent-pairs',JSON.stringify(recentPairs));}catch{}}
  // Keep demo records separate from imported single-comparison sessions.
  if(!(mode==='duel'&&imported)&&score>best){best=score;try{localStorage.setItem('trendduel-best-v1',String(best));}catch{}}
  buttons.forEach((b,i)=>{b.classList.remove('picked');b.classList.add(i===winner?'correct':i===choice?'incorrect':'dim');});
  const explanation=mode==='duel'?`${r.topics[winner].name} wins this ${r.demo?'demo comparison':'imported comparison'}.`:r.note;
  $('feedback').className=`feedback ${correct?'good':'bad'}`;
  $('feedback').innerHTML=`<span><strong>${correct?`Nice instinct! +${points}`:'Not this time.'}</strong> ${escape(explanation)}${mode==='duel'?`<br><a class="reveal-link" target="_blank" rel="noopener noreferrer" href="https://trends.google.com/trends/explore?q=${encodeURIComponent(r.topics.map(t=>t.name).join(','))}">Explore these terms on Google Trends ↗</a>`:''}</span><button class="next" id="next">${sessionLimit&&completed>=sessionLimit?'See results':'Next round'} →</button>`;
  revealing=false;stats();$('next').addEventListener('click',next);if(!$('info-dialog').open)$('next').focus({preventScroll:true});
  const scoreElement=$('score');void animate(600,t=>{scoreElement.textContent=Math.round(oldScore+(score-oldScore)*t);});
}
function next(){if(!answered||done||revealing)return;animationController.abort();animationController=new AbortController();if(sessionLimit&&completed>=sessionLimit){finish();return;}index++;if(index>=deck.length){deck=roundQueue.nextBatch();index=0;}answered=false;render();$('play-area').querySelector('button').focus({preventScroll:true});}
function finish(){
  if(revealing||completed===0||done)return;
  animationController.abort();animationController=new AbortController();done=true;stats();const count=correctAnswers;const pct=Math.round(count/completed*100);
  $('meta').innerHTML='<span>SESSION COMPLETE</span>';$('question').textContent=pct>=80?'You know the internet.':pct>=50?'Your instincts are warming up.':'The internet is full of surprises.';$('hint').textContent='Another round of curiosity?';
  $('play-area').innerHTML=`<div class="summary"><div class="big-score">${score}</div><h3>points of internet intuition</h3><div class="summary-stats"><span><strong>${count}/${completed}</strong>Correct picks</span><span><strong>${pct}%</strong>Accuracy</span><span><strong>${maxStreak}</strong>Best streak</span></div><button id="replay" class="primary">Play again ↗</button><p>${mode==='duel'&&imported?'Based on your imported comparison.':'Demo session · values and curves are illustrative.'}</p></div>`;
  $('feedback').className='feedback';$('feedback').innerHTML='<span>Stay curious. Trends never stand still.</span><span>✳</span>';$('replay').addEventListener('click',()=>start());$('replay').focus({preventScroll:true});
  const finalScore=$('play-area').querySelector('.big-score');void animate(1000,t=>{finalScore.textContent=Math.round(score*t);});
}
function openSettings(){
  $('info-dialog').querySelector('.eyebrow').textContent='SESSION SETTINGS';
  $('dialog-content').innerHTML=`<h2>Your session, your rules.</h2><form id="settings-form"><label for="session-mode">Game mode</label><select id="session-mode"><option value="duel">Trend Duel</option><option value="peak">Guess the Peak</option></select><label for="session-length">Session length</label><select id="session-length"><option value="0">Endless — keep playing</option><option value="10">10 rounds</option><option value="25">25 rounds</option><option value="50">50 rounds</option><option value="100">100 rounds</option></select><label for="reveal-speed">Result reveal</label><select id="reveal-speed"><option value="650">Quick</option><option value="1450">Normal</option><option value="2200">Suspenseful</option><option value="0">Instant</option></select><p>Endless play reshuffles the available questions into a new cycle when they run out. Use End session whenever you want your results.</p>${imported?'<p>Your imported comparison is one round in Trend Duel. Guess the Peak uses the demo dataset.</p>':''}<p>Starting a new session resets your current score. These preferences stay on this device; an unfinished game is not saved.</p><div class="settings-actions"><button type="button" class="quiet" id="cancel-settings">Keep playing</button><button type="submit" class="primary">Start new session →</button></div></form>`;
  $('session-mode').value=mode;$('session-length').value=String(settings.length);$('reveal-speed').value=String(settings.reveal);
  $('cancel-settings').addEventListener('click',()=>$('info-dialog').close());
  $('settings-form').addEventListener('submit',e=>{e.preventDefault();settings=normalizeSettings({mode:$('session-mode').value,length:Number($('session-length').value),reveal:Number($('reveal-speed').value)});const selectedMode=$('session-mode').value;try{localStorage.setItem('trendduel-settings',JSON.stringify(settings));}catch{}$('info-dialog').close();start(selectedMode);});
  $('info-dialog').showModal();
}
function openInfo(kind){
  $('info-dialog').querySelector('.eyebrow').textContent=kind==='help'?'HOW TO PLAY':'ABOUT THE DATA';
  $('dialog-content').innerHTML=kind==='help'?`<h2>Follow your instinct.</h2><ol><li><strong>Trend Duel:</strong> choose the term with higher average search interest for the shown place and period.</li><li><strong>Guess the Peak:</strong> match the chart’s biggest spike to an event or search term.</li><li>Earn 100 points per correct answer. Consecutive wins add 25 bonus points per round, up to 225 points.</li></ol><p>Play endlessly by default, or choose a round count in Session settings. End session shows your results whenever you are ready. There is no timer. Use number keys to pick and Enter to continue. Switching modes starts a new session.</p><p>The built-in rounds use invented values and illustrative curves. Import a Google Trends comparison to play with your own data.</p>`:`<h2>Good games. Honest data.</h2><p>The built-in dataset is a <strong>playable demo</strong>. Its values, rankings and curves are invented for gameplay; they are not verified Google Trends measurements.</p><p>Reveal percentages show the share of each term within the two displayed interest indices, not a percentage of all Google searches. The original 0–100 indices appear beside them.</p><p>Google Trends reports normalized interest from 0 to 100, not absolute search counts. Only compare terms from the <strong>same export, location and time window</strong>.</p><p><a href="https://support.google.com/trends/answer/4365533?hl=en" target="_blank" rel="noopener noreferrer">How Google Trends data works ↗</a></p><h3>Play a real comparison</h3><p>In <a href="https://trends.google.com/trends/explore?hl=en" target="_blank" rel="noopener noreferrer">Google Trends</a>, compare exactly two terms. Set your country and period, then download the English “Interest over time” CSV. Import it for a single-round duel using the average of each exported series. Values below 1 count as 0.5; tied comparisons are rejected.</p><label for="csv-file">Import a Google Trends CSV (up to 2 MB)</label><input id="csv-file" type="file" accept=".csv,text/csv"><p id="import-status" role="status"></p><p>Your file stays in this browser. The import resets when you reload. Check the term labels for the exported location.</p>${imported?'<button id="reset-data" class="text-button">Return to demo dataset</button>':''}`;
  if(kind==='data'){
    $('csv-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2*1024*1024)throw new Error('Please select a CSV smaller than 2 MB.');const parsed=parseCSV(await file.text());imported=parsed;start('duel');$('info-dialog').close();}catch(err){$('import-status').textContent=err.message;}});
    $('reset-data')?.addEventListener('click',()=>{imported=null;start('duel');$('info-dialog').close();});
  }
  $('info-dialog').showModal();
}
$('help').addEventListener('click',()=>openInfo('help'));$('data').addEventListener('click',()=>openInfo('data'));$('footer-data').addEventListener('click',()=>openInfo('data'));$('close-dialog').addEventListener('click',()=>$('info-dialog').close());
$('duel-mode').addEventListener('click',()=>{if(mode!=='duel')start('duel');});$('calendar-mode').addEventListener('click',()=>{if(mode!=='peak')start('peak');});
$('settings').addEventListener('click',openSettings);$('end-session').addEventListener('click',finish);
document.addEventListener('keydown',e=>{if($('info-dialog').open||e.ctrlKey||e.metaKey||e.altKey||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(Number(e.key)-1);}else if(e.key==='Enter'&&answered&&!done){e.preventDefault();next();}});
start(settings.mode);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_trend_game',description:'Read the current Trend Duel question and choices, without revealing the answer.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({mode,round:completed+(answered&&!revealing?0:1),score,answered,done,question:$('question').textContent,choices:done?[]:mode==='duel'?deck[index].topics.map(t=>t.name):deck[index].options})})).catch(()=>{});}catch{}}
