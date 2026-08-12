import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { connectInstagramAccountAction, disconnectInstagramAccountAction } from "@/lib/actions/accounts";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; reason?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error, reason } = await searchParams;

  const { data: account } = await supabase
    .from("insta_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

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

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
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
        ) : (
          <div>
            <p className="mb-4 text-sm text-neutral-600">
              게시글을 자동으로 게시하려면 먼저 인스타그램 계정을 연결해야 합니다. (비즈니스/크리에이터
              계정이 Facebook 페이지와 연결되어 있어야 합니다.)
            </p>
            <form action={connectInstagramAccountAction}>
              <Button type="submit">인스타그램 계정 연결하기</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
