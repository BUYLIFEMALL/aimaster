import {createNeighborImporter} from '../extension/neighbor-importer.mjs';
import {managementFixture,shellFixture,fixtureListUrl} from '../tests/fixtures/neighbor-import.mjs';

const frame=document.querySelector('iframe'),output=document.querySelector('#output'),events=document.querySelector('#events');
const buttons=[...document.querySelectorAll('button')];
async function run(mode){
 buttons.forEach(b=>b.disabled=true);output.textContent='검사 중…';events.textContent='';
 const config=mode==='multi'?{total:125,pages:3}:mode==='rss'?{total:1,pages:1,rss:true}:{total:0,pages:1,...(mode==='loading'?{emptyText:'불러오는 중입니다.'}:{})};
 const blog='fixture-owner',top=`https://admin.blog.naver.com/${blog}`,identity={deviceId:'fixture-device',blogId:blog};
 const session={},calls=[];let page=1,received=0,permits=0;
 const render=async()=>{await new Promise(resolve=>{frame.onload=resolve;frame.srcdoc=managementFixture({...config,blogId:blog,page});});};
 await render();
 const log=value=>{calls.push(value);events.textContent=calls.join('\n');};
 const browser={storage:{session:{get:async k=>({[k]:session[k]}),set:async patch=>Object.assign(session,patch)}},windows:{get:async()=>({focused:document.hasFocus()})},tabs:{query:async()=>[{id:7,windowId:1,url:top,active:true}],get:async()=>({id:7,url:top,status:'complete'})},scripting:{executeScript:async({func,args})=>{
  const invoke=(doc,url)=>new Function('document','location',`return (${func.toString()})(...${JSON.stringify(args)});`)(doc,{href:url});
  if(func.name==='advanceVisibleNeighborPage'){
   log(`이동 전 허가 확인: ${page+1}페이지`);
   frame.contentDocument.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));
   const result=invoke(frame.contentDocument,fixtureListUrl(blog,page));if(result.advanced){page++;await render();}return [{result}];
  }
  if(func.name==='inspectVisibleNeighbors')log(`화면 읽기: ${page}페이지`);
  const shell=new DOMParser().parseFromString(shellFixture(blog),'text/html');
  // Detached DOM has no layout: shell proof is a synthetic capability; table layout below is real.
  shell.querySelector('a').getClientRects=()=>[{}];
  return [{result:invoke(shell,top)},{result:invoke(frame.contentDocument,fixtureListUrl(blog,page))}];
 }}};
 const handle=createNeighborImporter(browser,async(op,p)=>{
  if(op==='start'){log('가져오기 시작 · 합성 응답');return {state:'capturing'};}
  if(op==='reserve'){permits++;log(`페이지 허가: ${p.page}`);return {nonce:'b'.repeat(64),validUntil:new Date(Date.now()+60000).toISOString()};}
  if(op==='page'){received+=p.snapshot.rows.length;log(`임시 전송: ${p.snapshot.page}페이지 · ${p.snapshot.rows.length}명 · 합계 ${received}명`);return {state:p.snapshot.nextUrl?'capturing':'ready',capturedCount:received};}
  throw Error('지원하지 않는 합성 요청');
 },async()=>identity);
 try{
  const result=await handle({type:'neighbors_read',ownerConfirmed:true});
  const passed=mode==='multi'?result.state==='ready'&&received===125&&permits===3:mode==='empty'?result.state==='ready'&&received===0&&permits===1:false;
  output.textContent=`${passed?'통과':'실패'} · ${mode==='multi'?'3페이지 / 125명':mode==='empty'?'명시적 빈 목록 / 0명':mode} · ${result.state} · 자동 반영 없음`;
 }catch(error){
  const expected=['loading','rss'].includes(mode)&&received===0;
  output.textContent=`${expected?'통과 · 미확인 목록 차단':'중단'} · 전송 ${received}명 · ${error.message}`;
 }
 buttons.forEach(b=>b.disabled=false);
}
buttons.forEach(b=>b.addEventListener('click',()=>run(b.dataset.mode)));
