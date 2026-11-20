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
