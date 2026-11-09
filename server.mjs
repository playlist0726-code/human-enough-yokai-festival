import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomInt} from 'node:crypto';
import QRCode from 'qrcode';
import {playtestInfo,inviteURL} from './playtest-network.mjs';
import {WebSocketServer,WebSocket} from 'ws';
import {createRoom,addPlayer,removePlayer,setInput,doAction,stepRoom,snapshot,stallInput,setReady,beginCountdown,returnToLobby,setConnected,setPaused} from './shared/simulation.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.ktx2':'image/ktx2','.ogg':'audio/ogg','.m4a':'audio/mp4','.mp3':'audio/mpeg','.woff2':'font/woff2'}; // REMASTER-HOOK r05: local UI fonts (no external font requests)
const ACTIONS=new Set(['interact','drink','charm','cover','jump','share','handoff','ping','strike']);
export function createGameServer({reconnectMs=30000,publicBaseURL=process.env.PUBLIC_BASE_URL||process.env.RENDER_EXTERNAL_URL,maxRooms=64}={}){
  const publicOrigin=publicBaseURL?new URL(publicBaseURL).origin:null;
  function invitationInfo(){return publicOrigin?{ok:true,public:true,lan:false,urls:[publicOrigin],local:publicOrigin,version:'public-invite-v1'}:playtestInfo(server.address());}
  const rooms=new Map(),sessions=new Map(),playersById=new Map();
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
      if(url.pathname==='/api/playtest'){
        res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(invitationInfo()));return;
      }
      if(url.pathname==='/api/playtest/qr'){
        const info=invitationInfo(),base=info.urls.find(u=>new URL(u).hostname===url.searchParams.get('address'));
        if(!base){res.writeHead(400);res.end('Choose an available game address.');return;}
        const svg=await QRCode.toString(inviteURL(base,url.searchParams.get('room')||''),{type:'svg',errorCorrectionLevel:'M',margin:3,width:256});
        res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'});res.end(svg);return;
      }
      let relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),base=path.join(root,'public');
      if(relative.startsWith('shared/')){relative=relative.slice(7);base=path.join(root,'shared');}
      if(relative.startsWith('vendor/three/')){relative=relative.slice(13);base=path.join(root,'node_modules/three/build');}
      if(relative.startsWith('addons/')){relative=relative.slice(7);base=path.join(root,'node_modules/three/examples/jsm');}
      const file=path.resolve(base,relative);if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
      try{
        const source=await stat(file);if(!source.isFile())throw Error('Not a file');
        let served=file,encoding='';
        if(/(?:^|,)\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?(?:\s|,|$))[0-9.]+)?\s*(?:,|$)/i.test(req.headers['accept-encoding']||'')){
          const compressed=path.join(root,'.cache','gzip',path.relative(root,file));
          try{const cached=await stat(compressed);if(cached.mtimeMs>=source.mtimeMs){served=compressed;encoding='gzip';}}catch{}
        }
        const etag=`W/"${source.size}-${Math.trunc(source.mtimeMs)}-${encoding||'identity'}"`;
        const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=0, must-revalidate','ETag':etag,'Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
        if(encoding)headers['Content-Encoding']=encoding;
        if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
        const data=req.method==='HEAD'?null:await readFile(served);res.writeHead(200,headers);res.end(data);
      }catch{res.writeHead(404);res.end('Not found');}
    }catch{res.writeHead(400);res.end('Bad request');}
  });
  const wss=new WebSocketServer({server,maxPayload:4096});
  function send(ws,data){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));}
  function broadcast(room){const data=JSON.stringify({type:'state',state:snapshot(room)});for(const s of sessions.values())if(s.code===room.code&&s.ws?.readyState===WebSocket.OPEN&&s.ws.bufferedAmount<131072)s.ws.send(data);}
  function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let result;do{result=Array.from({length:5},()=>chars[randomInt(chars.length)]).join('');}while(rooms.has(result));return result;}
  function drop(s){
    sessions.delete(s.token);playersById.delete(s.id);const room=rooms.get(s.code);
    if(room){removePlayer(room,s.id);if(!Object.keys(room.players).length)rooms.delete(room.code);else broadcast(room);}
  }
  wss.on('connection',ws=>{
    let session=null,alive=true;const initialId=randomUUID();send(ws,{type:'hello',id:initialId});
    ws.on('pong',()=>alive=true);
    ws.checkAlive=()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();};
    ws.on('message',raw=>{
      try{
        const m=JSON.parse(raw.toString());if(!m||typeof m!=='object'||Array.isArray(m))return;
        if(m.type==='ping'&&Number.isSafeInteger(m.nonce)&&m.nonce>=0){send(ws,{type:'pong',nonce:m.nonce});return;}
        if(m.type==='resume'){
          if(session)throw Error('You are already in a room.');
          const saved=sessions.get(m.token);
          if(!saved||saved.expires&&Date.now()>saved.expires||!rooms.has(saved.code)){send(ws,{type:'resume_failed',message:'Your previous room has expired. Create or join a festival.'});return;}
          if(saved.ws&&saved.ws!==ws&&saved.ws.readyState===WebSocket.OPEN){send(ws,{type:'resume_failed',message:'This session is already open in another tab.'});return;}
          session=saved;saved.ws=ws;saved.expires=0;saved.lastInputAt=Date.now();setConnected(rooms.get(saved.code),saved.id,true);
          send(ws,{type:'joined',id:saved.id,code:saved.code,token:saved.token,resumed:true});broadcast(rooms.get(saved.code));return;
        }
        if(m.type==='join'){
          if(session)throw Error('You are already in a room.');
          const requested=String(m.code||'').trim().toUpperCase();if(requested&&!/^[A-Z2-9]{5}$/.test(requested))throw Error('Room codes contain 5 characters.');
          if(!requested&&rooms.size>=maxRooms)throw Error('The festival is busy. Please try creating a room again shortly.');
          const room=requested?rooms.get(requested):createRoom(code(),{mode:m.mode});if(!room)throw Error('Room not found. Check the code.');
          if(room.phase!=='lobby')throw Error('This round has started. Join the next round.');
          addPlayer(room,initialId,m.name,m.character);rooms.set(room.code,room);
          session={id:initialId,token:randomUUID(),code:room.code,ws,expires:0,actionTimes:new Map(),lastInputAt:Date.now()};sessions.set(session.token,session);playersById.set(session.id,session);
          send(ws,{type:'joined',id:session.id,code:room.code,token:session.token});broadcast(room);return;
        }
        if(!session)return;
        const room=rooms.get(session.code);if(!room)return;
        if(m.type==='leave'){const old=session;session=null;drop(old);send(ws,{type:'left'});return;}
        if(m.type==='input'){session.lastInputAt=Date.now();setInput(room,session.id,m.dx,m.dz);}
        if(m.type==='ready'){setReady(room,session.id,m.ready);broadcast(room);}
        if(m.type==='start'){
          if(!beginCountdown(room,session.id))send(ws,{type:'feedback',message:room.phase==='lobby'?'Wait for every teammate to be connected and ready.':'The round is already underway.'});
          broadcast(room);
        }
        if(m.type==='rematch'){returnToLobby(room,session.id);broadcast(room);}
        if(m.type==='pause'){setPaused(room,session.id,m.paused);broadcast(room);}
        if(m.type==='stall'){
          stallInput(room,session.id,m.session,m.input);broadcast(room);
          if(Number.isSafeInteger(m.requestId)&&m.requestId>=0)send(ws,{type:'stall_ack',session:m.session,requestId:m.requestId,game:room.players[session.id]?.mini||null,tick:room.tick});
        }
        if(m.type==='action'&&ACTIONS.has(m.action)){
          const now=Date.now();
          if(now-(session.actionTimes.get(m.action)||0)<=150){send(ws,{type:'feedback',message:'Wait a moment before repeating that action.'});return;}
          session.actionTimes.set(m.action,now);doAction(room,session.id,m.action,m.target);broadcast(room);
        }
      }catch(e){send(ws,{type:'error',message:e.message||'Please try again.'});}
    });
    ws.on('error',()=>{});
    ws.on('close',()=>{
      if(!session||session.ws!==ws)return;
      session.ws=null;session.expires=Date.now()+reconnectMs;
      const room=rooms.get(session.code);if(room){setConnected(room,session.id,false);broadcast(room);}
    });
  });
  let count=0;const timer=setInterval(()=>{
    count++;const now=Date.now();
    for(const s of sessions.values())if(s.expires&&now>s.expires)drop(s);
    if(count%200===0)for(const ws of wss.clients)ws.checkAlive?.();
    for(const room of rooms.values()){
      for(const p of Object.values(room.players)){const s=playersById.get(p.id);if(!s?.ws||now-s.lastInputAt>600)p.dx=p.dz=0;}
      stepRoom(room,.05);if(count%2===0)broadcast(room);
    }
  },50);
  return {server,close:()=>new Promise(resolve=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close();server.close(resolve);})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {server}=createGameServer(),port=Number(process.env.PORT||4173),host=process.env.GAME_HOST||(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1');
  server.listen(port,host,()=>{const info=playtestInfo(server.address());console.log(`Human Enough! ready: ${info.local}\nPhone Lab: ${info.local}/phone-lab.html`);for(const u of info.urls)console.log(`Same Wi-Fi: ${u}`);});
}
