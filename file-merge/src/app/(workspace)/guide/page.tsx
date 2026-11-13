import { APP_NAME } from "@/lib/version";
import { PageHero } from "@/components/ui/PageHero";

const PIPELINE = [
  { ic: "🧭", title: "작업 고르기", desc: "합치기·나누기 × 엑셀·텍스트 4가지 중 하나", time: "5초" },
  { ic: "📂", title: "파일 올리기", desc: "끌어다 놓기, 순서는 화살표로", time: "10초" },
  { ic: "⚙️", title: "방식·옵션", desc: "머리글 행, 남길 열, 서식 유지, 나누는 기준", time: "30초" },
  { ic: "📥", title: "미리보고 저장", desc: "앞 20행 미리보기 → xlsx·csv·txt·zip", time: "바로" },
];

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return <li className="gd-step"><span className="gd-num">{n}</span><div><b>{title}</b><p>{children}</p></div></li>;
}

export default function GuidePage() {
  return (
    <div className="gd">
      <PageHero
        badge="📖 사용 매뉴얼"
        title={`${APP_NAME} 사용법`}
        description="엑셀·CSV·텍스트 파일을 합치고 나누는 도구입니다. 별도 API 키나 외부 계정 연동이 필요 없습니다."
      >
        <a className="button primary" href="/dashboard">🏠 작업 고르러 가기</a>
      </PageHero>

      <div className="gd-bubble">
        <span className="gd-avatar" aria-hidden="true">🗂️</span>
        <div className="card">
          안녕하세요, 파일 정리 도우미예요! 지점별·월별로 흩어진 엑셀을 <b>한 표로 모으거나</b>, 큰 파일을 <b>담당자별·N행씩 나누는</b> 일을
          몇 번의 클릭으로 끝내 드려요. 파일은 <b>이 브라우저 밖으로 나가지 않으니</b> 안심하세요.
        </div>
      </div>

      <section className="card" aria-label="사용 흐름">
        <ol className="gd-pipeline">
          {PIPELINE.map((p, i) => (
            <li key={p.title}>
              <span className="gd-top"><span className="gd-num">{i + 1}</span><span className="gd-time">⏱ {p.time}</span></span>
              <span className="gd-ic" aria-hidden="true">{p.ic}</span>
              <strong>{p.title}</strong>
              <small className="muted">{p.desc}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>1. 내 파일은 어디로 가나요?</h2>
        <p className="gd-lead">올린 파일은 <b>서버로 전송·저장되지 않고</b> 지금 쓰는 브라우저 안에서만 읽고 처리한 뒤 내 컴퓨터로 바로 내려받습니다. 창을 닫거나 다른 메뉴로 옮기면 올린 파일과 고른 옵션은 남지 않으니, 결과는 그 자리에서 저장해 주세요. 서버에 보관하는 자료가 없어 저장공간을 쓰지 않고, 따로 지울 것도 없습니다.</p>
      </section>

      <section className="card">
        <h2>2. 엑셀 합치기</h2>
        <ol className="gd-steps">
          <Step n={1} title="파일 올리기">엑셀(.xlsx·.xls·.xlsm)과 CSV를 여러 개 끌어다 놓습니다. 화살표로 순서를 바꾸고, 파일마다 합칠 시트를 체크합니다(빈 시트는 처음부터 빠져 있습니다).</Step>
          <Step n={2} title="머리글 기준으로 이어 붙이기">같은 이름의 열끼리 맞춰 붙입니다. 파일마다 열 순서가 달라도, 한쪽에만 있는 열이 있어도 제자리에 들어가고 머리글은 한 번만 들어갑니다. 열 이름의 띄어쓰기·대소문자 차이는 같은 열로 봅니다. 머리글이 2행 이하에 있으면 "머리글 행"을 1~5행 중에서 바꿔 주세요. 머리글이 없는 표는 "머리글 없음"을 고르면 열1·열2… 이름으로 맞춥니다. "원본 파일·시트 열"을 켜면 어느 파일에서 온 행인지 맨 앞에 표시됩니다.</Step>
          <Step n={3} title="남길 열·순서와 같은 행 제거">"머리글 기준으로 이어 붙이기"에서는 2단계 아래 열 목록에서 체크를 끄면 그 열이 빠지고, 화살표로 열 순서를 바꿀 수 있습니다. "같은 행 제거"를 켜면 남긴 열의 값이 모두 같은 행은 처음 하나만 남깁니다(원본 파일·시트 열은 비교에서 빼고, 글자 앞뒤 공백은 무시). 미리보기에 뺀 행 수가 보입니다.</Step>
          <Step n={4} title="시트별로 모으기">고른 시트를 내용 그대로 한 파일의 여러 탭으로 모읍니다. 탭 이름은 "파일명_시트명"이며 엑셀 규칙(31자, 일부 기호 금지)에 맞게 자동으로 정리됩니다.</Step>
          <Step n={5} title="원본 서식 유지">"원본 서식 유지"를 켜면 글꼴·색·테두리·표시 형식(예: 1,000원)·열 너비를 원본 엑셀에서 가져옵니다. 이어 붙이기는 머리글 줄·열 너비를 그 열이 처음 나온 파일에서, 데이터 행은 각자 원래 파일의 서식을 씁니다. 시트별로 모으기는 시트를 병합 셀까지 그대로 복사합니다. .xlsx·.xlsm만 해당하며(.xls·CSV는 값만), 저장이 더 오래 걸려 결과 100만 칸(예: 10만 행 × 10열)까지 지원합니다.</Step>
          <Step n={6} title="미리보기 확인">3번 칸에 합친 결과의 앞 20행과 전체 행·열 수가 보입니다. 옵션을 바꾸면 바로 다시 계산됩니다. CSV 글자가 깨져 보이면 "CSV 글자 인코딩"을 "한국어 ANSI(CP949)"나 "UTF-8"로 바꿔 보세요.</Step>
          <Step n={7} title="저장">"저장할 이름"을 적고 "합쳐서 저장"을 누르면 엑셀(.xlsx) 또는 CSV로 내려받습니다. CSV는 엑셀에서 한글이 깨지지 않도록 저장합니다.</Step>
        </ol>
      </section>

      <section className="card">
        <h2>3. 엑셀 나누기</h2>
        <ol className="gd-steps">
          <Step n={1} title="시트별">엑셀 또는 CSV 파일 하나를 올린 뒤 고릅니다. 시트마다 파일 하나로 나눕니다(시트가 1개면 결과도 1개라 아래 두 방식을 쓰세요).</Step>
          <Step n={2} title="열 값별">고른 열(예: 지역·담당자)의 값이 같은 행끼리 파일 하나로 나눕니다. 빈 값은 "(빈 값)" 파일로 모입니다.</Step>
          <Step n={3} title="N행씩">정한 행 수씩 잘라 나눕니다. 열 값별·N행씩은 파일마다 머리글을 다시 넣습니다.</Step>
          <Step n={4} title="원본 서식 유지">.xlsx·.xlsm 파일이면 "원본 서식 유지"를 켤 수 있습니다. 나뉜 파일마다 원본의 글꼴·색·테두리·표시 형식·열 너비가 그대로 들어갑니다(시트별은 병합 셀까지). 저장이 더 오래 걸려 결과 100만 칸까지 지원합니다.</Step>
        </ol>
        <p className="gd-lead">3번 칸에서 만들어질 파일 이름과 행 수를 먼저 확인할 수 있습니다(목록은 앞 50개까지 표시). 결과 파일이 여러 개라 ZIP 하나로 내려받으며, 한 번에 최대 500개 파일까지 저장할 수 있습니다. 500개를 넘으면 나누는 기준(열·행 수)을 바꿔 주세요. 기본은 값만 옮기고, "원본 서식 유지"를 켜면 색·테두리 등 서식도 함께 옮깁니다(.xlsx·.xlsm).</p>
      </section>

      <section className="card">
        <h2>4. 텍스트 합치기·나누기</h2>
        <ol className="gd-steps">
          <Step n={1} title="글자 인코딩">메모장에서 "ANSI"로 저장한 한글 파일도 자동으로 알아봅니다. 글자가 깨져 보이면 "글자 인코딩"을 직접 바꿔 보세요. 결과는 UTF-8로 저장합니다.</Step>
          <Step n={2} title="합치기">텍스트 파일(.txt·.md·.log·.csv)을 2개 이상 올리고 화살표로 순서를 정한 뒤 구분자(빈 줄·구분선·바로 이어서·직접 입력)를 고릅니다. 직접 입력에서는 \n이 줄바꿈, \t가 탭입니다. "[파일명] 줄 넣기"를 켜면 각 내용 앞에 원본 파일 이름이 들어갑니다. 미리보기에는 합친 글의 앞 3,000자가 보입니다.</Step>
          <Step n={3} title="나누기">"글자 수"는 한 조각이 정한 글자 수를 넘지 않게 문단 → 줄 → 문장 → 띄어쓰기 자리에서 자릅니다. "조각 수"는 길이를 비슷하게, "문장 수"는 문장 개수를 고르게 나눕니다. 나눈 조각을 이어 붙이면 원문과 똑같습니다. 결과는 "파일명_01.txt"처럼 번호가 붙은 파일들이 ZIP 하나로 저장되며, 조각은 최대 1,000개까지입니다.</Step>
        </ol>
      </section>

      <section className="card">
        <h2>5. 알아 두면 좋은 점</h2>
        <ul className="gd-list">
          <li>암호가 걸린 엑셀 파일은 열 수 없습니다. 엑셀에서 암호를 푼 뒤 올려 주세요.</li>
          <li>아주 큰 파일(수십 MB 이상)은 브라우저 메모리에 따라 느려질 수 있습니다.</li>
          <li>날짜는 날짜 그대로, 숫자는 숫자 그대로 옮깁니다. 수식은 계산된 값으로 저장됩니다.</li>
          <li>올릴 수 있는 파일은 엑셀(.xlsx·.xls·.xlsm)·CSV와 텍스트(.txt·.md·.log)입니다. 한글(HWP)·PDF·워드 파일은 다루지 않습니다.</li>
          <li>"원본 서식 유지"는 .xlsx·.xlsm에서만 켤 수 있고 결과가 100만 칸을 넘으면 저장되지 않습니다. 그럴 때는 서식 유지를 끄고 값만 저장하거나 파일을 나눠 작업해 주세요.</li>
        </ul>
      </section>

      <section className="card">
        <h2>6. 자주 묻는 질문</h2>
        <ol className="gd-steps">
          <Step n={1} title="API 키나 외부 계정 연동이 필요한가요?">필요 없습니다. AI 호출이나 외부 서비스 연결 없이 브라우저 안에서만 계산하므로, 로그인만 하면 바로 쓸 수 있고 사용량에 따른 추가 요금도 없습니다.</Step>
          <Step n={2} title="지난번에 합친 결과를 다시 받을 수 있나요?">받을 수 없습니다. 올린 파일과 결과를 서버에 보관하지 않기 때문에, 창을 닫으면 다시 파일을 올려 처음부터 해야 합니다. 저장한 결과 파일은 내 컴퓨터의 내려받기 폴더에 있습니다.</Step>
          <Step n={3} title="합쳤더니 열이 둘로 나뉘어 들어갔어요.">열 이름이 서로 다르면(예: "연락처"와 "전화번호") 다른 열로 봅니다. 띄어쓰기·대소문자 차이만 같은 열로 맞춥니다. 원본 파일의 열 이름을 하나로 맞춘 뒤 다시 올리거나, 머리글이 실제로 있는 줄로 "머리글 행"을 맞췄는지 확인해 주세요.</Step>
          <Step n={4} title="큰 파일을 올리면 화면이 멈춘 것 같아요.">엑셀 처리는 화면 뒤에서 따로 돌아가므로 "읽는 중…"·"파일을 만드는 중…" 표시가 사라질 때까지 기다려 주세요. 계속 느리면 다른 탭을 닫아 메모리를 비우거나 파일을 나눠 올려 주세요.</Step>
          <Step n={5} title="같은 계정으로 여러 기기에서 쓸 수 있나요?">같은 계정으로 PC 1곳과 모바일 1곳에서 동시에 쓸 수 있습니다. 같은 종류의 기기에서 새로 로그인하면 그 종류의 이전 로그인만 끊깁니다.</Step>
        </ol>
      </section>
    </div>
  );
}
