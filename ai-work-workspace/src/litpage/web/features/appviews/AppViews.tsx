// 2026-11-18 WS-20261118-04 (주인님 지시: 「좌측에 메인메뉴가 있게 해놔」「좌측 메뉴 전부 같은 방식으로 보이게」「좌측 따로 우측 따로 스크롤」)
// 받은 업무·캘린더 연동·API키등록·매뉴얼을 워크스페이스 안 화면(/<domain>/inbox·calendar-sync·keys·guide)으로 — 영수증(ReceiptsView)과 같은 방식.
// 화면 내용은 기존 별도 페이지의 브라우저 컴포넌트(회원 인가 /api/rpc/*)를 그대로 재사용하고, 기존 주소(/inbox 등)는 그대로 둔다
// (즐겨찾기·구글 연결 뒤 돌아오는 주소 보존). 로그인한 회원 id가 없으면 자료를 그리지 않고, 바뀌면 화면을 새로 만든다(QA017 P1과 같은 규칙).
import type { ReactNode } from 'react';
import { InboxBoard } from '@/app/inbox/InboxBoard';
import { CalendarBoard } from '@/app/calendar-sync/CalendarBoard';
import { KeysForm } from '@/app/settings/keys/KeysForm';
import { KeysTip, KeysWarn } from '@/app/settings/keys/KeysNotes';
import { GuideBody } from '@/app/guide/GuideBody';
import { APP_NAME, APP_VERSION } from '@/lib/version';
import { useSession } from '../../lib/store/session.ts';
import '@/app/guide/guide.css';
import '@/app/receipts/receipts.css';
import '@/app/inbox/inbox.css';
import '@/app/settings/keys/keys.css';
import './appViews.css';

/** E4 Gmail 스위치: 서버(app/[[...path]]/page.tsx → WorkspaceApp)가 #lit-app에 실어 준 값만 믿는다. 없으면 꺼짐 */
export function gmailOnFromDom(): boolean {
  return typeof document !== 'undefined' && document.getElementById('lit-app')?.dataset.gmailOn === '1';
}

function Frame({ view, children }: { view: string; children: ReactNode }) {
  return (
    <div className="aww-guide aww-app-view" data-app-view={view}>
      <div className="aww-guide-inner">{children}</div>
    </div>
  );
}

function Head({ emoji, title, badges, plainEmoji }: { emoji: string; title: string; badges: [string, boolean?][]; plainEmoji?: boolean }) {
  return (
    <header className="aww-guide-meta">
      <div className="aww-guide-meta-left">
        {plainEmoji ? <span className="aww-guide-emoji" aria-hidden>{emoji}</span> : <div className="aww-guide-emoji-box" aria-hidden>{emoji}</div>}
        <div>
          <p className="aww-guide-eyebrow">
            {APP_NAME} {APP_VERSION}
          </p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="aww-guide-meta-right">
        <div className="aww-guide-badges">
          {badges.map(([text, indigo]) => (
            <span key={text} className={indigo ? 'aww-badge aww-badge-indigo' : 'aww-badge'}>{text}</span>
          ))}
        </div>
      </div>
    </header>
  );
}

export function InboxView() {
  const userId = useSession((s) => s.userId);
  return (
    <Frame view="inbox">
      <Head emoji="📨" title="받은 업무" badges={[['다른 프로그램 결과 모음', true], ['1년 뒤 자동 정리']]} />
      {userId ? <InboxBoard key={userId} accountKey={userId} gmailOn={gmailOnFromDom()} /> : null}
    </Frame>
  );
}

export function CalendarSyncView() {
  const userId = useSession((s) => s.userId);
  return (
    <Frame view="calendar-sync">
      <Head emoji="📅" title="캘린더 연동" badges={[['① 간편 구독 · ② 구글 계정 연결', true], ['회원이 골라 쓰기']]} />
      {userId ? <CalendarBoard key={userId} accountKey={userId} /> : null}
    </Frame>
  );
}

export function KeysView() {
  const userId = useSession((s) => s.userId);
  return (
    <Frame view="keys">
      <Head emoji="🔑" title="API키등록·플랫폼연동" badges={[['AI 비서'], ['본인 키 · 본인 청구']]} plainEmoji />
      <KeysTip />
      {userId ? <KeysForm key={userId} accountKey={userId} /> : null}
      <KeysWarn />
    </Frame>
  );
}

export function GuideView() {
  return (
    <Frame view="guide">
      <GuideBody />
    </Frame>
  );
}
