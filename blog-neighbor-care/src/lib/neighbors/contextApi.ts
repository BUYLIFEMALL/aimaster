import {createHash,randomBytes} from 'node:crypto';
type Obj=Record<string,unknown>;
type Access={allowed:true;userId:string;deviceId:string}|{allowed:false;status:number};
type Dependencies={authorize:(hash:string)=>Promise<Access>;profile:()=>{profile:unknown;reads:string[]}|null;
 rpc:(user:string,device:string,op:string,payload:Obj)=>Promise<{data:unknown;error:unknown}>};
const object=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v),keys=(v:Obj,names:string[])=>Object.keys(v).every(k=>names.includes(k));
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
// The extension measures its clock offset from serverNow; the RPC code tells a diagnosis which check refused.
const code=(e:unknown)=>{const m=object(e)?e.message:undefined;return typeof m==='string'&&/^BNC_[A-Z_]{1,60}$/.test(m)?m:undefined;};
// 2026-11-14: v1.20 return-post 409 was BNC_RETURN_POST_REQUIRED (own-blog tab sent), but the member only saw a generic line. Name the fix per refusing check.
const REFUSAL:Record<string,string>={
 BNC_RELATIONSHIP_UNKNOWN:'현재 수락 여부를 확인하지 못해 저장하지 않았습니다.',
 BNC_RETURN_POST_REQUIRED:'답방 글은 이웃의 글 화면(blog.naver.com/이웃ID/글번호)을 연 탭에서 읽어 주세요. 내 블로그 글에서는 읽을 수 없습니다.',
 BNC_RETURN_SOURCE_REQUIRED:'이 이웃의 원댓글 기록이 없거나 이미 답방 글이 연결됐습니다. 내 글 원댓글을 먼저 읽어 저장해 주세요.',
 BNC_OWN_POST_REQUIRED:'원댓글은 내 블로그 글 화면을 연 탭에서 읽어 주세요.',
 BNC_REQUEST_RECEIPT_REQUIRED:'이 이웃에게 보낸 신청 기록을 찾지 못했습니다. 신청을 보낸 이웃의 블로그에서 읽어 주세요.',
 BNC_READ_REVIEW_REQUIRED:'이전 읽기 미리보기가 남아 있습니다. 「읽기 취소·이전 미리보기 정리」를 누른 뒤 다시 읽어 주세요.',
 BNC_READ_NOT_PERMITTED:'웹에서 이 기기의 해당 읽기를 허용해 주세요.',
 BNC_ACCOUNT_REQUIRED:'연결된 네이버 블로그 계정을 웹에서 다시 확인해 주세요.',
};
const refusal=(c:string|undefined)=>(c&&REFUSAL[c])||'읽기 상태나 대상이 바뀌었습니다. 이전 결과를 확인하고 다시 읽어 주세요.';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
function snapshot(value:unknown){
 if(!object(value)||!keys(value,['accountId','actorId','checkedAt','restriction','blocked','neighborId','relationship','postId','ownPostId','complete','comments','count'])||!uuid(value.accountId)||typeof value.actorId!=='string'||!Number.isSafeInteger(value.checkedAt)||Number(value.checkedAt)<0||Number(value.checkedAt)>Date.now()+1000||!['none','login','captcha','platform'].includes(String(value.restriction)))throw Error('input');
 if('comments' in value){
  if(!Array.isArray(value.comments)||value.comments.length>50||value.count!==value.comments.length||value.complete!==true)throw Error('input');
  if(value.comments.some(c=>!object(c)||!keys(c,['commentId','neighborId','parentIsTopLevel','alreadyReplied'])||typeof c.commentId!=='string'||typeof c.neighborId!=='string'||c.parentIsTopLevel!==true||typeof c.alreadyReplied!=='boolean'))throw Error('input');
 }
 return {...value,checkedAt:new Date(Number(value.checkedAt)).toISOString()};
}
export function createExtensionContextHandler(d:Dependencies){return async(request:Request)=>{
 if(request.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 const origin=request.headers.get('origin');if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return reply({error:'확장에서 요청해 주세요.'},403);
 const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'')?.[1];if(!token)return reply({error:'확장 연결이 필요합니다.'},401);
 try{
  const a=await d.authorize(hash(token));if(!a.allowed)return reply({error:'회원·기기 연결을 확인해 주세요.'},a.status);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('input');
  const reader=request.body?.getReader();if(!reader)throw Error('input');const chunks=[];let size=0;
  for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>32768){await reader.cancel();return reply({error:'읽기 결과가 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!keys(v,['operation','payload'])||typeof v.operation!=='string'||!object(v.payload))throw Error('input');
  const op=v.operation,p=v.payload;let payload:Obj={};
  if(op==='status'){if(!keys(p,[]))throw Error('input');}
  else if(op==='cancel'){if(!keys(p,['id'])||!uuid(p.id))throw Error('input');payload={id:p.id};}
  else if(op==='offer'){
   if(!keys(p,['request_id','kind','url'])||!uuid(p.request_id)||!['relationship','incoming','return_post'].includes(String(p.kind))||typeof p.url!=='string'||p.url.length>2048)throw Error('input');
   const u=new URL(p.url);if(u.protocol!=='https:'||u.hostname!=='blog.naver.com'||u.port||u.username||u.password||u.hash)throw Error('input');
   const m=/^\/([a-z0-9_-]{1,50})(?:\/(\d{1,30}))?\/?$/.exec(u.pathname);let owner,post='';
   if(m&&!u.search){owner=m[1];post=m[2]??'';}else if(u.pathname==='/PostView.naver'&&u.searchParams.getAll('blogId').length===1&&u.searchParams.getAll('logNo').length===1){owner=u.searchParams.get('blogId');post=u.searchParams.get('logNo')??'';}else throw Error('input');
   if(!/^[a-z0-9_-]{1,50}$/.test(String(owner))||(post&&!/^\d{1,30}$/.test(post))||(p.kind!=='relationship'&&!post))throw Error('input');
   payload={id:p.request_id,kind:p.kind,owner,post_id:post};
  }else if(['preview','confirm'].includes(op)){
   if(!keys(p,['id','nonce','snapshot'])||!uuid(p.id)||typeof p.nonce!=='string'||!/^[a-f0-9]{64}$/.test(p.nonce))throw Error('input');payload={id:p.id,nonce_hash:hash(p.nonce),snapshot:snapshot(p.snapshot)};
  }else return reply({error:'지원하지 않는 읽기 작업입니다.'},403);
  const config=['status','cancel'].includes(op)?null:d.profile();if(!['status','cancel'].includes(op)&&!config)return reply({error:'읽기 준비와 허용 범위를 확인해 주세요.'},409);
  const nonce=randomBytes(32).toString('hex');if(config){payload.next_hash=hash(nonce);payload.profile_hash=hash(JSON.stringify(config.profile));payload.allowed_reads=config.reads;}
  const r=await d.rpc(a.userId,a.deviceId,op,payload);if(r.error||!object(r.data)){const c=code(r.error);return reply({error:refusal(c),code:c},409);}
  if(r.data.blocked===true)return reply({error:'로그인·보안문자·플랫폼 제한을 확인해 주세요. 자동 실행은 중단했습니다.'},409);
  const data:Obj={...r.data,serverNow:Date.now()};if(data.phase==='read'||data.phase==='preview'){data.nonce=nonce;if(data.phase==='read')data.profile=config?.profile;}
  return reply({data});
 }catch(e){return reply({error:e instanceof Error&&e.message==='input'?'읽기 입력값을 확인해 주세요.':'읽기 결과를 확인하지 못했습니다. 자동으로 재전송하지 않습니다.'},e instanceof Error&&e.message==='input'?400:503);}
};}
