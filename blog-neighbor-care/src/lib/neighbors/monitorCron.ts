import type {ObjectValue} from '../analysis/contracts';
import {hashMonitorToken,MONITOR_TOKEN,type CronClient} from './cronJob';
import {runFeedWork,type MonitorRpc} from './monitor';
// cron-job.org counts a slow answer as a failure at 30s: start no new read after 15s, and each read times out at 10s.
const START_BUDGET_MS=15000,MAX_READS=20;
type D={rpc:(user:string|null,ns:'monitor'|'post'|'scheduler',op:string,p:ObjectValue)=>Promise<{data:any;error:unknown}>;access:(user:string)=>Promise<{allowed:boolean}>;key:(user:string)=>Promise<string|null>;client:CronClient;feedEnabled:()=>boolean;fetcher?:typeof fetch;now?:()=>number};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store'}});
export function createMonitorCronHandler(d:D){return async(req:Request)=>{
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()??'';
 if(!MONITOR_TOKEN.test(token))return reply({error:'Unauthorized'},401);
 const now=d.now??Date.now,started=now();let user='',jobId:number|null=null;
 const rpc:MonitorRpc=async(ns,op,p={})=>{const r=await d.rpc(user,ns as 'monitor'|'post'|'scheduler',op,p);if(r.error||r.data==null)throw Error('store');return r.data;};
 const disable=async(reason:string)=>{
  try{const key=await d.key(user);if(key&&jobId)await d.client.setEnabled(key,jobId,false);await rpc('scheduler','set',{active:false,lastError:null});}
  catch{await rpc('scheduler','set',{lastError:'cron-job.org 작업을 끄지 못했습니다. 다음 호출 때 다시 시도합니다.'}).catch(()=>{});}
  return reply({ok:true,reason});
 };
 // Only a bad token is a failure for cron-job.org: 25 failures would silently switch the member's job off.
 try{
  const found=await d.rpc(null,'scheduler','lookup',{tokenHash:hashMonitorToken(token)});
  if(found.error)return reply({ok:false});
  if(!found.data?.userId)return reply({error:'Unauthorized'},401);
  user=found.data.userId;jobId=found.data.jobId;
  if(found.data.paused)return reply({ok:true,reason:'paused'});
  let status=await rpc('monitor','status');
  if(!(await d.access(user)).allowed){
   if(status.monitor?.state==='active')await rpc('monitor','stop',{sessionId:status.monitor.id}).catch(()=>{});
   return await disable('access');
  }
  if(status.monitor?.state!=='active'||!status.monitor.background||status.monitor.runner!=='server')return await disable('inactive');
  if(!d.feedEnabled())return reply({ok:false,reason:'feed_disabled'});
  let reads=0;
  while(reads<MAX_READS&&now()-started<START_BUDGET_MS){
   const work=await rpc('monitor','claim',{sessionId:status.monitor.id,feedOnly:true});if(work.phase!=='feed')break;
   const result=await runFeedWork(rpc,work,d.fetcher);reads++;
   if(result.status===403||result.status===429)break; // Back off for this run; a blocked source is never retried in a loop.
  }
  status=await rpc('monitor','status');
  if(status.monitor?.state!=='active')return await disable('inactive');
  return reply({ok:true,reads});
 }catch{return reply({ok:false});}
};}
