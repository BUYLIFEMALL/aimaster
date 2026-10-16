import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { Button } from "@/components/ui/Button";
import { connectInstagramAccountAction, disconnectInstagramAccountAction } from "@/lib/actions/accounts";
import type { ApiKeyProvider } from "@/types/database.types";
import { FACEBOOK_REDIRECT_NEW, FACEBOOK_REDIRECT_OLD, INSTAGRAM_REDIRECT_NEW, INSTAGRAM_REDIRECT_OLD } from "@/lib/oauthRedirect";

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
    supabase.from("insta_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  // Facebook 방식은 전용 칸 또는(이전 방식) 기존 칸, Instagram 방식은 기존 칸이 있으면 연결 버튼을 보여준다
  const hasMetaKeys =
    (keyMap.has("meta_app_id") && keyMap.has("meta_app_secret")) ||
    (keyMap.has("facebook_app_id") && keyMap.has("facebook_app_secret"));
  // 예전부터 연결 중인 회원의 옛 주소(환경변수 콜백의 호스트) — 새 주소와 같으면 표시하지 않음
  const fbOldHost = new URL(FACEBOOK_REDIRECT_OLD()).host;
  const oldHost = fbOldHost.endsWith("buylife.xyz") ? null : fbOldHost;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API키등록·플랫폼연동</h1>
      <p className="mb-6 text-sm text-neutral-600">
        캡션/이미지 AI 생성 기능 사용전 본인의 API 키를 등록해야 하고, 게시글을 자동으로 게시하려면
        인스타그램 계정도 연결해야 합니다.
      </p>

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

      <div className="space-y-5">
        {/* 2026-10-17: 회원이 본인 Meta 앱에 넣어야 할 값을 메뉴 위치별로 한곳에 모아 보여준다(주소마다 복사 버튼) */}
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">🧭 내 Meta 앱에 등록할 주소 한눈에 보기</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Meta 개발자 센터(developers.facebook.com › 내 앱)에서 아래 위치에 그대로 붙여넣고, 각 화면 맨 아래 [변경 내용 저장]을 꼭 눌러주세요.
            <br />
            기존 주소는 지우지 말고 새 주소를 &quot;추가&quot;합니다.
          </p>
          <ol className="space-y-4 text-xs text-neutral-700">
            <li className="space-y-1.5">
              <p className="font-semibold">① 앱 설정 › 기본 설정 › 앱 도메인</p>
              <CopyAddress value="buylife.xyz" />
              {oldHost && <CopyAddress value={oldHost} />}
            </li>
            <li className="space-y-1.5">
              <p className="font-semibold">
                ② <span className="text-blue-700">Facebook 페이지 방식</span>: 비즈니스용 Facebook 로그인 › 설정 › 유효한 OAuth 리디렉션 URI
              </p>
              <CopyAddress value={FACEBOOK_REDIRECT_NEW} />
              {FACEBOOK_REDIRECT_OLD() !== FACEBOOK_REDIRECT_NEW && <CopyAddress value={FACEBOOK_REDIRECT_OLD()} />}
              <p className="text-neutral-500">저장 후 같은 화면 맨 위 &quot;URI 리디렉션 유효성 검사기&quot;에 새 주소를 넣고 [URI 확인] → &quot;유효한 리디렉션 URI&quot;가 나오면 됩니다.</p>
            </li>
            <li className="space-y-1.5">
              <p className="font-semibold">
                ③ <span className="text-green-700">Instagram 로그인 방식</span>: 이용 사례 › 맞춤 설정 › Instagram 로그인이 포함된 API 설정 › 4. Instagram 비즈니스 로그인 설정 › OAuth 리디렉션 URI
              </p>
              <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />
              {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && <CopyAddress value={INSTAGRAM_REDIRECT_OLD()} />}
            </li>
            <li className="space-y-1">
              <p className="font-semibold">④ 이 화면에 넣을 앱 ID</p>
              <p>· Facebook 페이지 방식: 앱 설정 › 기본 설정 맨 위 <b>앱 ID·앱 시크릿 코드</b> → 아래 &quot;📘 Facebook 페이지 방식용&quot; 칸</p>
              <p>· Instagram 로그인 방식: ③ 화면 맨 위 <b>Instagram 앱 ID·시크릿 코드</b> → 아래 &quot;Instagram 앱 ID&quot; 칸</p>
            </li>
            <li>
              <p className="font-semibold">⑤ 앱 역할 › 역할(또는 테스터)에 본인 인스타그램·Facebook 계정 추가</p>
              <p>앱이 개발 모드이면 등록된 계정만 연결할 수 있습니다.</p>
            </li>
          </ol>
        </div>

        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm"
          >
            <div className="mb-3">
              <h2 className="text-sm font-bold text-neutral-900">{section.title}</h2>
              <p className="text-xs text-neutral-500">{section.description}</p>
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

        {/* 🔑 API 키 등록 및 연동 그룹 (Instagram Login, BYOK 방식 — 대체/fallback 연결 방법) */}
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900">🔑 API 키 등록 및 연동</h2>
            <p className="text-xs text-neutral-500">
              아래 &quot;연동 계정&quot;의 기본(Facebook) 방식으로 연결이 안 될 때 쓰는 대체 연결
              방법입니다. 본인 소유의 Meta 개발자 센터 "Instagram API 맞춤 설정" 화면에 있는 "Instagram 앱 ID" 및 "Instagram 앱 시크릿 코드"를 등록한 뒤, 아래 &quot;API 키 방식으로
              연결하기&quot;를 눌러주세요.
            </p>
          </div>

          <div className="mb-3 space-y-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
            <p>
              Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로
              등록해주셔야 합니다. 또한 그 앱의 &quot;역할&quot; 메뉴에서 본인 인스타그램 계정을
              테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
            </p>
            {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && (
              <p className="font-semibold text-neutral-700">아래 두 주소를 모두 등록해주세요(기존 주소는 곧 정리될 예정이라 새 주소도 꼭 추가).</p>
            )}
            <CopyAddress value={INSTAGRAM_REDIRECT_OLD()} />
            {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />}
            <p>인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).</p>
          </div>

          {/* 2026-10-16: 시험 계정에서 Facebook 앱 ID를 넣어 Instagram 로그인이 "Invalid platform app"로 실패한 사례 — 값 위치 안내 */}

          <div className="mb-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            <p className="font-semibold">⚠️ &quot;Instagram 앱 ID&quot;는 앱 화면 맨 위의 &quot;앱 ID&quot;(Facebook 앱 ID)와 다른 값입니다.</p>
            <p>
              Meta 앱 대시보드 › <b>이용 사례</b> › <b>맞춤 설정</b> › (Instagram API) › <b>Instagram 로그인이 포함된 API 설정</b> 화면 맨 위의 <b>Instagram 앱 ID</b>와 <b>Instagram 앱 시크릿 코드</b>(표시 버튼)를 넣어주세요.
            </p>
            <p>새 콜백 주소는 같은 화면의 &quot;4. Instagram 비즈니스 로그인 설정&quot;에 추가합니다.</p>
            <p>맨 위 앱 ID를 넣으면 연결할 때 Instagram 화면에 &quot;Invalid platform app&quot; 오류가 납니다.</p>
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

          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
            <div>
              <h3 className="text-xs font-bold text-neutral-800">📘 Facebook 페이지 방식용 (선택)</h3>
              <p className="text-xs text-neutral-500">
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

        {/* 📷 연동 계정 그룹 (기존 별도 /accounts 페이지를 여기로 병합, 2026-09-14) */}
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
                      <p className="w-full text-xs text-neutral-500">Meta 앱에 새 콜백 주소를 등록한 경우에 사용하세요.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-sm text-neutral-600">
                  게시글을 자동으로 게시하려면 먼저 위 &quot;API 키 등록 및 연동&quot;에서 본인 소유의
                  Meta 앱(App ID/Secret)을 등록한 뒤, 인스타그램 계정을 연결해야 합니다.
                </p>
                {hasMetaKeys ? (
                  <div className="space-y-3">
                    <form action={connectInstagramAccountAction}>
                      <input type="hidden" name="method" value="facebook_login" />
                      <Button type="submit" variant="facebook">Facebook 페이지로 연결하기</Button>
                    </form>
                    <div className="space-y-1.5 text-xs text-neutral-500">
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
                      <div className="flex flex-wrap gap-2">
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
                        <p className="w-full text-xs text-neutral-500">Meta 앱에 새 콜백 주소를 등록한 경우에 사용하세요.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">Meta 앱 ID/Secret을 등록하면 연결 버튼이 나타납니다.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
            <p className="text-xs text-neutral-500">
              이 프로그램에서 사용하는 API 키 발급 방법을 팝업창으로 열어 옆에 두고 그대로 따라
              할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {GUIDE_LINKS.map((guide) => (
              <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
