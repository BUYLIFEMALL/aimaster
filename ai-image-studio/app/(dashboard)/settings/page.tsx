"use client";

import { useState, useEffect } from "react";
import { GuideModal } from "@/components/GuideModal";
import { Key, Check, AlertCircle, RefreshCw, Lock, Sparkles, ExternalLink } from "lucide-react";

interface KeyItem {
  provider: string;
  name: string;
  desc: string;
  placeholder: string;
  link: string;
  isRegistered: boolean;
}

const PROVIDER_INFO: Record<string, { name: string; desc: string; placeholder: string; link: string }> = {
  openai: {
    name: "OpenAI API Key (DALL-E 3 / DALL-E 2)",
    desc: "OpenAI DALL-E 이미지 생성 및 AI 한글 프롬프트 최적화에 사용됩니다.",
    placeholder: "sk-...",
    link: "https://platform.openai.com/api-keys",
  },
  fal: {
    name: "Fal.ai API Key (FLUX.1 / Recraft V3)",
    desc: "FLUX.1 dev/schnell 및 Recraft V3 초고화질 일러스트 생성에 사용됩니다.",
    placeholder: "fal_...",
    link: "https://fal.ai/dashboard/keys",
  },
  gemini: {
    name: "Google Gemini API Key (Imagen 3)",
    desc: "Google Imagen 3.0 포토리얼 및 타이포그래피 생성에 사용됩니다.",
    placeholder: "AIzaSy...",
    link: "https://aistudio.google.com/app/apikey",
  },
  stability: {
    name: "Stability AI Key (SD3.5 / Ultra)",
    desc: "Stable Diffusion 3.5 Large 및 Stable Image Ultra 생성에 사용됩니다.",
    placeholder: "sk-...",
    link: "https://platform.stability.ai/account/keys",
  },
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [registeredList, setRegisteredList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/user-keys");
      const data = await res.json();
      if (data.registeredProviders) {
        setRegisteredList(data.registeredProviders);
      }
    } catch (err) {
      console.error("Failed to fetch keys", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleSaveKey = async (provider: string) => {
    const val = keys[provider];
    if (!val || !val.trim()) return;

    setSavingProvider(provider);
    setMessage(null);

    try {
      const res = await fetch("/api/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: val.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      setMessage({ type: "success", text: `[${PROVIDER_INFO[provider]?.name || provider}] API 키가 성공적으로 저장되었습니다.` });
      setKeys((prev) => ({ ...prev, [provider]: "" }));
      fetchKeys();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "오류가 발생했습니다." });
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <Key className="h-6 w-6 text-amber-400" />
          API키등록·플랫폼연동
        </h1>
        <p className="text-xs text-zinc-400">
          이미지 자동화에 필요한 각 플랫폼의 API 키를 등록합니다. 등록하신 키는 암호화 보관되며 본인 계정 생성 시에만 안전하게 사용됩니다.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
          const isRegistered = registeredList.includes(provider);

          return (
            <div
              key={provider}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xl space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    {info.name}
                  </span>
                  {isRegistered ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                      <Check className="h-3 w-3" />
                      등록됨
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-zinc-500 bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800">
                      미등록
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{info.desc}</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>공식 발급 페이지 바로가기</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={keys[provider] || ""}
                    onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                    placeholder={isRegistered ? "새 키로 변경하려면 입력하세요" : info.placeholder}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <button
                    onClick={() => handleSaveKey(provider)}
                    disabled={savingProvider === provider || !keys[provider]?.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {savingProvider === provider ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    <span>저장</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GuideModal />
    </div>
  );
}
