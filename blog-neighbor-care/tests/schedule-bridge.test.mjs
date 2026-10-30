import test from 'node:test';
import assert from 'node:assert/strict';
import {createExtensionSchedule,SCHEDULE_ALARM} from '../extension/schedule-bridge.mjs';
function fixture(){
 const storage={},calls=[],alarms=[],listeners={},s={time:100000,actor:'owner',device:'device',focused:true,url:'https://blog.naver.com/neighbor/123',result:{phase:'idle',reason:'not_due',nextDueAt:new Date(3700000).toISOString()},fail:false,resolve:null};
 const browser={storage:{session:{get:async k=>({[k]:storage[k]}),set:async v=>Object.assign(storage,v)}},alarms:{create:async(...v)=>alarms.push(v),clear:async()=>{}},tabs:{onActivated:{addListener:f=>listeners.activated=f},onUpdated:{addListener:f=>listeners.updated=f},query:async()=>[{id:7,windowId:8,url:s.url}]},windows:{get:async()=>({focused:s.focused,state:'normal'})}};
 const work={status:async()=>({phase:s.resolve??'idle',resultState:'uncertain'}),stop:async()=>calls.push('stop'),start:async opts=>{calls.push(opts);assert.equal(storage.scheduledWork.inFlight,true);if(s.fail)throw Error('lost');return s.result;}};
 const controller=createExtensionSchedule(browser,async()=>({deviceId:s.device,blogId:s.actor}),work,()=>s.time);
 return {storage,calls,alarms,s,controller,listeners,work};
}
test('SB01 explicit start creates an alarm, not an immediate job; server next time controls wakeup',async()=>{
 const f=fixture();await assert.rejects(f.controller.start(false));await f.controller.start(true);assert.equal(f.calls.length,0);
 await f.controller.alarm('unrelated');assert.equal(f.calls.length,0);await f.controller.alarm(SCHEDULE_ALARM);assert.deepEqual(f.calls,[{scheduled:true}]);assert.equal(f.storage.scheduledWork.inFlight,false);assert.equal(f.storage.scheduledWork.remaining,120);assert.equal(f.alarms.at(-1)[1].when,3700000);
});
test('SB02 successful result consumes one execution; expiry, foreground or URL/account change stops without executing',async()=>{
 const f=fixture();await f.controller.start(true);f.s.result={phase:'done',resultState:'succeeded'};await f.controller.alarm(SCHEDULE_ALARM);assert.equal(f.storage.scheduledWork.remaining,119);
 for(const mutate of [f=>f.s.focused=false,f=>f.s.url='https://blog.naver.com/other/123',f=>f.s.actor='other',f=>f.s.time+=9*3600000]){const g=fixture();await g.controller.start(true);mutate(g);await g.controller.alarm(SCHEDULE_ALARM);assert.equal(g.calls.length,0);assert.equal(g.storage.scheduledWork.enabled,false);}
});
test('SB03 uncertain reply persists in-flight guard, disables alarm and cannot automatically resume on worker restart',async()=>{
 const f=fixture();await f.controller.start(true);f.s.fail=true;await f.controller.alarm(SCHEDULE_ALARM);assert.equal(f.calls.length,1);assert.equal(f.storage.scheduledWork.enabled,false);assert.equal(f.storage.scheduledWork.inFlight,true);
 f.s.resolve='effect';await assert.rejects(f.controller.start(true));await f.controller.alarm(SCHEDULE_ALARM);assert.equal(f.calls.length,1);
});
test('SB04 manual stop and disabled/paused web state never execute a second action; empty browser session never resumes',async()=>{
 const f=fixture();await f.controller.start(true);await f.controller.stop();await f.controller.alarm(SCHEDULE_ALARM);assert.equal(f.calls.length,0);
 const g=fixture();await g.controller.alarm(SCHEDULE_ALARM);assert.equal(g.calls.length,0);
 for(const reason of ['disabled','result_check_required']){const h=fixture();await h.controller.start(true);h.s.result={phase:'idle',reason};await h.controller.alarm(SCHEDULE_ALARM);assert.equal(h.storage.scheduledWork.enabled,false);await h.controller.alarm(SCHEDULE_ALARM);assert.equal(h.calls.length,1);}
});

test('SB05 leaving a bound tab invalidates the session even if the user returns before the next alarm',async()=>{
 const f=fixture();await f.controller.start(true);f.listeners.activated({windowId:8,tabId:99});await new Promise(r=>setImmediate(r));await f.controller.alarm(SCHEDULE_ALARM);assert.equal(f.storage.scheduledWork.enabled,false);assert.equal(f.calls.length,0);
 const g=fixture();await g.controller.start(true);g.listeners.updated(7,{url:'https://blog.naver.com/neighbor/456'});await new Promise(r=>setImmediate(r));assert.equal(g.storage.scheduledWork.enabled,false);
});
test('SB06 stop during an in-flight alarm cannot be overwritten by its late successful response',async()=>{
 const f=fixture();await f.controller.start(true);let release;f.work.start=async()=>new Promise(r=>release=r);const pending=f.controller.alarm(SCHEDULE_ALARM);while(!release)await new Promise(r=>setImmediate(r));await f.controller.stop();release({phase:'done',resultState:'succeeded'});await pending;assert.equal(f.storage.scheduledWork.enabled,false);assert.ok(f.calls.includes('stop'));
});
