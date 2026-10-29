import {randomUUID} from 'node:crypto';
import type {Readable,Writable} from 'node:stream';
import type {ExecutionAdapter,ExecutionJob} from './approvedWork';
import type {ScheduleWorkerBinding} from './scheduleWorker';

const MAX=65536;
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function jobMatchesBrowserUrl(job:Pick<ExecutionJob,'kind'|'actor_id'|'neighbor_id'|'post_id'>,value:string){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.username||u.password||u.port||u.hash)return false;
  if(job.kind==='request')return u.pathname==='/BuddyAddForm.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.get('blogId')===job.neighbor_id;
  let actor,post;const m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/.exec(u.pathname);
  if(m&&!u.search){[,actor,post]=m;}
  else if(u.pathname==='/PostView.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.getAll('logNo').length===1){actor=u.searchParams.get('blogId');post=u.searchParams.get('logNo');}
  return actor===(job.kind==='reply'?job.actor_id:job.neighbor_id)&&post===job.post_id;
 }catch{return false;}
}
/** Dedicated Edge native-messaging stdio only. No socket, HTTP listener, keys,
 * worker tickets or arbitrary script payloads are sent to the extension. */
export function createNativeBrowserPeer(input:Readable,output:Writable,binding:Readonly<ScheduleWorkerBinding>,options:{timeoutMs?:number}={}){
 const timeout=options.timeoutMs??15000;
 if(!Number.isInteger(timeout)||timeout<1||timeout>15000)throw Error('Native timeout bounds required');
 let buffer=Buffer.alloc(0),session='',targetUrl='',closed=false;
 let waiting:{id:string;resolve:(v:unknown)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|undefined;
 let resolveReady:(v:string)=>void,rejectReady:(e:Error)=>void;
 let resolveClosed:()=>void;const ended=new Promise<void>(resolve=>{resolveClosed=resolve;});
 const ready=new Promise<string>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 // An unopened peer may be closed by its owner before anyone awaits ready.
 void ready.catch(()=>{});
 const startup=setTimeout(()=>close(),timeout);
 const fail=()=>Error('Edge native connection unconfirmed');
 function close(){
  if(closed)return;closed=true;clearTimeout(startup);buffer=Buffer.alloc(0);
  if(waiting){clearTimeout(waiting.timer);waiting.reject(fail());waiting=undefined;}
  rejectReady(fail());resolveClosed();input.off('data',receive);input.off('end',close);input.off('error',close);output.off('error',close);
 }
 function message(v:unknown){
  if(!obj(v)||v.v!==1)throw fail();
  if(!session){
   if(Object.keys(v).sort().join(',')!=='actorId,deviceId,session,type,url,v'||v.type!=='hello'||typeof v.session!=='string'||!/^[a-f0-9]{64}$/.test(v.session)||
    v.deviceId!==binding.deviceId||v.actorId!==binding.actorId||typeof v.url!=='string'||v.url.length>2048)throw fail();
   const u=new URL(v.url);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.username||u.password||u.port)throw fail();
   session=v.session;targetUrl=v.url;clearTimeout(startup);resolveReady(targetUrl);return;
  }
  if(Object.keys(v).sort().join(',')!=='id,ok,result,session,type,v'||v.type!=='result'||v.session!==session||!waiting||v.id!==waiting.id||v.ok!==true)throw fail();
  const pending=waiting;waiting=undefined;clearTimeout(pending.timer);pending.resolve(v.result);
 }
 function receive(chunk:Buffer){
  try{
   if(closed||buffer.length+chunk.length>MAX*2)throw fail();buffer=Buffer.concat([buffer,chunk]);
   while(buffer.length>=4){
    const size=buffer.readUInt32LE(0);if(size<2||size>MAX)throw fail();if(buffer.length<size+4)break;
    const body=buffer.subarray(4,size+4);buffer=buffer.subarray(size+4);message(JSON.parse(body.toString('utf8')));
   }
  }catch{close();}
 }
 input.on('data',receive);input.on('end',close);input.on('error',close);output.on('error',close);
 async function request(operation:'inspect'|'assert'|'apply'|'verify',job:ExecutionJob,permit?:{generation:number;deviceId:string;validUntil:string},profile?:unknown){
  await ready;if(closed||waiting||!jobMatchesBrowserUrl(job,targetUrl)||job.account_id!==binding.accountId||job.actor_id!==binding.actorId||job.user_id!==binding.memberId)throw fail();
  const id=randomUUID(),payload={v:1,type:'command',session,id,operation,job,profile,...(permit?{permit}:{})};
  const bytes=Buffer.from(JSON.stringify(payload));if(bytes.length>MAX)throw fail();const header=Buffer.alloc(4);header.writeUInt32LE(bytes.length);
  return new Promise<unknown>((resolve,reject)=>{
   waiting={id,resolve,reject,timer:setTimeout(()=>close(),timeout)};
   try{output.write(Buffer.concat([header,bytes]),error=>{if(error)close();});}catch{close();}
  });
 }
 return {ready,ended,request,close,isClosed:()=>closed};
}
export function createNativeExecutionAdapter(peer:ReturnType<typeof createNativeBrowserPeer>,profile:unknown):ExecutionAdapter{
 return {
  inspect:async job=>await peer.request('inspect',job,undefined,profile) as Awaited<ReturnType<ExecutionAdapter['inspect']>>,
  assertCurrent:async job=>await peer.request('assert',job,undefined,profile)===true,
  apply:async(job,permit)=>{if(await peer.request('apply',job,permit,profile)!==true)throw Error('Browser action unconfirmed');},
  verify:async job=>await peer.request('verify',job,undefined,profile) as Awaited<ReturnType<ExecutionAdapter['verify']>>,
 };
}
