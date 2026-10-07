"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Download,
  Trash2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export interface KeyDetail {
  provider: string;
  maskedKey: string;
  updatedAt?: string;
}

const PROVIDERS = [
  { id: "openai", name: "OpenAI (GPT-4o)", desc: "C-RANK/DIA+ 블로그 초안 및 휴머나이징 작성에 사용" },
  { id: "gemini", name: "Google Gemini", desc: "고화질 블로그 이미지 프롬프트 생성 및 멀티모달 분석" },
  { id: "anthropic", name: "Claude (Anthropic)", desc: "17대 블로그 윤문 휴머나이저 및 정밀 문맥 교정에 사용" },
  { id: "perplexity", name: "Perplexity AI", desc: "최신 트렌드 키워드 실시간 검색 및 심층 자료조사에 사용" },
];

export function SettingsClient({
  userEmail,
  initialDetails,
  initialRegistered,
}: {
  userEmail: string;
  initialDetails: KeyDetail[];
  initialRegistered: string[];
}) {
  const [provider, setProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState("");
  const [registered, setRegistered] = useState<string[]>(initialRegistered);
  const [details, setDetails] = useState<KeyDetail[]>(initialDetails);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 크롬 확장 페어링 코드
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.registered) setRegistered(data.registered);
      if (data.details) setDetails(data.details);
      setMessage({ type: "success", text: "계정에 등록된 최신 API 키를 성공적으로 동기화했습니다." });
    } catch (err: any) {
      setMessage({ type: "error", text: "동기화 실패: " + err.message });
    } finally {
      setFetching(false);
    }
  };

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
      await fetchKeys();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (targetProvider: string) => {
    if (!confirm(`${targetProvider} 키를 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: targetProvider }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      await fetchKeys();
    } catch (err: any) {
      alert("키 삭제 실패: " + err.message);
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

      {/* 계정 내 기존 키 자동 연동 안내 배너 */}
      {registered.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5 flex items-start gap-3.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-xs text-emerald-900 leading-relaxed">
            <p className="font-semibold text-emerald-950 flex items-center gap-2">
              <span>AIMaster 통합 계정({userEmail})의 AI 키가 완벽하게 연동되었습니다!</span>
              <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {registered.length}개 키 준비 완료
              </span>
            </p>
            <p className="text-emerald-800">
              AIMaster 공용 DB에 이미 등록해두신 API 키를 자동으로 인식하였습니다. 별도로 다시 입력하실 필요 없이 즉시 블로그 자동 글 생성을 시작하실 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 등록된 키 상세 카드 그리드 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-neutral-100 text-neutral-700">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">연동된 AI 키 현황 (BYOK)</h2>
              <p className="text-xs text-neutral-500">
                회원님 계정에 저장된 키 목록입니다 (안전 암호화 보관)
              </p>
            </div>
          </div>
          <button
            onClick={fetchKeys}
            className="flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-100 hover:bg-neutral-200 font-medium transition-colors px-3 py-1.5 rounded-lg border border-neutral-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            <span>계정 키 다시 불러오기</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {PROVIDERS.map((p) => {
            const detail = details.find((d) => d.provider === p.id);
            const isReg = !!detail || registered.includes(p.id);

            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all ${
                  isReg
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-neutral-200 bg-neutral-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isReg
                          ? "bg-emerald-100/80 text-emerald-800 border-emerald-300"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {isReg ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-neutral-400" />}
                      <span>{isReg ? "연동 완료" : "미등록"}</span>
                    </span>
                    <span className="text-xs font-bold text-neutral-900">{p.name}</span>
                  </div>

                  {isReg && (
                    <button
                      onClick={() => handleDeleteKey(p.id)}
                      className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors"
                      title="키 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 mb-2 leading-relaxed">{p.desc}</p>

                {isReg && detail?.maskedKey ? (
                  <div className="flex items-center justify-between text-[11px] font-mono bg-white px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700">
                    <span className="truncate">{detail.maskedKey}</span>
                    <span className="text-[10px] text-emerald-600 font-sans font-semibold shrink-0 ml-2">사용 가능</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-400 italic bg-white px-2.5 py-1.5 rounded-lg border border-dashed border-neutral-200">
                    아래 폼에서 키를 직접 등록하거나 메인 사이트에서 등록할 수 있습니다.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AI API 키 직접 등록/변경 카드 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-neutral-100 text-neutral-700">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">AI 키 신규 등록 / 변경</h2>
              <p className="text-xs text-neutral-500">새로운 키를 등록하거나 기존 키를 변경할 수 있습니다.</p>
            </div>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                AI 제공자 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "openai", name: "OpenAI" },
                  { id: "gemini", name: "Gemini" },
                  { id: "anthropic", name: "Claude" },
                  { id: "perplexity", name: "Perplexity" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProvider(item.id)}
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
                API Key 값
              </label>
              <input
                type="password"
                placeholder={
                  provider === "openai"
                    ? "sk-proj-..."
                    : provider === "gemini"
                    ? "AIzaSy... 또는 AQ..."
                    : provider === "anthropic"
                    ? "sk-ant-..."
                    : "pplx-..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono"
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
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">크롬 확장프로그램 연동</h2>
              <p className="text-xs text-neutral-500">네이버 스마트에디터 ONE 자동 발행을 위한 브라우저 연결</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-2">
            <div className="font-semibold text-neutral-800">💡 왜 크롬 확장을 연동하나요?</div>
            <p className="leading-relaxed">
              Playwright 등의 봇 자동화와 달리, 평소 사용하시는 <b>일반 Chrome 브라우저의 정상 세션과 쿠키</b>로 스마트에디터 ONE에 직접 타이핑하므로 <b>네이버 아이디 보호조치와 봇 탐지를 100% 우회</b>합니다.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-neutral-700 mb-1.5">연결 단계:</div>
              <ol className="text-xs text-neutral-600 space-y-1 list-decimal list-inside">
                <li>아래 버튼으로 확장 ZIP을 다운받아 압축을 푼 뒤 크롬에 등록합니다.</li>
                <li>코드 발급 버튼을 눌러 생성된 8자리 페어링 코드를 복사합니다.</li>
                <li>크롬 브라우저 우측 상단 확장 아이콘을 누르고 코드를 붙여넣습니다.</li>
              </ol>
            </div>

            <div>
              <a
                href="/downloads/naver-blog-agent-extension-latest.zip"
                download
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>📦 최신 크롬 확장프로그램 ZIP 다운로드</span>
              </a>
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
                onClick={handleGetPairCode}
                disabled={pairLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pairLoading ? "animate-spin" : ""}`} />
                <span>{pairLoading ? "코드 발급 중..." : "크롬 확장 페어링 코드 발급하기"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 하단 연동 매뉴얼 바로가기 박스 (플랫폼 표준) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <span className="text-base">📖</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-900">네이버 블로그 에이전트 연동 & 사용 실전 매뉴얼</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              크롬 확장 설치부터 스마트에디터 ONE 자동 발행까지 3분 완성 상세 가이드를 확인하세요.
            </p>
          </div>
        </div>

        <Link
          href="/guide"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors shrink-0"
        >
          <span>매뉴얼 보기</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
