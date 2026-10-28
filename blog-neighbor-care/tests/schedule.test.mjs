import test from 'node:test';
import assert from 'node:assert/strict';
import {validSchedule,withinSchedule,nextSchedulePreview} from '../src/lib/schedule.ts';
import {createWorkHandler} from '../src/lib/work-api.ts';
const daytime={interval_minutes:30,start_minute:9*60,end_minute:18*60};
test('SC01 only30minutes or whole1~24hours are accepted; windows are bounded integer KST minutes',()=>{
 for(const value of [null,undefined,[],{},'60'])assert.equal(validSchedule(value),false);
 for(const interval_minutes of [30,...Array.from({length:24},(_,i)=>(i+1)*60)])assert.equal(validSchedule({...daytime,interval_minutes}),true);
 for(const patch of [{interval_minutes:0},{interval_minutes:45},{interval_minutes:1500},{interval_minutes:60.5},{start_minute:-1},{end_minute:1440},{start_minute:9.5}])assert.equal(validSchedule({...daytime,...patch}),false);
});
test('SC02 daytime and overnight windows include their start and exclude their end',()=>{
 for(const [minute,inside]of [[539,false],[540,true],[1079,true],[1080,false]])assert.equal(withinSchedule(minute,daytime),inside);
 const night={...daytime,start_minute:1320,end_minute:120};for(const [minute,inside]of [[1319,false],[1320,true],[0,true],[119,true],[120,false]])assert.equal(withinSchedule(minute,night),inside);
 assert.equal(withinSchedule(500,{...daytime,start_minute:0,end_minute:0}),true);
});
test('SC03 forecast rolls to the next KST window across midnight/year; no missed-run backlog',()=>{
 assert.equal(nextSchedulePreview(Date.parse('2026-10-28T08:20:00+09:00'),daytime),'2026-10-28T00:00:00.000Z');
 assert.equal(nextSchedulePreview(Date.parse('2026-12-31T17:40:00+09:00'),daytime),'2027-01-01T00:00:00.000Z');
 const night={...daytime,start_minute:1320,end_minute:120};assert.equal(nextSchedulePreview(Date.parse('2026-10-28T23:50:00+09:00'),night),'2026-10-28T15:20:00.000Z');
 assert.equal(nextSchedulePreview(Date.parse('2026-10-29T01:40:00+09:00'),night),'2026-10-29T13:00:00.000Z');
 const allDay={interval_minutes:1440,start_minute:0,end_minute:0};assert.equal(nextSchedulePreview(Date.parse('2026-10-28T23:50:00+09:00'),allDay),'2026-10-29T14:50:00.000Z');
 assert.throws(()=>nextSchedulePreview(NaN,daytime));
});
test('SC04 member scheduling requests cannot enable execution, forge identity, bypass interval/CAS validation',async()=>{
 const calls=[];const handler=createWorkHandler({authorize:async()=>({allowed:true,userId:'owner'}),execute:async(...args)=>{calls.push(args);return {data:{executionAvailable:false},error:null};}});
 const send=(operation,payload)=>handler(new Request('https://fixture.test/api/work',{method:'POST',headers:{origin:'https://fixture.test','content-type':'application/json'},body:JSON.stringify({operation,payload})}));
 const valid={...daytime,expected_revision:1};assert.equal((await send('save_schedule',valid)).status,200);assert.deepEqual(calls[0],['owner','save_schedule',valid]);
 for(const payload of [{...valid,enabled:true},{...valid,user_id:'victim'},{...valid,interval_minutes:45},{...daytime},{...valid,expected_revision:0},{...valid,expected_revision:1.5}])assert.equal((await send('save_schedule',payload)).status,400);
 assert.equal(calls.length,1);assert.equal((await send('schedule',{})).status,200);assert.equal((await send('schedule',{enabled:true})).status,400);
});
