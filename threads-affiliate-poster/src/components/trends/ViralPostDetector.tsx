"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getViralPostsAction,
  getSavedBookmarksAction,
  toggleBookmarkAction,
  generateBenchmarkCaptionAction,
  type ViralPostItem,
} from "@/lib/actions/viral";
import { PRESET_PERSONAS } from "@/lib/constants/personas";
import type { AffiliatePlatform } from "@/types/product";
import {
  Sparkles,
  Flame,
  Zap,
  TrendingUp,
  Search,
  Copy,
  Check,
  Bookmark,
  Calendar,
  Filter,
  Bot,
  ArrowRight,
  X,
  Eye,
} from "lucide-react";
import Link from "next/link";

const BRAND_TAGS = [
  "전체",
  "다이소",
  "코스트코",
  "무인양품",
  "돈키호테",
  "올리브영",
  "쿠팡",
  "알리",
];

export function ViralPostDetector() {
  const [activeSubTab, setActiveSubTab] = useState<"detector" | "saved">("detector");

  const [selectedTag, setSelectedTag] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"1d" | "1w" | "1m" | "all">("all");
  const [sortBy, setSortBy] = useState<"viralScore" | "likes" | "replies" | "reposts">("viralScore");

  const [posts, setPosts] = useState<ViralPostItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<ViralPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [activeModalPost, setActiveModalPost] = useState<ViralPostItem | null>(null);
  const [productName, setProductName] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [platform, setPlatform] = useState<AffiliatePlatform>("coupang");
  const [price, setPrice] = useState<string>("");

  const [aiProvider, setAiProvider] = useState<"openai" | "gemini">("openai");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("p-01");
  const [customPersonaText, setCustomPersonaText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPosts = () => {
    setLoading(true);
    startTransition(async () => {
      if (activeSubTab === "saved") {
        const res = await getSavedBookmarksAction();
        setSavedPosts(res.posts);
      } else {
        const res = await getViralPostsAction({
          keyword: searchQuery.trim() || selectedTag,
          dateRange,
          sortBy,
        });
        setPosts(res.posts);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedTag, dateRange, sortBy, activeSubTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  const handleToggleBookmark = async (post: ViralPostItem) => {
    const res = await toggleBookmarkAction(post);
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: res.isSaved } : p))
    );
    if (activeSubTab === "saved") {
      fetchPosts();
    }
  };

  const openBenchmarkModal = (post: ViralPostItem) => {
    setActiveModalPost(post);
    setProductName("");
    setAffiliateUrl("");
    setPlatform("coupang");
    setPrice("");
    setSelectedPersonaId("p-01");
    setCustomPersonaText("");
    setGeneratedCaption(null);
    setGenError(null);
  };

  const handleGenerateCaption = async () => {
    if (!activeModalPost) return;
    if (!productName.trim() || !affiliateUrl.trim()) {
      setGenError("상품명과 제휴 URL을 입력해주세요.");
      return;
    }

    setGenerating(true);
    setGenError(null);

    let personaDescription = "";
    if (selectedPersonaId === "custom") {
      personaDescription = customPersonaText.trim() || "솔직하고 친근한 쇼핑 팁 톤";
    } else {
      const found = PRESET_PERSONAS.find((p) => p.id === selectedPersonaId);
      personaDescription = found ? found.toneDescription : "솔직하고 친근한 톤";
    }

    const res = await generateBenchmarkCaptionAction({
      viralContent: activeModalPost.content,
      productName: productName.trim(),
      affiliateUrl: affiliateUrl.trim(),
      platform,
      price: price ? parseInt(price.replace(/,/g, ""), 10) : undefined,
      personaDescription,
      aiProvider,
    });

    setGenerating(false);

    if (res.error) {
      setGenError(res.error);
    } else if (res.caption) {
      setGeneratedCaption(res.caption);
    }
  };

  const copyToClipboard = () => {
    if (!generatedCaption) return;
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayList = activeSubTab === "saved" ? savedPosts : posts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("detector")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "detector"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            🔥 바이럴 떡상 탐지기
          </button>
          <button
            onClick={() => setActiveSubTab("saved")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "saved"
                ? "bg-neutral-900 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5 fill-current" />
            <span>📁 내 찜 보관함</span>
          </button>
        </div>
      </div>

      {activeSubTab === "detector" && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="검색어 입력 (예: 다이소, 코스트코, 무인양품, 돈키호테, 꿀템)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-4 py-2 text-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800"
            >
              검색
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-neutral-500 mr-1">인기 브랜딩:</span>
            {BRAND_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(tag);
                  setSearchQuery("");
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  selectedTag === tag && !searchQuery
                    ? "bg-neutral-900 text-white font-bold"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-500" />
              <span className="font-bold text-neutral-600">기간:</span>
              <button
                onClick={() => setDateRange("1d")}
                className={`rounded-lg px-2.5 py-1 ${dateRange === "1d" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                1일 (24h)
              </button>
              <button
                onClick={() => setDateRange("1w")}
                className={`rounded-lg px-2.5 py-1 ${dateRange === "1w" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                1주일 (7일)
              </button>
              <button
                onClick={() => setDateRange("1m")}
                className={`rounded-lg px-2.5 py-1 ${dateRange === "1m" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                1달 (30일)
              </button>
              <button
                onClick={() => setDateRange("all")}
                className={`rounded-lg px-2.5 py-1 ${dateRange === "all" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                전체
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-neutral-500" />
              <span className="font-bold text-neutral-600">정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-neutral-300 bg-white p-1 text-xs focus:outline-none"
              >
                <option value="viralScore">🔥 종합 반응도 순</option>
                <option value="likes">❤️ 좋아요 많은 순</option>
                <option value="replies">💬 댓글 많은 순</option>
                <option value="reposts">🔄 리포스트 많은 순</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading || isPending ? (
        <div className="py-12 text-center text-sm text-neutral-500">
          🔥 바이럴 떡상 지표를 수집 및 분석 중입니다...
        </div>
      ) : displayList.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-200">
          {activeSubTab === "saved"
            ? "보관함에 찜한 포스팅이 없습니다. 탐지기에서 찜하기를 눌러보세요!"
            : "검색 조건에 해당 포스팅이 없습니다. 다른 키워드나 기간으로 검색해보세요."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayList.map((post) => (
            <div
              key={post.id}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      {post.authorName[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">{post.authorName}</p>
                      <p className="text-[10px] text-neutral-400">@{post.authorHandle} • {post.postedAtAgo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                      <Eye className="h-3 w-3" /> {post.estimatedViews.toLocaleString()}+회
                    </span>

                    <button
                      onClick={() => handleToggleBookmark(post)}
                      title={post.isSaved ? "보관함에서 제거" : "보관함에 찜하기"}
                      className={`rounded-lg p-1.5 transition-colors ${
                        post.isSaved
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                      }`}
                    >
                      <Bookmark className={`h-4 w-4 ${post.isSaved ? "fill-amber-600 text-amber-600" : ""}`} />
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-neutral-800 bg-neutral-50 p-3 rounded-lg border border-neutral-100 mb-3 whitespace-pre-line">
                  {post.content}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-neutral-500 mb-4">
                  <span className="font-semibold text-red-600">❤️ {post.likes.toLocaleString()}</span>
                  <span className="font-semibold text-amber-700">💬 {post.replies.toLocaleString()}</span>
                  <span className="font-semibold text-blue-600">🔄 {post.reposts.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => openBenchmarkModal(post)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 px-3 py-2 text-xs font-bold text-white transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-300" />
                <span>⚡ 이 떡상글 벤치마킹 AI 캡션 생성</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {activeModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500 fill-amber-400" />
                <h3 className="font-bold text-base text-neutral-900">AI 바이럴 & 페르소나 캡션 생성</h3>
              </div>
              <button
                onClick={() => setActiveModalPost(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs">
              <p className="font-bold text-amber-900 mb-1">📌 참고할 떡상 포스팅 (@{activeModalPost.authorHandle})</p>
              <p className="text-amber-800 whitespace-pre-line line-clamp-3">{activeModalPost.content}</p>
            </div>

            <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200 space-y-2">
              <label className="block text-xs font-bold text-neutral-800 flex items-center gap-1">
                <Bot className="h-4 w-4 text-neutral-600" /> AI 엔진 선택 (OpenAI / Gemini)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setAiProvider("openai")}
                  className={`rounded-lg p-2 border font-bold text-center transition-all ${
                    aiProvider === "openai"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  🤖 OpenAI GPT-4o-mini
                </button>
                <button
                  onClick={() => setAiProvider("gemini")}
                  className={`rounded-lg p-2 border font-bold text-center transition-all ${
                    aiProvider === "gemini"
                      ? "border-amber-600 bg-amber-500 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  ✨ Google Gemini 1.5
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700">나만의 글쓰기 페르소나 선택 *</label>
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 p-2 text-xs focus:border-neutral-900 focus:outline-none bg-white"
              >
                {PRESET_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="custom">✍️ 커스텀 페르소나 직접 입력</option>
              </select>
              {selectedPersonaId === "custom" && (
                <input
                  type="text"
                  placeholder="예: 30대 자취생 말투, 감성적인 어조, 이모지 많이 사용"
                  value={customPersonaText}
                  onChange={(e) => setCustomPersonaText(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 p-2 text-xs focus:border-neutral-900 focus:outline-none"
                />
              )}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">내 상품명 *</label>
                <input
                  type="text"
                  placeholder="예: 실리콘 이중 밀폐용기 4호 세트"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 p-2 text-xs focus:border-neutral-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">제휴 플랫폼 *</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as AffiliatePlatform)}
                    className="w-full rounded-lg border border-neutral-300 p-2 text-xs focus:border-neutral-900 focus:outline-none bg-white"
                  >
                    <option value="coupang">쿠팡파트너스</option>
                    <option value="aliexpress">알리익스프레스</option>
                    <option value="naver">네이버 브랜드커넥트</option>
                    <option value="toss">토스쇼핑 쉐어링크</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">판매가 (선택)</label>
                  <input
                    type="text"
                    placeholder="예: 15,900"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 p-2 text-xs focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">내 제휴 링크 (URL) *</label>
                <input
                  type="text"
                  placeholder="https://link.coupang.com/a/..."
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 p-2 text-xs focus:border-neutral-900 focus:outline-none"
                />
              </div>

              {genError && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                  {genError}
                </p>
              )}

              <button
                onClick={handleGenerateCaption}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 p-2.5 text-xs font-bold text-white transition-colors"
              >
                {generating ? (
                  <span>선택된 페르소나 및 {aiProvider === "gemini" ? "Gemini" : "GPT"}로 생성 중...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-400 fill-amber-300" />
                    <span>AI 페르소나 바이럴 캡션 1초 만에 생성</span>
                  </>
                )}
              </button>
            </div>

            {generatedCaption && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="h-4 w-4" /> 생성된 바이럴 캡션 (페르소나 완료)
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50"
                  >
                    {copied ? (
                      <span className="text-emerald-600">복사 완료!</span>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> 복사하기
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl bg-neutral-900 p-4 text-xs font-mono text-neutral-100 whitespace-pre-line leading-relaxed">
                  {generatedCaption}
                </div>

                <Link
                  href={`/posts/new?initialContent=${encodeURIComponent(generatedCaption)}`}
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 p-2.5 text-xs font-bold text-white transition-colors shadow-xs"
                >
                  <span>이 캡션으로 포스팅 작성 화면 가기</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
