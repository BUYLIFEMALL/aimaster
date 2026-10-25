import { requireProgramAccess, PROGRAM_SLUG } from "@/lib/access";
import { toAiProvider } from "@/lib/aiProviders";
import PublicDataKeyCard from "./PublicDataKeyCard";
import { KeyHowTo } from "@/components/KeyGuide";
import { createClient } from "@/lib/supabase/server";
import ExtensionTokenManager from "./ExtensionTokenManager";
import ExtensionConnectButton from "./ExtensionConnectButton";
import ExtensionDownloadCard from "./ExtensionDownloadCard";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { AiEngineCard, EmailSetup, KakaoSetup, TelegramCard } from "@/app/delivery/DeliveryClient";
import { ConfirmButton, SetupTable } from "./SetupTable";
import { APP_VERSION } from "@/lib/version";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { deletePublicDataKeyAction, deleteResendKeyAction } from "@/lib/actions/notify";
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
    supabase.from("realty_alert_settings").select("notify_kakao, notify_email, email_to, notify_ai_summary, ai_provider, ai_models").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data: tokens } = await supabase.from("personal_access_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id).eq("program_slug", PROGRAM_SLUG).is("revoked_at", null).order("created_at", { ascending: false });

  const kakaoKey = await hasKakaoKey(service, user.id);
  const { data: pdRow } = await service.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", "data_go_kr_service_key").maybeSingle();
  const pdKey = Boolean(pdRow?.api_key);
  const pdTail = typeof pdRow?.api_key === "string" ? pdRow.api_key.slice(-4) : ""; // 화면엔 끝 4자리만
  const lastUsedAt = (tokens ?? []).map((t) => t.last_used_at).filter(Boolean).sort().pop();
  const lastUsed = lastUsedAt ? new Date(lastUsedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }) : "없음";
  return (
    <main className="settings-layout">
      <StudioSidebar email={user.email ?? ""} active="settings" />
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>🔑 API키등록·플랫폼연동</h1>
        <p className="lede">연결·키 등록은 모두 여기서 해요. 켜고 끄기는 「3 · 받는 방법」에서 해요.</p>

        {/* 2026-10-25 페이지 구성 다시(주인님 「이걸로 하고 페이지 구성 다시 해봐」): ① 확장 ② 알림 받을 곳 ③ AI ④ 공공데이터, 모두 같은 표 모양 */}
        <section className="card ra-setup-card">
          <div className="ra-card-head"><h2 className="card-title"><span className="ra-step">① 필수</span>🧩 크롬 확장</h2></div>
          <SetupTable head={["항목", "상태", "정보"]} rows={[{
            id: "extension", name: "🧩 확장", on: (tokens?.length ?? 0) > 0, onLabel: "✓ 연결됨", offLabel: "연결 전",
            info: (tokens?.length ?? 0) > 0 ? `${APP_VERSION} · PC ${tokens!.length}대 · 최근 ${lastUsed}` : "설치 후 「연결」을 눌러 주세요",
            quick: <ExtensionConnectButton label="연결" compact />,
            issue: { href: "/downloads/realty-listing-alert-extension-latest.zip", label: "⬇ 받기" },
            openLabel: "설치·PC",
            detail: (<>
              <ExtensionDownloadCard />
              <p className="token-manual-title">예전 PC나 다른 크롬 프로필에 연결된 확장을 끊을 수 있어요. 다시 연결하려면 그 브라우저에서 「확장 프로그램 바로 연결」을 누르면 됩니다.</p>
              <ExtensionTokenManager initialTokens={tokens ?? []} />
            </>),
          }]} />
        </section>

        <section className="card ra-setup-card">
          <div className="ra-card-head"><h2 className="card-title"><span className="ra-step">② 필수</span>📨 알림 받을 곳 <small className="ra-engine-sub">하나 이상 연결</small></h2></div>
          <SetupTable head={["받는 곳", "상태", "연결 정보"]} rows={[
            {
              id: "telegram", name: "📨 텔레그램", sub: "요약 + 엑셀", on: Boolean(link),
              info: link ? `@${link.bot_username ?? "봇"}` : "회원님 텔레그램 봇 토큰으로 연결",
              quick: link ? <ConfirmButton label="끊기" confirm="텔레그램 연결을 끊어요" action={disconnectTelegramAction} /> : null,
              issue: { href: "https://t.me/BotFather", label: "발급 ↗" },
              openLabel: link ? "방법" : "연결하기",
              detail: (<>
                <KeyHowTo ids={["telegram"]} title="텔레그램 연동 방법" />
                <TelegramCard telegram={link ? { botUsername: link.bot_username ?? null, linkedAt: link.linked_at ?? null } : null} realEstateBot={realEstateBot ? { botUsername: realEstateBot.bot_username ?? null } : null} />
              </>),
            },
            {
              id: "email", name: "✉️ 이메일", sub: "요약 + 엑셀", on: Boolean(resendKey),
              info: resendKey ? `••••${resendKey.slice(-4)} · ${ch?.email_to || "받는 주소 없음"}` : "Resend(무료) 키로 보내요",
              quick: resendKey ? <ConfirmButton label="삭제" confirm="Resend 키를 지워요" action={deleteResendKeyAction} /> : null,
              issue: { href: "https://resend.com/api-keys", label: "발급 ↗" },
              detail: (<>
                <KeyHowTo ids={["resend"]} title="이메일(Resend) 연동 방법" />
                <EmailSetup email={{ hasKey: Boolean(resendKey), loginEmail: user.email ?? "" }} emailTo={ch?.email_to ?? ""} />
              </>),
            },
            {
              id: "kakao", name: "💬 카카오톡", sub: "요약만", on: kakao.status === "ok", onLabel: "✓ 연결됨",
              info: kakao.status === "ok" ? (kakao.nickname ? `${kakao.nickname}` : "카카오 계정") : kakaoKey ? "앱 키 저장됨 · 연결 전" : "회원님 카카오 앱으로 연결",
              issue: { href: "https://developers.kakao.com/console/app", label: "발급 ↗" },
              defaultOpen: Boolean(kakaoNotice),
              detail: (<>
                <KeyHowTo ids={["kakao"]} title="카카오톡 연동 방법" />
                <KakaoSetup kakao={kakao.status === "ok" ? { ok: true, nickname: kakao.nickname, hasKey: kakaoKey, notice: kakaoNotice } : { ok: false, message: kakao.message, connectUrl: KAKAO_CONNECT_URL, hasKey: kakaoKey, notice: kakaoNotice }} />
              </>),
            },
          ]} />
        </section>

        <div id="ai" />
        <AiEngineCard ai={aiKeys} initialProvider={toAiProvider(ch?.ai_provider)} models={(ch?.ai_models as Record<string, string> | null) ?? {}} />

        <section className="card ra-setup-card">
          <div className="ra-card-head"><h2 className="card-title"><span className="ra-step opt">④ 선택</span>🏛 실거래가 비교</h2></div>
          <SetupTable head={["항목", "상태", "API 키"]} rows={[{
            id: "publicData", name: "🏛 공공데이터", on: pdKey,
            info: pdKey ? `••••${pdTail} · 내 키로 비교` : "없으면 공용 키로 비교",
            quick: pdKey ? <ConfirmButton label="삭제" confirm="공공데이터 키를 지워요" action={deletePublicDataKeyAction} /> : null,
            issue: { href: "https://www.data.go.kr/data/15126469/openapi.do", label: "신청 ↗" },
            detail: (<>
              <KeyHowTo ids={["publicData"]} title="공공데이터 키 가져오는 법" />
              <PublicDataKeyCard hasKey={pdKey} />
            </>),
          }]} />
        </section>

        <div className="guide-box"><strong>📖 연동 매뉴얼</strong><p>확장 설치·텔레그램 봇 만들기·감시 대상·예약 순서는 매뉴얼에 그림과 함께 정리돼 있습니다.</p><div className="guide-links"><a href="/guide">연동 & 사용 매뉴얼 열기</a><a href="https://core.telegram.org/bots/tutorial" target="_blank" rel="noreferrer">텔레그램 봇 공식 안내</a><a href="https://resend.com/docs/dashboard/api-keys/introduction" target="_blank" rel="noreferrer">Resend API 키 공식 안내</a></div></div>
      </section>
    </main>
  );
}
