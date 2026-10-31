const KEY='eve-human-enough-session-v1';
export function createConnection({url,storage,WebSocketImpl=WebSocket,onMessage,onStatus,onError,onExpired,retryWindow=30000}){
  let socket=null,token=null,pending=null,retryTimer=null,timeout=null,deadline=0,attempt=0,generation=0,joining=false,authenticated=false,rtt=null,pingNonce=null;
  try{token=storage?.getItem(KEY)||null;}catch{}
  function save(value){token=value;try{if(value)storage?.setItem(KEY,value);else storage?.removeItem(KEY);}catch{}}
  function send(message){if(socket?.readyState===1){socket.send(JSON.stringify(message));return true;}return false;}
  function stop(){clearTimeout(retryTimer);clearTimeout(timeout);retryTimer=timeout=null;}
  function expire(message){stop();save(null);joining=false;authenticated=false;generation++;socket?.close();socket=null;onStatus('idle');onExpired(message);}
  function connect(){
    const current=++generation;authenticated=false;rtt=null;pingNonce=null;stop();onStatus(token?'reconnecting':'connecting');
    const ws=new WebSocketImpl(url);socket=ws;
    timeout=setTimeout(()=>{if(current===generation)ws.close();},7000);
    ws.onmessage=e=>{
      if(current!==generation)return;
      let m;try{m=JSON.parse(e.data);}catch{return;}
      if(m.type==='pong'){if(m.nonce===pingNonce){rtt=Math.max(0,Date.now()-pingNonce);pingNonce=null;}return;}
      if(m.type==='hello'){if(token)send({type:'resume',token});else if(pending){send(pending);pending=null;}return;}
      if(m.type==='joined'){stop();save(m.token);joining=false;authenticated=true;attempt=0;deadline=0;onStatus('connected');}
      if(m.type==='resume_failed'){expire(m.message);return;}
      if(m.type==='error'){joining=false;clearTimeout(timeout);onStatus('idle');onError(m.message);return;}
      onMessage(m);
    };
    ws.onerror=()=>{};
    ws.onclose=()=>{
      if(current!==generation)return;authenticated=false;clearTimeout(timeout);
      if(token){
        deadline||=Date.now()+retryWindow;
        if(Date.now()>=deadline){expire('Your connection could not be restored. Create or join a new festival.');return;}
        onStatus('reconnecting');retryTimer=setTimeout(connect,Math.min(250*2**attempt++,2000));
      }else{joining=false;pending=null;onStatus('idle');onError('Cannot connect to the game server. Please try again.');}
    };
  }
  return {
    send,
    ping(){if(authenticated){pingNonce=Date.now();send({type:'ping',nonce:pingNonce});}},
    get rtt(){return rtt;},
    join(message){if(joining||token)return false;joining=true;pending=message;if(socket?.readyState===1){onStatus('connecting');send(pending);pending=null;timeout=setTimeout(()=>socket?.close(),7000);}else connect();return true;},
    resume(){if(!token)return false;deadline=Date.now()+retryWindow;connect();return true;},
    leave(){send({type:'leave'});stop();save(null);joining=false;authenticated=false;pending=null;generation++;socket?.close();socket=null;deadline=0;onStatus('idle');},
    get connected(){return socket?.readyState===1&&authenticated;}
  };
}
