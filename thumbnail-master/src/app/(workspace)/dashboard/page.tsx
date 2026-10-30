import { ProjectList } from "@/components/workspace/ProjectList";
import { Zap, Activity, Eye, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">⚡ CYBER THUMBNAIL VISUAL LAB</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>유튜브 썸네일 NLE 워크스페이스</span>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(56,189,248,0.15)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.3)", fontWeight: 800 }}>
            v2.0 하이퍼 렌더
          </span>
        </h1>
        <p>1,000만 유저 뇌파 반응 데이터베이스 기반으로 도파민 후킹 썸네일 2종과 SEO 전략을 실시간 생성합니다.</p>
      </div>

      {/* 실시간 사이버 HUD 메트릭스 바 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6 }}>
            <Activity size={14} color="#38BDF8" />
            <span>CTR 뇌파 후킹 지수</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#38BDF8" }}>98.4<span style={{ fontSize: 14, marginLeft: 4, color: "#A78BFA" }}>점 (SSS)</span></div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6 }}>
            <Eye size={14} color="#38BDF8" />
            <span>모바일 320px 가독성</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#F8FAFC" }}>0.3초<span style={{ fontSize: 14, marginLeft: 4, color: "#10B981" }}>인지 완료</span></div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6 }}>
            <TrendingUp size={14} color="#38BDF8" />
            <span>평균 클릭률(CTR) 상승</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>+28.5%<span style={{ fontSize: 14, marginLeft: 4, color: "#94A3B8" }}>기대치</span></div>
        </div>
      </div>

      <ProjectList />
    </>
  );
}
