import 'server-only';
import {authorizeProgramUser} from '../access';
import {createAdminClient} from '../supabase/admin';
import {runServerWork} from './server';
import {runScheduledWork} from './scheduledWork';
import type {ExecutionAdapter} from './approvedWork';

// No route or cron calls this yet. Only a trusted permitted worker may provide
// a signed single-job ticket and the physical platform adapter.
export function runServerScheduledWork(ticket:string,revisions:{preferences:number;settings:number},adapter:ExecutionAdapter){
 return runScheduledWork(ticket,revisions,{
  secret:()=>process.env.BNC_WORKER_SECRET,
  authorize:authorizeProgramUser,
  tick:async(user,operation,payload)=>{
   const r=await createAdminClient().rpc('bnc_schedule_tick',{p_user_id:user,p_operation:operation,p_payload:payload});
   if(r.error)throw Error('Schedule operation unavailable');
   return r.data;
  },
  execute:value=>runServerWork(value,adapter),
 });
}
