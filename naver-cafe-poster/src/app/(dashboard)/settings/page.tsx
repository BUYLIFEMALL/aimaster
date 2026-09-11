import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { CafeTargetManager } from "@/components/settings/CafeTargetManager";
import { Button } from "@/components/ui/Button";
import { connectNaverAccountAction, disconnectNaverAccountAction } from "@/lib/actions/accounts";
import type { ApiKeyProvider } from "@/types/database.types";

const AI_PROVIDERS: ApiKeyProvider[] = ["openai"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error } = await searchParams;

  const [{ data: keys }, { data: account }, { data: targets }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase.from("ncafe_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("ncafe_targets").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">네이버 연동 및 카페 설정</h1>
        <p className="text-sm text-neutral-600">
          카페에 게시글을 자동으로 등록하려면 먼저 네이버 계정을 연결하고, 게시할 카페 게시판을
          등록해주세요.
        </p>
      </div>

      {connected && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          네이버 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          네이버 계정 연결에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🟢 네이버 계정 연결</h2>
          <p className="text-xs text-neutral-500">
            게시글을 등록할 본인 네이버 계정을 연결합니다(네이버 로그인 OAuth).
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          {account ? (
            <div>
              <p className="text-sm text-neutral-500">연결된 계정</p>
              <p className="mt-1 text-lg font-medium text-neutral-900">
                {account.nickname ?? account.naver_id}
              </p>
              <form action={disconnectNaverAccountAction} className="mt-4">
                <Button type="submit" variant="danger">
                  연결 해제
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-neutral-600">
                카페에 게시글을 등록하려면 먼저 네이버 계정을 연결해야 합니다. 연결된 계정 본인
                명의로만 글이 등록됩니다.
              </p>
              <form action={connectNaverAccountAction}>
                <Button type="submit">네이버 계정 연결하기</Button>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">📋 게시할 카페 게시판 등록</h2>
          <p className="text-xs text-neutral-500">
            글을 올릴 카페의 게시판(clubid/menuid)을 등록해두면, 게시글 작성 시 목록에서 골라
            바로 게시할 수 있습니다.
          </p>
        </div>
        <CafeTargetManager targets={targets ?? []} />
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🤖 AI 게시글 생성</h2>
          <p className="text-xs text-neutral-500">
            주제만 입력하면 AI가 카페 게시글 제목/본문을 만들어줍니다.
          </p>
        </div>
        <div className="space-y-3">
          {AI_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
