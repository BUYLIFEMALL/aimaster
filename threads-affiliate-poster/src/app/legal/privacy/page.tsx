import { redirect } from "next/navigation";
import { IS_STANDALONE, OPERATOR } from "@/lib/deployment";

export const metadata = { title: "개인정보처리방침 | Privacy Policy" };

export default function PrivacyPage() {
  if (!IS_STANDALONE) redirect("https://www.buylife.xyz/privacy");
  const operator = OPERATOR.name || "운영자";

  return (
    <>
      <h1>개인정보처리방침</h1>
      <p>
        {operator}(이하 &ldquo;운영자&rdquo;)는 &ldquo;Threads 쇼핑제휴 자동화&rdquo;(이하 &ldquo;서비스&rdquo;)를 이용하는 회원의
        개인정보를 「개인정보 보호법」에 따라 다음과 같이 처리합니다.
      </p>

      <h2>1. 수집하는 항목과 목적</h2>
      <table>
        <thead>
          <tr><th>항목</th><th>목적</th></tr>
        </thead>
        <tbody>
          <tr><td>이메일, 이름, 비밀번호(암호화 저장)</td><td>회원 식별, 로그인, 공지 전달</td></tr>
          <tr><td>회원이 직접 등록한 API 키(OpenAI·Gemini·Claude, 쿠팡·알리익스프레스·토스 등)와 Meta(Threads) 앱 ID·시크릿</td><td>회원 본인 명의로 AI 생성·제휴 링크 생성·Threads 연동 기능 제공</td></tr>
          <tr><td>Threads 연동 정보: Threads 사용자 ID, 사용자명, 액세스 토큰과 만료일</td><td>회원이 요청한 게시글 게시·예약 게시, 키워드 검색</td></tr>
          <tr><td>회원이 작성·저장한 게시글, 상품 정보, 보관함, 페르소나, 생성 이미지</td><td>서비스 기능 제공</td></tr>
          <tr><td>비용이 드는 기능의 사용 기록</td><td>오류 확인과 서비스 운영</td></tr>
        </tbody>
      </table>

      <h2>2. 보유 기간과 파기</h2>
      <ul>
        <li>회원 탈퇴 또는 삭제 요청 시 지체 없이 파기합니다. 법령에 보관 의무가 있는 정보는 해당 기간 동안만 보관합니다.</li>
        <li>회원이 Threads 연동을 해제하거나 Meta에서 앱을 제거하면 연동 정보(토큰 포함)를 즉시 삭제합니다.</li>
      </ul>

      <h2>3. 처리 위탁과 외부 전송</h2>
      <ul>
        <li>데이터 저장·인증: Supabase / 서비스 호스팅: Vercel</li>
        <li>회원이 기능을 실행할 때 회원 본인의 키로 해당 서비스에 요청이 전송됩니다: OpenAI, Google(Gemini), Anthropic(Claude), Meta(Threads API), 쿠팡파트너스, 알리익스프레스, 토스.</li>
        <li>운영자는 회원의 개인정보를 판매하거나 광고 목적으로 제3자에게 제공하지 않습니다.</li>
      </ul>

      <h2>4. Meta(Threads)에서 받은 정보</h2>
      <ul>
        <li>Threads API로 받은 정보는 회원이 요청한 기능(게시, 검색 결과 표시·보관)에만 사용하며, 다른 목적으로 쓰거나 제3자에게 넘기지 않습니다.</li>
        <li>삭제를 원하면 Meta 설정에서 앱을 제거하거나 <a href="/legal/data-deletion" className="underline">데이터 삭제 안내</a>의 방법으로 요청할 수 있습니다.</li>
      </ul>

      <h2>5. 회원의 권리</h2>
      <p>회원은 언제든 자신의 개인정보 열람·정정·삭제·처리 정지를 요청할 수 있습니다. 설정 화면에서 키·연동을 직접 삭제하거나 아래 연락처로 요청해주세요.</p>

      <h2>6. 개인정보 보호책임자</h2>
      <p>{operator} · {OPERATOR.email || "(연락처 미설정)"}</p>

      <h2>English summary</h2>
      <p>
        We store your account (email, name, hashed password), the API keys and Meta app credentials you register, your Threads
        connection (user id, username, access token) and the content you create. Data from the Threads API is used only for the
        features you request and is never sold or shared. Remove the app in Meta or follow the data deletion page to delete it.
      </p>
    </>
  );
}
