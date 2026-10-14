import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ACTIONS, FORMATS } from "@/lib/we/types";

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
        <p>주제만 적으면 AI가 초안을 쓰고, 에디터에서 문장을 드래그해 바로 고치거나 글 전체의 제안을 한 번에 적용합니다. ①~②만 따라 해도 충분합니다.</p>
      </div>
      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#editor">③ 에디터 사용법</a>
          <a href="#formats">④ 형식·옵션</a>
          <a href="#tips">⑤ 활용 요령</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">모든 AI 기능은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 운영자나 다른 회원의 키로 대신 처리되지 않습니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code> 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록] → [연결 확인]을 누릅니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-warn">⚠️ 초안 생성·수정·분석은 호출할 때마다 본인 Gemini 키 사용량으로 계산됩니다. 인터넷 검색 옵션은 Google 계정의 검색 그라운딩 한도·요금 정책을 따릅니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="새 글 생성 또는 기존 글 분석">[새 글 생성]에 주제를 적고 형식·톤·분량을 고르거나, [기존 글 분석]에 이미 쓴 글을 붙여 넣습니다.</Step>
            <Step n={2} title="에디터에서 다듬기">초안이 열리면 마음에 안 드는 문장을 드래그해 툴바의 [다시쓰기]·[짧게]·[자세하게] 등을 누릅니다.</Step>
            <Step n={3} title="[글 분석]으로 한 번에 점검">오른쪽에 문법·표현·구조·명확성 제안이 나타납니다. [적용]하거나 [모두 적용]하세요.</Step>
            <Step n={4} title="내보내기">[본문 복사] 또는 .md/.txt로 내려받습니다. 글은 자동 저장되며 [내 문서]에서 이어 쓸 수 있습니다.</Step>
          </ol>
        </section>

        <section id="editor" className="card">
          <h2>③ 에디터 사용법</h2>
          <div className="gd-cards">
            <article><h3>문장 수정 툴바</h3><p>문장을 드래그하면 위에 툴바가 뜹니다: {ACTIONS.map((a) => a.label).join(" · ")}. [직접 지시]에는 &quot;초등학생도 이해하게&quot;처럼 원하는 방향을 적을 수 있습니다.</p></article>
            <article><h3>되돌리기</h3><p>AI 수정과 제안 적용은 [되돌리기]로 한 단계씩 취소할 수 있습니다(최대 50단계). 직접 타이핑한 내용은 Ctrl+Z로 되돌립니다.</p></article>
            <article><h3>글 분석 제안</h3><p>[적용]은 본문에서 해당 문장을 다시 찾아 바꿉니다. 글이 바뀌어 찾을 수 없으면 알려 주고 제안을 목록에서 뺍니다. [본문에서 보기]를 누르면 그 문장이 선택됩니다.</p></article>
            <article><h3>자동 저장</h3><p>입력을 멈추고 1.5초 뒤 저장됩니다. 상단에 &quot;✓ 저장됨&quot;이 보이면 안전합니다. 문서는 최대 30개까지 보관됩니다.</p></article>
            <article><h3>표</h3><p>서식 도구의 [표 넣기]로 3×3 표를 넣고, 표 안을 클릭하면 나타나는 [표 편집] 줄에서 행·열 추가/삭제, 머리글 행 전환, 표 삭제를 합니다. 열 경계를 끌어 너비를 조절할 수 있습니다.</p></article>
            <article><h3>이미지</h3><p>[이미지 넣기]로 파일을 고르거나, 이미지를 본문에 붙여 넣기(Ctrl+V)·끌어다 놓기 하면 올라갑니다(PNG·JPEG·WebP·GIF, 문서 전체 최대 60개, 긴 변 1,600px로 자동 축소). 이미지를 클릭하면 설명(alt)·크기(작게/보통/크게)·삭제 메뉴가 뜨고, 모서리를 끌어 크기를 바꿀 수도 있습니다.</p></article>
            <article><h3>글자 색·형광펜·밑줄·정렬</h3><p>글자를 선택하고 [글자 색]·[형광펜]에서 색을 고르거나 [밑줄]·가운데/오른쪽 정렬을 누릅니다. 서식 복사·.html로 내보낼 때는 그대로 유지되지만 .md·마크다운 복사에는 담기지 않습니다.</p></article>
          </div>
        </section>

        <section id="formats" className="card">
          <h2>④ 글쓰기 형식·옵션</h2>
          <div className="gd-table">
            {FORMATS.map((f) => <div key={f.id}><b>{f.label}</b><span>{f.hint}</span></div>)}
            <div><b>톤 · 분량</b><span>기본/전문적인/친근한/격식 있는 톤, 짧게(500자)·보통·길게(2,500자 이상)</span></div>
            <div><b>참고 파일</b><span>.txt .md .csv 파일의 앞 30,000자까지 AI가 참고합니다.</span></div>
            <div><b>인터넷 검색</b><span>최신 정보가 필요할 때 켜면 검색 결과를 바탕으로 쓰고 출처를 보여 줍니다.</span></div>
          </div>
        </section>

        <section id="tips" className="card">
          <h2>⑤ 활용 요령</h2>
          <ul className="gd-list">
            <li>주제에 <b>독자·목적·분량</b>을 함께 적으면 초안이 훨씬 구체적입니다. 예: &quot;신입 마케터를 위한 이메일 마케팅 입문 블로그 글&quot;.</li>
            <li>초안은 출발점입니다. 경험·사례·수치는 직접 더하고, AI가 쓴 사실 정보는 출처를 확인하세요.</li>
            <li>긴 글은 문단 단위로 선택해 수정하면 결과가 안정적입니다(선택은 최대 5,000자).</li>
            <li>보도자료·자기소개서처럼 사실이 중요한 글의 빈칸 [  ]은 직접 채워 주세요. AI가 사실을 지어내지 않도록 비워 두게 되어 있습니다.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“Gemini API 키가 등록되지 않았습니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>“AI가 올바른 형식으로 응답하지 못했습니다”라고 나와요.</summary><p>같은 버튼을 한 번 더 누르세요. 계속되면 글을 짧게 나누어 분석해 보세요.</p></details>
            <details><summary>선택했는데 툴바가 안 보여요.</summary><p>드래그로 문장을 선택해야 합니다(5,000자 이하). 선택이 풀리면 툴바도 사라집니다.</p></details>
            <details><summary>제안 [적용]이 “찾지 못했다”고 나와요.</summary><p>분석 후 본문을 고쳐서 원래 문장이 사라진 경우입니다. [다시 분석]을 눌러 새 제안을 받아 보세요.</p></details>
            <details><summary>넣은 이미지는 누구나 볼 수 있나요?</summary><p>이미지는 공개 저장소에 추측하기 어려운 긴 이름으로 저장되어, 주소를 아는 사람만 볼 수 있습니다. 그래야 서식 복사·.html 내보내기에서도 이미지가 보입니다. 다만 주소를 공유하면 누구나 볼 수 있으니 개인정보가 담긴 이미지는 넣지 마세요. 문서를 삭제하면 다른 문서가 쓰지 않는 이미지 파일도 함께 삭제되며, 이미 캐시된 주소는 최대 1시간 정도 보일 수 있습니다.</p></details>
            <details><summary>마크다운(.md)으로 내려받으면 색이 사라져요.</summary><p>글자 색·형광펜·정렬·이미지 크기는 마크다운으로 표현할 수 없습니다. 서식을 모두 유지하려면 [서식 복사] 또는 .html을 사용하세요.</p></details>
            <details><summary>“저장 실패”가 나와요.</summary><p>네트워크를 확인하세요. 화면에 글이 남아 있으니 [본문 복사]로 먼저 백업한 뒤 새로고침하세요.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
