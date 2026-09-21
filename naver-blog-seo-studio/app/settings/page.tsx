import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ApiKeySettings from "./ApiKeySettings";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ["openai", "gemini"]);
  const initialProviders = (data ?? []).map((item) => item.provider).filter((provider): provider is "openai" | "gemini" => provider === "openai" || provider === "gemini");

  return (
    <main className="settings-shell">
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>API키등록·플랫폼연동</h1>
        <p className="lede">기존 AIMaster 공용 API 키를 이 프로그램에서도 그대로 사용합니다.</p>
        <ApiKeySettings initialProviders={initialProviders} />
      </section>
    </main>
  );
}
