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

// v1.15: 처음 쓰는 회원을 위한 화면 구성 안내 (주인님 지시: 메뉴 위치·사용법·마이크 연결을 자세하고 쉽게)
const LAYOUT_SPOTS = [
  { no: 1, where: "왼쪽 메뉴 맨 위", name: "🔍 검색 또는 질문", desc: "페이지 제목·내용을 찾거나 AI에게 바로 물어봅니다. 단축키 Ctrl + K." },
  { no: 2, where: "왼쪽 메뉴 위쪽", name: "🏠 홈 · 💬 새 채팅 · 📥 보관함", desc: "홈은 최근 작업 모음, 새 채팅은 AI 비서와 대화, 보관함은 받은 알림·멘션을 모아 봅니다." },
  { no: 3, where: "왼쪽 메뉴 가운데", name: "📄 최근 본 페이지 · 팀 공간 · 내 페이지", desc: "내가 만든 문서가 모두 여기에 있습니다. 「내 페이지」 옆 ＋ 를 누르면 새 페이지가 생깁니다." },
  { no: 4, where: "왼쪽 메뉴 아래쪽", name: "🔑 API키등록·플랫폼연동 · 📖 매뉴얼", desc: "AI 기능에 쓸 본인 API 키를 한 번 등록하는 곳과, 지금 보고 계신 이 매뉴얼입니다." },
  { no: 5, where: "페이지 오른쪽 위", name: "🔗 공유 · ⭐ 즐겨찾기 · ⋯ 더보기", desc: "⋯ 를 누르면 버전 기록·휴지통 이동·내보내기 등 페이지 관련 기능이 모두 있습니다." },
  { no: 6, where: "페이지 본문", name: "⌨️ / (슬래시)", desc: "빈 줄에서 / 를 누르면 블록 메뉴가 열립니다. 「/회의록」, 「/표」, 「/할 일」처럼 한국어로 찾을 수 있습니다." },
];

const MEETING_STEPS = [
  { no: 1, icon: "➕", title: "회의록 블록 넣기", desc: "페이지 빈 줄에서 /회의록 을 입력하고 「AI 회의록」을 고르세요." },
  { no: 2, icon: "🎙️", title: "받아쓰기 시작", desc: "파란 「받아쓰기 시작」 버튼을 누르세요. 처음 한 번은 크롬이 마이크 사용을 물어봅니다 → 「허용」." },
  { no: 3, icon: "🗣️", title: "말하고 메모하기", desc: "말하는 내용이 「녹취록」 칸에 실시간으로 적힙니다. 중요한 내용은 「노트」 칸에 직접 적어 두면 요약에 반영됩니다." },
  { no: 4, icon: "🧾", title: "정지 → AI 요약", desc: "빨간 「정지」를 누르면 AI가 요점·할 일을 「요약」 칸에 정리합니다. 녹취가 짧으면(약 20초 미만) 「요약 만들기」 버튼을 눌러 주세요." },
];

const MIC_CHECKS = [
  { no: 1, title: "마이크가 PC에 연결돼 있나요?", body: "윈도우: 설정 → 시스템 → 소리 → 「입력」에 마이크 이름이 보이고, 말할 때 막대가 움직이면 정상입니다. 「입력 장치를 찾을 수 없음」이면 헤드셋·웹캠을 다시 꽂거나 전원·음소거 스위치를 켜 주세요.", code: "" },
  { no: 2, title: "크롬이 그 마이크를 보고 있나요?", body: "크롬 주소창에 아래 주소를 붙여 넣고 맨 위 선택 칸에서 쓰실 마이크를 고르세요. 칸이 비어 있으면 크롬을 완전히 껐다 켜 주세요(아래 두 번째 주소).", code: "chrome://settings/content/microphone" },
  { no: 3, title: "이 사이트에 마이크를 허용했나요?", body: "워크스페이스 화면에서 주소창 왼쪽 자물쇠(사이트 설정) 아이콘 → 「마이크」를 「허용」으로 바꾼 뒤 페이지를 새로고침하세요.", code: "" },
  { no: 4, title: "맥(Mac)을 쓰시나요?", body: "시스템 설정 → 개인정보 보호 및 보안 → 마이크 에서 「Google Chrome」을 켜 주세요. 켠 뒤에는 크롬을 다시 시작해야 적용됩니다.", code: "" },
];

