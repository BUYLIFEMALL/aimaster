'use client';
// v1.17 C-1 (3): 대상 글을 회원이 직접 찾아 열지 않게 — 버튼 하나로 확장의 「승인한 글 순회」를 시작한다.
// 확장은 팝업에서 처음 한 번 기억한 순회 동의가 있을 때만 시작한다(웹에서 새 동의를 만들지 않음).
import { useRef, useState } from 'react';

export function extensionRequest(type: 'traversal_start' | 'traversal_status', timeoutMs = 15000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const done = (error?: Error, data?: Record<string, unknown>) => {
      window.removeEventListener('message', listener); clearTimeout(timer);
      if (error) reject(error); else resolve(data ?? {});
    };
    const listener = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'bnc-reader-extension' || event.data.requestId !== requestId) return;
      const result = event.data.result;
      if (!result?.ok) done(new Error(result?.error || '확장 응답을 확인해 주세요.')); else done(undefined, result.data);
    };
    const timer = setTimeout(() => done(new Error('확장 응답이 없습니다. 확장을 설치·연결하고 이 화면을 새로고침해 주세요.')), timeoutMs);
    window.addEventListener('message', listener);
    window.postMessage({ source: 'bnc-reader-app', type, requestId }, location.origin);
  });
}

export function ApprovedRunButton() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const lock = useRef(false);
  async function run(type: 'traversal_start' | 'traversal_status') {
    if (lock.current) return; lock.current = true; setBusy(true);
    setMessage(type === 'traversal_start' ? '확장에 실행을 요청하는 중…' : '확인 중…');
    try { const r = await extensionRequest(type); setMessage(String(r.message ?? (r.enabled ? '순회 중' : '순회 꺼짐'))); }
    catch (e) { setMessage(e instanceof Error ? e.message : '결과를 확인하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="panel run-approved"><h2>승인한 작업 실행</h2>
    <p>검토 완료한 공감·댓글·대댓글을 확장이 같은 브라우저 창의 새 탭에서 차례로 열어 실행합니다. 대상 글을 직접 찾아 열 필요가 없습니다. 하루 상한과 동작 시간대 안에서만 실행하고, 결과가 불확실하면 다시 누르지 않습니다.</p>
    <div className="actions"><button className="primary" disabled={busy} onClick={() => void run('traversal_start')}>승인한 작업 실행</button><button disabled={busy} onClick={() => void run('traversal_status')}>진행 상태 보기</button></div>
    {message && <p className="button-result" role="status" aria-live="polite">{message}</p>}
    <small>처음 한 번은 확장 팝업 「승인한 글 순회」에서 동의해 주세요. 그 뒤로는 이 버튼만 누르면 됩니다. 멈출 때는 확장 팝업의 「순회 중단」을 누릅니다.</small>
  </section>;
}
