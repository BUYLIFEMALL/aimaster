import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFeedWatch,parseFeedPosts,FEED_ALARM} from '../extension/feed-watch.mjs';
import {createMonitorExtensionHandler} from '../src/lib/neighbors/monitorExtension.ts';
const session='11111111-1111-4111-8111-111111111111';
const item=(owner,id,title=`글 ${id}`)=>`<item><title><![CDATA[${title}]]></title><link>https://blog.naver.com/${owner}/${id}?fromRss=true&amp;trackingCode=rss</link><description><![CDATA[<p>요약 본문</p>]]></description><pubDate>Sun, 01 Nov 2026 10:00:00 +0900</pubDate></item>`;
const rss=(owner,...ids)=>`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>블로그</title>${ids.map(i=>item(owner,i)).join('')}</channel></rss>`;
function fixture(neighbors=['alpha','beta']){
 const store={},alarms=[],cleared=[],f={time:Date.UTC(2026,10,2),feeds:{alpha:['1'],beta:['2']},feedStatus:null,reads:[],fail:null,syncActive:true};
 const calls=[];
 const browser={storage:{local:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v),remove:async k=>{delete store[k];}}},alarms:{create:async(n,o)=>alarms.push([n,o]),clear:async n=>cleared.push(n)}};
 const api=async(op,p)=>{calls.push({op,p});if(f.fail?.[op])throw Object.assign(Error('fail'),{status:f.fail[op]});if(op==='sync')return f.syncActive?{active:true,sessionId:f.session??session,expiresAt:new Date(f.time+7*864e5).toISOString(),neighbors}:{active:false};if(op==='report')return {savedCount:p.posts.length};return {stopped:true};};
 const fetcher=async(url,o)=>{f.reads.push(url);assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');const owner=/\/([a-z0-9_-]+)\.xml$/.exec(url)[1];if(f.feedStatus)return new Response('',{status:f.feedStatus});return new Response(rss(owner,...f.feeds[owner]));};
 const watch=createFeedWatch(browser,api,fetcher,()=>f.time,async()=>{f.time+=1000;});
 return {store,alarms,cleared,calls,f,watch,reports:()=>calls.filter(c=>c.op==='report'),syncs:()=>calls.filter(c=>c.op==='sync')};
}
test('FW01 the parser keeps only title, number and date from a real-shaped Naver feed and refuses a foreign owner',()=>{
 const posts=parseFeedPosts(rss('alpha','123','456'),'alpha');assert.deepEqual(posts.map(p=>p.postId),['123','456']);assert.equal(posts[0].title,'글 123');assert.equal(posts[0].publishedAt,'2026-11-01T01:00:00.000Z');assert.deepEqual(Object.keys(posts[0]).sort(),['postId','publishedAt','title']);
 assert.equal(parseFeedPosts(`<rss><channel><item><title>A &amp; B &#54620;</title><link>https://blog.naver.com/PostView.naver?blogId=alpha&amp;logNo=9</link></item></channel></rss>`,'alpha')[0].title,'A & B 한');
 assert.throws(()=>parseFeedPosts(rss('other','1'),'alpha'),/Feed owner/);assert.throws(()=>parseFeedPosts('<!DOCTYPE x><rss></rss>','alpha'),/Feed format/);assert.throws(()=>parseFeedPosts('<html></html>','alpha'),/Feed format/);
 assert.equal(parseFeedPosts(`<rss>${Array.from({length:60},(_,i)=>item('alpha',i+1)).join('')}</rss>`,'alpha').length,50);
});
test('FW02 only unseen posts reach the server: a repeat check makes no server call, and a new post sends just that post',async()=>{
 const f=fixture();await f.watch.sync();assert.equal(f.alarms.at(-1)[0],FEED_ALARM);assert.equal(f.alarms.at(-1)[1].periodInMinutes,5);
 await f.watch.alarm(FEED_ALARM);assert.deepEqual(f.f.reads,['https://rss.blog.naver.com/alpha.xml','https://rss.blog.naver.com/beta.xml']);assert.equal(f.reports().length,2);
 const before=f.calls.length;f.f.time+=15*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.f.reads.length,4);assert.equal(f.calls.length,before);
 f.f.time+=15*60000;f.f.feeds.alpha=['3','1'];await f.watch.alarm(FEED_ALARM);assert.equal(f.reports().length,3);assert.deepEqual(f.reports().at(-1).p.posts.map(p=>p.postId),['3']);assert.deepEqual(Object.keys(f.reports().at(-1).p.posts[0]).sort(),['postId','publishedAt','title']);
});
test('FW09 the first read stores only the last week; older posts count as seen and are never sent later',async()=>{
 const f=fixture(['alpha']);await f.watch.sync();f.f.time+=30*864e5;await f.watch.sync();await f.watch.alarm(FEED_ALARM);assert.equal(f.reports().length,0);assert.deepEqual(f.store.feedWatch.rows.alpha.seen,['1']);
 f.f.time+=15*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.reports().length,0);
 f.f.feeds.alpha=['9','1'];f.f.time+=15*60000;await f.watch.alarm(FEED_ALARM);assert.deepEqual(f.reports().at(-1).p.posts.map(p=>p.postId),['9']);
});
test('FW03 each neighbor is read at most once in 15 minutes and one wake reads at most 20',async()=>{
 const names=Array.from({length:50},(_,i)=>`n${i}`),f=fixture(names);for(const n of names)f.f.feeds[n]=[];await f.watch.sync();
 await f.watch.alarm(FEED_ALARM);assert.equal(f.f.reads.length,20);const first=new Set(f.f.reads);
 f.f.time+=5*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.f.reads.length,40);assert.equal(new Set(f.f.reads).size,40);assert.equal(f.f.reads.slice(20).filter(u=>first.has(u)).length,0);
});
test('FW04 a failed read skips that neighbor; a 403 or 429 stops this wake and waits an hour',async()=>{
 const f=fixture();await f.watch.sync();f.f.feedStatus=500;await f.watch.alarm(FEED_ALARM);assert.equal(f.f.reads.length,2);assert.equal(f.store.feedWatch.failures,2);assert.equal(f.reports().length,0);
 const g=fixture();await g.watch.sync();g.f.feedStatus=429;await g.watch.alarm(FEED_ALARM);assert.equal(g.f.reads.length,1);g.f.feedStatus=null;
 g.f.time+=30*60000;await g.watch.alarm(FEED_ALARM);assert.equal(g.f.reads.length,1);assert.match((await g.watch.status()).message,/제한/);
 g.f.time+=31*60000;await g.watch.alarm(FEED_ALARM);assert.equal(g.f.reads.length,3);
});
test('FW05 a failed report leaves the post unseen so the next due check sends it again; a changed session asks the server first',async()=>{
 const f=fixture(['alpha']);await f.watch.sync();f.f.fail={report:503};await f.watch.alarm(FEED_ALARM);assert.equal(f.reports().length,1);assert.deepEqual(f.store.feedWatch.rows.alpha.seen,[]);
 f.f.fail=null;f.f.time+=15*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.reports().length,2);assert.deepEqual(f.store.feedWatch.rows.alpha.seen,['1']);
 const g=fixture(['alpha']);await g.watch.sync();g.f.fail={report:409};await g.watch.alarm(FEED_ALARM);assert.equal(g.store.feedWatch.syncedAt,0);g.f.fail=null;g.f.syncActive=false;g.f.time+=60000;await g.watch.alarm(FEED_ALARM);assert.equal(g.store.feedWatch,undefined);assert.equal(g.f.reads.length,1);
});
test('FW06 server calls stay low: the hourly check carries counters, and an inactive answer stops reading',async()=>{
 const f=fixture(['alpha']);await f.watch.sync();await f.watch.alarm(FEED_ALARM);assert.equal(f.syncs().length,1);
 f.f.time+=60*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.syncs().length,2);assert.equal(f.syncs()[1].p.reads,1);assert.equal(f.store.feedWatch.reads,1);
 f.f.syncActive=false;f.f.time+=60*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.store.feedWatch,undefined);assert.ok(f.cleared.includes(FEED_ALARM));const reads=f.f.reads.length;f.f.time+=15*60000;await f.watch.alarm(FEED_ALARM);assert.equal(f.f.reads.length,reads);
});
test('FW07 a browser restart resumes a saved session only; a lost connection and a session a day unconfirmed read nothing',async()=>{
 const none=fixture();await none.watch.resume();assert.equal(none.alarms.length,0);
 const f=fixture();await f.watch.sync();const n=f.alarms.length;await f.watch.resume();assert.equal(f.alarms.length,n+1);
 const lost=fixture();await lost.watch.sync();lost.f.time+=60*60000;lost.f.fail={sync:401};await lost.watch.alarm(FEED_ALARM);assert.equal(lost.store.feedWatch,undefined);assert.equal(lost.f.reads.length,0);
 const off=fixture();await off.watch.sync();off.f.time+=25*60*60000;off.f.fail={sync:503};await off.watch.alarm(FEED_ALARM);assert.equal(off.f.reads.length,0);assert.ok(off.store.feedWatch);
 const near=fixture();await near.watch.sync();near.f.time+=2*60*60000;near.f.fail={sync:503};await near.watch.alarm(FEED_ALARM);assert.equal(near.f.reads.length,2);
});
test('FW08 stop reaches the server, a new session forgets the old list, and the manifest allows only the RSS host',async()=>{
 const f=fixture(['alpha']);await f.watch.sync();await f.watch.alarm(FEED_ALARM);f.f.session='22222222-2222-4222-8222-222222222222';await f.watch.sync();assert.deepEqual(f.store.feedWatch.rows,{});assert.equal(f.store.feedWatch.savedCount,0);
 await f.watch.stop();assert.equal(f.calls.at(-1).op,'stop');assert.equal(f.calls.at(-1).p.sessionId,f.f.session);assert.equal(f.store.feedWatch,undefined);
 const manifest=JSON.parse(readFileSync(new URL('../extension/manifest.json',import.meta.url)));assert.ok(manifest.host_permissions.includes('https://rss.blog.naver.com/*'));assert.ok(!manifest.host_permissions.includes('https://blog.naver.com/*'));
});
const token='a'.repeat(64);
const req=(operation,payload,headers={})=>new Request('https://fixture.test/api/neighbors/monitor/extension',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...headers},body:JSON.stringify({operation,payload})});
function server(o={}){const calls=[];return {calls,handler:createMonitorExtensionHandler({authorize:async()=>o.access??{allowed:true,userId:'member'},feedEnabled:()=>o.feed??true,rpc:async(u,op,p)=>{calls.push({u,op,p});return o.fail?{data:null,error:{message:'BNC_MONITOR_CHANGED'}}:{data:{active:true,savedCount:1},error:null};}})};}
const good={sessionId:session,neighborId:'alpha',posts:[{postId:'12',title:'제목',publishedAt:null}]};
test('FWS1 the server rebuilds each record, forces an empty body and refuses anything else',async()=>{
 const s=server();assert.equal((await s.handler(req('report',good))).status,200);const post=s.calls[0].p.posts[0];assert.equal(s.calls[0].op,'extension_report');assert.equal(post.blogId,'alpha');assert.equal(post.body,'');assert.match(post.hash,/^[a-f0-9]{64}$/);
 for(const bad of [{...good,posts:[{...good.posts[0],body:'본문'}]},{...good,posts:[{...good.posts[0],blogId:'other'}]},{...good,posts:[]},{...good,neighborId:'../x'},{...good,sessionId:'x'},{...good,userId:'other'},{...good,posts:[{...good.posts[0],postId:'abc'}]},{...good,posts:[{...good.posts[0],title:'가\n나'}]},{...good,posts:[good.posts[0],good.posts[0]]}]){assert.equal((await s.handler(req('report',bad))).status,400);}
 assert.equal(s.calls.length,1);
});
test('FWS2 a token, an active member and the operator switch are all required; a web-page origin is refused',async()=>{
 const s=server();assert.equal((await s.handler(req('sync',{reads:0,failures:0,lastReadAt:null},{authorization:''}))).status,401);assert.equal((await s.handler(req('sync',{reads:0,failures:0,lastReadAt:null},{origin:'https://evil.test'}))).status,403);assert.equal(s.calls.length,0);
 const denied=server({access:{allowed:false,status:403}});assert.equal((await denied.handler(req('report',good))).status,403);assert.equal(denied.calls.length,0);
 const off=server({feed:false});const r=await off.handler(req('sync',{reads:1,failures:0,lastReadAt:null}));assert.equal((await r.json()).data.active,false);assert.equal((await off.handler(req('report',good))).status,409);assert.equal(off.calls.length,0);
 assert.equal((await s.handler(req('sync',{reads:-1,failures:0,lastReadAt:null}))).status,400);assert.equal((await s.handler(req('claim',{}))).status,400);
 const changed=server({fail:true});assert.equal((await changed.handler(req('report',good))).status,409);
});
