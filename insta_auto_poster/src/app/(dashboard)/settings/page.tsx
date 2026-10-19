import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getInstaAccountForUser } from "@/lib/instagram/memberAccount";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { Button } from "@/components/ui/Button";
import { connectInstagramAccountAction, disconnectInstagramAccountAction } from "@/lib/actions/accounts";
import type { ApiKeyProvider } from "@/types/database.types";
import { FACEBOOK_REDIRECT_NEW, FACEBOOK_REDIRECT_OLD, INSTAGRAM_REDIRECT_NEW, INSTAGRAM_REDIRECT_OLD, SITE_ORIGIN } from "@/lib/oauthRedirect";
import { IS_STANDALONE } from "@/lib/deployment";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/posts/memberScheduler";
import { SchedulerModePicker } from "@/components/settings/SchedulerModePicker";

const AUTH_METHOD_LABELS: Record<string, string> = {
  facebook_login: "Facebook 계정 연동",
  instagram_login: "API 키 등록 및 연동",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// platform_guides.id — 이 페이지가 실제로 등록받는 API 키(OpenAI/Claude/Gemini/Perplexity)에
// 해당하는 매뉴얼만 골랐다(2026-09-13, 플랫폼 표준 "API키등록·플랫폼연동 페이지" 규칙). Meta
// App(Instagram) 연동은 아직 "피드 포스팅" 전용 가이드가 없어(기존 SNS 카테고리 가이드는
// "댓글·DM 자동화" 대상이라 딱 맞지 않음) 대상에서 뺐다 — 필요 시 별도로 추가할 것.
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "6cdae259-b9d2-45ae-9c21-e5f498f78956", label: "인스타그램 계정 연동하기 (자동포스팅)" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
];

const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];
// Facebook 페이지 방식 전용(2026-10-16, Instagram 로그인 방식과 앱 ID가 달라 칸 분리)
const FACEBOOK_PROVIDERS: ApiKeyProvider[] = ["facebook_app_id", "facebook_app_secret"];

