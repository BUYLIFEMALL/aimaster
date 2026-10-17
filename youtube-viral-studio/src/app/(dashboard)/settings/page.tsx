"use client";

import { useState, useEffect } from "react";
import {
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  ShieldCheck,
  HelpCircle,
  Bot,
} from "lucide-react";
import { errorMessage } from "@/lib/errors";

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, { registered: boolean; maskedKey?: string }>>({});
  const [youtubeKeyInput, setYoutubeKeyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      const data = await res.json();
      if (res.ok && data.keys) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 화면을 열 때 저장된 키 목록을 한 번 불러오는 정상 패턴(상태 변경은 응답을 받은 뒤 비동기로 일어남)
    fetchKeys();
  }, []);

  const handleSaveKey = async (provider: string, apiKey: string) => {
    if (!apiKey.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "API 키 등록에 실패했습니다." });
        return;
      }

      setMessage({ type: "success", text: "API 키가 정상 검증되어 안전하게 저장되었습니다!" });
      if (provider === "youtube_api_key") setYoutubeKeyInput("");
      fetchKeys();
    } catch (err: unknown) {
      setMessage({ type: "error", text: errorMessage(err) || "오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm("정말 이 API 키를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/settings/api-keys?provider=${provider}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "API 키가 삭제되었습니다." });
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isYoutubeKeyRegistered = keys.youtube_api_key?.registered;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 상단 타이틀 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-yt-red/10 text-yt-danger rounded-lg">
            <Key className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-yt-text">
            API 키 등록 및 연동 (개인 키 연동)
          </h1>
        </div>
        <p className="text-sm text-yt-muted mt-1">
          AIMaster의 최상위 불변 원칙에 따라 각 회원은 본인이 사용할 본인 API 키를 각각 직접 등록·연동하여 사용합니다.
        </p>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-yt-success/10 border border-yt-success/30 text-yt-success"
              : "bg-yt-red/10 border border-yt-red/40 text-yt-danger"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-yt-success shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yt-danger shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. AI 쇼츠 대본 분석용 API 키 등록 카드 (OpenAI / Gemini) - 맨 위 배치 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yt-violet/15 text-yt-violet flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-yt-text">
                AI 쇼츠 대본 분석용 API 키 (OpenAI / Gemini)
              </h2>
              <p className="text-xs text-yt-muted">
                떡상 쇼츠의 첫 3초 훅킹 및 시청 유지력 3단 구조를 AI로 심층 해체하고 카피캣 템플릿을 생성합니다.
              </p>
            </div>
          </div>
        </div>

        {/* OpenAI 키 (첫 번째) */}
        <div className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-yt-text flex items-center gap-1.5 flex-wrap">
                <span>OpenAI API 키</span>
                {keys.openai?.registered ? (
                  <span className="text-[10px] font-semibold text-yt-success bg-yt-success/10 px-2 py-0.5 rounded-full border border-yt-success/30 shrink-0">
                    등록 완료
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-yt-muted bg-yt-raised px-2 py-0.5 rounded-full shrink-0">
                    미등록
                  </span>
                )}
              </span>
              {keys.openai?.registered && (
                <div
                  className="text-xs font-mono font-bold text-yt-text mt-1 truncate"
                  title={keys.openai.maskedKey}
                >
                  {keys.openai.maskedKey}
                </div>
              )}
            </div>

            {keys.openai?.registered && (
              <button
                type="button"
                onClick={() => handleDeleteKey("openai")}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 text-xs text-yt-danger hover:bg-yt-red/20 rounded-md font-semibold transition-colors border border-yt-red/40 bg-yt-surface"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>삭제</span>
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("openaiKey") as HTMLInputElement;
              handleSaveKey("openai", input.value);
              input.value = "";
            }}
            className="flex gap-2"
          >
            <input
              name="openaiKey"
              type="password"
              placeholder="sk-... 로 시작하는 OpenAI API 키"
              className="flex-1 px-3 py-2 bg-yt-surface border border-yt-border rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-yt-raised hover:bg-black text-white text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap"
            >
              저장
            </button>
          </form>
        </div>

        {/* Google Gemini 키 (두 번째) */}
        <div className="p-4 rounded-xl bg-yt-raised border border-yt-border space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-yt-text flex items-center gap-1.5 flex-wrap">
                <span>Google Gemini API 키 (추천 - 무료)</span>
                {keys.gemini?.registered ? (
                  <span className="text-[10px] font-semibold text-yt-success bg-yt-success/10 px-2 py-0.5 rounded-full border border-yt-success/30 shrink-0">
                    등록 완료
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-yt-muted bg-yt-raised px-2 py-0.5 rounded-full shrink-0">
                    미등록
                  </span>
                )}
              </span>
              {keys.gemini?.registered && (
                <div
                  className="text-xs font-mono font-bold text-yt-text mt-1 truncate"
                  title={keys.gemini.maskedKey}
                >
                  {keys.gemini.maskedKey}
                </div>
              )}
            </div>

            {keys.gemini?.registered && (
              <button
                type="button"
                onClick={() => handleDeleteKey("gemini")}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 text-xs text-yt-danger hover:bg-yt-red/20 rounded-md font-semibold transition-colors border border-yt-red/40 bg-yt-surface"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>삭제</span>
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("geminiKey") as HTMLInputElement;
              handleSaveKey("gemini", input.value);
              input.value = "";
            }}
            className="flex gap-2"
          >
            <input
              name="geminiKey"
              type="password"
              placeholder="AIzaSy... 로 시작하는 Gemini API 키"
              className="flex-1 px-3 py-2 bg-yt-surface border border-yt-border rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap"
            >
              저장
            </button>
          </form>
        </div>
      </div>

      {/* 2. YouTube Data API v3 등록 카드 */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yt-red/10 text-yt-danger flex items-center justify-center font-bold">
              YT
            </div>
            <div>
              <h2 className="text-base font-bold text-yt-text">
                YouTube Data API v3 키 (필수)
              </h2>
              <p className="text-xs text-yt-muted">
                기본 할당량은 search.list 하루 100회, 기타 API 합산 하루 10,000 units입니다. 검색 한 번에 여러 요청이 사용될 수 있습니다.
              </p>
            </div>
          </div>

          <div>
            {isYoutubeKeyRegistered ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yt-success/10 text-yt-success border border-yt-success/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>연동 완료</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yt-warn/10 text-yt-warn border border-yt-warn/40">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>미등록</span>
              </span>
            )}
          </div>
        </div>

        {/* 현재 등록된 키 상태 */}
        {isYoutubeKeyRegistered && (
          <div className="p-4 rounded-xl bg-yt-raised border border-yt-border flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-yt-muted">현재 등록된 키:</span>
              <div
                className="text-sm font-mono font-bold text-yt-text truncate"
                title={keys.youtube_api_key.maskedKey}
              >
                {keys.youtube_api_key.maskedKey}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteKey("youtube_api_key")}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-yt-danger hover:bg-yt-red/20 rounded-lg transition-colors border border-yt-red/40 bg-yt-surface"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>키 삭제</span>
            </button>
          </div>
        )}

        {/* 키 등록 및 변경 입력 폼 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveKey("youtube_api_key", youtubeKeyInput);
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-bold text-yt-text">
            {isYoutubeKeyRegistered ? "새로운 API 키로 변경 등록" : "API 키 입력"}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={youtubeKeyInput}
              onChange={(e) => setYoutubeKeyInput(e.target.value)}
              placeholder="AIzaSy... 로 시작하는 API 키를 붙여넣으세요"
              className="flex-1 px-3.5 py-2.5 bg-yt-raised border border-yt-border rounded-xl text-sm font-mono text-yt-text focus:bg-yt-surface focus:outline-hidden focus:ring-2 focus:ring-yt-red focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !youtubeKeyInput.trim()}
              className="px-5 py-2.5 bg-yt-red hover:bg-yt-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              {submitting ? "검증 및 저장 중..." : "검증 및 저장"}
            </button>
          </div>
          <p className="text-[11px] text-yt-muted">
            * 입력 즉시 YouTube 공식 서버와 통신하여 키 유효성을 자동 검증합니다.
          </p>
        </form>
      </div>

      {/* 3. YouTube API 키 발급 방법 (1분 가이드) */}
      <div className="bg-yt-surface p-6 rounded-2xl border border-yt-border shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-yt-text" />
          <h3 className="text-base font-bold text-yt-text">
            YouTube API 키 무료 발급 방법 (1분 완료)
          </h3>
        </div>

        <ol className="space-y-3 text-xs text-yt-muted list-decimal list-inside leading-relaxed bg-yt-raised p-4 rounded-xl border border-yt-border">
          <li>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-yt-link hover:underline inline-flex items-center gap-1"
            >
              <span>Google Cloud 콘솔(console.cloud.google.com)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            에 접속하여 구글 계정으로 로그인합니다.
          </li>
          <li>
            상단 프로젝트 선택기에서 <span className="font-bold text-yt-text">새 프로젝트</span>를 생성합니다 (예: <span className="font-mono bg-yt-surface px-1 py-0.5 rounded border">MyYouTubeApp</span>).
          </li>
          <li>
            상단 검색창에 <span className="font-bold text-yt-text">&quot;YouTube Data API v3&quot;</span>를 검색하고 <span className="font-bold text-yt-link">&quot;사용(Enable)&quot;</span> 버튼을 클릭합니다.
          </li>
          <li>
            좌측 메뉴 <span className="font-bold text-yt-text">사용자 인증 정보(Credentials)</span> &gt; <span className="font-bold text-yt-text">+ 사용자 인증 정보 만들기</span> &gt; <span className="font-bold text-yt-text">API 키</span>를 클릭합니다.
          </li>
          <li>
            생성된 <span className="font-mono bg-yt-surface px-1 py-0.5 rounded border text-yt-danger font-bold">AIzaSy...</span> 형태의 API 키를 복사하여 위 입력창에 붙여넣고 저장하면 완료됩니다!
          </li>
        </ol>

        <div className="p-3 bg-yt-link/10 border border-yt-link/30 rounded-xl text-xs text-yt-link flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-yt-link shrink-0 mt-0.5" />
          <span>
            YouTube 기본 할당량은 search.list 하루 100회와 기타 API 합산 10,000 units로 구분됩니다. 본인 Google Cloud 콘솔에서 실제 한도를 확인해주세요. AI 대본 분석은 별도 사용료가 발생할 수 있습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
