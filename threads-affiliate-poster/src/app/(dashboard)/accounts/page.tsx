import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { connectThreadsAccountAction, disconnectThreadsAccountAction } from "@/lib/actions/accounts";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error } = await searchParams;

  const { data: account } = await supabase
    .from("tap_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Threads 계정 연결</h1>

      {connected && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Threads 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Threads 계정 연결에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {account ? (
          <div>
            <p className="text-sm text-neutral-500">연결된 계정</p>
            <p className="mt-1 text-lg font-medium text-neutral-900">
              @{account.username ?? account.threads_user_id}
            </p>
            {account.token_expires_at && (
              <p className="mt-1 text-xs text-neutral-500">
                토큰 만료: {new Date(account.token_expires_at).toLocaleString("ko-KR")}
              </p>
            )}
            <form action={disconnectThreadsAccountAction} className="mt-4">
              <Button type="submit" variant="danger">
                연결 해제
              </Button>
            </form>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-neutral-600">
              게시글을 자동으로 게시하려면 먼저 Threads 계정을 연결해야 합니다. 기존
              &quot;Threads 포스팅 자동화(threads)&quot; 프로그램과 같은 Meta 앱을 재사용하므로
              별도로 새 앱을 만들 필요는 없습니다.
            </p>
            <form action={connectThreadsAccountAction}>
              <Button type="submit">Threads 계정 연결하기</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
