import {networkInterfaces} from 'node:os';

export function privateIPv4(address){
  if(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(String(address)))return false;
  const p=String(address).split('.').map(Number);
  return p.length===4&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&
    (p[0]===10||p[0]===192&&p[1]===168||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===100&&p[1]>=64&&p[1]<=127);
}
export function playtestInfo(address,interfaces=networkInterfaces()){
  const host=typeof address==='object'?address?.address:'127.0.0.1',port=typeof address==='object'?address?.port:4173;
  const lan=host==='0.0.0.0'||host==='::'||privateIPv4(host);
  const ips=[...new Set(Object.values(interfaces).flat().filter(n=>n&&!n.internal&&(n.family==='IPv4'||n.family===4)&&privateIPv4(n.address)&&(host==='0.0.0.0'||host==='::'||n.address===host)).map(n=>n.address))];
  return {ok:true,lan,port,urls:ips.map(ip=>`http://${ip}:${port}`),local:`http://127.0.0.1:${port}`,version:'phone-playtest-v1'};
}
export function inviteURL(base,room=''){
  const url=new URL('/',base);url.searchParams.set('touch','1');url.searchParams.set('test','1');
  if(/^[A-Z2-9]{5}$/.test(room))url.searchParams.set('room',room);
  return url.href;
}
