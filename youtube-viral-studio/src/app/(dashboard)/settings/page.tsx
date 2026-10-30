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
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "API 키 저장에 실패했습니다." });
        return;
      }

      setMessage({ type: "success", text: "API 키가 성공적으로 검증 및 저장되었습니다!" });
      setYoutubeKeyInput("");
      fetchKeys();
    } catch (err: unknown) {
      setMessage({ type: "error", text: errorMessage(err) || "저장 중 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm("정말 이 API 키를 삭제하시겠습니까?")) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/settings/api-keys?provider=${provider}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "삭제에 실패했습니다." });
        return;
      }

      setMessage({ type: "success", text: "API 키가 안전하게 삭제되었습니다." });
      fetchKeys();
    } catch (err: unknown) {
      setMessage({ type: "error", text: errorMessage(err) || "삭제 중 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  };

  const isYoutubeKeyRegistered = keys.youtube_api_key?.registered;
  const isClaudeRegistered = keys.claude_api_key?.registered || keys.anthropic_api_key?.registered;

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#EA3323]">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              API 키 및 외부 플랫폼 연동 센터
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              회원 본인 계정의 YouTube Data API v3 및 AI 엔진 키를 등록하고 안전하게 관리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 상태 메시지 알림 */}
      {message && (
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-2xl border p-4 text-xs font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. YouTube Data API v3 등록 카드 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">1. YouTube Data API v3 등록 (필수)</h2>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  isYoutubeKeyRegistered
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isYoutubeKeyRegistered ? "● 정상 등록됨" : "○ 미등록"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              실시간 급상승 영상 수집 및 소형 황금 채널 스캔에 필요한 공식 API 키입니다.
            </p>
          </div>

          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-create-key shrink-0"
          >
            <span>Google 키 발급 바로가기</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* 등록된 마스킹 키 표시 */}
        {isYoutubeKeyRegistered && keys.youtube_api_key?.maskedKey && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-slate-500">현재 등록된 키</span>
              <div className="truncate font-mono text-xs font-bold text-slate-800">
                {keys.youtube_api_key.maskedKey}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteKey("youtube_api_key")}
              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow-xs transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>키 삭제</span>
            </button>
          </div>
        )}

        {/* 키 등록 폼 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveKey("youtube_api_key", youtubeKeyInput);
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-bold text-slate-700">
            {isYoutubeKeyRegistered ? "새로운 API 키로 변경 등록" : "API 키 입력"}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={youtubeKeyInput}
              onChange={(e) => setYoutubeKeyInput(e.target.value)}
              placeholder="AIzaSy... 로 시작하는 API 키를 붙여넣으세요"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 font-mono text-xs text-slate-900 outline-none focus:border-red-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={submitting || !youtubeKeyInput.trim()}
              className="btn-3d-red shrink-0"
            >
              {submitting ? "검증 및 저장 중..." : "검증 및 저장"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            * 입력 즉시 YouTube 공식 서버와 통신하여 키 유효성을 자동으로 검증합니다.
          </p>
        </form>
      </div>

      {/* 2. Claude AI 분석 엔진 안내 카드 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-[#EA3323]" />
            <h2 className="text-base font-black text-slate-900">2. AI 분석 엔진 (Claude)</h2>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              기본 AI 활성
            </span>
          </div>
          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-create-key shrink-0"
          >
            <span>Anthropic 콘솔 →</span>
          </a>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          11대 바이럴 심리 메커니즘 분석 및 새 소재 대본 생성 시 사용되는 Anthropic Claude 키입니다.
          메인 사이트 <b>/api-settings</b>에 등록된 키를 공유하여 사용합니다.
        </p>
      </div>

      {/* 3. YouTube API 키 무료 발급 가이드 (1분 완성) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-slate-700" />
          <h3 className="text-base font-black text-slate-900">
            YouTube API 키 무료 발급 가이드 (1분 완성)
          </h3>
        </div>

        <ol className="list-inside list-decimal space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 leading-relaxed">
          <li>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 underline inline-flex items-center gap-1"
            >
              <span>Google Cloud 콘솔(console.cloud.google.com)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            에 접속하여 구글 계정으로 로그인합니다.
          </li>
          <li>
            상단 프로젝트 선택기에서 <span className="font-bold text-slate-900">새 프로젝트</span>를 생성합니다 (예: MyYouTubeApp).
          </li>
          <li>
            상단 검색창에 <span className="font-bold text-slate-900">&quot;YouTube Data API v3&quot;</span>를 검색하고 <span className="font-bold text-blue-600">&quot;사용(Enable)&quot;</span> 버튼을 클릭합니다.
          </li>
          <li>
            좌측 메뉴 <span className="font-bold text-slate-900">사용자 인증 정보(Credentials)</span> &gt; <span className="font-bold text-slate-900">+ 사용자 인증 정보 만들기</span> &gt; <span className="font-bold text-slate-900">API 키</span>를 클릭합니다.
          </li>
          <li>
            생성된 <span className="font-mono font-bold text-red-600">AIzaSy...</span> 형태의 API 키를 복사하여 위의 입력창에 붙여넣고 저장하면 완료됩니다!
          </li>
        </ol>

        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-800">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            YouTube 기본 할당량은 search.list 하루 100회, 기타 API 합산 10,000 units로 매일 오후 4시(겨울철 5시)에 자동 초기화됩니다.
          </span>
        </div>
      </div>
    </div>
  );
}
