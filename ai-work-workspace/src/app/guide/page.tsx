// 📖 연동 & 사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md 7대 구성(머리글 정보 바·개요 카드·4단계 카드·
// 단계별 상세·💡 팁·⚠️ 주의·바로가기 버튼). 워크스페이스와 같은 디자인 값(--lp-*)과 테마를 쓴다.
import { requireProgramAccess } from "@/lib/access";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import "@/litpage/web/styles/base.css";
import "./guide.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 카탈로그 썸네일(실사, docs/PLATFORM_PATTERNS.md §13)을 매뉴얼 개요 그림으로도 쓴다
const HERO_IMAGE = "https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ai-work-workspace-thumbnail.jpg?v=1792785802425";

const STEPS = [
  { no: 1, icon: "🏢", title: "워크스페이스 만들기", summary: "처음 들어오면 이름 하나만 정하면 내 업무 공간이 생깁니다." },
  { no: 2, icon: "✍️", title: "페이지와 블록 쓰기", summary: "/ 를 누르면 제목·할 일·표·코드 등 블록 41종을 바로 넣을 수 있습니다." },
  { no: 3, icon: "🗂️", title: "업무 데이터베이스", summary: "표·보드·캘린더·타임라인 등 12가지 보기로 같은 데이터를 봅니다." },
  { no: 4, icon: "🔎", title: "찾기·되돌리기·내보내기", summary: "검색, 버전 기록, 휴지통, Markdown·CSV·HTML 내보내기를 씁니다." },
];

const SHORTCUTS: [string, string][] = [
  ["/", "블록 메뉴 열기(제목, 할 일, 표, 데이터베이스, 코드 …)"],
  ["# 공백", "큰 제목 (## 중간 제목, ### 작은 제목)"],
  ["[] 공백", "할 일 체크박스"],
  ["- 공백", "글머리 기호 목록 (1. 공백은 번호 목록)"],
  ["Ctrl + K", "빠른 검색"],
  ["Ctrl + Z", "되돌리기 (Ctrl + Shift + Z 다시 하기)"],
];

