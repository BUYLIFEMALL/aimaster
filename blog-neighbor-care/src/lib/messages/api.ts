import {randomBytes} from 'node:crypto';
import {AnalysisInputError,object,only,uuid,text,hash,bad,type ObjectValue} from '../analysis/contracts';
import type {AnalysisDependencies} from '../analysis/api';
import {prepareMessage,messagePrompt,messageSchema,validateMessage,type MessageBundle} from './contracts';
import {ProviderFailure,type Provider} from '../analysis/provider';
type Dependencies=Pick<AnalysisDependencies,'member'|'key'|'generate'>&{rpc:AnalysisDependencies['rpc']};
// v1.18(주인님 결정 2026-11-05): 문장 만들기 실패 원인 구분 — 회원이 무엇을 해야 할지 알 수 있게. 원문 오류·키는 내보내지 않는다.
export function messageFailure(e:unknown,attempted:boolean):{code:string;text:string}{
 if(e instanceof ProviderFailure){
  const c=e.providerCode;
  if(c==='authentication_required')return {code:'key_rejected',text:'[원인: 키 거부] 등록한 본인 키를 플랫폼이 받지 않았습니다. 키를 확인해 다시 등록해 주세요.'};
  if(c==='billing_required')return {code:'billing',text:'[원인: 결제·크레딧 부족] 본인 키 계정의 결제 상태나 크레딧을 확인해 주세요.'};
  if(c==='rate_limited')return {code:'rate_limited',text:'[원인: 사용 한도] 플랫폼 사용 한도에 걸렸습니다. 잠시 뒤 직접 다시 만들어 주세요.'};
  if(c==='model_unavailable'||c==='permission_denied')return {code:'model',text:'[원인: 모델 사용 불가] 선택한 모델을 이 키로 쓸 수 없습니다. 다른 모델을 골라 주세요.'};
  if(c==='provider_unavailable')return {code:'provider',text:'[원인: 플랫폼 오류] AI 플랫폼이 응답하지 못했습니다. 요금 발생 여부는 플랫폼 사용 기록에서 확인해 주세요.'};
  if(e.reason==='http_rejected'||e.reason==='transport')return {code:'no_response',text:'[원인: 응답 없음] AI 플랫폼 응답을 받지 못했습니다. 요금 발생 여부는 플랫폼 사용 기록에서 확인해 주세요.'};
  return {code:'incomplete',text:'[원인: 응답 불완전] AI 응답이 끝까지 오지 않았거나 형식이 맞지 않습니다. 요금이 발생했을 수 있습니다.'};
 }
 if(attempted&&e instanceof AnalysisInputError)return {code:'quality',text:'[원인: 품질 검사 미통과] 상투적인 문구·근거 부족·AI 같은 문장 등으로 채택하지 않았습니다. 요금은 발생했을 수 있으며, 글이나 사실을 바꿔 직접 다시 만들어 주세요.'};
 return {code:'storage',text:'[원인: 저장 확인 실패] 결과 저장을 확인하지 못했습니다.'};
}
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export function createMessageHandler(d:Dependencies){return async(request:Request)=>{
 if(request.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
 const u=new URL(request.url),origin=`${u.protocol}//${request.headers.get('host')??u.host}`;
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'프로그램에서 요청해 주세요.'},403);
 try{
  const a=await d.member();if(!a.allowed)return reply({error:a.error},a.status);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({error:'JSON 요청이 필요합니다.'},415);
  const reader=request.body?.getReader();if(!reader)bad();const chunks=[];let size=0;
  for(;;){const r=await reader!.read();if(r.done)break;size+=r.value.length;if(size>131072){await reader!.cancel();return reply({error:'입력 자료가 너무 큽니다.'},413);}chunks.push(r.value);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!object(v)||!only(v,['operation','payload'])||typeof v.operation!=='string'||!object(v.payload))bad();
  const rpc=async(op:string,p:ObjectValue={})=>{const r=await d.rpc(a.userId,op,p);if(r.error||r.data==null)throw Error('storage');return r.data;};
  const op=v.operation,p=v.payload;
  if(op==='list'){if(!only(p,[]))bad();return reply({data:await rpc('list')});}
  if(op==='get'||op==='cancel'||op==='material'){if(!only(p,['id'])||!uuid(p.id))bad();return reply({data:await rpc(op,{id:p.id})});}
  if(op==='adopt'){
   if(!only(p,['id','text','confirmed'])||!uuid(p.id)||p.confirmed!==true)bad();const old=await rpc('get',{id:p.id}),body=text(p.text,old.kind==='request'?200:600);
   if(/https?:\/\/|www\./i.test(body))bad();return reply({data:await rpc('adopt',{id:p.id,text:body,confirmed:true})});
  }
  if(op!=='generate')bad();const prepared=prepareMessage(p),queued=await rpc('prepare',prepared);
  if(queued.state!=='queued')return reply({data:await rpc('get',{id:prepared.id}),reused:true});
  const key=(await d.key(a.userId,prepared.input.provider as Provider))?.trim();if(!key||key.length>4096||/[\r\n]/.test(key))return reply({error:'선택한 플랫폼의 회원 본인 키를 등록해 주세요.',jobId:prepared.id},400);
  const before=await d.member();if(!before.allowed)return reply({error:before.error},before.status);if(before.userId!==a.userId)return reply({error:'계정을 다시 확인해 주세요.'},403);
  const run_hash=hash(randomBytes(32).toString('hex')),bundle=await rpc('claim',{id:prepared.id,run_hash}) as MessageBundle;let attempted=false;
  try{
   const prompt=messagePrompt(bundle);attempted=true;
   const raw=await d.generate(prepared.input.provider as Provider,String(prepared.input.model),key,prompt.system,prompt.user,messageSchema());
   const result=validateMessage(raw,bundle);await rpc('complete',{id:prepared.id,run_hash,result});
   const after=await d.member();if(!after.allowed)return reply({error:after.error},after.status);if(after.userId!==a.userId)return reply({error:'계정을 다시 확인해 주세요.'},403);
   return reply({data:await rpc('get',{id:prepared.id})});
  }catch(e){
   if(attempted)await rpc('uncertain',{id:prepared.id,run_hash}).catch(()=>{});
   const cause=messageFailure(e,attempted);
   return reply({error:`${cause.text} 문장 생성·품질·저장 결과를 확인하지 못했습니다. 자동 재호출하지 않습니다. 이전 생성 기록을 먼저 확인하세요.`,jobId:prepared.id,code:'MESSAGE_UNCONFIRMED',cause:cause.code},502);
  }
 }catch(e){return reply({error:e instanceof AnalysisInputError?'입력·자료 사용 권한·AI 전송 동의를 확인해 주세요.':'자료·프로필·저장 상태를 확인해 주세요.'},e instanceof AnalysisInputError?400:503);}
};}
