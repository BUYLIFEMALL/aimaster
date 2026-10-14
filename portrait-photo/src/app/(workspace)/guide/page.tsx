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
        <p>본인 Gemini 키를 한 번 등록하면, 사진 한 장으로 목적에 맞는 인물 사진을 만들 수 있습니다.</p>
      </div>
      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#key">① 키 등록(최초 1회)</a>
          <a href="#quick">② 5분 시작하기</a>
          <a href="#tips">③ 잘 나오는 요령</a>
          <a href="#id">④ 증명사진 저장</a>
          <a href="#privacy">⑤ 개인정보·주의</a>
          <a href="#faq">⑥ 막힐 때(FAQ)</a>
        </nav>

        <section id="key" className="card">
          <h2>① Gemini API 키 등록 (최초 1회)</h2>
          <p className="gd-lead">이미지 생성은 <b>회원님 본인의 Google Gemini API 키</b>로 동작합니다. 운영자나 다른 회원의 키로 대신 처리되지 않습니다.</p>
          <ol className="gd-steps">
            <Step n={1} title="키 만들기"><code>aistudio.google.com/apikey</code>에서 본인 Google 계정으로 로그인 → [Create API key] → <code>AIza…</code> 키를 복사합니다.</Step>
            <Step n={2} title="이 프로그램에 등록">왼쪽 메뉴 [API키등록·플랫폼연동]에서 붙여 넣고 [키 등록] → [연결 확인]을 누릅니다.</Step>
          </ol>
          {GEMINI_GUIDE_URL && <div className="actions" style={{ marginTop: 14 }}><GuideLinkButton url={GEMINI_GUIDE_URL} label="Gemini 키 발급 상세 매뉴얼 (그림 포함, 팝업)" /></div>}
          <p className="gd-warn">⚠️ 이미지 생성은 누를 때마다 본인 Gemini 키 사용량으로 계산됩니다. 이미지 모델은 무료 한도가 없거나 유료 설정이 필요할 수 있어요. Pro·2K/4K일수록 비용이 늘어납니다.</p>
        </section>

        <section id="quick" className="card">
          <h2>② 5분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="촬영 목적 고르기">증명사진·비즈니스·SNS·시네마틱·자유 중 하나를 고르면 비율·조명·배경·복장·포즈가 한 번에 맞춰집니다.</Step>
            <Step n={2} title="사진 올리고 확인 체크">정면이 잘 나온 밝은 사진을 올리고, 본인(또는 동의받은) 사진임을 체크합니다. 전면 카메라 셀카라면 [셀카입니다]를 켭니다.</Step>
            <Step n={3} title="옵션 다듬기">오른쪽에서 조명·배경·포즈·복장·피부 질감·필름 룩을 바꿀 수 있어요. 왼쪽 보정 4종으로 입꼬리·어깨·잔머리·눈높이를 자연스럽게 다듬습니다.</Step>
            <Step n={4} title="만들기 → 저장">[인물 사진 만들기]를 누르고, 결과가 나오면 밝기·대비를 조정한 뒤 [PNG 저장] 또는 [증명사진 413×531px]로 저장합니다.</Step>
          </ol>
        </section>

        <section id="tips" className="card">
          <h2>③ 잘 나오는 요령</h2>
          <ul className="gd-list">
            <li>얼굴이 가려지지 않은 정면·밝은 사진이 가장 닮게 나옵니다. 모자·선글라스·강한 필터는 피하세요.</li>
            <li>결과가 본인과 다르게 느껴지면 같은 설정으로 다시 만들거나 보정 옵션을 줄여 보세요(보정이 많을수록 변형 가능성이 커집니다).</li>
            <li>먼저 <b>빠른 생성(Flash)·1K</b>로 구도를 확인하고, 마음에 들면 Pro·2K로 한 번 더 만드세요.</li>
            <li>AI가 만든 사진은 실제와 다를 수 있습니다. 중요한 용도에는 결과를 꼭 눈으로 확인하세요.</li>
          </ul>
        </section>

        <section id="id" className="card">
          <h2>④ 증명사진 저장</h2>
          <ul className="gd-list">
            <li><b>배경 순백 정리</b>: 가장자리와 이어진 밝은 배경만 순백(#FFFFFF)으로 바꿉니다. 밝은 머리·옷이 배경과 닿아 있으면 번질 수 있으니 결과를 확인하세요.</li>
            <li><b>증명사진 413×531px</b>: 면허·신분증 온라인 제출에서 흔히 쓰는 크기·250KB 이하 JPEG로 저장합니다.</li>
          </ul>
          <p className="gd-warn">⚠️ 여권·주민등록증·운전면허 등 공식 서류는 AI로 만들거나 크게 보정한 사진을 받지 않을 수 있습니다. 이 프로그램은 통과를 보장하지 않으며, 제출 기관의 사진 규정을 반드시 확인해 주세요.</p>
        </section>

        <section id="privacy" className="card">
          <h2>⑤ 개인정보·주의</h2>
          <ul className="gd-list">
            <li>사진과 결과는 <b>서버에 저장되지 않습니다.</b> 생성 요청이 끝나면 폐기되고, 기록은 이 브라우저(최근 20장)에만 남습니다.</li>
            <li>본인 또는 사용 동의를 받은 사진만 사용하세요. 타인·유명인 사칭, 허위 서류 제작에 쓸 수 없습니다.</li>
            <li>사진은 생성을 위해 Google Gemini로 전송됩니다. 개인정보가 많이 드러난 사진은 올리지 않는 것이 좋습니다.</li>
          </ul>
        </section>

        <section id="faq" className="card">
          <h2>⑥ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>“Gemini API 키가 등록되지 않았습니다”라고 나와요.</summary><p>①의 순서대로 본인 키를 등록하세요. 키는 다른 회원이나 운영자와 공유되지 않습니다.</p></details>
            <details><summary>“안전 필터가 거부했습니다”라고 나와요.</summary><p>얼굴이 선명하고 노출이 과하지 않은 사진으로 바꾸고, 포즈·복장을 단정한 쪽으로 바꿔 다시 시도하세요.</p></details>
            <details><summary>“사용 한도를 초과했습니다”라고 나와요.</summary><p>잠시 후 다시 시도하거나 본인 Google 계정의 한도·결제 설정을 확인하세요. Flash 모델·1K로 먼저 시도하면 가볍습니다.</p></details>
            <details><summary>결과 사진의 좌우가 원본과 달라요.</summary><p>[셀카입니다]를 켜면 입력 사진을 좌우 반전해 남들이 보는 방향으로 만듭니다. 후면 카메라·타인이 찍어 준 사진은 꺼 두세요. 결과 화면의 [거울상으로 보기]로 비교할 수 있어요.</p></details>
            <details><summary>배경이 완전한 흰색이 아니에요.</summary><p>[배경 순백 정리]를 켜 보세요. 그래도 남으면 증명사진 목적으로 다시 만들거나 배경을 ‘증명사진 순백’으로 고르세요.</p></details>
            <details><summary>기록이 사라졌어요.</summary><p>기록은 이 브라우저에만 저장됩니다. 브라우저 데이터 삭제·다른 기기·시크릿 창에서는 보이지 않습니다.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
