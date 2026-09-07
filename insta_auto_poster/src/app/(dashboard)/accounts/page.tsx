import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { connectInstagramAccountAction, disconnectInstagramAccountAction } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; reason?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error, reason } = await searchParams;

  const [{ data: account }, { data: metaKeys }] = await Promise.all([
    supabase.from("insta_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_api_keys")
      .select("provider")
      .eq("user_id", user.id)
      .in("provider", ["meta_app_id", "meta_app_secret"]),
  ]);
  const hasMetaKeys = (metaKeys ?? []).length === 2;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">인스타그램 계정 연결</h1>

      {connected && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          인스타그램 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>인스타그램 계정 연결에 실패했습니다.</p>
          {reason && <p className="mt-1 font-medium">사유: {reason}</p>}
        </div>
      )}

      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">📷 연동 계정</h2>
          <p className="text-xs text-neutral-500">
            인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가,
            Facebook 페이지 연결은 필요 없습니다).
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          {account ? (
            <div>
              <p className="text-sm text-neutral-500">연결된 계정</p>
              <p className="mt-1 text-lg font-medium text-neutral-900">
                @{account.ig_username ?? account.ig_user_id}
              </p>
              {account.token_expires_at && (
                <p className="mt-1 text-xs text-neutral-500">
                  토큰 만료: {new Date(account.token_expires_at).toLocaleString("ko-KR")}
                </p>
              )}
              <form action={disconnectInstagramAccountAction} className="mt-4">
                <Button type="submit" variant="danger">
                  연결 해제
                </Button>
              </form>
            </div>
          ) : hasMetaKeys ? (
            <div>
              <p className="mb-4 text-sm text-neutral-600">
                게시글을 자동으로 게시하려면 먼저 인스타그램 계정을 연결해야 합니다.
              </p>
              <form action={connectInstagramAccountAction}>
                <Button type="submit">인스타그램 계정 연결하기</Button>
              </form>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              Meta App ID/Secret 등록이 먼저 필요합니다.{" "}
              <Link href="/settings" className="font-medium underline">
                설정 페이지로 이동
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
