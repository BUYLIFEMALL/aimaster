import { redirect } from "next/navigation";
import { IS_STANDALONE, OPERATOR } from "@/lib/deployment";

export const metadata = { title: "이용약관 | Terms of Service" };

export default function TermsPage() {
  if (!IS_STANDALONE) redirect("https://www.buylife.xyz/terms");
  const operator = OPERATOR.name || "운영자";

  return (
    <>
      <h1>이용약관</h1>

      <h2>제1조 (목적)</h2>
      <p>이 약관은 {operator}가 제공하는 &ldquo;Threads 쇼핑제휴 자동화&rdquo;(이하 &ldquo;서비스&rdquo;)의 이용 조건을 정합니다.</p>

      <h2>제2조 (서비스 내용)</h2>
      <p>서비스는 회원이 등록한 제휴 상품으로 Threads 홍보 게시글을 AI로 작성하고, 회원의 Threads 계정에 게시·예약 게시하는 도구입니다.</p>

      <h2>제3조 (회원 본인 계정·키 사용)</h2>
      <ul>
        <li>AI(OpenAI·Gemini·Claude), 제휴(쿠팡·알리익스프레스·토스) API 키와 Meta(Threads) 앱은 회원 본인 명의로 발급받아 등록합니다.</li>
        <li>각 API 사용 요금과 약관 준수 책임은 해당 키·계정의 명의자인 회원에게 있습니다.</li>
      </ul>

      <h2>제4조 (회원의 의무)</h2>
      <ul>
        <li>제휴 게시글에는 관련 법령과 제휴 플랫폼 정책에 따른 광고·수수료 고지를 포함해야 합니다(서비스가 기본 문구를 자동 삽입합니다).</li>
        <li>타인의 게시글을 참고할 때 저작권과 Threads 이용 정책을 지켜야 하며, 원문을 그대로 복제해 게시하지 않습니다.</li>
        <li>계정 정보와 키를 타인과 공유하지 않습니다.</li>
      </ul>

      <h2>제5조 (서비스 변경·중단)</h2>
      <p>외부 API 정책 변경, 점검 등으로 기능이 바뀌거나 일시 중단될 수 있으며, 운영자는 가능한 한 사전에 알립니다.</p>

      <h2>제6조 (책임의 한계)</h2>
      <p>AI가 생성한 문구와 이미지는 게시 전 회원이 확인해야 하며, 게시 결과에 대한 책임은 게시한 회원에게 있습니다.</p>

      <h2>제7조 (문의)</h2>
      <p>{operator} · {OPERATOR.email || "(연락처 미설정)"}</p>
    </>
  );
}
