import { redirect } from "next/navigation";
import { IS_STANDALONE, OPERATOR } from "@/lib/deployment";

export const metadata = { title: "데이터 삭제 안내 | Data Deletion" };

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (!IS_STANDALONE) redirect(`https://www.buylife.xyz/data-deletion${code ? `?code=${encodeURIComponent(code)}` : ""}`);

  return (
    <>
      <h1>데이터 삭제 안내</h1>
      {code && (
        <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">
          삭제 요청이 처리되었습니다. 확인 코드: <b>{code}</b>
        </p>
      )}

      <h2>Threads 연동 데이터 삭제 방법</h2>
      <ul>
        <li>서비스 설정 화면(API키등록·플랫폼연동)에서 &ldquo;연결 해제&rdquo;를 누르면 Threads 토큰과 연동 정보가 즉시 삭제됩니다.</li>
        <li>Threads/Instagram 앱 설정 → 웹사이트 권한에서 이 앱을 제거해도 연동 정보가 자동으로 삭제됩니다.</li>
        <li>Meta에서 데이터 삭제를 요청하면 연동 정보와 Threads 검색으로 저장한 글이 삭제되고, 이 페이지에서 확인 코드를 볼 수 있습니다.</li>
      </ul>

      <h2>계정 전체 삭제</h2>
      <p>계정과 모든 데이터 삭제를 원하면 가입한 이메일로 아래 연락처에 요청해주세요.</p>
      <p>{OPERATOR.name || "운영자"} · {OPERATOR.email || "(연락처 미설정)"}</p>

      <h2>English</h2>
      <p>
        Disconnect Threads in the settings page, or remove the app in your Threads/Instagram settings, to delete your Threads
        connection data immediately. For full account deletion, email the operator above.
      </p>
    </>
  );
}
