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

const STYLES_LIST = [
  "피규어", "지브리 애니메이션", "신카이 마코토", "한국 수묵화", "사이버펑크",
  "레트로 픽셀아트", "클레이메이션", "유화 (인상주의)", "수채화 일러스트", "3D 픽사 스타일",
  "흑백 느와르", "팝아트", "스테인드글라스", "종이공예(페이퍼아트)", "보태니컬 아트",
  "미니멀리즘 벡터", "네온 글로우", "빈티지 코믹스", "다크 판타지", "사이버 메카닉"
];

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">비주얼 사용 설명서</p>
        <h1>📖 연동 & 사용 매뉴얼</h1>
        <p>사진 한 장으로 복원·스타일 변환·합성·배경 제거·증명사진·인생 앨범·만화·스토리까지 만드는 이미지 도구함입니다. ①~②만 따라 해도 충분합니다.</p>
      </div>

      <div className="gd">
        {/* 상단 바나나 히어로 배너 */}
        <section className="gd-hero">
          <div className="gd-mascot">🍌</div>
          <div className="gd-bubble">
            <strong>반갑습니다! AI 바나나 캔버스 아틀리에입니다.</strong>
            단 한 장의 사진만으로도 전문가급 리터칭, 스타일 변환, 5장 이미지 합성, 증명사진 및 8컷 연속 스토리 제작까지 브라우저에서 바로 실현할 수 있습니다. 아래 3단계 작업 흐름과 가이드를 확인해보세요!
          </div>
        </section>

        {/* 3단계 핵심 파이프라인 */}
        <section className="card">
          <h2>🍌 3단계 스마트 워크플로우</h2>
          <ul className="gd-flow">
            <li>
              <em>STEP 01</em>
              <b>🖼️</b>
              <strong>원본 이미지 준비</strong>
              <small>JPG·PNG·WEBP 업로드 (이미지 없이 만들기 가능)</small>
            </li>
            <li>
              <em>STEP 02</em>
              <b>✨</b>
              <strong>도구 선택 및 실행</strong>
              <small>생성·편집·합성·빠른작업·스페셜 작업 실행</small>
            </li>
            <li>
              <em>STEP 03</em>
              <b>🌟</b>
              <strong>다운로드 & 계속 편집</strong>
              <small>고해상도 저장 또는 결과를 새 원본으로 연결</small>
            </li>
          </ul>
        </section>

        {/* 바로가기 목차 */}
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#tools">③ 작업별 설명</a>
          <a href="#styles">④ 20종 스타일 프리셋</a>
          <a href="#tips">⑤ 잘 나오는 요령</a>
          <a href="#privacy">⑥ 개인정보·사용 주의</a>
          <a href="#faq">⑦ 막힐 때(FAQ)</a>
        </nav>

        {/* 1. API 키 등록 */}
        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">이미지 생성·편집은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 키가 없으면 작업 버튼을 눌렀을 때 등록 안내가 나옵니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code>로 시작하는 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록]을 누릅니다.</Step>
            <Step n={3} title="확인">“등록됨”과 키 일부가 보이면 끝입니다. 언제든 삭제·교체할 수 있습니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-warn">⚠️ 이미지 생성·편집은 Gemini 이미지 모델을 쓰며, 계정에 따라 결제(유료) 설정이 되어 있어야 동작할 수 있습니다. 작업 1회가 이미지 생성 1건이고, 연속 스토리·이미지 레시피는 6~8건이 본인 키 사용량으로 계산됩니다.</p>
        </section>

        {/* 2. 5분 시작하기 */}
        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="원본 이미지를 올립니다">[원본 이미지]에 JPG·PNG·WEBP(15MB 이하)를 올립니다. 이미지가 없어도 [만들기]나 [스페셜]의 스토리·레시피는 바로 쓸 수 있습니다.</Step>
            <Step n={2} title="작업을 고릅니다">[만들기] 새 이미지, [템플릿 그래픽] 123종 상업 템플릿, [옛 사진 복원] 구도 유지 복원·컬러화·확대, [편집] 복원·스타일, [합성] 여러 장 합치기, [빠른 작업] 배경 제거·부분 삭제·증명사진·평면도 3D, [스페셜] 인생 앨범·만화·스토리·레시피.</Step>
            <Step n={3} title="[프롬프트 제안]을 활용합니다">요청을 어떻게 쓸지 막막하면 [프롬프트 제안]을 눌러 AI가 쓴 문장을 받아 고쳐 쓰세요.</Step>
            <Step n={4} title="결과를 저장하거나 이어서 편집합니다">[다운로드]로 저장하고, [이 결과로 계속 편집]을 누르면 결과를 새 원본으로 다시 작업할 수 있습니다. 결과는 [내 결과 기록]에 최근 30건까지 보관되고, 만든 날부터 30일 뒤 자동 삭제됩니다(즐겨찾기 포함). 「형식 바꾸기」로 이미지 변환 스튜디오에서 WebP·PNG·JPG로 바꿀 수 있습니다.</Step>
          </ol>
        </section>

        {/* 3. 작업별 설명 */}
        <section id="tools" className="card">
          <h2>③ 작업별 설명</h2>
          <div className="gd-cards">
            <article><h3>🎨 만들기</h3><p>아이디어를 입력하고 카테고리(실사·음식·건축·판타지·수채화·3D·벡터·스티커·로고·미니멀)와 종횡비를 고르면 이미지를 만듭니다.</p></article>
            <article><h3>✨ 편집</h3><p>복원·컬러화·채색(스케치 전용)·업스케일(2x/4x)을 복수 선택하고, 스타일 20종(피규어·유화·한국수묵화 등)과 추가 요청을 더할 수 있습니다.</p></article>
            <article><h3>📐 템플릿 그래픽</h3><p>19개 직군 123종 상업 템플릿(배너·포스터·명함·메뉴판·UI 등)을 고르고 빈칸만 채우면 그래픽을 만듭니다. 메모나 기획서(.txt·.md·.json)를 넣으면 AI가 칸을 채워 주고, 화풍 11종·글자 언어·해상도(정밀 모델 2K·4K)를 고를 수 있습니다. 원본 이미지가 있으면 참고 이미지로 씁니다. (예전 「AI 올인원 그래픽」 기능이 이곳으로 옮겨 왔습니다.)</p></article>
            <article><h3>↔️ 비율 확장 · 부분 수정</h3><p>빠른 작업의 「비율 확장」은 원본을 그대로 두고 주변을 그려 16:9·9:16 등으로 넓힙니다. 「부분 수정 지시」를 적고 브러시로 칠하면 그 자리만 바꾸거나 새 물건을 넣고, 비워 두면 칠한 곳을 지웁니다.</p></article>
            <article><h3>🕰️ 옛 사진 복원</h3><p>원래 구도·얼굴·시대를 지키며 긁힘·빛바램을 고치고 흑백에 자연스러운 색을 입힙니다. 실제 2배·4배 확대(긴 변 최대 8,192px)를 고를 수 있고, 결과는 원본과 슬라이더로 비교합니다. (예전 「AI 포토 리메이크」 기능이 이곳으로 옮겨 왔습니다.)</p></article>
            <article><h3>🧩 합성</h3><p>원본에 소스 이미지(최대 5장)의 요소를 합칩니다. 소스마다 「오른손에 들기」처럼 지시를 따로 적을 수 있고, 배경을 유지할지 바꿀지 고릅니다. 원본 인물의 얼굴은 그대로 유지하도록 지시합니다. 결과 종횡비를 바꾸면 장면을 확장합니다.</p></article>
            <article><h3>✂️ 배경 제거</h3><p>AI가 배경을 단색으로 바꾼 뒤 서버에서 투명 배경 PNG로 만듭니다. 피사체와 비슷한 색의 배경이면 가장자리가 거칠 수 있습니다.</p></article>
            <article><h3>🖌️ 부분 삭제</h3><p>브러시로 칠한 영역을 지우고 주변과 자연스럽게 채웁니다. 작은 영역일수록 결과가 좋습니다.</p></article>
            <article><h3>📸 증명사진 · 평면도 3D</h3><p>증명사진은 정장·흰 배경·3:4로 변환합니다. 평면도는 45도 컷어웨이 3D 렌더로 바꿉니다.</p></article>
            <article><h3>📚 인생 앨범 · 만화 패널</h3><p>인생 앨범은 현재 나이를 입력하면 유아~70대 콜라주를 만듭니다. 만화 패널은 느와르·웹툰·미국 코믹스 중에서 대사를 넣어 만듭니다.</p></article>
            <article><h3>📖 연속 스토리 · 이미지 레시피</h3><p>스토리는 AI가 8개 장면을 먼저 기획한 뒤 컷마다 이전 컷을 참고해 그립니다(글자 없음). 레시피는 한국어 단계 설명과 단계별 이미지를 만듭니다.</p></article>
          </div>
        </section>

        {/* 4. 20종 스타일 프리셋 시각화 */}
        <section id="styles" className="card">
          <h2>④ 20종 프리미엄 스타일 프리셋</h2>
          <p className="gd-lead">원하는 분위기의 스타일을 클릭하여 프롬프트에 자동으로 주입하고, 색다른 질감의 아트워크를 제작해 보세요.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
            {STYLES_LIST.map((style, i) => (
              <span key={i} style={{
                padding: "6px 12px",
                borderRadius: "999px",
                background: "var(--card2)",
                border: "1px solid var(--line)",
                color: "var(--foreground)",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}>
                <span style={{ color: "var(--brand)" }}>●</span> {style}
              </span>
            ))}
          </div>
        </section>

        {/* 5. 결과가 잘 나오는 요령 */}
        <section id="tips" className="card">
          <h2>⑤ 결과가 잘 나오는 요령</h2>
          <ul className="gd-list">
            <li>원본은 <b>해상도가 충분하고 피사체가 선명한</b> 사진이 좋습니다. 너무 작거나 흐린 사진은 업스케일해도 한계가 있습니다.</li>
            <li>요청은 <b>한 번에 한 가지</b>를 구체적으로 쓰세요. 여러 변환이 필요하면 결과를 [계속 편집]으로 이어 가는 편이 안정적입니다.</li>
            <li>스타일 변환은 [프롬프트 제안]을 쓰면 재질·질감 설명이 더해져 결과가 좋아집니다.</li>
            <li>업스케일은 AI 선명화와 서버 확대를 함께 쓰며, 긴 변 8192px까지 확대됩니다. 새로운 디테일을 완전히 복원하는 기능은 아닙니다.</li>
          </ul>
        </section>

        {/* 6. 개인정보 · 사용 주의 */}
        <section id="privacy" className="card">
          <h2>⑥ 개인정보 · 사용 주의</h2>
          <ul className="gd-list">
            <li>올린 이미지는 작업에만 쓰이며 비공개 임시 저장소에서 <b>1시간 안에 자동 삭제</b>됩니다. 결과 이미지는 [내 결과 기록]에서 삭제할 수 있습니다.</li>
            <li>이미지는 회원님의 Gemini 키로 Google에 전송되어 처리됩니다.</li>
            <li><b>본인 사진 또는 사용 동의를 받은 사진만</b> 올려 주세요. 타인의 얼굴 사진을 동의 없이 변환·합성하거나 타인을 사칭하는 용도로 쓰는 것은 금지됩니다.</li>
          </ul>
        </section>

        {/* 7. 막힐 때 (자주 묻는 질문) */}
        <section id="faq" className="card">
          <h2>⑦ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“API 키 등록이 필요합니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>“키가 올바르지 않거나 권한이 없습니다”라고 나와요.</summary><p>키를 다시 확인하고, Google AI Studio에서 해당 키의 결제(유료) 설정이 되어 있는지 확인하세요.</p></details>
            <details><summary>“이미지가 만들어지지 않았습니다”라고 나와요.</summary><p>같은 버튼을 한 번 더 누르세요. 계속되면 요청을 더 구체적으로 쓰거나 다른 사진으로 시도해 보세요.</p></details>
            <details><summary>“AI 안전 정책으로 만들지 못했습니다”라고 나와요.</summary><p>인물 사진이나 요청이 안전 기준에 걸린 경우입니다. 다른 사진·표현으로 바꿔 시도해 주세요.</p></details>
            <details><summary>업로드한 이미지를 찾을 수 없다고 나와요.</summary><p>임시 보관 시간(1시간)이 지난 경우입니다. 이미지를 다시 올려 주세요.</p></details>
            <details><summary>스토리가 8컷보다 적게 나왔어요.</summary><p>시간 제한이나 일부 컷의 생성 실패 때문입니다. 안내 문구에 만들어진 컷 수가 표시되며, 같은 아이디어로 다시 실행하면 새로 만듭니다.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
