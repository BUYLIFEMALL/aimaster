import {verifyWorkerTicket} from './workerTicket';

type Obj=Record<string,unknown>;
type Outcome={status:string;reason:string;externalAttempted:boolean;reportStored:boolean};
type Dependencies={
 secret:()=>string|undefined;
 authorize:(memberId:string)=>Promise<{allowed:boolean;userId?:string}>;
 tick:(memberId:string,operation:'begin'|'finish',payload:Obj)=>Promise<unknown>;
 execute:(ticket:string)=>Promise<Outcome>;
 now?:()=>number;
};
const object=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Private worker entry, never a member endpoint or a timer. The SQL cursor must
 * commit before executing; uncertain RPC responses must never trigger a retry. */
export async function runScheduledWork(ticket:string,revisions:{preferences:number;settings:number},d:Dependencies){
 const blocked=(reason:string)=>({status:'blocked',reason,externalAttempted:false,reportStored:false});
 const b=verifyWorkerTicket(ticket,d.secret(),(d.now??Date.now)());
 if(!b||![revisions.preferences,revisions.settings].every(n=>Number.isSafeInteger(n)&&n>0)||b.approvalRevision!==revisions.settings)return blocked('schedule_unavailable');
 let checkpoint:Obj;
 try{
  const member=await d.authorize(b.memberId);
  if(!member.allowed||member.userId!==b.memberId)return blocked('schedule_unavailable');
  const c=await d.tick(b.memberId,'begin',{job_id:b.jobId,device_id:b.deviceId,preference_revision:revisions.preferences,settings_revision:revisions.settings});
  if(!object(c)||c.acquired!==true)return blocked('schedule_not_acquired');
  if(c.user_id!==b.memberId||c.job_id!==b.jobId||c.device_id!==b.deviceId||c.state!=='running'||
   typeof c.run_id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(c.run_id)||
   !Number.isSafeInteger(c.generation)||Number(c.generation)<1)return blocked('schedule_unconfirmed');
  checkpoint=c;
 }catch{return blocked('schedule_unconfirmed');}
 let outcome:Outcome;
 try{outcome=await d.execute(ticket);}catch{
  // The execute call may have crossed the external-action boundary.
  outcome={status:'uncertain',reason:'execution_unconfirmed',externalAttempted:true,reportStored:false};
 }
 try{
  const settled=await d.tick(b.memberId,'finish',{run_id:checkpoint.run_id,generation:checkpoint.generation,blocked:outcome.status==='blocked'&&!outcome.externalAttempted});
  if(!object(settled)||settled.user_id!==b.memberId||settled.run_id!==checkpoint.run_id||settled.generation!==checkpoint.generation||
   settled.state!=='idle'||settled.last_result!==(outcome.status==='succeeded'?'succeeded':'blocked'))throw Error('Unconfirmed checkpoint');
  return outcome;
 }catch{return {...outcome,status:'uncertain',reason:'schedule_settlement_unconfirmed'};}
}
