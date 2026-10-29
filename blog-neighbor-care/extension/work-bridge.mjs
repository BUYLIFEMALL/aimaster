import {operateVisibleNaverWork} from './work-dom.mjs';
const HOST='xyz.buylife.blog_neighbor_care';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
const nativeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='blog.naver.com'&&!u.username&&!u.password&&!u.port&&!u.hash;}catch{return false;}};

export function createWorkBridge(browser,identity,now=Date.now){
 let port=null,session='',binding=null,target=null,frame=null,busy=false,starting=false,epoch=0,last='연결 전';
 const status=()=>({connected:!!port,message:last});
 const stop=()=>{epoch++;const old=port;port=null;binding=null;target=null;frame=null;session='';last='실행 연결 중단 · 불확실한 작업은 기록 확인 필요';try{old?.disconnect();}catch{}return status();};
 async function current(){
  const who=await identity();if(!binding||who.deviceId!==binding.deviceId||who.blogId!==binding.blogId)throw Error('연결 계정이 바뀌었습니다.');
  const tabs=await browser.tabs.query({active:true,currentWindow:true});
  if(tabs.length!==1||tabs[0].id!==target?.id||tabs[0].windowId!==target.windowId||tabs[0].url!==target.url)throw Error('실행 중 현재 탭이 바뀌었습니다.');
  const window=await browser.windows.get(target.windowId);if(!window.focused||window.state==='minimized')throw Error('현재 Edge 창을 화면에 유지해 주세요.');
 }
 function valid(c){
  return c&&c.v===1&&c.type==='command'&&c.session===session&&uuid(c.id)&&['inspect','assert','apply','verify'].includes(c.operation)&&
   c.job&&uuid(c.job.id)&&uuid(c.job.user_id)&&uuid(c.job.account_id)&&c.job.actor_id===binding?.blogId&&
   ['request','like','comment','reply'].includes(c.job.kind)&&typeof c.job.body==='string'&&c.job.body.length<=4000&&
   typeof c.job.expires_at==='string'&&Date.parse(c.job.expires_at)>now()&&JSON.stringify(c).length<=65536;
 }
 async function command(c,connection){
  if(connection!==port||busy||!valid(c)){stop();return;}
  busy=true;
  try{
   await current();if(connection!==port)throw Error('Native connection changed');
   if(c.operation==='apply'){
    if(!frame||frame.job!==c.job.id||!c.permit||c.permit.deviceId!==binding.deviceId||!Number.isSafeInteger(c.permit.generation)||c.permit.generation<1||
     !(Date.parse(c.permit.validUntil)>now())||Date.parse(c.permit.validUntil)>now()+30000)throw Error('등록 허가를 확인하지 못했습니다.');
    const {workAttempts={}}=await browser.storage.session.get('workAttempts');
    const entries=Object.fromEntries(Object.entries(workAttempts).filter(([,expires])=>Number.isFinite(expires)&&expires>now()));
    const key=`${binding.deviceId}:${c.job.id}:${c.permit.generation}`;
    if(Object.hasOwn(entries,key)||Object.keys(entries).length>=1000)throw Error('이미 시도한 작업입니다. 결과부터 확인해 주세요.');
    // Persist the attempt before any field edit/click; a lost response or service
    // worker restart cannot turn it into a second application.
    entries[key]=Date.parse(c.job.expires_at);await browser.storage.session.set({workAttempts:entries});
    await current();if(connection!==port)throw Error('Native connection changed');
   }
   if(c.operation!=='inspect'&&(!frame||frame.job!==c.job.id))throw Error('현재 작업의 화면을 먼저 확인해 주세요.');
   const results=await browser.scripting.executeScript({target:c.operation==='inspect'?{tabId:target.id,allFrames:true}:{tabId:target.id,frameIds:[frame.id]},
    world:'ISOLATED',func:operateVisibleNaverWork,args:[{operation:c.operation,job:c.job,permit:c.permit,profile:c.profile}]});
   await current();if(connection!==port)throw Error('Native connection changed');
   let result;
   if(c.operation==='inspect'){
    const matches=results.filter(r=>r.result?.accountId===c.job.account_id&&r.result?.actorId===binding.blogId&&r.result?.neighborId===c.job.neighbor_id&&r.result?.postId===c.job.post_id);
    if(matches.length!==1||!Number.isInteger(matches[0].frameId))throw Error('실행 화면이 없거나 둘 이상입니다.');
    frame={id:matches[0].frameId,job:c.job.id};result=matches[0].result;
   }else{
    if(results.length!==1||results[0].frameId!==frame.id||results[0].error||results[0].result===undefined)throw Error('실행 결과 미확인');result=results[0].result;
   }
   last=c.operation==='apply'?'등록 시도 후 결과 확인 중':c.operation==='verify'?'화면 결과 전달 · 최종 성공은 서버 기록 확인':'계정·현재 화면 확인 중';
   connection.postMessage({v:1,type:'result',session,id:c.id,ok:true,result});
  }catch{
   try{connection.postMessage({v:1,type:'result',session,id:c.id,ok:false,result:null});}catch{}if(connection===port)stop();
  }finally{busy=false;}
 }
 async function start(){
  if(starting||busy)throw Error('이전 작업의 결과 확인이 필요합니다.');if(port)return status();starting=true;const opening=epoch;
  try{
  const who=await identity(),tabs=await browser.tabs.query({active:true,currentWindow:true});if(opening!==epoch)throw Error('실행 연결을 중단했습니다.');
  if(!uuid(who.deviceId)||!/^[a-z0-9_-]{1,50}$/.test(who.blogId)||tabs.length!==1||!Number.isInteger(tabs[0].id)||!nativeUrl(tabs[0].url))throw Error('네이버 글 또는 준비된 이웃 신청 화면에서 연결해 주세요.');
  binding={deviceId:who.deviceId,blogId:who.blogId};target={id:tabs[0].id,windowId:tabs[0].windowId,url:tabs[0].url};
  session=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');
  let connection;try{connection=browser.runtime.connectNative(HOST);}catch{stop();throw Error('PC 실행 프로그램 설치·설정을 먼저 확인해 주세요.');}
  port=connection;last='PC 실행 프로그램 연결 중 · 실제 등록 준비 확인 필요';
  connection.onDisconnect.addListener(()=>{if(connection===port){stop();last='PC 실행 프로그램 연결 종료 · 작업 기록에서 결과 확인';}});
  connection.onMessage.addListener(c=>{void command(c,connection);});
  connection.postMessage({v:1,type:'hello',session,deviceId:binding.deviceId,actorId:binding.blogId,url:target.url});return status();
  }finally{starting=false;}
 }
 return {start,stop,status};
}