export default async function GuidePage() {
  await requireProgramAccess();
  return (
    <main className="aww-guide">
      <div className="aww-guide-inner">
        <a className="aww-guide-back" href="/">
          ← 워크스페이스로 돌아가기
        </a>

        {/* ① 머리글 정보 바 */}
        <header className="aww-guide-meta">
          <div className="aww-guide-meta-left">
            <span className="aww-guide-emoji" aria-hidden>
              📖
            </span>
            <div>
              <p className="aww-guide-eyebrow">
                연동 & 사용 매뉴얼 · {APP_NAME} {APP_VERSION}
              </p>
              <h1>업무 워크스페이스 3분 시작하기</h1>
            </div>
          </div>
          <div className="aww-guide-meta-right">
            <div className="aww-guide-badges">
              <span className="aww-badge">업무자동화</span>
              <span className="aww-badge">⏱ 약 3분</span>
              <span className="aww-badge">본인 키 필요 없음(1단계)</span>
            </div>
            {/* ⑦ 바로가기(이 프로그램은 외부 콘솔 연동이 없어 워크스페이스로 바로 이동) */}
            <a className="aww-btn primary small" href="/">
              워크스페이스 바로 열기 →
            </a>
          </div>
        </header>

        {/* ② 개요 카드 */}
        <section className="aww-guide-hero">
          <img className="aww-guide-hero-img" src={HERO_IMAGE} alt="노트북으로 업무 보드와 문서를 정리하는 모습" />
          <div className="aww-guide-hero-body">
            <div className="aww-guide-badges">
              <span className="aww-badge strong">🗂️ 문서 + 업무 데이터베이스</span>
              <span className="aww-badge strong">📊 보기 12종</span>
              <span className="aww-badge strong">🔒 나만의 공간</span>
            </div>
            <h2>무엇을 할 수 있나요?</h2>
            <p>
              문서와 업무 데이터베이스를 한 화면에 모아 두는 나만의 업무 공간입니다. 회의록·업무 위키·프로젝트 보드·할 일 목록을 페이지와 블록으로
              자유롭게 만들고, 같은 데이터를 표·보드·캘린더·타임라인 등 원하는 모양으로 바꿔 볼 수 있습니다. 내 워크스페이스는 나에게만 보이며 다른
              회원과 섞이지 않습니다.
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
              {s.title}
              {i < STEPS.length - 1 && (
                <span className="aww-flow-arrow" aria-hidden>
                  →
                </span>
              )}
            </span>
          ))}
        </div>

        {/* ③ 4단계 카드 */}
        <section className="aww-guide-steps" aria-label="핵심 4단계">
          {STEPS.map((s) => (
            <article key={s.no} className="aww-step-card">
              <p className="aww-step-label">
                STEP {s.no} <span aria-hidden>{s.icon}</span>
              </p>
              <h3>{s.title}</h3>
              <p>{s.summary}</p>
            </article>
          ))}
        </section>

        {/* ④ 단계별 상세 */}
        <section className="aww-guide-detail">
          <div className="aww-detail-block">
            <h3>
              <span className="aww-num">1</span> 워크스페이스 만들기
            </h3>
            <p>
              처음 들어오면 워크스페이스 이름을 묻는 화면이 나옵니다. 팀 이름이나 「내 업무」처럼 정하고 계속을 누르면 바로 시작됩니다. 왼쪽 메뉴 맨 아래
              워크스페이스 이름을 누르면 워크스페이스를 더 만들거나 바꿀 수 있습니다.
            </p>
          </div>
          <div className="aww-detail-block">
            <h3>
              <span className="aww-num">2</span> 페이지와 블록 쓰기
            </h3>
            <p>왼쪽 메뉴의 새 페이지 버튼(✏️)으로 페이지를 만들고, 글을 쓰다가 아래 단축키를 쓰면 블록이 바로 바뀝니다. 블록은 끌어서 순서를 옮길 수 있습니다.</p>
            <div className="aww-shortcuts">
              {SHORTCUTS.map(([key, desc]) => (
                <div key={key} className="aww-shortcut">
                  <code>{key}</code>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="aww-detail-block">
            <h3>
              <span className="aww-num">3</span> 업무 데이터베이스
            </h3>
            <p>
              <code>/</code> 를 누르고 「데이터베이스」를 고르면 표가 생깁니다. 칸(속성)마다 글·숫자·선택·날짜·담당자·수식·관계 등 형식을 정할 수 있고,
              위쪽 보기 이름 옆 + 로 보드·캘린더·타임라인·갤러리·차트 보기를 더하면 같은 데이터를 다른 모양으로 봅니다. 필터·정렬·그룹은 보기마다 따로
              저장됩니다.
            </p>
          </div>
          <div className="aww-detail-block">
            <h3>
              <span className="aww-num">4</span> 찾기·되돌리기·내보내기
            </h3>
            <p>
              왼쪽 위 검색으로 제목과 본문을 함께 찾습니다. 페이지 오른쪽 위 ⋯ 메뉴에서 버전 기록을 열면 예전 내용으로 되돌릴 수 있고, 내보내기로
              Markdown·CSV·HTML 파일을 받을 수 있습니다. 지운 페이지는 휴지통에서 복원합니다.
            </p>
          </div>
        </section>

        {/* ⑤ 팁 */}
        <aside className="aww-banner aww-tip">
          <strong>💡 실전 팁</strong>
          <ul>
            <li>자주 여는 페이지는 ⋯ 메뉴의 「즐겨찾기」에 넣으면 왼쪽 메뉴 맨 위에 모입니다.</li>
            <li>회의록·주간 보고처럼 반복되는 문서는 데이터베이스 템플릿으로 만들어 두면 새 행을 만들 때 같은 틀이 자동으로 들어갑니다.</li>
            <li>설정 › 언어에서 영어 화면으로도 바꿀 수 있습니다.</li>
          </ul>
        </aside>

        {/* ⑥ 주의 */}
        <aside className="aww-banner aww-warn">
          <strong>⚠️ 꼭 알아 두세요</strong>
          <ul>
            <li>첨부 파일은 한 개당 4MB까지 올릴 수 있습니다.</li>
            <li>휴지통에 버린 페이지와 AI 대화 기록은 30일 뒤 자동으로 지워집니다. 직접 쓴 문서와 데이터베이스는 지워지지 않습니다.</li>
            <li>다른 회원 초대·공유, AI 글쓰기·에이전트는 다음 업데이트에서 차례로 열립니다(지금 누르면 「준비 중」으로 안내됩니다).</li>
          </ul>
        </aside>

        {/* ⑦ 바로가기 */}
        <div className="aww-guide-actions">
          <a className="aww-btn primary" href="/">
            워크스페이스 열기
          </a>
          <a className="aww-btn" href={`${MAIN_SITE}/programs/ai-work-workspace`}>
            프로그램 소개 보기
          </a>
        </div>
      </div>
    </main>
  );
}
