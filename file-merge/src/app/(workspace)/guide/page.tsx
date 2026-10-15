import { APP_NAME } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return <li className="gd-step"><span className="gd-num">{n}</span><div><b>{title}</b><p>{children}</p></div></li>;
}

export default function GuidePage() {
  return (
    <div className="gd">
      <div className="page-heading">
        <p className="eyebrow">사용 매뉴얼</p>
        <h1>{APP_NAME} 사용법</h1>
        <p>엑셀·CSV·텍스트 파일을 합치고 나누는 도구입니다. 별도 API 키나 외부 계정 연동이 필요 없습니다.</p>
      </div>

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
          <Step n={5} title="저장">엑셀(.xlsx) 또는 CSV로 저장합니다. CSV는 엑셀에서 한글이 깨지지 않도록 저장합니다.</Step>
        </ol>
      </section>

      <section className="card">
        <h2>③ 엑셀 나누기</h2>
        <ol className="gd-steps">
          <Step n={1} title="시트별">시트마다 파일 하나로 나눕니다.</Step>
          <Step n={2} title="열 값별">고른 열(예: 지역·담당자)의 값이 같은 행끼리 파일 하나로 나눕니다. 빈 값은 "(빈 값)" 파일로 모입니다.</Step>
          <Step n={3} title="N행씩">정한 행 수씩 잘라 나눕니다. 열 값별·N행씩은 파일마다 머리글을 다시 넣습니다.</Step>
        </ol>
        <p className="gd-lead">결과 파일이 여러 개라 ZIP 하나로 내려받습니다. 엑셀 서식(색·테두리·수식)은 옮기지 않고 값만 옮깁니다.</p>
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
