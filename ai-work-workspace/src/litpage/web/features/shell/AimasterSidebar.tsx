// AIMaster 공통 좌측 메뉴 규격(docs/SIDEBAR_LAYOUT_STANDARD.md)
// 스마트 프로 인디고 워크스페이스 스타일 적용
import { useSession } from '../../lib/store/session.ts';
import { useCurrentUser } from '../../lib/hooks.ts';
import { useEffect, useState } from 'react';
import './aimaster.css';

const PROGRAMS_URL = 'https://www.buylife.xyz/programs';
export const AIMASTER_APP_NAME = 'AI 업무 워크스페이스';
export const AIMASTER_APP_VERSION = 'v1.19';

export function AimasterSidebarTop() {
  return (
    <div className="aww-sb-top">
      <a className="aww-sb-back" href={PROGRAMS_URL} title="메인 사이트로 이동">
        <span className="aww-sb-back-arrow" aria-hidden>←</span>
        <span>다른 프로그램 보기</span>
      </a>
      <div className="aww-sb-brand-row">
        <div className="aww-sb-icon-box" aria-hidden>
          🏢
        </div>
        <div className="aww-sb-title">
          <span className="aww-sb-name">{AIMASTER_APP_NAME}</span>
          <span className="aww-sb-badge-indigo">{AIMASTER_APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}

/** U7: 안 가져간 받은 업무 수(없으면 「모음」) */
function InboxCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/rpc/workInboxList', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j && typeof j.unread === 'number') setN(j.unread); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return n ? <span className="aww-sb-item-chip aww-sb-item-chip-new">{n}</span> : <span className="aww-sb-item-chip">모음</span>;
}

export function AimasterSidebarBottom() {
  const user = useCurrentUser() as { email?: string } | undefined;
  const email = user?.email || (typeof document !== 'undefined' ? document.getElementById('lit-app')?.dataset.memberEmail : '') || '';
  return (
    <div className="aww-sb-bottom">
      {/* AIMaster 표준 메뉴: API 키 등록 & 매뉴얼 */}
      <div className="aww-sb-nav-card">
        {/* U7: 다른 프로그램 결과가 모이는 받은 업무함(/inbox) */}
        <a className="aww-sb-item" href="/inbox">
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">📨</span>
            <span className="aww-sb-item-label">받은 업무</span>
          </div>
          <InboxCount />
        </a>
        <a className="aww-sb-item" href="/settings/keys">
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">🔑</span>
            <span className="aww-sb-item-label">API키등록·플랫폼연동</span>
          </div>
          <span className="aww-sb-item-chip">연동</span>
        </a>
        <a className="aww-sb-item" href="/guide">
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">📖</span>
            <span className="aww-sb-item-label">연동 & 사용 매뉴얼</span>
          </div>
          <span className="aww-sb-item-chip">가이드</span>
        </a>
      </div>

      <div className="aww-sb-account">
        <div className="aww-sb-user-info">
          <span className="aww-sb-user-dot" aria-hidden>●</span>
          <span className="aww-sb-email" title={email}>
            {email || '회원 로그인 중'}
          </span>
        </div>
        <button
          type="button"
          className="aww-sb-logout"
          title="로그아웃"
          onClick={() => void useSession.getState().logout()}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
