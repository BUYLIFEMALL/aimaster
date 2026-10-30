const $ = id => document.getElementById(id);
let draft = null, busy = false, currentDeviceId=null, currentProgress=null;
const stageTitles={checking:'진행 중 · 계정 확인',starting:'진행 중 · 요청 준비',reserving:'진행 중 · 읽기 준비',reading:'진행 중 · 목록 읽기',sending:'진행 중 · 서버 전송',received:'진행 중 · 수신 확인',ready:'수신 완료 · 아직 저장 전',confirmed:'프로그램 저장 완료',failed:'읽기 중단 · 사유 확인',stopping:'읽기 중단 처리 중',paused:'진행 결과 확인 필요'};
function applyButtons(){
  const active=currentProgress?.state==='running';
  document.querySelectorAll('button').forEach(b=>{b.disabled=['workStop','contextCancel','scheduleStop','acceptStop','acceptCancel','traversalStop'].includes(b.id)?false:b.id==='neighborStop'?!active:busy||active;});
  $('contextRead').disabled=busy||active||!$('contextPreview').hidden;$('contextKind').disabled=busy||active||!$('contextPreview').hidden;
  $('neighborRead').disabled=busy||active||(currentProgress?.state==='complete'&&currentProgress.stage!=='confirmed')||!currentDeviceId;
}
function showStatus(text,state='idle'){
  $('status-heading').textContent=state==='error'?'확인 필요':'지금 상태';$('message').textContent=text;
  document.querySelector('.status-card').dataset.state=state;
  $('neighborCounts').hidden=true;$('neighborProgressBar').hidden=true;$('neighborFinish').hidden=true;
}
function renderNeighborProgress(p){
  if(!p||!stageTitles[p.stage])return;
  if(p.stage==='confirmed'&&currentProgress?.stage!=='confirmed')$('neighborConfirm').checked=false;
  currentProgress={...p};$('status-heading').textContent=stageTitles[p.stage];
  document.querySelector('.status-card').dataset.state=p.state;
  $('message').textContent=p.message||(p.stage==='ready'?'목록을 임시 수신했습니다. 아래 버튼으로 확인·저장해 주세요.':p.stage==='confirmed'?'프로그램에 확인·반영을 완료했습니다.':'Edge와 현재 탭을 유지해 주세요.');
  const count=Number.isInteger(p.capturedCount)?p.capturedCount:0,last=Number.isInteger(p.lastPage)?p.lastPage:0;
  $('neighborCounts').textContent=`페이지 ${last} / ${p.totalPages??'확인 중'} · 받은 ${count} / ${p.totalCount??'확인 중'}명`;$('neighborCounts').hidden=false;
  const bar=$('neighborProgressBar');bar.hidden=p.state==='stopped';bar.max=p.totalPages||1;
  if(p.totalPages)bar.value=last;else bar.removeAttribute('value');
  $('neighborFinish').hidden=!['ready','confirmed'].includes(p.stage);$('neighborFinish').textContent=p.stage==='confirmed'?'저장 결과 보기':'받은 목록 확인·저장';
  $('neighborRead').textContent=p.state==='running'?'이웃 목록 읽는 중…':p.stage==='ready'?'목록 수신 완료':p.stage==='confirmed'?'전체 이웃 목록 다시 읽기':'전체 이웃 목록 읽기';
  applyButtons();
}
async function run(work,kind='general') {
  if (busy) return; busy = true;applyButtons();
  try { await work(); } catch (e) {
    const message=e.message||'결과를 확인하지 못했습니다. 결과 확인 버튼을 눌러 주세요.';
    if(kind==='context'){$('contextPreview').hidden=true;$('contextMessage').textContent=message;}else if(kind==='neighbors')renderNeighborProgress({...currentProgress,stage:'failed',state:'stopped',message});else showStatus(message,'error');
  }
  finally { busy = false;applyButtons(); }
}
async function send(message) {
  const r = await chrome.runtime.sendMessage(message);
  if (!r?.ok) throw new Error(r?.error || '확장 연결을 확인해 주세요.'); return r.data;
}
async function status() {
  try {
    const r = await send({ type: 'status' });
    currentDeviceId=r.connected?r.deviceId:null;
    $('connection').textContent = r.connected ? `연결된 블로그: ${r.blogId}` : '프로그램에서 회원 계정을 연결해 주세요.';
    if(r.pageKind==='neighbors')document.querySelector('.status-card').after($('neighborSection'));
    if(r.neighborProgress)renderNeighborProgress(r.neighborProgress);
    if (r.latestVersion && r.latestVersion !== chrome.runtime.getManifest().version_name) showStatus('프로그램에서 새 설치본이 있는지 확인해 주세요.');
  } catch (error) {
    $('connection').textContent = '연결 확인 실패 · 지금 상태를 확인해 주세요.';
    throw error;
  }
}
function receipt(r) {
  showStatus(r.state === 'completed' ? '전달 완료. 프로그램의 받은 글 목록에서 확인할 수 있습니다.' : '전달 완료 기록이 없습니다. 현재 읽기 내용을 확인해 주세요.');
  if (r.state === 'completed') { draft = null; $('preview').hidden = true; }
}
$('connect').addEventListener('click', () => run(async () => {
  await send({ type: 'connect', code: $('code').value.trim().toLowerCase() }); $('code').value = ''; draft = null; currentProgress=null;$('preview').hidden = true; await status();
}));
$('read').addEventListener('click', () => run(async () => {
  draft = null; $('preview').hidden = true;showStatus('현재 글을 확인하고 있습니다…');
  const r = await send({ type: 'read', ownerConfirmed: $('confirm').checked });
  if (r.receipt) { receipt(r.receipt); return; }
  draft = r; $('title').textContent = r.snapshot.title; $('body').textContent = r.snapshot.body;
  $('size').textContent = `본문 ${[...r.snapshot.body].length.toLocaleString()}자 · 전송 전에 내용을 확인해 주세요.`;
  $('preview').hidden = false;showStatus('아직 서버에 본문을 보내지 않았습니다.');
}));
$('submit').addEventListener('click', () => run(async () => {
  if (!draft) throw new Error('먼저 현재 글을 읽고 내용을 확인해 주세요.');
  if (!$('confirm').checked) throw new Error('본문 전달에 동의하는지 다시 확인해 주세요.');
  receipt(await send({ type: 'submit', ...draft }));
}));
$('receipt').addEventListener('click', () => run(async () => receipt(await send({ type: 'receipt' }))));
$('disconnect').addEventListener('click', () => run(async () => {
  const r = await send({ type: 'disconnect' }); draft = null;currentProgress=null;currentDeviceId=null;$('preview').hidden = true;
  showStatus(r.remoteRevoked ? '이 기기 연결을 해제했습니다.' : '기기의 연결 정보는 지웠습니다. 서버 해제는 프로그램의 기기 목록에서 확인해 주세요.'); await status();
}));
function neighborResult(r){renderNeighborProgress({deviceId:currentDeviceId,stage:['ready','confirmed'].includes(r.state)?r.state:'paused',state:['ready','confirmed'].includes(r.state)?'complete':'stopped',capturedCount:r.capturedCount??r.totalCount??0,totalCount:r.totalCount??null,totalPages:r.totalPages??null,lastPage:r.lastPage??(r.state==='ready'?r.totalPages:0),message:r.state==='ready'?`전체 페이지에서 ${r.capturedCount??r.totalCount}명을 임시 수신했습니다. 아직 저장 전입니다.`:r.state==='confirmed'?'프로그램에 확인·반영을 완료했습니다.':`서버 상태: ${r.state}. 받은 범위를 확인해 주세요.`});}
$('neighborRead').addEventListener('click',()=>{
  if(!$('neighborConfirm').checked){$('message').textContent='본인 이웃 목록 읽기·임시 전송 동의를 확인해 주세요.';return;}
  const restartConfirmed=currentProgress?.stage==='confirmed';
  return run(async()=>{
  renderNeighborProgress({deviceId:currentDeviceId,stage:'checking',state:'running',capturedCount:0,lastPage:0,message:'읽기를 준비합니다. Edge와 현재 탭을 유지해 주세요.'});
  neighborResult(await send({type:'neighbors_read',ownerConfirmed:true,restartConfirmed}));
},'neighbors');});
$('neighborReceipt').addEventListener('click',()=>run(async()=>neighborResult(await send({type:'neighbors_status'})),'neighbors'));
$('neighborStop').addEventListener('click',async()=>{renderNeighborProgress({...currentProgress,stage:'stopping',state:'running',message:'중단을 요청했습니다. 마지막 수신 결과를 확인하고 있습니다.'});try{await send({type:'neighbors_stop'});}catch(e){showStatus(e.message,'error');}});
chrome.runtime.onMessage?.addListener((message,sender,respond)=>{
  const trusted=sender.id===chrome.runtime.id&&!sender.tab&&(!sender.url||sender.url===chrome.runtime.getURL('background.mjs'));
  if(!trusted)return false;
  if(message?.type==='neighbor_focus_probe'){
    Promise.resolve(chrome.windows?.getCurrent()).then(w=>respond({windowId:w?.id,focused:Number.isInteger(message.windowId)&&w?.id===message.windowId&&document.hasFocus()&&document.visibilityState==='visible'}),()=>respond({focused:false}));return true;
  }
  if(message?.type==='neighbor_progress'&&currentDeviceId&&message.progress?.deviceId===currentDeviceId)renderNeighborProgress(message.progress);
  if(message?.type==='work_progress'&&currentDeviceId&&message.deviceId===currentDeviceId&&typeof message.message==='string'&&message.message.length<=300)$('workMessage').textContent=message.message;
  if(message?.type==='schedule_progress'&&currentDeviceId&&message.deviceId===currentDeviceId&&typeof message.message==='string'&&message.message.length<=300)$('scheduleMessage').textContent=message.message;
  if(message?.type==='accept_schedule_progress'&&currentDeviceId&&message.deviceId===currentDeviceId&&typeof message.message==='string'&&message.message.length<=300)$('acceptScheduleMessage').textContent=message.message;
  if(message?.type==='traversal_progress'&&currentDeviceId&&message.deviceId===currentDeviceId&&typeof message.message==='string'&&message.message.length<=300)$('traversalMessage').textContent=message.message;
  return false;
});
$('workStart').addEventListener('click',()=>run(async()=>{if(!$('workConfirm').checked)throw Error('현재 탭 실행 동의를 확인해 주세요.');$('workMessage').textContent='진행 중 · 웹의 실행 허용과 승인 작업을 확인합니다.';const r=await send({type:'work_start',confirmed:true});$('workMessage').textContent=r.message;$('workConfirm').checked=false;}));
$('workStatus').addEventListener('click',()=>run(async()=>{$('workMessage').textContent=(await send({type:'work_status'})).message;}));
$('workStop').addEventListener('click',async()=>{try{$('workMessage').textContent=(await send({type:'work_stop'})).message;}catch{$('workMessage').textContent='중단 응답 미확인 · 작업 기록에서 결과 확인';}});
$('contextRead').addEventListener('click',()=>run(async()=>{
 if(!$('contextConsent').checked)throw Error('현재 화면 읽기 동의를 확인해 주세요.');$('contextMessage').textContent='현재 계정·화면 확인 후 읽는 중…';$('contextPreview').hidden=true;
 const r=await send({type:'context_preview',kind:$('contextKind').value,confirmed:true}),v=r.snapshot;
 const labels={pending:'신청 대기',mutual:'서로이웃 수락',removed:'관계 해제'};
 $('contextText').textContent=r.kind==='relationship'?`${v.neighborId}: ${labels[v.relationship]||'미확인'}`:r.kind==='incoming'?`내 글 ${v.ownPostId} · 이 화면의 원댓글 ${v.count}개\n`+v.comments.map(c=>`${c.neighborId} · ${c.commentId} · ${c.alreadyReplied?'이미 답글 있음':'답글 대상'}`).join('\n'):`답방 글: ${v.neighborId}/${v.postId}\n연결할 내 글 ${r.source?.ownPostId} · 원댓글 ${r.source?.commentId}`;
 $('contextPreview').hidden=false;$('contextConsent').checked=false;$('contextMessage').textContent='미리보기 완료 · 내용을 확인하면 같은 화면을 다시 읽고 저장합니다.';
},'context'));
$('contextConfirm').addEventListener('click',()=>run(async()=>{ $('contextPreview').hidden=true;const r=await send({type:'context_confirm'});$('contextMessage').textContent=r.kind==='incoming'?`완료 · 현재 글 원댓글 ${r.observedCount}개 확인 / 새 저장 ${r.savedCount}건 / 기존 유지 ${r.existingCount}건. 이미 답글이 있는 항목은 새 대상으로 저장하지 않았습니다.`:`완료 · 웹 반영 ${r.savedCount}건. 등록·공감·댓글은 실행하지 않았습니다.`;},'context'));
$('contextCancel').addEventListener('click',async()=>{$('contextPreview').hidden=true;try{await send({type:'context_cancel'});$('contextMessage').textContent='읽기 미리보기를 취소했습니다. 기존 저장 자료는 유지됩니다.';}catch{$('contextMessage').textContent='취소 응답 미확인 · 웹에서 이전 결과를 확인해 주세요.';}applyButtons();});
$('scheduleStart').addEventListener('click',()=>run(async()=>{if(!$('scheduleConfirm').checked)throw Error('현재 탭 반복 실행 동의를 확인해 주세요.');$('scheduleMessage').textContent=(await send({type:'schedule_start',confirmed:true})).message;$('scheduleConfirm').checked=false;}));
$('scheduleStatus').addEventListener('click',()=>run(async()=>{$('scheduleMessage').textContent=(await send({type:'schedule_status'})).message;}));
$('scheduleStop').addEventListener('click',async()=>{try{$('scheduleMessage').textContent=(await send({type:'schedule_stop'})).message;}catch{$('scheduleMessage').textContent='중단 응답 미확인 · 웹 작업 기록부터 확인해 주세요.';}});
$('acceptRead').addEventListener('click',()=>run(async()=>{if(!$('acceptReadConsent').checked)throw Error('받은 신청 읽기 동의를 확인해 주세요.');const r=await send({type:'accept_preview',confirmed:true});$('acceptText').textContent=`현재 페이지 신청 ${r.snapshot.count}건\n`+r.snapshot.requests.map(v=>`${v.neighborId} · ${v.requestId}`).join('\n');$('acceptPreview').hidden=false;$('acceptReadConsent').checked=false;$('acceptMessage').textContent='미리보기 완료 · 저장해도 수락하지 않습니다.';}));
$('acceptSave').addEventListener('click',()=>run(async()=>{$('acceptPreview').hidden=true;const r=await send({type:'accept_confirm'});$('acceptMessage').textContent=`저장 완료 · 확인 ${r.observedCount}건 / 새 저장 ${r.savedCount}건. 웹에서 수락 대상을 검토하세요.`;}));
$('acceptCancel').addEventListener('click',async()=>{$('acceptPreview').hidden=true;try{await send({type:'accept_cancel'});$('acceptMessage').textContent='미리보기 취소';}catch{$('acceptMessage').textContent='취소 응답 미확인 · 이전 결과를 확인하세요.';}});
$('acceptStart').addEventListener('click',()=>run(async()=>{if(!$('acceptExecuteConsent').checked)throw Error('실제 수락 동의를 확인해 주세요.');$('acceptExecuteConsent').checked=false;$('acceptMessage').textContent='수락 준비 중 · 계정과 신청을 다시 확인합니다.';$('acceptMessage').textContent=(await send({type:'accept_start',confirmed:true})).message;}));
$('acceptCheck').addEventListener('click',()=>run(async()=>{if(!$('acceptReadConsent').checked)throw Error('현재 신청 상태 읽기 동의를 확인해 주세요.');$('acceptReadConsent').checked=false;$('acceptMessage').textContent=(await send({type:'accept_check',confirmed:true})).message;}));
$('acceptStatus').addEventListener('click',()=>run(async()=>{$('acceptMessage').textContent=(await send({type:'accept_status'})).message;}));
$('acceptStop').addEventListener('click',async()=>{try{$('acceptMessage').textContent=(await send({type:'accept_stop'})).message;}catch{$('acceptMessage').textContent='중단 응답 미확인 · 다시 수락하지 말고 웹 기록부터 확인하세요.';}});
$('traversalStart').addEventListener('click',async()=>{if(busy||!$('traversalConsent').checked){showStatus('대상 글 순회 동의를 확인해 주세요.');return;}try{if(!await chrome.permissions.request({origins:['https://blog.naver.com/*']}))throw Error('대상 글 접근이 허용되지 않았습니다.');await run(async()=>{$('traversalConsent').checked=false;$('traversalMessage').textContent=(await send({type:'traversal_start',confirmed:true})).message;});}catch(e){$('traversalMessage').textContent=e.message;}});
$('traversalStatus').addEventListener('click',()=>run(async()=>{$('traversalMessage').textContent=(await send({type:'traversal_status'})).message;}));
$('traversalStop').addEventListener('click',async()=>{try{$('traversalMessage').textContent=(await send({type:'traversal_stop'})).message;}catch{$('traversalMessage').textContent='중단 응답 미확인 · 웹 기록부터 확인하세요.';}});
$('acceptScheduleStart').addEventListener('click',()=>run(async()=>{if(!$('acceptScheduleConsent').checked)throw Error('반복 수락 동의를 확인해 주세요.');$('acceptScheduleConsent').checked=false;$('acceptScheduleMessage').textContent=(await send({type:'accept_schedule_start',confirmed:true})).message;}));
$('acceptScheduleStatus').addEventListener('click',()=>run(async()=>{$('acceptScheduleMessage').textContent=(await send({type:'accept_schedule_status'})).message;}));
$('acceptScheduleStop').addEventListener('click',async()=>{try{$('acceptScheduleMessage').textContent=(await send({type:'accept_schedule_stop'})).message;}catch{$('acceptScheduleMessage').textContent='중단 응답 미확인 · 웹에서 결과를 먼저 확인하세요.';}});
run(async()=>{await status();if(currentDeviceId){for(const [type,id] of [['traversal_status','traversalMessage'],['schedule_status','scheduleMessage'],['accept_status','acceptMessage'],['accept_schedule_status','acceptScheduleMessage']]){try{$(id).textContent=(await send({type})).message;}catch{$(id).textContent='상태 미확인 · 이전 결과를 확인하세요.';}}}});
