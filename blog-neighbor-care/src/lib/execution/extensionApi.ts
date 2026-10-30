import {createHash,randomBytes} from 'node:crypto';
type Obj=Record<string,unknown>;
type Access={allowed:true;userId:string;deviceId:string}|{allowed:false;status:number};
type Dependencies={authorize:(hash:string)=>Promise<Access>;profile:()=>{profile:unknown;kinds:string[]}|null;
 rpc:(user:string,device:string,operation:string,payload:Obj)=>Promise<{data:unknown;error:{message?:string}|null}>};
const object=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const keys=(v:Obj,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
function observation(v:unknown,effect=false){
 if(!object(v)||!keys(v,['accountId','actorId','neighborId','postId','checkedAt','restriction','relationship','liked','duplicate','postOwnerId','parentCommentId','parentAuthorId','articleHash','articleCharacters',...(effect?['state','effectId','bodyHash']:[])])||
  !uuid(v.accountId)||typeof v.actorId!=='string'||typeof v.neighborId!=='string'||typeof v.postId!=='string'||!Number.isSafeInteger(v.checkedAt)||Number(v.checkedAt)<0)throw Error('input');
 return {...v,checkedAt:new Date(Number(v.checkedAt)).toISOString()};
}
// A dedicated extension capability protocol, never a raw queue RPC proxy.
// Browser observations are attributed to the extension, not independent Naver
// verification. Server owns identity, consent, stage, nonce, limits and result.
export function createExtensionExecutionHandler(d:Dependencies){return async(request:Request)=>{
 if(request.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 const origin=request.headers.get('origin');if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return reply({error:'확장에서 요청해 주세요.'},403);
 const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'')?.[1];if(!token)return reply({error:'확장 연결이 필요합니다.'},401);
 try{
  const a=await d.authorize(hash(token));if(!a.allowed)return reply({error:'회원·확장 연결 권한을 확인해 주세요.'},a.status);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({error:'JSON 요청이 필요합니다.'},415);
  const reader=request.body?.getReader();if(!reader)throw Error('input');let size=0;const chunks=[];
  for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>16384){await reader.cancel();return reply({error:'요청이 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!keys(v,['operation','payload'])||typeof v.operation!=='string'||!object(v.payload))throw Error('input');
  const op=v.operation,p=v.payload;let payload:Obj={};
  if(op==='status'){if(!keys(p,[]))throw Error('input');}
  else if(op==='stop'){if(!keys(p,['id'])||!uuid(p.id))throw Error('input');payload={id:p.id};}
  else if(op==='offer'){
   if(!keys(p,['request_id','url'])||!uuid(p.request_id)||typeof p.url!=='string'||p.url.length>2048)throw Error('input');
   const u=new URL(p.url);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.port||u.username||u.password||u.hash)throw Error('input');
   const m=/^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/.exec(u.pathname);
   if(u.pathname==='/BuddyAddForm.naver'&&u.searchParams.getAll('blogId').length===1)payload={id:p.request_id,target_kind:'request',owner:u.searchParams.get('blogId')};
   else if(m&&!u.search)payload={id:p.request_id,target_kind:'post',owner:m[1],post_id:m[2]};
   else if(u.pathname==='/PostView.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.getAll('logNo').length===1)payload={id:p.request_id,target_kind:'post',owner:u.searchParams.get('blogId'),post_id:u.searchParams.get('logNo')};else throw Error('input');
   if(!/^[a-z0-9_-]{1,50}$/.test(String(payload.owner))||(payload.target_kind==='post'&&!/^\d{1,30}$/.test(String(payload.post_id))))throw Error('input');
  }else if(['inspect','reading','recheck','effect'].includes(op)){
   if(!keys(p,['id','nonce',...(op==='effect'?['effect','attempted_at']:['observation'])])||!uuid(p.id)||typeof p.nonce!=='string'||!/^[a-f0-9]{64}$/.test(p.nonce))throw Error('input');
   payload={id:p.id,nonce_hash:hash(p.nonce)};
   if(op==='effect'){
    if(!Number.isSafeInteger(p.attempted_at))throw Error('input');payload.effect=observation(p.effect,true);payload.attempted_at=new Date(Number(p.attempted_at)).toISOString();
   }else payload.observation=observation(p.observation);
  }else return reply({error:'지원하지 않는 확장 작업입니다.'},403);
  const config=['status','stop'].includes(op)?null:d.profile();if(!['status','stop'].includes(op)&&!config)return reply({error:'실행 준비가 완료되지 않았습니다.'},409);
  const nonce=randomBytes(32).toString('hex');if(config){payload.next_hash=hash(nonce);payload.kinds=config.kinds;payload.profile_hash=hash(JSON.stringify(config.profile));}
  const r=await d.rpc(a.userId,a.deviceId,op,payload);
  if(r.error)return reply({error:'실행 상태가 바뀌었거나 준비되지 않았습니다. 자동으로 다시 등록하지 말고 작업 기록을 확인해 주세요.'},409);
  if(!object(r.data))throw Error('unavailable');const data={...r.data};
  if(['inspect','reading','recheck','apply'].includes(String(data.phase))){data.nonce=nonce;if(config)data.profile=config.profile;}
  if(object(data.job)){
   const safe:Obj={};for(const k of ['id','user_id','account_id','actor_id','neighbor_id','post_id','kind','body','expires_at','parent_comment_id'])if(k in data.job)safe[k]=data.job[k];data.job=safe;
  }
  return reply({data});
 }catch(error){return reply({error:error instanceof Error&&error.message==='input'?'입력값을 확인해 주세요.':'실행 결과를 확인하지 못했습니다. 자동으로 다시 등록하지 않습니다.'},error instanceof Error&&error.message==='input'?400:503);}
};}
