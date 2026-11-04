'use client';
import { useEffect, useRef, useState } from 'react';
import { extensionRequest } from '../../components/analysis/ApprovedRunButton';

// 확장 순회 상태를 10초마다 읽어 보여 준다(읽기만). 일시정지는 프로그램 서버에 기록하고 확장은 다음 확인 때 멈춘다.
export function RunStatus() {
  const [status, setStatus] = useState('확장 상태 확인 중…'), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const read = async () => { try { const r = await extensionRequest('traversal_status', 8000); if (alive.current) setStatus(String(r.message ?? (r.enabled ? '순회 중' : '순회 꺼짐'))); } catch (e) { if (alive.current) setStatus(e instanceof Error ? e.message : '확장 응답을 확인하지 못했습니다.'); } };
    void read(); const timer = setInterval(() => void read(), 10000);
    return () => { alive.current = false; clearInterval(timer); };
  }, []);
  async function pause() {
    setBusy(true);
    try {
      const r = await fetch('/api/work', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation: 'pause_autopilot', payload: {} }) });
      const v = await r.json().catch(() => ({})); if (!r.ok) throw new Error(v.error || '일시정지를 확인하지 못했습니다.');
      setNote('⏸ 전체 일시정지했습니다. 지금 진행 중인 한 건이 끝나면 더 실행하지 않습니다. 다시 시작은 「🏠 오늘의 소통」에서 누릅니다.');
    } catch (e) { setNote(e instanceof Error ? e.message : '일시정지를 확인하지 못했습니다. 확장 팝업의 「전체 일시정지」를 눌러 주세요.'); }
    finally { setBusy(false); }
  }
  return <section className="run-status">
    <h2>지금 하는 일</h2>
    <p role="status" aria-live="polite">{status}</p>
    <div className="actions"><button disabled={busy} onClick={() => void pause()}>⏸ 전체 일시정지</button><a className="button" href="/today" target="_blank" rel="noreferrer">🏠 오늘의 소통 열기(새 탭)</a></div>
    {note && <p className="button-result">{note}</p>}
  </section>;
}
