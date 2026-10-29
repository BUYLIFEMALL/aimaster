import {createHash} from 'node:crypto';
import {issueWorkerTicket} from './workerTicket';
export type ScheduleWorkerBinding={memberId:string;accountId:string;deviceId:string;actorId:string};
type Outcome={status:string;reason:string;externalAttempted:boolean;reportStored:boolean};
export type ScheduleWorkerContext={memberId:string;allowed:boolean;connected:boolean;enabled:boolean;liveAllowed:boolean;
 settingsRevision:number;preferenceRevision:number;policyKinds:readonly string[]};
export type ScheduleWorkerDependencies={
 secret:()=>string|undefined;
 context:(binding:Readonly<ScheduleWorkerBinding>)=>Promise<ScheduleWorkerContext>;
 jobs:(binding:Readonly<ScheduleWorkerBinding>,revision:number,policyKinds:readonly string[])=>Promise<Record<string,unknown>[]>;
 dispatch:(ticket:string,revisions:{preferences:number;settings:number},signal:AbortSignal)=>Promise<Outcome>;
 now?:()=>number;
 wait?:(milliseconds:number,signal:AbortSignal)=>Promise<void>;
};
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const wait=(milliseconds:number,signal:AbortSignal)=>new Promise<void>(resolve=>{
 if(signal.aborted){resolve();return;}
 const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};
 const timer=setTimeout(finish,milliseconds);signal.addEventListener('abort',finish,{once:true});
});
/** Private, bounded polling host. Durable timing/ownership stays in the SQL
 * cursor, never in this timer. Do not start inside a short-lived HTTP request. */
export function createScheduleWorker(input:ScheduleWorkerBinding,d:ScheduleWorkerDependencies){
 const binding=Object.freeze({...input}),now=d.now??Date.now;
 const validBinding=[binding.memberId,binding.accountId,binding.deviceId].every(uuid)&&/^[a-z0-9_-]{1,50}$/.test(binding.actorId);
 let busy=false;
 const blocked=(reason:string):Outcome=>({status:'blocked',reason,externalAttempted:false,reportStored:false});
 async function poll(signal=new AbortController().signal):Promise<Outcome>{
  if(signal.aborted)return blocked('worker_stopped');
  if(busy)return blocked('worker_busy');
  const secret=d.secret();if(!validBinding||typeof secret!=='string'||secret.length<32)return blocked('worker_unavailable');
  busy=true;let dispatched=false;
  try{
   const c=await d.context(binding);
   if(signal.aborted)return blocked('worker_stopped');
   if(c.memberId!==binding.memberId||!c.allowed||!c.connected||!c.enabled||!c.liveAllowed||
    ![c.settingsRevision,c.preferenceRevision].every(n=>Number.isSafeInteger(n)&&n>0)||!Array.isArray(c.policyKinds)||
    !c.policyKinds.some(kind=>['request','like','comment','reply'].includes(kind)))return blocked('worker_not_permitted');
   const jobs=await d.jobs(binding,c.settingsRevision,c.policyKinds.filter(kind=>['request','like','comment','reply'].includes(kind)));
   if(signal.aborted)return blocked('worker_stopped');
   if(!Array.isArray(jobs)||jobs.length>10)return blocked('worker_queue_unavailable');
   const job=jobs.find(j=>uuid(j.id)&&j.user_id===binding.memberId&&j.account_id===binding.accountId&&j.actor_id===binding.actorId&&
    j.state==='ready'&&j.approval_revision===c.settingsRevision&&typeof j.approval_hash==='string'&&/^[a-f0-9]{64}$/.test(j.approval_hash)&&
    typeof j.kind==='string'&&['request','like','comment','reply'].includes(j.kind)&&c.policyKinds.includes(j.kind)&&
    typeof j.body==='string'&&j.body.length<=4000&&typeof j.expires_at==='string'&&Date.parse(j.expires_at)>now()&&
    Number.isSafeInteger(j.generation)&&Number(j.generation)>=0&&Number(j.generation)<Number.MAX_SAFE_INTEGER);
   if(!job)return blocked('no_approved_work');
   const ticket=issueWorkerTicket({...binding,jobId:job.id as string,bodyHash:createHash('sha256').update(job.body as string).digest('hex'),
    approvalRevision:c.settingsRevision,generation:Number(job.generation)+1},secret,now());
   dispatched=true;
   const result=await d.dispatch(ticket,{preferences:c.preferenceRevision,settings:c.settingsRevision},signal);
   if(!result||!['blocked','succeeded','uncertain'].includes(result.status)||typeof result.externalAttempted!=='boolean'||typeof result.reportStored!=='boolean'||
    (result.status==='blocked'&&result.externalAttempted)||(result.status==='succeeded'&&(!result.externalAttempted||!result.reportStored)))throw Error('Worker result unavailable');
   return result;
  }catch{return dispatched?{status:'uncertain',reason:'worker_dispatch_unconfirmed',externalAttempted:true,reportStored:false}:blocked('worker_setup_unavailable');}
  finally{busy=false;}
 }
 async function run(options:{signal:AbortSignal;cycles:number;intervalMs?:number}){
  const interval=options.intervalMs??30000;
  if(!Number.isInteger(options.cycles)||options.cycles<1||options.cycles>120||!Number.isInteger(interval)||interval<30000||interval>300000)throw Error('Worker bounds required');
  const results:Outcome[]=[];
  for(let i=0;i<options.cycles&&!options.signal.aborted;i++){
   const result=await poll(options.signal);results.push(result);
   // Never turn an ambiguous external outcome into an automatic retry.
   if(result.status==='uncertain')break;
   if(i+1<options.cycles&&!options.signal.aborted)await(d.wait??wait)(interval,options.signal);
  }
  return results;
 }
 return {poll,run};
}
