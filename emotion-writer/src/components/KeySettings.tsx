"use client";

import { useState, useEffect, useRef } from "react";
import { type Provider } from "@/lib/studio/config";
import { parseCloudflareCheckResponse } from "@/lib/cloudflareStatus";
import {
  TEXT_MODELS,
  type TextProvider,
  TEXT_PROVIDER_LABEL,
} from "@/lib/studio/textModels";
import type { InstagramPublicStatus } from "@/lib/instagram/memberAccount";
import {
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Save,
  Sparkles,
  Share2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
} from "lucide-react";

// 로컬 스토리지 키 정의
export const STORAGE_KEY_PLATFORM_MODELS = "emotion_writer_platform_models_v1";
export const STORAGE_KEY_PREFERRED_MODEL = "emotion_writer_preferred_model";

// 플랫폼별 기본 모델 (docs/AI_MODEL_CATALOG.md 기준 균형 추천)
const DEFAULT_PLATFORM_MODELS: Record<TextProvider, string> = {
  openai: "gpt-6.1-terra",
  anthropic: "claude-sonnet-5-5",
  gemini: "gemini-3.8-flash",
};

interface ProviderMeta {
  name: string;
  platformName: string;
  createUrl: string;
  signupUrl: string;
  createBtnLabel: string;
  description: string;
  themeColor: string;
  badgeClass: string;
}

