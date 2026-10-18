import { ProjectList } from "@/components/workspace/ProjectList";
import { BookOpen, Box, FileCode2, PlusCircle, Sparkles } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardPage() {
  return (
    <>
      {/* 웰컴 히어로 배너 */}
      <section className="studio-hero">
        <div className="studio-hero-badge">
          <Sparkles size={13} />
          <span>Canvas Pro 에디션 {APP_VERSION}</span>
        </div>
        <h1 className="studio-hero-title">상상을 인터랙티브 화면으로 그리는 UI Canvas 작업실</h1>
        <p className="studio-hero-desc">
          25종의 전문 UI 컴포넌트를 마우스 드래그로 자유롭게 배치하고, Gemini AI를 통해 앱 스크린샷에서 UI 구조를 자동 복원하여 PNG 및 표준 JSON 명세로 내보낼 수 있습니다.
        </p>
        <div className="studio-hero-cta">
          <a href="/open" className="button primary" style={{ padding: "9px 18px", fontSize: 13 }}>
            <PlusCircle size={16} /> 캔버스 바로 열기
          </a>
          <a href="/guide" className="button" style={{ padding: "9px 18px", fontSize: 13 }}>
            <BookOpen size={16} style={{ color: "#f59e0b" }} /> 사용 매뉴얼 보기
          </a>
        </div>
      </section>

      {/* 3대 핵심 지표 카드 */}
      <div className="kpi-metrics-grid">
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>
            <Box size={22} />
          </div>
          <div className="kpi-metric-info">
            <strong>25종 UI 컴포넌트</strong>
            <span>버튼·입력창·카드·표·모달·탭 등 드래그 생성</span>
          </div>
        </div>

        <div className="kpi-metric-card">
          <div className="kpi-metric-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
            <Sparkles size={22} />
          </div>
          <div className="kpi-metric-info">
            <strong>Gemini AI 역공학</strong>
            <span>화면 스크린샷 이미지에서 UI 구조 자동 추출</span>
          </div>
        </div>

        <div className="kpi-metric-card">
          <div className="kpi-metric-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            <FileCode2 size={22} />
          </div>
          <div className="kpi-metric-info">
            <strong>1:1 실측 내보내기</strong>
            <span>고해상도 PNG 캡처 & 컴포넌트/명세 JSON</span>
          </div>
        </div>
      </div>

      <div className="page-heading" style={{ marginTop: 8 }}>
        <p className="eyebrow">UI Design Workspace</p>
        <h2>내 프로젝트 보관함</h2>
        <p>기존 프로젝트를 열어 계속 편집하거나, 새 캔버스를 만들어 즉시 프로토타이핑을 시작하세요.</p>
      </div>

      <ProjectList />
    </>
  );
}
