// 2026-11-20 BLC-INS-05: 없는 블로그 주소로 글쓰기가 열려 네이버 「삭제되었거나 존재하지 않는 게시물」 화면이 뜨면
// inspect가 입력 전에 멈추고(account_mismatch) 블로그 ID 확인을 안내하는지 — 실제 editor.js를 가짜 화면에서 실행. 외부 요청 0.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/extension/editor.js'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../extension/editor.js'),'utf8');

async function inspect({bodyText='',href='https://blog.naver.com/buylifemall/postwrite',withTitle=false,args={blogId:'buylifemall'}}={}){
  const title={tagName:'P',isContentEditable:true,innerText:'',textContent:'',getClientRects:()=>[{}],matches:()=>false,closest:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
  const document={body:{innerText:bodyText},readyState:'complete',activeElement:null,
    querySelector:()=>null,
    querySelectorAll:selector=>withTitle&&/se-title-text|se-documentTitle|제목/.test(selector)?[title]:[]};
  const url=new URL(href);
  const sandbox={document,window:{},console,URL,Promise,navigator:{webdriver:false},location:{href,hostname:url.hostname,origin:url.origin,pathname:url.pathname},
    setTimeout:fn=>fn(),chrome:{runtime:{sendMessage:async()=>({ok:true})}},
    getComputedStyle:()=>({visibility:'visible'})};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return sandbox.editorCommand('inspect',args);
}

test('없는 블로그 주소 화면은 입력 전에 멈추고 블로그 ID 확인을 안내한다',async()=>{
  const result=await inspect({bodyText:'삭제되었거나 존재하지 않는 게시물입니다.\n블로그 홈으로'});
  assert.equal(result.status,'account_mismatch');
  assert.match(result.reason,/블로그 ID/);
  assert.match(result.reason,/blog\.naver\.com\/아이디/);
});

test('비슷한 다른 네이버 안내 문구도 같은 판정',async()=>{
  for(const bodyText of ['존재하지 않는 블로그입니다.','존재하지 않는 게시물입니다.']){
    assert.equal((await inspect({bodyText})).status,'account_mismatch',bodyText);
  }
});

test('편집기 제목 칸이 있으면 본문에 같은 문구가 있어도 이 판정을 하지 않는다(본문 글자 오판 방지)',async()=>{
  const result=await inspect({bodyText:'삭제되었거나 존재하지 않는 게시물 관련 원고',withTitle:true});
  assert.doesNotMatch(String(result.reason||''),/블로그 ID가 실제 블로그 주소/);
});

test('기존 판정 보존: 로그인 화면은 expired, 권한 문구는 기존 계정 안내',async()=>{
  assert.equal((await inspect({href:'https://nid.naver.com/nidlogin.login'})).status,'expired');
  const denied=await inspect({bodyText:'권한이 없습니다.'});
  assert.equal(denied.status,'account_mismatch');
  assert.equal(denied.reason,'이 블로그의 계정으로 로그인해 주세요.');
});

test('문구가 없는 빈 화면은 기존처럼 unknown(자동 ID 변경 없음)',async()=>{
  const result=await inspect({bodyText:''});
  assert.equal(result.status,'unknown');
});

// ── 다중 프레임(Mac msg_ee3d93a963ff): 각 프레임은 실제 editor.js로 판정하고, 실제 background.js inspect가 결과를 고른다.
const backgroundSource=process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/extension/background.js'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8');
const visibleEl=(extra={})=>({tagName:'P',isContentEditable:true,innerText:'',textContent:'',getClientRects:()=>[{}],matches:()=>false,closest:()=>null,querySelector:()=>null,querySelectorAll:()=>[],cloneNode(){return this;},...extra});
async function frame({bodyText='',href='https://blog.naver.com/buylifemall/postwrite',editor=false}={}){
  const title=visibleEl(),paragraph=visibleEl();
  const document={body:{innerText:bodyText},readyState:'complete',activeElement:null,querySelector:()=>null,
    querySelectorAll:selector=>!editor?[]:/se-section-text/.test(selector)?[paragraph]:/se-title-text|se-documentTitle|제목/.test(selector)?[title]:[]};
  const url=new URL(href);
  const sandbox={document,window:{},console,URL,Promise,navigator:{webdriver:false},location:{href,hostname:url.hostname,origin:url.origin,pathname:url.pathname,search:url.search},
    setTimeout:fn=>fn(),chrome:{runtime:{sendMessage:async()=>({ok:true})}},getComputedStyle:()=>({visibility:'visible'})};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return sandbox.editorCommand('inspect',{blogId:'buylifemall'});
}
async function combined(frames){
  const results=await Promise.all(frames.map(f=>frame(f)));
  const data={connection:{blogId:'buylifemall',token:'t'}};
  const event=()=>({addListener(){}});
  const tab={id:1,windowId:1,status:'complete',url:'https://blog.naver.com/buylifemall/postwrite'};
  const sandbox={URL,AbortSignal,Uint8Array,btoa,Number,Date,crypto,console:{warn(){}},importScripts(){},setInterval(){},clearInterval(){},setTimeout:fn=>fn(),
    chrome:{storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(k=>k in data).map(k=>[k,structuredClone(data[k])])),set:async v=>Object.assign(data,v),remove:async()=>{}},onChanged:event()},
      tabs:{get:async()=>structuredClone(tab),query:async()=>[structuredClone(tab)],create:async()=>tab,update:async()=>tab,remove:async()=>{},onUpdated:event(),onRemoved:event(),onReplaced:event()},
      windows:{get:async id=>({id,state:'normal'}),update:async()=>({})},
      scripting:{executeScript:async()=>results.map((result,i)=>({frameId:i,result}))},
      alarms:{create:async()=>{},onAlarm:event()},action:{onClicked:event(),setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},
      runtime:{getManifest:()=>({version_name:'v0'}),getURL:f=>f,onStartup:event(),onInstalled:event(),onMessage:event()}},
    editorCommand(){},fetch:async()=>({ok:true,json:async()=>({task:null})})};
  vm.createContext(sandbox);vm.runInContext(backgroundSource,sandbox);
  await new Promise(r=>setImmediate(r));
  return {results,picked:await sandbox.inspect(1)};
}
const MISSING='삭제되었거나 존재하지 않는 게시물입니다.';

