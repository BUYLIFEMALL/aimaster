'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { APP_VERSION } from '../lib/version';
import { VersionStatus } from './VersionStatus';

// v1.16 메뉴 4개(PLAN_20261104_SIMPLIFY_FLOW §3-4). 옛 주소 /reader·/candidates는 새 화면으로 연결한다.
const steps = [
  { href: '/today', icon: '🏠', title: '오늘의 소통', description: '새 글 확인 · 문장 · 작업 결과' },
  { href: '/neighbors', icon: '👥', title: '이웃', description: '관계 기록 · 가져오기 · 후보 찾기' },
  { href: '/studio', icon: '📊', title: '내 블로그', description: '프로필 분석 · 확인과 수정' },
  { href: '/settings', icon: '⚙️', title: '설정', description: 'API키등록·플랫폼연동 · 상한 · 모델' },
];

export function ProgramNavigation({ children, email }: { children: ReactNode; email?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const close = () => setOpen(false);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Logout failed');
      window.location.assign('https://www.buylife.xyz/login');
    } catch { setError('로그아웃하지 못했습니다. 다시 시도해 주세요.'); setLoggingOut(false); }
  }
  const menu = (mobile: boolean) => <>
    <div className="bnc-sidebar-heading">
      <Link className="bnc-brand" href="/today" onClick={close}>
        <span className="bnc-brand-mark" aria-hidden="true">N↗</span>
        <strong>AI 블로그<br />이웃 소통 자동화</strong>
        <small className="bnc-brand-version">RELAY DESK</small>
      </Link>
      <VersionStatus />
      <a className="bnc-backlink" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
    </div>
    <nav className="bnc-sidebar-nav" aria-label={mobile ? '모바일 프로그램 메뉴' : '프로그램 메뉴'}>
      <p className="bnc-nav-caption">메뉴</p>
      <ol className="bnc-flow">{steps.map(step => <li key={step.href}>
        <Link className="bnc-flow-item" href={step.href} aria-current={active(step.href) ? 'page' : undefined} onClick={close}>
          <span className="bnc-step-number" aria-hidden="true">{step.icon}</span>
          <span><strong>{step.title}</strong><small>{step.description}</small></span>
        </Link>
      </li>)}</ol>
      <div className="bnc-utilities">
        <a className="primary nav-download" href="/downloads/blog-neighbor-care-extension-latest.zip" download><span>⬇ 확장 프로그램 받기</span><small>최신 {APP_VERSION}</small></a>
        <Link href="/guide" aria-current={active('/guide') ? 'page' : undefined} onClick={close}><span aria-hidden="true">📖</span>연동 &amp; 사용 매뉴얼</Link>
      </div>
    </nav>
    <div className="bnc-account">
      <small>본인 계정·본인 키로 사용합니다.</small>
      {email ? <><p className="bnc-account-email" title={email}>{email}</p><button type="button" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? '로그아웃 중…' : '로그아웃'}</button></> : <a href="https://www.buylife.xyz/login">회원 로그인 · 계정 확인</a>}
      {error && <p className="bnc-account-error" role="alert">{error}</p>}
    </div>
  </>;
  return <div className="bnc-app"><a className="skip-link" href="#bnc-content">본문으로 이동</a>
    <aside className="bnc-sidebar desktop-sidebar">{menu(false)}</aside>
    <div className="mobile-sidebar">
      <div className="mobile-header"><strong>AI 블로그 이웃 소통 자동화 <small>{APP_VERSION}</small></strong>
        <button type="button" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open} aria-controls="bnc-mobile-menu" onClick={() => setOpen(value => !value)}>{open ? '✕' : '☰'}</button>
      </div>
      {open && <div className="mobile-menu" id="bnc-mobile-menu">{menu(true)}</div>}
    </div>
    <div className="bnc-workspace"><header className="bnc-top"><span>AI 블로그 이웃 소통 자동화 <small>{APP_VERSION}</small></span><span className="badge">현재 후보 선택까지 · 자동 소통 꺼짐</span></header><main id="bnc-content">{children}</main></div>
  </div>;
}
