import { ProjectList } from "@/components/workspace/ProjectList";
import { BookOpen, Layers, Sparkles, Wand2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardPage() {
  return (
    <>
      <section className="studio-hero" style={{ marginBottom: "28px" }}>
        <div style={{ maxWidth: "760px" }}>
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI LANDING ARCHITECT · FLOW WIZARD v1.10</span>
          </div>
          <h1 className="hero-title">
            전환율을 극대화하는 <span className="gradient-text">단계별 랜딩페이지 기획</span>
          </h1>
          <p className="hero-desc">
            주제·타겟·목표만 입력하면 AI가 전환 중심의 6대 핵심 블록과 인터랙티브 HTML 프로토타입을 실시간으로 설계해 드립니다.
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
            <a href="/guide" className="button secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <BookOpen size={16} />
              <span>📖 사용 매뉴얼 보기</span>
            </a>
            <a href="/settings" className="button secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span>🔑 API 키 설정</span>
            </a>
          </div>
        </div>
      </section>

      {/* 3대 KPI 지표 카드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px",
        marginBottom: "28px"
      }}>
        <div className="card" style={{ padding: "20px", borderLeft: "4px solid #2563eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={20} />
            </div>
            <div>
              <strong style={{ fontSize: "15px", color: "#0f172a" }}>20종 업종별 템플릿</strong>
              <small style={{ display: "block", color: "#64748b", fontSize: "12px" }}>최적화 구조 자동 추천</small>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
            SaaS, 교육, 쇼핑몰, 포트폴리오 등 업종별 전환 프레임워크를 기반으로 기획안을 도출합니다.
          </p>
        </div>

        <div className="card" style={{ padding: "20px", borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#f5f3ff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wand2 size={20} />
            </div>
            <div>
              <strong style={{ fontSize: "15px", color: "#0f172a" }}>6대 전환 블록 기획</strong>
              <small style={{ display: "block", color: "#64748b", fontSize: "12px" }}>완벽한 카피라이팅 설계</small>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
            히어로, 문제제기, 솔루션, 소셜프루프, 가격, CTA까지 설득력 있는 문장으로 채워집니다.
          </p>
        </div>

        <div className="card" style={{ padding: "20px", borderLeft: "4px solid #10b981" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} />
            </div>
            <div>
              <strong style={{ fontSize: "15px", color: "#0f172a" }}>실시간 HTML 프로토타입</strong>
              <small style={{ display: "block", color: "#64748b", fontSize: "12px" }}>즉시 열리는 반응형 시안</small>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
            기획안에서 한 번의 클릭으로 Tailwind 기반 반응형 HTML 코드를 생성하고 미리볼 수 있습니다.
          </p>
        </div>
      </div>

      <div className="page-heading" style={{ marginBottom: "16px" }}>
        <p className="eyebrow">프로젝트 아카이브</p>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>내 기획 프로젝트</h2>
        <p>생성된 모든 기획안과 프로토타입은 자동으로 안전하게 보관되며 언제든 다시 편집할 수 있습니다.</p>
      </div>

      <ProjectList />
    </>
  );
}
