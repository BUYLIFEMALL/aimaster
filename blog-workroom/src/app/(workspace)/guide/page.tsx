import Link from "next/link";
import {
  Sparkles,
  KeyRound,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Search,
  FileText,
  Image as ImageIcon,
  Layers,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  PenTool,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIPELINE_STEPS = [
  { step: "01", icon: PenTool, title: "내 스타일 분석", desc: "RSS·글 표본 어조 분석" },
  { step: "02", icon: Search, title: "키워드 탐색", desc: "골드키워드 발굴 & 보관" },
  { step: "03", icon: TrendingUp, title: "트렌드 관측", desc: "뉴스·데이터랩 급상승" },
  { step: "04", icon: BarChart3, title: "블로그 벤치마킹", desc: "상위 블로그 패턴 분석" },
  { step: "05", icon: Layers, title: "글 작성 준비", desc: "사실·출처 사전지식 승인" },
  { step: "06", icon: FileText, title: "구간별 작성", desc: "소제목별 초안 자동 생성" },
  { step: "07", icon: ShieldCheck, title: "6영역 최종검수", desc: "검색로직·문체 최종 검증" },
  { step: "08", icon: ImageIcon, title: "AI 이미지 제작", desc: "대표+본문 노드 이미지" },
];

const DETAILED_GUIDES = [
  {
    num: "1",
    title: "내 블로그 스타일 분석",
    icon: PenTool,
    tag: "문체 동기화",
    bullets: [
      "네이버 블로그 주소(URL) 또는 블로그 ID를 입력하고 **최신 글 5~30개**를 한 번에 수집합니다.",
      "블로그 주소가 없더라도 내가 직접 쓴 **글 표본(40자 이상)**을 붙여넣어 즉시 분석할 수 있습니다.",
      "AI가 어조, 문장 구조, 종결 어미, 독자 호칭, 자주 쓰는 어휘를 정밀 분석하여 **작업실 전용 스타일 프로필**로 저장합니다.",
      "블로그 메인 카테고리(최대 3개)와 세부 주제(최대 5개)를 지정하면 이후 키워드 탐색 및 벤치마킹에 자동으로 연동됩니다.",
    ],
    tip: "💡 승인된 스타일 프로필은 글 작성 및 최종 검수 시 내 문체를 100% 재현하는 기준점이 됩니다.",
  },
  {
    num: "2",
    title: "골드키워드 탐색 & 보관",
    icon: Search,
    tag: "상위 노출 발굴",
    bullets: [
      "AI가 내 블로그 주제에 딱 맞는 고효율 검색어 후보를 추천하고, **네이버 검색광고 API**를 통해 실시간 월간 검색량과 누적 문서수를 대조합니다.",
      "**골드 등급 (문서수 ÷ 월간검색량 < 10, 검색량 1,000 이상)**의 블루오션 키워드를 자동으로 판정하여 우선 추천합니다.",
      "마음에 드는 키워드는 체크박스로 선택하여 **[보관함]**에 담아두고 필요할 때마다 글감으로 활용할 수 있습니다.",
      "**[직접 키워드 분석]** 탭을 이용하면 내가 평소 관심 있던 임의의 단어도 실시간 경쟁도를 즉시 측정할 수 있습니다.",
    ],
    tip: "💡 등급 체계: 골드(<10, 검색량 1천↑) · 실버(<30) · 일반(<150) · 경쟁(150↑)으로 직관적 판정.",
  },
  {
    num: "3",
    title: "실시간 트렌드 관측",
    icon: TrendingUp,
    tag: "급상승 이슈",
    bullets: [
      "관심 주제를 지정하면 네이버 뉴스 10건과 웹문서 10건을 수집하여 핵심 내용을 요약하고 **새롭게 떠오르는 신조어·용어**를 추출합니다.",
      "추출된 용어마다 **네이버 데이터랩 14일 검색 추이**를 추적하여 급상승(최근 3일 평균이 직전 7일보다 50% 이상) 여부를 판정합니다.",
      "단계별 데이터가 회원 계정 DB에 안전하게 자동 저장되므로 작업 중 창을 닫아도 **[저장 지점부터 계속]**으로 이어갈 수 있습니다.",
    ],
    tip: "💡 급상승 판정을 받은 키워드는 대중의 실시간 관심도가 폭발하는 시점이므로 빠른 포스팅 시 유입 효과가 큽니다.",
  },
  {
    num: "4",
    title: "경쟁 블로그 벤치마킹",
    icon: BarChart3,
    tag: "상위 패턴 분석",
    bullets: [
      "특정 주제의 네이버 상위 블로그 50건을 검색하여 **인기 블로거들의 제목 패턴과 콘텐츠 구성 방식**을 입체적으로 분석합니다.",
      "경쟁 블로그들이 자주 다루는 소주제와 유입 키워드를 발굴하여 내 보관함에 즉시 추가할 수 있습니다.",
      "타인의 본문 문장을 복사하거나 표절하는 기능이 아니며, **검증된 인기 주제와 제목 프레임워크만 벤치마킹**합니다.",
    ],
    tip: "💡 벤치마킹에서 찾은 제목 구성 아이디어를 '글 작성 준비' 단계의 소제목 기획에 반영해 보세요.",
  },
  {
    num: "5",
    title: "글 작성 준비 (근거 자료 승인)",
    icon: Layers,
    tag: "할루시네이션 방지",
    bullets: [
      "보관함의 키워드를 선택하고 **[검색어 목록 확보]**를 통해 네이버 자동완성어 및 연관 검색어를 한눈에 점검합니다.",
      "선택한 키워드의 **상위 블로그 글 5개와 공신력 있는 뉴스 기사**를 수집한 뒤 **[AI 사전 지식 정리]**를 실행합니다.",
      "실제 수집 자료에서 확인된 사실·근거 구절만 추출하며, 원문과 25자 이상 연속 일치하는 유사 문장은 자동 배제됩니다.",
      "발췌된 핵심 팩트를 눈으로 확인하고 원치 않는 항목을 제외한 뒤 **[자료 확인·승인]**을 눌러 글 작성으로 넘깁니다.",
    ],
    tip: "💡 사전 승인된 객관적 자료만을 바탕으로 글을 생성하므로 AI 특유의 엉뚱한 거짓 정보(할루시네이션)를 원천 차단합니다.",
  },
  {
    num: "6",
    title: "소제목별 구간 분할 작성",
    icon: FileText,
    tag: "인간미 넘치는 초안",
    bullets: [
      "승인된 자료를 기반으로 글 유형(정보성·후기형·꿀팁형), 분량, 경험 표현 방식을 선택하고 **[글 구성 만들기]**를 누릅니다.",
      "AI가 추천한 매력적인 제목 후보와 논리적인 소제목 목차를 확인 및 수정한 뒤 **[전체 작성 시작]**을 클릭합니다.",
      "단락별로 순차 작성되며 진행 중 **[중지]** 후 언제든 **[이어서 작성]**이 가능합니다.",
      "작성 중 표시되는 **[경험 확인 필요]** 배지는 나의 실제 경험이나 느낌에 맞게 자연스럽게 가필해 주세요.",
    ],
    tip: "💡 한 번에 전체를 찍어내는 방식이 아니라 소제목별로 논리를 전개하므로 완성도와 가독성이 매우 뛰어납니다.",
  },
  {
    num: "7",
    title: "6영역 심층 최종 검수",
    icon: ShieldCheck,
    tag: "서치어드바이저 기준",
    bullets: [
      "초안을 선택하고 **[검수하기]**를 누르면 네이버 서치어드바이저 작성 원칙에 기반한 **6영역 심층 검증**이 진행됩니다:",
      "① 내 블로그 스타일 일치도, ② 네이버 서치어드바이저 권장 원칙, ③ 사실·출처 신뢰도, ④ 경험 표현 자연스러움, ⑤ 외부 자료 유사도(표절 방지), ⑥ 민감·과장·어뷰징 표현.",
      "검수 지적 사항은 **[제안 반영]** 버튼으로 원클릭 수정하거나 본문 에디터에서 직접 퇴고할 수 있습니다.",
      "모든 필수 지적 사항이 해결되면 **[최종본으로 저장]** 후 텍스트 복사, 서식 복사, TXT 다운로드로 블로그에 발행합니다.",
    ],
    tip: "💡 안전한 발행을 위해 필수 수정 항목이 남아있으면 최종 저장이 제한되며, 자동 배포가 아닌 회원 직접 발행을 원칙으로 합니다.",
  },
  {
    num: "8",
    title: "AI 맞춤 이미지 제작",
    icon: ImageIcon,
    tag: "Gemini Imagen 고화질",
    bullets: [
      "완성된 글 본문을 붙여넣고 **[문단 구성하기]**를 누르면 대표 이미지 1장과 본문 5~10장의 최적 이미지 노드가 자동 생성됩니다.",
      "노드마다 표현할 비주얼 장면 묘사와 스타일 프롬프트가 자동 기획되며, 개별 또는 **[전체 제작]**이 가능합니다.",
      "공통 분위기 유지를 위한 참고 이미지를 최대 10장까지 첨부하여 일관된 톤앤매너를 유지할 수 있습니다.",
      "생성된 이미지는 안전한 비공개 전용 스토리지에 보관되며, 클릭 한 번으로 고화질 다운로드할 수 있습니다.",
    ],
    tip: "💡 모든 인물 이미지는 기본 한국인(동아시아인) 실사풍으로 묘사되어 국내 블로그 방문자에게 친근감을 줍니다.",
  },
];

const FAQS = [
  {
    q: "네이버 API 키를 연동하지 않아도 사용할 수 있나요?",
    a: "내 블로그 스타일 분석(/style), 글 작성(/write), 최종 검수(/review), AI 이미지 제작(/images)은 OpenAI 또는 Gemini AI 키만으로 이용 가능합니다. 다만, 키워드 탐색(/keywords)의 검색량·문서수 조회, 트렌드 관측(/trends)의 데이터랩 추이, 블로그 벤치마킹(/benchmark) 등 네이버 데이터를 직접 조회하는 기능은 네이버 검색 및 검색광고 API 키가 반드시 필요합니다.",
  },
  {
    q: "네이버 API 키 발급은 무료인가요?",
    a: "네, 모두 무료입니다! 네이버 검색 API(Developers)는 하루 25,000건까지 무료로 제공되며, 네이버 검색광고 API(Searchad) 역시 계정 생성 후 API 라이선스 발급 비용 없이 무과금으로 검색량 및 연관 키워드 조회가 가능합니다.",
  },
  {
    q: "AI가 작성한 글인데 네이버 저품질에 걸리지 않나요?",
    a: "단순히 ChatGPT에 '블로그 글 써줘'라고 프롬프트를 넣는 방식과 완전히 다릅니다. 'AI 블로그 작업실'은 1) 내 실제 블로그 문체를 학습하고, 2) 실시간 상위 글과 공신력 있는 뉴스의 사실 근거만 추출하며, 3) 25자 이상 동일 문장을 원천 차단하고, 4) 네이버 서치어드바이저 권장 원칙에 맞춰 6영역 심층 검수를 통과한 글만 발행하도록 유도하므로 저품질 위험 없이 건강한 상위 노출을 돕습니다.",
  },
  {
    q: "완성된 글을 네이버 블로그에 자동으로 포스팅해주나요?",
    a: "아닙니다. 외부 비공식 프로그램을 통한 자동 발행은 네이버 알고리즘에 의해 자동화 어뷰징(저품질 블로그)으로 탐지될 위험이 매우 높습니다. 따라서 본 프로그램은 [서식 복사] 또는 [텍스트 복사] 버튼을 통해 네이버 공식 스마트에디터 ONE에 직접 붙여넣어 안전하게 검수 후 발행하도록 설계되었습니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="stack" style={{ gap: 28 }}>
      {/* 1. 포커스 스튜디오 히어로 헤더 */}
      <div className="guide-hero">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="guide-pill">
            <Sparkles size={13} />
            포커스 스튜디오 스타일 (Focus Studio)
          </span>
          <span className="guide-pill" style={{ background: "rgba(3, 199, 90, 0.25)", borderColor: "rgba(3, 199, 90, 0.4)" }}>
            네이버 서치어드바이저 최적화
          </span>
        </div>
        <h1>📖 AI 블로그 작업실 연동 & 사용 가이드북</h1>
        <p>
          내 블로그 고유 문체 복제부터 골드키워드 발굴, 실시간 트렌드 분석, 사실 기반 구간별 글 작성,
          6영역 심층 검수, AI 이미지 생성까지 원스톱으로 지원하는 전문가용 블로그 집필 스튜디오입니다.
        </p>
      </div>

      {/* 2. 8단계 올인원 파이프라인 인포그래픽 */}
      <section className="card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚀</span>
            <h2 style={{ margin: 0, fontSize: 16 }}>8단계 올인원 블로그 집필 파이프라인</h2>
          </div>
          <span className="badge brand">Step-by-Step Flow</span>
        </div>
        <div className="guide-pipeline-track">
          {PIPELINE_STEPS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.step} className="guide-pipeline-step">
                <span className="pipeline-step-badge">STEP {p.step}</span>
                <div className="pipeline-step-icon">
                  <Icon size={18} />
                </div>
                <div className="pipeline-step-title">{p.title}</div>
                <div className="pipeline-step-desc">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 시작 전 필수: 네이버 & AI API 연동 가이드 */}
      <section className="card" style={{ borderLeft: "4px solid var(--brand)", padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>시작 전 필수: 본인 API 키 & 네이버 플랫폼 연동</h2>
              <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                모든 키는 회원 본인 브라우저 세션 및 전용 암호화 저장소에 안전하게 연동되며, 타인과 공유되지 않습니다.
              </p>
            </div>
          </div>
          <Link href="/settings" className="button primary" style={{ textDecoration: "none" }}>
            <KeyRound size={14} />
            API 키 등록·플랫폼 연동 바로가기
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 10, background: "#f8fafc", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="badge brand">AI 엔진</span>
              <strong style={{ fontSize: 13 }}>OpenAI 또는 Gemini 키</strong>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.55 }}>
              글 기획·분석·구간 작성·검수에는 OpenAI(GPT-4o mini) 또는 Gemini(3.5 Flash) 키가 필요합니다.
              이미지 제작은 Gemini(Imagen) 키를 지원합니다.
            </p>
          </div>

          <div style={{ padding: 14, borderRadius: 10, background: "var(--naver-green-soft)", border: "1px solid var(--naver-green-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="badge naver">네이버 검색</span>
              <strong style={{ fontSize: 13, color: "#065f46" }}>네이버 Developers API (무료)</strong>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#065f46", lineHeight: 1.55 }}>
              네이버 개발자 센터에서 Client ID와 Secret을 무료 발급받아 등록하면 하루 25,000건의 블로그·뉴스 실시간 수집이 가능합니다.
            </p>
          </div>

          <div style={{ padding: 14, borderRadius: 10, background: "var(--amber-gold-soft)", border: "1px solid var(--amber-gold-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="badge 골드">네이버 검색광고</span>
              <strong style={{ fontSize: 13, color: "#92400e" }}>Searchad API (무료)</strong>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.55 }}>
              네이버 검색광고 도구 관리자에서 API 라이선스를 발급받아 등록하면 키워드별 월간 PC/모바일 검색량과 경쟁도를 무과금으로 분석합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 4. 8대 작업 흐름 심층 비주얼 가이드 */}
      <div>
        <div className="guide-section-title">
          <span>📚</span>
          <span>8대 단계별 핵심 사용법 및 실전 꿀팁</span>
        </div>

        <div className="guide-grid">
          {DETAILED_GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.num} className="guide-detail-card">
                <div className="guide-card-header">
                  <div className="guide-card-title">
                    <span className="step-number" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-dark))", color: "#fff", borderColor: "var(--brand)" }}>
                      {g.num}
                    </span>
                    <span>{g.title}</span>
                  </div>
                  <span className="badge brand">{g.tag}</span>
                </div>

                <ul className="guide-card-bullets">
                  {g.bullets.map((b, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                  ))}
                </ul>

                <div className="guide-tip-banner">{g.tip}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 골드키워드 판정 공식 & 등급 치트시트 */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <h2 style={{ margin: 0, fontSize: 16 }}>골드키워드 판정 공식 및 등급 기준표</h2>
        </div>
        <p style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
          네이버 검색광고의 <strong>월간 총 검색량</strong> 대비 네이버 검색 API의 <strong>누적 블로그 문서수</strong> 비율을 계산하여
          상위 노출 난이도와 검색 효율성을 4등급으로 자동 판정합니다:
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>등급</th>
                <th>문서수 ÷ 검색량 비율</th>
                <th>월간 검색량 기준</th>
                <th>특징 및 공략 가이드</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge 골드">골드 (GOLD)</span></td>
                <td><strong>10 미만</strong></td>
                <td>1,000회 이상</td>
                <td>문서 수는 적고 찾는 사람은 많은 최상의 황금 키워드. 신생 블로그도 1페이지 진입 유력.</td>
              </tr>
              <tr>
                <td><span className="badge 실버">실버 (SILVER)</span></td>
                <td><strong>30 미만</strong></td>
                <td>500회 이상</td>
                <td>경쟁도가 낮아 양질의 본문 작성 시 꾸준한 유입이 보장되는 우수 키워드.</td>
              </tr>
              <tr>
                <td><span className="badge 권장">일반 (NORMAL)</span></td>
                <td><strong>150 미만</strong></td>
                <td>100회 이상</td>
                <td>표준적인 일상 검색어로 서브 키워드나 연관 검색어로 함께 묶어 작성하기 적합.</td>
              </tr>
              <tr>
                <td><span className="badge 경쟁">경쟁 (COMPETITIVE)</span></td>
                <td><strong>150 이상</strong></td>
                <td>제한 없음</td>
                <td>문서량이 너무 많아 지수가 매우 높은 최상위 블로그 외에는 노출이 어려운 과열 키워드.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. 자주 묻는 질문 (FAQ) 아코디언 */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <HelpCircle size={18} style={{ color: "var(--brand)" }} />
          <h2 style={{ margin: 0, fontSize: 16 }}>자주 묻는 질문 (FAQ)</h2>
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {FAQS.map((f, i) => (
            <details key={i} className="faq-card" open={i === 0}>
              <summary>
                <span>Q. {f.q}</span>
                <span className="badge brand" style={{ fontSize: 10 }}>펼치기 / 접기</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 7. 주의사항 및 면책 공지 */}
      <div className="notice warning" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2, color: "#d97706" }} />
        <div>
          <strong>안내 및 주의사항</strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.55 }}>
            본 프로그램은 검색 순위, 방문자 수, 광고 수익을 인위적으로 보장하지 않습니다.
            AI 분석 및 생성 결과는 통계적 추정이므로 사실 관계, 출처 신뢰성, 권리 침해 여부는 실제 발행 전에 블로거 본인이 직접 확인해야 합니다.
            모든 작업 내역은 안전하게 회원 본인 계정 DB에만 저장되며 외부나 타 회원에게 공개되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
