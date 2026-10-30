import {createHash,randomBytes} from 'node:crypto';
type O=Record<string,unknown>;
const obj=(v:unknown):v is O=>!!v&&typeof v==='object'&&!Array.isArray(v),keys=(v:O,n:string[])=>Object.keys(v).every(k=>n.includes(k));
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
type D={authorize:(h:string)=>Promise<{allowed:true;userId:string;deviceId:string}|{allowed:false;status:number}>;profile:()=>{profile:O;read:boolean;execute:boolean}|null;rpc:(u:string,d:string,op:string,p:O)=>Promise<{data:unknown;error:unknown}>};
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const bad=()=>{throw Error('input');};
function observation(v:unknown,list=false){
 if(!obj(v)||!keys(v,['accountId','actorId','checkedAt','restriction',...(list?['complete','requests','count']:['requestId','neighborId','state'])])||!uuid(v.accountId)||typeof v.actorId!=='string'||!Number.isSafeInteger(v.checkedAt)||Number(v.checkedAt)<0||!['none','login','captcha','platform'].includes(String(v.restriction)))return bad();
 if(list){if(v.restriction==='none'&&(!Array.isArray(v.requests)||v.requests.length>50||v.count!==v.requests.length||v.complete!==true))return bad();if(Array.isArray(v.requests)&&v.requests.some(r=>!obj(r)||!keys(r,['requestId','neighborId','state'])))return bad();}
 else if(typeof v.requestId!=='string'||typeof v.neighborId!=='string'||!['pending','mutual'].includes(String(v.state)))return bad();
 return {...v,checkedAt:new Date(Number(v.checkedAt)).toISOString()};
}
export function createAcceptHandler(d:D){return async(req:Request)=>{
 const origin=req.headers.get('origin'),token=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('authorization')??'')?.[1];
 if(req.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return reply({error:'확장에서 요청해 주세요.'},403);
 if(!token)return reply({error:'회원 연결이 필요합니다.'},401);
 try{
  const a=await d.authorize(hash(token));if(!a.allowed)return reply({error:'회원·기기 권한을 확인해 주세요.'},a.status);
  if(req.headers.get('content-type')?.split(';')[0]!=='application/json')return bad();
  const reader=req.body?.getReader();if(!reader)return bad();const chunks=[];let size=0;for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>32768){await reader.cancel();return reply({error:'읽기 결과가 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!obj(v)||!keys(v,['operation','payload'])||typeof v.operation!=='string'||!obj(v.payload))return bad();
  const op=v.operation,p=v.payload;let payload:O={};const passive=['status_read','status_work','cancel','stop'].includes(op),config=passive?null:d.profile();
  if(!passive&&!config)return reply({error:'신청 화면 검수와 읽기·수락 준비가 필요합니다.'},409);
  if(['status_read','status_work'].includes(op)){if(!keys(p,[]))return bad();}
  else if(['cancel','stop'].includes(op)){if(!keys(p,['id'])||!uuid(p.id))return bad();payload={id:p.id};}
  else if(['offer_read','offer_work','offer_check'].includes(op)){
   if(!keys(p,['request_id','url'])||!uuid(p.request_id)||typeof p.url!=='string'||p.url.length>2048)return bad();const u=new URL(p.url);
   if(u.protocol!=='https:'||u.hostname!=='admin.blog.naver.com'||u.port||u.username||u.password||u.hash)return bad();
   const m=/^\/([a-z0-9_-]{1,50})\/?$/.exec(u.pathname);let owner;
   if(m&&!u.search)owner=m[1];else if(u.pathname===config?.profile.incomingRequestPath&&u.searchParams.getAll('blogId').length===1)owner=u.searchParams.get('blogId');
   if(!/^[a-z0-9_-]{1,50}$/.test(String(owner)))return bad();payload={id:p.request_id,owner};
  }else if(['preview','confirm','inspect','arm','effect','reconcile'].includes(op)){
   if(!keys(p,['id','nonce','snapshot',...(op==='effect'?['attempted_at']:[])])||!uuid(p.id)||typeof p.nonce!=='string'||!/^[a-f0-9]{64}$/.test(p.nonce))return bad();payload={id:p.id,nonce_hash:hash(p.nonce),snapshot:observation(p.snapshot,['preview','confirm'].includes(op))};
   if(op==='effect'){if(!Number.isSafeInteger(p.attempted_at))return bad();payload.attempted_at=new Date(Number(p.attempted_at)).toISOString();}
  }else return reply({error:'지원하지 않는 작업입니다.'},403);
  const nonce=randomBytes(32).toString('hex');if(config)Object.assign(payload,{profile_hash:hash(JSON.stringify(config.profile)),next_hash:hash(nonce),read_enabled:config.read,execute_enabled:config.execute});
  const r=await d.rpc(a.userId,a.deviceId,op,payload);if(r.error||!obj(r.data))return reply({error:'신청·동의·실행 상태를 확인하지 못했습니다. 자동으로 다시 수락하지 말고 이전 결과를 확인하세요.'},409);
  if(r.data.blocked===true)return reply({error:'로그인·보안문자·플랫폼 제한으로 자동 실행을 중단했습니다.'},409);
  const data={...r.data};if(['read','preview','inspect','recheck','apply','check'].includes(String(data.phase)))Object.assign(data,{nonce,profile:config?.profile});return reply({data});
 }catch(e){return reply({error:e instanceof Error&&e.message==='input'?'신청 화면과 입력값을 확인해 주세요.':'처리 결과를 확인하지 못했습니다. 자동으로 재시도하지 않습니다.'},e instanceof Error&&e.message==='input'?400:503);}
};}
