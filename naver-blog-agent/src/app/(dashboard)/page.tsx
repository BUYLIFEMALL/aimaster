"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Send, Save, CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink, ChevronRight, Layers } from "lucide-react";
import type { PipelineResult } from "@/lib/ai/pipeline";

export default function MainPage() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("생활정보");
  const [searchKeywords, setSearchKeywords] = useState("정부지원금, 일상 꿀팁, 절약 노하우");
  const [publishPurpose, setPublishPurpose] = useState("실생활에 유용한 복지 및 지원금 정보를 알기 쉽게 전달");
  const [preferredTone, setPreferredTone] = useState("해요체");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // 계정 목록 불러오기
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("nba_accounts_local");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAccounts(parsed);
        if (parsed.length > 0) {
          setSelectedBlogId(parsed[0].blog_id);
          if (parsed[0].categories.length > 0) {
            const firstCat = parsed[0].categories[0];
            setCategory(firstCat.category_name);
            setSearchKeywords(firstCat.search_keywords);
            setPublishPurpose(firstCat.publish_purpose);
            setPreferredTone(firstCat.preferred_tone);
          }
        }
      } catch {}
    }
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedKey(false);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          category,
          searchKeywords,
          publishPurpose,
          preferredTone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needKey) setNeedKey(true);
        throw new Error(data.error || "글 생성 실패");
      }

      setResult(data.result);
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
      {/* 상단 타이틀 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            5단계 AI 파이프라인
          </span>
          <span className="text-xs text-neutral-400">·</span>
          <span className="text-xs text-neutral-500">크롬 확장 연동 스마트에디터 자동 발행</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
          네이버 블로그 원고 자동 생성
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          카테고리와 키워드를 선택하면 리서치부터 휴머나이저 윤문, 스마트에디터 서식 생성까지 100% 자동 완성됩니다.
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

      {/* 메인 작업 영역: 좌측 설정 / 우측 결과 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측 입력 폼 (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>기획 조건 설정</span>
            </h2>

            <form onSubmit={handleGenerate} className="space-y-3.5">
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
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-700">등록 카테고리 빠른 선택</span>
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
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 border ${
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

              {/* 카테고리 */}
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

              {/* 특정 주제 지정 (선택) */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  특정 주제 (비워두면 AI가 최신 트렌드로 자동 발굴)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 2026 청년 취업지원금 신청 절차"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* 검색 키워드 */}
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

              {/* 발행 목적 */}
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

              {/* 말투 */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  원고 문체 (어조)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["해요체", "합니다체", "친근한 반말"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPreferredTone(t)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all ${
                        preferredTone === t
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 생성 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>5단계 AI 에이전트 작업 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>5단계 AI 글 생성 시작</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 5단계 파이프라인 소개 미니 카드 */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm text-xs text-neutral-600 space-y-2">
            <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>5단계 멀티 에이전트 프로세스</span>
            </div>
            <div className="space-y-1 text-[11px] text-neutral-500">
              <div>1. <b>Research</b>: 최신 검색 및 신뢰도 높은 소제목 3개 기획</div>
              <div>2. <b>Writer</b>: 1,800~2,500자 스마트에디터 ONE 서식 본문 작성</div>
              <div>3. <b>Humanizer</b>: 상투적 AI 번역투 제거 및 17대 윤문 적용</div>
              <div>4. <b>Reviewer</b>: 팩트 검수 및 네이버 SEO 태그 추출</div>
              <div>5. <b>Image</b>: 대표 썸네일 & 본문 삽입 이미지 프롬프트 생성</div>
            </div>
          </div>
        </div>

        {/* 우측 결과물 뷰어 (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
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
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
              {/* 상단 컨트롤 버튼 바 */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {result.category}
                  </span>
                  <span className="text-xs text-neutral-400">
                    공백 제외 약 {result.content.replace(/\s/g, "").length}자
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyContent}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-medium text-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? "복사됨!" : "원고 복사"}</span>
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-medium text-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>보관함 저장</span>
                  </button>
                  <button
                    onClick={handlePublishToQueue}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>네이버로 즉시 발행</span>
                  </button>
                </div>
              </div>

              {/* 단계별 실행 로그 */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <div className="text-[11px] font-semibold text-neutral-700">에이전트 실행 내역:</div>
                <div className="space-y-0.5">
                  {result.stepsLog.map((log, idx) => (
                    <div key={idx} className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="font-medium text-neutral-800">{log.step}:</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 mb-1">제목</div>
                <h2 className="text-lg font-bold text-neutral-900 leading-snug">
                  {result.title}
                </h2>
              </div>

              {/* 본문 미리보기 */}
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 mb-1">
                  스마트에디터 ONE 원고 본문
                </div>
                <div className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200 font-sans text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {result.content}
                </div>
              </div>

              {/* 태그 */}
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 mb-1.5">
                  추천 SEO 태그
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-400 text-xs shadow-sm flex flex-col items-center justify-center min-h-[450px]">
              <Sparkles className="w-8 h-8 text-neutral-300 mb-3" />
              <div className="font-semibold text-neutral-600 text-sm">
                5단계 AI 에이전트 준비 완료
              </div>
              <p className="mt-1 text-xs max-w-sm text-neutral-400">
                좌측에서 카테고리와 키워드를 설정한 후 [5단계 AI 글 생성 시작] 버튼을 누르면 스마트에디터 ONE 원고가 완성됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