test('다중 프레임: 정상 주 프레임 + 안내 문구가 본문에 있는 하위 프레임 → 정상 편집기를 막지 않는다(오탐 수정)',async()=>{
  const {results,picked}=await combined([{editor:true},{bodyText:MISSING}]);
  assert.equal(results[0].status,'valid','주 프레임 가짜 화면이 실제 editor.js에서 정상 편집기로 판정돼야 함');
  assert.equal(results[1].status,'account_mismatch');
  assert.equal(picked.status,'valid');
  assert.equal(picked.frameId,0);
});

test('다중 프레임: 하위 프레임이 앞에 와도 같은 결과',async()=>{
  const {picked}=await combined([{bodyText:MISSING},{editor:true}]);
  assert.equal(picked.status,'valid');
  assert.equal(picked.frameId,1);
});

test('다중 프레임: 정상 편집기가 없으면 실제 오류 화면은 입력 전에 멈춘다(보존)',async()=>{
  for(const frames of [[{bodyText:MISSING}],[{bodyText:''},{bodyText:MISSING}],[{bodyText:MISSING},{bodyText:'존재하지 않는 블로그입니다.'}]]){
    const {picked}=await combined(frames);
    assert.equal(picked.status,'account_mismatch');
    assert.match(picked.reason,/블로그 ID/);
  }
});

test('다중 프레임: 정상 편집기가 있어도 기존 중단 조건은 그대로 먼저 멈춘다 — 주소 계정 불일치·로그인·보안·권한 문구',async()=>{
  const cases=[
    [{href:'https://blog.naver.com/PostWriteForm.naver?blogId=someoneelse'},'account_mismatch',/다른 블로그의 편집기/],
    [{href:'https://nid.naver.com/nidlogin.login'},'expired',/로그인/],
    [{bodyText:'보안 확인을 진행해 주세요'},'security_check',/추가 인증/],
    [{bodyText:'권한이 없습니다.'},'account_mismatch',/이 블로그의 계정으로 로그인/],
  ];
  for(const [hard,status,reason] of cases){
    for(const frames of [[{editor:true},hard],[hard,{editor:true}],[{editor:true},{bodyText:MISSING},hard]]){
      const {picked}=await combined(frames);
      assert.equal(picked.status,status,JSON.stringify(hard));
      assert.match(picked.reason,reason);
    }
  }
});
