import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import DeliveryClient from "./DeliveryClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 📨 받는 방법(인수인계 §3-1·§5-2): 회원 본인 텔레그램 봇(공용 user_telegram_links, program_slug) + 알림 기준·파일 형식.
// 봇 토큰은 화면에 다시 보여 주지 않는다(연결 여부·봇 이름만).
export default async function DeliveryPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const [{ data: link }, { data: settings }] = await Promise.all([
    supabase.from("user_telegram_links").select("bot_username, linked_at").eq("user_id", user.id).eq("program_slug", "realty-listing-alert").maybeSingle(),
    supabase
      .from("realty_alert_settings")
      .select("notify_new, notify_price_drop, notify_price_change, notify_gone, deliver_telegram, deliver_file, file_format")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active="delivery" />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Step 3 · 받는 방법</div>
            <h1>📨 알림을 어디로 받을까요?</h1>
            <p className="lede">회원님 본인 텔레그램 봇으로 요약과 엑셀 파일을 받아요. 매물 정보는 확장이 회원님 PC에서 텔레그램으로 바로 보내고, 이 사이트를 거치지 않습니다.</p>
          </div>
        </div>
        <DeliveryClient
          telegram={link ? { botUsername: link.bot_username ?? null, linkedAt: link.linked_at ?? null } : null}
          initial={{
            notifyNew: settings?.notify_new ?? true,
            notifyPriceDrop: settings?.notify_price_drop ?? true,
            notifyPriceChange: settings?.notify_price_change ?? false,
            notifyGone: settings?.notify_gone ?? false,
            deliverTelegram: settings?.deliver_telegram ?? true,
            deliverFile: settings?.deliver_file ?? true,
            fileFormat: settings?.file_format === "csv" ? "csv" : "xlsx",
          }}
        />
      </main>
    </div>
  );
}
