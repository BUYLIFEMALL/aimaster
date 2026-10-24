import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL, NAVER_ADS_GUIDE_URL, NAVER_SEARCH_GUIDE_URL } from "@/lib/guides";
import { FEATURE_INFO } from "@/lib/kw/types";
import { KeyRound, ExternalLink, UserPlus, Search, Sparkles, TrendingUp, BarChart3, ShieldCheck, CheckCircle2 } from "lucide-react";

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
    <div className="luxury-guide">
      {/* 헤더 */}
      <div className="page-heading">
        <p className="eyebrow">SMART MATRIX KEYWORD STUDIO MASTER GUIDE</p>
        <h1>📖 연동 & 사용 매뉴얼</h1>
        <p>단 하나의 키워드로 검색 트렌드·경쟁 강도·상위 노출 공략법·글 제목까지 완성하는 AI 키워드 비서 공식 매뉴얼입니다.</p>
      </div>

      {/* 1. 럭셔리 히어로 배너 */}
      <section className="luxury-hero">
        <div className="luxury-mascot-box">🔍</div>
        <div className="luxury-hero-text">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 9px", borderRadius: "999px", background: "rgba(37,99,235,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.4)" }}>
              PRO v1.09 Matrix Guide
            </span>
            <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 9px", borderRadius: "999px", background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
              ⚡ 네이버 실측 데이터 연동
            </span>
          </div>
          <h2>스마트 매트릭스 키워드 아틀리에에 오신 것을 환영합니다!</h2>
          <p>
            사람들이 실제로 검색하는 실시간 연관검색어, 상위 블로그 틈새(콘텐츠 갭), 네이버 검색광고 실측 월간 검색수,
            그리고 AI가 직접 제안하는 클릭률 높은 글 제목과 공략법을 한 번에 확인하실 수 있습니다.
          </p>
        </div>
      </section>

      {/* 2. 3단계 스마트 파이프라인 */}
      <section className="card">
        <h2>🧭 3단계 키워드 공략 파이프라인</h2>
        <div className="luxury-flow">
          <div className="luxury-flow-card">
            <em>STEP 01</em>
            <b>🔑</b>
            <strong>API 키 등록</strong>
            <small>Gemini 필수 · 네이버 검색/광고 선택 연동 (약 3분)</small>
          </div>
          <div className="luxury-flow-card">
            <em>STEP 02</em>
            <b>⚡</b>
            <strong>키워드 탐색 & 분석</strong>
            <small>자동완성 ➔ 실측 검색수 ➔ 경쟁력 판정 (10~30초)</small>
          </div>
          <div className="luxury-flow-card">
            <em>STEP 03</em>
            <b>📝</b>
            <strong>제목 복사 & 글 작성</strong>
            <small>콘텐츠 갭 공략 소제목 복사 ➔ Markdown / CSV 내보내기</small>
          </div>
        </div>
      </section>

      {/* 3. 3D 목차 그리드 */}
      <nav className="card" aria-label="목차">
        <h2>🧭 퀵 가이드 목차</h2>
        <div className="luxury-toc">
          <a href="#key" className="luxury-toc-chip">🔑 ① API 키 등록 & 가입</a>
          <a href="#quick" className="luxury-toc-chip">⚡ ② 5분 시작하기</a>
          <a href="#features" className="luxury-toc-chip">💎 ③ 핵심 분석 도구</a>
          <a href="#numbers" className="luxury-toc-chip">📊 ④ 지표 및 숫자 읽는 법</a>
          <a href="#tips" className="luxury-toc-chip">💡 ⑤ 고수들의 실전 활용 팁</a>
          <a href="#faq" className="luxury-toc-chip">❓ ⑥ 자주 묻는 질문 (FAQ)</a>
        </div>
      </nav>

      {/* 4. API 키 등록 (플랫폼별 2단 퀵 액션 버튼 세트) */}
      <section id="key" className="card">
        <h2>🔑 ① API 키 등록 및 공식 플랫폼 가입 (최초 1회)</h2>
        <p className="gd-lead">
          모든 정밀 분석과 네이버 조사는 <b>회원님 본인의 키</b>로 안전하게 호출됩니다. 필요한 플랫폼의 버튼을 눌러 바로 키를 생성하세요.
        </p>

        <div className="stack" style={{ gap: "16px", marginTop: "16px" }}>
          {/* 1. Google Gemini */}
          <div style={{ padding: "14px", borderRadius: "12px", background: "var(--mx-raised)", border: "1px solid var(--mx-border)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>
              1. Google Gemini API 키 (필수)
            </h3>
            <p className="muted" style={{ fontSize: "12.5px", marginBottom: "10px" }}>
              AI 심층 분석, 콘텐츠 갭 분석, 글 제목 및 썸네일 문구 생성에 쓰입니다.
            </p>
            <div className="platform-link-group">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-key"
              >
                <KeyRound size={14} />
                <span>Google AI Studio API 키 발급/생성하기</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-platform-signup"
              >
                <UserPlus size={14} />
                <span>Google AI Studio 회원가입 / 시작</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
            </div>
          </div>

          {/* 2. 네이버 개발자센터 */}
          <div style={{ padding: "14px", borderRadius: "12px", background: "var(--mx-raised)", border: "1px solid var(--mx-border)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>
              2. 네이버 검색 API (상위 블로그·뉴스·트렌드용)
            </h3>
            <p className="muted" style={{ fontSize: "12.5px", marginBottom: "10px" }}>
              실제 상위 노출 블로그 분석, 실시간 뉴스 수집, 데이터랩 검색 추이 조회에 사용됩니다. (무료)
            </p>
            <div className="platform-link-group">
              <a
                href="https://developers.naver.com/apps/#/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-key"
              >
                <KeyRound size={14} />
                <span>네이버 개발자센터 API 등록/신청하기</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
              <a
                href="https://developers.naver.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-platform-signup"
              >
                <UserPlus size={14} />
                <span>네이버 개발자센터 바로가기</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
            </div>
          </div>

          {/* 3. 네이버 검색광고 */}
          <div style={{ padding: "14px", borderRadius: "12px", background: "var(--mx-raised)", border: "1px solid var(--mx-border)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>
              3. 네이버 검색광고 API (선택 · 실측 월간 검색수)
            </h3>
            <p className="muted" style={{ fontSize: "12.5px", marginBottom: "10px" }}>
              네이버의 실제 PC/모바일 월간 검색수와 광고 경쟁 지표를 정확하게 확인할 수 있습니다.
            </p>
            <div className="platform-link-group">
              <a
                href="https://searchad.naver.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-key"
              >
                <KeyRound size={14} />
                <span>네이버 검색광고 API 라이선스 발급</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
              <a
                href="https://searchad.naver.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-platform-signup"
              >
                <UserPlus size={14} />
                <span>네이버 검색광고 로그인 / 가입</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
            </div>
          </div>
        </div>

        <div className="actions" style={{ marginTop: 16 }}>
          {GEMINI_GUIDE_URL && <GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (팝업)" />}
          {NAVER_SEARCH_GUIDE_URL && <GuideLinkButton url={NAVER_SEARCH_GUIDE_URL} label="네이버 검색 API 상세 매뉴얼 (팝업)" />}
          {NAVER_ADS_GUIDE_URL && <GuideLinkButton url={NAVER_ADS_GUIDE_URL} label="검색광고 API 상세 매뉴얼 (팝업)" />}
        </div>
      </section>

      {/* 5. 5분 시작하기 */}
      <section id="quick" className="card">
        <h2>⚡ ② 5분 시작하기</h2>
        <ol className="gd-steps">
          <Step n={1} title="분석할 키워드를 입력합니다">
            대시보드 상단 입력창에 메인 주제나 관심 키워드(예: <code>제주도 여행</code>, <code>소이캔들</code>)를 입력합니다.
          </Step>
          <Step n={2} title="원하는 분석 모드를 선택합니다">
            처음에는 <b>[자동완성 키워드]</b>로 사람들이 자주 검색하는 확장어를 확인하고, 마음에 드는 단어를 클릭하여 <b>[키워드 경쟁력]</b>으로 깊이 분석하세요.
          </Step>
          <Step n={3} title="콘텐츠 갭과 기회 점수를 확인합니다">
            경쟁 난이도는 낮고 검색 관심도가 높은 <b>기회 점수 70점 이상의 골드/실버 키워드</b>를 선별합니다.
          </Step>
          <Step n={4} title="글 제목을 복사하고 활용합니다">
            AI가 제안하는 고효율 제목 중 마음에 드는 문구를 <code>[제목 복사]</code>하여 블로그 작성에 바로 적용합니다.
          </Step>
        </ol>
      </section>

      {/* 6. 핵심 분석 도구 설명 */}
      <section id="features" className="card">
        <h2>💎 ③ 핵심 분석 도구 소개</h2>
        <div className="luxury-tool-grid">
          {FEATURE_INFO.map((f) => (
            <div key={f.id} className="luxury-tool-card">
              <div className="luxury-tool-card-head">
                <h3>{f.title}</h3>
                <span className="luxury-tool-badge">
                  {f.needsNaver ? "네이버 연동" : "AI 즉시분석"}
                </span>
              </div>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. 지표 및 숫자 읽는 법 */}
      <section id="numbers" className="card">
        <h2>📊 ④ 지표 및 숫자 읽는 법</h2>
        <div className="gd-table">
          <div>
            <b>AI 기회 점수</b>
            <span>검색 수요와 상위 글의 포화도를 AI가 종합 분석한 0~100점 지표입니다. 70점 이상이면 초보 블로거도 노려볼 만한 블루오션입니다.</span>
          </div>
          <div>
            <b>실측 월간 검색수</b>
            <span>네이버 검색광고 API 연동 시 제공되는 실제 지난 30일간의 PC 및 모바일 사용자 쿼리 수치입니다.</span>
          </div>
          <div>
            <b>콘텐츠 갭</b>
            <span>현재 상위 1~10위 노출 블로그들이 본문에서 다루지 않고 빠뜨린 핵심 질문이나 서브 주제입니다. 이 내용을 넣으면 가산점을 받습니다.</span>
          </div>
          <div>
            <b>데이터랩 검색 추이</b>
            <span>네이버 데이터랩 기반 14일/30일 상대 검색 관심도 지표로, 최근 급상승 중인지 하락세인지 추세를 확인합니다.</span>
          </div>
        </div>
      </section>

      {/* 8. 활용 팁 */}
      <section id="tips" className="card">
        <h2>💡 ⑤ 고수들의 실전 활용 팁</h2>
        <ul className="gd-list" style={{ lineHeight: 1.75 }}>
          <li><b>롱테일 공략:</b> 검색량이 수만 건인 단일 대형 키워드보다, 월 1,000~3,000건 수준의 3~4단어 조합 롱테일 키워드로 1페이지를 먼저 점령하세요.</li>
          <li><b>콘텐츠 갭 소제목 활용:</b> 분석 결과에 나타난 <code>콘텐츠 갭</code>을 본문의 H3/H4 소제목으로 배치하면 검색 알고리즘에서 전문성 높은 글로 인식됩니다.</li>
          <li><b>결과 연속 탐색:</b> 결과 화면 속 추천 키워드를 클릭하면 페이지 이동 없이 그 자리에서 바로 심층 분석이 재실행됩니다.</li>
        </ul>
      </section>

      {/* 9. 자주 묻는 질문 */}
      <section id="faq" className="card">
        <h2>❓ ⑥ 자주 묻는 질문 (FAQ)</h2>
        <div className="luxury-accordion">
          <details open>
            <summary>API 키 없이도 쓸 수 있나요?</summary>
            <p>
              단순 자동완성 목록 조회는 별도 키 없이도 무료로 확인하실 수 있습니다. 다만 심층 경쟁력 평가, 콘텐츠 갭 분석, 글 제목 AI 추천을 위해서는 본인 Gemini API 키 등록이 필요합니다.
            </p>
          </details>

          <details>
            <summary>네이버 검색 API와 검색광고 API는 꼭 둘 다 등록해야 하나요?</summary>
            <p>
              아닙니다! Gemini 키만 있어도 AI 추정치 기반의 모든 핵심 분석이 가능합니다. 실제 정확한 월간 검색수를 조회하고 싶으실 때 검색광고 API를 추가 등록하시면 됩니다.
            </p>
          </details>

          <details>
            <summary>분석 결과는 어디에 저장되나요?</summary>
            <p>
              분석 버튼을 누르면 모든 결과가 좌측 사이드바 <b>[분석 기록]</b>에 자동으로 안전하게 저장되며, 언제든 다시 열람하거나 CSV / Markdown 파일로 내보낼 수 있습니다.
            </p>
          </details>

          <details>
            <summary>“호출 한도를 초과했습니다”라고 나와요.</summary>
            <p>
              네이버 개발자센터 API는 계정당 일일 25,000회 무료 호출 한도가 있습니다. 자정이 지나면 리셋되므로 안심하시고 다음 날 이용하실 수 있습니다.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
