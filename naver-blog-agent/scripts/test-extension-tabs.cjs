// Run the actual background worker against a browser that can close tabs between awaits.
// No paid APIs, member data changes or real publication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/extension/background.js'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8');
const flush = () => new Promise(resolve=>setImmediate(resolve));
let passed = 0;
async function scenario(name, check) { await check(); passed++; console.log('PASS '+name); }
async function browser(initial={}) {
  const data=structuredClone(initial), tabs=new Map(), events={}, calls=[], reports=[], warnings=[];
  let execute = async({args})=>[{frameId:0,result:args[0]==='inspect'?{status:'valid',hasContent:false}:{ok:true,categories:[{id:'29',name:'AI'}]}}];
  let network = async()=>({ok:true,json:async()=>({task:null,state:'running',userId:'owner'})});
  const event=name=>({addListener(fn){events[name]=fn;}});
  const absent=id=>new Error('No tab with id: '+id+'.');
  const get=async id=>{calls.push(['get',id]);if(!tabs.has(id))throw absent(id);return structuredClone(tabs.get(id));};
  const sandbox={URL,AbortSignal,Uint8Array,btoa,Number,Date,crypto,console:{warn:m=>warnings.push(m)},
    importScripts(){},setInterval(){},clearInterval(){},setTimeout:resolve=>resolve(),
    chrome:{
      storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async values=>Object.assign(data,structuredClone(values)),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete data[k])}},
      tabs:{get,query:async()=>[...tabs.values()].map(t=>structuredClone(t)),
        create:async details=>{const tab={id:100+tabs.size,windowId:1,status:'complete',...details};tabs.set(tab.id,tab);calls.push(['create',tab.id]);return tab;},
        update:async(id,details)=>{calls.push(['update',id]);if(!tabs.has(id))throw absent(id);Object.assign(tabs.get(id),details);return structuredClone(tabs.get(id));},
        remove:async id=>{if(!tabs.delete(id))throw absent(id);},onUpdated:event('updated'),onRemoved:event('removed'),onReplaced:event('replaced')},
      windows:{update:async()=>({})},scripting:{executeScript:async request=>{calls.push(['script',request.args[0]]);return execute(request);}},
      alarms:{create:async()=>{},onAlarm:event('alarm')},action:{onClicked:event('clicked'),setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},
      runtime:{getManifest:()=>({version_name:'v1.63'}),getURL:f=>'chrome-extension://test/'+f,onStartup:event('startup'),onInstalled:event('installed'),onMessage:event('message')}
    },
    editorCommand(){},fetch:async(url,init)=>{if(url.endsWith('/finish'))reports.push(JSON.parse(init.body));return network(url,init);}
  };
  // Keep startup disconnected; then install the scenario state after startup has settled.
  const connection=data.connection;delete data.connection;
  vm.createContext(sandbox);vm.runInContext(source,sandbox);await flush();
  if(connection)data.connection=connection;
  return {sandbox,data,tabs,events,calls,reports,warnings,execute:fn=>execute=fn,network:fn=>network=fn,
    send:(message,sender={})=>new Promise(resolve=>events.message(message,sender,resolve)),
    add:(id=1)=>tabs.set(id,{id,windowId:1,status:'complete',url:'https://blog.naver.com/myblog/postwrite'})};
}
const connection={blogId:'myblog',token:'test-token'};
const task=stage=>({id:'task',blogId:'myblog',tabId:1,editorResetStarted:true,stage,type:'publish',payload:{publishScheduleMode:'now',interactive:true}});
(async()=>{
  await scenario('closed idle tab: clear references, preserve account and checkpoint, stop repeated queries',async()=>{
    const b=await browser({connection,editorTab:1,completedEditorTab:{id:1},session:{status:'valid',checkedAt:'2000-01-01'},authoringCheckpoint:{done:5}});
    await b.sandbox.pump();
    assert.equal(b.data.editorTab,undefined);assert.equal(b.data.completedEditorTab,undefined);
    assert.match(b.data.session.reason,/탭이 닫혔거나/);assert.equal(b.data.connection.token,'test-token');assert.equal(b.data.authoringCheckpoint.done,5);
    const count=b.calls.filter(c=>c[0]==='get').length;await b.sandbox.pump();
    assert.equal(b.calls.filter(c=>c[0]==='get').length,count);assert.equal(b.calls.some(c=>c[0]==='create'),false);
  });
  await scenario('onRemoved and onReplaced preserve task and ignore unrelated/old events',async()=>{
    const b=await browser({connection,editorTab:2,completedEditorTab:{id:1},activeTask:task('writing'),authoringCheckpoint:{done:6}});
    await b.events.removed(1);assert.equal(b.data.editorTab,2);assert.equal(b.data.completedEditorTab,undefined);
    await b.events.removed(99);assert.equal(b.data.editorTab,2);
    await b.events.replaced(3,2);assert.equal(b.data.editorTab,undefined);assert.equal(b.data.activeTask.stage,'writing');assert.equal(b.data.authoringCheckpoint.done,6);
  });
  await scenario('tab closes after existence check but before injection: friendly error and no retry',async()=>{
    const b=await browser({connection,editorTab:1});b.add();
    b.execute(async()=>{b.tabs.delete(1);throw new Error('No tab with id: 1.');});
    await assert.rejects(()=>b.sandbox.command(1,'title',{text:'제목'}),e=>e.code==='EDITOR_TAB_CLOSED');
    assert.equal(b.data.editorTab,undefined);assert.equal(b.calls.filter(c=>c[0]==='script').length,1);
  });
  await scenario('empty frame response returns unknown; permission errors remain visible',async()=>{
    const b=await browser({connection,editorTab:1});b.add();b.execute(async()=>[]);
    assert.equal((await b.sandbox.inspect(1)).status,'unknown');
    b.execute(async()=>{throw new Error('Cannot access contents of the page.');});
    await assert.rejects(()=>b.sandbox.command(1,'title'),/Cannot access/);assert.equal(b.data.editorTab,1);
  });
  await scenario('user explicitly reconnects after tab loss: reuse own editor without clearing contents',async()=>{
    const b=await browser({connection,editorTab:1,authoringCheckpoint:{done:7}});b.add(2);
    assert.equal(await b.sandbox.editorTab(true),2);assert.equal(b.data.editorTab,2);
    assert.equal(b.calls.some(c=>c[0]==='create'),false);assert.equal(b.tabs.get(2).url,'https://blog.naver.com/myblog/postwrite');assert.equal(b.data.authoringCheckpoint.done,7);
  });
  await scenario('selected tab disappears before focus: friendly error without resetting another editor',async()=>{
    const b=await browser({connection,editorTab:1});b.add();
    b.sandbox.chrome.tabs.update=async()=>{b.tabs.delete(1);throw new Error('No tab with id: 1.');};
    await assert.rejects(()=>b.sandbox.editorTab(true),e=>e.code==='EDITOR_TAB_CLOSED');assert.equal(b.data.editorTab,undefined);assert.equal(b.calls.some(c=>c[0]==='create'),false);
  });
  await scenario('waiting task loses tab: report one controlled failure and keep checkpoint',async()=>{
    const b=await browser({connection,editorTab:1,activeTask:task('waiting_login'),authoringCheckpoint:{done:8}});
    await b.sandbox.pump();assert.equal(b.reports.length,1);assert.match(b.reports[0].error,/EDITOR_TAB_CLOSED/);
    assert.equal(b.data.activeTask,undefined);assert.equal(b.data.authoringCheckpoint.done,8);assert.equal(b.calls.some(c=>c[0]==='create'),false);
  });
  await scenario('worker restarts while writing: never reset or publish editor automatically',async()=>{
    const b=await browser({connection,activeTask:task('writing'),authoringCheckpoint:{done:9}});b.add();
    await b.sandbox.pump();assert.equal(b.reports.length,1);assert.match(b.reports[0].error,/EDITOR_INTERRUPTED/);
    assert.equal(b.calls.some(c=>['script','update','create'].includes(c[0])),false);assert.equal(b.data.authoringCheckpoint.done,9);
  });
  await scenario('login screen closes after preparation: finish once instead of repeating a stuck task',async()=>{
    const b=await browser({connection,editorTab:1,activeTask:task('waiting_login')});
    b.sandbox.prepareFreshNaver=async()=>({status:'expired'});
    await b.sandbox.pump();assert.equal(b.reports.length,1);assert.match(b.reports[0].error,/EDITOR_TAB_CLOSED/);assert.equal(b.data.activeTask,undefined);
  });
  await scenario('worker restarts after final click: uncertain result, no repeat publication',async()=>{
    const b=await browser({connection,activeTask:task('final_publish')});
    await b.sandbox.pump();assert.equal(b.reports.length,1);assert.match(b.reports[0].error,/PUBLISH_UNCERTAIN/);assert.equal(b.calls.some(c=>c[0]==='create'||c[0]==='script'),false);
  });
  await scenario('tab closes during body input: one controlled failure, no new editor or final click',async()=>{
    const b=await browser({connection,editorTab:1,activeTask:task('waiting_login'),authoringCheckpoint:{done:9}});b.add();
    b.sandbox.prepareFreshNaver=async()=>({status:'valid'});
    b.sandbox.publish=async()=>b.sandbox.command(1,'paragraph',{text:'본문'});
    b.execute(async({args})=>{if(args[0]==='paragraph'){b.tabs.delete(1);throw new Error('No tab with id: 1.');}return [{frameId:0,result:{status:'valid'}}];});
    await b.sandbox.resume(task('waiting_login'));assert.equal(b.reports.length,1);assert.match(b.reports[0].error,/EDITOR_TAB_CLOSED/);
    assert.equal(b.data.authoringCheckpoint.done,9);assert.equal(b.calls.some(c=>c[0]==='create'||c[1]==='click'),false);
  });
  await scenario('tab closes at final click: uncertain result, no automatic publication retry',async()=>{
    const b=await browser({connection,editorTab:1,activeTask:task('waiting_login')});b.add();
    b.sandbox.prepareFreshNaver=async()=>({status:'valid'});b.sandbox.writeArticle=async()=>({complete:true});
    b.execute(async({args})=>{
      if(args[0]==='inspect')return [{frameId:0,result:{status:'valid'}}];
      if(args[0]==='click' && args[1].selector.includes('tpb*i.publish')){b.tabs.delete(1);throw new Error('No tab with id: 1.');}
      return [{frameId:0,result:{ok:true}}];
    });
    await b.sandbox.resume(task('waiting_login'));assert.equal(b.reports.length,1);assert.match(b.reports[0].error,/PUBLISH_UNCERTAIN/);
    const scripts=b.calls.filter(c=>c[0]==='script').length;await b.sandbox.pump();assert.equal(b.calls.filter(c=>c[0]==='script').length,scripts);
  });
  await scenario('slow old-tab inspection cannot overwrite the replacement session',async()=>{
    const b=await browser({connection,editorTab:1,titleProbeBuild:'20260927.7',session:{status:'valid',reason:'new session'}});
    b.sandbox.inspect=async()=>{b.data.editorTab=2;return {status:'unknown',reason:'old session',closed:true};};
    await b.sandbox.inspectSession(1);assert.equal(b.data.session.reason,'new session');
    await b.events.removed(1);assert.equal(b.data.editorTab,2);assert.equal(b.data.session.reason,'new session');
  });
  await scenario('confirmed publication + finish network failure: retain success and retry only reporting',async()=>{
    const b=await browser({connection,activeTask:task('writing'),authoringCheckpoint:{done:10}});b.add();
    b.sandbox.prepareFreshNaver=async()=>({status:'valid'});b.sandbox.publish=async()=>({published:true,url:'https://blog.naver.com/myblog/123'});
    b.network(async url=>{if(url.endsWith('/finish'))throw new Error('Failed to fetch');return {ok:true,json:async()=>({state:'running'})};});
    await assert.rejects(()=>b.sandbox.resume(task('writing')),/Failed to fetch/);
    assert.equal(b.reports.length,1);assert.equal(b.data.pendingResult.result.published,true);assert.equal(b.data.pendingResult.error,undefined);
    b.network(async()=>({ok:true,json:async()=>({task:null})}));await b.sandbox.pump();
    assert.equal(b.reports.length,2);assert.equal(b.reports[1].success,true);assert.equal(b.data.pendingResult,undefined);assert.equal(b.data.activeTask,undefined);assert.equal(b.data.authoringCheckpoint.done,10);
  });
  await scenario('successful category read survives closed web requester; member isolation still enforced',async()=>{
    const b=await browser({connection,editorTab:1});b.add();
    const denied=await b.send({type:'categories',userId:'other',blogId:'myblog'});assert.match(denied.error,/회원이 다릅니다/);
    const result=await b.send({type:'categories',userId:'owner',blogId:'myblog'},{tab:{id:999},url:'https://naver-blog-agent.vercel.app/queue'});
    assert.equal(result.categories.length,1);assert.equal(result.error,undefined);assert.equal(result.token,undefined);
  });
  await scenario('updated event uses provided tab instead of racy second query; every event rejection is handled',async()=>{
    const b=await browser();await b.events.updated(999,{status:'complete'},{url:'https://blog.naver.com/myblog/postwrite'});
    assert.equal(b.calls.some(c=>c[0]==='get'),false);
    b.sandbox.chrome.tabs.create=async()=>{throw new Error('No tab with id: 999.');};
    await b.events.clicked();assert.match(b.data.connectionError,/No tab/);
    b.sandbox.chrome.storage.local.get=async()=>{throw new Error('Storage unavailable');};
    await b.events.updated(999,{status:'complete'},{url:'https://example.com'});assert.equal(b.data.connectionError,'Storage unavailable');
    b.sandbox.chrome.storage.local.set=async()=>{throw new Error('Storage unavailable');};
    await b.events.removed(1);assert.equal(b.warnings.length,1);
  });
  console.log(`${passed} browser lifecycle regression scenarios passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
