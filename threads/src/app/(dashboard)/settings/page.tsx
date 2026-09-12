import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { Button } from "@/components/ui/Button";
import { connectThreadsAccountAction, disconnectThreadsAccountAction } from "@/lib/actions/accounts";
import type { ApiKeyProvider } from "@/types/database.types";

const PROVIDERS: ApiKeyProvider[] = ["openai", "gemini", "perplexity"];

// threads-affiliate-poster의 /settings와 동일하게, "API키등록"과 "플랫폼연동"(Threads 계정
// 연결)을 별도 메뉴/페이지로 나누지 않고 한 화면에 섹션 블록으로 합쳤다 — 사이드바 메뉴도
// "API키등록·플랫폼연동" 하나로 합치면서 기존 /accounts 페이지를 여기로 흡수했다(2026-09-12).
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error } = await searchParams;

  const [{ data: keys }, { data: account }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase.from("threads_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API키등록·플랫폼연동</h1>
        <p className="text-sm text-neutral-600">
          게시글/이미지 생성요청 전 본인의 API키를 등록하고, 게시글을 올릴 Threads 계정을
          연결해주세요.
        </p>
      </div>

      {connected && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Threads 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Threads 계정 연결에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">🤖 콘텐츠 생성 AI 키</h2>
          <p className="text-xs text-neutral-500">게시글 작성, 카드뉴스 이미지 생성, 실시간 주제 수집에 쓰이는 AI 키입니다</p>
        </div>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🧵 Threads 계정 연결</h2>
          <p className="text-xs text-neutral-500">게시글을 자동으로 게시할 Threads 계정을 연결합니다(OAuth).</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
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
                게시글을 자동으로 게시하려면 먼저 Threads 계정을 연결해야 합니다.
              </p>
              <form action={connectThreadsAccountAction}>
                <Button type="submit">Threads 계정 연결하기</Button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
