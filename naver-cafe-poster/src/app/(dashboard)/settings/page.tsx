import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNaverAccount } from "@/lib/naver/memberAccount";
import { resolveApiKey as resolveNaverKey } from "@/lib/apiKeys";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { CafeTargetManager } from "@/components/settings/CafeTargetManager";
import { Button } from "@/components/ui/Button";
import { connectNaverAccountAction, connectNaverAccountNewCallbackAction, disconnectNaverAccountAction } from "@/lib/actions/accounts";
import { NAVER_REDIRECT_NEW, NAVER_REDIRECT_OLD } from "@/lib/oauthRedirect";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/scheduledSource/memberScheduler";
import { SchedulerModePicker } from "@/components/settings/SchedulerModePicker";

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API/플랫폼(OpenAI·Gemini·
// Perplexity·네이버)에 해당하는 매뉴얼만 골랐다. 네이버 로그인 자체는 공유 앱을 통해 회원이
// "연결하기"만 누르면 되는 구조라 API 키 발급은 필요 없지만, 게시판(club_id/menu_id) 등록
// 방법은 직접 찾아야 해서 별도 가이드로 추가했다(2026-09-13, category="네이버").
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "ec45e4bd-fccc-4f14-92e8-3e2df3ced50b", label: "네이버 계정 연동 및 게시판 등록하기" },
];

const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity", "gemini"];

