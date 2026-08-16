"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Image as ImageIcon, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

  // 사이드바(다크골드)는 그대로 두고, 이 페이지 콘텐츠 영역만 흰색 배경으로 표시한다
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;
    document.body.style.backgroundColor = "#ffffff";
    document.body.style.color = "#0f172a";
    document.body.classList.add("bg-white");
    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
      document.body.classList.remove("bg-white");
    };
  }, []);

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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">API 설정</h1>
        <p className="text-slate-500 mt-1">
          여기서 등록한 키는 threads, blog 등 모든 프로그램에서 공통으로 사용됩니다.
          등록하지 않으면 각 프로그램의 기본 키로 동작합니다 (제공되는 경우).
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* AI 모델 API 키 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <KeyRound size={18} className="text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">AI 모델 API 키</h2>
          </div>

          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const saved = apiKeys[provider];
              return (
                <div key={provider} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">{PROVIDER_LABELS[provider]}</p>
                    {saved && (
                      <button
                        onClick={() => handleDeleteApiKey(provider)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    )}
                  </div>

                  {saved ? (
                    <p className="font-mono text-sm text-slate-500">{maskSecret(saved)} · 등록됨</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="password"
                        value={apiKeyInputs[provider]}
                        onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
                        placeholder="API 키 입력"
                        className="flex-1 min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveApiKey(provider)}
                        disabled={!apiKeyInputs[provider].trim()}
                        className="px-4 py-2 rounded-xl text-sm font-bold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        저장
                      </button>
                    </div>
                  )}
                  {apiKeyMsg[provider] && (
                    <p
                      className={`mt-1 text-xs flex items-center gap-1 ${
                        apiKeyMsg[provider]?.includes("저장") ? "text-emerald-600" : "text-red-500"
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
        </div>

        {/* Cloudinary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ImageIcon size={18} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Cloudinary (생성 이미지 업로드)</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            등록하면 AI로 생성한 이미지를 본문에 직접 삽입(base64)하지 않고 본인 Cloudinary
            계정에 업로드한 뒤 그 링크를 삽입합니다. 등록하지 않으면 base64로 삽입됩니다.
          </p>

          {cloudinary ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-900">등록됨</p>
                <button
                  onClick={handleDeleteCloudinary}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 size={12} />
                  삭제
                </button>
              </div>
              <div className="space-y-1 font-mono text-sm text-slate-500">
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
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <input
                type="password"
                value={cloudinaryInput.apiKey}
                onChange={(e) => setCloudinaryInput((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="API Key"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <input
                type="password"
                value={cloudinaryInput.apiSecret}
                onChange={(e) => setCloudinaryInput((prev) => ({ ...prev, apiSecret: e.target.value }))}
                placeholder="API Secret"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <button
                type="submit"
                className="sm:col-span-3 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-colors"
              >
                저장
              </button>
            </form>
          )}
          {cloudinaryMsg && (
            <p
              className={`mt-2 text-xs flex items-center gap-1 ${
                cloudinaryMsg.includes("저장") ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {cloudinaryMsg.includes("저장") && <Check size={12} />}
              {cloudinaryMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
