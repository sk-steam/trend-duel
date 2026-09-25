import {Match,PROTOCOL,validState} from './multiplayer-engine.js';
import {peerOptions} from './rtc-config.js';
const prefix='trendduel-v1-';
export function roomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(10)),n=>alphabet[n%alphabet.length]).join('');}
export function parseCode(value){const code=String(value||'').trim().toUpperCase().replace(/[\s-]/g,'');return /^[A-HJ-NP-Z2-9]{10}$/.test(code)?code:null;}
function decode(data){if(typeof data!=='string'||data.length>65000)return null;try{const m=JSON.parse(data);return m?.v===PROTOCOL?m:null;}catch{return null;}}
export class RoomConnection {
 constructor({onState,onStatus,onClosed,PeerClass=window.Peer}){this.onState=onState;this.onStatus=onStatus;this.onClosed=onClosed;this.PeerClass=PeerClass;this.links=new Map();this.closed=false;this.revision=-1;this.lastHost=Date.now();}
 async open({name,code,config,makeQuestion}){
  this.isHost=!code;this.code=code||roomCode();this.name=name;this.onStatus('Connecting to the room service…');
  if(!this.PeerClass)throw new Error('The connection library did not load. Refresh and try again.');
  this.peer=new this.PeerClass(this.isHost?prefix+this.code:undefined,peerOptions);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Room service did not respond. Check your connection and try again.')),15000);this.openTimer=timer;
   this.peer.once('open',id=>{clearTimeout(timer);this.id=id;resolve();});
   this.peer.once('error',err=>{clearTimeout(timer);reject(new Error(this.errorText(err)));});
  });
  if(this.closed)return;
  this.peer.on('error',err=>{if(this.closed)return;if(err.type==='peer-unavailable')this.fail('Room not found. Check the code and ask the host to keep the room open.');else this.onStatus(this.errorText(err));});
  this.peer.on('disconnected',()=>{if(this.closed)return;this.onStatus('Room service disconnected. Existing players can keep playing; reconnecting…');this.reconnectTimer=setTimeout(()=>{if(!this.closed&&!this.peer.destroyed)this.peer.reconnect();},2500);});
  this.peer.on('open',()=>{if(!this.closed)this.onStatus('Connected via WebRTC.');});
  this.peer.on('connection',conn=>{if(this.isHost)this.accept(conn);else conn.close();});
  this.peer.on('call',call=>call.close());
  this.peer.on('close',()=>{if(!this.closed)this.fail('Your connection closed. Create or join another room.');});
  if(this.isHost){this.match=new Match(this.id,name,config,makeQuestion);this.publish();this.onStatus('Room ready. Share the code with your friends.');}
  else{
   this.onStatus('Connecting directly to the host…');
   this.hostLink=this.peer.connect(prefix+this.code,{serialization:'raw',reliable:true,label:'trendduel-v1'});
   this.hostLink.on('open',()=>this.send(this.hostLink,{type:'hello',name}));
   this.hostLink.on('data',data=>this.receiveHost(data));
   this.hostLink.on('close',()=>{if(!this.closed)this.fail('The host disconnected. This room has ended. Create or join another room.');});
   this.hostLink.on('error',()=>{if(!this.closed)this.fail('Could not establish a direct connection. Try another network; this network may need a TURN relay.');});
   this.joinTimer=setTimeout(()=>{if(!this.admitted)this.fail('Connection timed out. Check the code, keep the host online, or try another network.');},20000);
  }
  let ticks=0;
  this.heartbeat=setInterval(()=>{
   if(this.closed)return;ticks++;
   if(this.isHost){for(const [id,link] of this.links){if(Date.now()-link.lastSeen>20000){link.conn.close();this.drop(id);}else if(ticks%3===0)this.send(link.conn,{type:'ping'});}this.match.tick();this.publish();}
   else if(this.admitted&&Date.now()-this.lastHost>20000)this.fail('The host stopped responding. The match cannot continue without the host.');
  },1000);
 }
 errorText(err){return ({'unavailable-id':'That room code is in use. Try creating another room.','browser-incompatible':'This browser does not support WebRTC data connections. Try an up-to-date Chrome, Edge, Firefox, or Safari.','network':'The room service is unreachable. Check your internet connection.','peer-unavailable':'Room not found. Check the code.'})[err?.type]||'A connection error occurred. Try again or use another network.';}
 send(conn,msg){if(!conn?.open)return;try{conn.send(JSON.stringify({v:PROTOCOL,...msg}));}catch{conn.close();}}
 accept(conn){
  if(this.closed||this.links.has(conn.peer)||this.links.size>=8){conn.close();return;}
  const link={conn,lastSeen:Date.now(),joined:false,budget:0,window:Date.now()};this.links.set(conn.peer,link);
  link.timer=setTimeout(()=>{if(!link.joined){conn.close();this.drop(conn.peer);}},10000);
  conn.on('data',data=>{
   if(this.closed||this.links.get(conn.peer)!==link)return;
   if(Date.now()-link.window>1000){link.window=Date.now();link.budget=0;}if(++link.budget>30){conn.close();this.drop(conn.peer);return;}
   const msg=decode(data);if(!msg)return;link.lastSeen=Date.now();
   if(msg.type==='pong')return;
   if(!link.joined){
    if(msg.type!=='hello')return;
    if(!this.match.add(conn.peer,msg.name)){this.send(conn,{type:'rejected',reason:'This room is full, already playing, or the name is invalid.'});setTimeout(()=>{conn.close();this.drop(conn.peer);},150);return;}
    link.joined=true;clearTimeout(link.timer);this.publish();return;
   }
   // The channel identity, never a caller-supplied player ID, owns this action.
   if(['ready','team','answer'].includes(msg.type)&&this.match.action(conn.peer,msg))this.publish();
  });
  conn.on('close',()=>this.drop(conn.peer));conn.on('error',()=>{conn.close();this.drop(conn.peer);});
 }
 drop(id){const link=this.links.get(id);if(!link)return;clearTimeout(link.timer);this.links.delete(id);if(!this.closed&&link.joined){this.match.remove(id);this.publish();}}
 receiveHost(data){
  if(this.closed)return;const msg=decode(data);if(!msg)return;this.lastHost=Date.now();
  if(msg.type==='ping'){this.send(this.hostLink,{type:'pong'});return;}
  if(msg.type==='rejected'){this.fail('The room is full or a match is already in progress. Ask the host to return to the lobby.');return;}
  if(!validState(msg)||msg.hostId!==prefix+this.code||msg.revision<this.revision||!msg.players.some(p=>p.id===this.id))return;
  this.revision=msg.revision;if(!this.admitted)this.onStatus('Connected via WebRTC.');this.admitted=true;clearTimeout(this.joinTimer);this.onState(msg,this.id,false,this.code);
 }
 publish(){if(this.closed||!this.match)return;const state=this.match.snapshot();this.onState(state,this.id,true,this.code);for(const link of this.links.values())if(link.joined)this.send(link.conn,state);}
 action(msg){if(this.closed)return;if(this.isHost){if(this.match.action(this.id,msg))this.publish();}else this.send(this.hostLink,msg);}
 fail(message){if(this.closed)return;this.close();this.onClosed(message);}
 close(){if(this.closed)return;this.closed=true;clearInterval(this.heartbeat);clearTimeout(this.openTimer);clearTimeout(this.joinTimer);clearTimeout(this.reconnectTimer);for(const link of this.links.values())clearTimeout(link.timer);this.peer?.destroy();this.links.clear();}
}
