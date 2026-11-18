// U3: 🔑 API키등록·플랫폼연동 — AIMaster 표준 메뉴 이름(CLAUDE.md 「API키등록·플랫폼연동 페이지 표준」).
// 회원 본인 OpenAI·Claude·Gemini 키를 공용 표 user_api_keys에 등록한다. 맨 아래 「📖 연동 매뉴얼」 상자(platform_guides 팝업).
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { KeysForm } from "./KeysForm";
import { KeysTip, KeysWarn } from "./KeysNotes";
import "@/litpage/web/styles/base.css";
import "../../guide/guide.css";
import "./keys.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function KeysPage() {
  const user = await requireProgramAccess();
  return (
    <main className="aww-guide aww-studio-page">
      <div className="aww-guide-inner">
        <a className="aww-guide-back" href="/">
          ← 워크스페이스로 돌아가기
        </a>
        <header className="aww-guide-meta">
          <div className="aww-guide-meta-left">
            <span className="aww-guide-emoji" aria-hidden>
              🔑
            </span>
            <div>
              <p className="aww-guide-eyebrow">
                {APP_NAME} {APP_VERSION}
              </p>
              <h1>API키등록·플랫폼연동</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge">AI 비서</span>
              <span className="aww-badge">본인 키 · 본인 청구</span>
            </div>
          </div>
        </header>

        <KeysTip />

        <KeysForm accountKey={user.id} />

        <KeysWarn />
      </div>
    </main>
  );
}
