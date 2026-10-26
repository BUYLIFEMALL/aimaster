const $ = (id) => document.getElementById(id);
$('verChip').textContent = chrome.runtime.getManifest().version_name || ''; // 오른쪽 위 버전 표시(부동산 확장과 같은 모양)
async function refresh() {
  const s = await chrome.runtime.sendMessage({ type: 'status' });
  $('conn').innerHTML = s.connected ? '<span class="ok">✅ 내 계정과 연결됨</span>' : '<span class="warn">아직 연결되지 않았습니다 — 「프로그램 열기 · 연결」에서 연결해 주세요.</span>';
  $('ver').textContent = `설치 버전 ${s.version}` + (s.latest && s.latest !== s.version ? ` · 새 버전 ${s.latest}이 있습니다(프로그램 「확장 연결」에서 다시 받기)` : '');
  $('status').textContent = s.lastStatus ? `${s.lastStatus.text} (${new Date(s.lastStatus.at).toLocaleTimeString('ko-KR')})` : '—';
}
$('run').onclick = async () => { await chrome.runtime.sendMessage({ type: 'runNow' }); setTimeout(refresh, 800); };
$('disconnect').onclick = async () => { await chrome.runtime.sendMessage({ type: 'disconnect' }); refresh(); };
refresh(); setInterval(refresh, 3000);
