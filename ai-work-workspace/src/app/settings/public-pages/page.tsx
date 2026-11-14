// 관리자 전용: 웹에 게시된 공개 페이지 관리(2026-11-14 공개 페이지 1단계, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md B-4)
import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { isAdminUser } from "@/server/adminOnly";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { PublicPagesAdmin } from "./PublicPagesAdmin";
import "@/litpage/web/styles/base.css";
import "../../guide/guide.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PublicPagesAdminPage() {
  const user = await requireProgramAccess();
  if (!(await isAdminUser(user.id))) redirect("/");
  return (
    <main className="aww-guide">
      <div className="aww-guide-inner">
        <a className="aww-guide-back" href="/">← 워크스페이스로 돌아가기</a>
        <header className="aww-guide-meta">
          <div className="aww-guide-meta-left">
            <span className="aww-guide-emoji" aria-hidden>🌐</span>
            <div>
              <p className="aww-guide-eyebrow">{APP_NAME} {APP_VERSION} · 관리자</p>
              <h1>공개 페이지 관리</h1>
            </div>
          </div>
        </header>
        <p style={{ margin: "8px 0 20px", color: "var(--lp-text-secondary, #666)" }}>
          회원이 「공유 › 게시」로 웹에 올린 페이지입니다. 신고가 많은 순으로 보입니다. 「내리기」를 누르면 방문자에게 바로 보이지 않고(회원 워크스페이스 안에서는 그대로), 「다시 열기」로 되돌릴 수 있습니다.
        </p>
        <PublicPagesAdmin />
      </div>
    </main>
  );
}
