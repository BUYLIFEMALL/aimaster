// 📅 캘린더 연동(2026-11-11) — ① 간편 구독(ICS) ② 구글 계정 연결(OAuth)을 회원이 골라 쓴다.
// 플랜: docs/PLAN_20261111_GOOGLE_CALENDAR.md. 명령: /api/rpc/cal*(src/server/calendarSync.ts)
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { CalendarBoard } from "./CalendarBoard";
import "@/litpage/web/styles/base.css";
import "../guide/guide.css";
import "../receipts/receipts.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CalendarSyncPage() {
  await requireProgramAccess();
  return (
    <main className="aww-guide">
      <div className="aww-guide-inner">
        <a className="aww-guide-back rc-noprint" href="/">
          ← 워크스페이스로 돌아가기
        </a>
        <header className="aww-guide-meta rc-noprint">
          <div className="aww-guide-meta-left">
            <div className="aww-guide-emoji-box" aria-hidden>
              📅
            </div>
            <div>
              <p className="aww-guide-eyebrow">
                {APP_NAME} {APP_VERSION}
              </p>
              <h1>캘린더 연동</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge aww-badge-indigo">① 간편 구독 · ② 구글 계정 연결</span>
              <span className="aww-badge">회원이 골라 쓰기</span>
            </div>
          </div>
        </header>
        <CalendarBoard />
      </div>
    </main>
  );
}
