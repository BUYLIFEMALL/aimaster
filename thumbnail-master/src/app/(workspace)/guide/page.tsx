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
        <p className="eyebrow" style={{ color: "var(--brand)" }}>THUMBNAIL MASTER EDITORIAL GUIDE</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>🎬 AI 썸네일 마스터 연동 & 사용 매뉴얼</span>
          <span style={{ fontSize: 13, padding: "3px 9px", borderRadius: 999, background: "rgba(139,92,246,0.18)", color: "var(--brand)", fontWeight: 700, border: "1px solid rgba(139,92,246,0.3)" }}>v1.07 썸네일 매거진 에디션</span>
        </h1>
        <p>영상 주제와 시청 타겟만 고르면 AI가 A/B 두 가지 전략으로 문구가 들어간 유튜브 썸네일 2종을 만들어 줍니다.</p>
      </div>

      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(249,115,22,0.08) 100%)", borderColor: "rgba(139,92,246,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, color: "var(--brand)", marginBottom: 4 }}>✨ AI 썸네일 A/B 테스트 3-Step 파이프라인</h3>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>시청층 맞춤형 고대비 폰트와 감각적인 비주얼로 유튜브 클릭률(CTR)을 극대화합니다.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--brand)" }}>#숫자이득A안</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--brand-alt)" }}>#호기심유발B안</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "#38bdf8" }}>#고대비헤드라인</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--ok)" }}>#클릭률극대화</span>
          </div>
        </div>
      </div>

      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#options">③ 옵션 설명</a>
          <a href="#edit">④ 수정·버전</a>
          <a href="#tips">⑤ 잘 나오는 요령</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">전략 분석과 이미지 생성은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 키가 없으면 생성 버튼을 눌렀을 때 등록 안내가 나옵니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code>로 시작하는 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록]을 누릅니다.</Step>
            <Step n={3} title="확인">“등록됨”과 키 일부가 보이면 끝입니다. 언제든 삭제·교체할 수 있습니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-warn">⚠️ 이미지 생성은 Gemini 이미지 모델을 쓰며, 계정에 따라 결제(유료) 설정이 되어 있어야 생성될 수 있습니다. 썸네일 2종을 만들면 이미지 생성이 2건, 수정 요청은 1건씩 본인 키 사용량으로 계산됩니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="주제와 피사체를 정합니다">영상 주제를 한두 문장으로 쓰거나 대본 파일(.txt .md .csv)을 올립니다. 썸네일에 사람·동물·사물을 넣을지, 글자와 그래픽만 쓸지 고릅니다.</Step>
            <Step n={2} title="시청 타겟을 고르고 [전략 생성]">10대~20대, 20~40대, 시니어, 전연령 중 하나를 고르면 문구 톤과 글자 크기·색 대비 규칙이 달라집니다.</Step>
            <Step n={3} title="A/B 문구를 다듬습니다">A안은 숫자·이득 중심, B안은 호기심·감성 중심입니다. 메인 문구는 3~5단어가 가장 좋습니다. 마음에 안 들면 [다른 문구로 다시 제안]을 누르세요.</Step>
            <Step n={4} title="[썸네일 2종 생성하기]">20~60초 뒤 A·B 이미지가 나란히 나타납니다. 마음에 드는 쪽을 [다운로드 (JPG)]로 저장하세요.</Step>
          </ol>
        </section>

        <section id="options" className="card">
          <h2>③ 옵션 설명</h2>
          <div className="gd-cards">
            <article><h3>시청 타겟</h3><p>시니어를 고르면 글자를 매우 크고 굵게, 노랑/검정 같은 강한 대비로 만듭니다. 10대는 고채도·역동적인 연출을 씁니다.</p></article>
            <article><h3>피사체</h3><p>사람은 성별·연령·국적을 정할 수 있고 기본은 한국인입니다. 동물·사물은 종류를 직접 적습니다. “없음”은 글자와 그래픽 위주로 만듭니다.</p></article>
            <article><h3>테두리 · 채널명</h3><p>단색 강조, 네온 글로우, 손그림 중에서 고를 수 있고, 채널명을 모서리에 작게 넣을 수 있습니다.</p></article>
            <article><h3>문구 넣기 / 배경만</h3><p>기본은 이미지에 문구를 직접 그려 넣습니다. 한글이 어색하게 나오면 “배경만 생성”으로 만든 뒤 다른 편집 도구에서 글자를 얹으세요.</p></article>
            <article><h3>해상도</h3><p>2K는 고화질이지만 느립니다. 빠르게 시안을 보려면 1K로 먼저 만드세요.</p></article>
          </div>
        </section>

        <section id="edit" className="card">
          <h2>④ 수정 요청과 버전</h2>
          <ul className="gd-list">
            <li><b>AI 수정 요청</b>: “텍스트를 노란색으로 바꿔줘”, “표정을 더 놀라게 해줘”처럼 적으면 지시대로 이미지를 다시 그립니다. 일부만 바꾸는 편집이 아니라 전체를 다시 그리므로 미세한 차이가 생길 수 있습니다.</li>
            <li><b>버전</b>: 옵션마다 최근 5개 버전이 보관됩니다. v1, v2… 버튼을 누르면 이전 버전으로 되돌릴 수 있습니다.</li>
            <li><b>자동 저장</b>: 입력·전략·생성한 이미지는 프로젝트에 자동 저장되며 프로젝트는 최대 30개까지 보관됩니다. 삭제하면 이미지도 함께 지워집니다.</li>
          </ul>
        </section>

        <section id="tips" className="card">
          <h2>⑤ 결과가 잘 나오는 요령</h2>
          <ul className="gd-list">
            <li>주제에 <b>대상·결과·숫자</b>를 넣으세요. 예: “직장인 점심 15분 도시락 5가지”.</li>
            <li>대본을 올리면 내용에 맞는 구체적인 문구가 나옵니다(앞 3만 자까지 분석).</li>
            <li>실존 인물·연예인·상표 이름은 안전 정책으로 막힐 수 있습니다. 일반적인 인물 설정을 쓰세요.</li>
            <li>다운로드한 이미지를 업로드하기 전에 유튜브 스튜디오에서 모바일 미리보기로 글자가 읽히는지 확인하세요.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“API 키 등록이 필요합니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>“키가 올바르지 않거나 권한이 없습니다”라고 나와요.</summary><p>키를 다시 확인하고, Google AI Studio에서 해당 키의 결제(유료) 설정이 되어 있는지 확인하세요. 이미지 생성은 무료 한도가 없을 수 있습니다.</p></details>
            <details><summary>“이미지가 만들어지지 않았습니다”라고 나와요.</summary><p>같은 버튼을 한 번 더 누르세요. 계속되면 문구를 줄이거나 “배경만 생성” 옵션을 사용해 보세요.</p></details>
            <details><summary>“AI 안전 정책으로 이미지를 만들지 못했습니다”라고 나와요.</summary><p>인물 설정이나 주제가 안전 기준에 걸린 경우입니다. 피사체를 사물이나 “없음”으로 바꾸거나 표현을 순화해 보세요.</p></details>
            <details><summary>글자가 깨지거나 철자가 틀려요.</summary><p>[AI 수정 요청]에 “메인 문구를 ‘○○○’로 정확히 써줘”처럼 적어 보세요. 해결되지 않으면 “배경만 생성”으로 만들고 글자를 직접 얹는 방법을 권장합니다.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
