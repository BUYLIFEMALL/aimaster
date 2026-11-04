'use client';
// v1.18 단계 C-2: 처음 한 번 「시작하기」(확장 연결 → 내 글 1개 → 할 일·모드·통합 동의) 뒤에는 요약 카드만 보인다.
// 같은 설정(실행 허용·상한·시간대·기기 허용·모드)은 이 카드 한 곳에서 한 번에 저장한다(설정 화면과 중복 칸을 만들지 않음).
import { useCallback, useEffect, useRef, useState } from 'react';

type Autopilot = {
  consented: boolean; consentedAt: string | null; paused: boolean; tasks: string[]; mode: 'auto' | 'review'; enabled: boolean;
  likeCap: number; commentCap: number; revision: number; liveAllowed: boolean;
  schedule: { intervalMinutes: number; startMinute: number; endMinute: number }; nextDueAt: string | null;
  today: { like: number; comment: number; request: number }; waiting: number;
  attention: { uncertainJobs: number; resultCheck: boolean; messageUncertain: number; notEnabled: boolean };
};
type Device = { id: string; blog_id: string; revoked_at: string | null };
type Quote = { provider: string; model: string; inputUsdPerMillion: number; outputUsdPerMillion: number };

async function call(url: string, operation: string, payload: Record<string, unknown> = {}) {
  const r = await fetch(url, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation, payload }) });
  const v = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(v.error || '결과를 확인하지 못했습니다. 자동으로 다시 요청하지 않습니다.');
  return v;
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const minutes = (v: string) => { const [h, m] = v.split(':').map(Number); return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : NaN; };
const when = (at: string | null) => at ? new Date(at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '없음';
// 감시 AI 1회 예약 기준(입력 약 12,000·출력 6,000 토큰 상한)으로 본 최대 금액 — 실제 청구는 대개 이보다 적다.
export const callCeilingUsd = (q: Quote) => (q.inputUsdPerMillion * 12000 + q.outputUsdPerMillion * 6000) / 1e6;

export function AutopilotPanel() {
  const [a, setA] = useState<Autopilot | null>(null), [devices, setDevices] = useState<Device[]>([]), [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ like: true, comment: true, mode: 'auto' as 'auto' | 'review', likeCap: 30, commentCap: 3, start: '09:00', end: '22:00', interval: 60, consent: false });
  const lock = useRef(false);
  const load = useCallback(async () => {
    try {
      const v = (await call('/api/work', 'autopilot')).data as Autopilot; setA(v);
      setForm(f => ({ ...f, like: v.consented ? v.tasks.includes('like') : f.like, comment: v.consented ? v.tasks.includes('comment') : f.comment, mode: v.consented ? v.mode : f.mode,
        likeCap: v.consented ? v.likeCap : Math.min(30, v.likeCap), commentCap: v.consented ? Math.min(10, v.commentCap) : 3,
        start: hhmm(Number(v.schedule.startMinute ?? 540)), end: hhmm(Number(v.schedule.endMinute ?? 1320)), interval: Number(v.schedule.intervalMinutes ?? 60), consent: false }));
    } catch (e) { setMessage(e instanceof Error ? e.message : '자동 운영 상태를 확인하지 못했습니다.'); }
    try { const d = (await call('/api/work', 'extension_devices')).data as Device[]; setDevices(Array.isArray(d) ? d.filter(x => !x.revoked_at) : []); } catch { setDevices([]); }
    try { const j = (await call('/api/analysis', 'list')).data as { kind: string; state: string }[]; setHasProfile(Array.isArray(j) && j.some(x => x.kind === 'profile' && x.state === 'succeeded')); } catch { setHasProfile(null); }
    try { const m = await call('/api/neighbors/monitor', 'status'); setQuotes(Array.isArray(m.quotes) ? m.quotes : []); } catch { setQuotes([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(run: () => Promise<string>) {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('처리 중…');
    try { setMessage(await run()); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : '결과를 확인하지 못했습니다.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const save = () => act(async () => {
    if (!a) throw new Error('상태를 먼저 조회해 주세요.');
    if (!form.consent) throw new Error('통합 동의를 확인해 주세요.');
    const tasks = [form.like && 'like', form.comment && 'comment'].filter(Boolean);
    if (!tasks.length) throw new Error('할 일을 하나 이상 골라 주세요.');
    if (!devices[0]) throw new Error('먼저 확장을 연결해 주세요(1단계).');
    const start = minutes(form.start), end = minutes(form.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('동작 시간대를 확인해 주세요.');
    await call('/api/work', 'save_autopilot', { mode: form.mode, tasks, like_cap: form.likeCap, comment_cap: form.commentCap, interval_minutes: form.interval, start_minute: start, end_minute: end, expected_revision: a.revision, device_id: devices[0].id, confirmed: true });
    setEditing(false);
    return form.mode === 'auto' ? '저장했습니다. 자동 운영이 켜졌습니다 — 시간대가 되면 확장이 스스로 순회를 시작합니다.' : '저장했습니다. 검토 후 실행 모드 — 승인한 작업만 실행합니다.';
  });
  const pause = (on: boolean) => act(async () => { await call('/api/work', on ? 'pause_autopilot' : 'resume_autopilot'); return on ? '⏸ 전체 일시정지 — 자동 승인·순회 실행이 모두 멈춥니다.' : '▶ 다시 시작했습니다.'; });

  if (!a) return <section className="panel autopilot"><h2>🤖 자동 운영</h2><p role="status">{message || '상태 확인 중…'}</p></section>;
  const attention = a.attention.uncertainJobs + a.attention.messageUncertain + (a.attention.resultCheck ? 1 : 0);
  const showForm = !a.consented || editing;
  const cost = quotes.length ? Math.max(...quotes.map(callCeilingUsd)) * form.commentCap : null;
  return <section className="panel autopilot">
    <h2>🤖 자동 운영</h2>
    {a.consented && <>
      <div className="autopilot-summary" role="status">
        <p><strong>{a.paused ? '⏸ 전체 일시정지 중' : a.mode === 'auto' ? '켜짐 · 자동 모드' : '켜짐 · 검토 후 실행 모드'}</strong></p>
        <p>오늘 한 일 · 공감 {a.today.like} · 댓글 {a.today.comment} · 신청 {a.today.request} &nbsp;|&nbsp; 실행 대기 {a.waiting}건 &nbsp;|&nbsp; 다음 실행 {when(a.nextDueAt)}</p>
        <p>동작 시간대 {hhmm(a.schedule.startMinute)}~{hhmm(a.schedule.endMinute)} · 하루 상한 공감 {a.likeCap} · 댓글 {a.commentCap}</p>
      </div>
      {(attention > 0 || a.attention.notEnabled || !a.liveAllowed) && <div className="notice attention"><strong>확인이 필요한 것 {attention + (a.attention.notEnabled ? 1 : 0)}</strong>
        {a.attention.uncertainJobs > 0 && <p>결과가 불확실한 작업 {a.attention.uncertainJobs}건 — 아래 작업 기록에서 네이버 화면과 대조해 주세요. 자동으로 다시 누르지 않습니다.</p>}
        {a.attention.resultCheck && <p>이전 실행의 결과 확인이 필요해 실행을 멈췄습니다 — 작업 기록에서 확인해 주세요.</p>}
        {a.attention.messageUncertain > 0 && <p>결과를 확인하지 못한 문장 만들기 {a.attention.messageUncertain}건 — 문장 만들기 기록을 먼저 확인해 주세요.</p>}
        {a.attention.notEnabled && <p>회원 실행 허용이 꺼져 있습니다(결과가 불확실한 작업이 생기면 자동으로 꺼집니다). 확인한 뒤 아래 「설정 바꾸기」에서 다시 저장하면 켜집니다.</p>}
        {!a.liveAllowed && <p>운영 실행 준비가 아직 꺼져 있습니다(운영자 확인 중).</p>}
      </div>}
      <div className="actions">
        {a.paused ? <button className="primary" disabled={busy} onClick={() => void pause(false)}>▶ 다시 시작</button> : <button disabled={busy} onClick={() => void pause(true)}>⏸ 전체 일시정지</button>}
        <button disabled={busy} onClick={() => setEditing(v => !v)}>⚙️ 자동 운영 설정 바꾸기</button>
        <button disabled={busy} onClick={() => void load()}>새로고침</button>
      </div>
    </>}
    {showForm && <div className="autopilot-setup">
      {!a.consented && <p>처음 한 번만 설정하면 그 뒤로는 프로그램이 대신 소통합니다. 매일 할 일은 결과 확인뿐입니다.</p>}
      <ol className="setup-steps">
        <li className={devices.length ? 'done' : ''}><strong>1단계 · 확장 연결</strong> {devices.length ? `✅ 연결됨(${devices[0].blog_id})` : <>— <a href="/settings#connection">⚙️ 설정에서 확장을 연결</a>해 주세요.</>}</li>
        <li className={hasProfile ? 'done' : ''}><strong>2단계 · 내 블로그 글 1개</strong> {hasProfile ? '✅ 분석 완료' : <>— 댓글 자동에 필요합니다. <a href="/studio">📊 내 블로그</a>에서 글 1개를 분석해 주세요(공감만 쓰면 건너뛰어도 됩니다).</>}</li>
        <li><strong>3단계 · 할 일 · 모드 · 동의</strong>
          <div className="setup-form">
            <fieldset><legend>할 일</legend>
              <label className="check"><input type="checkbox" checked={form.like} onChange={e => setForm({ ...form, like: e.target.checked })} />공감 — 이웃 새 글마다(AI 없음)</label>
              <label className="check"><input type="checkbox" checked={form.comment} onChange={e => setForm({ ...form, comment: e.target.checked })} />댓글 — 「새 글 자동 확인」의 감시 AI가 만든 초안 중 품질 검사를 통과한 것만</label>
              <small>답방·받은 신청 수락 자동은 다음 배포에서 추가합니다(지금은 기존 칸에서 직접).</small>
            </fieldset>
            <fieldset><legend>모드</legend>
              <label className="check"><input type="radio" name="bnc-mode" checked={form.mode === 'auto'} onChange={() => setForm({ ...form, mode: 'auto' })} />자동 — 위 할 일을 프로그램이 승인·실행</label>
              <label className="check"><input type="radio" name="bnc-mode" checked={form.mode === 'review'} onChange={() => setForm({ ...form, mode: 'review' })} />검토 후 실행 — 내가 승인한 작업만 실행</label>
            </fieldset>
            <div className="setup-grid">
              <label>공감 하루 상한<input type="number" min={0} max={100} value={form.likeCap} onChange={e => setForm({ ...form, likeCap: Number(e.target.value) })} /></label>
              <label>댓글 하루 상한<input type="number" min={0} max={10} value={form.commentCap} onChange={e => setForm({ ...form, commentCap: Number(e.target.value) })} /></label>
              <label>시작<input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></label>
              <label>끝<input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label>
              <label>실행 간격<select value={form.interval} onChange={e => setForm({ ...form, interval: Number(e.target.value) })}><option value={30}>30분</option><option value={60}>1시간</option><option value={120}>2시간</option></select></label>
            </div>
            <p className="cost-note">💰 AI 비용: 공감은 AI를 쓰지 않습니다. 댓글 초안은 감시 AI를 켰을 때만 회원 본인 키로 만들어집니다{cost !== null ? ` — 하루 최대 약 ${cost.toFixed(3)}달러(댓글 ${form.commentCap}건 × 1회 최대 금액 기준, 실제는 대개 더 적음)` : ''}.</p>
            <label className="check consent"><input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} />
              (통합 동의) 내 키로 AI 문장 초안을 만들고, 이 기기의 확장이 승인된 작업만 하루 상한·동작 시간대 안에서 실행하며, 결과가 불확실하면 다시 하지 않는 데 동의합니다. 로그인 풀림·보안문자·계정 불일치가 생기면 멈추고 알립니다.</label>
            <div className="actions"><button className="primary" disabled={busy} onClick={() => void save()}>저장하고 {form.mode === 'auto' ? '자동 운영 시작' : '검토 모드 시작'}</button>{a.consented && <button disabled={busy} onClick={() => setEditing(false)}>닫기</button>}</div>
          </div>
        </li>
      </ol>
    </div>}
    {message && <p className="button-result" role="status" aria-live="polite">{message}</p>}
  </section>;
}
