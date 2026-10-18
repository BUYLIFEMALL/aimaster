import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ACTIONS, FORMATS } from "@/lib/we/types";
import { APP_VERSION } from "@/lib/version";
import {
  BookOpen,
  PenLine,
  Sparkles,
  Layers,
  Wand2,
  FileText,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  HelpCircle,
  Download,
  Image as ImageIcon,
  Table,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "주제 기획 & 파라미터 설계",
    desc: "블로그·뉴스레터·보고서 등 9종 포맷 중 원하는 형식을 고르고, 톤과 분량 및 최신 웹 검색 옵션을 설정합니다.",
    tag: "Planning & Ingestion",
    color: "#4f46e5",
  },
  {
    step: "02",
    title: "AI 초안 고속 생성",
    desc: "회원 본인의 Gemini 키로 10~40초 만에 구조화된 고품질 초안을 작성하며, 참고 파일(.txt, .md) 문맥을 반영합니다.",
    tag: "Gemini Synthesis",
    color: "#7c3aed",
  },
  {
    step: "03",
    title: "Tiptap 리치 서식 편집",
    desc: "표, 이미지, 텍스트 컬러, 형광펜 하이라이트와 문장 드래그 시 즉시 열리는 버블 툴바로 자유롭게 다듬습니다.",
    tag: "Rich Styling",
    color: "#2563eb",
  },
  {
    step: "04",
    title: "심층 분석 & 멀티 포맷 내보내기",
    desc: "문법·표현·구조 제안을 원클릭 적용하고, 블로그용 서식 복사 또는 .md / .html / .txt 파일로 즉시 내려받습니다.",
    tag: "Inspection & Export",
    color: "#16a34a",
  },
];

const FAQS = [
  {
    q: "작성 중인 글은 어디에 어떻게 저장되나요?",
    a: "키보드 입력을 멈추고 1.5초 뒤 서버(Supabase DB)에 자동으로 안전하게 저장됩니다. 상단에 '✓ 저장됨' 상태가 뜨면 언제든 창을 닫아도 [내 문서 보관함]에서 그대로 이어 쓸 수 있으며, 최대 30개 문서가 영구 보관됩니다.",
  },
  {
    q: "서식 복사(Rich Copy)와 마크다운 복사는 어떻게 다른가요?",
    a: "'서식 복사'는 표·이미지·글자 색상·형광펜·정렬 스타일을 100% 온전히 클립보드에 담아 네이버 블로그, 노션, 워드 등에 원클릭 붙여넣기 할 수 있습니다. '마크다운 복사'는 깃허브나 개발자 블로그용 표준 Markdown 문법으로 변환됩니다.",
  },
  {
    q: "AI 제안을 적용하면 본문의 기존 서식이 깨지지 않나요?",
    a: "안심하세요! 본 에디터는 ProseMirror 기반 정밀 텍스트 트랜잭션 치환 엔진(`pmText`)을 탑재하여, 문장을 교체해도 그 자리의 볼드, 기울임, 링크 등 인라인 서식을 완벽하게 계승하며 문단 구조를 안전하게 보존합니다.",
  },
  {
    q: "이미지 첨부 및 표 삽입 한도가 있나요?",
    a: "이미지는 한 문서당 최대 60개까지 업로드할 수 있으며, 브라우저가 긴 변 1,600px로 스마트 리사이징하여 빠른 로딩 속도를 유지합니다. 표는 3×3 기본 생성 후 행/열 추가·삭제와 너비 조절이 자유롭습니다.",
  },
  {
    q: "AI 초안 생성이나 수정 시 추가 크레딧이나 요금이 발생하나요?",
    a: "본 프로그램은 '회원 본인 API 키 직접 연동(BYOK)' 원칙을 준수합니다. [🔑 API키등록·플랫폼연동] 메뉴에서 등록하신 회원님 본인의 Google Gemini API 키 쿼터로만 호출되므로 중개 수수료나 플랫폼 크레딧 차감 없이 투명하게 작동합니다.",
  },
];

