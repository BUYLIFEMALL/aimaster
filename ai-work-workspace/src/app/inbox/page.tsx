// U7: 📨 받은 업무 — 다른 AIMaster 자동화 프로그램이 보낸 결과(공용 표 public.work_inbox)를 보고
// 「페이지로 만들기」·「표에 행으로 넣기」·「삭제」를 한다. 플랜: docs/PLAN_20261024_U7_WORK_INBOX.md
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { InboxBoard } from "./InboxBoard";
import "@/litpage/web/styles/base.css";
import "../guide/guide.css";
import "./inbox.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function InboxPage() {
  await requireProgramAccess();
  return (
    <main className="aww-guide">
      <div className="aww-guide-inner">
        <a className="aww-guide-back" href="/">
          ← 워크스페이스로 돌아가기
        </a>
        <header className="aww-guide-meta">
          <div className="aww-guide-meta-left">
            <div className="aww-guide-emoji-box" aria-hidden>
              📨
            </div>
            <div>
              <p className="aww-guide-eyebrow">
                {APP_NAME} {APP_VERSION}
              </p>
              <h1>받은 업무</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge aww-badge-indigo">다른 프로그램 결과 모음</span>
              <span className="aww-badge">30일 뒤 자동 정리</span>
            </div>
          </div>
        </header>
        <InboxBoard />
      </div>
    </main>
  );
}
