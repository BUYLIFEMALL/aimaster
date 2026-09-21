import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ApiKeySettings from "./ApiKeySettings";
import ExtensionTokenManager from "./ExtensionTokenManager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider").eq("user_id", user.id).in("provider", ["openai", "gemini"]);
  const initialProviders = (data ?? []).map((item) => item.provider).filter((provider): provider is "openai" | "gemini" => provider === "openai" || provider === "gemini");
  const { data: tokens } = await supabase.from("personal_access_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id).eq("program_slug", "naver-blog-seo-studio").is("revoked_at", null).order("created_at", { ascending: false });

  return (
    <main className="settings-shell">
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>API키등록·플랫폼연동</h1>
        <p className="lede">기존 AIMaster 공용 API 키를 이 프로그램에서도 그대로 사용합니다.</p>
        <ApiKeySettings initialProviders={initialProviders} />
        <div className="settings-divider" />
        <h2>Chrome 확장 연동 토큰</h2>
        <p className="lede">이 프로그램 전용 토큰을 발급한 뒤 Chrome 확장에 입력하세요. 다른 자동화 프로그램의 토큰과 별도로 관리됩니다.</p>
        <ExtensionTokenManager initialTokens={tokens ?? []} />
      </section>
    </main>
  );
}
