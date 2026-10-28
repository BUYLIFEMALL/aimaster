import { randomBytes } from 'node:crypto';
import type { Access } from '../work-api';
import { AnalysisInputError, bad, generation, hash, object, only, preferences, profileFields, prompt, strings, uuid, validateResult, type Bundle, type ObjectValue } from './contracts';
import { ProviderFailure, type Provider, type ProviderCode } from './provider';

export type GenerationFailureDiagnostic = {
  jobId: string; kind: 'profile' | 'candidates'; provider: Provider; model: string;
  stage: 'prompt' | 'provider' | 'validation' | 'persist' | 'access_check' | 'result_read';
  reason: string; httpStatus?: number; providerCode?: ProviderCode;
};

export type AnalysisDependencies = {
  member:()=>Promise<Access>;
  rpc:(userId:string,operation:string,payload:ObjectValue)=>Promise<{data:any;error:any}>; // RPC JSON boundary
  key:(userId:string,provider:Provider)=>Promise<string|null>;
  generate:(provider:Provider,model:string,key:string,system:string,user:string)=>Promise<unknown>;
  reportFailure?:(diagnostic:GenerationFailureDiagnostic)=>Promise<void>|void;
};
class RpcError extends Error {constructor(readonly code:string){super(code);}}
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','vary':'Cookie, Origin','x-content-type-options':'nosniff'}});
async function read(request:Request) {
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply({error:'JSON 요청이 필요합니다.'},415);
  const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')??request.headers.get('host')??new URL(request.url).host;
  try {const o=new URL(origin??'');if(o.host!==host || !['https:','http:'].includes(o.protocol) || origin!==o.origin)return reply({error:'프로그램에서 요청해 주세요.'},403);}
  catch{return reply({error:'프로그램에서 요청해 주세요.'},403);}
  const stream=request.body?.getReader();if(!stream)bad();const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await stream!.read();if(done)break;size+=value.length;if(size>196608){await stream!.cancel();return reply({error:'입력 자료가 너무 큽니다.'},413);}chunks.push(value);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{bad();}
}
export function createAnalysisHandler(deps:AnalysisDependencies) {
  const rpc=async(userId:string,operation:string,payload:ObjectValue={})=>{
    const r=await deps.rpc(userId,operation,payload);
    if(r.error){const code=String(r.error.message??'').match(/BNC_ANALYSIS_[A-Z_]+/)?.[0];throw new RpcError(code??'STORAGE_UNAVAILABLE');}
    if(r.data==null)throw new RpcError('STORAGE_UNAVAILABLE');return r.data;
  };
  return async function handle(request:Request):Promise<Response> {
    if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
    try {
      const access=await deps.member();if(!access.allowed)return reply({error:access.error},access.status);
      const userId=access.userId,input=await read(request);if(input instanceof Response)return input;
      if(!object(input) || !only(input,['operation','payload']) || typeof input.operation!=='string' || !object(input.payload))bad();
      const {operation,payload}=input as {operation:string;payload:ObjectValue};
      if(operation==='list'){if(!only(payload,[]))bad();return reply({data:await rpc(userId,'list')});}
      if(operation==='get'){if(!only(payload,['id']) || !uuid(payload.id))bad();return reply({data:await rpc(userId,'get',{id:payload.id})});}
      if(operation==='cancel'){if(!only(payload,['id']) || !uuid(payload.id))bad();return reply({data:await rpc(userId,'cancel',{id:payload.id})});}
      if(operation==='review_profile') {
        if(!only(payload,['id','revision','profile','preferences','confirmed']) || !uuid(payload.id) || !Number.isInteger(payload.revision) || (payload.revision as number)<0 || payload.confirmed!==true)bad();
        const profile={profile:profileFields(payload.profile),preferences:preferences(payload.preferences),memberConfirmed:true};
        return reply({data:await rpc(userId,operation,{id:payload.id,revision:payload.revision,profile})});
      }
      if(operation==='select_candidates') {
        if(!only(payload,['id','blogIds']) || !uuid(payload.id))bad();const ids=strings(payload.blogIds,6,50);
        if(ids.some(x=>!/^[a-z0-9_-]{1,50}$/.test(x)))bad();
        return reply({data:await rpc(userId,operation,{id:payload.id,blogIds:ids})});
      }
      if(operation!=='profile' && operation!=='candidates')bad();
      const prepared=generation(operation,payload),inputHash=hash([prepared.kind,prepared.input]);
      const job=await rpc(userId,'prepare',{...prepared,input_hash:inputHash});
      if(job.state!=='queued')return reply({data:await rpc(userId,'get',{id:prepared.id}),reused:true});
      // Existing member-owned key store only. No process env/provider fallback and no key in job data.
      const key=(await deps.key(userId,prepared.input.provider))?.trim();
      if(!key || key.length>4096 || /[\r\n]/.test(key))return reply({error:'회원 본인의 AI 키를 등록해 주세요.',needKey:true,jobId:prepared.id},400);
      const current=await deps.member();if(!current.allowed)return reply({error:current.error},current.status);
      if(current.userId!==userId)return reply({error:'로그인 계정을 다시 확인해 주세요.'},403);
      const runHash=hash(randomBytes(32).toString('hex'));
      const bundle=await rpc(userId,'claim',{id:prepared.id,run_hash:runHash}) as Bundle;
      let attempted=false;
      let stage: GenerationFailureDiagnostic['stage']='prompt';
      try {
        const messages=prompt(bundle);attempted=true;
        stage='provider';
        const output=await deps.generate(prepared.input.provider,prepared.input.model,key,messages.system,messages.user);
        stage='validation';
        const result=validateResult(output,bundle);
        stage='persist';
        await rpc(userId,'complete',{id:prepared.id,run_hash:runHash,result});
        stage='access_check';
        const after=await deps.member();
        if(!after.allowed)return reply({error:after.error},after.status);
        if(after.userId!==userId)return reply({error:'로그인 계정을 다시 확인해 주세요.'},403);
        stage='result_read';
        return reply({data:await rpc(userId,'get',{id:prepared.id})});
      } catch(error) {
        if(attempted)await rpc(userId,'uncertain',{id:prepared.id,run_hash:runHash}).catch(()=>{});
        // Internal metadata only. Never log errors/messages, input, output,
        // authorization data or run capabilities, and never retry generation.
        const diagnostic:GenerationFailureDiagnostic={jobId:prepared.id,kind:operation==='profile'?'profile':'candidates',provider:prepared.input.provider,model:prepared.input.model,stage,
          reason:error instanceof ProviderFailure ? error.reason : stage==='validation' ? 'result_invalid' : stage==='persist' || stage==='result_read' ? 'storage_failed' : 'unconfirmed'};
        const status=error instanceof ProviderFailure ? error.httpStatus : undefined;
        if(typeof status==='number' && Number.isInteger(status) && status>=400 && status<=599)diagnostic.httpStatus=status;
        if(error instanceof ProviderFailure && error.providerCode)diagnostic.providerCode=error.providerCode;
        try { await deps.reportFailure?.(diagnostic); } catch { /* telemetry cannot change the result or retry */ }
        return reply({error:'생성 결과를 확정하지 못했습니다. 같은 요청을 자동으로 다시 실행하지 않습니다. 결과 상태를 확인해 주세요.',code:'GENERATION_UNCONFIRMED',jobId:prepared.id},502);
      }
    } catch(error) {
      if(error instanceof AnalysisInputError)return reply({error:'분석 입력·모델·동의 항목을 확인해 주세요.'},400);
      if(error instanceof RpcError){
        if(error.code==='BNC_ANALYSIS_NOT_FOUND')return reply({error:'유효한 본인 분석 결과가 없습니다.'},404);
        if(['BNC_ANALYSIS_SOURCE_UNAVAILABLE','BNC_ANALYSIS_WRONG_BLOG','BNC_ANALYSIS_PROFILE_REQUIRED','BNC_ANALYSIS_INPUT'].includes(error.code))return reply({error:'본인 자료·보관 기한·확인한 프로필을 점검해 주세요.',code:error.code},400);
        if(['BNC_ANALYSIS_CHANGED','BNC_ANALYSIS_ALREADY_STARTED','BNC_ANALYSIS_STALE_PROFILE','BNC_ANALYSIS_RUN_MISMATCH','BNC_ANALYSIS_LIMIT'].includes(error.code))return reply({error:'기존 요청 상태 또는 프로필 변경을 확인해 주세요.',code:error.code},409);
      }
      return reply({error:'분석 서버 상태를 확인해 주세요.'},503);
    }
  };
}
