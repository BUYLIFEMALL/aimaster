import {createHash,randomBytes} from 'node:crypto';
// Member's own cron-job.org account (docs/SCHEDULER_POLICY.md). The job carries a per-member token; CRON_SECRET and operator keys never leave the server.
const API='https://api.cron-job.org';
export const MONITOR_CRON_URL='https://blog-neighbor-care.buylife.xyz/api/neighbors/monitor/cron';
export const MONITOR_TOKEN=/^bnc_mon_[0-9a-f]{64}$/;
export const hashMonitorToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export function newMonitorToken(){const token=`bnc_mon_${randomBytes(32).toString('hex')}`;return {token,tokenHash:hashMonitorToken(token)};}
export type CronClient={upsert:(key:string,token:string)=>Promise<number>;setEnabled:(key:string,jobId:number,enabled:boolean)=>Promise<void>};
function message(status:number){
 if(status===401)return 'cron-job.org API 키가 올바르지 않습니다. 콘솔 Settings에서 키를 다시 복사해 주세요.';
 if(status===403)return 'cron-job.org가 요청을 거부했습니다. API 키에 IP 제한이 있으면 해제해 주세요.';
 if(status===404)return 'cron-job.org 작업을 찾지 못했습니다. 감시를 중단한 뒤 다시 시작해 주세요.';
 if(status===429)return 'cron-job.org 호출 한도를 넘었습니다. 잠시 뒤 또는 내일 다시 시도해 주세요.';
 return `cron-job.org 요청이 실패했습니다(HTTP ${status}). 잠시 뒤 다시 시도해 주세요.`;
}
export function createCronClient(fetcher:typeof fetch=fetch):CronClient{
 const call=async(key:string,method:string,path:string,body?:unknown)=>{
  const r=await fetcher(`${API}${path}`,{method,headers:{authorization:`Bearer ${key}`,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error(message(r.status));const text=await r.text();return text?JSON.parse(text):{};
 };
 // Every five minutes: enough for 50 neighbors at 15 minutes each, and fewer server calls than one per minute.
 const job=(token:string)=>({job:{url:MONITOR_CRON_URL,enabled:true,title:'AI 블로그 이웃 소통 자동화 새 글 확인(5분)',saveResponses:false,requestMethod:0,requestTimeout:30,schedule:{timezone:'Asia/Seoul',expiresAt:0,hours:[-1],mdays:[-1],minutes:[0,5,10,15,20,25,30,35,40,45,50,55],months:[-1],wdays:[-1]},extendedData:{headers:{Authorization:`Bearer ${token}`}}}});
 return {
  upsert:async(key,token)=>{
   const {jobs}=await call(key,'GET','/jobs'),found=(jobs??[]).find((j:{url:string;jobId:number})=>j.url===MONITOR_CRON_URL);
   if(found){await call(key,'PATCH',`/jobs/${found.jobId}`,job(token));return found.jobId;}
   const {jobId}=await call(key,'PUT','/jobs',job(token));if(!Number.isSafeInteger(jobId))throw Error('cron-job.org 작업을 만들지 못했습니다.');return jobId;
  },
  setEnabled:async(key,jobId,enabled)=>{await call(key,'PATCH',`/jobs/${jobId}`,{job:{enabled}});},
 };
}
