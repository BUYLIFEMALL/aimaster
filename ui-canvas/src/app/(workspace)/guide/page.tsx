import { GuideContent } from "@/components/workspace/GuideContent";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { BookOpen, KeyRound, PencilRuler, Sparkles } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function GuidePage() {
  return (
    <>
      {/* 가이드 히어로 배너 */}
      <section className="studio-hero">
        <div className="studio-hero-badge">
          <BookOpen size={13} style={{ color: "#f59e0b" }} />
          <span>Canvas Pro Guide Book {APP_VERSION}</span>
        </div>
        <h1 className="studio-hero-title">상상을 완벽한 프로토타입으로 만드는 UI Canvas 완전 가이드</h1>
        <p className="studio-hero-desc">
          초보자도 3분 만에 마우스 드래그로 전문 UI 화면을 그리고, AI로 앱 스크린샷을 분석해 구조화된 컴포넌트로 역공학하며, 고해상도 이미지와 개발자용 JSON 명세로 내보내는 전체 프로세스를 안내합니다.
        </p>
        <div className="studio-hero-cta">
          <a href="/open" className="button primary" style={{ padding: "9px 18px", fontSize: 13 }}>
            <PencilRuler size={16} /> 캔버스 디자인 시작하기
          </a>
          <a href="/settings" className="button" style={{ padding: "9px 18px", fontSize: 13 }}>
            <KeyRound size={16} style={{ color: "#38bdf8" }} /> 본인 Gemini 키 설정
          </a>
        </div>
      </section>

      <GuideContent geminiGuideUrl={GEMINI_GUIDE_URL} />
    </>
  );
}
