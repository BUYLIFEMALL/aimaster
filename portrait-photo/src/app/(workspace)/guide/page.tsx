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
          <p className="gd-warn">⚠️ 외교부 여권안내는 AI로 편집·가공·합성·생성한 사진을 허용하지 않는다고 명시하며(흰색 의상도 금지), 출입국 외국인등록용도 변형 사진을 허용하지 않습니다. 여권·주민등록증·운전면허 등 공식 서류에는 실제 촬영한 사진을 쓰세요. 이 프로그램은 통과를 보장하지 않으며, 제출 기관의 사진 규정을 반드시 확인해 주세요.</p>
        </section>

        <section id="privacy" className="card">
          <h2>⑤ 개인정보·주의</h2>
          <ul className="gd-list">
            <li>기본적으로 사진과 결과는 <b>서버에 저장되지 않습니다.</b> 생성 요청이 끝나면 폐기되고, 기록은 이 브라우저(최근 20장)에만 남습니다.</li>
            <li>[서버 보관함에도 저장]을 <b>직접 켠 경우에만</b> 결과 사진(원본 제외)이 비공개 저장소에 최대 30장 보관됩니다. 본인만 볼 수 있고 [내 기록]에서 언제든 삭제할 수 있습니다.</li>
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
            <details><summary>[머리 비율 검사]는 무엇인가요?</summary><p>선택한 규격의 공식 안내에 머리 높이 비율(정수리~턱이 사진 높이에서 차지하는 비율)이 있으면, AI가 결과 사진에서 정수리와 턱 위치를 추정해 범위 안인지 알려 줍니다. 본인 키로 1회 호출하며 추정치라 오차가 있습니다. 공식 기준을 확인하지 못한 규격은 검사하지 않습니다.</p></details>
            <details><summary>일괄 모드의 [일괄 머리 비율 검사 + 자동 확대 자르기]는 무엇인가요?</summary><p>여러 장을 올린 상태에서 규격에 공식 머리 높이 기준이 있으면, 사진마다 AI로 머리 위치를 추정해 기준보다 작게 나온 사진만 자동으로 확대 자르기 영역을 지정합니다. <b>사진 한 장당 본인 Gemini 키로 1회씩 호출</b>되므로 시작하기 전에 횟수를 안내하고 한 번 더 확인합니다. 결과는 사진별로 목록에 표시되고, 이어서 [규격으로 일괄 저장]을 누르면 지정된 영역으로 저장됩니다. 마음에 들지 않는 사진은 [자르기 영역 조정]으로 직접 고칠 수 있어요.</p></details>
            <details><summary>[자르기 영역 조정]은 무엇인가요?</summary><p>결과 사진에서 규격 크기로 저장될 영역을 원본 위에 표시하고, 오른쪽에 실제 저장될 모습을 미리 보여 줍니다. 사진 위를 끌거나 슬라이더로 위치·확대를 바꿀 수 있고, 머리 비율 검사를 했다면 머리 높이가 기준 범위 안인지도 함께 표시합니다. [추천 영역으로 되돌리기]로 처음 상태로 돌아갑니다. 저장한 조정 값은 규격별로 이 브라우저에 기억되어 [지난 조정 값 불러오기]로 다시 쓸 수 있고, 여러 장을 올린 일괄 모드에서는 사진마다 [이 사진의 영역으로 지정]한 뒤 [규격으로 일괄 저장]으로 한꺼번에 ZIP에 담을 수 있습니다(지정하지 않은 사진은 자동 중앙 자르기).</p></details>
            <details><summary>[얼굴 확대 자르기]는 무엇인가요?</summary><p>[머리 비율 검사]에서 머리가 기준보다 작게 나오면, 같은 사진을 얼굴 쪽으로 더 가깝게 잘라 규격 크기로 저장하는 버튼이 나타납니다. 머리 위치는 AI 추정이라 오차가 있고, 원본보다 확대되면 선명도가 낮아질 수 있어요. 결과는 눈으로 꼭 확인하세요.</p></details>
            <details><summary>일괄 모드에서 순서를 바꾸거나 일부만 저장할 수 있나요?</summary><p>[저장 이름] 목록의 ↑↓로 순서를 바꾸고 [제외]를 체크하면 [ZIP으로 전체 저장]에서 빠집니다.</p></details>
            <details><summary>배경이 완전한 흰색이 아니에요.</summary><p>[배경 순백 정리]를 켜 보세요. 그래도 남으면 증명사진 목적으로 다시 만들거나 배경을 ‘증명사진 순백’으로 고르세요.</p></details>
            <details><summary>여러 장을 한꺼번에 만들 수 있나요?</summary><p>사진을 여러 장(최대 6장) 선택해 올리면 같은 옵션으로 사진마다 1장씩 만들고, [전체 저장]으로 한꺼번에 내려받습니다. 장수만큼 본인 키 사용량이 늘어요.</p></details>
            <details><summary>규격 크기는 어디에서 왔나요?</summary><p>여권·주민등록증·운전면허 3.5×4.5cm(413×531px), 이력서 3×4cm(354×472px), 미국 비자 2×2인치(600×600px)는 흔히 쓰이는 크기입니다. 캐나다(canada.ca)·영국(gov.uk)·인도(passportindia.gov.in, indianvisaonline.gov.in)는 해당 공식 사이트 안내를 확인해 넣었고, 중국 비자 33×48mm 전자 사진은 자료마다 용량 기준이 달라 참고용입니다. 호주(35×45mm 인쇄 사진), 솅겐 비자, 태국 전자비자, 말레이시아 여권 온라인(사진관 형식 제출)은 공식 사이트에서 디지털 규격을 확인하지 못해 별도 규격을 넣지 않았습니다. 필리핀 여권은 사진을 DFA에서 직접 촬영하고, 브라질 여권은 3세 이상이면 PF 창구에서 촬영합니다(인쇄 5×7cm만 안내). 아랍에미리트(icp.gov.ae)는 3.5×4.5cm·흰 배경·얼굴 70~80%이며 디지털 픽셀 규격은 확인하지 못했습니다. 튀르키예는 영사관마다 50×60mm와 5×5cm가 달라 넣지 않았습니다. 스위스(fedpol.admin.ch)는 35×45mm·얼굴 높이 29mm 이상이며 디지털 규격은 안내가 없고, 남아프리카공화국은 지점에서 사진을 촬영합니다. 아일랜드(ireland.ie)는 715×951px 이상·JPEG·9MB 이하이며 디지털 원본만 받고 셀카·스캔을 허용하지 않습니다. 인도네시아 전자비자(evisa.imigrasi.go.id)는 4×6cm·400×600px 이상·머리 50~60%가 안내되어 있습니다. 독일은 2025년 5월 1일부터 신청 사진을 관청에서 촬영하거나 사진사가 보안 클라우드로 전송한 것만 받습니다(bmi.bund.de). 대만(boca.gov.tw)은 413×531px 이상 JPEG 5MB 이하이며 수정·거울상 사진을 받지 않습니다. 제출처의 최신 공지를 꼭 확인해 주세요.</p></details>
            <details><summary>기록이 사라졌어요.</summary><p>기록은 이 브라우저에만 저장됩니다. 브라우저 데이터 삭제·다른 기기·시크릿 창에서는 보이지 않습니다.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