// 성격별로 묶어서 어떤 키가 어떤 기능에 쓰이는지 한눈에 구분되도록 그룹핑한다.
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "✍️ 캡션/문구 생성 AI",
    description: "게시글 캡션·해시태그 생성에 쓰입니다. 둘 중 1개만 등록해도 됩니다.",
    providers: ["openai", "anthropic"],
  },
  {
    title: "🎨 이미지 생성 AI",
    description: "카드뉴스·피드 이미지 생성 전용입니다.",
    providers: ["gemini"],
  },
  {
    title: "🔍 주제 수집 AI",
    description: "실시간 트렌드 기반 게시글 주제 수집 전용입니다.",
    providers: ["perplexity"],
  },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; reason?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error, reason } = await searchParams;

  const [{ data: keys }, { data: account }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getInstaAccountForUser(supabase, user.id).then((data) => ({ data })),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  // 예약 발행 실행 방식(v1.25): 운영 기본 Vercel, 설치 키트 기본 cron-job.org. 지침: 루트 docs/SCHEDULER_POLICY.md
  const scheduler = await memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id);
  // Facebook 방식은 전용 칸 또는(이전 방식) 기존 칸, Instagram 방식은 기존 칸이 있으면 연결 버튼을 보여준다
  const hasMetaKeys =
    (keyMap.has("meta_app_id") && keyMap.has("meta_app_secret")) ||
    (keyMap.has("facebook_app_id") && keyMap.has("facebook_app_secret"));
  // 예전부터 연결 중인 회원의 옛 주소(환경변수 콜백의 호스트) — 새 주소와 같으면 표시하지 않음
  const fbOldHost = new URL(FACEBOOK_REDIRECT_OLD()).host;
  const oldHost = fbOldHost.endsWith("buylife.xyz") ? null : fbOldHost;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-base shadow-sm">
            🔑
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">API키등록·플랫폼연동</h1>
            <p className="mt-1 text-xs text-slate-400">
              캡션/이미지 AI 생성용 본인 키와 인스타그램 자동 포스팅용 Meta 비즈니스 계정을 안전하게 연동합니다.
            </p>
          </div>
        </div>
      </div>

      {connected && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300">
          <span>✅</span>
          <span>인스타그램 계정이 성공적으로 연결되었습니다.</span>
        </div>
      )}
      {error && (
        <div className="space-y-1 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <p className="font-bold">❌ 인스타그램 계정 연결에 실패했습니다.</p>
          {reason && <p className="font-mono text-[11px] text-rose-400">사유: {reason}</p>}
        </div>
      )}

      <div className="space-y-5">
        {/* 내 Meta 앱에 등록할 주소 한눈에 보기 카드 */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-blue-300 flex items-center gap-1.5">
            <span>🧭</span> 내 Meta 앱에 등록할 주소 한눈에 보기
          </h2>
          <p className="mt-1 mb-3 text-xs text-slate-300 leading-relaxed">
            Meta 개발자 센터(developers.facebook.com › 내 앱)에서 아래 위치에 그대로 붙여넣고, 각 화면 맨 아래 [변경 내용 저장]을 꼭 눌러주세요.
            <br />
            기존 주소는 지우지 말고 새 주소를 &quot;추가&quot;합니다.
          </p>
          <ol className="space-y-3.5 text-xs text-slate-200">
            <li className="space-y-1.5 bg-[#0d0f17]/70 p-3 rounded-xl border border-[#262c3d]">
              <p className="font-semibold text-slate-200">① 앱 설정 › 기본 설정 › 앱 도메인</p>
              <CopyAddress value={IS_STANDALONE ? new URL(SITE_ORIGIN).host : "buylife.xyz"} />
              {oldHost && <CopyAddress value={oldHost} />}
            </li>
            <li className="space-y-1.5 bg-[#0d0f17]/70 p-3 rounded-xl border border-[#262c3d]">
              <p className="font-semibold text-blue-300">
                ② Facebook 페이지 방식: 비즈니스용 Facebook 로그인 › 설정 › 유효한 OAuth 리디렉션 URI
              </p>
              <CopyAddress value={FACEBOOK_REDIRECT_NEW} />
              {FACEBOOK_REDIRECT_OLD() !== FACEBOOK_REDIRECT_NEW && <CopyAddress value={FACEBOOK_REDIRECT_OLD()} />}
              <p className="text-[11px] text-slate-400">저장 후 같은 화면 맨 위 &quot;URI 리디렉션 유효성 검사기&quot;에 새 주소를 넣고 [URI 확인] → &quot;유효한 리디렉션 URI&quot;가 나오면 됩니다.</p>
            </li>
            <li className="space-y-1.5 bg-[#0d0f17]/70 p-3 rounded-xl border border-[#262c3d]">
              <p className="font-semibold text-emerald-300">
                ③ Instagram 로그인 방식: 이용 사례 › 맞춤 설정 › Instagram 로그인이 포함된 API 설정 › 4. Instagram 비즈니스 로그인 설정 › OAuth 리디렉션 URI
              </p>
              <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />
              {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && <CopyAddress value={INSTAGRAM_REDIRECT_OLD()} />}
            </li>
            <li className="space-y-1 bg-[#0d0f17]/70 p-3 rounded-xl border border-[#262c3d]">
              <p className="font-semibold text-slate-200">④ 이 화면에 넣을 앱 ID</p>
              <p className="text-slate-400">· Facebook 페이지 방식: 앱 설정 › 기본 설정 맨 위 <b>앱 ID·앱 시크릿 코드</b> → 아래 &quot;📘 Facebook 페이지 방식용&quot; 칸</p>
              <p className="text-slate-400">· Instagram 로그인 방식: ③ 화면 맨 위 <b>Instagram 앱 ID·시크릿 코드</b> → 아래 &quot;Instagram 앱 ID&quot; 칸</p>
            </li>
            <li className="bg-[#0d0f17]/70 p-3 rounded-xl border border-[#262c3d]">
              <p className="font-semibold text-slate-200">⑤ 앱 역할 › 역할(또는 테스터)에 본인 인스타그램·Facebook 계정 추가</p>
              <p className="text-slate-400 mt-0.5">앱이 개발 모드이면 등록된 계정만 연결할 수 있습니다.</p>
            </li>
          </ol>
        </div>

        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs"
          >
            <div className="mb-3.5">
              <h2 className="text-sm font-bold text-slate-100">{section.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.providers.map((provider) => (
                <ApiKeyRow
                  key={provider}
                  provider={provider}
                  label={PROVIDER_LABELS[provider]}
                  maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                />
              ))}
            </div>
          </div>
        ))}

        {/* 🔑 API 키 등록 및 연동 그룹 (Instagram Login, BYOK 방식) */}
        <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs">
          <div className="mb-3.5">
            <h2 className="text-sm font-bold text-slate-100">🔑 API 키 등록 및 연동 (Meta Graph API)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              아래 &quot;연동 계정&quot;의 기본(Facebook) 방식으로 연결이 안 될 때 쓰는 대체 연결 방법입니다. 본인 소유의 Meta 개발자 센터 &quot;Instagram API 맞춤 설정&quot; 화면에 있는 &quot;Instagram 앱 ID&quot; 및 &quot;Instagram 앱 시크릿 코드&quot;를 등록한 뒤, 아래 &quot;API 키 방식으로 연결하기&quot;를 눌러주세요.
            </p>
          </div>

          <div className="mb-3.5 space-y-2 rounded-xl bg-[#0d0f17] border border-[#262c3d] p-3.5 text-xs text-slate-300">
            <p>
              Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로 등록해주셔야 합니다. 또한 그 앱의 &quot;역할&quot; 메뉴에서 본인 인스타그램 계정을 테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
            </p>
            {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && (
              <p className="font-semibold text-slate-200">아래 두 주소를 모두 등록해주세요(기존 주소는 곧 정리될 예정이라 새 주소도 꼭 추가).</p>
            )}
            <CopyAddress value={INSTAGRAM_REDIRECT_OLD()} />
            {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />}
            <p className="text-slate-400">인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).</p>
          </div>

          <div className="mb-4 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
            <p className="font-bold">⚠️ &quot;Instagram 앱 ID&quot;는 앱 화면 맨 위의 &quot;앱 ID&quot;(Facebook 앱 ID)와 다른 값입니다.</p>
            <p>
              Meta 앱 대시보드 › <b>이용 사례</b> › <b>맞춤 설정</b> › (Instagram API) › <b>Instagram 로그인이 포함된 API 설정</b> 화면 맨 위의 <b>Instagram 앱 ID</b>와 <b>Instagram 앱 시크릿 코드</b>(표시 버튼)를 넣어주세요.
            </p>
            <p>새 콜백 주소는 같은 화면의 &quot;4. Instagram 비즈니스 로그인 설정&quot;에 추가합니다.</p>
            <p className="text-rose-300 font-medium">맨 위 앱 ID를 넣으면 연결할 때 Instagram 화면에 &quot;Invalid platform app&quot; 오류가 납니다.</p>
            <p>
              이 칸은 <b>Instagram 로그인 방식</b> 전용입니다.
              <br />
              <b>Facebook 페이지로 연결하기</b> 방식은 아래 &quot;Facebook 앱 ID / 시크릿&quot; 칸(맨 위 앱 ID·앱 시크릿 코드)을 따로 등록해 쓰세요.
            </p>
          </div>

          <div className="space-y-3">
            {META_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                helpUrl="https://developers.facebook.com/apps"
                helpLabel="Meta App Dashboard에서 발급받기"
              />
            ))}
          </div>

          <div className="mt-5 space-y-3 border-t border-[#262c3d] pt-4">
            <div>
              <h3 className="text-xs font-bold text-blue-300">📘 Facebook 페이지 방식용 (선택)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                &quot;Facebook 페이지로 연결하기&quot;를 쓸 때만 등록합니다. Meta 앱 대시보드 › 앱 설정 › 기본 설정의 <b>앱 ID</b>와 <b>앱 시크릿 코드</b>(화면 맨 위 값)를 넣으세요. 비워 두면 예전처럼 위 칸의 값을 사용합니다.
              </p>
            </div>
            {FACEBOOK_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                helpUrl="https://developers.facebook.com/apps"
                helpLabel="Meta App Dashboard에서 확인하기"
              />
            ))}
          </div>
        </div>

        {/* 📷 연동 계정 그룹 */}
        <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs">
          <div className="mb-3.5">
            <h2 className="text-sm font-bold text-slate-100">📷 연동 계정</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).
            </p>
          </div>
          <div className="rounded-xl border border-[#262c3d] bg-[#0d0f17] p-4">
            {account ? (
              <div>
                <p className="text-xs text-slate-400">연결된 계정</p>
                <p className="mt-1 text-lg font-bold text-pink-300 font-mono">
                  @{account.ig_username ?? account.ig_user_id}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  연결 방식: {AUTH_METHOD_LABELS[account.auth_method] ?? account.auth_method}
                </p>
                {account.shared_id && account.connected_via !== "auto-instagram-posting" && (
                  <p className="mt-1 text-xs text-emerald-300">다른 Instagram 프로그램에서 연결한 계정을 함께 쓰고 있어요.</p>
                )}
                <p className="mt-1 text-xs text-slate-500">연결을 해제하면 이 계정을 함께 쓰는 다른 Instagram 프로그램에서도 해제됩니다.</p>
                {account.token_expires_at && (
                  <p className="mt-1 text-xs text-slate-400">
                    토큰 만료: {new Date(account.token_expires_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                )}
                <form action={disconnectInstagramAccountAction} className="mt-4">
                  <Button type="submit" variant="danger">
                    연결 해제
                  </Button>
                </form>
                <div className="mt-3">
                  {FACEBOOK_REDIRECT_OLD() !== FACEBOOK_REDIRECT_NEW && (
                    <div className="flex flex-wrap gap-2">
                      <form action={connectInstagramAccountAction}>
                        <input type="hidden" name="method" value="facebook_login" />
                        <input type="hidden" name="callback" value="new" />
                        <Button type="submit" variant="facebook">Facebook 방식 새 주소로 다시 연결</Button>
                      </form>
                      <form action={connectInstagramAccountAction}>
                        <input type="hidden" name="method" value="instagram_login" />
                        <input type="hidden" name="callback" value="new" />
                        <Button type="submit" variant="instagram">Instagram 방식 새 주소로 다시 연결</Button>
                      </form>
                      <p className="w-full text-[11px] text-slate-400 mt-1">Meta 앱에 새 콜백 주소를 등록한 경우에 사용하세요.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-xs text-slate-300 leading-relaxed">
                  게시글을 자동으로 게시하려면 먼저 위 &quot;API 키 등록 및 연동&quot;에서 본인 소유의 Meta 앱(App ID/Secret)을 등록한 뒤, 인스타그램 계정을 연결해야 합니다.
                </p>
                {hasMetaKeys ? (
                  <div className="space-y-3">
                    <form action={connectInstagramAccountAction}>
                      <input type="hidden" name="method" value="facebook_login" />
                      <Button type="submit" variant="facebook">Facebook 페이지로 연결하기</Button>
                    </form>
                    <div className="space-y-1.5 text-xs text-slate-400">
                      <p>Facebook 로그인 방식은 내 Meta 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가해야 합니다.</p>
                      <CopyAddress value={FACEBOOK_REDIRECT_OLD()} />
                      {FACEBOOK_REDIRECT_OLD() !== FACEBOOK_REDIRECT_NEW && <CopyAddress value={FACEBOOK_REDIRECT_NEW} />}
                    </div>
                    <form action={connectInstagramAccountAction}>
                      <input type="hidden" name="method" value="instagram_login" />
                      <Button type="submit" variant="instagram">
                        Instagram 로그인 방식으로 연결하기
                      </Button>
                    </form>
                    {FACEBOOK_REDIRECT_OLD() !== FACEBOOK_REDIRECT_NEW && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <form action={connectInstagramAccountAction}>
                          <input type="hidden" name="method" value="facebook_login" />
                          <input type="hidden" name="callback" value="new" />
                          <Button type="submit" variant="facebook">Facebook 방식 새 주소로 연결</Button>
                        </form>
                        <form action={connectInstagramAccountAction}>
                          <input type="hidden" name="method" value="instagram_login" />
                          <input type="hidden" name="callback" value="new" />
                          <Button type="submit" variant="instagram">Instagram 방식 새 주소로 연결</Button>
                        </form>
                        <p className="w-full text-[11px] text-slate-400">Meta 앱에 새 콜백 주소를 등록한 경우에 사용하세요.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Meta 앱 ID/Secret을 등록하면 연결 버튼이 나타납니다.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ⏰ 예약 발행 (v1.25) */}
        <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs">
          <div className="mb-3.5">
            <h2 className="text-sm font-bold text-slate-100">⏰ 예약 발행</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {scheduler.defaultMode === "cronjob"
                ? "예약한 글을 정한 시각에 자동으로 올리는 방식을 고릅니다. 기본은 「내 cron-job.org」(무료 — 아래에 키만 등록)이고, Vercel 유료(Pro)라면 「Vercel 예약 호출」을 켜고 고를 수 있습니다."
                : "예약한 글을 정한 시각에 자동으로 올리는 방식을 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고, 본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요."}{" "}
              예약은 게시글 작성·수정 화면에서 하고, 즉시 게시는 방식과 상관없이 됩니다.
            </p>
          </div>
          <SchedulerModePicker initialMode={scheduler.mode} defaultMode={scheduler.defaultMode} platformAvailable={scheduler.platformAvailable} hasKey={scheduler.hasKey} />
          <p className="mb-2 text-xs font-semibold text-slate-200">cron-job.org API 키 (「내 cron-job.org」를 쓸 때만)</p>
          <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-slate-400">
            <li><a className="font-semibold text-pink-400 underline" href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer">cron-job.org</a> 무료 가입 → 이메일 인증 → 로그인</li>
            <li>콘솔 <strong className="text-slate-200">Settings → API</strong> → <strong className="text-slate-200">Create API key</strong> → 키 복사 (<strong className="text-slate-200">IP 제한은 켜지 마세요</strong>)</li>
            <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
          </ol>
          <ApiKeyRow
            provider="cronjob_org_api_key"
            label={PROVIDER_LABELS.cronjob_org_api_key}
            maskedValue={keyMap.has("cronjob_org_api_key") ? maskApiKey(keyMap.get("cronjob_org_api_key")!) : null}
          />
        </div>

        {/* 📖 연동 매뉴얼 */}
        <div className="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 shadow-xs">
          <div className="mb-3.5">
            <h2 className="text-sm font-bold text-slate-100">📖 연동 매뉴얼</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              이 프로그램에서 사용하는 API 키 발급 방법을 팝업창으로 열어 옆에 두고 그대로 따라 할 수 있습니다.
            </p>
          </div>
          {IS_STANDALONE ? (
            <p className="text-xs text-slate-300">설치 키트의 <code>KIT/PLATFORMS.md</code>에 플랫폼별 가입·키 발급 방법이 있습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {GUIDE_LINKS.map((guide) => (
                <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