export default function GuidePage() {
  return (
    <>
      {/* 1. 상단 히어로 배너 */}
      <div className="studio-hero">
        <div className="studio-hero-badge">
          <BookOpen size={13} />
          <span>Focus Studio Guide Book {APP_VERSION}</span>
        </div>
        <h1>생각을 명작으로 완성하는 AI 글쓰기 에디터 완전 가이드</h1>
        <p>
          주제 한 줄에서 고품질 초안 작성, Tiptap 리치 서식 편집, 문장별 AI 다듬기와 글 전체의 심층 교정까지
          원스톱으로 끝내는 전문가용 에디토리얼 워크플로우를 안내해 드립니다.
        </p>
        <div className="studio-hero-actions">
          <a href="/dashboard" className="btn-hero-primary">
            <PenLine size={15} />
            <span>새 글 작성하러 가기</span>
          </a>
          <a href="/settings" className="btn-hero-secondary">
            <KeyRound size={15} />
            <span>본인 Gemini 키 설정</span>
          </a>
        </div>
      </div>

      <div className="gd">
        {/* 2. 4단계 파이프라인 프로세스 맵 */}
        <section className="card">
          <div style={{ marginBottom: "18px" }}>
            <span className="eyebrow">Standard Pipeline</span>
            <h2>표준 4단계 글쓰기 워크플로우</h2>
            <p className="gd-lead" style={{ margin: "4px 0 0" }}>
              누구나 쉽게 따라 할 수 있는 AI 글쓰기 & 서식 완성 프로세스입니다.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.step}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "20px",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "750", color: step.color, background: "#f8fafc", padding: "2px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      {step.tag}
                    </span>
                    <span style={{ fontSize: "20px", fontWeight: "900", color: step.color }}>
                      {step.step}
                    </span>
                  </div>
                  <strong style={{ fontSize: "15px", display: "block", color: "#0f172a", marginBottom: "6px" }}>
                    {step.title}
                  </strong>
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 에디터 리치 기능 & 치트시트 */}
        <section className="card">
          <div style={{ marginBottom: "18px" }}>
            <span className="eyebrow">Editor Toolkit</span>
            <h2>에디터 핵심 기능 & 서식 도구</h2>
            <p className="gd-lead" style={{ margin: "4px 0 0" }}>
              Tiptap 에디터에서 자유롭게 쓸 수 있는 강력한 기능 모음입니다.
            </p>
          </div>

          <div className="gd-cards">
            <article>
              <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Wand2 size={16} />
                <span>문장별 AI 버블 툴바</span>
              </h3>
              <p>
                마우스로 문장을 드래그하면 즉시 플로팅 툴바가 나타납니다.
                <b> {ACTIONS.map((a) => a.label).join(" · ")}</b> 기능을 지원하며,
                [직접 지시]로 &quot;초등학생도 알기 쉽게&quot; 등 자유로운 프롬프트를 넣을 수 있습니다.
              </p>
            </article>

            <article>
              <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Table size={16} />
                <span>스마트 표(Table) 편집</span>
              </h3>
              <p>
                [표 넣기] 버튼으로 3×3 표를 생성하고, 셀 안을 클릭하면 나타나는 메뉴에서
                행/열 추가·삭제 및 열 경계를 마우스로 드래그하여 너비를 자유롭게 조절할 수 있습니다.
              </p>
            </article>

            <article>
              <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ImageIcon size={16} />
                <span>이미지 클라우드 업로드</span>
              </h3>
              <p>
                PC의 이미지 파일을 선택하거나 본문에 직접 붙여넣기(Ctrl+V)하면 긴 변 1,600px로
                자동 최적화되어 안전하게 삽입됩니다. 클릭 시 크기(소/중/대) 및 캡션을 설정할 수 있습니다.
              </p>
            </article>

            <article>
              <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} />
                <span>글 전체 심층 분석 제안</span>
              </h3>
              <p>
                상단 [글 분석] 버튼을 누르면 문법·표현·구조·명확성 4대 관점의 교정 제안이 우측 패널에 생성됩니다.
                [본문에서 보기]로 확인 후 개별 또는 [모두 적용]으로 단숨에 글의 완성도를 끌어올릴 수 있습니다.
              </p>
            </article>
          </div>
        </section>

        {/* 4. 회원 본인 API 키 연동 원칙 안내 */}
        <section className="card" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)", borderColor: "#bbf7d0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#dcfce7",
                color: "#16a34a",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <strong style={{ fontSize: "16px", color: "#166534" }}>최상위 보안 원칙 (회원 본인 키 독립 연동)</strong>
                <span style={{ fontSize: "11px", fontWeight: "700", background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "4px" }}>
                  BYOK Standard
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#1e293b", lineHeight: "1.6", margin: "6px 0 12px" }}>
                본 프로그램은 회원님 본인의 Google Gemini API 키로만 작동합니다. 운영자나 다른 회원의 키를 절대 공유하지 않으며,
                등록된 키는 암호화되어 안전하게 보관됩니다. 무료로 API 키를 발급받아 등록하시면 제한 없이 글쓰기를 시작하실 수 있습니다.
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                  style={{ background: "#ffffff", borderColor: "#86efac", color: "#166534" }}
                >
                  <ExternalLink size={13} />
                  <span>Google AI Studio 무료 키 발급</span>
                </a>
                <a href="/settings" className="button primary">
                  <KeyRound size={13} />
                  <span>API 키 등록하러 가기</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 자주 묻는 질문 (FAQ) 아코디언 */}
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <HelpCircle size={18} color="#4f46e5" />
            <h2>자주 묻는 질문 (FAQ)</h2>
          </div>

          <div className="gd-faq">
            {FAQS.map((faq, index) => (
              <details key={index} open={index === 0}>
                <summary style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#4f46e5", fontWeight: "800" }}>Q{index + 1}.</span>
                  <span>{faq.q}</span>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 6. 하단 시작 CTA */}
        <div style={{ textAlign: "center", padding: "24px 16px" }}>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
            준비되셨나요? 나만의 생각을 완성도 높은 글로 지금 표현해보세요.
          </p>
          <a href="/dashboard" className="button primary" style={{ padding: "11px 24px", fontSize: "14px" }}>
            <PenLine size={16} />
            <span>AI 글쓰기 시작하기</span>
          </a>
        </div>
      </div>
    </>
  );
}
