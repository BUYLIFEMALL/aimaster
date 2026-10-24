// 📖 연동 & 사용 매뉴얼 — 스마트 프로 인디고 워크스페이스 스타일 (docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 8대 구성)
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import "@/litpage/web/styles/base.css";
import "./guide.css";
import { FaqAccordion } from "./FaqAccordion";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const HERO_IMAGE = "https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-work-workspace-thumbnail.jpg?v=1792785802425";

const STEPS = [
  {
    no: 1,
    icon: "🏢",
    title: "스마트 워크스페이스 생성",
    summary: "팀 또는 개인 업무 목적에 맞는 고유 작업 공간을 1초 만에 구성합니다.",
    tag: "기본 설정",
  },
  {
    no: 2,
    icon: "✍️",
    title: "41종 블록 & 마크다운 작성",
    summary: "/ 슬래시 단축키로 제목, 표, 코드, 할 일 체크박스를 자유롭게 조합합니다.",
    tag: "에디터",
  },
  {
    no: 3,
    icon: "🗂️",
    title: "12종 데이터베이스 뷰 전환",
    summary: "표, 칸반 보드, 캘린더, 타임라인 등 원하는 시각화 뷰로 업무를 관리합니다.",
    tag: "데이터베이스",
  },
  {
    no: 4,
    icon: "✨",
    title: "AI 비서 초안 & 버전 복원",
    summary: "본인 API 키 기반 AI 비서 질의, 30일 복원 휴지통, 버전 히스토리 복구를 지원합니다.",
    tag: "AI & 보안",
  },
];

