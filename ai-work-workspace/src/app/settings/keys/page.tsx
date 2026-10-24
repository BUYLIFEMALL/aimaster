// U3: 🔑 API키등록·플랫폼연동 — AIMaster 표준 메뉴 이름(CLAUDE.md 「API키등록·플랫폼연동 페이지 표준」).
// 회원 본인 OpenAI·Claude 키를 공용 표 user_api_keys에 등록한다. 맨 아래 「📖 연동 매뉴얼」 상자(platform_guides 팝업).
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { KeysForm } from "./KeysForm";
import "@/litpage/web/styles/base.css";
import "../../guide/guide.css";
import "./keys.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function KeysPage() {
  await requireProgramAccess();
  return (
    <main className="aww-guide">
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

        <section className="aww-tip">
          💡 AI 비서(AI 질문·글쓰기·AI 블록·자동 채우기)는 <b>회원 본인의 OpenAI 또는 Claude API 키</b>로만 동작합니다. 사용료는 본인 키로 청구되며, 다른 AIMaster 프로그램이나 메인 사이트 「API 설정」에서 이미 등록한 키가 있으면 그대로 쓰입니다. 두 키가 모두 있으면 Claude를 먼저 씁니다.
        </section>

        <KeysForm />

        <section className="aww-warn">
          ⚠️ 키는 다른 사람에게 보여 주지 마세요. 저장한 키는 앞뒤 몇 글자만 화면에 보이며, 바꾸거나 지우면 1분 안에 반영됩니다.
        </section>
      </div>
    </main>
  );
}
