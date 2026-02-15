import { createServiceClient } from "@/lib/supabase/server";
import GoldGradientText from "@/components/ui/GoldGradientText";
import SiteSettingsManager from "@/components/admin/SiteSettingsManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "사이트 설정" };

export default async function AdminSettingsPage() {
  const supabase = createServiceClient();

  const { data: settings } = await supabase.from("site_settings").select("*");

  const settingsMap: Record<string, unknown> = {};
  (settings ?? []).forEach((s: { key: string; value: unknown }) => {
    settingsMap[s.key] = s.value;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>사이트</GoldGradientText> 설정
        </h1>
        <p className="text-subtext mt-1">사이트 전반의 설정을 관리합니다</p>
      </div>

      <SiteSettingsManager initialSettings={settingsMap} />
    </div>
  );
}