const KEYCAP_SHORTCUTS = [
  { keys: ["/"], desc: "블록 메뉴 열기 (제목·표·데이터베이스·코드·인용 등 41종)" },
  { keys: ["#", "Space"], desc: "큰 제목 (## 중간 제목, ### 작은 제목)" },
  { keys: ["[", "]", "Space"], desc: "할 일 체크박스 생성" },
  { keys: ["-", "Space"], desc: "글머리 기호 목록 생성 (1. Space는 번호 목록)" },
  { keys: ["Ctrl", "K"], desc: "초고속 전역 문서 검색창 열기" },
  { keys: ["Ctrl", "Z"], desc: "실행 취소 (Ctrl + Shift + Z: 다시 실행)" },
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <main className="aww-guide">
      <div className="aww-guide-inner">
        <a className="aww-guide-back" href="/">
          ← 워크스페이스로 돌아가기
        </a>

        {/* ① 헤더 메타데이터 바 */}
        <header className="aww-guide-meta">
          <div className="aww-guide-meta-left">
            <div className="aww-guide-emoji-box" aria-hidden>
              📖
            </div>
            <div>
              <p className="aww-guide-eyebrow">
                공식 매뉴얼 · {APP_NAME} {APP_VERSION}
              </p>
              <h1>AI 업무 워크스페이스 3분 마스터 가이드</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge aww-badge-indigo">업무자동화</span>
              <span className="aww-badge">⏱ 소요시간 3분</span>
              <span className="aww-badge aww-badge-emerald">회원별 독립 공간</span>
            </div>
            <a className="aww-btn primary small" href="/">
              워크스페이스 바로 열기 →
            </a>
          </div>
        </header>

        {/* ② 개요 히어로 카드 */}
        <section className="aww-guide-hero">
          <img
            className="aww-guide-hero-img"
            src={HERO_IMAGE}
            alt="노트북으로 업무 보드와 문서를 정리하는 모습"
          />
          <div className="aww-guide-hero-body">
            <div className="aww-guide-badges">
              <span className="aww-badge strong">🗂️ 문서 + 데이터베이스 올인원</span>
              <span className="aww-badge strong">📊 12종 시각화 뷰</span>
              <span className="aww-badge strong">✨ 지능형 AI 비서</span>
            </div>
            <h2>어떤 작업을 할 수 있나요?</h2>
            <p>
              문서 작성, 회의록 정리, 프로젝트 칸반 보드, 사내 위키를 한 화면에서 모두 관리하는 스마트 업무 공간입니다.
              복잡한 데이터도 표·보드·캘린더·타임라인 등 원하는 형태로 1초 만에 전환해 볼 수 있으며,
              회원 본인의 API 키를 연동하여 AI 비서의 초안 작성과 요약 기능을 안전하게 활용할 수 있습니다.
            </p>
          </div>
        </section>

        {/* 흐름 한눈에 보기 */}
        <div className="aww-flow" aria-label="사용 흐름">
          {STEPS.map((s, i) => (
            <span key={s.no} className="aww-flow-item">
              <span className="aww-flow-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="aww-flow-text">{s.title}</span>
              {i < STEPS.length - 1 && (
                <span className="aww-flow-arrow" aria-hidden>
                  →
                </span>
              )}
            </span>
          ))}
        </div>

        {/* ③ 4단계 시각화 카드 */}
        <section className="aww-guide-steps" aria-label="핵심 4단계">
          {STEPS.map((s) => (
            <article key={s.no} className="aww-step-card">
              <div className="aww-step-card-header">
                <span className="aww-step-num">STEP 0{s.no}</span>
                <span className="aww-step-tag">{s.tag}</span>
              </div>
              <div className="aww-step-icon-wrap" aria-hidden>
                {s.icon}
              </div>
              <h3>{s.title}</h3>
              <p>{s.summary}</p>
            </article>
          ))}
        </section>

        {/* ④ 하이테크 키캡 단축키 치트시트 */}
        <section className="aww-shortcuts-section">
          <div className="aww-shortcuts-header">
            <span className="aww-badge aww-badge-indigo">SPEED UP</span>
            <h2>업무 속도를 3배 높이는 핵심 단축키</h2>
            <p>마우스를 잡지 않고 키보드만으로 모든 블록을 1초 만에 생성하세요.</p>
          </div>
          <div className="aww-keycap-grid">
            {KEYCAP_SHORTCUTS.map((item, idx) => (
              <div key={idx} className="aww-keycap-card">
                <div className="aww-keycap-row">
                  {item.keys.map((k, kIdx) => (
                    <span key={kIdx} className="aww-keycap-group">
                      <kbd className="aww-keycap">{k}</kbd>
                      {kIdx < item.keys.length - 1 && <span className="aww-keycap-plus">+</span>}
                    </span>
                  ))}
                </div>
                <div className="aww-keycap-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ⑤ 회원 본인 AI 키 연동 안내 배너 */}
        <section className="aww-api-banner">
          <div className="aww-api-banner-left">
            <div className="aww-api-icon-box" aria-hidden>
              🔑
            </div>
            <div>
              <h3>지능형 AI 비서 연동 안내</h3>
              <p>
                본인의 OpenAI, Anthropic Claude, Google Gemini API 키를 등록하면 문서 요약, 브레인스토밍, 초안 작성 기능을 바로 이용할 수 있습니다.
              </p>
            </div>
          </div>
          <a className="aww-btn primary small" href="/settings/keys">
            API 키 등록하러 가기 →
          </a>
        </section>

        {/* ⑥ 실전 팁 & 주의사항 */}
        <div className="aww-tips-grid">
          <aside className="aww-banner aww-tip">
            <div className="aww-banner-head">
              <span className="aww-banner-icon">💡</span>
              <strong>스마트 워크스페이스 실전 팁</strong>
            </div>
            <ul>
              <li>자주 쓰는 문서는 우측 상단 ⋯ 메뉴의 [즐겨찾기]에 추가하면 사이드바 상단에 고정됩니다.</li>
              <li>반복 작성하는 회의록이나 보고서는 [템플릿]으로 등록해 두면 새 페이지마다 1초 만에 불러옵니다.</li>
              <li>마크다운(.md)이나 CSV 파일은 에디터 화면에 드래그앤드롭하여 즉시 임포트할 수 있습니다.</li>
            </ul>
          </aside>

          <aside className="aww-banner aww-warn">
            <div className="aww-banner-head">
              <span className="aww-banner-icon">⚠️</span>
              <strong>알아두셔야 할 핵심 사항</strong>
            </div>
            <ul>
              <li>파일 첨부는 1개당 최대 4MB까지 지원되며, 안전한 전용 스키마에 암호화 보관됩니다.</li>
              <li>삭제한 페이지는 [휴지통]에 30일간 보관된 후 자동 영구 삭제되므로 언제든 안심하고 복원 가능합니다.</li>
              <li>모든 데이터는 회원별 격리 저장되므로 다른 사용자와 문서 내용이 절대 공유되지 않습니다.</li>
            </ul>
          </aside>
        </div>

        {/* ⑦ 자주 묻는 질문 (FAQ 아코디언) */}
        <FaqAccordion />

        {/* ⑧ 하단 고정 액션 바 */}
        <div className="aww-guide-actions">
          <a className="aww-btn primary large" href="/">
            스마트 워크스페이스 열기 →
          </a>
          <a className="aww-btn secondary large" href={`${MAIN_SITE}/programs/ai-work-workspace`}>
            프로그램 상세 소개
          </a>
        </div>
      </div>
    </main>
  );
}
