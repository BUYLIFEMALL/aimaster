import {authorizeProgramUser} from '@/lib/access';
import {createCronClient} from '@/lib/neighbors/cronJob';
import {getCronKey,monitorRpc} from '@/lib/neighbors/monitorServer';
import {createMonitorCronHandler} from '@/lib/neighbors/monitorCron';
export const runtime='nodejs';export const dynamic='force-dynamic';export const fetchCache='force-no-store';export const maxDuration=30;
const handler=createMonitorCronHandler({rpc:monitorRpc,access:authorizeProgramUser,key:getCronKey,client:createCronClient(),
 feedEnabled:()=>process.env.BNC_SERVER_FEED_ENABLED==='true'&&process.env.BNC_FEED_READ_ENABLED==='true'&&!!process.env.BNC_FEED_READ_POLICY_REFERENCE?.trim()});
export const GET=handler;export const POST=handler;
