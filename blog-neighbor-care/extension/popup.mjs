const $ = id => document.getElementById(id);
let draft = null, busy = false, currentDeviceId=null, currentProgress=null;
const stageTitles={checking:'진행 중 · 계정 확인',starting:'진행 중 · 요청 준비',reserving:'진행 중 · 읽기 준비',reading:'진행 중 · 목록 읽기',sending:'진행 중 · 서버 전송',received:'진행 중 · 수신 확인',ready:'수신 완료 · 아직 저장 전',confirmed:'프로그램 저장 완료',failed:'읽기 중단 · 사유 확인',stopping:'읽기 중단 처리 중',paused:'진행 결과 확인 필요'};
function applyButtons(){
  const active=currentProgress?.state==='running';
  document.querySelectorAll('button').forEach(b=>{b.disabled=b.id==='neighborStop'?!active:busy||active;});
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
    if(kind==='neighbors')renderNeighborProgress({...currentProgress,stage:'failed',state:'stopped',message});else showStatus(message,'error');
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
  return false;
});
run(status);
