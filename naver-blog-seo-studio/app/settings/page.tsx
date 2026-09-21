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
    <main className="settings-layout">
      <aside className="settings-sidebar">
        <a className="settings-brand" href="/dashboard"><em>SEO</em> 스튜디오</a>
        <nav className="settings-nav" aria-label="주 메뉴">
          <a href="/dashboard"><span className="settings-step">1</span><span><strong>새 글 만들기</strong><small>AI 초안 작성</small></span></a>
          <a className="active" href="/settings"><span className="settings-step">2</span><span><strong>API·확장 연동</strong><small>키와 토큰 설정</small></span></a>
          <a href="https://www.buylife.xyz/"><span className="settings-step">3</span><span><strong>AIMaster 메인</strong><small>다른 프로그램 보기</small></span></a>
        </nav>
        <p className="settings-sidebar-note">AI 초안은 직접 확인한 뒤 네이버에서 최종 발행하세요.</p>
      </aside>
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
