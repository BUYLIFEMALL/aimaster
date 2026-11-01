import {createHash} from 'node:crypto';
import {object,only,uuid,hash} from '../analysis/contracts';
type Access={allowed:true;userId:string}|{allowed:false;status:number};
type D={authorize:(tokenHash:string)=>Promise<Access>;feedEnabled:()=>boolean;rpc:(user:string,op:string,p:Record<string,unknown>)=>Promise<{data:any;error:unknown}>};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=5000;
const iso=(v:unknown)=>v===null||(typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v)));
class Bad extends Error{}
// Only what the member's PC read from a public feed: the server rebuilds each record and never accepts a body or a foreign owner.
function posts(neighbor:string,value:unknown){
 if(!Array.isArray(value)||value.length<1||value.length>50)throw new Bad();
 const seen=new Set<string>();
 return value.map(v=>{
  if(!object(v)||!only(v,['postId','title','publishedAt'])||typeof v.postId!=='string'||!/^\d{1,30}$/.test(v.postId)||seen.has(v.postId)||typeof v.title!=='string'||!v.title.trim()||v.title.length>500||/[\u0000-\u001f\u007f]/.test(v.title)||!iso(v.publishedAt))throw new Bad();
  seen.add(v.postId);
  return {blogId:neighbor,postId:v.postId,title:v.title,body:'',hash:hash([v.title,'']),publishedAt:v.publishedAt===null?null:new Date(v.publishedAt as string).toISOString()};
 });
}
export function createMonitorExtensionHandler(d:D){return async(request:Request)=>{
 if(request.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 const origin=request.headers.get('origin');if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return reply({error:'확장에서 요청해 주세요.'},403);
 const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'')?.[1];if(!token)return reply({error:'확장 연결이 필요합니다.'},401);
 try{
  const a=await d.authorize(createHash('sha256').update(token).digest('hex'));if(!a.allowed)return reply({error:'회원·기기 연결을 확인해 주세요.'},a.status);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new Bad();
  const reader=request.body?.getReader();if(!reader)throw new Bad();const chunks=[];let size=0;
  for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>131072){await reader.cancel();return reply({error:'보낸 내용이 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!only(v,['operation','payload'])||!object(v.payload))throw new Bad();
  const op=v.operation,p=v.payload;let rpcOp:string,payload:Record<string,unknown>;
  if(op==='sync'){
   if(!only(p,['reads','failures','lastReadAt'])||!count(p.reads)||!count(p.failures)||!iso(p.lastReadAt))throw new Bad();
   // The operator's switch reaches every PC here, so turning RSS off also stops reads on members' PCs.
   if(!d.feedEnabled())return reply({data:{active:false}});
   rpcOp='extension_sync';payload=p;
  }else if(op==='report'){
   if(!only(p,['sessionId','neighborId','posts'])||!uuid(p.sessionId)||typeof p.neighborId!=='string'||!/^[a-z0-9_-]{1,50}$/.test(p.neighborId))throw new Bad();
   if(!d.feedEnabled())return reply({error:'RSS 운영 준비가 해제되었습니다.'},409);
   rpcOp='extension_report';payload={sessionId:p.sessionId,neighborId:p.neighborId,posts:posts(p.neighborId,p.posts)};
  }else if(op==='stop'){
   if(!only(p,['sessionId'])||!uuid(p.sessionId))throw new Bad();rpcOp='stop';payload=p;
  }else throw new Bad();
  const r=await d.rpc(a.userId,rpcOp,payload);
  if(r.error||r.data==null)return reply({error:'세션이나 이웃 설정이 바뀌었습니다. 상태를 다시 확인합니다.'},409);
  return reply({data:r.data});
 }catch(e){const input=e instanceof Bad||e instanceof SyntaxError;return reply({error:input?'입력값을 확인해 주세요.':'결과를 확인하지 못했습니다.'},input?400:503);}
};}
