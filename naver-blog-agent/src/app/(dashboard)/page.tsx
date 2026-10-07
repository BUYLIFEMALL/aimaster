"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  Layers,
  Zap,
  User,
  Tag,
  ArrowDown,
  Check,
  Wand2,
  Flame,
} from "lucide-react";
import type { PipelineResult } from "@/lib/ai/pipeline";
import { BLOG_PERSONAS, type BlogPersona } from "@/types/persona";
import type { BlogViralCandidate } from "@/types/collector";

export default function MainPage() {
  const [activePersonaId, setActivePersonaId] = useState<string | null>("housewife");
  const [topic, setTopic] = useState("살림 9단이 직접 써보고 엄선한 삶의 질 수직상승 살림·가전 필수템 솔직 후기");
  const [category, setCategory] = useState("생활/살림꿀팁");
  const [searchKeywords, setSearchKeywords] = useState("가전제품 비교, 살림 꿀팁, 세탁 노하우, 가성비 주방용품, 삶의 질 상승템");
  const [publishPurpose, setPublishPurpose] = useState("실제 주부 입장에서 가성비와 찐활용도를 꼼꼼하게 비교 분석하여 이웃들에게 추천");
  const [preferredTone, setPreferredTone] = useState<string>("해요체");
  const [targetCharCount, setTargetCharCount] = useState<number>(2000);

  const [loading, setLoading] = useState(false);
  const [generatingPersonaName, setGeneratingPersonaName] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // 계정 목록 불러오기
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");

  // 수집된 떡상 글감 목록 & 현재 선택된 글감
  const [viralCandidates, setViralCandidates] = useState<BlogViralCandidate[]>([]);
  const [selectedViral, setSelectedViral] = useState<BlogViralCandidate | null>(null);

  const applyViralCandidate = (cand: BlogViralCandidate) => {
    setSelectedViral(cand);
    setTopic(cand.title);
    if (cand.category) setCategory(cand.category);
    if (cand.keywords && cand.keywords.length > 0) {
      setSearchKeywords(cand.keywords.join(", "));
    }
    const purpose = cand.angle
      ? `${cand.angle} — ${cand.content.slice(0, 100)}`
      : cand.content.slice(0, 100);
    setPublishPurpose(purpose);
  };

  const handleClearViral = () => {
    setSelectedViral(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem("nba_accounts_local");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAccounts(parsed);
        if (parsed.length > 0) {
          setSelectedBlogId(parsed[0].blog_id);
        }
      } catch {}
    }

    // 수집된 글감 로드 및 URL 쿼리 파라미터 연동
    try {
      const savedViral = localStorage.getItem("nba_viral_candidates");
      if (savedViral) {
        const parsedViral: BlogViralCandidate[] = JSON.parse(savedViral);
        if (Array.isArray(parsedViral)) {
          setViralCandidates(parsedViral);

          // URL 파라미터(?viralId=...&topic=...&category=...) 확인
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const viralId = params.get("viralId");
            const paramTopic = params.get("topic");
            const paramCategory = params.get("category");

            if (viralId) {
              const matched = parsedViral.find((c) => c.id === viralId);
              if (matched) {
                applyViralCandidate(matched);
              }
            } else if (paramTopic) {
              setTopic(decodeURIComponent(paramTopic));
              if (paramCategory) setCategory(decodeURIComponent(paramCategory));
            }
          }
        }
      }
    } catch {}
  }, []);

  // 페르소나 클릭 시 조건 자동 세팅
  const handleSelectPersona = (p: BlogPersona) => {
    setActivePersonaId(p.id);
    setCategory(p.defaultCategory);
    setTopic(p.defaultTopic);
    setSearchKeywords(p.defaultKeywords);
    setPublishPurpose(p.defaultPurpose);
    setPreferredTone(p.preferredTone);
  };

  // 페르소나 카드의 [⚡ 즉시 생성] 클릭 시
  const handleGenerateWithPersona = async (p: BlogPersona) => {
    handleSelectPersona(p);
    setGeneratingPersonaName(p.name);
    await executeGeneration({
      overrideTopic: topic.trim() || p.defaultTopic,
      overrideCategory: p.defaultCategory,
      overrideKeywords: p.defaultKeywords,
      overridePurpose: p.defaultPurpose,
      overrideTone: p.preferredTone,
      overridePersona: p,
    });
    setGeneratingPersonaName(null);
  };

  // 폼 제출 시 생성
  const handleGenerateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const activePersona = BLOG_PERSONAS.find((p) => p.id === activePersonaId);
    await executeGeneration({
      overrideTopic: topic.trim() || undefined,
      overrideCategory: category,
      overrideKeywords: searchKeywords,
      overridePurpose: publishPurpose,
      overrideTone: preferredTone,
      overridePersona: activePersona,
    });
  };

  // 공통 생성 실행 함수
  const executeGeneration = async (params: {
    overrideTopic?: string;
    overrideCategory: string;
    overrideKeywords?: string;
    overridePurpose?: string;
    overrideTone: string;
    overridePersona?: BlogPersona;
  }) => {
    setLoading(true);
    setError(null);
    setNeedKey(false);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: params.overrideTopic || undefined,
          category: params.overrideCategory,
          searchKeywords: params.overrideKeywords,
          publishPurpose: params.overridePurpose,
          preferredTone: params.overrideTone,
          targetLength: targetCharCount,
          persona: params.overridePersona
            ? {
                id: params.overridePersona.id,
                name: params.overridePersona.name,
                badge: params.overridePersona.badge,
                tonePrompt: params.overridePersona.tonePrompt,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needKey) setNeedKey(true);
        throw new Error(data.error || "글 생성 실패");
      }

      setResult(data.result);

      // 글 생성이 완료되면 해당 글감을 사용 완료(used) 상태로 업데이트
      if (selectedViral) {
        try {
          const saved = localStorage.getItem("nba_viral_candidates");
          if (saved) {
            const list: BlogViralCandidate[] = JSON.parse(saved);
            const updated = list.map((c) =>
              c.id === selectedViral.id ? { ...c, status: "used" as const } : c
            );
            localStorage.setItem("nba_viral_candidates", JSON.stringify(updated));
            setViralCandidates(updated);
            setSelectedViral((prev) => (prev ? { ...prev, status: "used" } : null));
          }
        } catch {}
      }

      // 결과 화면으로 부드럽게 스크롤 이동
      setTimeout(() => {
        const el = document.getElementById("result-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToQueue = () => {
    if (!result) return;
    const newPost = {
      id: "post-" + Date.now(),
      blog_id: selectedBlogId || "myblog_sample",
      category_name: result.category,
      title: result.title,
      content: result.content,
      tags: result.tags,
      images: result.images,
      status: "queued" as const,
      created_at: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem("nba_saved_posts") || "[]");
    localStorage.setItem("nba_saved_posts", JSON.stringify([newPost, ...existing]));

    alert("크롬 확장의 자동 발행 큐에 등록되었습니다! 크롬 브라우저가 열려 있으면 스마트에디터 ONE에 직접 타이핑을 시작합니다.");
  };

  const handleSaveDraft = () => {
    if (!result) return;
    const newPost = {
      id: "post-" + Date.now(),
      blog_id: selectedBlogId || "myblog_sample",
      category_name: result.category,
      title: result.title,
      content: result.content,
      tags: result.tags,
      images: result.images,
      status: "draft" as const,
      created_at: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem("nba_saved_posts") || "[]");
    localStorage.setItem("nba_saved_posts", JSON.stringify([newPost, ...existing]));

    alert("보관함에 원고가 안전하게 저장되었습니다.");
  };

  const copyContent = () => {
    if (!result) return;
    const full = `${result.title}\n\n${result.content}\n\n태그: ${result.tags.map((t) => "#" + t).join(" ")}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentAcc = accounts.find((a) => a.blog_id === selectedBlogId);

  return (
    <div className="space-y-6">
      {/* 1. 상단 타이틀 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            5단계 AI 파이프라인
          </span>
          <span className="text-xs text-neutral-400">·</span>
          <span className="text-xs text-neutral-500">네이버 C-Rank & DIA+ 알고리즘 최적화</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
          네이버 블로그 원고 자동 생성
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          6대 상황별 페르소나를 선택하거나 맞춤 기획 조건을 입력하면, 리서치부터 휴머나이저 윤문, 스마트에디터 서식 생성까지 100% 자동 완성됩니다.
        </p>
      </div>

      {needKey && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>AI API 키(OpenAI, Gemini, Claude)가 등록되지 않았습니다. 먼저 등록해주세요.</span>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
          >
            API 키 등록하기
          </Link>
        </div>
      )}

      {/* 2. 상단 섹션: 페르소나 선택 & 기획 조건 설정 (전체 폭) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6">
        
        {/* 2-0. [🔥 수집한 떡상 글감에서 선택하기] 섹션 */}
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs">
                🔥
              </span>
              <div>
                <span className="text-sm md:text-base font-extrabold text-neutral-900">
                  수집한 떡상 글감에서 선택하기
                </span>
                <span className="ml-2 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[11px] font-bold">
                  {viralCandidates.length}건 보관
                </span>
              </div>
            </div>

            <Link
              href="/collector"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors"
            >
              <span>+ 새 글감 수집하러 가기</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {selectedViral ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white p-3.5 border border-rose-300 shadow-xs">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded bg-rose-600 text-white font-bold px-2 py-0.5 text-[10px]">
                    적용 중인 떡상 글감
                  </span>
                  <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    {selectedViral.category}
                  </span>
                  {selectedViral.status === "used" && (
                    <span className="rounded bg-sky-50 text-sky-700 px-1.5 py-0.5 text-[10px] font-medium">
                      발행 완료됨
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 text-sm md:text-base font-bold text-neutral-900 truncate">
                  {selectedViral.title}
                </h3>
                {selectedViral.angle && (
                  <p className="mt-1 text-xs text-amber-800 truncate">
                    공략 앵글: {selectedViral.angle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearViral}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  선택 해제
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  aria-label="수집된 떡상 글감 선택"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs md:text-sm font-medium text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  value=""
                  onChange={(e) => {
                    const found = viralCandidates.find((c) => c.id === e.target.value);
                    if (found) applyViralCandidate(found);
                  }}
                >
                  <option value="">
                    {viralCandidates.length > 0
                      ? "-- 보관된 떡상 글감 목록에서 선택 (클릭 시 주제·카테고리·키워드 즉시 세팅) --"
                      : "-- 아직 수집된 글감이 없습니다. 우측 상단에서 새 글감을 수집해 보세요 --"}
                  </option>
                  {viralCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.category}] {c.title} ({c.status === "used" ? "발행완료" : "사용가능"})
                    </option>
                  ))}
                </select>
              </div>

              {/* 빠른 선택 칩 */}
              {viralCandidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-neutral-500 mr-0.5">빠른 선택:</span>
                  {viralCandidates.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyViralCandidate(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:border-rose-400 hover:bg-rose-50/70 hover:text-rose-900 transition-all truncate max-w-[260px]"
                    >
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2-1. [글의 화자(페르소나) 원클릭 선택] 섹션 */}
        <div className="space-y-3 pb-6 border-b border-neutral-100">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎭</span>
              <span className="text-sm md:text-base font-extrabold text-neutral-900">
                글의 화자 (페르소나) 선택
              </span>
              <span className="text-xs font-semibold text-neutral-500 hidden sm:inline">
                (글을 작성하는 주인공·화자의 시각·말투·경험 캐릭터를 설정합니다)
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
              <span>화자 맞춤형 자동 작성</span>
            </span>
          </div>

          {/* 6대 페르소나 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BLOG_PERSONAS.map((p) => {
              const isSelected = activePersonaId === p.id;
              const isThisGenerating = loading && generatingPersonaName === p.name;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPersona(p)}
                  className={`text-left rounded-2xl border p-4 transition-all group flex flex-col justify-between cursor-pointer active:scale-[0.99] shadow-xs relative ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-md"
                      : "border-neutral-200 bg-neutral-50/60 hover:bg-white hover:border-neutral-400 text-neutral-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="flex items-center gap-1.5 font-bold text-sm text-neutral-900">
                        <span className="text-base">{p.emoji}</span>
                        <span>{p.name}</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {p.badge}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-snug line-clamp-2 mt-1">
                      {p.tagline}
                    </p>

                    <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1">
                      <span className="text-neutral-500 font-medium shrink-0">추천 주제:</span>
                      <span className="truncate text-neutral-700">{p.defaultTopic}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-200/70 flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        isSelected ? "text-emerald-700 font-bold" : "text-neutral-500 group-hover:text-neutral-900"
                      }`}
                    >
                      {isSelected ? "✓ 선택됨" : "조건 불러오기"}
                    </span>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateWithPersona(p);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs ${
                        isSelected
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-neutral-900 text-white hover:bg-neutral-800"
                      }`}
                      title="이 페르소나로 즉시 5단계 글 생성 시작"
                    >
                      {isThisGenerating ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>작성 중...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>즉시 생성 →</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-2. [🎯 원하는 글자수 생성 설정 (1 ~ 4,000자)] 섹션 */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
                📏
              </span>
              <div>
                <span className="text-sm md:text-base font-extrabold text-neutral-900">
                  원하는 글자수 생성 설정
                </span>
                <span className="ml-2 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                  1 ~ 4,000자 범위 설정
                </span>
              </div>
            </div>

            {/* 현재 설정된 글자수 뱃지 및 직접 숫자 입력 */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-neutral-600 font-semibold">목표 글자수:</span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-neutral-900 px-3 py-1 text-sm font-black text-white shadow-xs">
                {targetCharCount.toLocaleString()}자
              </span>
              <div className="flex items-center rounded-xl border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 shadow-2xs">
                <input
                  type="number"
                  min="1"
                  max="4000"
                  value={targetCharCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= 4000) setTargetCharCount(val);
                  }}
                  className="w-14 text-right font-bold focus:outline-none"
                />
                <span className="ml-1 text-neutral-400 font-medium">자</span>
              </div>
            </div>
          </div>

          {/* 슬라이더 바 트랙 */}
          <div className="space-y-1.5 pt-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min="1"
                max="4000"
                step="50"
                value={targetCharCount}
                onChange={(e) => setTargetCharCount(Number(e.target.value))}
                className="w-full h-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none transition-all"
              />
            </div>

            {/* 주요 눈금 가이드 */}
            <div className="flex justify-between text-[11px] font-semibold text-neutral-400 px-1">
              <span>1자</span>
              <span>1,000자</span>
              <span className="font-bold text-emerald-700">2,000자 (추천 표준)</span>
              <span>3,000자</span>
              <span>4,000자 (최대)</span>
            </div>
          </div>

          {/* 구간별 성격 안내 및 빠른 선택 버튼 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
            <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <span>
                {targetCharCount <= 800
                  ? "💡 [초단문 요약] 인스타·카드뉴스 연동형 퀵 요약 (단락 1~2개)"
                  : targetCharCount <= 1500
                  ? "💡 [단문 리뷰] 가벼운 일상·제품 퀵 리뷰·빠른 정보 전달 (소제목 2~3개)"
                  : targetCharCount <= 2500
                  ? "💡 [네이버 블로그 표준] C-Rank / DIA+ 검색 상위 노출 황금 분량 (소제목 3~4개)"
                  : targetCharCount <= 3500
                  ? "💡 [전문 심층 분석] 독자 체류시간 극대화, 상세 팩트체크 및 비교 가이드 (소제목 4~5개)"
                  : "💡 [초대형 완벽 가이드] 분야별 총정리 완벽 백과사전 가이드 (소제목 5개 이상)"}
              </span>
            </div>

            {/* 빠른 프리셋 버튼들 */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-neutral-500 font-bold mr-0.5">빠른 선택:</span>
              {[
                { label: "1,000자", val: 1000 },
                { label: "1,800자 (기본)", val: 1800 },
                { label: "2,000자 (추천)", val: 2000 },
                { label: "2,500자 (상위)", val: 2500 },
                { label: "3,500자 (심층)", val: 3500 },
                { label: "4,000자 (최대)", val: 4000 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setTargetCharCount(preset.val)}
                  className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                    targetCharCount === preset.val
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2-3. 기획 조건 직접 설정 및 미세 조정 폼 */}
        <form onSubmit={handleGenerateForm} className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>기획 세부 조건 미세 조정</span>
            </h2>
            <span className="text-xs text-neutral-400">
              페르소나 선택 시 자동 입력되며, 자유롭게 수정할 수 있습니다.
            </span>
          </div>

          {/* 블로그 계정 및 등록 카테고리 빠른 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 계정 선택 */}
            {accounts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-neutral-700">
                    발행할 네이버 블로그 ID
                  </label>
                  <Link
                    href="/accounts"
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    계정·카테고리 설정 ↗
                  </Link>
                </div>
                <select
                  value={selectedBlogId}
                  onChange={(e) => {
                    setSelectedBlogId(e.target.value);
                    const acc = accounts.find((a) => a.blog_id === e.target.value);
                    if (acc && acc.categories.length > 0) {
                      const first = acc.categories[0];
                      setCategory(first.category_name);
                      setSearchKeywords(first.search_keywords || "");
                      setPublishPurpose(first.publish_purpose || "");
                      setPreferredTone(first.preferred_tone || "해요체");
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.blog_id}>
                      {acc.label} ({acc.blog_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 등록된 카테고리 빠른 선택 버튼 (계정에 등록된 카테고리가 있는 경우) */}
            {currentAcc && currentAcc.categories && currentAcc.categories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-neutral-700">등록 카테고리 원클릭 선택</span>
                  <span className="text-[10px] text-neutral-400">클릭 시 자동 반영</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentAcc.categories.map((c: any) => {
                    const isSelected = category === c.category_name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategory(c.category_name);
                          setSearchKeywords(c.search_keywords || "");
                          setPublishPurpose(c.publish_purpose || "");
                          setPreferredTone(c.preferred_tone || "해요체");
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 border ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white font-semibold shadow-xs"
                            : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{c.category_name}</span>
                        <span
                          className={`text-[10px] ${
                            isSelected ? "text-emerald-100" : "text-neutral-400"
                          }`}
                        >
                          ({c.preferred_tone})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 카테고리 & 특정 주제 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                네이버 블로그 카테고리
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 생활정보, 국내여행, IT정보"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                특정 주제 (비워두면 페르소나 및 트렌드로 자동 발굴)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 2026 청년 취업지원금 신청 절차"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* 검색 키워드 & 발행 목적 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                검색 키워드 (쉼표 구분)
              </label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="예: 정부지원금, 일상 꿀팁, 절약 노하우"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                발행 목적 및 독자 타깃
              </label>
              <input
                type="text"
                value={publishPurpose}
                onChange={(e) => setPublishPurpose(e.target.value)}
                placeholder="예: 사회초년생을 위한 실전 복지 혜택 가이드"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* 원고 문체(어조) & 실행 버튼 */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-700">원고 문체:</span>
              <div className="flex items-center gap-1.5">
                {["해요체", "합니다체", "친근한 반말"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPreferredTone(t)}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all ${
                      preferredTone === t
                        ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 min-w-[240px]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>5단계 AI 에이전트 작업 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>5단계 AI 블로그 글 생성 시작</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. 하단 섹션: AI 생성 결과물 보이는 섹션 (결과물 보이는 섹션을 아래로 이동) */}
      <div id="result-section" className="space-y-4 pt-2">
        {error && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">오류 발생</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {result ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
            {/* 상단 컨트롤 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {result.category}
                </span>
                {result.personaName && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 text-neutral-700">
                    🎭 {result.personaName} 관점
                  </span>
                )}
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-xs text-neutral-700 font-semibold bg-neutral-100 px-2 py-0.5 rounded">
                  공백 포함 약 {result.content.length.toLocaleString()}자 (목표: {(result.targetLength || targetCharCount).toLocaleString()}자)
                </span>
                <span className="text-[11px] text-neutral-400">
                  (공백 제외 {result.content.replace(/\s/g, "").length.toLocaleString()}자)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyContent}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? "복사 완료!" : "원고 복사"}</span>
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>보관함 저장</span>
                </button>
                <button
                  onClick={handlePublishToQueue}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>🚀 네이버 블로그로 즉시 발행</span>
                </button>
              </div>
            </div>

            {/* 5단계 에이전트 단계별 실행 내역 요약 박스 */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>5단계 AI 에이전트 실행 내역:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                {result.stepsLog.map((log, idx) => (
                  <div key={idx} className="text-xs text-neutral-600 flex items-center gap-1.5 bg-white p-2 rounded-lg border border-neutral-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-neutral-800 shrink-0">{log.step}:</span>
                    <span className="truncate">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                네이버 블로그 제목
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-neutral-900 leading-snug">
                {result.title}
              </h2>
            </div>

            {/* 본문 미리보기 (가로 폭 넓고 쾌적하게 렌더링) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                  스마트에디터 ONE 서식 원고 본문
                </span>
                <span className="text-xs text-neutral-400">
                  크롬 확장이 네이버 에디터에 제목/본문/태그를 동일 서식으로 자동 입력합니다.
                </span>
              </div>
              <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200 font-sans text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap max-h-[550px] overflow-y-auto shadow-inner">
                {result.content}
              </div>
            </div>

            {/* 태그 */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                추천 SEO 검색 태그 ({result.tags.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* AI 이미지 프롬프트 안내 (대표 썸네일 & 본문 삽입 컷) */}
            {result.images && result.images.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2 text-xs">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>🖼️ AI 이미지 생성 추천 프롬프트 (썸네일 & 본문 컷)</span>
                </div>
                <div className="space-y-2 pt-1">
                  {result.images.map((img, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200/60 space-y-1">
                      <div className="font-semibold text-neutral-800 flex items-center justify-between">
                        <span>[{img.type === "thumbnail" ? "대표 썸네일" : "본문 삽입 이미지"}] {img.caption}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(img.prompt);
                            alert("이미지 프롬프트가 복사되었습니다!");
                          }}
                          className="text-[11px] text-amber-700 hover:text-amber-900 font-medium underline"
                        >
                          프롬프트 복사
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-600 bg-neutral-50 p-2 rounded">
                        {img.prompt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 대기 상태 안내 카드 */
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-neutral-400 shadow-xs flex flex-col items-center justify-center min-h-[300px]">
            <Sparkles className="w-10 h-10 text-neutral-300 mb-3 animate-pulse" />
            <div className="font-bold text-neutral-700 text-base">
              5단계 AI 에이전트 파이프라인 대기 중
            </div>
            <p className="mt-1 text-xs max-w-md text-neutral-500 leading-relaxed">
              상단에서 <b>6대 상황별 페르소나</b>를 선택하거나 주제/키워드를 입력한 후 <b>[5단계 AI 블로그 글 생성 시작]</b>을 누르면, 리서치부터 휴머나이징 윤문이 완료된 스마트에디터 ONE 원고가 이 자리에 완성됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
