import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";

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
        <p>주제만 정하면 AI가 랜딩페이지 기획안과 HTML 프로토타입을 만들어 줍니다. ①~③만 따라 해도 충분합니다.</p>
      </div>
      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#options">③ 옵션 설명</a>
          <a href="#output">④ 결과물 활용</a>
          <a href="#tips">⑤ 잘 나오는 요령</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">이 프로그램의 AI는 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 키가 없으면 생성 버튼을 눌렀을 때 등록 안내가 나옵니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code>로 시작하는 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록]을 누릅니다.</Step>
            <Step n={3} title="확인">“등록됨”과 키 일부가 보이면 끝입니다. 언제든 삭제·교체할 수 있습니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-tip">ℹ️ 기획안 1회, 프로토타입 1회가 각각 텍스트 생성 1건으로 본인 키의 사용량에 계산됩니다(이미지 생성 없음).</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="주제 예시를 고르거나 직접 입력합니다">[주제 예시 선택]에서 비슷한 유형을 고르면 레이아웃과 페이지 구성(메인 1 + 서브 4)이 자동으로 정해집니다. 맞는 것이 없으면 [기타]를 고르세요.</Step>
            <Step n={2} title="타겟과 목표를 적습니다">고민되면 주제를 쓰고 [타겟/목표 자동 완성]을 눌러 AI의 제안을 받은 뒤 고쳐 쓰세요.</Step>
            <Step n={3} title="[기획안 생성 시작]">30~90초 뒤 기획안이 나타납니다. 섹션을 펼쳐 JSON을 직접 고치거나 [이 섹션 다시 만들기]로 일부만 새로 받을 수 있습니다.</Step>
            <Step n={4} title="[프로토타입 만들기]">1~3분 뒤 미리보기가 나타납니다. 모바일·태블릿·데스크톱 폭으로 바꿔 확인하세요.</Step>
            <Step n={5} title="내보내기">[HTML 다운로드]로 파일을 받거나 [변환 프롬프트 복사]로 React 프로젝트 변환을 이어갑니다. 변경 내용은 자동 저장됩니다.</Step>
          </ol>
        </section>

        <section id="options" className="card">
          <h2>③ 옵션 설명</h2>
          <div className="gd-cards">
            <article><h3>레이아웃 5종</h3><p>카드형(링크 인 바이오), 문서형(이력서), 히어로형(입력 폼), 갤러리형(포트폴리오), 랜딩형(섹션 스크롤). 주제 예시가 기본 유형을 정합니다.</p></article>
            <article><h3>이미지 소스</h3><p>기본값은 키 없이 쓰는 무료 임의 사진(Picsum)이며 주제와 무관한 사진이 들어갑니다. Unsplash·Pexels·Pixabay는 본인 키를 등록하면 키워드에 더 잘 맞는 사진을 찾아 줍니다.</p></article>
            <article><h3>AI 모델</h3><p>Pro는 품질이 높고 느리며, 계정에서 쓸 수 없으면 자동으로 다음 모델로 처리합니다. Standard는 빠릅니다.</p></article>
            <article><h3>섹션 편집·다시 만들기</h3><p>프로젝트 정보, 페이지 구조, 콘텐츠 전략, 디자인 시스템, 개발 가이드, 이미지 에셋을 따로 고치거나 다시 받습니다.</p></article>
          </div>
        </section>

        <section id="output" className="card">
          <h2>④ 결과물 활용</h2>
          <div className="gd-table">
            <div><b>기획안(JSON·Markdown)</b><span>팀 공유나 디자이너·개발자에게 전달하는 설계 문서로 씁니다.</span></div>
            <div><b>HTML 프로토타입</b><span>파일 하나로 브라우저에서 바로 열립니다. 실제 서비스 전 검토용 시안입니다.</span></div>
            <div><b>변환 프롬프트</b><span>코딩 AI에 붙여 넣어 Vite + React + TypeScript 프로젝트로 바꾸고 Vercel에 배포할 수 있습니다.</span></div>
          </div>
        </section>

        <section id="tips" className="card">
          <h2>⑤ 결과가 잘 나오는 요령</h2>
          <ul className="gd-list">
            <li>타겟은 <b>나이·상황·고민</b>을, 목표는 <b>숫자로 측정 가능한 행동</b>(예: 월 30건 신청)을 적으면 문구가 구체적으로 나옵니다.</li>
            <li>주제 예시를 선택하면 구조가 고정되어 결과가 안정적입니다. 독특한 구조가 필요하면 [기타]로 AI에 맡기세요.</li>
            <li>기획안을 먼저 다듬은 뒤 프로토타입을 만드세요. 프로토타입 생성은 시간이 더 걸립니다.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“API 키 등록이 필요합니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>“AI가 올바른 형식으로 응답하지 못했습니다”라고 나와요.</summary><p>AI 응답이 형식에서 벗어난 경우입니다. 같은 버튼을 한 번 더 눌러 주세요. 계속되면 Standard 모델로 바꿔 보세요.</p></details>
            <details><summary>이미지가 주제와 안 맞아요.</summary><p>기본 무료 사진은 주제와 무관한 임의 사진입니다. 이미지 소스를 Unsplash/Pexels/Pixabay로 바꾸고 본인 키를 등록한 뒤 [이미지 다시 찾기]를 누르세요.</p></details>
            <details><summary>미리보기가 비어 보여요.</summary><p>프로토타입은 외부 CDN(Tailwind)을 사용합니다. 인터넷 연결과 광고 차단 설정을 확인하고 다시 만들어 보세요.</p></details>
            <details><summary>“다른 창에서 먼저 저장되었습니다”라고 나와요.</summary><p>같은 프로젝트를 여러 창에서 열어 둔 경우입니다. 새로고침한 뒤 이어서 작업하세요.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
