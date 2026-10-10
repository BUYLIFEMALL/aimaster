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
  Copy,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

      setMessage({ type: "success", text: "YouTube API 키가 정상 검증되어 안전하게 저장되었습니다!" });
      setYoutubeKeyInput("");
      fetchKeys();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "오류가 발생했습니다." });
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
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-red-100 text-red-600 rounded-lg">
            <Key className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            YouTube API 키 설정 (개인 키 연동)
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          AIMaster의 최상위 불변 원칙에 따라 각 회원은 본인의 Google Cloud 콘솔에서 발급받은 무료 API 키를 직접 등록하여 사용합니다.
        </p>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. YouTube Data API v3 등록 카드 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
              YT
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                YouTube Data API v3 키 (필수)
              </h2>
              <p className="text-xs text-gray-500">
                매일 10,000 units의 무료 쿼리가 제공됩니다. (수천 회의 쇼츠 및 채널 분석 가능)
              </p>
            </div>
          </div>

          <div>
            {isYoutubeKeyRegistered ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>연동 완료</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>미등록</span>
              </span>
            )}
          </div>
        </div>

        {/* 현재 등록된 키 상태 */}
        {isYoutubeKeyRegistered && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-gray-500">현재 등록된 키:</span>
              <div className="text-sm font-mono font-bold text-gray-800">
                {keys.youtube_api_key.maskedKey}
              </div>
            </div>
            <button
              onClick={() => handleDeleteKey("youtube_api_key")}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
          <label className="block text-xs font-bold text-gray-700">
            {isYoutubeKeyRegistered ? "새로운 API 키로 변경 등록" : "API 키 입력"}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={youtubeKeyInput}
              onChange={(e) => setYoutubeKeyInput(e.target.value)}
              placeholder="AIzaSy... 로 시작하는 API 키를 붙여넣으세요"
              className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !youtubeKeyInput.trim()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? "검증 및 저장 중..." : "검증 및 저장"}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            * 입력 즉시 YouTube 공식 서버와 통신하여 키 유효성을 자동 검증합니다.
          </p>
        </form>
      </div>

      {/* 2. YouTube API 키 발급 방법 (1분 가이드) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-gray-700" />
          <h3 className="text-base font-bold text-gray-900">
            YouTube API 키 무료 발급 방법 (1분 완료)
          </h3>
        </div>

        <ol className="space-y-3 text-xs text-gray-600 list-decimal list-inside leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
          <li>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Google Cloud 콘솔(console.cloud.google.com)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            에 접속하여 구글 계정으로 로그인합니다.
          </li>
          <li>
            상단 프로젝트 선택기에서 <span className="font-bold text-gray-900">새 프로젝트</span>를 생성합니다 (예: <span className="font-mono bg-white px-1 py-0.5 rounded border">MyYouTubeApp</span>).
          </li>
          <li>
            상단 검색창에 <span className="font-bold text-gray-900">&quot;YouTube Data API v3&quot;</span>를 검색하고 <span className="font-bold text-blue-600">&quot;사용(Enable)&quot;</span> 버튼을 클릭합니다.
          </li>
          <li>
            좌측 메뉴 <span className="font-bold text-gray-900">사용자 인증 정보(Credentials)</span> &gt; <span className="font-bold text-gray-900">+ 사용자 인증 정보 만들기</span> &gt; <span className="font-bold text-gray-900">API 키</span>를 클릭합니다.
          </li>
          <li>
            생성된 <span className="font-mono bg-white px-1 py-0.5 rounded border text-red-600 font-bold">AIzaSy...</span> 형태의 API 키를 복사하여 위 입력창에 붙여넣고 저장하면 완료됩니다!
          </li>
        </ol>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Google YouTube API는 매일 10,000 unit을 전액 무료로 제공하므로 별도의 결제가 발생하지 않습니다.
          </span>
        </div>
      </div>

      {/* 3. AI 대본 분석용 API 키 등록 카드 (Gemini / OpenAI) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              AI
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                AI 쇼츠 대본 분석용 API 키 (선택)
              </h2>
              <p className="text-xs text-gray-500">
                떡상 쇼츠의 첫 3초 훅킹 및 시청 유지력 3단 구조를 AI로 심층 해체하고 카피캣 템플릿을 생성합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Gemini 키 */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span>Google Gemini API 키 (추천 - 무료)</span>
                {keys.gemini?.registered ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    등록 완료
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    미등록
                  </span>
                )}
              </span>
              {keys.gemini?.registered && (
                <div className="text-xs font-mono font-bold text-gray-700 mt-1">
                  {keys.gemini.maskedKey}
                </div>
              )}
            </div>

            {keys.gemini?.registered && (
              <button
                onClick={() => handleDeleteKey("gemini")}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                삭제
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("geminiKey") as HTMLInputElement).value;
              handleSaveKey("gemini", input);
            }}
            className="flex gap-2"
          >
            <input
              name="geminiKey"
              type="password"
              placeholder="AIzaSy... 로 시작하는 Gemini API 키"
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all"
            >
              저장
            </button>
          </form>
        </div>

        {/* OpenAI 키 */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <span>OpenAI API 키</span>
                {keys.openai?.registered ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    등록 완료
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    미등록
                  </span>
                )}
              </span>
              {keys.openai?.registered && (
                <div className="text-xs font-mono font-bold text-gray-700 mt-1">
                  {keys.openai.maskedKey}
                </div>
              )}
            </div>

            {keys.openai?.registered && (
              <button
                onClick={() => handleDeleteKey("openai")}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                삭제
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("openaiKey") as HTMLInputElement).value;
              handleSaveKey("openai", input);
            }}
            className="flex gap-2"
          >
            <input
              name="openaiKey"
              type="password"
              placeholder="sk-... 로 시작하는 OpenAI API 키"
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-lg transition-all"
            >
              저장
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
