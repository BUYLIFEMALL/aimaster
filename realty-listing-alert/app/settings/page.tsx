import { requireProgramAccess, PROGRAM_SLUG } from "@/lib/access";
import PublicDataKeyCard from "./PublicDataKeyCard";
import { KeyHowTo } from "@/components/KeyGuide";
import { createClient } from "@/lib/supabase/server";
import ExtensionTokenManager from "./ExtensionTokenManager";
import ExtensionConnectButton from "./ExtensionConnectButton";
import ExtensionDownloadCard from "./ExtensionDownloadCard";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { ChannelCards, TelegramCard } from "@/app/delivery/DeliveryClient";
import { createServiceClient } from "@/lib/supabase/service";
import { KAKAO_CONNECT_URL, getKakaoState, getResendKey, hasKakaoKey } from "@/lib/notifyChannels";
import { REAL_ESTATE_SALES_SLUG } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// API키등록·플랫폼연동(표준 메뉴명): 확장 연결·다운로드 + 텔레그램 연동(「받는 방법」과 같은 카드, 같은 저장값 — 2026-10-25 주인님 지적).
export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [{ data: link }, { data: realEstateBot }] = await Promise.all([
    supabase.from("user_telegram_links").select("bot_username, linked_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).maybeSingle(),
    supabase.from("user_telegram_links").select("bot_username").eq("user_id", user.id).eq("program_slug", REAL_ESTATE_SALES_SLUG).maybeSingle(),
  ]);
  const service = createServiceClient();
  const [kakao, resendKey, { data: ch }] = await Promise.all([
    getKakaoState(service, user.id, false),
    getResendKey(service, user.id),
    supabase.from("realty_alert_settings").select("notify_kakao, notify_email, email_to").eq("user_id", user.id).maybeSingle(),
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
        <p className="lede">이 프로그램은 AI 키 없이 동작합니다. ① 알림 받을 곳(텔레그램·카카오톡·이메일 중 하나 이상) ② 크롬 확장, 두 가지만 연결하면 됩니다.</p>
        <div className="settings-divider" />
        <h2>📨 텔레그램 연동</h2>
        <p className="lede">새 매물 알림과 정리 파일을 받을 회원님 본인 텔레그램 봇입니다. 「받는 방법」 화면과 같은 연결이에요.</p>
        <KeyHowTo ids={["telegram"]} title="텔레그램 연동 방법" />
        <TelegramCard
          telegram={link ? { botUsername: link.bot_username ?? null, linkedAt: link.linked_at ?? null } : null}
          realEstateBot={realEstateBot ? { botUsername: realEstateBot.bot_username ?? null } : null}
        />
        <div className="settings-divider" />
        <h2>💬 카카오톡 · ✉️ 이메일(Resend) 연동</h2>
        <p className="lede">카카오톡은 요약만, 이메일은 요약 + 엑셀 파일을 받아요. 「받는 방법」 화면과 같은 설정이에요.</p>
        <div className="ra-howto-grid">
          <KeyHowTo ids={["kakao"]} title="카카오톡 연동 방법" />
          <KeyHowTo ids={["resend"]} title="이메일(Resend) 연동 방법" />
        </div>
        <ChannelCards
          kakao={kakao.status === "ok" ? { ok: true, nickname: kakao.nickname, hasKey: kakaoKey } : { ok: false, message: kakao.message, connectUrl: KAKAO_CONNECT_URL, hasKey: kakaoKey }}
          email={{ hasKey: Boolean(resendKey), loginEmail: user.email ?? "" }}
          initial={{ notifyKakao: ch?.notify_kakao ?? false, notifyEmail: ch?.notify_email ?? false, emailTo: ch?.email_to ?? "" }}
        />
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
