import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL, NAVER_ADS_GUIDE_URL, NAVER_SEARCH_GUIDE_URL } from "@/lib/guides";
import { FEATURE_INFO } from "@/lib/kw/types";
import { PageHero } from "@/components/ui/PageHero";

const PIPELINE = [
  { ic: "🔑", title: "본인 키 등록", desc: "Gemini 필수, 네이버 검색·검색광고는 기능에 따라", time: "약 3분" },
  { ic: "🧭", title: "분석 종류 고르기", desc: "자동완성 → 경쟁력 순서로 시작하면 쉬워요", time: "10초" },
  { ic: "⚡", title: "키워드 입력 · 분석", desc: "결과 안 키워드를 눌러 이어서 분석", time: "10~60초" },
  { ic: "📝", title: "제목·공략법 활용", desc: "제목 복사, Markdown·CSV로 내보내기", time: "바로" },
];

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="gd-step">
      <span className="gd-num">{n}</span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <>
      <PageHero
        badge="📖 사용 설명서"
        title="연동 & 사용 매뉴얼"
        description="키워드 하나로 검색 환경을 분석하고, 바로 쓸 글 제목·썸네일 문구·공략법까지 받는 도구입니다. ①~②만 따라 해도 충분합니다."
      >
        <a className="button primary" href="/dashboard">🔍 바로 분석하러 가기</a>
      </PageHero>
      <div className="gd">
        <div className="gd-bubble">
          <span className="gd-avatar" aria-hidden="true">🤖</span>
          <div className="card">
            안녕하세요, 키워드 비서예요! 사람들이 <b>실제로 검색하는 말</b>을 찾아 드리고, 그 키워드가 <b>해볼 만한지(경쟁력)</b>, 오늘
            어떤 이슈가 뜨는지까지 한 화면에서 이어서 보여 드려요. 아래 4단계만 기억하세요.
          </div>
        </div>
        <section className="card" aria-label="사용 흐름">
          <ol className="gd-pipeline">
            {PIPELINE.map((p, i) => (
              <li key={p.title}>
                <span className="gd-top"><span className="gd-num">{i + 1}</span><span className="gd-time">⏱ {p.time}</span></span>
                <span className="gd-ic" aria-hidden="true">{p.ic}</span>
                <strong>{p.title}</strong>
                <small className="muted">{p.desc}</small>
              </li>
            ))}
          </ol>
        </section>
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#features">③ 기능 설명</a>
          <a href="#numbers">④ 숫자 읽는 법</a>
          <a href="#tips">⑤ 활용 요령</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">모든 분석은 <b>회원님 본인의 키</b>로 동작합니다. 필수는 Gemini 키 하나이고, 네이버 키는 해당 기능을 쓸 때만 필요합니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="Google Gemini 키 (필수)"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 [Create API key]를 눌러 <code>AIza…</code> 키를 복사해 등록합니다.</Step>
            <Step n={2} title="네이버 검색 API 키 (상위 블로그·뉴스·트렌드)">네이버클라우드 NAVER API HUB에서 검색·데이터랩 API를 신청하면 Client ID/Secret이 발급됩니다. 무료이며 계정당 일일 한도가 있습니다.</Step>
            <Step n={3} title="네이버 검색광고 키 (선택)">등록하면 실제 월간 검색수와 광고 경쟁도가 표시됩니다.</Step>
            <Step n={4} title="[연결 확인]">등록 후 [연결 확인]을 눌러 키가 동작하는지 바로 확인합니다.</Step>
          </ol>
          <div className="actions" style={{ marginTop: 14 }}>
            {GEMINI_GUIDE_URL && <GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 매뉴얼 (팝업)" />}
            {NAVER_SEARCH_GUIDE_URL && <GuideLinkButton url={NAVER_SEARCH_GUIDE_URL} label="네이버 검색 API 키 발급 매뉴얼 (팝업)" />}
            {NAVER_ADS_GUIDE_URL && <GuideLinkButton url={NAVER_ADS_GUIDE_URL} label="검색광고 API 키 발급 매뉴얼 (팝업)" />}
          </div>
          <p className="gd-warn">⚠️ 분석 1회는 본인 Gemini 키 사용량 1~2회로 계산됩니다. 구글 검색 조사 기능(연관검색어·경쟁력·오늘의 전략 키워드·프롬프트 실행)은 Google 계정의 검색 그라운딩 한도·요금 정책을 따릅니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="분석 종류를 고릅니다">처음에는 [자동완성 키워드]로 어떤 말이 많이 검색되는지 보고, 마음에 드는 키워드를 눌러 [키워드 경쟁력]으로 이어가세요.</Step>
            <Step n={2} title="키워드를 입력하고 [분석하기]">10~60초 안에 결과가 나타나며, 자동으로 [분석 기록]에 저장됩니다.</Step>
            <Step n={3} title="결과에서 바로 이어갑니다">결과 안의 키워드를 누르면 같은 화면에서 다시 분석합니다. 마음에 드는 제목은 [제목 복사]로 가져가세요.</Step>
            <Step n={4} title="내보내기">[Markdown]·[CSV]로 저장하거나 [결과 복사]로 전체를 붙여 넣을 수 있습니다.</Step>
          </ol>
        </section>

        <section id="features" className="card">
          <h2>③ 기능 설명</h2>
          <div className="gd-cards">
            {FEATURE_INFO.map((f) => (
              <article key={f.id}>
                <h3>{f.title}</h3>
                <p>{f.desc}{f.needsNaver ? " (네이버 키 필요)" : ""}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="numbers" className="card">
          <h2>④ 숫자 읽는 법</h2>
          <div className="gd-table">
            <div><b>AI 추정</b><span>기회 점수·검색 관심도·경쟁 난이도는 구글 검색 결과를 AI가 요약해 만든 <b>추정치</b>입니다. 서로 비교하는 참고용으로 보세요.</span></div>
            <div><b>실측</b><span>월간 검색수(검색광고 키), 블로그 문서 수·검색 추이(네이버 키)는 네이버가 준 <b>실제 값</b>입니다. 같은 화면에서 AI 추정과 구분해 표시합니다.</span></div>
            <div><b>검색 추이</b><span>데이터랩의 상대 지수(기간 내 최댓값=100)입니다. 절대 검색수가 아니라 오르내림을 보는 용도입니다.</span></div>
            <div><b>▲▼ 변화율</b><span>최근 4주 평균과 그 직전 4주 평균의 차이입니다.</span></div>
          </div>
        </section>

        <section id="tips" className="card">
          <h2>⑤ 활용 요령</h2>
          <ul className="gd-list">
            <li>경쟁력이 높은(기회 점수 70↑) 롱테일 키워드를 먼저 쓰고, 어느 정도 쌓이면 큰 키워드를 노리세요.</li>
            <li>[연관검색어]의 &quot;콘텐츠 갭&quot;은 상위 글이 비워 둔 부분입니다. 그 부분을 소제목으로 넣으면 차별화됩니다.</li>
            <li>[오늘의 전략 키워드]는 날짜가 지난 정보를 제외하고 조사하지만, 정책·제도는 반드시 공식 사이트에서 최종 확인하세요.</li>
            <li>AI가 제안한 글 제목·문구는 초안입니다. 직접 경험·사진을 더해 본인 글로 완성하세요.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“Gemini API 키가 등록되지 않았습니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 자동완성 목록 조회만은 키 없이도 쓸 수 있습니다.</p></details>
            <details><summary>“네이버 인증에 실패했습니다”라고 나와요.</summary><p>Client ID/Secret을 다시 확인하고, 해당 키가 검색·데이터랩 API 사용 신청이 되어 있는지 확인하세요. 새로 만든 키는 반영에 몇 분 걸릴 수 있습니다.</p></details>
            <details><summary>“호출 한도를 초과했습니다”라고 나와요.</summary><p>네이버는 계정당 일일 한도가 있습니다. 다음 날 다시 시도하거나, 같은 키로 많은 프로그램을 동시에 쓰고 있지 않은지 확인하세요.</p></details>
            <details><summary>자동완성 결과가 비어 있어요.</summary><p>자동완성은 네이버·구글의 공개 응답을 쓰며 일시적으로 비어 올 수 있습니다. 잠시 후 다시 시도하거나 다른 검색엔진을 골라 보세요.</p></details>
            <details><summary>AI가 올바른 형식으로 응답하지 못했다고 나와요.</summary><p>같은 버튼을 한 번 더 눌러 주세요. 계속되면 키워드를 더 구체적으로 바꿔 보세요.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
