export function shuffle(items, random = Math.random) {
  const result = [...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function pointsFor(streak){return 100 + Math.min(Math.max(streak-1,0),5)*25;}
export function pairKey(a,b){return [a,b].sort().join('|');}
// Synthetic profiles share a context; never combine independently imported series.
export function buildDuelDeck(rounds,recentPairs=[],random=Math.random){
  const topics=[...new Map(rounds.flatMap(r=>r.topics).map(t=>[t.name,t])).values()];
  const contexts=[['2023','Worldwide'],['2024','United States'],['2024','United Kingdom'],['2023','Canada'],['2024','Worldwide']];
  const [period,region]=contexts[Math.floor(random()*contexts.length)];
  const recent=new Set(recentPairs),deck=[];
  for(let i=0;i<topics.length;i++)for(let j=i+1;j<topics.length;j++){
    const a=topics[i],b=topics[j];
    const value=name=>{let h=2166136261;for(const c of `${name}|${period}|${region}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return 12+h%83;};
    const av=value(a.name);let bv=value(b.name);if(av===bv)bv=bv===94?bv-1:bv+1;
    deck.push({id:pairKey(a.name,b.name),period,region,demo:true,topics:shuffle([{...a,value:av},{...b,value:bv}],random)});
  }
  const mixed=shuffle(deck,random);
  return [...mixed.filter(r=>!recent.has(r.id)),...mixed.filter(r=>recent.has(r.id))];
}
// Keep just one shuffled cycle in memory; exhaustion starts a fresh cycle.
export function createRoundQueue(makeCycle){
  let pending=[];
  return {nextBatch(size=10){if(!pending.length)pending=makeCycle();return pending.splice(0,size);}};
}
export function normalizeSettings(value={}){
  return {mode:value?.mode==='peak'?'peak':'duel',length:[0,10,25,50,100].includes(value?.length)?value.length:0,
    reveal:[0,650,1450,2200].includes(value?.reveal)?value.reveal:1450};
}
export function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('The CSV contains an unfinished quoted field.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  const header=rows.findIndex(r=>/^(Day|Week|Month)$/i.test(r[0]?.trim())&&r.length===3);
  if(header<0)throw new Error('Export an English “Interest over time” comparison containing exactly two search terms.');
  const names=rows[header].slice(1).map(v=>v.trim());
  const samples=rows.slice(header+1).filter(r=>/^\d{4}-\d{2}(?:-\d{2})?$/.test(r[0]?.trim()));
  if(!samples.length)throw new Error('No dated interest values were found.');
  const sums=[0,0];
  for(const r of samples){
    if(r.length!==3)throw new Error('Every dated row must contain two values.');
    r.slice(1).forEach((v,i)=>{v=v.trim();const n=v==='<1'?0.5:Number(v);if(!v||!Number.isFinite(n)||n<0||n>100)throw new Error('Interest values must be between 0 and 100.');sums[i]+=n;});
  }
  const values=sums.map(v=>v/samples.length);
  if(Math.abs(values[0]-values[1])<0.000001)throw new Error('These terms are tied. Try another comparison.');
  return {id:'csv',topics:names.map((name,i)=>({name,icon:i?'◈':'◉',category:'IMPORTED SEARCH',value:values[i]})),period:`${samples[0][0]} → ${samples.at(-1)[0]}`,region:'Location in CSV labels',demo:false};
}
