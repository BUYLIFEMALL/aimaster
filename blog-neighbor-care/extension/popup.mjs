const $ = id => document.getElementById(id);
let draft = null, busy = false;
async function run(work) {
  if (busy) return; busy = true; document.querySelectorAll('button').forEach(b => { b.disabled = b.id!=='neighborStop'; });
  try { await work(); } catch (e) { $('message').textContent = e.message || '결과를 확인하지 못했습니다. 결과 확인 버튼을 눌러 주세요.'; }
  finally { busy = false; document.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
}
async function send(message) {
  const r = await chrome.runtime.sendMessage(message);
  if (!r?.ok) throw new Error(r?.error || '확장 연결을 확인해 주세요.'); return r.data;
}
async function status() {
  try {
    const r = await send({ type: 'status' });
    $('connection').textContent = r.connected ? `연결된 블로그: ${r.blogId}` : '프로그램에서 회원 계정을 연결해 주세요.';
    if (r.latestVersion && r.latestVersion !== chrome.runtime.getManifest().version_name) $('message').textContent = '프로그램에서 새 설치본이 있는지 확인해 주세요.';
  } catch (error) {
    $('connection').textContent = '연결 확인 실패 · 지금 상태를 확인해 주세요.';
    throw error;
  }
}
function receipt(r) {
  $('message').textContent = r.state === 'completed' ? '전달 완료. 프로그램의 받은 글 목록에서 확인할 수 있습니다.' : '전달 완료 기록이 없습니다. 현재 읽기 내용을 확인해 주세요.';
  if (r.state === 'completed') { draft = null; $('preview').hidden = true; }
}
$('connect').addEventListener('click', () => run(async () => {
  await send({ type: 'connect', code: $('code').value.trim().toLowerCase() }); $('code').value = ''; draft = null; $('preview').hidden = true; await status();
}));
$('read').addEventListener('click', () => run(async () => {
  draft = null; $('preview').hidden = true; $('message').textContent = '현재 글을 확인하고 있습니다…';
  const r = await send({ type: 'read', ownerConfirmed: $('confirm').checked });
  if (r.receipt) { receipt(r.receipt); return; }
  draft = r; $('title').textContent = r.snapshot.title; $('body').textContent = r.snapshot.body;
  $('size').textContent = `본문 ${[...r.snapshot.body].length.toLocaleString()}자 · 전송 전에 내용을 확인해 주세요.`;
  $('preview').hidden = false; $('message').textContent = '아직 서버에 본문을 보내지 않았습니다.';
}));
$('submit').addEventListener('click', () => run(async () => {
  if (!draft) throw new Error('먼저 현재 글을 읽고 내용을 확인해 주세요.');
  if (!$('confirm').checked) throw new Error('본문 전달에 동의하는지 다시 확인해 주세요.');
  receipt(await send({ type: 'submit', ...draft }));
}));
$('receipt').addEventListener('click', () => run(async () => receipt(await send({ type: 'receipt' }))));
$('disconnect').addEventListener('click', () => run(async () => {
  const r = await send({ type: 'disconnect' }); draft = null; $('preview').hidden = true;
  $('message').textContent = r.remoteRevoked ? '이 기기 연결을 해제했습니다.' : '기기의 연결 정보는 지웠습니다. 서버 해제는 프로그램의 기기 목록에서 확인해 주세요.'; await status();
}));
run(status);
function neighborResult(r){$('message').textContent=r.state==='ready'?`전체 페이지에서 ${r.capturedCount??r.totalCount}명을 받았습니다. 프로그램에서 범위를 확인한 뒤 반영해 주세요.`:r.state==='confirmed'?'프로그램에서 확인·반영한 목록입니다.':`목록 상태 ${r.state} · 받은 ${r.capturedCount??0}명 / 전체 표시 ${r.totalCount??'확인 중'}명. 프로그램에서 범위를 확인해 주세요.`;}
$('neighborRead').addEventListener('click',()=>run(async()=>{
  $('message').textContent='전체 이웃 목록을 페이지별로 확인하고 있습니다. Edge와 현재 탭을 유지해 주세요.';
  neighborResult(await send({type:'neighbors_read',ownerConfirmed:$('neighborConfirm').checked}));
}));
$('neighborReceipt').addEventListener('click',()=>run(async()=>neighborResult(await send({type:'neighbors_status'}))));
$('neighborStop').addEventListener('click',async()=>{try{await send({type:'neighbors_stop'});$('message').textContent='중단을 요청했습니다. 진행 중인 한 페이지의 결과는 남을 수 있습니다. 프로그램에서 받은 범위를 확인하세요.';}catch(e){$('message').textContent=e.message;}});
