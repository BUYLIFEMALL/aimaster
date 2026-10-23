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
        <p className="eyebrow" style={{ color: "var(--brand)" }}>FASHION MAGAZINE EDITORIAL GUIDE</p>
        <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>👗 AI 패션스타일 연동 & 사용 매뉴얼</span>
          <span style={{ fontSize: 13, padding: "3px 9px", borderRadius: 999, background: "rgba(244,114,182,0.18)", color: "var(--brand)", fontWeight: 700, border: "1px solid rgba(244,114,182,0.3)" }}>v1.10 매거진 미드나잇 에디션</span>
        </h1>
        <p>내 사진에 스타일리시한 코디를 직접 입혀보고 메이크업·헤어 뷰티 분석까지 완성하는 프리미엄 가이드북입니다.</p>
      </div>

      <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, rgba(244,114,182,0.12) 0%, rgba(56,189,248,0.08) 100%)", borderColor: "rgba(244,114,182,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, color: "var(--brand)", marginBottom: 4 }}>✨ 패션 매거진 미드나잇 파이프라인 (3-Step Studio)</h3>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>드래그앤드롭 가상 착용과 감각적인 런웨이 조명으로 완벽한 퍼스널 스타일링을 구현합니다.</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--brand-alt)" }}>#올드머니룩</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--brand)" }}>#프렌치시크</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "#a78bfa" }}>#미니멀모던</span>
            <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--card2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--ok)" }}>#스마트비즈니스</span>
          </div>
        </div>
      </div>

      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#screen">③ 화면 설명</a>
          <a href="#options">④ 옵션 설명</a>
          <a href="#tips">⑤ 잘 나오는 요령</a>
          <a href="#privacy">⑥ 사진 보관·개인정보</a>
          <a href="#faq">⑦ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">이 프로그램의 AI는 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 키가 없으면 AI 버튼을 눌렀을 때 등록 안내가 나옵니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code>로 시작하는 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록]을 누릅니다.</Step>
            <Step n={3} title="확인">“등록됨”과 키 일부가 보이면 끝입니다. 언제든 삭제·교체할 수 있습니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-tip">ℹ️ 이미지 생성은 본인 키의 사용량으로 계산됩니다. 추천 1회에 이미지 약 4~6장, 입혀보기 1회에 1장, 뷰티 분석에 2장이 만들어집니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="안내에 동의하고 사진을 올립니다">
              가운데 영역의 동의 체크를 켠 뒤, 정면이 잘 보이는 사진을 끌어다 놓거나 [사진 업로드]를 누르거나 <b>Ctrl+V</b>로 붙여넣습니다. 큰 사진은 자동으로 줄여서 사용합니다.
            </Step>
            <Step n={2} title="상황을 입력하고 추천을 받습니다">
              왼쪽 [AI 추천 스타일]에 “소개팅”, “면접”, “공항 패션”처럼 입력하고 [추천 받기]를 누르면 의상 2세트가 이미지로 만들어집니다. [액세서리] 탭에서는 모자·가방·주얼리를 추천받습니다.
            </Step>
            <Step n={3} title="아이템을 입혀 봅니다">
              아이템을 <b>사진 위로 끌어다 놓거나</b>, 아이템의 [입어보기]를 누릅니다. 몇 초 뒤 결과가 사진에 반영됩니다.
            </Step>
            <Step n={4} title="마음에 안 들면 되돌립니다">
              [되돌리기]·[다시 실행]으로 이전 결과를 오갈 수 있고, [원본과 비교]로 슬라이더를 움직여 전후를 확인합니다.
            </Step>
            <Step n={5} title="뷰티로 마무리하고 저장합니다">
              [AI 뷰티 스튜디오]에서 메이크업·헤어 제안을 확인하고 [스타일 적용]을 누릅니다. 마지막에 형식(PNG/JPEG)을 고르고 [저장하기]를 누릅니다. 저장한 룩은 아래 [최근 룩]에도 남습니다.
            </Step>
          </ol>
        </section>

        <section id="screen" className="card">
          <h2>③ 화면 설명</h2>
          <div className="gd-table">
            <div><b>왼쪽: AI 추천 스타일</b><span>상황 입력 → 의상/액세서리 세트 추천. 이미지가 만들어지는 동안 진행 표시가 나타나며, 실패한 아이템은 [다시 만들기]로 재시도합니다. 오래 걸리면 [취소]할 수 있습니다.</span></div>
            <div><b>가운데: 사진 캔버스</b><span>내 사진과 결과가 표시됩니다. 사진 위로 아이템을 끌어다 놓으면 입혀집니다.</span></div>
            <div><b>오른쪽: 나만의 옷장</b><span>쇼핑몰 등에서 본 옷 이미지를 파일·붙여넣기·주소로 추가합니다. 추가하면 AI가 이름을 지어 줍니다. 이 브라우저에 보관되어 다음에도 남습니다.</span></div>
            <div><b>아래: 최근 룩</b><span>저장한 결과 최대 12개. [불러오기]로 다시 결과 화면에 올릴 수 있습니다.</span></div>
          </div>
        </section>

        <section id="options" className="card">
          <h2>④ 옵션 설명</h2>
          <div className="gd-cards">
            <article><h3>피팅 모드: 레이어드(추가)</h3><p>지금 보이는 결과 위에 아이템을 겹쳐 입힙니다. 재킷·모자 같은 소품을 더할 때 사용합니다.</p></article>
            <article><h3>피팅 모드: 갈아입기(교체)</h3><p>항상 처음 올린 원본 사진에서 새로 입힙니다. 다른 옷으로 바꿔 입어 볼 때 사용합니다.</p></article>
            <article><h3>배경: 그대로 유지</h3><p>배경·포즈·조명을 그대로 두고 옷만 바꿉니다(기본값).</p></article>
            <article><h3>배경: 상황에 맞게 변환</h3><p>AI 추천 아이템을 입힐 때 입력한 상황(예: 면접)에 어울리는 배경으로 바꿉니다.</p></article>
            <article><h3>AI 모델</h3><p>Standard는 빠르고, Pro는 고품질입니다. Pro를 쓸 수 없는 계정이면 자동으로 Standard로 처리하고 알려 드립니다. [설정]에서 바꿉니다.</p></article>
            <article><h3>언어(KO/EN)</h3><p>화면 문구와 뷰티 조언 언어를 한국어/영어로 바꿉니다.</p></article>
          </div>
        </section>

        <section id="tips" className="card">
          <h2>⑤ 결과가 잘 나오는 요령</h2>
          <ul className="gd-list">
            <li>정면 또는 약간 비스듬한 <b>전신·상반신 사진</b>, 밝은 조명, 팔이 몸을 가리지 않는 사진이 좋습니다.</li>
            <li>아이템 이미지는 <b>배경이 단순하고 옷이 크게 나온 사진</b>이 가장 정확합니다. 모델이 입고 있는 사진은 옷만 보이게 잘라서 추가하세요.</li>
            <li>한 번에 아이템 한 개씩 입히세요. 여러 개를 쌓을 때는 [레이어드]로 차례대로 입히는 것이 안정적입니다.</li>
            <li>결과가 어색하면 [되돌리기] 후 같은 아이템을 다시 한 번 입혀 보세요. 매번 결과가 조금씩 다릅니다.</li>
          </ul>
        </section>

        <section id="privacy" className="card">
          <h2>⑥ 사진 보관·개인정보</h2>
          <div className="gd-table">
            <div><b>서버 저장 없음</b><span>올린 사진과 결과는 AIMaster 서버에 저장되지 않습니다. AI 처리를 위해 Google Gemini로 전송될 뿐이며, 본인 키 계정의 약관을 따릅니다.</span></div>
            <div><b>브라우저 보관</b><span>옷장·최근 룩·설정은 이 브라우저(회원별)에 저장됩니다. 옷장 아이템과 룩은 처음 저장한 날로부터 30일이 지나면 자동으로 지워지고(고쳐 저장해도 기간은 늘어나지 않음), 사이트 데이터를 지우면 바로 사라집니다.</span></div>
            <div><b>사용 권한</b><span>본인 사진 또는 사용 권한이 있는 사진만 올려 주세요. 타인의 사진을 무단으로 편집·유포하면 안 됩니다.</span></div>
          </div>
          <p className="gd-warn">⚠️ AI가 만든 이미지는 실제 착용 모습과 다를 수 있으니 구매 판단의 참고용으로만 사용하세요.</p>
        </section>

        <section id="faq" className="card">
          <h2>⑦ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“API 키 등록이 필요합니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>“안전 필터가 처리를 거부했습니다”라고 나와요.</summary><p>AI가 사진 또는 아이템을 처리하기 어렵다고 판단한 경우입니다. 정면이 잘 나온 밝은 사진, 노출이 과하지 않은 아이템으로 다시 시도해 보세요. 같은 사진으로 계속 거부되면 다른 사진을 사용해 주세요.</p></details>
            <details><summary>“사용 한도를 초과했습니다”라고 나와요.</summary><p>본인 Google 계정의 Gemini 한도가 찬 경우입니다. 잠시 후 다시 시도하거나 Google AI Studio에서 한도를 확인하세요.</p></details>
            <details><summary>웹 이미지 주소로 추가가 안 돼요.</summary><p>일부 사이트는 외부에서 이미지를 가져가지 못하게 막아 둡니다. 이미지를 내려받아 [사진 업로드]로 추가하거나 이미지를 복사해 Ctrl+V로 붙여넣으세요.</p></details>
            <details><summary>옷장이 비었어요.</summary><p>같은 브라우저·같은 계정으로 접속했는지 확인하세요. 시크릿 창이나 브라우저 데이터 삭제 후에는 보이지 않습니다.</p></details>
            <details><summary>결과 얼굴이 조금 달라 보여요.</summary><p>AI 이미지 편집의 한계입니다. 정면 고화질 사진을 쓰고, 변화가 큰 아이템은 한 번에 하나씩 입혀 보세요.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
