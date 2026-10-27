import {createHash,randomBytes} from 'node:crypto';
import type {ReaderDependencies} from '../reader/api';
import {parseNeighborPage} from '../../../extension/neighbor-extractor.mjs';
type Obj=Record<string,unknown>;
export type ImportDependencies=Pick<ReaderDependencies,'member'|'user'|'device'|'rpc'>;
const obj=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const only=(o:Obj,keys:string[])=>Object.keys(o).every(k=>keys.includes(k));
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s);
const blog=(s:unknown):s is string=>typeof s==='string'&&/^[a-z0-9_-]{1,50}$/.test(s);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store',vary:'Cookie, Origin','x-content-type-options':'nosniff'}});
class Invalid extends Error{constructor(readonly status=400){super();}}
const invalid=():never=>{throw new Invalid();};
async function read(request:Request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new Invalid(415);
 const reader=request.body?.getReader();if(!reader)invalid();let size=0;const chunks:Uint8Array[]=[];
 for(;;){const {done,value}=await reader!.read();if(done)break;size+=value.length;if(size>65536){await reader!.cancel();throw new Invalid(413);}chunks.push(value);}
 let v:unknown;try{v=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{invalid();}
 if(!obj(v)||!only(v,['operation','payload'])||typeof v.operation!=='string'||!obj(v.payload))invalid();return v as {operation:string;payload:Obj};
}
export function normalizeNeighborSnapshot(value:unknown){
 if(!obj(value)||!only(value,['format','url','listScope','page','totalPages','totalCount','rows','nextUrl'])||value.format!=='naver-visible-neighbors-v1'||value.listScope!=='all')invalid();
 const v=value as Obj,page=parseNeighborPage(v.url);if(!page||v.page!==page.page||!Number.isInteger(v.totalPages)||(v.totalPages as number)<page.page||(v.totalPages as number)>100||!Number.isInteger(v.totalCount)||(v.totalCount as number)<0||(v.totalCount as number)>5000||!Array.isArray(v.rows)||v.rows.length>100)invalid();
 const rows=(v.rows as unknown[]).map(r=>{if(!obj(r)||!only(r,['blogId','relation'])||!blog(r.blogId)||r.blogId===page!.blogId||!['mutual','one_way'].includes(r.relation as string))invalid();return {blogId:(r as Obj).blogId as string,relation:(r as Obj).relation as string};});
 if(new Set(rows.map(r=>r.blogId)).size!==rows.length)invalid();
 const next=v.nextUrl===null?null:parseNeighborPage(v.nextUrl);if(v.nextUrl!==null&&(!next||next.blogId!==page!.blogId||next.page!==page!.page+1))invalid();
 if((page!.page===v.totalPages)!==(next===null))invalid();
 return {format:v.format,url:page!.url,listScope:'all',page:page!.page,totalPages:v.totalPages,totalCount:v.totalCount,rows,nextUrl:next?.url??null};
}
function result(r:{data:unknown;error:{message?:string}|null},extra:Obj={}){
 if(!r.error)return reply({data:r.data,...extra});
 const code=r.error.message?.match(/BNC_IMPORT_[A-Z_]+/)?.[0];
 if(code==='BNC_IMPORT_READ_DISABLED')return reply({error:'이웃 목록 읽기 허용 수단이 아직 확인되지 않아 운영 읽기를 시작하지 않습니다.',code},409);
 if(code==='BNC_IMPORT_NOT_FOUND'||code==='BNC_IMPORT_ACCOUNT')return reply({error:'유효한 본인 계정·가져오기 기록이 없습니다.',code},404);
 if(code==='BNC_IMPORT_INPUT')return reply({error:'목록 형식과 동의 항목을 확인해 주세요.',code},400);
 if(code)return reply({error:'계정·목록 변경·가져오기 상태와 읽기 상한을 확인해 주세요. 자동으로 다시 읽거나 보내지 않습니다.',code},409);
 return reply({error:'이웃 가져오기 서버 준비 상태를 확인해 주세요.'},503);
}
export function createNeighborImportHandler(deps:ImportDependencies,extension=false){return async(request:Request)=>{
 if(request.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 try{
  let userId:string,deviceId:string|undefined;
  if(extension){const origin=request.headers.get('origin');if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return reply({error:'확장에서 요청해 주세요.'},403);
   const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')||'')?.[1];if(!token)return reply({error:'확장 연결이 필요합니다.'},401);
   const device=await deps.device(hash(token));if(!device)return reply({error:'확장 연결 상태를 확인해 주세요.'},401);
   const access=await deps.user(device.userId);if(!access.allowed)return reply({error:access.error},access.status);if(access.userId!==device.userId)return reply({error:'연결 계정을 다시 확인해 주세요.'},403);userId=access.userId;deviceId=device.deviceId;
  }else{const access=await deps.member();if(!access.allowed)return reply({error:access.error},access.status);userId=access.userId;
   const url=new URL(request.url),host=request.headers.get('x-forwarded-host')||request.headers.get('host')||url.host,protocol=request.headers.get('x-forwarded-proto')||url.protocol.slice(0,-1);
   if(request.headers.get('origin')!==`${protocol}://${host}`||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'프로그램 화면에서 요청해 주세요.'},403);
  }
  const {operation,payload:p}=await read(request);let normalized:Obj;
  if(extension){
   if(!['start','reserve','page','status'].includes(operation)||!uuid(p.id))invalid();
   if(operation==='start'){if(!only(p,['id','ownerConfirmed'])||p.ownerConfirmed!==true)invalid();normalized={id:p.id,device_id:deviceId};}
   else if(operation==='status'){if(!only(p,['id']))invalid();normalized={id:p.id,device_id:deviceId};}
   else if(operation==='reserve'){
    if(!only(p,['id','page'])||!Number.isInteger(p.page)||(p.page as number)<1||(p.page as number)>100)invalid();
    const nonce=randomBytes(32).toString('hex');const r=await deps.rpc(userId,operation,{id:p.id,device_id:deviceId,page:p.page,nonce_hash:hash(nonce)});
    const after=await deps.user(userId);if(!after.allowed)return reply({error:after.error},after.status);if(after.userId!==userId)return reply({error:'로그인 계정을 다시 확인해 주세요.'},403);
    return result(r,r.error?{}:{nonce});
   }else{
    if(!only(p,['id','nonce','snapshot'])||typeof p.nonce!=='string'||!/^[a-f0-9]{64}$/.test(p.nonce))invalid();
    const snapshot=normalizeNeighborSnapshot(p.snapshot);normalized={id:p.id,device_id:deviceId,page:snapshot.page,nonce_hash:hash(p.nonce as string),snapshot,snapshot_hash:hash(JSON.stringify(snapshot))};
   }
  }else{
   if(['directory','runs'].includes(operation)){
    if(!only(p,operation==='directory'?['account_id','cursor']:['account_id'])||!uuid(p.account_id)||('cursor'in p&&p.cursor!==null&&!blog(p.cursor)))invalid();normalized={...p};
   }else if(['get','cancel','confirm'].includes(operation)){
    if(!only(p,operation==='get'?['id','cursor']:operation==='confirm'?['id','confirmed']:['id'])||!uuid(p.id)||('cursor'in p&&p.cursor!==null&&!blog(p.cursor))||(operation==='confirm'&&p.confirmed!==true))invalid();normalized={id:p.id,...(operation==='get'?{cursor:p.cursor??null}:{})};
   }else if(operation==='configure'){
    if(!only(p,['account_id','ids','all','expected_total','new_posts','return_visits','confirmed'])||!uuid(p.account_id)||p.confirmed!==true||typeof p.new_posts!=='boolean'||typeof p.return_visits!=='boolean')invalid();
    if(p.all===true){if('ids'in p||!Number.isInteger(p.expected_total)||(p.expected_total as number)<0||(p.expected_total as number)>5000)invalid();}
    else if(('all'in p&&p.all!==false)||'expected_total'in p||!Array.isArray(p.ids)||p.ids.length<1||p.ids.length>100||!p.ids.every(blog)||new Set(p.ids).size!==p.ids.length)invalid();
    normalized={...p};delete normalized.confirmed;
   }else invalid();
  }
  const r=await deps.rpc(userId,operation,normalized!);
  const after=extension?await deps.user(userId):await deps.member();if(!after.allowed)return reply({error:after.error},after.status);if(after.userId!==userId)return reply({error:'로그인 계정을 다시 확인해 주세요.'},403);
  return result(r);
 }catch(e){return e instanceof Invalid?reply({error:'요청 출처·형식·범위·동의를 확인해 주세요.'},e.status):reply({error:'이웃 가져오기 결과를 확인하지 못했습니다. 자동 재시도하지 않습니다.'},503);}
};}
