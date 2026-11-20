// 2026-11-20 BLC-INS-08 + P2(Mac msg_b686ef72ba0d): 프록시가 화면 요청마다 Supabase 세션을 갱신하고, @supabase/ssr 0.12.x의
// setAll(cookies, headers) 캐시 금지 헤더(첫 쿠키 쓰기 때만 전달)와 모든 쿠키(청크 삭제 포함)를 최종 응답에 반영하는지.
// 실제 next/server·@supabase/ssr을 가짜로 바꿔 src/proxy.ts를 실행한다. 외부 요청 0.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const file=process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/src/proxy.ts'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../src/proxy.ts'),'utf8');
const js=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const cookieDomain=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/supabase/cookieDomain.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const CACHE={'Cache-Control':'private, no-cache, no-store, must-revalidate, max-age=0',Expires:'0',Pragma:'no-cache'};

// mode: 'refresh'(한 번 갱신) · 'two-calls'(첫 호출: 청크 삭제+새 값+헤더, 둘째 호출: 다른 쿠키+빈 헤더 — 라이브러리 문서의 「첫 쓰기 때만」) · 'none'
function load(mode){
  const calls={getUser:0};
  const cd={exports:{}};new Function('module','exports',cookieDomain)(cd,cd.exports);
  class Res{constructor(kind,url){this.kind=kind;this.url=url;this.cookies={list:[],set:(n,v,o)=>this.cookies.list.push({n,v,o})};const h=new Map();this.headers={set:(k,v)=>h.set(k,v),get:k=>h.get(k),all:()=>Object.fromEntries(h)};}}
  const made=[];
  const NextResponse={next:()=>{const r=new Res('next');made.push(r);return r;},redirect:(url,status)=>Object.assign(new Res('redirect',url),{status})};
  const ssr={createServerClient:(_u,_k,opts)=>({auth:{getUser:async()=>{
    calls.getUser++;
    if(mode==='refresh')opts.cookies.setAll([{name:'sb-x-auth-token',value:'new',options:{path:'/'}}],{...CACHE});
    if(mode==='two-calls'){
      opts.cookies.setAll([{name:'sb-x-auth-token.1',value:'',options:{path:'/',maxAge:0}},{name:'sb-x-auth-token.0',value:'chunk0',options:{path:'/'}}],{...CACHE});
      opts.cookies.setAll([{name:'sb-x-auth-token-code-verifier',value:'',options:{path:'/',maxAge:0}}],{});
    }
    return {data:{user:null}};
  }}})};
  const mod={exports:{}};
  const req=n=>n==='next/server'?{NextResponse}:n==='@supabase/ssr'?ssr:n==='@/lib/supabase/cookieDomain'?cd.exports:{};
  new Function('module','exports','require','process',js)(mod,mod.exports,req,{env:{NEXT_PUBLIC_SUPABASE_URL:'https://x.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon'}});
  return {proxy:mod.exports.proxy,config:mod.exports.config,calls,made};
}
function request(host,pathname='/dashboard'){
  const jar=new Map([['sb-x-auth-token','old']]);
  return {jar,headers:{get:k=>k==='host'?host:null},nextUrl:{pathname,search:''},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),set:(n,v)=>jar.set(n,v)}};
}
const cookieRows=res=>res.cookies.list.map(c=>[c.n,c.v,c.o.domain,c.o.maxAge]).sort((a,b)=>a[0].localeCompare(b[0]));

test('세션을 갱신하면 쿠키(공유 도메인)와 캐시 금지 헤더 3개가 최종 응답에 함께 실린다',async()=>{
  const {proxy,calls}=load('refresh');
  const res=await proxy(request('naver-blog-agent.buylife.xyz'));
  assert.equal(calls.getUser,1);
  assert.equal(res.kind,'next');
  assert.deepEqual(cookieRows(res),[['sb-x-auth-token','new','.buylife.xyz',undefined]]);
  assert.deepEqual(res.headers.all(),CACHE);
});

test('setAll이 두 번 불려도(둘째는 빈 헤더) 앞 호출의 헤더·쿠키를 잃지 않고, 청크 삭제 쿠키도 그대로 반영',async()=>{
  const {proxy}=load('two-calls');
  const req=request('naver-blog-agent.buylife.xyz');
  const res=await proxy(req);
  assert.deepEqual(res.headers.all(),CACHE);
  assert.deepEqual(cookieRows(res),[
    ['sb-x-auth-token-code-verifier','','.buylife.xyz',0],
    ['sb-x-auth-token.0','chunk0','.buylife.xyz',undefined],
    ['sb-x-auth-token.1','','.buylife.xyz',0],
  ]);
  assert.equal(req.jar.get('sb-x-auth-token.0'),'chunk0','요청 쿠키에도 반영(다음 서버 처리에서 새 값 사용)');
});

test('vercel.app 화면 요청은 지금처럼 새 주소로 308, 세션 조회·캐시 헤더 없음',async()=>{
  const {proxy,calls}=load('refresh');
  const res=await proxy(request('naver-blog-agent-abc.vercel.app','/queue'));
  assert.equal(res.kind,'redirect');assert.equal(res.status,308);
  assert.equal(res.url,'https://naver-blog-agent.buylife.xyz/queue');
  assert.equal(calls.getUser,0);
  assert.deepEqual(res.headers.all(),{});
});

test('buylife.xyz가 아닌 주소(로컬)는 쿠키 도메인을 붙이지 않지만 캐시 금지 헤더는 붙인다',async()=>{
  const {proxy}=load('refresh');
  const res=await proxy(request('localhost:3000'));
  assert.equal(res.cookies.list[0].o.domain,undefined);
  assert.deepEqual(res.headers.all(),CACHE);
});

test('갱신할 것이 없으면 쿠키·캐시 헤더를 바꾸지 않는다',async()=>{
  const {proxy,calls}=load('none');
  const res=await proxy(request('naver-blog-agent.buylife.xyz'));
  assert.equal(calls.getUser,1);
  assert.equal(res.cookies.list.length,0);
  assert.deepEqual(res.headers.all(),{});
});

test('프록시 적용 범위(matcher)는 그대로 — API·정적 파일·확장 다운로드 제외',()=>{
  const {config}=load('none');
  assert.deepEqual(config.matcher,['/((?!_next/static|_next/image|favicon.ico|api/|downloads/).*)']);
  const re=new RegExp('^'+config.matcher[0].replace('/((?!','/(?!').replace(').*)',').*')+'$');
  for(const p of ['/api/extension/task','/_next/static/a.js','/downloads/x.zip','/favicon.ico'])assert.equal(re.test(p),false,p);
  for(const p of ['/dashboard','/queue','/'])assert.equal(re.test(p),true,p);
});
