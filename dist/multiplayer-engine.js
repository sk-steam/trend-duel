import {pointsFor} from './engine.js';
export const PROTOCOL=1;
export const formats={duel:{label:'1v1',min:2,max:2},teams:{label:'2v2',min:4,max:4},ffa:{label:'Free for all',min:2,max:8}};
export function roomSettings(input={}){return {format:Object.hasOwn(formats,input.format)?input.format:'duel',mode:input.mode==='peak'?'peak':'duel',rounds:[0,10,25,50].includes(input.rounds)?input.rounds:10,seconds:[15,30,60].includes(input.seconds)?input.seconds:30};}
export function cleanName(value){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24):'';}
export function canStart(players,config){const active=players.filter(p=>p.connected);const f=formats[config.format];return active.length>=f.min&&active.length<=f.max&&active.every(p=>p.ready)&&(config.format!=='teams'||['A','B'].every(team=>active.filter(p=>p.team===team).length===2));}
export class Match {
 constructor(hostId,name,config,makeQuestion,now=Date.now){this.hostId=hostId;this.config=roomSettings(config);this.makeQuestion=makeQuestion;this.now=now;this.players=[];this.phase='lobby';this.round=0;this.completed=0;this.question=null;this.reason='';this.answers=new Map();this.revision=0;this.add(hostId,name);}
 add(id,name){name=cleanName(name);if(this.phase!=='lobby'||!name||this.players.some(p=>p.id===id)||this.players.length>=formats[this.config.format].max)return false;this.players.push({id,name,team:this.players.filter(p=>p.team==='A').length<=this.players.filter(p=>p.team==='B').length?'A':'B',ready:false,connected:true,score:0,streak:0,correct:0});this.revision++;return true;}
 action(id,msg){
  const player=this.players.find(p=>p.id===id&&p.connected);if(!player||!msg||typeof msg!=='object')return false;
  if(msg.type==='ready'&&this.phase==='lobby'&&typeof msg.ready==='boolean'){player.ready=msg.ready;this.revision++;return true;}
  if(msg.type==='team'&&this.phase==='lobby'&&this.config.format==='teams'&&['A','B'].includes(msg.team)){player.team=msg.team;player.ready=false;this.revision++;return true;}
  if(msg.type==='start'&&id===this.hostId&&this.phase==='lobby'&&canStart(this.players,this.config)){this.nextQuestion();return true;}
  if(msg.type==='answer'&&this.phase==='question'&&msg.round===this.round&&this.now()<this.deadline&&!this.answers.has(id)&&Number.isInteger(msg.choice)&&msg.choice>=0&&msg.choice<(this.config.mode==='duel'?2:4)){
   this.answers.set(id,msg.choice);this.revision++;if(this.players.filter(p=>p.connected).every(p=>this.answers.has(p.id)))this.resolve();return true;
  }
  if(msg.type==='next'&&id===this.hostId&&this.phase==='reveal'&&msg.round===this.round){if(this.config.rounds&&this.completed>=this.config.rounds){this.phase='finished';this.revision++;}else this.nextQuestion();return true;}
  if(msg.type==='finish'&&id===this.hostId&&['question','reveal'].includes(this.phase)){this.phase='finished';this.reason='The host ended the match.';this.revision++;return true;}
  if(msg.type==='rematch'&&id===this.hostId&&this.phase==='finished'){this.players=this.players.filter(p=>p.connected);this.players.forEach(p=>Object.assign(p,{score:0,streak:0,correct:0,ready:false}));this.phase='lobby';this.question=null;this.round=this.completed=0;this.reason='';this.answers.clear();this.revision++;return true;}
  return false;
 }
 nextQuestion(){this.round++;this.question=this.makeQuestion();this.phase='question';this.answers.clear();this.deadline=this.now()+this.config.seconds*1000;this.revision++;}
 resolve(){if(this.phase!=='question')return;const q=this.question;this.winner=this.config.mode==='duel'?(q.topics[0].value>q.topics[1].value?0:1):q.options.indexOf(q.answer);for(const p of this.players){const correct=this.answers.get(p.id)===this.winner;p.streak=correct?p.streak+1:0;if(correct){p.correct++;p.score+=pointsFor(p.streak);}}this.completed++;this.phase='reveal';this.revision++;}
 tick(){if(this.phase==='question'&&this.now()>=this.deadline)this.resolve();}
 remove(id){const p=this.players.find(p=>p.id===id);if(!p||!p.connected)return;if(this.phase==='lobby'){this.players=this.players.filter(p=>p.id!==id);}else{p.connected=false;if(['question','reveal'].includes(this.phase)){if(this.config.format!=='ffa'||this.players.filter(p=>p.connected).length<2){this.phase='finished';this.reason=`${p.name} disconnected. The match stopped.`;}else if(this.phase==='question'&&this.players.filter(p=>p.connected).every(p=>this.answers.has(p.id)))this.resolve();}}this.revision++;}
 snapshot(){
  const revealed=this.phase==='reveal'||this.phase==='finished'&&this.completed===this.round;
  let question=null;if(this.question){const q=this.question;question=this.config.mode==='duel'?{period:q.period,region:q.region,topics:q.topics.map(t=>({name:t.name,category:t.category,...(revealed?{value:t.value}:{})}))}:{year:q.year,peak:q.peak,values:[...q.values],options:[...q.options],...(revealed?{note:q.note}:{})};}
  return {v:PROTOCOL,type:'state',revision:this.revision,hostId:this.hostId,config:{...this.config},phase:this.phase,round:this.round,completed:this.completed,remainingMs:this.phase==='question'?Math.max(0,this.deadline-this.now()):0,question,winner:revealed?this.winner:null,reason:this.reason,players:this.players.map(p=>({...p,answered:this.answers.has(p.id),choice:revealed?(this.answers.get(p.id)??null):null}))};
 }
}
export function validState(s){
 if(!s||s.v!==PROTOCOL||s.type!=='state'||!['lobby','question','reveal','finished'].includes(s.phase)||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isSafeInteger(s.round)||s.round<0||!Number.isSafeInteger(s.completed)||s.completed<0||typeof s.hostId!=='string'||s.hostId.length>100||typeof s.reason!=='string'||s.reason.length>200)return false;
 if(!s.config||JSON.stringify(roomSettings(s.config))!==JSON.stringify(s.config)||!Number.isFinite(s.remainingMs)||s.remainingMs<0||s.remainingMs>60000||!Array.isArray(s.players)||s.players.length<1||s.players.length>8)return false;
 if(!s.players.every(p=>p&&typeof p.id==='string'&&p.id.length<=100&&cleanName(p.name)===p.name&&p.name.length>0&&['A','B'].includes(p.team)&&['score','streak','correct'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0)&&['connected','ready','answered'].every(k=>typeof p[k]==='boolean')&&(p.choice===null||Number.isInteger(p.choice)&&p.choice>=0&&p.choice<4)))return false;
 if(new Set(s.players.map(p=>p.id)).size!==s.players.length||!s.players.some(p=>p.id===s.hostId))return false;
 if(s.phase==='lobby')return s.question===null;
 const q=s.question;if(!q)return false;const str=v=>typeof v==='string'&&v.length<=150;const val=v=>Number.isFinite(v)&&v>=0&&v<=100;
 if(s.config.mode==='duel'){if(!str(q.period)||!str(q.region)||!Array.isArray(q.topics)||q.topics.length!==2||!q.topics.every(t=>t&&str(t.name)&&str(t.category)&&(s.winner===null?t.value===undefined:val(t.value))))return false;}
 else if(!Number.isInteger(q.year)||!str(q.peak)||!Array.isArray(q.options)||q.options.length!==4||!q.options.every(str)||!Array.isArray(q.values)||q.values.length!==12||!q.values.every(val)||(q.note!==undefined&&!str(q.note)))return false;
 return s.winner===null||Number.isInteger(s.winner)&&s.winner>=0&&s.winner<(s.config.mode==='duel'?2:4);
}
