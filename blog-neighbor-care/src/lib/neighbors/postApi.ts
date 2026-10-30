import {parseNeighborFeed,fetchNeighborFeed} from './feed';
import {AnalysisInputError,object,only,uuid,text,hash,bad,type ObjectValue} from '../analysis/contracts';
import type {Access} from '../work-api';
type D={member:()=>Promise<Access>;rpc:(u:string,op:string,p:ObjectValue)=>Promise<{data:unknown;error:unknown}>;feedEnabled:()=>boolean;fetcher?:typeof fetch};
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export function createPostHandler(d:D){return async(req:Request)=>{
 const u=new URL(req.url);if(req.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 if(req.headers.get('origin')!==`${u.protocol}//${req.headers.get('host')??u.host}`||req.headers.get('sec-fetch-site')==='cross-site')return reply({error:'프로그램에서 요청해 주세요.'},403);
 try{
  const access=await d.member();if(!access.allowed)return reply({error:access.error},access.status);
  if(req.headers.get('content-type')?.split(';')[0]!=='application/json')return bad();
  const reader=req.body?.getReader();if(!reader)return bad();let size=0;const chunks=[];for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>1258291){await reader.cancel();return reply({error:'자료가 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!only(v,['operation','payload'])||typeof v.operation!=='string'||!object(v.payload))return bad();const op=v.operation,p=v.payload;
  const rpc=async(operation:string,payload:ObjectValue={})=>{const r=await d.rpc(access.userId,operation,payload);if(r.error||r.data==null)throw Error(object(r.error)&&r.error.message==='BNC_FEED_WAIT'?'wait':'store');return r.data;};
  if(op==='directory'||op==='list'){if(!only(p,[]))return bad();return reply({data:await rpc(op)});}
  if(op==='material'){if(!only(p,['id'])||!uuid(p.id))return bad();return reply({data:await rpc(op,{id:p.id})});}
  if(op==='provide'){
   if(!only(p,['id','body','confirmed','rightsConfirmed'])||!uuid(p.id)||p.confirmed!==true||p.rightsConfirmed!==true)return bad();const body=text(p.body,20000);if(body.length<30)return bad();const old=await rpc('get',{id:p.id});if(!object(old)||typeof old.title!=='string')return bad();return reply({data:await rpc('provide',{id:p.id,body,hash:hash([old.title,body]),confirmed:true,rightsConfirmed:true})});
  }
  if(!['preview','fetch_preview','import'].includes(op))return reply({error:'지원하지 않는 작업입니다.'},403);
  if(!only(p,['accountId','neighborId',...(op==='fetch_preview'?['confirmed']:['xml']),...(op==='import'?['selected','rightsConfirmed','bodyConfirmed']:[])])||!uuid(p.accountId)||typeof p.neighborId!=='string'||!/^[a-z0-9_-]{1,50}$/.test(p.neighborId))return bad();
  const binding={accountId:p.accountId,neighborId:p.neighborId};await rpc('source',binding);
  if(op==='fetch_preview'){
   if(p.confirmed!==true||!d.feedEnabled())return reply({error:'RSS 읽기 동의와 운영 준비가 필요합니다.'},409);await rpc('reserve_feed',binding);
   const feed=await fetchNeighborFeed(p.neighborId,d.fetcher);return reply({data:feed.posts,xml:feed.xml,coverage:'publisher-feed-only',stored:false,aiCalls:0});
  }
  if(typeof p.xml!=='string')return bad();const posts=parseNeighborFeed(p.xml,p.neighborId);
  if(op==='preview')return reply({data:posts,coverage:'provided-feed-only',stored:false,aiCalls:0});
  if(!Array.isArray(p.selected)||p.selected.length<1||p.selected.length>50||new Set(p.selected).size!==p.selected.length||p.rightsConfirmed!==true||typeof p.bodyConfirmed!=='boolean')return bad();
  const selected=posts.filter(post=>(p.selected as unknown[]).includes(post.postId));if(selected.length!==p.selected.length||p.bodyConfirmed&&selected.some(post=>post.body.length<30))return bad();
  return reply({data:await rpc('import',{...binding,rightsConfirmed:true,bodyConfirmed:p.bodyConfirmed,posts:selected.map(post=>({...post,hash:hash([post.title,post.body])}))})});
 }catch(e){return reply({error:e instanceof Error&&e.message==='wait'?'같은 이웃의 RSS는 15분 뒤 다시 확인하세요.':e instanceof AnalysisInputError?'자료와 전문·권한 확인을 다시 확인해 주세요.':'자료·이웃 대상 설정·저장 상태를 확인하지 못했습니다. 자동 재요청하지 않습니다.'},e instanceof Error&&e.message==='wait'?429:e instanceof AnalysisInputError?400:409);}
};}
