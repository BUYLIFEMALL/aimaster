import { StartPanel } from "@/components/editor/StartPanel";
import { DocumentList } from "@/components/editor/DocumentList";
import { APP_VERSION } from "@/lib/version";
import { Sparkles, PenLine, BookOpen, Layers, FileText, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardPage() {
  return (
    <>
      {/* 1. 포커스 스튜디오 히어로 웰컴 배너 */}
      <div className="studio-hero">
        <div className="studio-hero-badge">
          <Sparkles size={13} />
          <span>Focus Studio 에디션 {APP_VERSION}</span>
        </div>
        <h1>AI 글쓰기 & 서식 에디터 작업실</h1>
        <p>
          주제만 입력하면 AI가 전문적인 글 초안을 작성하고, Tiptap 리치 에디터에서 자유롭게 서식을 꾸미며
          문장별 AI 수정과 글 전체의 문법·표현·구조 분석 제안을 즉시 적용할 수 있습니다.
        </p>
        <div className="studio-hero-actions">
          <a href="#start-form" className="btn-hero-primary">
            <PenLine size={15} />
            <span>새 글 작성하기</span>
          </a>
          <a href="/guide" className="btn-hero-secondary">
            <BookOpen size={15} />
            <span>사용 매뉴얼 보기</span>
          </a>
        </div>
      </div>

      {/* 2. 에디터 핵심 기능 3대 지표 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#eef2ff",
                color: "#4f46e5",
              }}
            >
              <FileText size={18} />
            </span>
            <div>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>9종 글쓰기 템플릿</strong>
              <small style={{ display: "block", color: "#64748b" }}>블로그·뉴스레터·보고서 등</small>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#f0fdf4",
                color: "#16a34a",
              }}
            >
              <Layers size={18} />
            </span>
            <div>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>Tiptap 리치 서식</strong>
              <small style={{ display: "block", color: "#64748b" }}>표·이미지·글자색·형광펜</small>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#fffbeb",
                color: "#d97706",
              }}
            >
              <CheckCircle2 size={18} />
            </span>
            <div>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>AI 심층 분석 & 교정</strong>
              <small style={{ display: "block", color: "#64748b" }}>문법·표현·구조 원클릭 적용</small>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 새 글 작성 & 기존 글 분석 패널 */}
      <div id="start-form" className="stack">
        <StartPanel />
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2>최근 작업 문서</h2>
            <a href="/documents" className="subtle-link" style={{ fontSize: "12px", fontWeight: "600", color: "#4f46e5" }}>
              전체 문서 보기 →
            </a>
          </div>
          <div style={{ marginTop: 14 }}>
            <DocumentList limit={5} />
          </div>
        </section>
      </div>
    </>
  );
}
