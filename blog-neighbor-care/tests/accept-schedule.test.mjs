import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcceptSchedule,ACCEPT_SCHEDULE_ALARM} from '../extension/accept-schedule.mjs';
function fixture(){
 const saved={},calls=[],alarms=[],listeners={},s={url:'https://admin.blog.naver.com/owner',actor:'owner',time:100000,focused:true,result:{phase:'idle',reason:'not_due',nextDueAt:new Date(4000000).toISOString()},status:{state:'idle'},lose:false};
 const browser={storage:{session:{get:async k=>({[k]:saved[k]}),set:async v=>Object.assign(saved,v)}},alarms:{create:async(...v)=>alarms.push(v),clear:async()=>{}},tabs:{onActivated:{addListener:f=>listeners.activated=f},onUpdated:{addListener:f=>listeners.updated=f},query:async()=>[{id:7,windowId:8,url:s.url}]},windows:{get:async()=>({focused:s.focused,state:'normal'})}};
 const acceptance={status:async()=>s.status,stop:async()=>calls.push('stop'),start:async options=>{assert.equal(saved.acceptSchedule.inFlight,true);calls.push(options);if(s.lose)throw Error('lost');return s.result;}};
 const loop=createAcceptSchedule(browser,async()=>({deviceId:'device',blogId:s.actor}),acceptance,()=>s.time);
 return {saved,calls,alarms,listeners,s,loop};
}
test('AS01 explicit current admin-page consent starts an alarm without accepting; due result consumes one success',async()=>{
 const f=fixture();await assert.rejects(f.loop.start(false));await f.loop.start(true);assert.equal(f.calls.length,0);assert.equal(f.alarms[0][0],ACCEPT_SCHEDULE_ALARM);
 await f.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.deepEqual(f.calls,[{scheduled:true}]);assert.equal(f.alarms.at(-1)[1].when,4000000);assert.equal(f.saved.acceptSchedule.remaining,120);
 f.s.result={state:'succeeded',scheduleState:'idle'};await f.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(f.saved.acceptSchedule.remaining,119);assert.match((await f.loop.status()).message,/완료/);assert.equal(f.saved.scheduledWork,undefined);
});
test('AS02 uncertain result survives worker restart as a stop guard, never a second acceptance',async()=>{
 const f=fixture();await f.loop.start(true);f.s.lose=true;await f.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(f.saved.acceptSchedule.enabled,false);assert.equal(f.saved.acceptSchedule.inFlight,true);
 f.s.status={state:'uncertain'};await assert.rejects(f.loop.start(true));await f.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(f.calls.length,1);await f.loop.stop();assert.ok(f.calls.includes('stop'));assert.equal((await f.loop.status()).resultCheckRequired,true);
});
test('AS03 tab/URL/account/foreground/expiry changes stop before acceptance; empty session never auto-resumes',async()=>{
 for(const mutate of [f=>f.s.url='https://admin.blog.naver.com/other',f=>f.s.actor='other',f=>f.s.focused=false,f=>f.s.time+=9*3600000]){const f=fixture();await f.loop.start(true);mutate(f);await f.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(f.calls.length,0);assert.equal(f.saved.acceptSchedule.enabled,false);}
 const f=fixture();await f.loop.start(true);f.listeners.activated({windowId:8,tabId:99});await new Promise(r=>setImmediate(r));assert.equal(f.saved.acceptSchedule.enabled,false);await f.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(f.calls.length,0);
 const fresh=fixture();await fresh.loop.alarm(ACCEPT_SCHEDULE_ALARM);assert.equal(fresh.calls.length,0);
});
