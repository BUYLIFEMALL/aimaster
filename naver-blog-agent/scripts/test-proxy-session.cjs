// 2026-11-20 BLC-INS-08: 프록시가 화면 요청마다 Supabase 세션을 갱신하는지(다른 블로그 프로그램과 같은 방식).
// 실제 next/server·@supabase/ssr을 가짜로 바꿔 src/proxy.ts를 실행한다. 외부 요청 0.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const file=process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/src/proxy.ts'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../src/proxy.ts'),'utf8');
const js=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const cookieDomain=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/supabase/cookieDomain.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

function load(refreshed){
  const calls={getUser:0,clientCookies:null};
  const cd={exports:{}};new Function('module','exports',cookieDomain)(cd,cd.exports);
  class Res{constructor(kind,url){this.kind=kind;this.url=url;this.cookies={list:[],set:(n,v,o)=>this.cookies.list.push({n,v,o})};}}
  const NextResponse={next:()=>new Res('next'),redirect:(url,status)=>Object.assign(new Res('redirect',url),{status})};
  const ssr={createServerClient:(_u,_k,opts)=>{calls.clientCookies=opts.cookies;return {auth:{getUser:async()=>{calls.getUser++;if(refreshed)opts.cookies.setAll([{name:'sb-x-auth-token',value:'new',options:{path:'/'}}]);return {data:{user:null}};}}};}};
  const mod={exports:{}};
  const req=n=>n==='next/server'?{NextResponse}:n==='@supabase/ssr'?ssr:n==='@/lib/supabase/cookieDomain'?cd.exports:{};
  new Function('module','exports','require','process',js)(mod,mod.exports,req,{env:{NEXT_PUBLIC_SUPABASE_URL:'https://x.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon'}});
  return {proxy:mod.exports.proxy,config:mod.exports.config,calls};
}
function request(host,pathname='/dashboard'){
  const jar=new Map([['sb-x-auth-token','old']]);
  return {headers:{get:k=>k==='host'?host:null},nextUrl:{pathname,search:''},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),set:(n,v)=>jar.set(n,v)}};
}

test('화면 요청마다 세션을 갱신하고, 갱신된 쿠키를 공유 도메인으로 응답에 쓴다',async()=>{
  const {proxy,calls}=load(true);
  const res=await proxy(request('naver-blog-agent.buylife.xyz'));
  assert.equal(calls.getUser,1);
  assert.equal(res.kind,'next');
  assert.deepEqual(res.cookies.list.map(c=>[c.n,c.v,c.o.domain]),[['sb-x-auth-token','new','.buylife.xyz']]);
});

test('vercel.app 화면 요청은 지금처럼 새 주소로 넘기고 세션 조회를 하지 않는다',async()=>{
  const {proxy,calls}=load(true);
  const res=await proxy(request('naver-blog-agent-abc.vercel.app','/queue'));
  assert.equal(res.kind,'redirect');assert.equal(res.status,308);
  assert.equal(res.url,'https://naver-blog-agent.buylife.xyz/queue');
  assert.equal(calls.getUser,0);
});

test('buylife.xyz가 아닌 주소(로컬)는 쿠키 도메인을 붙이지 않는다',async()=>{
  const {proxy}=load(true);
  const res=await proxy(request('localhost:3000'));
  assert.equal(res.cookies.list[0].o.domain,undefined);
});

test('갱신할 것이 없으면 응답 쿠키를 바꾸지 않는다',async()=>{
  const {proxy,calls}=load(false);
  const res=await proxy(request('naver-blog-agent.buylife.xyz'));
  assert.equal(calls.getUser,1);
  assert.equal(res.cookies.list.length,0);
});

test('API·정적 파일·확장 다운로드는 프록시 대상이 아니다',()=>{
  const {config}=load(false);
  const re=new RegExp('^'+config.matcher[0].replace('/((?!','/(?!').replace(').*)',').*')+'$');
  for(const p of ['/api/extension/task','/_next/static/a.js','/downloads/x.zip','/favicon.ico'])assert.equal(re.test(p),false,p);
  for(const p of ['/dashboard','/queue','/'])assert.equal(re.test(p),true,p);
});
