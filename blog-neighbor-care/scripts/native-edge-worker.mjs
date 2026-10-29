// Private operator host only. Not a member installer and never packaged with
// database credentials. Edge connects through an explicitly registered host.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createNativeBrowserPeer,createNativeExecutionAdapter} from '../src/lib/execution/nativeBrowser.ts';

export async function runNativeEdgeWorker({input,output,binding,profile,createWorker,cycles=1,timeoutMs=15000}){
 if(!Number.isInteger(cycles)||cycles<1||cycles>120||profile?.v!==1||profile.reviewed!==true||typeof profile.reference!=='string'||!profile.reference.trim())throw Error('Native host configuration unavailable');
 const peer=createNativeBrowserPeer(input,output,Object.freeze({...binding}),{timeoutMs}),controller=new AbortController();
 void peer.ended.then(()=>controller.abort());
 const disconnected=()=>controller.abort();input.once('end',disconnected);input.once('error',disconnected);
 try{
  const url=await peer.ready;const worker=createWorker(binding,createNativeExecutionAdapter(peer,profile),url);
  // The worker rechecks member/device/policy/live/approval every cycle. Merely
  // connecting never creates, approves, enables or retries a job.
  return await worker.run({signal:controller.signal,cycles});
 }finally{controller.abort();peer.close();input.off('end',disconnected);input.off('error',disconnected);}
}
async function main(){
 const origin=process.argv[2],id=process.env.BNC_EDGE_EXTENSION_ID;
 if(!/^[a-p]{32}$/.test(id??'')||origin!==`chrome-extension://${id}/`)throw Error('Unexpected native origin');
 if(process.env.BNC_NATIVE_OPERATOR_ENABLED!=='true'||!process.env.BNC_NATIVE_BINDING||!process.env.BNC_DOM_PROFILE_PATH)throw Error('Native host disabled');
 const binding=JSON.parse(process.env.BNC_NATIVE_BINDING),profile=JSON.parse(readFileSync(process.env.BNC_DOM_PROFILE_PATH,'utf8'));
 if(Object.keys(binding).sort().join(',')!=='accountId,actorId,deviceId,memberId'||![binding.memberId,binding.accountId,binding.deviceId].every(v=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v))||!/^[a-z0-9_-]{1,50}$/.test(binding.actorId))throw Error('Native binding unavailable');
 const {createServerScheduleWorker}=await import('../src/lib/execution/scheduleWorkerServer.ts');
 await runNativeEdgeWorker({input:process.stdin,output:process.stdout,binding,profile,createWorker:createServerScheduleWorker,cycles:Number(process.env.BNC_NATIVE_CYCLES??1)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // stdout belongs exclusively to the framed protocol; no body, token, DB error
 // or worker ticket is logged even on failure.
 main().then(()=>process.exit(0),()=>process.exit(1));
}