const MIC_TROUBLES = [
  { msg: "이 PC에서 마이크를 찾지 못했습니다", fix: "마이크가 연결·전원 켜짐 상태인지 확인(체크 1) → 크롬 다시 시작(chrome://restart) → 새로고침." },
  { msg: "마이크 사용이 막혀 있습니다", fix: "주소창 왼쪽 자물쇠 → 마이크 「허용」(체크 3) → 새로고침. 윈도우 설정 → 개인정보 및 보안 → 마이크 에서 「데스크톱 앱이 마이크에 액세스하도록 허용」도 켜져 있어야 합니다." },
  { msg: "이 브라우저에서는 실시간 받아쓰기를 쓸 수 없습니다", fix: "크롬·엣지·사파리에서 열어 주세요. 다른 브라우저에서는 실시간 받아쓰기가 동작하지 않을 수 있습니다." },
  { msg: "녹취가 짧아 자동 요약을 건너뛰었습니다", fix: "고장이 아닙니다. 파란 띠의 「요약 만들기」를 누르면 바로 요약합니다." },
  { msg: "AI 비서를 쓰려면 본인 API 키가 필요합니다", fix: "받아쓰기는 무료지만 요약은 본인 AI 키(Gemini·OpenAI·Claude 중 하나)가 필요합니다. 왼쪽 메뉴 「API키등록·플랫폼연동」에서 한 번 등록하세요." },
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

        {/* v1.15 처음 오셨나요? — 화면 구성(메뉴 위치) 한눈에 보기 */}
        <section className="aww-tour" id="tour" aria-label="화면 구성 한눈에 보기">
          <div className="aww-section-head">
            <span className="aww-badge aww-badge-indigo">처음 오셨나요?</span>
            <h2>🧭 화면 구성 한눈에 보기 — 메뉴는 어디에 있나요?</h2>
            <p>워크스페이스를 열면 왼쪽에 메뉴, 가운데에 페이지, 오른쪽 위에 페이지 도구가 있습니다. 번호 순서대로 보시면 됩니다.</p>
          </div>
          <div className="aww-tour-body">
            <div className="aww-tour-map" aria-hidden>
              <div className="aww-tour-side">
                <span className="aww-tour-pin">1</span><div className="aww-tour-bar w80" />
                <span className="aww-tour-pin">2</span><div className="aww-tour-bar w60" />
                <span className="aww-tour-pin">3</span><div className="aww-tour-bar w70" /><div className="aww-tour-bar w50" />
                <div className="aww-tour-gap" />
                <span className="aww-tour-pin">4</span><div className="aww-tour-bar w75" />
              </div>
              <div className="aww-tour-page">
                <div className="aww-tour-top"><span className="aww-tour-pin">5</span><div className="aww-tour-bar w30" /></div>
                <div className="aww-tour-title" />
                <div className="aww-tour-line"><span className="aww-tour-pin">6</span><span className="aww-tour-slash">/ 회의록</span></div>
                <div className="aww-tour-bar w90" /><div className="aww-tour-bar w70" />
              </div>
            </div>
            <ol className="aww-tour-list">
              {LAYOUT_SPOTS.map((s) => (
                <li key={s.no}>
                  <span className="aww-tour-pin">{s.no}</span>
                  <div>
                    <div className="aww-tour-where">{s.where}</div>
                    <strong>{s.name}</strong>
                    <p>{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* v1.15 AI 회의록 사용법 4단계 */}
        <section className="aww-meeting" id="meeting" aria-label="AI 회의록 사용법">
          <div className="aww-section-head">
            <span className="aww-badge aww-badge-emerald">AI 회의록</span>
            <h2>🎙️ 말하면 받아쓰고, 끝나면 요약까지 — AI 회의록 사용법</h2>
            <p>받아쓰기는 브라우저(크롬·엣지·사파리)가 무료로 처리하고, 요약만 본인 AI 키로 만듭니다.</p>
          </div>
          <div className="aww-guide-steps">
            {MEETING_STEPS.map((s) => (
              <article key={s.no} className="aww-step-card">
                <div className="aww-step-card-header">
                  <span className="aww-step-num">STEP 0{s.no}</span>
                </div>
                <div className="aww-step-icon-wrap" aria-hidden>{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
          <div className="aww-meeting-buttons" aria-label="회의록 버튼 미리보기">
            <span className="aww-3d blue">🎙️ 받아쓰기 시작</span>
            <span className="aww-3d red">⏹ 정지</span>
            <span className="aww-3d green">🧾 요약 만들기</span>
            <span className="aww-meeting-buttons-note">← 회의록 블록에서 이 버튼들을 찾으세요</span>
          </div>
        </section>

        {/* v1.15 마이크 연결·허용 방법 */}
        <section className="aww-mic" id="microphone" aria-label="마이크 연결 방법">
          <div className="aww-section-head">
            <span className="aww-badge">🎤 마이크</span>
            <h2>🎤 마이크 연결·허용 방법 (받아쓰기가 안 될 때)</h2>
            <p>아래 4가지를 순서대로 확인하면 대부분 해결됩니다.</p>
          </div>
          <div className="aww-mic-grid">
            {MIC_CHECKS.map((c) => (
              <article key={c.no} className="aww-mic-card">
                <div className="aww-mic-no">체크 {c.no}</div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                {c.code && <code className="aww-mic-code">{c.code}</code>}
                {c.no === 2 && <code className="aww-mic-code">chrome://restart</code>}
              </article>
            ))}
          </div>
          <div className="aww-mic-table" role="table" aria-label="화면 안내 문구별 해결 방법">
            <div className="aww-mic-row head" role="row"><span role="columnheader">화면에 이런 문구가 나오면</span><span role="columnheader">이렇게 해 주세요</span></div>
            {MIC_TROUBLES.map((r) => (
              <div key={r.msg} className="aww-mic-row" role="row"><span role="cell">「{r.msg}」</span><span role="cell">{r.fix}</span></div>
            ))}
          </div>
          <aside className="aww-banner aww-warn">
            <div className="aww-banner-head"><span className="aww-banner-icon">⚠️</span><strong>받아쓰기 전에 꼭 확인하세요</strong></div>
            <ul>
              <li>받아쓰기 대상자 모두에게 녹음 사실을 알리고 동의를 받아 주세요.</li>
              <li>브라우저 받아쓰기는 이 PC 마이크 소리만 듣습니다. 화상회의 상대방 목소리는 스피커로 크게 틀어야 함께 적힙니다.</li>
              <li>받아쓰는 동안 브라우저 탭을 닫으면 멈춥니다. 워크스페이스 안의 다른 페이지로 옮겨도 화면에 녹음 표시가 남아 바로 정지할 수 있습니다.</li>
            </ul>
          </aside>
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
