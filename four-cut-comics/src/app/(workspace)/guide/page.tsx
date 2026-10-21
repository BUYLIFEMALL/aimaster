import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { ASPECTS, BUBBLES, IMAGE_MODELS, STYLES } from "@/lib/comic/options";

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

const FLOW = [
  { icon: "🔑", title: "키 등록", desc: "최초 1회, 본인 Gemini 키" },
  { icon: "💡", title: "주제", desc: "스타일·컷 수·비율·주제 입력" },
  { icon: "📝", title: "대본", desc: "인물·화자·대사 고치기" },
  { icon: "🧑‍🎨", title: "캐릭터", desc: "전신 그림 확인·교체" },
  { icon: "🖼️", title: "컷·말풍선·저장", desc: "한번에 생성 → 편집 → 저장" },
];

// 비율 미리보기 상자 크기(가로·세로 px)
const RATIO_BOX: Record<string, [number, number]> = { "1:1": [48, 48], "4:5": [44, 55], "3:4": [42, 56], "16:9": [72, 40] };

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">사용 설명서</p>
        <h1>📖 연동 & 사용 매뉴얼</h1>
        <p>본인 Gemini 키를 한 번 등록하면, 주제만으로 4컷 만화를 만들 수 있습니다.</p>
      </div>
      <div className="gd">
        <section className="card gd-hero" aria-label="소개">
          <span className="gd-mascot" aria-hidden="true">🐣</span>
          <div className="gd-bubble">
            <strong>안녕하세요, 만화 조수 꼬꼬예요!</strong>
            주제 한 줄만 알려 주시면 <b>대본 → 캐릭터 → 컷 그림 → 말풍선</b>까지 차례로 만들어 드려요.
            그림은 회원님 본인 키로 만들고, 다 만든 뒤 마음에 안 드는 컷만 골라 다시 그릴 수 있어요.
          </div>
        </section>

        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#flow-map">한눈에 보기</a>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#flow">② 만화 만드는 4단계</a>
          <a href="#options">③ 고를 수 있는 것</a>
          <a href="#tips">④ 잘 나오는 요령</a>
          <a href="#privacy">⑤ 개인정보·주의</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="flow-map" className="card">
          <h2>한눈에 보는 흐름</h2>
          <ol className="gd-flow">
            {FLOW.map((f) => (
              <li key={f.title}><b aria-hidden="true">{f.icon}</b><strong>{f.title}</strong><small className="muted">{f.desc}</small></li>
            ))}
          </ol>
        </section>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">대본과 그림은 <b>회원님 본인의 Google Gemini API 키</b>로 만들어집니다. 운영자나 다른 회원의 키로 대신 처리되지 않습니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code> 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 저장한 뒤 [연결 확인]을 누릅니다.</Step>
          </ol>
          <p className="gd-warn">💳 그림 모델은 Google 계정의 결제 설정이 필요할 수 있습니다. 모델 사용 요금과 무료 한도는 Google 정책에 따라 바뀝니다.</p>
          {GEMINI_GUIDE_URL && <div style={{ marginTop: 12 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 매뉴얼 열기" /></div>}
        </section>

        <section id="flow" className="card">
          <h2>② 만화 만드는 4단계</h2>
          <ol className="gd-steps">
            <Step n={1} title="💡 주제 선정">그림 스타일(8종)·그림 모델·대사 표시 방식·<b>컷 수(3·4·6컷)</b>·<b>컷 비율(1:1·4:5·3:4·16:9, 2단계·4단계에서 컷마다 다르게도 지정)</b>·장르·형식을 고르고 주제를 입력한 뒤 [대본 생성하기]를 누릅니다. 장르 옆 [주제 추천]으로 아이디어 5개를 받을 수 있습니다. 이름과 대사를 직접 적은 대본을 넣으면 대사는 그대로 두고 장면 묘사만 만들어 줍니다.</Step>
            <Step n={2} title="📝 대본 확인">등장인물 이름·묘사와 컷별 화자·장면 묘사·대사를 고칩니다. 인물 이름을 바꾸면 화자와 대사 속 이름도 함께 바뀝니다. 대사를 비우면 그 컷은 그림만 나옵니다.</Step>
            <Step n={3} title="🧑‍🎨 등장인물 확인">인물별 전신 그림(캐릭터 시트)이 만들어집니다. 마음에 안 들면 [재생성]하거나 내 이미지로 [교체]하세요. 이 그림이 모든 컷에 참고 이미지로 들어갑니다.</Step>
            <Step n={4} title="🖼️ 만화 생성 · 말풍선 · 저장">[모든 이미지 한번에 생성]을 누르면 컷이 완성되는 대로 나타납니다. 실패한 컷은 오류 내용과 [다시 시도]가 표시되고, 완성된 컷은 [다시 그리기]로 그 컷만 새로 그릴 수 있습니다. 자세한 기능은 아래를 펼쳐 보세요.</Step>
          </ol>
          <details className="gd-detail">
            <summary>💬 말풍선 놓기·편집 자세히</summary>
            <ul className="gd-list">
              <li>대사 표시 방식이 <b>AI 자동 말풍선</b>이면 컷이 완성될 때마다 AI가 빈 곳을 찾아 말풍선을 놓고 꼬리를 화자 쪽으로 향하게 합니다(컷마다 본인 키 텍스트 호출 1회).</li>
              <li><b>말풍선 직접 배치</b>는 AI 호출 없이 위쪽에 놓습니다.</li>
              <li>컷 아래 [말풍선 편집]을 누르면 말풍선을 끌어 옮기고, 오른쪽 아래 점으로 크기, 꼬리 끝 점으로 방향을 바꾸며 모양(말풍선·생각·외침)·회전·테두리 색을 고칠 수 있습니다(터치 가능, 주황 점은 저장 그림에 안 들어감).</li>
            </ul>
          </details>
          <details className="gd-detail">
            <summary>💾 저장·보관 자세히</summary>
            <ul className="gd-list">
              <li>모든 컷이 완성되면 바둑판·가로·세로·<b>웹툰형 세로(가로 690·800·1080px 선택, 컷 사이 넓은 여백 — 한 장 최대 높이를 고르면 컷 사이에서 나눠 ZIP으로 저장)</b>·개별 파일로 저장합니다.</li>
              <li><b>[내 작품에 저장]</b>은 이 브라우저에 보관합니다(최근 20개, 왼쪽 메뉴 [내 작품]에서 다시 보기·다운로드).</li>
              <li>다른 기기에서도 보려면 <b>[서버 보관함에 저장]</b>을 누르고 보관 기간(7일 또는 30일 — 최대 30일 뒤 자동 삭제)을 고릅니다(선택 기능, 회원당 30개, 비공개). [내 작품]의 서버 보관함에서 한 개씩 또는 [전체 삭제]로 모두 지울 수 있습니다.</li>
            </ul>
          </details>
          <details className="gd-detail">
            <summary>📚 인스타 문구·이어서 만들기(연재) 자세히</summary>
            <ul className="gd-list">
              <li><b>[인스타 문구 만들기]</b>로 게시 문구와 해시태그를 만들어 복사합니다.</li>
              <li><b>[이어서 만들기]</b>로 같은 등장인물·캐릭터 그림을 쓰는 다음 화(계속 또는 완결)를 만들 수 있습니다.</li>
              <li>완결 화를 다 만들면 이어서 만들기 대신 연재 합치기·새 이야기 시작을 안내하며, 필요하면 번외편을 이어 갈 수 있습니다.</li>
              <li>2화 이상이면 [1~N화 세로로 합치기]로 연재를 한 장으로 저장합니다.</li>
            </ul>
          </details>
        </section>

        <section id="options" className="card">
          <h2>③ 고를 수 있는 것</h2>
          <h3>🎨 그림 스타일 {STYLES.length}종</h3>
          <div className="gd-chips">{STYLES.map((s) => <span key={s.id} title={s.summary}>{s.name}</span>)}</div>
          <h3>🔢 컷 수</h3>
          <div className="gd-panels">
            <article><div className="gd-mini c3" aria-hidden="true"><i /><i /><i /></div><h3>3컷</h3><p>짧은 반전·한 장면 개그에 좋습니다.</p></article>
            <article><div className="gd-mini c4" aria-hidden="true"><i /><i /><i /><i /></div><h3>4컷 (기본)</h3><p>기·승·전·결로 이야기를 담기 좋은 기본형입니다.</p></article>
            <article><div className="gd-mini c6" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><h3>6컷</h3><p>대사가 많거나 장면 전환이 있는 이야기에 씁니다.</p></article>
          </div>
          <h3>📐 컷 비율</h3>
          <div className="gd-ratio">
            {ASPECTS.map((a) => {
              const [w, h] = RATIO_BOX[a.id] ?? [48, 48];
              return <div key={a.id} style={{ textAlign: "center" }}><span style={{ width: w, height: h }}>{a.id}</span><small className="muted" style={{ display: "block", marginTop: 4 }}>{a.hint}</small></div>;
            })}
          </div>
          <h3>🤖 그림 모델</h3>
          <div className="gd-panels">
            {IMAGE_MODELS.map((m) => <article key={m.id}><h3>{m.name}</h3><p>{m.hint}</p></article>)}
          </div>
          <h3>💬 대사 표시 방식</h3>
          <div className="gd-chips">{BUBBLES.map((b) => <span key={b.id} title={b.hint}>{b.name}</span>)}</div>
        </section>

        <section id="tips" className="card">
          <h2>④ 잘 나오는 요령</h2>
          <ul className="gd-list">
            <li>캐릭터가 컷마다 달라지면 3단계에서 캐릭터 그림을 다시 만들고 그림 모델을 <b>Nano Banana 2</b>로 바꿔 보세요.</li>
            <li>초안은 <b>Lite</b>로 빠르게 뽑고, 마음에 드는 구성이 나오면 일반 모델로 최종본을 만드는 방식이 비용에 좋습니다.</li>
            <li>장면 묘사는 배경·표정·행동·구도를 구체적으로 적을수록 그림이 안정적입니다.</li>
            <li>그림 속 글자(간판 등)는 영어로만 그려지고, 한글 대사는 그림 위에 따로 얹힙니다.</li>
            <li>1단계의 <b>[만화 합치기]</b>는 이미 가진 이미지 여러 장(최대 12장)을 순서대로 세로로 이어 한 장으로 저장합니다. 내 컴퓨터 안에서만 처리되고 서버로 보내지 않습니다.</li>
          </ul>
          <p className="gd-tip">💡 같은 주인공으로 연재하려면 첫 화를 만든 뒤 [이어서 만들기]를 쓰세요. 캐릭터 그림을 그대로 이어 받아 얼굴이 덜 바뀝니다.</p>
        </section>

        <section id="privacy" className="card">
          <h2>⑤ 개인정보·주의</h2>
          <ul className="gd-list">
            <li>입력한 주제·대본과 만든 그림은 [서버 보관함에 저장]을 누르기 전에는 서버에 저장되지 않고 이 화면에만 있습니다. <b>저장 전에 새로고침하거나 탭을 닫지 마세요.</b></li>
            <li>실존 인물·유명인을 풍자하는 내용은 AI 안전 필터에 걸리거나 문제가 될 수 있으니 주의해 주세요.</li>
            <li>만든 만화의 사용 책임은 이용자 본인에게 있습니다.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때(FAQ)</h2>
          <dl className="gd-faq">
            <dt>🔑 키가 올바르지 않다고 나와요</dt><dd>복사할 때 앞뒤 공백이나 글자가 빠졌는지 확인하고 [API키등록·플랫폼연동]에서 다시 저장하세요.</dd>
            <dt>🚫 선택한 모델을 사용할 수 없다고 나와요</dt><dd>계정이나 지역에서 해당 그림 모델이 아직 열리지 않았을 수 있습니다. 다른 그림 모델을 선택하고 Google AI Studio의 결제 설정을 확인해 보세요.</dd>
            <dt>⏳ 사용 한도를 초과했다고 나와요</dt><dd>1분쯤 기다렸다가 다시 시도하거나 AI Studio에서 사용량을 확인하세요.</dd>
            <dt>🛡️ 그림이 안전 필터에 막혔다고 나와요</dt><dd>2단계에서 해당 컷의 장면 묘사를 순화한 뒤 다시 그려 보세요.</dd>
            <dt>💾 저장 버튼이 안 보여요</dt><dd>모든 컷이 완성되어야 저장 메뉴가 나타납니다. 실패한 컷을 먼저 다시 시도하세요.</dd>
          </dl>
        </section>
      </div>
    </>
  );
}
