"use strict";
importScripts("editor.js","writer.js");
const BASE="https://blog-content-maker.buylife.xyz";
let activeRun=null;
const progress=message=>chrome.storage.session.set({"bcm-progress":message});
async function api(projectId){const stored=await chrome.storage.local.get("bcm-token"),token=stored["bcm-token"];if(!token)throw new Error("본인 연결 코드를 입력해 주세요.");const r=await fetch(BASE+"/api/extension"+(projectId?"?project="+encodeURIComponent(projectId):""),{headers:{Authorization:"Bearer "+token},cache:"no-store"});const data=await r.json();if(!r.ok)throw new Error(data.error||"원고를 읽지 못했습니다.");return data;}
function checkRun(run){if(activeRun!==run||run.cancelled||Date.now()>run.until)throw new Error("입력을 중지했습니다. 이미 입력된 내용은 보존됩니다.");}
async function execute(run,command,args={}){checkRun(run);const results=await chrome.scripting.executeScript({target:{tabId:run.tabId,frameIds:[run.frameId]},func:editorCommand,args:[command,{...args,runId:run.id,executionUntil:run.until}]});const value=results[0]?.result;if(value?.ok===false)throw new Error(value.error||value.reason||"편집기 입력을 확인하지 못했습니다.");return value;}
function plain(text){return String(text).replace(/\*\*(.*?)\*\*/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/^[-*]\s+/gm,"• ");}
async function write(run,payload){
 try{
  const tab=await chrome.tabs.get(run.tabId);if(!tab.url?.startsWith("https://blog.naver.com/"))throw new Error("본인 네이버 글쓰기 탭을 선택해 주세요.");
  await chrome.tabs.update(run.tabId,{active:true});
  const frames=await chrome.scripting.executeScript({target:{tabId:run.tabId,allFrames:true},func:editorCommand,args:["inspect",{}]});const found=frames.find(f=>f.result?.status==="valid");if(!found)throw new Error("네이버의 빈 글쓰기 편집기를 찾지 못했습니다. 로그인·임시글 안내를 직접 확인해 주세요.");
  run.frameId=found.frameId;
  if(found.result.hasContent)throw new Error("기존 원고가 있어 덮어쓰지 않고 중지했습니다. 별도 빈 글쓰기 탭에서 다시 시작해 주세요.");
  const files=new Map();
  for(const image of payload.images){checkRun(run);const u=new URL(image.url);if(u.hostname!=="esgxyikcnnvmlhygjkth.supabase.co"||u.protocol!=="https:")throw new Error("허용되지 않은 이미지 주소입니다.");const response=await fetch(u.href);if(!response.ok)throw new Error("이미지 링크가 만료됐습니다. 원고를 다시 불러와 주세요.");const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>10485760)throw new Error("이미지가 너무 큽니다.");let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));files.set(image.id,{data:btoa(binary),mime:image.mime,name:image.id+"."+image.path.split(".").pop()});}
  const steps=[{type:"title",text:payload.title}];
  const blocks=payload.body.split(/\n\s*\n/),inserted=new Set();
  const imagesAt=index=>{for(const image of payload.images.filter(a=>a.placement===index)){if(inserted.has(image.id))continue;inserted.add(image.id);steps.push({type:"image",name:files.get(image.id).name,...files.get(image.id),requireAi:!!image.prompt});}};
  for(let i=0;i<blocks.length;i++){imagesAt(i);for(const line of blocks[i].split(/\r?\n/)){if(!line.trim())continue;const heading=line.match(/^#{1,3}\s+(.+)$/);steps.push(heading?{type:"quote",text:plain(heading[1]),style:"quotation_line"}:{type:"paragraph",text:plain(line)});}}
  for(const image of payload.images)if(!inserted.has(image.id))steps.push({type:"image",...files.get(image.id),requireAi:!!image.prompt});
  if(payload.tags.length)steps.push({type:"paragraph",text:payload.tags.map(t=>"#"+t).join(" ")});
  await runWriter({steps,requireEmpty:true,read:()=>execute(run,"snapshot"),checkCancelled:async()=>checkRun(run),save:async()=>{},onProgress:async(n,total)=>progress(`입력 ${n}/${total} · 마지막 발행은 직접 진행하세요.`),apply:async step=>{
   checkRun(run);
   if(step.type!=="image")return execute(run,step.type,step);
   let attached=false;try{await chrome.debugger.attach({tabId:run.tabId},"1.3");attached=true;await chrome.debugger.sendCommand({tabId:run.tabId},"Page.setInterceptFileChooserDialog",{enabled:true});await execute(run,"image",step);}finally{if(attached){try{await chrome.debugger.sendCommand({tabId:run.tabId},"Page.setInterceptFileChooserDialog",{enabled:false});}finally{await chrome.debugger.detach({tabId:run.tabId});}}}
  }});
  const snapshot=await execute(run,"snapshot");if(matchingWriterPrefix(snapshot,steps)!==steps.length)throw new Error("입력된 전체 내용이 원고와 일치하지 않습니다. 내용을 보존하고 중지합니다.");
  await progress(`입력·전체 내용 대조 완료 · 제목·본문·이미지 ${payload.images.length}개를 네이버에서 직접 확인해 주세요. 최종 발행은 누르지 않았습니다.`);
 }catch(e){await progress("입력 중지: "+e.message+"\n이미 입력된 내용을 확인하고 중복 입력하지 마세요.");}finally{if(activeRun===run)activeRun=null;await chrome.storage.session.remove("bcm-run");}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type==="editorWait"){
  const run=activeRun;if(!run||sender.tab?.id!==run.tabId||message.runId!==run.id||message.executionUntil!==run.until){reply({ok:false,error:"입력 연결 확인 실패"});return false;}
  const ms=Math.min(500,Math.max(0,Number(message.delayMs)||0));setTimeout(()=>reply({ok:activeRun===run&&!run.cancelled&&Date.now()<run.until}),ms);return true;
 }
 // 2026-10-23: 웹 「바로 연결」 — 이 사이트 화면(web-bridge.js)에서 온, 웹이 방금 만든 43자리 코드만 서버 확인 뒤 저장한다(기준 구현: naver-blog-seo-studio).
 if(message.action==="connectFromWeb"){
  if(sender.id!==chrome.runtime.id||!String(sender.url||"").startsWith(BASE+"/")){reply({ok:false,error:"허용되지 않은 요청입니다."});return false;}
  (async()=>{const token=String(message.token||"");if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {ok:false,error:"연결 코드 형식이 올바르지 않습니다."};
   const r=await fetch(BASE+"/api/extension",{headers:{Authorization:"Bearer "+token},cache:"no-store"});if(!r.ok){const d=await r.json().catch(()=>({}));return {ok:false,error:d.error||"연결 확인 실패 ("+r.status+")"};}
   await chrome.storage.local.set({"bcm-token":token});if(message.closeTab&&Number.isInteger(sender.tab?.id))setTimeout(()=>{chrome.tabs.remove(sender.tab.id).catch(()=>{});},1500);return {ok:true};
  })().then(reply,e=>reply({ok:false,error:e.message}));return true;
 }
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL(""))){reply({ok:false,error:"허용되지 않은 확장 요청"});return false;}
 (async()=>{
  if(message.action==="connect"){if(!/^[A-Za-z0-9_-]{43}$/.test(message.token||""))throw new Error("웹에서 발급한 본인 연결 코드를 입력해 주세요.");await chrome.storage.local.set({"bcm-token":message.token});return {ok:true};}
  if(message.action==="disconnect"){if(activeRun)activeRun.cancelled=true;await chrome.storage.local.remove("bcm-token");return {ok:true};}
  if(message.action==="list")return {ok:true,...await api()};
  if(message.action==="preview")return {ok:true,...await api(message.projectId)};
  if(message.action==="stop"){if(activeRun)activeRun.cancelled=true;return {ok:true};}
  if(message.action==="start"){
   const lock=(await chrome.storage.session.get("bcm-run"))["bcm-run"];if(activeRun||lock?.until>Date.now())throw new Error("이미 입력 중입니다. 완료·중지 상태를 확인해 주세요.");
   const payload=await api(message.projectId);if(payload.revisionId!==message.revisionId)throw new Error("웹에서 원고가 바뀌었습니다. 다시 미리본 뒤 입력해 주세요.");
   const run={id:crypto.randomUUID(),tabId:message.tabId,frameId:0,until:Date.now()+300000,cancelled:false};activeRun=run;await chrome.storage.session.set({"bcm-run":{until:run.until}});await progress("편집기와 이미지를 준비하고 있습니다.");write(run,payload);return {ok:true};
  }
  throw new Error("지원하지 않는 확장 요청");
 })().then(reply,e=>reply({ok:false,error:e.message}));return true;
});
