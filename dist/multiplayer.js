import {duels,peaks} from './data.js';
import {buildDuelDeck,shuffle} from './engine.js';
import {topicImages} from './images.js';
import {formats,canStart,cleanName,roomSettings} from './multiplayer-engine.js';
import {RoomConnection,parseCode} from './rtc-room.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let room=null,state=null,selfId=null,isHost=false,lastRevision=-1,viewKey='',submittedRound=0,deadline=0,animationEpoch=0,lost=false,busy=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
try{$('player-name').value=localStorage.getItem('trendduel-player-name')||'';}catch{}
const invite=parseCode(new URLSearchParams(location.hash.slice(1)).get('room'));if(invite)$('join-code').value=invite;
function status(message,error=false){$('connection-status').textContent=message;$('connection-status').classList.toggle('error',error);}
function lockEntry(value){busy=value;$('create-room').disabled=$('join-room').disabled=value;$('cancel-connect').hidden=!value;}
function image(name,compact=false){const src=topicImages[name];return src?`<span class="topic-visual${compact?' compact':''}"><img src="${esc(src)}" alt="" draggable="false"></span>`:'';}
function makeQuestions(mode){let pending=[];return ()=>{if(!pending.length)pending=mode==='duel'?buildDuelDeck(duels):shuffle(peaks).map(q=>({...q,options:shuffle(q.options)}));return pending.pop();};}
async function connect(join){
 if(busy)return;const name=cleanName($('player-name').value);if(!name){status('Choose a nickname first.',true);$('player-name').focus();return;}
 const code=join?parseCode($('join-code').value):null;if(join&&!code){status('Enter the 10-character room code from your host.',true);return;}
 try{localStorage.setItem('trendduel-player-name',name);}catch{}
 const config=roomSettings({format:$('room-format').value,mode:$('room-mode').value,rounds:Number($('room-length').value),seconds:Number($('room-time').value)});
 room?.close();state=null;lastRevision=-1;viewKey='';submittedRound=0;lost=false;lockEntry(true);
 const current=new RoomConnection({onState:(s,id,host,roomCode)=>{if(room!==current)return;state=s;selfId=id;isHost=host;deadline=performance.now()+s.remainingMs;lockEntry(false);$('room-entry').hidden=true;$('room-live').hidden=false;$('live-code').textContent=roomCode;render();},onStatus:message=>{if(room===current)status(message);},onClosed:message=>{if(room!==current)return;lost=true;animationEpoch++;lockEntry(false);status(message,true);if(state){$('room-controls').innerHTML='<p>Connection lost. Leave this room to play again.</p>';$('mp-play').querySelectorAll('button').forEach(b=>b.disabled=true);$('mp-clock').textContent='Disconnected';}else{$('room-entry').hidden=false;}}});
 room=current;
 try{await current.open({name,code,config,makeQuestion:makeQuestions(config.mode)});}catch(error){if(room===current){current.close();lockEntry(false);status(error.message,true);}}
}
function leave(){room?.close();room=null;state=null;lost=false;animationEpoch++;viewKey='';lastRevision=-1;submittedRound=0;lockEntry(false);$('room-live').hidden=true;$('room-entry').hidden=false;status('Create a room or join a friend. No account needed.');}
function act(type,extra={}){if(!lost)room?.action({type,...extra});}
function teamScore(team){return state.players.filter(p=>p.team===team).reduce((sum,p)=>sum+p.score,0);}
function render(){
 if(!state||lost)return;updateClock();
 if(state.revision===lastRevision)return;lastRevision=state.revision;
 const me=state.players.find(p=>p.id===selfId),cfg=state.config;
 $('room-info').innerHTML=`<strong>${formats[cfg.format].label}</strong> · ${cfg.mode==='duel'?'Trend Duel':'Guess the Peak'} · ${cfg.rounds?`${cfg.rounds} rounds`:'Endless'} · ${cfg.seconds}s per question${cfg.format==='teams'?`<div class="team-scores"><span class="team-A">Team Lime · ${teamScore('A')}</span><span class="team-B">Team Violet · ${teamScore('B')}</span></div>`:''}`;
 $('roster').innerHTML=state.players.map(p=>`<div class="player ${p.id===selfId?'self':''} ${p.connected?'':'offline'}"><span class="player-name">${esc(p.name)}${p.id===selfId?' · you':''}</span><span class="player-meta">${p.id===state.hostId?'Host · ':''}${cfg.format==='teams'?`<span class="team-${p.team}">Team ${p.team==='A'?'Lime':'Violet'}</span> · `:''}${!p.connected?'Disconnected':state.phase==='lobby'?(p.ready?'Ready ✓':'Not ready'):state.phase==='question'?(p.answered?'Answer locked ✓':'Choosing…'):state.phase==='reveal'?(p.choice===null?'No answer':p.choice===state.winner?'Correct ✓':'Incorrect'):`${p.correct} correct`}</span><strong class="player-points">${p.score} <small>pts</small></strong></div>`).join('');
 $('room-controls').innerHTML='';
 if(state.phase==='lobby'){
  $('multiplayer-game').hidden=true;viewKey='';
  $('room-controls').innerHTML=`<button id="ready-player" class="primary">${me.ready?'Not ready':'Ready up ✓'}</button>${cfg.format==='teams'?`<button id="team-a" class="quiet ${me.team==='A'?'selected':''}">Team Lime</button><button id="team-b" class="quiet ${me.team==='B'?'selected':''}">Team Violet</button>`:''}${isHost?`<button id="start-match" class="primary" ${canStart(state.players,cfg)?'':'disabled'}>Start match →</button>`:''}<p>${cfg.format==='teams'?'Exactly 4 players, two on each team. Every player answers; both scores count toward the team total.':cfg.format==='duel'?'Exactly 2 players. Each correct answer earns points and builds your streak.':'2–8 players. Everyone competes for their own score.'} Everyone must be ready. ${isHost?'You control the rounds.':'The host starts the match.'}</p>`;
  $('ready-player').onclick=()=>act('ready',{ready:!me.ready});
  if(cfg.format==='teams'){$('team-a').onclick=()=>act('team',{team:'A'});$('team-b').onclick=()=>act('team',{team:'B'});}
  if(isHost)$('start-match').onclick=()=>act('start');return;
 }
 $('multiplayer-game').hidden=false;
 if(isHost&&['question','reveal'].includes(state.phase)){$('room-controls').innerHTML='<button id="stop-match" class="quiet">End match for everyone</button>';$('stop-match').onclick=()=>act('finish');}
 if(state.phase==='finished'&&isHost){$('room-controls').innerHTML='<button id="rematch" class="primary">Back to lobby ↗</button>';$('rematch').onclick=()=>act('rematch');}
 $('mp-round').textContent=`ROUND ${state.round}${cfg.rounds?` / ${cfg.rounds}`:' / ∞'}`;
 $('mp-answered').textContent=state.phase==='question'?`${state.players.filter(p=>p.connected&&p.answered).length} / ${state.players.filter(p=>p.connected).length} locked`:`${state.completed} completed`;
 const key=`${state.phase}:${state.round}`;
 if(viewKey!==key){viewKey=key;animationEpoch++;if(state.phase==='finished')renderResults();else if(state.phase==='question'){submittedRound=0;renderQuestion();}else renderReveal();}
 if(state.phase==='question'&&(me.answered||submittedRound===state.round)){$('mp-play').querySelectorAll('button').forEach(b=>b.disabled=true);$('mp-feedback').textContent='Answer locked. Waiting for the other players…';}
}
function renderQuestion(){
 const q=state.question;$('mp-play').classList.remove('mp-revealed');
 $('mp-meta').innerHTML=state.config.mode==='duel'?`<span>${esc(q.region)}</span><span>${esc(q.period)}</span>`:`<span>Worldwide</span><span>${q.year}</span><span>Illustrative curve</span>`;
 $('mp-question').textContent=state.config.mode==='duel'?'Which was searched more?':`What peaked in ${q.peak} ${q.year}?`;
 $('mp-hint').textContent='Same question for everyone. Lock in your answer before time runs out.';
 $('mp-play').innerHTML=state.config.mode==='duel'?`<div class="duel">${q.topics.map((t,i)=>`<button class="trend-card" data-choice="${i}"><div class="card-top"><span class="category">${esc(t.category)}</span><span class="key">${i+1}</span></div>${image(t.name)}<h3>${esc(t.name)}</h3><div class="card-caption">Search term · demo round</div><div class="card-bottom"><span>I think this was bigger</span><b>↗</b></div></button>`).join('')}<div class="versus" aria-hidden="true">VS</div></div>`:peakQuestion(q);
 $('mp-play').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.choice)));
 $('mp-feedback').textContent='Choose your answer. Results stay hidden until everyone is done.';
}
function peakQuestion(q){const pts=q.values.map((v,i)=>`${20+i*60},${130-v*1.1}`).join(' ');return `<div class="chart-panel"><div class="chart-caption"><span>Illustrative monthly interest</span><span>Peak: 100</span></div><svg viewBox="0 0 700 145" preserveAspectRatio="none" role="img" aria-label="Monthly interest: ${q.values.join(', ')}"><polyline points="${pts}" fill="none" stroke="#d9ff65" stroke-width="3" vector-effect="non-scaling-stroke"/></svg><div class="months"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></div><div class="options">${q.options.map((name,i)=>`<button class="option" data-choice="${i}">${image(name,true)}<span>${esc(name)}</span></button>`).join('')}</div>`;}
function answer(choice){if(!state||state.phase!=='question'||lost||submittedRound===state.round||state.players.find(p=>p.id===selfId)?.answered)return;submittedRound=state.round;$('mp-play').querySelectorAll('button').forEach((b,i)=>{b.disabled=true;b.classList.toggle('picked',i===choice);});$('mp-feedback').textContent='Answer locked. Waiting for the other players…';act('answer',{round:state.round,choice});}
function renderReveal(){
 renderQuestion();$('mp-play').classList.add('mp-revealed');const q=state.question,me=state.players.find(p=>p.id===selfId);
 const cards=[...$('mp-play').querySelectorAll('[data-choice]')];cards.forEach((b,i)=>{b.disabled=true;b.classList.add(i===state.winner?'correct':i===me.choice?'incorrect':'dim');});
 if(state.config.mode==='duel'){
  const total=q.topics.reduce((sum,t)=>sum+t.value,0);const epoch=animationEpoch;
  cards.forEach(b=>b.querySelector('.card-bottom').innerHTML='<div class="reveal-result"><div class="reveal-numbers"><strong class="interest">0%</strong><span class="index-value"></span></div><div class="interest-track"><span></span></div><small>Share of this pair’s interest</small></div>');
  const began=performance.now();function frame(now){if(epoch!==animationEpoch)return;const t=reduced.matches?1:Math.min((now-began)/1000,1);cards.forEach((b,i)=>{const share=q.topics[i].value/total*100;b.querySelector('.interest').textContent=`${(share*(1-(1-t)**3)).toFixed(1)}%`;b.querySelector('.index-value').textContent=`${q.topics[i].value.toFixed(1)} / 100`;b.querySelector('.interest-track span').style.width=`${share}%`;});if(t<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 }
 $('mp-hint').textContent=state.config.mode==='peak'?q.note:'Results are in. Scores include streak bonuses.';
 $('mp-feedback').innerHTML=`<span>${me.choice===null?'Time ran out — no answer.':me.choice===state.winner?'Correct! Nice instinct.':'Not this time.'}</span>${isHost?`<button class="next" id="next-mp">${state.config.rounds&&state.completed>=state.config.rounds?'See results':'Next round'} →</button>`:'<span>Waiting for the host…</span>'}`;
 if(isHost)$('next-mp').onclick=()=>act('next',{round:state.round});
}
function renderResults(){
 const cfg=state.config;let leaders;
 if(cfg.format==='teams')leaders=[{name:'Team Lime',score:teamScore('A')},{name:'Team Violet',score:teamScore('B')}];else leaders=state.players.map(p=>({name:p.name,score:p.score}));leaders.sort((a,b)=>b.score-a.score);
 const tied=leaders.filter(p=>p.score===leaders[0].score);$('mp-question').textContent=state.reason?'Match ended':tied.length>1?'It’s a tie!':`${leaders[0].name} wins!`;
 $('mp-hint').textContent=state.reason||'Good game. Ready for a rematch?';$('mp-meta').innerHTML='<span>MATCH RESULTS</span>';
 $('mp-play').innerHTML=`<div class="mp-results"><h3>${state.completed} round${state.completed===1?'':'s'} completed</h3><ol>${leaders.map(p=>`<li>${esc(p.name)} <strong>${p.score} pts</strong></li>`).join('')}</ol><p>${cfg.format==='teams'?'Team scores are the sum of both teammates.':'Every correct answer earns 100 points, with up to 125 streak bonus points.'}</p></div>`;
 $('mp-feedback').textContent=isHost?'Return to the lobby for another match.':'Waiting for the host to return to the lobby.';
}
function updateClock(){if(!state||lost)return;const seconds=Math.max(0,Math.ceil((deadline-performance.now())/1000));$('mp-clock').textContent=state.phase==='question'?`${seconds}s left`:state.phase==='reveal'?'ROUND COMPLETE':'';$('mp-clock').classList.toggle('urgent',state.phase==='question'&&seconds<=5);}
setInterval(updateClock,200);
$('create-room').onclick=()=>connect(false);$('join-room').onclick=()=>connect(true);$('cancel-connect').onclick=leave;$('leave-room').onclick=leave;
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(room.code);status('Room code copied.');}catch{status(`Copy this room code: ${room.code}`);}};
$('copy-link').onclick=async()=>{const url=new URL(location.href);url.hash=`room=${room.code}`;try{await navigator.clipboard.writeText(url.href);status('Invite link copied.');}catch{status(`Share this room code: ${room.code}`);}};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(/^[1-4]$/.test(e.key)&&state?.phase==='question'){e.preventDefault();const n=Number(e.key)-1;if(n<(state.config.mode==='duel'?2:4))answer(n);}});
window.addEventListener('pagehide',()=>room?.close());
