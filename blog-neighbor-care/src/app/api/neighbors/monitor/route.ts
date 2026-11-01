import {createMonitorHandler} from '@/lib/neighbors/monitor';
import {analysisDependencies} from '@/lib/analysis/server';
import {createCronClient} from '@/lib/neighbors/cronJob';
import {deleteCronKey,getCronKey,monitorRpc,saveCronKey} from '@/lib/neighbors/monitorServer';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export const POST=createMonitorHandler({member:analysisDependencies.member,key:analysisDependencies.key,generate:analysisDependencies.generate,
 feedEnabled:()=>process.env.BNC_FEED_READ_ENABLED==='true'&&!!process.env.BNC_FEED_READ_POLICY_REFERENCE?.trim(),
 aiEnabled:()=>process.env.BNC_AUTO_MESSAGE_ENABLED==='true',prices:()=>process.env.BNC_AUTO_MESSAGE_PRICES,
 rpc:monitorRpc,cron:{key:getCronKey,saveKey:saveCronKey,deleteKey:deleteCronKey,client:createCronClient()},
});
