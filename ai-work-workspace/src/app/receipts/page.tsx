// 🧾 영수증·세금계산서(2026-11-11) — 받은 증빙 사진 자동 정리, 간이영수증·거래명세서·세금계산서 작성, 내 사업자·거래처·품목.
// 플랜: docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md §6. 명령: /api/rpc/rcpt*(src/server/receipts.ts)
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { ReceiptsBoard } from "./ReceiptsBoard";
import "@/litpage/web/styles/base.css";
import "../guide/guide.css";
import "./receipts.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ReceiptsPage() {
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
              🧾
            </div>
            <div>
              <p className="aww-guide-eyebrow">
                {APP_NAME} {APP_VERSION}
              </p>
              <h1>영수증·세금계산서</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge aww-badge-indigo">📷 사진 올리면 자동 정리</span>
              <span className="aww-badge">회원 본인 AI 키</span>
            </div>
          </div>
        </header>
        <ReceiptsBoard />
      </div>
    </main>
  );
}
