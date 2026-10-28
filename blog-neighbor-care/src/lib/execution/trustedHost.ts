import {createHash} from 'node:crypto';
import {executeApprovedWork,type ExecutionAdapter,type ExecutionJob} from './approvedWork';
import {verifyWorkerTicket,type WorkerTicket} from './workerTicket';
type Obj=Record<string,unknown>;
export type ExecutionHostStore={
 member:(id:string)=>Promise<{allowed:boolean;userId?:string}>;
 connected:(ticket:WorkerTicket)=>Promise<boolean>;
 load:(userId:string,id:string)=>Promise<Obj|null>;
 permitted:(job:ExecutionJob)=>Promise<boolean>;
 rpc:(userId:string,operation:string,payload:Obj)=>Promise<unknown>;
 result:(userId:string,payload:Obj)=>Promise<unknown>;
};
// Internal callable only; no HTTP route or browser-side ticket issuer.
export async function runTicketedWork(ticket:unknown,d:{secret:()=>string|undefined;store:ExecutionHostStore;adapter:ExecutionAdapter;now?:()=>number}){
 const now=d.now??Date.now,secret=d.secret(),binding=verifyWorkerTicket(ticket,secret,now());
 if(!binding)return {status:'blocked',reason:'worker_unavailable',externalAttempted:false,reportStored:false};
 const authorize=async()=>{
  if(!verifyWorkerTicket(ticket,secret,now()))return false;
  const access=await d.store.member(binding.memberId);
  return access.allowed===true&&access.userId===binding.memberId&&await d.store.connected(binding)===true;
 };
 return executeApprovedWork({memberId:binding.memberId,jobId:binding.jobId,deviceId:binding.deviceId},{now,
  authorize,permitted:async(_user,job)=>await d.store.permitted(job)===true,
  load:async()=>{
   const job=await d.store.load(binding.memberId,binding.jobId);
   if(!job||job.account_id!==binding.accountId||job.actor_id!==binding.actorId||typeof job.body!=='string'||
    createHash('sha256').update(job.body).digest('hex')!==binding.bodyHash||job.approval_revision!==binding.approvalRevision||Number(job.generation)+1!==binding.generation)return null;
   return job;
  },adapter:d.adapter,rpc:async(_user,op,p)=>{
   if(op==='configure'){
    if(Object.keys(p).length!==1||p.enabled!==false)throw Error('Worker operation unavailable');
   }else if(p.id!==binding.jobId||!['observe','claim','arm','verify_permit','result'].includes(op))throw Error('Worker operation unavailable');
   if(['claim','arm','verify_permit','result'].includes(op)&&p.device_id!==binding.deviceId)throw Error('Worker device unavailable');
   if(['arm','verify_permit','result'].includes(op)&&p.generation!==binding.generation)throw Error('Worker generation unavailable');
   // Settlement is still allowed after membership/ticket expiry for this already
   // authenticated invocation, so a late result cannot trigger another action.
   if(op==='result')return d.store.result(binding.memberId,p);
   if(!verifyWorkerTicket(ticket,secret,now()))throw Error('Worker expired');
   const r=await d.store.rpc(binding.memberId,op,p);
   if(op==='claim'&&(!r||typeof r!=='object'||(r as Obj).generation!==binding.generation))throw Error('Worker generation changed');
   return r;
  }});
}
