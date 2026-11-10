// AIMaster U11(2026-11-10): 자동화 목록 위 「정시 실행」 상태 줄. 정시 자동화(매시간·매일 9시 등)·리마인더는 회원 본인 cron-job.org가
// 1분마다 이 사이트를 불러야 제때 돈다(플랜 docs/PLAN_20261110_U11_AUTOMATION.md §3-3). 설정 칸(주기·방식)은 두지 않고 상태·일시정지·재개만.
// 상태는 /api/scheduler(DB만 읽음, cron-job.org 호출 없음).
import { useEffect, useState } from 'react';

type State = { state: 'no-key' | 'paused' | 'running' | 'idle' | 'platform' | 'platform-off'; scheduled: number; hasKey: boolean; notice?: string; error?: string };

const KEY_URL = '/settings/keys'; // 이 프로그램 「API키등록·플랫폼연동」(공용 칸 cronjob_org_api_key)

export function ScheduleLine() {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/scheduler', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j) setS(j); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!s) return null;

  async function act(action: 'pause' | 'resume') {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/scheduler', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const j = (await r.json().catch(() => ({}))) as State;
      if (!r.ok) setMsg(j.error || '처리하지 못했습니다.');
      else { setS(j); if (j.notice) setMsg(j.notice); }
    } finally {
      setBusy(false);
    }
  }

  const btn = (label: string, action: 'pause' | 'resume') => (
    <button type="button" className="nc-auto-schedule-btn" disabled={busy} onClick={(e) => { e.stopPropagation(); void act(action); }}>{busy ? '처리 중…' : label}</button>
  );

  let text: React.ReactNode;
  let control: React.ReactNode = null;
  if (s.state === 'no-key') {
    text = <>정시 자동화는 <b>본인 cron-job.org 키</b>를 한 번 등록해야 정해진 시각에 돕니다. <a href={KEY_URL}>키 등록하기</a></>;
  } else if (s.state === 'paused') {
    text = <>정시 실행: <b>일시정지됨</b> · 남은 정시 작업 {s.scheduled}개</>;
    control = btn('재개', 'resume');
  } else if (s.state === 'running') {
    text = <>정시 실행: <b>켜짐</b>(1분마다 확인) · 남은 정시 작업 {s.scheduled}개</>;
    control = btn('일시정지', 'pause');
  } else {
    text = s.scheduled > 0 ? <>정시 실행: <b>꺼짐</b> · 남은 정시 작업 {s.scheduled}개</> : <>정시 실행: <b>대기</b> · 정시 자동화를 켜면 자동으로 켜집니다</>;
    if (s.scheduled > 0) control = btn('켜기', 'resume');
  }

  return (
    <div className="nc-auto-schedule" data-state={s.state} onClick={(e) => e.stopPropagation()}>
      <span className="nc-auto-schedule-icon" aria-hidden>⏰</span>
      <span className="nc-auto-schedule-text">{text}{msg && <span className="nc-auto-schedule-msg"> {msg}</span>}</span>
      {control}
    </div>
  );
}
