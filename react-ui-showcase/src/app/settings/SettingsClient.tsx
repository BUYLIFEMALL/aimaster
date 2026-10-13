"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { 
  KeyRound, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Save, 
  ShieldCheck, 
  Sparkles,
  Info
} from "lucide-react";

interface SettingsClientProps {
  userEmail: string;
}

export default function SettingsClient({ userEmail }: SettingsClientProps) {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const fetchKeyStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (res.ok) {
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      }
    } catch (err) {
      console.error("Failed to fetch key status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMessage({ text: "API 키를 입력해주세요.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "API 키 저장에 실패했습니다.");
      }

      setMessage({ text: "Google Gemini API 키가 안전하게 등록되었습니다.", type: "success" });
      setApiKey("");
      await fetchKeyStatus();
    } catch (err: any) {
      setMessage({ text: err.message || "오류가 발생했습니다.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!confirm("등록된 API 키를 삭제하시겠습니까? 삭제 후에는 AI 컴포넌트 생성을 위해 다시 등록해야 합니다.")) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/keys", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "API 키 삭제에 실패했습니다.");
      }

      setMessage({ text: "API 키가 안전하게 삭제되었습니다.", type: "success" });
      await fetchKeyStatus();
    } catch (err: any) {
      setMessage({ text: err.message || "삭제 중 오류가 발생했습니다.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* 1. 좌측 표준 사이드바 */}
      <Sidebar userEmail={userEmail} />

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header hasApiKey={hasKey} userEmail={userEmail} />

        <main className="flex-1 p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
          {/* 상단 타이틀 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              API 키 등록 및 플랫폼 연동
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              AI 컴포넌트 자동 생성을 위해 회원 본인의 Google Gemini API 키를 등록하고 안전하게 관리하세요.
            </p>
          </div>

          {/* 최상위 원칙 안내 배너 */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4.5 flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold text-blue-950 block mb-1">
                ★ 최상위 불변 보안 규칙: 본인 전용 API 키 직접 연동
              </span>
              모든 회원은 본인의 Google AI 계정에서 발급받은 본인 전용 API 키를 연동하여 사용합니다.
              플랫폼 운영자나 타인의 키로 폴백되지 않으며, 등록하신 API 키는 암호화되어 본인 계정에서만 독립적으로 격리 호출됩니다.
            </div>
          </div>

          {/* 피드백 메시지 알림 */}
          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* API 키 카드 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Google Gemini API 키</h3>
                  <p className="text-xs text-slate-400">Gemini 2.5 Flash / Pro 모델 연동용</p>
                </div>
              </div>

              {loading ? (
                <span className="text-xs text-slate-400">확인 중...</span>
              ) : hasKey ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  연동 완료 ({maskedKey})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  미등록 (등록 필요)
                </span>
              )}
            </div>

            {/* 입력 폼 */}
            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {hasKey ? "새 API 키로 갱신하기" : "API 키 입력"}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy로 시작하는 본인 Google Gemini API 키"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono placeholder:font-sans placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  키는 안전하게 보호되며, 화면에는 앞/뒤 4자리만 마스킹 처리되어 표시됩니다.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || !apiKey.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "저장 중..." : "API 키 저장"}
                </button>

                {hasKey && (
                  <button
                    type="button"
                    onClick={handleDeleteKey}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    등록된 키 삭제
                  </button>
                )}
              </div>
            </form>

            {/* API 키 발급 가이드 링크 */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                아직 Google Gemini API 키가 없으신가요?
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                Google AI Studio에서 무료 발급받기
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 도움말 박스 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              API 키 발급 3단계 간편 가이드
            </h4>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed pl-1">
              <li>
                <strong className="text-slate-800">Google AI Studio 접속</strong>: 구글 계정으로 로그인 후 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">aistudio.google.com</a>에 접속합니다.
              </li>
              <li>
                <strong className="text-slate-800">Get API key 클릭</strong>: 상단 또는 중앙의 [Create API key] 버튼을 누르고 새 프로젝트를 선택합니다.
              </li>
              <li>
                <strong className="text-slate-800">키 복사 및 등록</strong>: 발급된 `AIzaSy...` 키를 복사하여 위 입력창에 붙여넣고 [API 키 저장]을 누르면 즉시 연동됩니다.
              </li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}
