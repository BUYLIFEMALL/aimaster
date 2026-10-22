import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ApiKeySettings from "./ApiKeySettings";
import ExtensionTokenManager from "./ExtensionTokenManager";
import ExtensionDownloadCard from "./ExtensionDownloadCard";
import AiModelSettings from "./AiModelSettings";
import { CONTENT_MODEL_OPTIONS } from "@/lib/ai/contentModels";
import { resolveOpenAIContentModel } from "@/lib/ai/openaiModels";
import { accountContentModel } from "@/lib/savedModel";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id).in("provider", ["openai", "anthropic", "gemini"]);
  const initialProviders = (data ?? []).map((item) => item.provider).filter((provider): provider is "openai" | "anthropic" | "gemini" => provider === "openai" || provider === "anthropic" || provider === "gemini");
  const maskedKeys = Object.fromEntries((data ?? []).map((item) => [item.provider, item.api_key.length > 10 ? `${item.api_key.slice(0, 6)}********${item.api_key.slice(-4)}` : "********"])) as Partial<Record<"openai" | "anthropic" | "gemini", string>>;
  const { data: tokens } = await supabase.from("personal_access_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id).eq("program_slug", "naver-blog-seo-studio").is("revoked_at", null).order("created_at", { ascending: false });

  return (
    <main className="settings-layout">
      <StudioSidebar email={user.email ?? ""} active="settings" />
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>API키등록·플랫폼연동</h1>
        <p className="lede">기존 AIMaster 공용 API 키를 이 프로그램에서도 그대로 사용합니다.</p>
        <ApiKeySettings initialProviders={initialProviders} maskedKeys={maskedKeys} />
        <div className="settings-divider" />
        <h2>AI 모델</h2>
        <AiModelSettings initialContent={accountContentModel(user.user_metadata, CONTENT_MODEL_OPTIONS)} initialOpenAI={resolveOpenAIContentModel(user.user_metadata?.naver_blog_seo_openai_model)} />
        <div className="settings-divider" />
        <h2>Chrome 확장 연동 토큰</h2>
        <p className="lede">이 프로그램 전용 토큰을 발급한 뒤 Chrome 확장에 입력하세요. 다른 자동화 프로그램의 토큰과 별도로 관리됩니다.</p>
        <ExtensionTokenManager initialTokens={tokens ?? []} />
        <ExtensionDownloadCard />
        <div className="guide-box"><strong>📖 연동 매뉴얼</strong><p>키 발급 방법은 AIMaster의 플랫폼 매뉴얼에서 확인할 수 있습니다.</p><div className="guide-links"><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI 키 발급</a><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Gemini 키 발급</a></div></div>
      </section>
    </main>
  );
}
