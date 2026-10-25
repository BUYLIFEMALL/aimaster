// 📏 수집 한도와 네이버 이용 제한 안내(2026-10-25 주인님 지시: 「사용자들이 이해할 수 있도록 공지」「제한이 걸렸을 때 본인 인증하고 일정 시간 지나면 풀리니 그때 다시 재사용」).
// 예약 설정 화면·매뉴얼이 같은 문구를 쓴다. 숫자는 lib/limits.ts.
import { MAX_COMPLEXES_PER_RUN, MAX_PAGES_PER_DAY } from "@/lib/limits";

export default function LimitNotice() {
  return (
    <section className="card limit-notice" aria-labelledby="limit-title">
      <h2 className="card-title" id="limit-title">📏 수집 한도와 네이버 이용 제한 안내</h2>
      <p className="lede">
        매물은 회원님 PC에서 <b>회원님 네이버 계정으로</b> 읽어요. 짧은 시간에 너무 많이 읽으면 네이버가 잠시 이용을 제한할 수 있어서, 아래 안전장치를 두었어요.
      </p>
      <div className="limit-grid">
        <div><strong>⏱ 예약 간격</strong><small>1시간부터 고를 수 있어요. 보통 2~3시간을 권해요.</small></div>
        <div><strong>🏢 한 회차 최대 {MAX_COMPLEXES_PER_RUN}곳</strong><small>더 많으면 다음 회차에 나머지를 차례로 읽어요.</small></div>
        <div><strong>📄 하루 최대 {MAX_PAGES_PER_DAY}페이지</strong><small>닿으면 그날은 쉬고 텔레그램·카톡으로 알려 드려요. 다음 날 다시 시작해요.</small></div>
        <div><strong>🐢 사람처럼 천천히</strong><small>페이지·단지 사이를 몇 초씩 쉬고, 예약 시각도 조금씩 다르게 돌아요.</small></div>
      </div>
      <div className="limit-block">
        <strong>⛔ 네이버가 이용을 제한했다고 알림이 왔다면</strong>
        <ol>
          <li>확장은 그 자리에서 멈추고 <b>그날 자동 수집을 쉬어요</b>(우회하지 않아요).</li>
          <li>네이버 부동산을 직접 열어 <b>보안 문자·본인 확인</b>이 나오면 풀어 주세요.</li>
          <li>제한은 보통 <b>몇 시간~하루 지나면 풀려요</b>. 풀린 뒤 다시 쓰시면 되고, 다음 날 예약 수집은 자동으로 다시 시작해요.</li>
          <li>자주 걸리면 예약 간격을 늘리고(2~3시간 이상) 감시 단지·지역 수를 줄여 주세요.</li>
        </ol>
      </div>
    </section>
  );
}
