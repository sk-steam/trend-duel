import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,canStart,validState,roomSettings,cleanName} from '../dist/multiplayer-engine.js';
const question=()=>({period:'2024',region:'Worldwide',topics:[{name:'Bitcoin',category:'TECH',value:80},{name:'Barbie',category:'FILM',value:20}]});
function setup(format='duel',count=2,options={}){let time=1000;const match=new Match('host','Host',{format,...options},question,()=>time);for(let i=1;i<count;i++)assert.ok(match.add(`p${i}`,`Player ${i}`));for(const p of match.players)match.action(p.id,{type:'ready',ready:true});return {match,advance:ms=>time+=ms};}
test('1v1 requires both players ready and hides answers until everyone locks in',()=>{
 const {match}=setup();assert.ok(canStart(match.players,match.config));assert.equal(match.action('p1',{type:'start'}),false);assert.ok(match.action('host',{type:'start'}));
 const hidden=match.snapshot();assert.ok(validState(hidden));assert.equal(hidden.question.topics[0].value,undefined);assert.equal(hidden.winner,null);
 assert.ok(match.action('host',{type:'answer',round:1,choice:0}));assert.equal(match.snapshot().players[0].choice,null);assert.equal(match.phase,'question');
 assert.equal(match.action('host',{type:'answer',round:1,choice:1}),false);assert.equal(match.action('p1',{type:'answer',round:0,choice:0}),false);assert.equal(match.action('p1',{type:'answer',round:1,choice:5}),false);
 assert.ok(match.action('p1',{type:'answer',round:1,choice:1}));assert.equal(match.phase,'reveal');assert.equal(match.players[0].score,100);assert.equal(match.players[1].score,0);assert.ok(validState(match.snapshot()));
 match.resolve();assert.equal(match.players[0].score,100);assert.equal(match.action('p1',{type:'next',round:1}),false);
});
test('2v2 requires four players and balanced teams, and sums individual contributions',()=>{
 const {match}=setup('teams',4);assert.ok(canStart(match.players,match.config));assert.equal(match.add('fifth','Extra'),false);
 assert.ok(match.action('host',{type:'team',team:'B'}));assert.equal(canStart(match.players,match.config),false);match.action('host',{type:'team',team:'A'});match.action('host',{type:'ready',ready:true});match.action('host',{type:'start'});
 for(const p of match.players)match.action(p.id,{type:'answer',round:1,choice:p.team==='A'?0:1});
 assert.equal(match.players.filter(p=>p.team==='A').reduce((n,p)=>n+p.score,0),200);
 assert.equal(match.players.filter(p=>p.team==='B').reduce((n,p)=>n+p.score,0),0);
 const short=setup('teams',3).match;assert.equal(short.action('host',{type:'start'}),false);
});
test('Free for all supports eight players and rejects late arrivals',()=>{
 const {match}=setup('ffa',8);assert.equal(match.add('ninth','Extra'),false);match.action('host',{type:'start'});assert.equal(match.add('late','Late'),false);
 for(const p of match.players)match.action(p.id,{type:'answer',round:1,choice:0});assert.equal(match.players.filter(p=>p.score===100).length,8);
 match.action('host',{type:'next',round:1});match.remove('p7');assert.equal(match.phase,'question');assert.equal(match.players.find(p=>p.id==='p7').connected,false);
});
test('Host deadlines reject late answers, timeouts score once, and fixed matches end',()=>{
 const {match,advance}=setup('duel',2,{rounds:10,seconds:15});match.action('host',{type:'start'});advance(15000);assert.equal(match.action('p1',{type:'answer',round:1,choice:0}),false);match.tick();assert.equal(match.completed,1);assert.equal(match.phase,'reveal');match.tick();assert.equal(match.completed,1);
 for(let round=2;round<=10;round++){match.action('host',{type:'next',round:round-1});match.action('host',{type:'answer',round,choice:0});match.action('p1',{type:'answer',round,choice:0});}
 assert.equal(match.action('host',{type:'next',round:9}),false);match.action('host',{type:'next',round:10});assert.equal(match.phase,'finished');assert.equal(match.completed,10);assert.ok(validState(match.snapshot()));
 match.action('host',{type:'rematch'});assert.equal(match.phase,'lobby');assert.equal(match.players[0].score,0);assert.equal(match.players[0].ready,false);
});
test('Endless matches cross round ten and stop safely on a missing opponent',()=>{
 const {match}=setup('duel',2,{rounds:0});match.action('host',{type:'start'});for(let i=1;i<=12;i++){for(const p of match.players)match.action(p.id,{type:'answer',round:i,choice:0});match.action('host',{type:'next',round:i});}assert.equal(match.round,13);assert.equal(match.phase,'question');match.remove('p1');assert.equal(match.phase,'finished');assert.equal(match.completed,12);assert.ok(match.reason.includes('disconnected'));assert.ok(validState(match.snapshot()));
});
test('Settings, names and network snapshots are validated',()=>{
 assert.equal(cleanName('  Alice\n  '),'Alice');assert.equal(cleanName(null),'');assert.equal(roomSettings({format:'__proto__',seconds:1}).format,'duel');
 const {match}=setup();assert.ok(validState(match.snapshot()));assert.equal(validState({}),false);const s=match.snapshot();s.players.push({...s.players[0]});assert.equal(validState(s),false);
 match.action('host',{type:'start'});const invalid=match.snapshot();invalid.question.topics=[null,null];assert.equal(validState(invalid),false);
});
