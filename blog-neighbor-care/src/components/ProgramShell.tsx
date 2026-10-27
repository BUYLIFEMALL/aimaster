'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { APP_VERSION } from '../lib/version';

export function ProgramShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const links = [['/studio', '⌂', '내 블로그'], ['/candidates', '▤', '후보 비교'], ['/neighbors', '◎', '이웃 관계 기록'], ['/reader', '↔', '내 글 연결'], ['/guide', '?', '사용 매뉴얼'], ['/settings', '⚙', '연결·설정']];
  return <div className="bnc-app"><a className="skip-link" href="#bnc-content">본문으로 이동</a>
    <aside className="bnc-sidebar"><Link className="bnc-brand" href="/studio"><span aria-hidden="true">N↗</span><strong>AI 블로그<br />이웃 소통 자동화</strong><small>RELAY DESK</small></Link>
      <nav aria-label="프로그램 메뉴">{links.map(([href, icon, title]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}><span aria-hidden="true">{icon}</span>{title}</Link>)}</nav>
      <div className="bnc-utilities"><a className="primary nav-download" href="/downloads/blog-neighbor-care-extension-latest.zip" download>확장 프로그램 받기 <small>{APP_VERSION}</small></a><Link href="/guide">설치·사용 방법 ↗</Link><a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer">회원 API 연동 ↗</a><small>본인 계정·본인 키로 사용합니다.</small></div>
    </aside><div className="bnc-workspace"><header className="bnc-top"><span>AI 블로그 이웃 소통 자동화 <small>{APP_VERSION}</small></span><span className="badge">현재 후보 선택까지 · 자동 소통 꺼짐</span></header><main id="bnc-content">{children}</main></div>
  </div>;
}
