import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { Zap, Eye, CheckCircle2, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="gd-step">
      <span className="gd-num">{n}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">⚡ CYBER THUMBNAIL NEON LAB MANUAL</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>비주얼 뇌과학 & 고클릭률 썸네일 공식 핸드북</span>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(56,189,248,0.15)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.3)", fontWeight: 800 }}>
            v2.0 사이버 NLE 에디션
          </span>
        </h1>
        <p>1,000만 유저의 시신경을 자극하는 3대 네온 후킹 공식과 0.3초 만에 손가락을 멈추게 만드는 비주얼 조판 법칙</p>
      </div>

      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(167,139,250,0.08) 100%)", borderColor: "rgba(56,189,248,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, color: "#38BDF8", marginBottom: 4 }}>⚡ AI 썸네일 뇌파 후킹 3단계 파이프라인</h3>
            <p style={{ fontSize: 12, color: "#94A3B8" }}>시청층 맞춤형 초고대비 네온 배색과 시선 집중 히트맵으로 유튜브 CTR을 극대화합니다.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(56,189,248,0.3)", fontSize: 11, color: "#38BDF8" }}>#초고대비네온</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(167,139,250,0.3)", fontSize: 11, color: "#A78BFA" }}>#시선유도선</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(56,189,248,0.3)", fontSize: 11, color: "#38BDF8" }}>#도파민트리거</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "#05070D", border: "1px solid rgba(16,185,129,0.3)", fontSize: 11, color: "#10B981" }}>#CTR극대화</span>
          </div>
        </div>
      </div>

      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong style={{ color: "#F8FAFC" }}>빠른 바로가기</strong>
          <a href="#key">① 보안 키 터미널 등록</a>
          <a href="#quick">② 3분 고속 렌더링</a>
          <a href="#options">③ A/B 도파민 옵션</a>
          <a href="#tips">④ 시신경 후킹 3대 원칙</a>
        </nav>

        <section id="key" className="card">
          <h2>① 보안 키 터미널 등록 (최초 1회)</h2>
          <p className="gd-lead">썸네일 이미지 생성과 시선 분석을 위해 회원 본인의 Google Gemini API 키를 등록합니다.</p>
          <ul className="gd-steps">
            <Step n={1} title="Google AI Studio 접속">
              Google 계정으로 로그인한 뒤 새 API 키를 발급받습니다.
            </Step>
            <Step n={2} title="보안 키 터미널에 등록">
              좌측 메뉴 [보안 키 터미널]로 이동하여 복사한 키를 붙여넣고 저장합니다.
            </Step>
          </ul>
        </section>

        <section id="tips" className="card">
          <h2>② 시신경을 사로잡는 3대 네온 후킹 원칙</h2>
          <div className="gd-cards" style={{ marginTop: 14 }}>
            <article>
              <h3>01. 글자 수는 7자 이하</h3>
              <p>모바일 유튜브 피드에서는 긴 글자가 전혀 읽히지 않습니다. 핵심 단어 1~2개로 0.3초 만에 뇌리에 꽂히게 만드세요.</p>
            </article>
            <article>
              <h3>02. 인물 시선 & 과장된 감정</h3>
              <p>놀람, 환희, 경악 등 감정이 극대화된 인물의 시선이 메인 카피나 사물을 향하게 배치하여 시청자의 시선을 유도합니다.</p>
            </article>
            <article>
              <h3>03. 우하단 타임코드 세이프존</h3>
              <p>모바일 유튜브 앱 우측 하단에는 08:24 같은 러닝타임 배지가 오버레이되므로 중요 텍스트를 반드시 비워두어야 합니다.</p>
            </article>
          </div>
        </section>

        <section className="card">
          <h2>⚖️ 썸네일 제작 Do&apos;s &amp; Don&apos;ts</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10B981", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                <CheckCircle2 size={16} />
                <span>권장하는 접근법 (Do&apos;s)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>
                <li>모바일 320px 화면 크기로 축소했을 때도 헤드라인이 또렷이 읽히는지 확인하세요.</li>
                <li>배경과 텍스트의 명도 대비를 4.5:1 이상으로 유지하여 시인성을 확보하세요.</li>
              </ul>
            </div>

            <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F43F5E", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                <AlertTriangle size={16} />
                <span>피해야 할 접근법 (Don&apos;ts)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}>
                <li>한 썸네일에 3가지 이상의 상반된 서체를 남발하지 마세요.</li>
                <li>영상 본문의 내용과 전혀 다른 과장된 낚시성 썸네일은 시청 지속 시간을 파괴합니다.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
