import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { connectInstagramAccountAction, disconnectInstagramAccountAction } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AUTH_METHOD_LABELS: Record<string, string> = {
  facebook_login: "Facebook 계정 연동",
  instagram_login: "API 키 등록 및 연동",
};

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
            인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          {account ? (
            <div>
              <p className="text-sm text-neutral-500">연결된 계정</p>
              <p className="mt-1 text-lg font-medium text-neutral-900">
                @{account.ig_username ?? account.ig_user_id}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                연결 방식: {AUTH_METHOD_LABELS[account.auth_method] ?? account.auth_method}
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
                게시글을 자동으로 게시하려면 먼저 인스타그램 계정을 연결해야 합니다. 별도 설정 없이
                바로 아래 버튼으로 연결해보세요.
              </p>
              <form action={connectInstagramAccountAction}>
                <input type="hidden" name="method" value="facebook_login" />
                <Button type="submit">인스타그램 계정 연결하기</Button>
              </form>

              <div className="mt-5 border-t border-neutral-200 pt-4">
                <p className="text-xs text-neutral-500">
                  위 방법으로 연결이 안 되시나요? 본인 소유의 Meta 앱(API 키)으로 대신 연결할 수
                  있습니다.
                </p>
                {hasMetaKeys ? (
                  <form action={connectInstagramAccountAction} className="mt-3">
                    <input type="hidden" name="method" value="instagram_login" />
                    <Button type="submit" variant="secondary">
                      API 키 방식으로 연결하기
                    </Button>
                  </form>
                ) : (
                  <Link
                    href="/settings"
                    className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                  >
                    설정 페이지에서 API 키 등록 및 연동하기 →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
