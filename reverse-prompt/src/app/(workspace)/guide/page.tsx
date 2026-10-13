import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { SIZE_LIMIT } from "@/lib/rpa/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MB = 1048576;

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
        <p>마음에 드는 이미지·영상·음악을 올리면, 같은 느낌을 다른 AI로 다시 만들 수 있는 프롬프트를 뽑아 줍니다. ①~②만 따라 해도 충분합니다.</p>
      </div>
      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#options">③ 옵션 설명</a>
          <a href="#output">④ 결과물 활용</a>
          <a href="#limits">⑤ 파일 형식·크기·개인정보</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">이 프로그램의 AI 분석은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 키가 없으면 분석 버튼을 눌렀을 때 등록 안내가 나옵니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code>로 시작하는 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록]을 누릅니다.</Step>
            <Step n={3} title="확인">“등록됨”과 키 일부가 보이면 끝입니다. 언제든 삭제·교체할 수 있습니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-tip">ℹ️ 파일 1개를 분석할 때마다 본인 키의 Gemini 사용량이 1건 계산됩니다. 동영상은 이미지보다 사용량이 많습니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="파일을 올립니다">[파일 올리기] 영역을 누르거나 파일을 끌어다 놓습니다. 이미지는 Ctrl+V 붙여넣기도 됩니다.</Step>
            <Step n={2} title="대상 도구와 옵션을 고릅니다">이미지는 Midjourney·DALL·E·Flux, 영상은 Sora·Veo·Runway·Kling, 음악은 Suno·Udio 중에서 고릅니다. 강조하고 싶은 부분은 [추가 지시]에 적습니다.</Step>
            <Step n={3} title="[분석 시작]">이미지는 10~30초, 동영상·오디오는 1~3분 걸릴 수 있습니다. 끝나면 추천 프롬프트와 분석 요소가 나타납니다.</Step>
            <Step n={4} title="복사해서 사용하고, 필요하면 고칩니다">프롬프트 칸을 직접 고친 뒤 [수정 저장·명령어 재조합]을 누르면 Midjourney 명령어가 다시 조립됩니다. 결과는 [내 분석 기록]에 자동 저장됩니다.</Step>
          </ol>
        </section>

        <section id="options" className="card">
          <h2>③ 옵션 설명</h2>
          <div className="gd-cards">
            <article><h3>대상 도구</h3><p>같은 파일이라도 도구마다 잘 먹히는 문장 형태가 다릅니다. Midjourney는 파라미터 명령어, DALL·E는 문장형, Flux/SD는 태그형으로 만들어 줍니다.</p></article>
            <article><h3>설명 언어</h3><p>분석 설명은 한국어/영어 중 선택합니다. 프롬프트 자체는 도구 호환을 위해 항상 영어입니다.</p></article>
            <article><h3>프롬프트 길이</h3><p>간결(약 25~45단어), 표준(60~100), 상세(120~180). 결과가 너무 단조로우면 상세로 바꿔 보세요.</p></article>
            <article><h3>AI 모델</h3><p>Flash는 빠르고 기본값입니다. Pro는 더 정밀하지만 느리며, 계정에서 쓸 수 없으면 자동으로 Flash로 처리됩니다.</p></article>
          </div>
        </section>

        <section id="output" className="card">
          <h2>④ 결과물 활용</h2>
          <div className="gd-table">
            <div><b>추천 프롬프트</b><span>해당 도구의 입력창에 붙여 넣으면 비슷한 결과를 만들 수 있습니다. 완전히 같은 결과를 보장하지는 않습니다.</span></div>
            <div><b>부정 프롬프트</b><span>이미지에서 빼고 싶은 요소입니다(Midjourney는 --no 로 명령어에 포함됩니다).</span></div>
            <div><b>분석 요소 카드</b><span>조명·구도·카메라 움직임·악기 구성 등 분해 결과입니다. 직접 프롬프트를 고칠 때 참고하세요.</span></div>
            <div><b>JSON / Markdown</b><span>JSON은 자동화·보관용, Markdown은 문서나 메모에 붙여 넣기용입니다.</span></div>
          </div>
        </section>

        <section id="limits" className="card">
          <h2>⑤ 파일 형식·크기·개인정보</h2>
          <ul className="gd-list">
            <li>이미지 JPG·PNG·WEBP·HEIC {SIZE_LIMIT.image / MB}MB 이하, 동영상 MP4·MOV·WEBM·AVI 등 {SIZE_LIMIT.video / MB}MB 이하, 오디오 MP3·WAV·AAC·OGG·FLAC {SIZE_LIMIT.audio / MB}MB 이하.</li>
            <li>올린 파일은 비공개 임시 저장소에만 보관되며 <b>1시간 안에 자동 삭제</b>됩니다. 분석이 끝난 뒤 [삭제]를 누르면 즉시 지워집니다. 기록에는 결과 문구와 작은 미리보기만 저장됩니다.</li>
            <li>분석을 위해 파일은 회원님의 Gemini 키로 Google에 전송됩니다. 타인의 저작물·초상이 담긴 파일은 권리와 개인정보를 확인한 뒤 사용하세요.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“API 키 등록이 필요합니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>파일이 너무 크다고 나와요.</summary><p>동영상은 짧게 잘라 내거나 해상도를 낮추고, 오디오는 필요한 구간만 잘라서 다시 올려 주세요.</p></details>
            <details><summary>“AI 안전 정책으로 분석하지 못했습니다”라고 나와요.</summary><p>AI가 안전 기준에 걸린다고 판단한 파일입니다. 다른 파일로 시도해 주세요.</p></details>
            <details><summary>“AI가 올바른 형식으로 응답하지 못했습니다”라고 나와요.</summary><p>같은 버튼을 한 번 더 눌러 주세요. 계속되면 AI 모델을 바꿔 보세요.</p></details>
            <details><summary>영상 분석이 오래 걸려요.</summary><p>영상은 업로드 후 AI가 처리하는 시간이 필요해 1~3분 걸릴 수 있습니다. 창을 닫지 말고 기다려 주세요.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