const AI_PROVIDERS_META: Record<TextProvider, ProviderMeta> = {
  openai: {
    name: "OpenAI",
    platformName: "OpenAI Platform",
    createUrl: "https://platform.openai.com/api-keys",
    signupUrl: "https://platform.openai.com/signup",
    createBtnLabel: "OpenAI API 키 발급/생성하기",
    description:
      "글귀 및 AI 배경 이미지 생성에 사용되며, 생성 비용은 본인 OpenAI 계정 크레딧에 청구됩니다.",
    themeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  anthropic: {
    name: "Claude (Anthropic)",
    platformName: "Claude Console",
    createUrl: "https://console.anthropic.com/settings/keys",
    signupUrl: "https://console.anthropic.com/",
    createBtnLabel: "Claude API 키 발급/생성하기",
    description:
      "감성 글귀 생성에 탁월한 품질을 제공하며, 생성 비용은 본인 Anthropic 계정에 청구됩니다.",
    themeColor: "text-amber-800 bg-amber-50 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  gemini: {
    name: "Google Gemini",
    platformName: "Google AI Studio",
    createUrl: "https://aistudio.google.com/apikey",
    signupUrl: "https://aistudio.google.com/",
    createBtnLabel: "Google AI Studio API 키 발급/생성하기",
    description:
      "글귀 생성 및 나노바나나 AI 배경 생성에 사용되며, 생성 비용은 본인 Google 계정에 청구됩니다.",
    themeColor: "text-blue-800 bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800",
  },
};

const PIXABAY_META = {
  name: "Pixabay",
  platformName: "Pixabay",
  createUrl: "https://pixabay.com/api/docs/",
  signupUrl: "https://pixabay.com/accounts/register/",
  createBtnLabel: "Pixabay API 키 발급/생성하기",
  description: "Pixabay의 감성 사진 검색에 무료로 사용됩니다.",
};

// ============================================================================
// 1. 단일 AI 플랫폼 설정 카드 (OpenAI / Claude / Gemini)
// ============================================================================
function AiPlatformCard({
  provider,
  registered,
  selectedModel,
  onModelSelect,
  onSaved,
}: {
  provider: TextProvider;
  registered: boolean;
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  onSaved?: (keys: Record<Provider, boolean>) => void;
}) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tested, setTested] = useState(false);

  const meta = AI_PROVIDERS_META[provider];
  const models = TEXT_MODELS.filter((m) => m.provider === provider);

  async function submit(action: "test" | "save") {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
      if (action === "test") {
        setTested(true);
        setNotice("✓ 연결 테스트에 성공했습니다. [본인 키 및 기본 모델 저장]을 눌러 완료하세요.");
      } else {
        setKey("");
        setTested(false);
        const selectedLabel = models.find((m) => m.id === selectedModel)?.label || selectedModel;
        setNotice(`✓ 본인 API 키와 기본 모델(${selectedLabel})이 안전하게 저장되었습니다.`);
        onSaved?.(data.registered);
      }
    } catch (e) {
      setTested(false);
      setNotice(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-stone-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs">
      {/* 1) 카드 상단 헤더 */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs ${meta.badgeClass}`}>
            {meta.name}
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 m-0">{meta.name} API & 모델</h4>
            <p className="text-2xs text-stone-400 m-0">{meta.platformName} 기반 글귀 생성 및 배경 연동</p>
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-2xs ${
            tested || registered
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-stone-100 text-stone-500 border border-stone-200"
          }`}
        >
          {tested ? "✓ 테스트 성공" : registered ? "✓ 키 등록됨" : "키 등록 필요"}
        </span>
      </div>

      {/* 2) 모델 선택 & API 키 입력 (넓은 2열 그리드 배치) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
        {/* 사용할 모델 선택 드롭다운 */}
        <label className="block text-xs font-semibold text-slate-700">
          <span>사용할 AI 모델 선택 (기본 모델 설정)</span>
          <div className="relative mt-1">
            <select
              value={selectedModel}
              onChange={(e) => {
                onModelSelect(e.target.value);
                setNotice("");
              }}
              className="w-full text-xs font-medium text-slate-900 bg-stone-50/80 border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all cursor-pointer shadow-2xs"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        {/* 본인 API 키 입력창 */}
        <label className="block text-xs font-semibold text-slate-700">
          <span>본인 API 키</span>
          <div className="relative mt-1">
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setTested(false);
                setNotice("");
              }}
              disabled={busy}
              maxLength={500}
              autoComplete="off"
              style={{ paddingRight: "36px" }}
              className="w-full text-xs font-mono"
              placeholder={
                registered
                  ? "등록된 키가 있습니다 (변경 시에만 새 키 입력)"
                  : `${meta.name} API 키를 입력하세요`
              }
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              disabled={busy}
              aria-label={show ? `${meta.name} 키 숨기기` : `${meta.name} 키 보기`}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                color: "#a8a29e",
                borderRadius: "4px",
              }}
              title={show ? "키 숨기기" : "키 보기"}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>
      </div>

      {/* 3) 액션 버튼 행 및 안내 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-100">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={meta.createUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-create-key text-xs py-1.5 px-3"
            title={`${meta.platformName} 공식 콘솔에서 새 API 키 발급/생성하기`}
          >
            <KeyRound size={13} />
            <span>{meta.createBtnLabel}</span>
            <ExternalLink size={12} style={{ opacity: 0.85 }} />
          </a>

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-stone-300 hover:bg-stone-50 font-medium"
            onClick={() => submit("test")}
            disabled={busy || (!key.trim() && !registered)}
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            <span>연결 테스트</span>
          </button>

          <button
            type="button"
            className="primary flex items-center gap-1.5 text-xs py-1.5 px-3.5 rounded-lg font-bold shadow-2xs"
            onClick={() => submit("save")}
            disabled={busy || (!key.trim() && !registered)}
          >
            <Save size={13} />
            <span>{busy ? "저장 중…" : "본인 키 및 모델 저장"}</span>
          </button>
        </div>

        {/* 안내 링크 */}
        <div className="flex items-center gap-3 text-2xs text-stone-500">
          <a
            href={meta.createUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 hover:underline inline-flex items-center gap-1 font-semibold"
          >
            <span>{meta.platformName} 무료 키 발급 ↗</span>
          </a>
          <span className="text-stone-300">·</span>
          <a
            href={meta.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-400 hover:text-stone-700 inline-flex items-center gap-0.5"
          >
            <span>공식 사이트</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className={`status-note mt-3 text-xs ${
            notice.startsWith("✓") ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-rose-700 bg-rose-50 border border-rose-200"
          }`}
        >
          {notice}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// 2. 인스타그램 포스팅 연동 카드
// ============================================================================
function InstagramConnectCard({
  initialStatus,
}: {
  initialStatus?: InstagramPublicStatus;
}) {
  const [status, setStatus] = useState<InstagramPublicStatus>(
    initialStatus ?? {
      connected: false,
      username: null,
      expired: false,
      connectUrl: "https://auto-instagram-posting.buylife.xyz/settings",
    },
  );
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function refreshStatus() {
    if (loading) return;
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/instagram/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "연동 상태 확인 실패");
      setStatus(data);
      if (data.connected) {
        setNotice(
          `✓ @${data.username ?? "instagram"} 인스타그램 계정이 정상 연동되어 있습니다.`,
        );
      } else {
        setNotice("인스타그램 계정이 아직 연동되지 않았습니다. 아래 버튼을 눌러 연동해 주세요.");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "확인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card border-2 border-pink-100/80 bg-gradient-to-br from-pink-50/40 via-white to-rose-50/30 shadow-sm rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-100/70 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <span>인스타그램(Instagram) 포스팅 계정 연동</span>
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              완성된 감성 카드뉴스를 1클릭으로 내 인스타그램에 바로 올리거나 예약 발행합니다
            </p>
          </div>
        </div>

        <div>
          {status.connected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>연동 완료: @{status.username || "instagram"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>연동 계정 없음</span>
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-600 space-y-2 mb-4 leading-relaxed">
        <p className="m-0">
          • <strong>공용 연동 규칙</strong>: 『INSTA 포스팅 자동화』에서 회원이 한 번 연결한 인스타그램 비즈니스/크리에이터 계정을 감성 글귀 이미지 스튜디오에서도 안전하게 공유하여 그대로 사용합니다.
        </p>
        <p className="m-0">
          • <strong>동작 방식</strong>: 6단계 완성 화면에서 <strong>[인스타에 올리기]</strong> 버튼을 누르면, 1:1 비율 감성 카드뉴스가 즉시 포스팅 새 글 작성 화면으로 전달되어 원클릭으로 피드에 게시할 수 있습니다.
        </p>
      </div>

      <div className="button-row justify-start items-center gap-2 flex-wrap">
        <a
          href={status.connectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-create-key inline-flex items-center gap-1.5 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
          title="INSTA 포스팅 자동화 설정 화면에서 인스타그램 계정 연결하기"
        >
          <Share2 size={13} />
          <span>INSTA 포스팅에서 인스타그램 계정 연동하기</span>
          <ExternalLink size={12} style={{ opacity: 0.9 }} />
        </a>

        <button
          type="button"
          onClick={refreshStatus}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs py-2 px-3 border border-stone-300 rounded-xl bg-white text-slate-700 hover:bg-stone-50 shadow-2xs"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>연동 상태 새로고침</span>
        </button>

        <a
          href="https://auto-instagram-posting.buylife.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-slate-800 py-2 px-2"
        >
          <span>INSTA 포스팅 자동화 바로가기</span>
          <ExternalLink size={11} />
        </a>
      </div>

      {notice && (
        <p
          role="status"
          className={`status-note mt-3 text-xs ${
            notice.startsWith("✓") ? "text-emerald-700 bg-emerald-50" : "text-amber-800 bg-amber-50"
          }`}
        >
          {notice}
        </p>
      )}

      <div className="guide-box mt-4 bg-white/90 border border-stone-200/80 rounded-xl p-3.5">
        <strong className="flex items-center gap-1.5 text-xs text-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>안전한 인스타그램 연동 안내</span>
        </strong>
        <p className="muted text-xs mt-1 leading-relaxed">
          인스타그램 프로페셔널(비즈니스/크리에이터) 계정과 연결된 Facebook 페이지가 필요합니다. 피드 규격에 맞는 1:1 정사각형 비율의 카드뉴스를 손쉽게 게시할 수 있습니다.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// 3. 맨 밑: Pixabay API 키 등록 카드
// ============================================================================
function PixabayKeyCard({
  registered,
  onSaved,
}: {
  registered: boolean;
  onSaved?: (keys: Record<Provider, boolean>) => void;
}) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tested, setTested] = useState(false);

  async function submit(action: "test" | "save") {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "pixabay", key, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
      if (action === "test") {
        setTested(true);
        setNotice("✓ Pixabay 연결 테스트에 성공했습니다. [본인 키 저장]을 눌러 등록을 완료하세요.");
      } else {
        setKey("");
        setTested(false);
        setNotice("✓ Pixabay API 키를 본인 계정에 안전하게 저장했습니다.");
        onSaved?.(data.registered);
      }
    } catch (e) {
      setTested(false);
      setNotice(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card border border-stone-200/90 rounded-2xl p-5 sm:p-6 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Pixabay 무료 사진 검색 API 키
            </h3>
            <p className="text-xs text-slate-500 m-0">
              2단계 이미지 생성 방식에서 무료 감성 실사 사진 검색에 사용됩니다
            </p>
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            tested || registered
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {tested ? "✓ 테스트 성공" : registered ? "✓ 키 등록됨" : "키 등록 필요"}
        </span>
      </div>

      <label className="block text-xs font-semibold text-slate-700 mb-1 mt-3">
        본인 API 키
        <div className="relative mt-1">
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setTested(false);
              setNotice("");
            }}
            disabled={busy}
            maxLength={500}
            autoComplete="off"
            style={{ paddingRight: "36px" }}
            placeholder={
              registered
                ? "키를 변경하려면 새 키를 입력하세요"
                : "Pixabay API 키를 입력하세요"
            }
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            disabled={busy}
            aria-label={show ? "Pixabay 키 숨기기" : "Pixabay 키 보기"}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              color: "#a8a29e",
              borderRadius: "4px",
            }}
            title={show ? "키 숨기기" : "키 보기"}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </label>

      <div className="button-row justify-start items-center gap-2 mt-3 flex-wrap">
        <a
          href={PIXABAY_META.createUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-create-key"
          title="Pixabay 공식 API 키 발급/생성하기"
        >
          <KeyRound size={13} />
          <span>{PIXABAY_META.createBtnLabel}</span>
          <ExternalLink size={12} style={{ opacity: 0.85 }} />
        </a>

        <button
          type="button"
          className="flex items-center gap-1.5 text-xs py-1.5 px-3"
          onClick={() => submit("test")}
          disabled={busy || (!key.trim() && !registered)}
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
          <span>연결 테스트</span>
        </button>

        <button
          type="button"
          className="primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          onClick={() => submit("save")}
          disabled={busy || !key.trim()}
        >
          <Save size={13} />
          <span>{busy ? "처리 중…" : "본인 키 저장"}</span>
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className={`status-note mt-2.5 text-xs ${
            notice.startsWith("✓") ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
          }`}
        >
          {notice}
        </p>
      )}

      <div className="guide-box mt-3.5 bg-stone-50 border border-stone-200/80 rounded-xl p-3">
        <strong className="flex items-center gap-1.5 text-xs text-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>안전한 무료 Pixabay API 키 발급</span>
        </strong>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <a
            href={PIXABAY_META.createUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold"
          >
            <span>Pixabay에서 무료 키 발급받기</span>
            <ExternalLink size={12} />
          </a>
          <span className="text-stone-300 text-xs">·</span>
          <a
            href={PIXABAY_META.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 font-medium"
          >
            <span>공식 회원가입</span>
            <ExternalLink size={11} />
          </a>
        </div>
        <p className="muted text-xs mt-1 leading-relaxed">
          {PIXABAY_META.description} 감성 글귀 배경으로 어울리는 상업적 무료 이미지를 안전하게 가져옵니다.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// 3-1. Cloudflare Workers AI 무료 이미지 연동 상태 카드 (CloudflareKeyCard)
// ============================================================================
export function CloudflareKeyCard({
  initialRegistered = null,
}: {
  initialRegistered?: boolean | null;
}) {
  const [registered, setRegistered] = useState<boolean | null>(
    typeof initialRegistered === "boolean" ? initialRegistered : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialRegistered === null ? "초기 등록 상태를 확인하지 못했습니다." : null,
  );
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const activeReq = useRef(0);

  const recheck = async () => {
    const reqId = ++activeReq.current;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", { cache: "no-store" });
      if (!res.ok) throw new Error("등록 상태 확인에 실패했습니다.");
      const json = await res.json();
      const isRegistered = parseCloudflareCheckResponse(json);
      if (reqId === activeReq.current) {
        setRegistered(isRegistered);
        setLastChecked(
          new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      }
    } catch (e) {
      if (reqId === activeReq.current) {
        setError(e instanceof Error ? e.message : "확인에 실패했습니다.");
        setRegistered(null); // 형식 깨짐이나 오류 시 등록/미등록 단정하지 않고 null(확인 필요)로 정합 유지
      }
    } finally {
      if (reqId === activeReq.current) {
        setBusy(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      activeReq.current = 0;
    };
  }, []);

  return (
    <section className="card border border-stone-200/90 rounded-2xl p-5 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shadow-2xs">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
              <span>Cloudflare Workers AI (무료 이미지 연동 준비 중)</span>
            </h3>
            <p className="text-2xs text-stone-400 m-0">
              공용 공통 키(계정 ID 및 Workers AI 토큰) 사전 등록 상태 확인
            </p>
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-2xs self-start sm:self-auto ${
            error || registered === null
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : registered
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-stone-100 text-stone-500 border border-stone-200"
          }`}
        >
          {error || registered === null
            ? "확인 필요 · 재확인 권장"
            : registered
              ? "✓ 공용 키 등록됨"
              : "키 등록 필요"}
        </span>
      </div>

      <div className="mt-3.5 space-y-2.5">
        <p className="text-xs text-slate-700 leading-relaxed m-0">
          회원 본인의 <strong>Cloudflare 계정 ID</strong>와{" "}
          <strong>Workers AI 토큰</strong>을 메인 사이트(AIMaster) API 설정에 미리
          등록해 둘 수 있습니다. (무료 AI 엔진 연동 기능은 현재 준비 중이며, 공용
          등록 선행 후 기능 오픈 시 자동 연결됩니다)
        </p>

        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-stone-600">
              {error || registered === null ? (
                <span className="text-amber-800 font-semibold">
                  {error || "초기 등록 상태를 확인하지 못했습니다. 아래 [등록 상태 재확인]을 눌러주세요."}
                </span>
              ) : registered ? (
                <span className="text-emerald-700 font-semibold">
                  계정 ID와 토큰 2개 키가 공용 계정에 등록되어 있습니다.
                </span>
              ) : (
                <span className="text-stone-500">
                  아직 Cloudflare 키가 등록되지 않았습니다. 메인 사이트 API
                  설정에서 한 번 등록하면 모든 자동화 프로그램이 함께 사용합니다.
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <a
                href="https://www.buylife.xyz/api-settings#cloudflare"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-key text-xs py-1.5 px-3"
                title="AIMaster 공용 API 설정에서 Cloudflare 키 등록하러 가기"
              >
                <span>AIMaster에서 키 등록·수정</span>
                <ExternalLink size={12} style={{ opacity: 0.85 }} />
              </a>

              <button
                type="button"
                className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-stone-300 hover:bg-stone-100 font-medium bg-white"
                onClick={recheck}
                disabled={busy}
                title="공용 키 등록 상태 다시 확인"
              >
                <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
                <span>{busy ? "확인 중…" : "등록 상태 재확인"}</span>
              </button>
            </div>
          </div>

          {lastChecked && (
            <p className="text-[11px] text-stone-400 m-0">
              최근 확인 시각: {lastChecked}
            </p>
          )}

          <div className="pt-2 border-t border-stone-200/70 text-[11px] text-stone-500 leading-normal space-y-1">
            <p className="m-0">
              ※ 「등록됨」 표시는 공용 DB에 계정 ID와 토큰 2개 키가 저장되어
              있음을 의미하며, 실제 Cloudflare 계정의 토큰 유효성, 잔여 무료량,
              또는 서비스 내 엔진 활성화 여부를 보증하지 않습니다.
            </p>
            <p className="m-0 text-amber-700">
              ※ 무료 이미지 생성 기능은 현재 정책 점검 및 준비 단계이며, 기능이
              정식 오픈되면 등록된 본인 키로 자동 연동됩니다. (일 약 10,000 Neurons
              무료 제공, 초과 시 본인 계정 과금 가능)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 4. 통합 전체 설정 화면 (AllKeySettings)
// ============================================================================
export function AllKeySettings({
  initial,
  initialInstagram,
  initialCloudflare = null,
}: {
  initial: Record<Provider, boolean>;
  initialInstagram?: InstagramPublicStatus;
  initialCloudflare?: boolean | null;
}) {
  const [keys, setKeys] = useState(initial);

  // 플랫폼별 선택된 모델 상태 (OpenAI / Claude / Gemini)
  const [platformModels, setPlatformModels] = useState<Record<TextProvider, string>>(
    DEFAULT_PLATFORM_MODELS,
  );

  // 로컬 스토리지에서 저장된 모델 설정 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLATFORM_MODELS);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPlatformModels((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // 플랫폼별 모델 변경 핸들러
  const handleModelSelect = (provider: TextProvider, modelId: string) => {
    setPlatformModels((prev) => {
      const updated = { ...prev, [provider]: modelId };
      try {
        localStorage.setItem(STORAGE_KEY_PLATFORM_MODELS, JSON.stringify(updated));
        // 전체 기본 모델로도 설정
        localStorage.setItem(STORAGE_KEY_PREFERRED_MODEL, modelId);
      } catch {}
      return updated;
    });
  };

  return (
    <div className="settings-list space-y-6">
      {/* ==================================================================== */}
      {/* 1. OpenAI / Claude / Gemini 3대 AI 모델 & API 키를 하나의 박스로 묶음 */}
      {/* ==================================================================== */}
      <section className="card border-2 border-amber-200/90 bg-gradient-to-b from-amber-50/30 via-white to-stone-50/20 shadow-sm rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-200/70 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300/80 flex items-center justify-center text-amber-700 shadow-2xs">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                <span>AI 글귀 생성 모델 및 API 키 연동 (OpenAI · Claude · Gemini)</span>
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                3대 인공지능 플랫폼의 본인 API 키를 등록하고, 플랫폼별로 사용할 AI 모델을 선택하여 저장할 수 있습니다
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-900 font-bold self-start sm:self-auto border border-amber-300/50">
            3대 AI 글귀 모델
          </span>
        </div>

        {/* 3대 플랫폼 카드 세로 열 나열 */}
        <div className="flex flex-col gap-4">
          <AiPlatformCard
            provider="openai"
            registered={keys.openai}
            selectedModel={platformModels.openai}
            onModelSelect={(m) => handleModelSelect("openai", m)}
            onSaved={setKeys}
          />
          <AiPlatformCard
            provider="anthropic"
            registered={keys.anthropic}
            selectedModel={platformModels.anthropic}
            onModelSelect={(m) => handleModelSelect("anthropic", m)}
            onSaved={setKeys}
          />
          <AiPlatformCard
            provider="gemini"
            registered={keys.gemini}
            selectedModel={platformModels.gemini}
            onModelSelect={(m) => handleModelSelect("gemini", m)}
            onSaved={setKeys}
          />
        </div>

        <div className="mt-4 p-3 rounded-xl bg-stone-100/70 border border-stone-200 text-xs text-stone-600 leading-relaxed flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            여기서 선택·저장한 모델은 <strong>메인 스튜디오 5단계(글귀 스타일 및 AI 생성)</strong>의 기본 모델로 즉시 자동 반영됩니다.
          </span>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. Pixabay 무료 사진 검색 API 키 카드 (인스타그램 연동 위로 배치) */}
      {/* ==================================================================== */}
      <PixabayKeyCard registered={keys.pixabay} onSaved={setKeys} />

      {/* ==================================================================== */}
      {/* 3. Cloudflare Workers AI 무료 이미지 연동 상태 카드 */}
      {/* ==================================================================== */}
      <CloudflareKeyCard initialRegistered={initialCloudflare} />

      {/* ==================================================================== */}
      {/* 4. 인스타그램(Instagram) 포스팅 계정 연동 섹션 */}
      {/* ==================================================================== */}
      <InstagramConnectCard initialStatus={initialInstagram} />
    </div>
  );
}

// 기존 KeySettings 단독 컴포넌트 하위 호환 유지
export function KeySettings({
  provider,
  registered,
  onSaved,
}: {
  provider: Provider;
  registered: boolean;
  onSaved?: (keys: Record<Provider, boolean>) => void;
}) {
  if (provider === "pixabay") {
    return <PixabayKeyCard registered={registered} onSaved={onSaved} />;
  }
  if (provider === "openai" || provider === "anthropic" || provider === "gemini") {
    return (
      <AiPlatformCard
        provider={provider}
        registered={registered}
        selectedModel={DEFAULT_PLATFORM_MODELS[provider]}
        onModelSelect={() => {}}
        onSaved={onSaved}
      />
    );
  }
  return null;
}
