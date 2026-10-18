import { GuideLinkButton } from "@/components/workspace/GuideLinkButton";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
import { PURPOSES } from "@/lib/portrait/purposes";

// v1.22 비주얼 매뉴얼 — 그림은 이모티콘·CSS 도형만 사용(이미지 생성 비용 없음)
const FLOW = [
  { icon: "📷", title: "사진 올리기", desc: "정면·밝은 사진 1장 (일괄은 최대 6장)" },
  { icon: "🎯", title: "목적·옵션", desc: "목적 하나로 비율·조명·배경·복장이 한 번에" },
  { icon: "✨", title: "만들기", desc: "후보 1~4장을 만들고 비교해서 고르기" },
  { icon: "💾", title: "저장·규격", desc: "PNG 저장 또는 증명사진 규격으로 저장" },
];
const GOOD = [
  { icon: "🙂", text: "얼굴이 정면에 가깝고 눈·코·입이 또렷한 사진" },
  { icon: "💡", text: "그늘 없이 밝은 곳에서 찍은 사진" },
  { icon: "🖼️", text: "어깨까지 보이고 화질이 선명한 원본" },
];
const BAD = [
  { icon: "🕶️", text: "모자·선글라스·마스크로 얼굴이 가려진 사진" },
  { icon: "🌫️", text: "어둡거나 흔들린 사진, 강한 필터·보정 앱 사진" },
  { icon: "👥", text: "여러 사람이 함께 나온 사진, 너무 멀리서 찍은 사진" },
];
const SIZES = [
  { label: "여권·신분증·면허", spec: "3.5×4.5cm · 413×531px", w: 52, h: 67 },
  { label: "이력서", spec: "3×4cm · 354×472px", w: 45, h: 60 },
  { label: "미국 비자", spec: "2×2인치 · 600×600px", w: 60, h: 60 },
];

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
        <section className="card gd-hero">
          <span className="gd-mascot" aria-hidden="true">📸</span>
          <div className="gd-bubble">
            <strong>안녕하세요, 사진관 실장 &lsquo;찰칵이&rsquo;예요!</strong>
            사진 한 장만 올리면 증명사진·비즈니스 프로필·SNS·시네마틱 화보까지 목적에 맞게 만들어 드려요. 처음이라면 ① 키 등록 → ② 5분 시작하기 순서로 따라와 주세요.
          </div>
        </section>

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
          <ol className="gd-flow" aria-label="4단계 흐름">
            {FLOW.map((f, i) => (
              <li key={f.title}><em>STEP {i + 1}</em><b aria-hidden="true">{f.icon}</b><strong>{f.title}</strong><small>{f.desc}</small></li>
            ))}
          </ol>
          <h3>촬영 목적 5가지 한눈에 보기</h3>
          <div className="gd-purposes">
            {PURPOSES.map((p) => (
              <article key={p.id}>
                <b aria-hidden="true">{p.icon}</b>
                <strong>{p.label}</strong>
                <span className="tag">{p.badge}</span>
                <p>{p.desc}</p>
                <small>비율 {p.aspect}</small>
              </article>
            ))}
          </div>
          <h3>자세한 순서</h3>
          <ol className="gd-steps">
            <Step n={1} title="촬영 목적 고르기">증명사진·비즈니스·SNS·시네마틱·자유 중 하나를 고르면 비율·조명·배경·복장·포즈가 한 번에 맞춰집니다.</Step>
            <Step n={2} title="사진 올리고 확인 체크">정면이 잘 나온 밝은 사진을 올리고, 본인(또는 동의받은) 사진임을 체크합니다. 전면 카메라 셀카라면 [셀카입니다]를 켭니다.</Step>
            <Step n={3} title="옵션 다듬기">오른쪽에서 조명·배경·포즈·복장·피부 질감·필름 룩을 바꿀 수 있어요. 왼쪽 보정 4종으로 입꼬리·어깨·잔머리·눈높이를 자연스럽게 다듬습니다.</Step>
            <Step n={4} title="만들기 → 저장">[인물 사진 만들기]를 누르고, 결과가 나오면 밝기·대비를 조정한 뒤 [PNG 저장] 또는 [증명사진 413×531px]로 저장합니다.</Step>
          </ol>
        </section>

        <section id="tips" className="card">
          <h2>③ 잘 나오는 요령</h2>
          <div className="gd-dodont">
            <article className="good">
              <h3>⭕ 이런 사진이 잘 나와요</h3>
              <ul>{GOOD.map((g) => <li key={g.text}><b aria-hidden="true">{g.icon}</b>{g.text}</li>)}</ul>
            </article>
            <article className="bad">
              <h3>❌ 이런 사진은 피해 주세요</h3>
              <ul>{BAD.map((g) => <li key={g.text}><b aria-hidden="true">{g.icon}</b>{g.text}</li>)}</ul>
            </article>
          </div>
          <ul className="gd-list" style={{ marginTop: 14 }}>
            <li>얼굴이 가려지지 않은 정면·밝은 사진이 가장 닮게 나옵니다. 모자·선글라스·강한 필터는 피하세요.</li>
            <li>결과가 본인과 다르게 느껴지면 같은 설정으로 다시 만들거나 보정 옵션을 줄여 보세요(보정이 많을수록 변형 가능성이 커집니다).</li>
            <li>먼저 <b>빠른 생성(Flash)·1K</b>로 구도를 확인하고, 마음에 들면 Pro·2K로 한 번 더 만드세요.</li>
            <li>AI가 만든 사진은 실제와 다를 수 있습니다. 중요한 용도에는 결과를 꼭 눈으로 확인하세요.</li>
          </ul>
        </section>

        <section id="id" className="card">
          <h2>④ 증명사진 저장</h2>
          <p className="gd-lead">자주 쓰는 규격 크기 비교 (실제 비율로 그린 그림)</p>
          <div className="gd-sizes">
            {SIZES.map((s) => (
              <div key={s.label} className="gd-size"><i style={{ width: s.w, height: s.h }} aria-hidden="true" /><strong>{s.label}</strong>{s.spec}</div>
            ))}
          </div>
          <div className="gd-headratio">
            <div className="frame" aria-hidden="true"><span className="face" /><span className="crown" /><span className="chin" /></div>
            <ol className="gd-steps">
              <Step n={1} title="규격 고르기">결과 화면에서 저장할 규격(국내·해외 여권·비자 등)을 고릅니다.</Step>
              <Step n={2} title="머리 비율 검사">파란 선(정수리)~주황 선(턱) 높이가 공식 기준 범위 안인지 AI가 추정해 알려 줍니다.</Step>
              <Step n={3} title="규격 저장 (추천 영역 자동)">머리 위치를 알고 있으면 [규격 저장]이 기준에 맞춘 추천 영역으로 자동 저장합니다(작으면 얼굴 쪽으로 확대, 범위 안이면 얼굴을 가운데로). 직접 바꾸고 싶으면 [자르기 영역 조정]을 쓰세요.</Step>
            </ol>
          </div>
          <ul className="gd-list" style={{ marginTop: 14 }}>
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
            <details><summary>일괄 모드의 [일괄 머리 비율 검사 + 자동 확대 자르기]는 무엇인가요?</summary><p>여러 장을 올린 상태에서 규격에 공식 머리 높이 기준이 있으면, 사진마다 AI로 머리 위치를 추정해 기준보다 작게 나온 사진만 자동으로 확대 자르기 영역을 지정합니다. <b>사진 한 장당 본인 Gemini 키로 1회씩 호출</b>되므로 시작하기 전에 횟수를 안내하고 한 번 더 확인합니다. 결과는 사진별로 목록에 표시되고, 이어서 [규격으로 일괄 저장]을 누르면 지정된 영역으로 저장됩니다. 마음에 들지 않는 사진은 [자르기 영역 조정]으로 직접 고칠 수 있어요. 얼굴을 찾지 못한 사진은 [얼굴 없음 N장만 다시 검사]로 그 사진만 다시 검사하고(해당 장수만큼 호출), 단일 [규격 저장]과 같은 기준으로, 머리 비율이 범위 안인 사진은 얼굴을 가로 가운데로 맞추고 큰 사진은 머리가 잘리지 않게 위치만 맞춥니다(옵션 없이 항상 적용). 검사하지 않았더라도 머리 위치를 아는 사진은 [규격으로 일괄 저장] 때 같은 추천 영역이 쓰입니다. 검사 결과 목록의 각 사진에서 [영역 조정]으로 바로 그 사진의 자르기 영역을 열 수 있고, 얼굴을 못 찾은 사진은 [얼굴 위치 직접 지정]으로 사진에서 ① 정수리 ② 턱 끝을 차례로 클릭하면 그 위치를 기준으로 확대 자르기 영역이 계산됩니다(AI 호출 없음). 한 번 얻은 머리 위치(AI 추정·직접 지정)는 <b>규격을 바꿔도 다시 쓰이며</b>, 규격을 바꾸면 AI를 다시 부르지 않고 새 규격의 기준으로 자르기 영역과 결과 목록을 바로 다시 계산합니다. 목록에는 사진 썸네일이 함께 표시됩니다.</p></details>
            <details><summary>[자르기 영역 조정]은 무엇인가요?</summary><p>결과 사진에서 규격 크기로 저장될 영역을 원본 위에 표시하고, 오른쪽에 실제 저장될 모습을 미리 보여 줍니다. 사진 위를 끌거나 슬라이더로 위치·확대를 바꿀 수 있고, 머리 비율 검사를 했다면 머리 높이가 기준 범위 안인지도 함께 표시합니다. [추천 영역으로 되돌리기]로 처음 상태로 돌아갑니다. 저장한 조정 값은 규격별로 이 브라우저에 기억되어 [지난 조정 값 불러오기]로 다시 쓸 수 있고, 여러 장을 올린 일괄 모드에서는 사진마다 [이 사진의 영역으로 지정]한 뒤 [규격으로 일괄 저장]으로 한꺼번에 ZIP에 담을 수 있습니다(지정하지 않은 사진은 자동 중앙 자르기).</p></details>
            <details><summary>[규격 저장]의 「추천 영역」은 무엇인가요?</summary><p>AI가 만든 증명사진은 머리가 기준보다 작게 나오는 경우가 많습니다. [머리 비율 검사(AI 1회)]나 [자르기 영역 조정]의 얼굴 위치 직접 지정(무료)으로 머리 위치를 한 번 알려 주면, [규격 저장]이 그 규격의 공식 머리 기준에 맞춰 자동으로 잘라 저장합니다. 작게 나오면 얼굴 쪽으로 확대하고, 범위 안이면 얼굴만 가로 가운데로 맞추며, 크게 나오면 원본 크기 한계로 더 줄일 수 없어 머리가 잘리지 않게 위치만 맞춥니다(이때는 상체가 더 보이게 다시 만들어 주세요). 머리 위치를 모르면 예전처럼 가운데를 자릅니다. 추가 AI 호출은 없으며, 머리 위치는 추정값이라 오차가 있고 원본보다 확대되면 선명도가 낮아질 수 있어요. 결과는 눈으로 꼭 확인하세요.</p></details>
            <details><summary>[프로필 세트 미리보기·저장]은 무엇인가요?</summary><p>같은 결과 사진으로 SNS·메신저용 프로필 사진 3장(정사각 1:1 1080×1080, 세로 4:5 1080×1350, 바깥이 투명한 원형 PNG)을 만들어 먼저 저장될 모양 그대로 미리 보여 주고, [ZIP으로 저장]을 누르면 ZIP 하나로 저장합니다. 원형의 바깥은 투명 또는 흰색 중에서 고를 수 있습니다(투명 부분을 검게 보여 주는 메신저는 흰색). 머리 위치(머리 비율 검사·얼굴 위치 직접 지정)를 알면 얼굴을 기준으로 어깨까지 보이게 자르고, 모르면 위쪽 가운데를 자릅니다. AI 호출이 없고 사진은 서버에 저장되지 않습니다.</p></details>
            <details><summary>일괄 모드에서 순서를 바꾸거나 일부만 저장할 수 있나요?</summary><p>[저장 이름] 목록의 ↑↓로 순서를 바꾸고 [제외]를 체크하면 [ZIP으로 전체 저장]에서 빠집니다.</p></details>
            <details><summary>배경이 완전한 흰색이 아니에요.</summary><p>[배경 순백 정리]를 켜 보세요. 그래도 남으면 증명사진 목적으로 다시 만들거나 배경을 ‘증명사진 순백’으로 고르세요.</p></details>
            <details><summary>여러 장을 한꺼번에 만들 수 있나요?</summary><p>사진을 여러 장(최대 6장) 선택해 올리면 같은 옵션으로 사진마다 1장씩 만들고, [전체 저장]으로 한꺼번에 내려받습니다. 장수만큼 본인 키 사용량이 늘어요.</p></details>
            <details><summary>규격 크기는 어디에서 왔나요?</summary><p>여권·주민등록증·운전면허 3.5×4.5cm(413×531px), 이력서 3×4cm(354×472px), 미국 비자 2×2인치(600×600px)는 흔히 쓰이는 크기입니다. 캐나다(canada.ca)·영국(gov.uk)·인도(passportindia.gov.in, indianvisaonline.gov.in)는 해당 공식 사이트 안내를 확인해 넣었고, 중국 비자 33×48mm 전자 사진은 자료마다 용량 기준이 달라 참고용입니다. 호주(35×45mm 인쇄 사진), 솅겐 비자, 태국 전자비자, 말레이시아 여권 온라인(사진관 형식 제출)은 공식 사이트에서 디지털 규격을 확인하지 못해 별도 규격을 넣지 않았습니다. 필리핀 여권은 사진을 DFA에서 직접 촬영하고, 브라질 여권은 3세 이상이면 PF 창구에서 촬영합니다(인쇄 5×7cm만 안내). 아랍에미리트(icp.gov.ae)는 3.5×4.5cm·흰 배경·얼굴 70~80%이며 디지털 픽셀 규격은 확인하지 못했습니다. 튀르키예는 영사관마다 50×60mm와 5×5cm가 달라 넣지 않았습니다. 스위스(fedpol.admin.ch)는 35×45mm·얼굴 높이 29mm 이상이며 디지털 규격은 안내가 없고, 남아프리카공화국은 지점에서 사진을 촬영합니다. 폴란드(gov.pl)는 신분증 전자 신청 기준 492×633px 이상·2.5MB 이하·얼굴 70~80%(여권 전자 사양은 확인 못 함), 오스트리아(bmi.gv.at)와 체코(mzv.cz)는 인쇄 사진 기준(35×45mm, 머리 약 2/3·최대 36mm)만 있고 디지털 규격이 없습니다. 네덜란드(rijksoverheid.nl)는 35×45mm·인쇄 400dpi 이상이며 픽셀 규격은 없고, 스웨덴은 경찰서에서 직접 촬영해 개인 사진을 받지 않습니다. 호주(immi.homeaffairs.gov.au)는 시민권 신청 안내 기준으로 JPEG 70KB~3.5MB·선호 해상도 1200×1600px이며 편집하지 않은 원본만 받습니다. 아일랜드(ireland.ie)는 715×951px 이상·JPEG·9MB 이하이며 디지털 원본만 받고 셀카·스캔을 허용하지 않습니다. 인도네시아 전자비자(evisa.imigrasi.go.id)는 4×6cm·400×600px 이상·머리 50~60%가 안내되어 있습니다. 독일은 2025년 5월 1일부터 신청 사진을 관청에서 촬영하거나 사진사가 보안 클라우드로 전송한 것만 받습니다(bmi.bund.de). 대만(boca.gov.tw)은 413×531px 이상 JPEG 5MB 이하이며 수정·거울상 사진을 받지 않습니다. 제출처의 최신 공지를 꼭 확인해 주세요.</p></details>
            <details><summary>기록이 사라졌어요.</summary><p>기록은 이 브라우저에만 저장됩니다. 브라우저 데이터 삭제·다른 기기·시크릿 창에서는 보이지 않습니다.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
