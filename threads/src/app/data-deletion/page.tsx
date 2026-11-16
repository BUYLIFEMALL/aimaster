import { notFound } from "next/navigation";
import { BRAND_NAME, IS_STANDALONE } from "@/lib/deployment";

export const dynamic = "force-dynamic";
export const metadata = { title: "데이터 삭제 안내 | Data Deletion" };

// 독립 운영 모드(수강생 배포 키트) 전용 — Meta 삭제 콜백이 돌려주는 확인 주소. 운영(AIMaster)은 메인 사이트 안내를 쓴다.
export default async function DataDeletionPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (!IS_STANDALONE) notFound();
  const { code } = await searchParams;
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-12 text-sm leading-relaxed text-neutral-800">
      <h1 className="text-xl font-bold">데이터 삭제 안내{BRAND_NAME ? ` · ${BRAND_NAME}` : ""}</h1>
      {code && (
        <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">
          삭제 요청이 처리되었습니다. 확인 코드: <b>{code}</b>
        </p>
      )}
      <h2 className="font-semibold">Threads 연동 데이터 삭제 방법</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>설정 화면(API키등록·플랫폼연동)에서 「연결 해제」를 누르면 Threads 토큰과 연동 정보가 바로 삭제됩니다.</li>
        <li>Threads 앱 설정 › 웹사이트 권한에서 이 앱을 제거해도 연동 정보가 자동으로 삭제됩니다.</li>
        <li>Meta에서 데이터 삭제를 요청하면 연동 정보가 삭제되고, 이 페이지에서 확인 코드를 볼 수 있습니다.</li>
      </ul>
      <p>계정 전체 삭제는 이 사이트 운영자에게 가입한 이메일로 요청해 주세요.</p>
      <h2 className="font-semibold">English</h2>
      <p>
        Disconnect Threads in the settings page, or remove the app in your Threads settings, to delete your Threads connection
        data immediately. For full account deletion, contact the operator of this site with your sign-up email.
      </p>
    </main>
  );
}
