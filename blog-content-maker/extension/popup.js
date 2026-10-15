"use strict";
const $=id=>document.getElementById(id);
let projectId="",revisionId="";
$("version").textContent=chrome.runtime.getManifest().version_name;
const status=text=>{$("status").textContent=text;};
async function send(action,data={}){const r=await chrome.runtime.sendMessage({action,...data});if(!r?.ok)throw new Error(r?.error||"확장 요청 실패");return r;}
async function tabs(){const list=await chrome.tabs.query({url:"https://blog.naver.com/*"});$("tabs").textContent="";for(const t of list){const option=document.createElement("option");option.value=t.id;option.textContent=t.title||"네이버 탭";$("tabs").append(option);}if(!list.length)status("네이버에 직접 로그인한 뒤 빈 글쓰기 탭을 열어 주세요.");}
async function refresh(){const r=await send("list");$("projects").textContent="";for(const p of r.projects||[]){const option=document.createElement("option");option.value=p.id;option.textContent=p.title;$("projects").append(option);}status("본인 원고 목록을 불러왔습니다.");}
function bind(id,fn){$(id).addEventListener("click",async()=>{try{$(id).disabled=true;await fn();}catch(e){status(e.message);}finally{$(id).disabled=false;}});}
bind("connect",async()=>{if($("token").value.trim())await send("connect",{token:$("token").value.trim()});$("token").value="";await refresh();});
bind("disconnect",async()=>{await send("disconnect");$("projects").textContent="";$("draft").hidden=true;status("이 브라우저의 연결 코드를 지웠습니다. 서버의 모든 연결 해제는 웹 설정에서 진행하세요.");});
bind("preview",async()=>{const r=await send("preview",{projectId:$("projects").value});projectId=r.projectId;revisionId=r.revisionId;$("title").textContent=r.title;$("summary").textContent=`본문 ${r.body.length}자 · 이미지 ${r.images.length}개 · 웹에서 전체 원고를 확인해 주세요.`;$("draft").hidden=false;await tabs();});
bind("refreshTabs",tabs);
bind("start",async()=>{if(!projectId||!revisionId||!$("tabs").value)throw new Error("원고와 빈 글쓰기 탭을 먼저 선택해 주세요.");await send("start",{projectId,revisionId,tabId:Number($("tabs").value)});status("입력을 시작했습니다. 팝업을 닫아도 작업은 이어집니다. 네이버 탭에서 결과를 확인해 주세요.");});
bind("stop",async()=>{await send("stop");status("중지를 요청했습니다. 이미 입력된 내용은 보존합니다.");});
chrome.storage.session.get("bcm-progress").then(v=>{if(v["bcm-progress"])status(v["bcm-progress"]);});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="session"&&changes["bcm-progress"])status(changes["bcm-progress"].newValue);});
