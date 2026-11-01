import {createMonitorExtensionHandler} from '@/lib/neighbors/monitorExtension';
import {monitorRpc} from '@/lib/neighbors/monitorServer';
import {readerDependencies} from '@/lib/reader/server';
export const runtime='nodejs';export const dynamic='force-dynamic';export const fetchCache='force-no-store';
export const POST=createMonitorExtensionHandler({
 authorize:async hash=>{const d=await readerDependencies.device(hash);if(!d)return {allowed:false,status:401};const a=await readerDependencies.user(d.userId);return a.allowed?{allowed:true,userId:d.userId}:{allowed:false,status:a.status};},
 feedEnabled:()=>process.env.BNC_FEED_READ_ENABLED==='true'&&!!process.env.BNC_FEED_READ_POLICY_REFERENCE?.trim(),
 rpc:(user,op,payload)=>monitorRpc(user,'monitor',op,payload as never),
});
