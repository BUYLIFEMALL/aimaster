import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import ApiKeySettings from "./ApiKeySettings";
import ExtensionTokenManager from "./ExtensionTokenManager";
import ExtensionDownloadCard from "./ExtensionDownloadCard";
import SettingsSidebar from "./SettingsSidebar";
import AiModelSettings from "./AiModelSettings";
import { getUserOpenAIContentModel } from "@/lib/ai/openaiModels";
import { getUserGeminiImageModel } from "@/lib/ai/geminiModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const initialModel = getUserOpenAIContentModel(user.user_metadata);
  const initialGeminiModel = getUserGeminiImageModel(user.user_metadata);
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id).in("provider", ["openai", "gemini"]);
  const initialProviders = (data ?? []).map((item) => item.provider).filter((provider): provider is "openai" | "gemini" => provider === "openai" || provider === "gemini");
  const maskedKeys = Object.fromEntries((data ?? []).map((item) => [item.provider, item.api_key.length > 10 ? `${item.api_key.slice(0, 6)}********${item.api_key.slice(-4)}` : "********"])) as Partial<Record<"openai" | "gemini", string>>;
  const { data: tokens } = await supabase.from("personal_access_tokens").select("id, label, created_at, last_used_at").eq("user_id", user.id).eq("program_slug", "naver-blog-seo-studio").is("revoked_at", null).order("created_at", { ascending: false });

  return (
    <main className="settings-layout">
      <SettingsSidebar email={user.email ?? null} />
      <aside className="settings-sidebar legacy-settings-sidebar">
        <a className="settings-brand" href="/dashboard"><em>SEO</em> 스튜디오</a>
        <nav className="settings-nav" aria-label="주 메뉴">
          <a href="/dashboard"><span className="settings-step">1</span><span><strong>새 글 만들기</strong><small>AI 초안 작성</small></span></a>
          <a className="active" href="/settings"><span className="settings-step">2</span><span><strong>API·확장 연동</strong><small>키와 토큰 설정</small></span></a>
          <a href="https://www.buylife.xyz/"><span className="settings-step">3</span><span><strong>AIMaster 메인</strong><small>다른 프로그램 보기</small></span></a>
          <div className="settings-nav-divider" />
          <a href="/dashboard#title"><span className="settings-step">2</span><span><strong>제목 추천</strong><small>검색 의도 분석</small></span></a>
          <a href="/dashboard#draft"><span className="settings-step">3</span><span><strong>기존 글 최적화</strong><small>콘텐츠 개선</small></span></a>
          <a href="/dashboard#history"><span className="settings-step">4</span><span><strong>생성 기록</strong><small>작성한 초안 확인</small></span></a>
          <a className="active" href="/settings#api-key"><span className="settings-step">5</span><span><strong>API 키 등록</strong><small>OpenAI·Gemini 키</small></span></a>
          <a href="/settings#platform"><span className="settings-step">6</span><span><strong>플랫폼 연동</strong><small>Chrome 확장 토큰</small></span></a>
        </nav>
        <div className="settings-sidebar-account" title={user.email ?? ""}>
          <span>로그인 계정</span>
          <strong>{user.email ?? "이메일 없음"}</strong>
        </div>
        <p className="settings-sidebar-note">AI 초안은 직접 확인한 뒤 네이버에서 최종 발행하세요.</p>
      </aside>
      <section className="settings-card">
        <div className="eyebrow">Settings</div>
        <h1>API키등록·플랫폼연동</h1>
        <p className="lede">기존 AIMaster 공용 API 키를 이 프로그램에서도 그대로 사용합니다.</p>
        <ApiKeySettings initialProviders={initialProviders} maskedKeys={maskedKeys} initialModel={initialModel} initialGeminiModel={initialGeminiModel} />
        <div className="settings-divider" />
        <h2>콘텐츠 생성모델</h2>
        <p className="lede">사용자 계정에 선택값을 저장하며 웹 대시보드와 Chrome 확장에서 함께 사용합니다.</p>
        <AiModelSettings initialModel={initialModel} />
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
