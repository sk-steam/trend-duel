import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,pointsFor,shuffle,buildDuelDeck,createRoundQueue,normalizeSettings} from '../dist/engine.js';
import {duels,peaks} from '../dist/data.js';
test('CSV metadata, BOM, quoted names, CRLF and sub-one values',()=>{
 const r=parseCSV('\uFEFFCategory: All categories\r\n\r\nWeek,"A, B: (Worldwide)",C: (Worldwide)\r\n2024-01-01,100,20\r\n2024-01-08,<1,40\r\n');
 assert.equal(r.topics[0].name,'A, B: (Worldwide)');assert.equal(r.topics[0].value,50.25);assert.equal(r.topics[1].value,30);assert.equal(r.demo,false);
});
test('Reject invalid, missing, tied and separately exported data',()=>{
 for(const text of ['Week,A\n2024-01-01,90','Week,A,B\n2024-01-01,101,3','Week,A,B\n2024-01-01,,3','Week,A,B\n2024-01-01,5,5','Week,A,B\n2024-01-01,no,5','Week,A,B\n2024-01-01,5,3,2','Week,A,B\n'])assert.throws(()=>parseCSV(text));
});
test('Streak bonus is capped and shuffle preserves source',()=>{assert.deepEqual([1,2,6,10].map(pointsFor),[100,125,225,225]);const a=[1,2,3];assert.deepEqual(shuffle(a,()=>0),[2,3,1]);assert.deepEqual(a,[1,2,3]);});
test('Enough playable rounds with distinct answers and valid curves',()=>{assert.ok(duels.length>=10);assert.ok(peaks.length>=10);for(const r of duels){assert.notEqual(r.topics[0].value,r.topics[1].value);assert.ok(r.demo);}for(const r of peaks){assert.equal(r.values.length,12);assert.equal(r.options.filter(v=>v===r.answer).length,1);assert.equal(new Set(r.options).size,4);assert.equal(Math.max(...r.values),100);}});
test('A shuffled cycle contains every unique pair and delays recent pairs',()=>{
 let seed=7;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const first=buildDuelDeck(duels,[],random);assert.equal(first.length,378);assert.equal(new Set(first.map(r=>r.id)).size,378);
 const recent=first.slice(-40).map(r=>r.id);const second=buildDuelDeck(duels,recent,random);
 assert.ok(second.slice(0,338).every(r=>!recent.includes(r.id)));
 assert.notDeepEqual(first.map(r=>r.id),second.map(r=>r.id));
 for(const r of second){assert.notEqual(r.topics[0].name,r.topics[1].name);assert.notEqual(r.topics[0].value,r.topics[1].value);assert.ok(r.demo);}
});
test('The round queue continues beyond ten rounds and beyond 378 pairs',()=>{
 let cycles=0;const queue=createRoundQueue(()=>{cycles++;return buildDuelDeck(duels);});let seen=[];
 while(seen.length<378)seen.push(...queue.nextBatch());
 assert.equal(seen.length,378);assert.equal(new Set(seen.map(r=>r.id)).size,378);assert.equal(cycles,1);
 assert.equal(queue.nextBatch().length,10);assert.equal(cycles,2);
 for(let i=0;i<100;i++)assert.ok(queue.nextBatch().length>0);
});
test('Session settings accept supported preferences and recover from corrupt storage',()=>{
 assert.deepEqual(normalizeSettings({length:25,reveal:0}),{mode:'duel',length:25,reveal:0});
 for(const value of [null,{},'broken',{length:-1,reveal:NaN},{length:Infinity,reveal:999}])assert.deepEqual(normalizeSettings(value),{mode:'duel',length:0,reveal:1450});
});
