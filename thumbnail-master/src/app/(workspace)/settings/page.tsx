import { KeyManager } from "@/components/workspace/KeyManager";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { Lock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">⚡ SECURITY KEY VAULT</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>보안 키 터미널 (API & 렌더링 엔진 연동)</span>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(56,189,248,0.15)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.3)", fontWeight: 800 }}>
            암호화 볼트
          </span>
        </h1>
        <p>초고속 썸네일 이미지 생성 및 시선 집중 분석에 사용되는 Google Gemini API 키를 안전하게 암호화 보관합니다.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#38BDF8", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
          <ShieldCheck size={18} />
          <span>본인 계정 키 100% 독립 격리 원칙</span>
        </div>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
          AIMaster의 최상위 불문 원칙에 따라 모든 AI 호출은 회원의 개인 Google AI Studio 키로 직접 연결되며, 운영자 키를 공유하지 않아 계정 간 간섭이 원천 차단됩니다.
        </p>
      </div>

      <KeyManager guideUrl={GEMINI_GUIDE_URL} />
    </>
  );
}