// 네이버 로그인 연동에 필요한 회원 본인의 네이버 앱 자격증명 — 2026-09-16부터 앱(운영자)
// 공용 네이버 앱 대신 회원 각자 본인 앱을 등록하는 BYOK 방식으로 전환했다(네이버 앱이
// "검수"를 통과하지 않은 동안은 등록된 테스터 계정만 로그인이 가능해, 공용 앱 하나로는
// 운영자 본인 외 다른 회원이 연결할 수 없었기 때문 — kakao_auto_poster의
// kakao_rest_api_key 전환과 동일한 이유).
const NAVER_APP_PROVIDERS: ApiKeyProvider[] = ["naver_client_id", "naver_client_secret"];

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
    (async () => ({ data: await getNaverAccount(supabase, user.id, await resolveNaverKey(supabase, user.id, "naver_client_id")).then((a) => (a ? { naver_id: a.naver_id, nickname: a.nickname } : null)) }))(),
    supabase.from("ncafe_targets").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  const scheduler = await memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id);

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
      {error === "naver_app_missing" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          네이버 계정을 연결하려면 먼저 아래 &quot;🔑 네이버 앱 등록&quot; 섹션에서 본인의
          네이버 Client ID/Secret을 등록해주세요.
        </div>
      )}
      {error && error !== "naver_app_missing" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          네이버 계정 연결에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🤖 AI 게시글 생성 · 글감 수집</h2>
          <p className="text-xs text-neutral-500">
            "AI 자동 글쓰기(수동)"에서 주제·분위기·대상 독자·분량·키워드·참고링크 등을 지정하면 AI가 카페
            게시글 제목/본문을 만들어줍니다(OpenAI). Gemini 키를 등록하면 나노바나나로 대표
            이미지도 함께 생성할 수 있고, Perplexity 키를 등록하면 "글감 수집" 메뉴에서 최신
            트렌드를 검색해 게시글 후보까지 자동으로 만들 수 있습니다.
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

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🔑 네이버 앱 등록 (네이버 로그인 연동용)</h2>
          <p className="text-xs text-neutral-500">
            네이버 로그인은 developers.naver.com에서 본인 명의로 애플리케이션을 직접 만들고
            아래 Client ID/Secret을 등록해야 연동할 수 있습니다.
          </p>
        </div>
        <div className="mb-4 space-y-2 text-xs text-neutral-500">
          <p>
            1) developers.naver.com &gt; Application &gt; 애플리케이션 등록에서 새 앱을
            만들고, 사용 API에 <b>&quot;네이버 로그인&quot;</b>과 <b>&quot;카페&quot;</b>를 함께
            추가해주세요.
          </p>
          <p>2) &quot;네이버 로그인&quot; 설정의 Callback URL에 아래 주소를 그대로 등록해주세요{NAVER_REDIRECT_OLD() !== NAVER_REDIRECT_NEW ? " — 두 주소를 모두 등록해주세요(기존 주소는 곧 정리될 예정)" : ""}.</p>
          <code className="block break-all rounded bg-neutral-200 px-2 py-1.5 text-neutral-800">{NAVER_REDIRECT_OLD()}</code>
          {NAVER_REDIRECT_OLD() !== NAVER_REDIRECT_NEW && (
            <code className="block break-all rounded bg-neutral-200 px-2 py-1.5 text-neutral-800">{NAVER_REDIRECT_NEW}</code>
          )}
          <p>
            3) 앱이 아직 네이버 검수를 통과하지 않았다면(대부분 처음엔 그렇습니다),
            애플리케이션 정보의 &quot;개발 상태&quot;에서 본인의 네이버 계정을 테스트 계정으로
            추가해주세요 — 그래야 검수 완료 전에도 본인 계정으로 즉시 로그인 연동이 됩니다.
          </p>
          <p>4) 발급된 Client ID/Secret을 아래에 입력해주세요.</p>
        </div>
        <div className="space-y-3">
          {NAVER_APP_PROVIDERS.map((provider) => (
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
          <h2 className="text-sm font-bold text-neutral-900">🟢 네이버 계정 연결</h2>
          <p className="text-xs text-neutral-500">
            게시글을 등록할 본인 네이버 계정을 연결합니다(네이버 로그인 OAuth). 위 네이버 앱
            등록을 먼저 완료해야 연결할 수 있습니다.
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          {account ? (
            <div>
              <p className="text-sm text-neutral-500">연결된 계정</p>
              <p className="mt-1 text-lg font-medium text-neutral-900">
                {account.nickname ?? account.naver_id}
              </p>
              <p className="mt-1 text-xs text-neutral-500">연결을 해제하면 이 계정을 함께 쓰는 다른 네이버 프로그램에서도 해제됩니다.</p>
              <form action={disconnectNaverAccountAction} className="mt-4">
                <Button type="submit" variant="danger">
                  연결 해제
                </Button>
              </form>
              {NAVER_REDIRECT_OLD() !== NAVER_REDIRECT_NEW && (
                <form action={connectNaverAccountNewCallbackAction} className="mt-2">
                  <Button type="submit" variant="secondary">
                    새 주소로 다시 연결 (네이버 앱에 새 콜백 주소를 등록한 경우)
                  </Button>
                </form>
              )}
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
              {NAVER_REDIRECT_OLD() !== NAVER_REDIRECT_NEW && (
                <form action={connectNaverAccountNewCallbackAction} className="mt-2">
                  <Button type="submit" variant="secondary">
                    새 주소로 연결 (네이버 앱에 새 콜백 주소를 등록한 경우)
                  </Button>
                </form>
              )}
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

      {/* ⏰ 정기 자동 실행 방식(v1.21, 지침 docs/SCHEDULER_POLICY.md) — 정기 실행 켜기/끄기는 「글감 수집」의 예약 자동화에서 한다 */}
      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">⏰ 예약 발행</h2>
          <p className="text-xs text-neutral-500">
            정기 자동 실행(글감 수집 → 글 생성 → 카페 게시)을 무엇으로 돌릴지 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고,
            본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요. 정기 실행 켜기/끄기는 「글감 수집」의 예약 자동화에서 합니다.
          </p>
        </div>
        <SchedulerModePicker initialMode={scheduler.mode} platformAvailable={scheduler.platformAvailable} hasKey={scheduler.hasKey} />
        <p className="mb-2 text-xs font-semibold text-neutral-800">cron-job.org API 키 (「내 cron-job.org」를 쓸 때만)</p>
        <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-neutral-600">
          <li><a className="font-semibold underline" href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer">cron-job.org</a> 무료 가입 → 이메일 인증 → 로그인</li>
          <li>콘솔 <strong>Settings → API</strong> → <strong>Create API key</strong> → 키 복사 (<strong>IP 제한은 켜지 마세요</strong>)</li>
          <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
        </ol>
        <ApiKeyRow
          provider="cronjob_org_api_key"
          label={PROVIDER_LABELS.cronjob_org_api_key}
          maskedValue={keyMap.has("cronjob_org_api_key") ? maskApiKey(keyMap.get("cronjob_org_api_key")!) : null}
        />
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
          <p className="text-xs text-neutral-500">
            이 프로그램에서 사용하는 API 키·플랫폼 연동 방법을 팝업창으로 열어 옆에 두고 그대로
            따라 할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((guide) => (
            <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
          ))}
        </div>
      </section>
    </div>
  );
}
