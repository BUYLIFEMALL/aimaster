"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Key, Globe, CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const [provider, setProvider] = useState<"openai" | "gemini" | "anthropic">("openai");
  const [apiKey, setApiKey] = useState("");
  const [registered, setRegistered] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 크롬 확장 페어링 코드
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.registered) setRegistered(data.registered);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");

      setMessage({ type: "success", text: "API 키가 성공적으로 등록되었습니다." });
      setApiKey("");
      fetchKeys();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGetPairCode = async () => {
    setPairLoading(true);
    try {
      const res = await fetch("/api/extension/auth");
      const data = await res.json();
      if (data.pairCode) {
        setPairCode(data.pairCode);
      }
    } catch (err: any) {
      alert("코드 발급 실패: " + err.message);
    } finally {
      setPairLoading(false);
    }
  };

  const copyPairCode = () => {
    if (!pairCode) return;
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          API키등록·플랫폼연동
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          글 생성에 사용할 회원 본인의 AI API 키와 네이버 스마트에디터 ONE 자동 발행용 크롬 확장을 연동합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AI API 키 등록 카드 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-neutral-100 text-neutral-700">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">1. AI 엔진 키 등록 (BYOK)</h2>
              <p className="text-xs text-neutral-500">회원 본인의 키로만 작동하며 안전하게 암호화 보관됩니다.</p>
            </div>
          </div>

          {/* 등록된 키 뱃지 */}
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { id: "openai", name: "OpenAI (GPT-4o)" },
              { id: "gemini", name: "Google Gemini" },
              { id: "anthropic", name: "Claude (Anthropic)" },
            ].map((p) => {
              const isReg = registered.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    isReg
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-neutral-50 text-neutral-400 border-neutral-200"
                  }`}
                >
                  {isReg ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{p.name}</span>
                  <span className="text-[10px] ml-0.5">{isReg ? "등록됨" : "미등록"}</span>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                AI 제공자 선택
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "openai", name: "OpenAI" },
                  { id: "gemini", name: "Gemini" },
                  { id: "anthropic", name: "Claude" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProvider(item.id as any)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      provider === item.id
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {provider.toUpperCase()} API 키 입력
              </label>
              <input
                type="password"
                placeholder={
                  provider === "openai"
                    ? "sk-..."
                    : provider === "gemini"
                    ? "AIzaSy..."
                    : "sk-ant-api03-..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                required
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              {loading ? "등록 중..." : "API 키 안전하게 저장"}
            </button>
          </form>
        </div>

        {/* 2. 크롬 확장 프로그램 페어링 연동 카드 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">2. 크롬 확장프로그램 연동</h2>
              <p className="text-xs text-neutral-500">네이버 스마트에디터 ONE 자동 발행을 위한 브라우저 연결</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-2 mb-5">
            <div className="font-semibold text-neutral-800">💡 왜 크롬 확장을 연동하나요?</div>
            <p>
              Playwright 등의 봇 자동화와 달리, 평소 사용하시는 <b>일반 Chrome 브라우저의 정상 세션과 쿠키</b>로 스마트에디터 ONE에 직접 타이핑하므로 <b>네이버 아이디 보호조치와 봇 탐지를 100% 우회</b>합니다.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-neutral-700 mb-2">연결 단계:</div>
              <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside">
                <li>크롬 브라우저에 [네이버 블로그 에이전트 확장]을 설치합니다.</li>
                <li>아래 버튼을 눌러 발급된 8자리 페어링 코드를 복사합니다.</li>
                <li>크롬 브라우저 우측 상단 확장 아이콘을 누르고 코드를 붙여넣습니다.</li>
              </ol>
            </div>

            {pairCode ? (
              <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 space-y-3">
                <div className="text-xs font-medium text-emerald-800">
                  발급된 연결 코드 (10분간 유효):
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xl font-bold tracking-widest text-center py-2 px-3 bg-white rounded-lg border border-emerald-200 text-neutral-900">
                    {pairCode}
                  </div>
                  <button
                    onClick={copyPairCode}
                    className="p-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                    title="코드 복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-[11px] text-emerald-700 font-medium text-center">
                    ✅ 코드가 클립보드에 복사되었습니다!
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGetPairCode}
                disabled={pairLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${pairLoading ? "animate-spin" : ""}`} />
                <span>크롬 확장 페어링 코드 발급하기</span>
              </button>
            )}

            <div className="pt-2">
              <Link
                href="/guide"
                className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
              >
                <span>크롬 확장 설치 상세 매뉴얼 확인하기</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 연동 매뉴얼 박스 (체크리스트 8번 표준 규격) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📖</span>
          <h2 className="text-base font-semibold text-neutral-900">연동 매뉴얼 및 권장 사용법</h2>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          - <b>OpenAI (GPT-4o)</b> 키 등록을 가장 권장하며, Gemini 및 Claude 키도 완벽하게 지원합니다.<br />
          - 크롬 확장은 사용자의 PC에만 상주하며, 네이버 비밀번호를 서버로 전송하지 않고 오직 승인된 글쓰기 작업만 수행합니다.<br />
          - 자세한 설치 및 발행 방법은 좌측 메뉴의 <b>[연동 & 사용 매뉴얼]</b>에서 확인하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
