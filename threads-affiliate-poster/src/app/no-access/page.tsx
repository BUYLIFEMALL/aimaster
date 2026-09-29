import Link from "next/link";
import { OPERATOR } from "@/lib/deployment";

// Standalone copies send members without access here (AIMaster sends them to its product page).
export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const suspended = reason === "suspended";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">
          {suspended ? "이용이 정지된 계정입니다" : "이용 권한이 없습니다"}
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          {suspended
            ? "계정 이용이 정지되었습니다. 운영자에게 문의해주세요."
            : "이 계정에는 아직 프로그램 이용 권한이 없습니다. 운영자에게 권한을 요청해주세요."}
          {OPERATOR.email && (
            <>
              <br />
              문의: {OPERATOR.email}
            </>
          )}
        </p>
        <Link href="/login" className="inline-block w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          로그인 화면으로
        </Link>
      </div>
    </div>
  );
}
