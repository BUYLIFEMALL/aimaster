import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ALL_TESTS } from "@/lib/tests/registry";

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
      <div className="page-heading">
        <p className="eyebrow">사용 설명서</p>
        <h1>연동 & 사용 매뉴얼</h1>
        <p>검사는 키 없이 바로 할 수 있고, AI 심층 분석과 종합 프로필에만 본인 Gemini 키가 필요합니다.</p>
      </div>
      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#quick">① 5분 시작하기</a>
          <a href="#tests">② 검사 종류</a>
          <a href="#key">③ AI 키 등록</a>
          <a href="#notes">④ 읽는 법·주의</a>
          <a href="#faq">⑤ 막힐 때(FAQ)</a>
        </nav>

        <section id="quick" className="card">
          <h2>① 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="검사 고르기">[검사하기]에서 궁금한 검사를 고릅니다. 16유형 상황별 검사는 같은 기준을 상황마다 다르게 읽어 볼 수 있어요.</Step>
            <Step n={2} title="한 문항씩 답하기">5단계 중 가장 가까운 답을 누르면 다음 문항으로 넘어갑니다. 키보드 1~5, ←도 쓸 수 있어요.</Step>
            <Step n={3} title="결과 확인">결과·강점·주의할 점·활용 팁이 바로 나옵니다. 결과는 [내 결과]에 자동 보관됩니다.</Step>
            <Step n={4} title="AI 심층 분석 · 종합 프로필">결과 화면에서 [AI 심층 분석 받기]를, 검사를 2종 이상 마치면 [종합 프로필]에서 묶어 해석을 받을 수 있습니다.</Step>
          </ol>
        </section>

        <section id="tests" className="card">
          <h2>② 검사 종류 ({ALL_TESTS.length}종)</h2>
          <div className="gd-table">
            {ALL_TESTS.map((t) => <div key={t.id}><b>{t.title}</b><span>{t.questions.length}문항 · {t.tagline}</span></div>)}
          </div>
        </section>

        <section id="key" className="card">
          <h2>③ Gemini API 키 등록 (AI 분석용, 최초 1회)</h2>
          <p className="gd-lead">AI 심층 분석과 종합 프로필은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 운영자나 다른 회원의 키로 대신 처리되지 않습니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code> 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록] → [연결 확인]을 누릅니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-warn">⚠️ AI 분석은 누를 때마다 본인 Gemini 키 사용량으로 계산됩니다. 검사와 기본 해석은 AI를 쓰지 않습니다.</p>
        </section>

        <section id="notes" className="card">
          <h2>④ 결과 읽는 법과 주의</h2>
          <ul className="gd-list">
            <li>이 검사들은 <b>재미와 자기 이해를 위한 참고용</b>이며 의학적·심리학적 진단이 아닙니다. 공식 검사(MBTI 등)와 문항·결과가 다를 수 있습니다.</li>
            <li>점수의 높고 낮음은 좋고 나쁨이 아니라 성향의 차이입니다. 상황·기분·시기에 따라 결과가 달라질 수 있어요.</li>
            <li>축 점수가 50% 가까이면 두 성향이 비슷한 &quot;경계&quot;입니다. 두 설명을 모두 읽어 보세요.</li>
            <li>검사마다 기준이 다르므로 서로의 점수를 직접 비교하지 말고 공통 주제를 찾아보세요(종합 프로필).</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑤ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“Gemini API 키가 등록되지 않았습니다”라고 나와요.</summary><p>③의 순서대로 본인 키를 등록하세요. 검사와 기본 해석은 키 없이도 됩니다.</p></details>
            <details><summary>“AI가 올바른 형식으로 응답하지 못했습니다”라고 나와요.</summary><p>같은 버튼을 한 번 더 누르세요.</p></details>
            <details><summary>마음 상태 점검 결과는 왜 저장되지 않나요?</summary><p>민감한 내용이라 기본적으로 저장하지 않고 화면에서만 보여 드립니다. 비교해 보고 싶을 때만 [내 기록에 저장]을 누르세요. 저장해도 AI 분석과 종합 프로필에는 쓰이지 않습니다. 이 점검은 진단이 아니며, 많이 힘들다면 결과 화면의 상담 창구(109·1577-0199·1388)를 이용해 주세요.</p></details>
            <details><summary>같은 검사를 다시 하면 이전 결과와 비교되나요?</summary><p>저장된 이전 결과가 있으면 결과 화면에 &quot;지난 결과와 비교&quot;가 나타납니다. 종합 프로필에도 검사별 직전 결과가 함께 반영되어 달라진 점을 알려 줍니다.</p></details>
            <details><summary>결과를 지우면 복구되나요?</summary><p>삭제한 결과는 복구할 수 없습니다. 결과는 본인만 볼 수 있으며 최대 100개까지 보관됩니다.</p></details>
            <details><summary>같은 검사를 다시 하면 어떻게 되나요?</summary><p>새 결과로 따로 저장됩니다. 종합 프로필에는 검사별 가장 최근 결과가 쓰입니다.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
