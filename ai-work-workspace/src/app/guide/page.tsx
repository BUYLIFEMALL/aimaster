// 📖 연동 & 사용 매뉴얼 — 스마트 프로 인디고 워크스페이스 스타일 (docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 8대 구성)
// 본문은 GuideBody.tsx(워크스페이스 안 화면과 공용, 2026-11-18 WS-20261118-04)
import { requireProgramAccess } from "@/lib/access";
import "@/litpage/web/styles/base.css";
import "./guide.css";
import { GuideBody } from "./GuideBody";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <main className="aww-guide aww-studio-page">
      <div className="aww-guide-inner">
        <a className="aww-guide-back" href="/">
          ← 워크스페이스로 돌아가기
        </a>
        <GuideBody />
      </div>
    </main>
  );
}
