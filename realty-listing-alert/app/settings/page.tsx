import { requireProgramAccess, PROGRAM_SLUG } from "@/lib/access";
import { toAiProvider } from "@/lib/aiProviders";
import PublicDataKeyCard from "./PublicDataKeyCard";
import { KeyHowTo } from "@/components/KeyGuide";
import { createClient } from "@/lib/supabase/server";
import ExtensionTokenManager from "./ExtensionTokenManager";
import ExtensionConnectButton from "./ExtensionConnectButton";
import ExtensionDownloadCard from "./ExtensionDownloadCard";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { AiKeysCard, ChannelCards, TelegramCard } from "@/app/delivery/DeliveryClient";
import { createServiceClient } from "@/lib/supabase/service";
import { KAKAO_CONNECT_URL, getAiKeyStatus, getKakaoState, getResendKey, hasKakaoKey } from "@/lib/notifyChannels";
import { REAL_ESTATE_SALES_SLUG } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// API키등록·플랫폼연동(표준 메뉴명): 확장 연결·다운로드 + 텔레그램 연동(「받는 방법」과 같은 카드, 같은 저장값 — 2026-10-25 주인님 지적).
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ kakao?: string; kakao_error?: string }> }) {
  // 카카오 바로 연결(v1.17)에서 돌아온 결과 — /api/kakao/callback이 ?kakao=connected 또는 ?kakao_error=… 를 붙인다(2026-10-25부터 이 화면으로 돌아옴)
  const sp = await searchParams;
  const kakaoNotice = sp.kakao === "connected"
    ? { kind: "ok" as const, text: "✅ 카카오가 연결됐어요. 「💬 시험 메시지 보내기」로 확인해 보세요." }
    : sp.kakao_error ? { kind: "err" as const, text: `카카오 연결 실패: ${String(sp.kakao_error).slice(0, 200)}` } : undefined;
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [{ data: link }, { data: realEstateBot }] = await Promise.all([
    supabase.from("user_telegram_links").select("bot_username, linked_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).maybeSingle(),
    supabase.from("user_telegram_links").select("bot_username").eq("user_id", user.id).eq("program_slug", REAL_ESTATE_SALES_SLUG).maybeSingle(),
  ]);
  const service = createServiceClient();
  const [kakao, resendKey, aiKeys, { data: ch }] = await Promise.all([
    // ↓ AI 키 등록 여부(v1.22)
    getKakaoState(service, user.id, false),
    getResendKey(service, user.id),
    getAiKeyStatus(service, user.id),
    supabase.from("realty_alert_settings").select("notify_kakao, notify_email, email_to, notify_ai_summary, ai_provider").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data: tokens } = await supabase.from("personal_access_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null).order("created_at", { ascending: false });

  const kakaoKey = await hasKakaoKey(service, user.id);
  const { data: pdRow } = await service.from("user_api_keys").select("provider").eq("user_id", user.id).eq("provider", "data_go_kr_service_key").maybeSingle();
  const pdKey = Boolean(pdRow);
  return (
    <main className="settings-layout">
      <StudioSidebar email={user.email ?? ""} active="settings" />
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>API키등록·플랫폼연동</h1>
        <p className="lede">연결·키 등록은 모두 여기서 해요. 꼭 필요한 것은 ① 알림 받을 곳(텔레그램·이메일·카카오톡 중 하나 이상) ② 크롬 확장, 두 가지예요. 켜고 끄기는 「3 · 받는 방법」에서 해요.</p>
        <div className="settings-divider" />
        <h2 id="telegram">📨 텔레그램 연동</h2>
        <p className="lede">새 매물 알림과 정리 파일을 받을 회원님 본인 텔레그램 봇입니다.</p>
        <KeyHowTo ids={["telegram"]} title="텔레그램 연동 방법" />
        <TelegramCard
          telegram={link ? { botUsername: link.bot_username ?? null, linkedAt: link.linked_at ?? null } : null}
          realEstateBot={realEstateBot ? { botUsername: realEstateBot.bot_username ?? null } : null}
        />
        <div className="settings-divider" />
        <h2>✉️ 이메일(Resend) · 💬 카카오톡 연동</h2>
        <p className="lede">이메일은 요약 + 엑셀 파일, 카카오톡은 요약만 받아요. 연결한 뒤 「받는 방법」에서 켜 주세요.</p>
        <div className="ra-howto-grid">
          <KeyHowTo ids={["resend"]} title="이메일(Resend) 연동 방법" />
          <KeyHowTo ids={["kakao"]} title="카카오톡 연동 방법" />
        </div>
        <ChannelCards
          kakao={kakao.status === "ok" ? { ok: true, nickname: kakao.nickname, hasKey: kakaoKey, notice: kakaoNotice } : { ok: false, message: kakao.message, connectUrl: KAKAO_CONNECT_URL, hasKey: kakaoKey, notice: kakaoNotice }}
          email={{ hasKey: Boolean(resendKey), loginEmail: user.email ?? "" }}
          initial={{ notifyKakao: ch?.notify_kakao ?? false, notifyEmail: ch?.notify_email ?? false, emailTo: ch?.email_to ?? "", aiSummary: ch?.notify_ai_summary ?? false, aiProvider: toAiProvider(ch?.ai_provider) }}
        />
        <div className="settings-divider" />
        <h2 id="ai">🤖 AI 시세 요약 키(선택)</h2>
        <AiKeysCard ai={aiKeys} />
        <div className="settings-divider" />
        <h2>🏛 실거래가 비교(공공데이터 키, 선택)</h2>
        <KeyHowTo ids={["publicData"]} title="공공데이터 키 가져오는 법" />
        <PublicDataKeyCard hasKey={pdKey} />
        <div className="settings-divider" />
        <h2>Chrome 확장 연결</h2>
        <p className="lede">확장을 설치한 이 브라우저에서 아래 버튼을 누르면 연결 코드가 자동으로 만들어져 확장에 바로 연결됩니다. 다른 자동화 프로그램의 연결 코드와 따로 관리됩니다.</p>
        <ExtensionConnectButton />
        <details className="token-advanced">
          <summary>🔧 연결된 확장 관리 ({tokens?.length ?? 0}개) — 다른 PC 연결 끊기</summary>
          <p className="token-manual-title">예전 PC나 다른 크롬 프로필에 연결된 확장을 끊을 수 있어요. 다시 연결하려면 그 브라우저에서 「확장 프로그램 바로 연결」을 누르면 됩니다.</p>
          <ExtensionTokenManager initialTokens={tokens ?? []} />
        </details>
        <ExtensionDownloadCard />
        <div className="guide-box"><strong>📖 연동 매뉴얼</strong><p>확장 설치·텔레그램 봇 만들기·감시 대상·예약 순서는 매뉴얼에 그림과 함께 정리돼 있습니다.</p><div className="guide-links"><a href="/guide">연동 & 사용 매뉴얼 열기</a><a href="https://core.telegram.org/bots/tutorial" target="_blank" rel="noreferrer">텔레그램 봇 공식 안내</a><a href="https://resend.com/docs/dashboard/api-keys/introduction" target="_blank" rel="noreferrer">Resend API 키 공식 안내</a></div></div>
      </section>
    </main>
  );
}
