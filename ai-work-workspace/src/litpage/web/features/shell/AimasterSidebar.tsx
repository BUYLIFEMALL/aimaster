// AIMaster 공통 좌측 메뉴 규격(docs/SIDEBAR_LAYOUT_STANDARD.md)
// 스마트 프로 인디고 워크스페이스 스타일 적용
import { useSession } from '../../lib/store/session.ts';
import { navigate, spaceDomain } from '../../lib/router.ts';
import { useCurrentUser } from '../../lib/hooks.ts';
import { tx } from './i18n.ts'; // 2026-11-17 WS-20261117-19: 이번 추가 메뉴 문구 ko/en
import { useEffect, useState } from 'react';
import './aimaster.css';
import { APP_VERSION } from '../../../../lib/version.ts';

const PROGRAMS_URL = 'https://www.buylife.xyz/programs';
export const AIMASTER_APP_NAME = 'AI 업무 워크스페이스';
// 버전은 src/lib/version.ts 한 곳에서만 올린다(2026-11-14 — 두 곳에 따로 적어 v1.21·v1.34·v1.38 세 번 메뉴 버전이 뒤처짐)
export const AIMASTER_APP_VERSION = APP_VERSION;

export function AimasterSidebarTop() {
  return (
    <div className="aww-sb-top">
      <a className="aww-sb-back" href={PROGRAMS_URL} title={tx('Go to the main site')}>
        <span className="aww-sb-back-arrow" aria-hidden>←</span>
        <span>{tx('Other programs')}</span>
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
  return n ? <span className="aww-sb-item-chip aww-sb-item-chip-new">{n}</span> : <span className="aww-sb-item-chip">{tx('Collected')}</span>;
}

export function AimasterSidebarBottom() {
  const user = useCurrentUser() as { email?: string } | undefined;
  const studioSpace = useSession((st) => st.spaceId);
  const studioHref = studioSpace ? `/${spaceDomain(studioSpace)}/studio` : '';
  // 2026-11-17 WS-20261117-17: 영수증도 워크스페이스 안 화면으로(왼쪽 메뉴 유지). 워크스페이스를 아직 모르면 기존 /receipts
  const receiptsHref = studioSpace ? `/${spaceDomain(studioSpace)}/receipts` : '/receipts';
  // 2026-11-18 WS-20261118-04: 받은 업무·캘린더 연동·API키등록·매뉴얼도 워크스페이스 안 화면으로(왼쪽 메뉴 유지). 워크스페이스를 아직 모르면 기존 주소
  const inShell = (seg: string, fallback: string) => (studioSpace ? `/${spaceDomain(studioSpace)}/${seg}` : fallback);
  const go = (href: string) => (e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number; preventDefault: () => void }) => {
    if (!studioSpace || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };
  const inboxHref = inShell('inbox', '/inbox');
  const calendarHref = inShell('calendar-sync', '/calendar-sync');
  const keysHref = inShell('keys', '/settings/keys');
  const guideHref = inShell('guide', '/guide');
  const email = user?.email || (typeof document !== 'undefined' ? document.getElementById('lit-app')?.dataset.memberEmail : '') || '';
  return (
    <div className="aww-sb-bottom">
      {/* AIMaster 표준 메뉴: API 키 등록 & 매뉴얼 */}
      <div className="aww-sb-nav-card">
        {/* 2026-11-17 WS-20261117-13 146 S2: 관제 대시보드(/<domain>/studio, 워크스페이스 안 화면) */}
        <a
          className="aww-sb-item"
          href={studioHref}
          onClick={(e) => {
            if (!studioHref || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            navigate(studioHref);
          }}
        >
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">📊</span>
            <span className="aww-sb-item-label">{tx('Control dashboard')}</span>
          </div>
        </a>
        {/* U7: 다른 프로그램 결과가 모이는 받은 업무함(/inbox) */}
        <a className="aww-sb-item" href={inboxHref} onClick={go(inboxHref)}>
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">📨</span>
            <span className="aww-sb-item-label">{tx('Work inbox')}</span>
          </div>
          <InboxCount />
        </a>
        {/* 2026-11-11: 영수증·세금계산서(/receipts) — 받은 증빙 사진 자동 정리·발행 */}
        <a
          className="aww-sb-item"
          href={receiptsHref}
          onClick={(e) => {
            if (!studioSpace || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            navigate(receiptsHref);
          }}
        >
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">🧾</span>
            <span className="aww-sb-item-label">{tx('Receipts & tax invoices')}</span>
          </div>
          <span className="aww-sb-item-chip">{tx('Evidence')}</span>
        </a>
        {/* 2026-11-11: 캘린더 연동(/calendar-sync) — 간편 구독(ICS)·구글 계정 연결 */}
        <a className="aww-sb-item" href={calendarHref} onClick={go(calendarHref)}>
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">📅</span>
            <span className="aww-sb-item-label">{tx('Calendar sync')}</span>
          </div>
          <span className="aww-sb-item-chip">{tx('Google')}</span>
        </a>
        <a className="aww-sb-item" href={keysHref} onClick={go(keysHref)}>
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">🔑</span>
            <span className="aww-sb-item-label">{tx('API keys & platform links')}</span>
          </div>
          <span className="aww-sb-item-chip">{tx('Links')}</span>
        </a>
        <a className="aww-sb-item" href={guideHref} onClick={go(guideHref)}>
          <div className="aww-sb-item-inner">
            <span className="aww-sb-item-icon">📖</span>
            <span className="aww-sb-item-label">{tx('Setup & user guide')}</span>
          </div>
          <span className="aww-sb-item-chip">{tx('Guide')}</span>
        </a>
      </div>

      <div className="aww-sb-account">
        <div className="aww-sb-user-info">
          <span className="aww-sb-user-dot" aria-hidden>●</span>
          <span className="aww-sb-email" title={email}>
            {email || tx('Signed in')}
          </span>
        </div>
        <button
          type="button"
          className="aww-sb-logout"
          title={tx('Log out')}
          onClick={() => void useSession.getState().logout()}
        >
          {tx('Log out')}
        </button>
      </div>
    </div>
  );
}
