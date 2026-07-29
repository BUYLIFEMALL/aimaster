"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Image as ImageIcon, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";

type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";

const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
  perplexity: "Perplexity",
};
const PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini", "perplexity"];

function maskSecret(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}

export default function ApiSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [apiKeys, setApiKeys] = useState<Record<ApiKeyProvider, string | null>>({
    openai: null,
    anthropic: null,
    gemini: null,
    perplexity: null,
  });
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<ApiKeyProvider, string>>({
    openai: "",
    anthropic: "",
    gemini: "",
    perplexity: "",
  });
  const [apiKeyMsg, setApiKeyMsg] = useState<Partial<Record<ApiKeyProvider, string>>>({});

  const [cloudinary, setCloudinary] = useState<{ cloud_name: string; api_key: string; api_secret: string } | null>(null);
  const [cloudinaryInput, setCloudinaryInput] = useState({ cloudName: "", apiKey: "", apiSecret: "" });
  const [cloudinaryMsg, setCloudinaryMsg] = useState("");

  async function loadAll(uid: string) {
    const [{ data: keys }, { data: cfg }] = await Promise.all([
      supabase.from("user_api_keys").select("provider, api_key").eq("user_id", uid),
      supabase.from("user_cloudinary_config").select("cloud_name, api_key, api_secret").eq("user_id", uid).maybeSingle(),
    ]);
    const map: Record<ApiKeyProvider, string | null> = { openai: null, anthropic: null, gemini: null, perplexity: null };
    (keys ?? []).forEach((k: { provider: ApiKeyProvider; api_key: string }) => {
      map[k.provider] = k.api_key;
    });
    setApiKeys(map);
    setCloudinary(cfg ?? null);
  }

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, [supabase, router]);

  async function handleSaveApiKey(provider: ApiKeyProvider) {
    const value = apiKeyInputs[provider].trim();
    if (!value) return;
    const { error } = await supabase
      .from("user_api_keys")
      .upsert({ user_id: userId, provider, api_key: value }, { onConflict: "user_id,provider" });

    setApiKeyMsg((prev) => ({ ...prev, [provider]: error ? error.message : "저장되었습니다" }));
    if (!error) {
      setApiKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      await loadAll(userId);
    }
  }

  async function handleDeleteApiKey(provider: ApiKeyProvider) {
    await supabase.from("user_api_keys").delete().eq("user_id", userId).eq("provider", provider);
    await loadAll(userId);
  }

  async function handleSaveCloudinary(e: React.FormEvent) {
    e.preventDefault();
    const { cloudName, apiKey, apiSecret } = cloudinaryInput;
    if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
      setCloudinaryMsg("Cloud Name, API Key, API Secret을 모두 입력해주세요.");
      return;
    }
    const { error } = await supabase.from("user_cloudinary_config").upsert(
      { user_id: userId, cloud_name: cloudName.trim(), api_key: apiKey.trim(), api_secret: apiSecret.trim() },
      { onConflict: "user_id" },
    );
    setCloudinaryMsg(error ? error.message : "저장되었습니다");
    if (!error) {
      setCloudinaryInput({ cloudName: "", apiKey: "", apiSecret: "" });
      await loadAll(userId);
    }
  }

  async function handleDeleteCloudinary() {
    await supabase.from("user_cloudinary_config").delete().eq("user_id", userId);
    await loadAll(userId);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>API 설정</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1">
          여기서 등록한 키는 threads, blog 등 모든 프로그램에서 공통으로 사용됩니다.
          등록하지 않으면 각 프로그램의 기본 키로 동작합니다 (제공되는 경우).
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* AI 모델 API 키 */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <KeyRound size={18} className="text-gold" />
            </div>
            <h2 className="text-lg font-bold text-white">AI 모델 API 키</h2>
          </div>

          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const saved = apiKeys[provider];
              return (
                <div key={provider} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">{PROVIDER_LABELS[provider]}</p>
                    {saved && (
                      <button
                        onClick={() => handleDeleteApiKey(provider)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    )}
                  </div>

                  {saved ? (
                    <p className="font-mono text-sm text-subtext">{maskSecret(saved)} · 등록됨</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="password"
                        value={apiKeyInputs[provider]}
                        onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
                        placeholder="API 키 입력"
                        className="input-dark flex-1 min-w-[200px]"
                      />
                      <GoldButton
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveApiKey(provider)}
                        disabled={!apiKeyInputs[provider].trim()}
                      >
                        저장
                      </GoldButton>
                    </div>
                  )}
                  {apiKeyMsg[provider] && (
                    <p
                      className={`mt-1 text-xs flex items-center gap-1 ${
                        apiKeyMsg[provider]?.includes("저장") ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {apiKeyMsg[provider]?.includes("저장") && <Check size={12} />}
                      {apiKeyMsg[provider]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Cloudinary */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ImageIcon size={18} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Cloudinary (생성 이미지 업로드)</h2>
          </div>
          <p className="text-xs text-subtext mb-4">
            등록하면 AI로 생성한 이미지를 본문에 직접 삽입(base64)하지 않고 본인 Cloudinary
            계정에 업로드한 뒤 그 링크를 삽입합니다. 등록하지 않으면 base64로 삽입됩니다.
          </p>

          {cloudinary ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">등록됨</p>
                <button
                  onClick={handleDeleteCloudinary}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 size={12} />
                  삭제
                </button>
              </div>
              <div className="space-y-1 font-mono text-sm text-subtext">
                <p>Cloud Name: {cloudinary.cloud_name}</p>
                <p>API Key: {maskSecret(cloudinary.api_key)}</p>
                <p>API Secret: {maskSecret(cloudinary.api_secret)}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveCloudinary} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={cloudinaryInput.cloudName}
                onChange={(e) => setCloudinaryInput((prev) => ({ ...prev, cloudName: e.target.value }))}
                placeholder="Cloud Name"
                className="input-dark"
              />
              <input
                type="password"
                value={cloudinaryInput.apiKey}
                onChange={(e) => setCloudinaryInput((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="API Key"
                className="input-dark"
              />
              <input
                type="password"
                value={cloudinaryInput.apiSecret}
                onChange={(e) => setCloudinaryInput((prev) => ({ ...prev, apiSecret: e.target.value }))}
                placeholder="API Secret"
                className="input-dark"
              />
              <GoldButton type="submit" size="sm" className="sm:col-span-3">
                저장
              </GoldButton>
            </form>
          )}
          {cloudinaryMsg && (
            <p
              className={`mt-2 text-xs flex items-center gap-1 ${
                cloudinaryMsg.includes("저장") ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {cloudinaryMsg.includes("저장") && <Check size={12} />}
              {cloudinaryMsg}
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
