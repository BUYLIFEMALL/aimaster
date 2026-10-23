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
        <h2>① 내 파일은 어디로 가나요?</h2>
        <p className="gd-lead">올린 파일은 <b>서버로 전송·저장되지 않고</b> 지금 쓰는 브라우저 안에서만 읽고 처리한 뒤 내 컴퓨터로 바로 내려받습니다. 창을 닫으면 작업 내용은 남지 않습니다.</p>
      </section>

      <section className="card">
        <h2>② 엑셀 합치기</h2>
        <ol className="gd-steps">
          <Step n={1} title="파일 올리기">엑셀(.xlsx·.xls·.xlsm)과 CSV를 여러 개 끌어다 놓습니다. 화살표로 순서를 바꾸고, 파일마다 합칠 시트를 체크합니다(빈 시트는 처음부터 빠져 있습니다).</Step>
          <Step n={2} title="머리글 기준으로 이어 붙이기">같은 이름의 열끼리 맞춰 붙입니다. 파일마다 열 순서가 달라도, 한쪽에만 있는 열이 있어도 제자리에 들어가고 머리글은 한 번만 들어갑니다. 열 이름의 띄어쓰기·대소문자 차이는 같은 열로 봅니다. 머리글이 2행 이하에 있으면 "머리글 행"을 바꿔 주세요. "원본 파일·시트 열"을 켜면 어느 파일에서 온 행인지 맨 앞에 표시됩니다.</Step>
          <Step n={3} title="남길 열·순서와 같은 행 제거">"머리글 기준으로 이어 붙이기"에서는 2단계 아래 열 목록에서 체크를 끄면 그 열이 빠지고, 화살표로 열 순서를 바꿀 수 있습니다. "같은 행 제거"를 켜면 남긴 열의 값이 모두 같은 행은 처음 하나만 남깁니다(원본 파일·시트 열은 비교에서 빼고, 글자 앞뒤 공백은 무시). 미리보기에 뺀 행 수가 보입니다.</Step>
          <Step n={4} title="시트별로 모으기">고른 시트를 내용 그대로 한 파일의 여러 탭으로 모읍니다. 탭 이름은 "파일명_시트명"이며 엑셀 규칙(31자, 일부 기호 금지)에 맞게 자동으로 정리됩니다.</Step>
          <Step n={5} title="원본 서식 유지">"원본 서식 유지"를 켜면 글꼴·색·테두리·표시 형식(예: 1,000원)·열 너비를 원본 엑셀에서 가져옵니다. 이어 붙이기는 머리글 줄·열 너비를 그 열이 처음 나온 파일에서, 데이터 행은 각자 원래 파일의 서식을 씁니다. 시트별로 모으기는 시트를 병합 셀까지 그대로 복사합니다. .xlsx·.xlsm만 해당하며(.xls·CSV는 값만), 저장이 더 오래 걸려 결과 100만 칸(예: 10만 행 × 10열)까지 지원합니다.</Step>
          <Step n={6} title="저장">엑셀(.xlsx) 또는 CSV로 저장합니다. CSV는 엑셀에서 한글이 깨지지 않도록 저장합니다.</Step>
        </ol>
      </section>

      <section className="card">
        <h2>③ 엑셀 나누기</h2>
        <ol className="gd-steps">
          <Step n={1} title="시트별">시트마다 파일 하나로 나눕니다.</Step>
          <Step n={2} title="열 값별">고른 열(예: 지역·담당자)의 값이 같은 행끼리 파일 하나로 나눕니다. 빈 값은 "(빈 값)" 파일로 모입니다.</Step>
          <Step n={3} title="N행씩">정한 행 수씩 잘라 나눕니다. 열 값별·N행씩은 파일마다 머리글을 다시 넣습니다.</Step>
          <Step n={4} title="원본 서식 유지">.xlsx·.xlsm 파일이면 "원본 서식 유지"를 켤 수 있습니다. 나뉜 파일마다 원본의 글꼴·색·테두리·표시 형식·열 너비가 그대로 들어갑니다(시트별은 병합 셀까지). 저장이 더 오래 걸려 결과 100만 칸까지 지원합니다.</Step>
        </ol>
        <p className="gd-lead">결과 파일이 여러 개라 ZIP 하나로 내려받습니다. 기본은 값만 옮기고, "원본 서식 유지"를 켜면 색·테두리 등 서식도 함께 옮깁니다(.xlsx·.xlsm).</p>
      </section>

      <section className="card">
        <h2>④ 텍스트 합치기·나누기</h2>
        <ol className="gd-steps">
          <Step n={1} title="글자 인코딩">메모장에서 "ANSI"로 저장한 한글 파일도 자동으로 알아봅니다. 글자가 깨져 보이면 "글자 인코딩"을 직접 바꿔 보세요. 결과는 UTF-8로 저장합니다.</Step>
          <Step n={2} title="합치기">순서를 정하고 구분자(빈 줄·구분선·직접 입력)를 고릅니다. "[파일명] 줄 넣기"를 켜면 각 내용 앞에 원본 파일 이름이 들어갑니다.</Step>
          <Step n={3} title="나누기">"글자 수"는 한 조각이 정한 글자 수를 넘지 않게 문단 → 줄 → 문장 → 띄어쓰기 자리에서 자릅니다. "조각 수"는 길이를 비슷하게, "문장 수"는 문장 개수를 고르게 나눕니다. 나눈 조각을 이어 붙이면 원문과 똑같습니다.</Step>
        </ol>
      </section>

      <section className="card">
        <h2>⑤ 알아 두면 좋은 점</h2>
        <ul className="gd-list">
          <li>암호가 걸린 엑셀 파일은 열 수 없습니다. 엑셀에서 암호를 푼 뒤 올려 주세요.</li>
          <li>아주 큰 파일(수십 MB 이상)은 브라우저 메모리에 따라 느려질 수 있습니다.</li>
          <li>날짜는 날짜 그대로, 숫자는 숫자 그대로 옮깁니다. 수식은 계산된 값으로 저장됩니다.</li>
        </ul>
      </section>
    </div>
  );
}
