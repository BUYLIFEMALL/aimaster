"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getViralPostsAction,
  getSavedBookmarksAction,
  toggleBookmarkAction,
  generateBenchmarkCaptionAction,
  getUserProductsAction,
  createDirectBenchmarkPostAction,
  type ViralPostItem,
} from "@/lib/actions/viral";
import { PRESET_PERSONAS } from "@/lib/constants/personas";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODELS, PROVIDER_SHORT_LABELS } from "@/lib/ai/models";
import { PLATFORM_LABELS, type AffiliatePlatform, type AffiliateProduct } from "@/types/product";
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
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<"detector" | "saved" | "personas">("detector");

  const [selectedTag, setSelectedTag] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"1d" | "1w" | "1m" | "all">("all");
  const [sortBy, setSortBy] = useState<"viralScore" | "likes" | "replies" | "reposts">("viralScore");

  const [posts, setPosts] = useState<ViralPostItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<ViralPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [activeModalPost, setActiveModalPost] = useState<ViralPostItem | null>(null);
  const [productInputMode, setProductInputMode] = useState<"saved" | "manual">("saved");
  const [savedProducts, setSavedProducts] = useState<AffiliateProduct[]>([]);
  const [selectedSavedProductId, setSelectedSavedProductId] = useState<string>("");
  const [loadingSavedProducts, setLoadingSavedProducts] = useState<boolean>(false);

  const [productName, setProductName] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [platform, setPlatform] = useState<AffiliatePlatform>("coupang");
  const [price, setPrice] = useState<string>("");

  const [aiProvider, setAiProvider] = useState<"openai" | "gemini" | "anthropic">("openai");
  const [aiModel, setAiModel] = useState<string>("gpt-4.1");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("p-01");
  const [customPersonaText, setCustomPersonaText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [creatingDirectPost, setCreatingDirectPost] = useState(false);
  const [imageModel, setImageModel] = useState<string>("nanobanana-2-2k");
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPosts = () => {
    if (activeSubTab === "personas") return;
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

  const openBenchmarkModal = async (post: ViralPostItem, personaId?: string) => {
    setActiveModalPost(post);
    setProductName("");
    setAffiliateUrl("");
    setPlatform("coupang");
    setPrice("");
    setSelectedSavedProductId("");
    setProductInputMode("saved");
    if (personaId) setSelectedPersonaId(personaId);
    setAiProvider("openai");
    setAiModel(DEFAULT_AI_MODELS["openai"]);
    setImageModel("nanobanana-2-2k");
    setGeneratedCaption(null);
    setGeneratedImageUrl(null);
    setGenError(null);

    setLoadingSavedProducts(true);
    const res = await getUserProductsAction();
    if (res.products && res.products.length > 0) {
      setSavedProducts(res.products as AffiliateProduct[]);
      const first = res.products[0];
      setSelectedSavedProductId(first.id);
      setProductName(first.product_name);
      setPlatform(first.platform);
      setPrice(first.price ? String(first.price) : "");
      setAffiliateUrl(first.affiliate_url);
    } else {
      setSavedProducts([]);
      setProductInputMode("manual");
    }
    setLoadingSavedProducts(false);
  };

  const handleGenerateCaption = async () => {
    if (!activeModalPost) return;
    if (!productName.trim() || !affiliateUrl.trim()) {
      setGenError("상품명과 제휴 URL을 입력해주세요.");
      return;
    }

    setGenerating(true);
    setGenError(null);
    setGeneratedCaption(null);
    setGeneratedImageUrl(null);

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
      aiModel,
      imageModel,
    });

    setGenerating(false);

    if (res.error) {
      setGenError(res.error);
    } else if (res.caption) {
      setGeneratedCaption(res.caption);
      setGeneratedImageUrl(res.imageUrl || null);
    }
  };

  const copyToClipboard = () => {
    if (!generatedCaption) return;
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateDirectPost = async () => {
    if (!generatedCaption || !productName.trim()) {
      setGenError("상품 정보를 먼저 선택하거나 입력해주세요.");
      return;
    }
    setCreatingDirectPost(true);
    setGenError(null);
    const res = await createDirectBenchmarkPostAction({
      content: generatedCaption,
      productName: productName.trim(),
      productId: selectedSavedProductId || undefined,
      platform,
      affiliateUrl: affiliateUrl.trim(),
      imageUrl: generatedImageUrl || undefined,
    });
    setCreatingDirectPost(false);
    if (res.postId) {
      router.push(`/posts/${res.postId}`);
    } else if (res.error) {
      setGenError(res.error);
    }
  };

  const displayList = activeSubTab === "saved" ? savedPosts : posts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex flex-wrap gap-2">
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
          <button
            onClick={() => setActiveSubTab("personas")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "personas"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>🎭 AI 페르소나 보관함</span>
          </button>
        </div>
      </div>

      {activeSubTab === "personas" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-base text-neutral-900">학습된 AI 페르소나 스타일 모음</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Threads 포스팅 생성 시 적용할 페르소나(글쓰기 어조 및 인격)를 미리 확인하고 선택해보세요. OpenAI GPT-4o-mini 및 Google Gemini 1.5 엔진이 선택된 페르소나에 맞춰 떡상 바이럴 캡션을 자동 생성합니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {PRESET_PERSONAS.map((persona) => (
              <div
                key={persona.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs transition-all hover:border-purple-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700">
                      ID: {persona.id}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">기본 프리셋</span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900 mb-2">{persona.name}</h4>
                  <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-100 whitespace-pre-line leading-relaxed mb-4">
                    {persona.toneDescription}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedPersonaId(persona.id);
                    setActiveSubTab("detector");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 px-3 py-2 text-xs font-bold text-white transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-300" />
                  <span>이 페르소나로 글쓰기 탐지기 이동</span>
                </button>
              </div>
            ))}

            <div className="flex flex-col justify-between rounded-xl border border-dashed border-purple-300 bg-purple-50/40 p-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    커스텀
                  </span>
                  <span className="text-[10px] text-purple-600 font-bold">✍️ 직접 작성</span>
                </div>
                <h4 className="font-bold text-sm text-neutral-900 mb-2">나만의 커스텀 페르소나</h4>
                <p className="text-xs text-neutral-600 mb-3">
                  내가 원하는 개성 있는 말투나 어조(예: 30대 자취생 말투, 감성 인스타 톤 등)를 자유롭게 입력하여 AI에 학습시킬 수 있습니다.
                </p>
                <input
                  type="text"
                  placeholder="예: 30대 자취생 말투, 감성적인 어조, 이모지 많이 사용"
                  value={customPersonaText}
                  onChange={(e) => setCustomPersonaText(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs focus:border-purple-600 focus:outline-none mb-4"
                />
              </div>

              <button
                onClick={() => {
                  setSelectedPersonaId("custom");
                  setActiveSubTab("detector");
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-xs font-bold text-white transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-200" />
                <span>커스텀 페르소나 적용 후 탐지기 이동</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {activeSubTab !== "personas" && (
        loading || isPending ? (
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
        )
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

            <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-200 space-y-3">
              <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-purple-600" /> AI 엔진 선택 (OpenAI / Gemini / Claude) *
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">선택한 카드 하단 세부 모델 변경</span>
              </label>

              {/* 3대 Provider 선택 카드 (OpenAI / Gemini / Claude) */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider("openai");
                    setAiModel(DEFAULT_AI_MODELS["openai"]);
                  }}
                  className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-1 transition-all ${
                    aiProvider === "openai"
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-sm">🤖</span>
                  <span>OpenAI (GPT)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider("gemini");
                    setAiModel(DEFAULT_AI_MODELS["gemini"]);
                  }}
                  className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-1 transition-all ${
                    aiProvider === "gemini"
                      ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-sm">✨</span>
                  <span>Google Gemini</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider("anthropic");
                    setAiModel(DEFAULT_AI_MODELS["anthropic"]);
                  }}
                  className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-1 transition-all ${
                    aiProvider === "anthropic"
                      ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-sm">🧠</span>
                  <span>Claude</span>
                </button>
              </div>

              {/* 선택된 Provider 하단 세부 모델 선택 (셀렉트 버튼/드롭다운) */}
              <div className="pt-2.5 border-t border-neutral-200/80 space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-600 flex items-center justify-between">
                  <span>🎯 {PROVIDER_SHORT_LABELS[aiProvider]} 세부 실행 모델 선택 (2026 최신 라인업):</span>
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none shadow-xs cursor-pointer"
                >
                  {AI_MODEL_OPTIONS.filter((opt) => opt.provider === aiProvider).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
              {/* 상품 정보 입력 방식 선택 탭 (등록된 상품 선택 / 직접 입력) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-800">상품 정보입력 방식 선택 *</label>
                <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1 border border-neutral-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setProductInputMode("saved");
                      if (savedProducts.length > 0 && !selectedSavedProductId) {
                        const first = savedProducts[0];
                        setSelectedSavedProductId(first.id);
                        setProductName(first.product_name);
                        setPlatform(first.platform);
                        setPrice(first.price ? String(first.price) : "");
                        setAffiliateUrl(first.affiliate_url);
                      }
                    }}
                    className={`flex-1 rounded-lg py-1.5 font-bold transition-all flex items-center justify-center gap-1 ${
                      productInputMode === "saved"
                        ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <span>📦 등록된 상품에서 선택</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductInputMode("manual")}
                    className={`flex-1 rounded-lg py-1.5 font-bold transition-all flex items-center justify-center gap-1 ${
                      productInputMode === "manual"
                        ? "bg-white text-neutral-900 shadow-xs border border-neutral-200"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <span>✏️ 직접 입력</span>
                  </button>
                </div>
              </div>

              {productInputMode === "saved" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-700">등록된 제휴 상품 선택 *</label>
                  {loadingSavedProducts ? (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center text-xs text-neutral-500">
                      내 등록 상품 목록을 불러오는 중...
                    </div>
                  ) : savedProducts.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
                      <span>등록된 상품이 없습니다. 상단 '상품 관리' 메뉴에서 등록하시거나 직접 입력해 주세요.</span>
                      <button
                        type="button"
                        onClick={() => setProductInputMode("manual")}
                        className="text-[11px] font-bold text-amber-900 underline whitespace-nowrap"
                      >
                        직접 입력으로 변경
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedSavedProductId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedSavedProductId(id);
                        const p = savedProducts.find((item) => item.id === id);
                        if (p) {
                          setProductName(p.product_name);
                          setPlatform(p.platform);
                          setPrice(p.price ? String(p.price) : "");
                          setAffiliateUrl(p.affiliate_url);
                        } else {
                          setProductName("");
                          setAffiliateUrl("");
                          setPrice("");
                        }
                      }}
                      className="w-full rounded-lg border border-neutral-300 p-2 text-xs font-semibold focus:border-neutral-900 focus:outline-none bg-white cursor-pointer shadow-xs"
                    >
                      <option value="">-- 내 등록 상품을 선택해주세요 --</option>
                      {savedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{PLATFORM_LABELS[p.platform] || p.platform}] {p.product_name} {p.price ? `(${Number(p.price).toLocaleString()}원)` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedSavedProductId && (
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3 text-xs space-y-1">
                      <p className="font-bold text-emerald-950 flex items-center justify-between">
                        <span>✅ 자동 입력 완료된 상품 정보</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">연동됨</span>
                      </p>
                      <p className="text-emerald-900 truncate font-semibold"><span className="text-emerald-700 font-normal">상품명:</span> {productName}</p>
                      <div className="flex items-center gap-4 text-emerald-900">
                        <span><span className="text-emerald-700 font-normal">플랫폼:</span> {PLATFORM_LABELS[platform] || platform}</span>
                        {price && <span><span className="text-emerald-700 font-normal">판매가:</span> {Number(price).toLocaleString()}원</span>}
                      </div>
                      <p className="text-emerald-900 truncate font-mono text-[11px]"><span className="text-emerald-700 font-normal font-sans">제휴 URL:</span> {affiliateUrl}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}

              {genError && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                  {genError}
                </p>
              )}

              {/* AI 이미지 생성 옵션 셀렉트 (나노바나나) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400" /> AI 이미지 생성 모델 선택 (NanoBanana)
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal">선택 시 캡션과 이미지 동시 생성</span>
                </label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none shadow-xs cursor-pointer"
                >
                  <option value="nanobanana-2-2k">🍌 NanoBanana 2-2K (2K 고화질 비주얼 · 기본 추천)</option>
                  <option value="nanobanana-2-4k">🍌 NanoBanana 2-4K (4K 울트라 HD)</option>
                  <option value="nanobanana-pro">🍌 NanoBanana Pro (프로페셔널 인포그래픽)</option>
                  <option value="nanobanana">🍌 NanoBanana Standard (기본 모델)</option>
                  <option value="none">🚫 이미지 생성 안 함 (텍스트 캡션만 생성)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateCaption}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 p-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
              >
                {generating ? (
                  <span>선택된 페르소나, {aiProvider === "gemini" ? "Gemini" : "GPT"} 및 나노바나나 이미지 생성 중...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-400 fill-amber-300" />
                    <span>✨ AI 쓰레드 캡션 생성하기</span>
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

                {generatedImageUrl && (
                  <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-900">
                    <img src={generatedImageUrl} alt="AI 나노바나나 생성 이미지" className="w-full h-48 object-cover" />
                  </div>
                )}

                <div className="rounded-xl bg-neutral-900 p-4 text-xs font-mono text-neutral-100 whitespace-pre-line leading-relaxed">
                  {generatedCaption}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCreateDirectPost}
                    disabled={creatingDirectPost}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 p-3 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                  >
                    {creatingDirectPost ? (
                      <span>AI 완성 게시글 저장 중...</span>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300 fill-amber-300" />
                        <span>🚀 완성된 게시글 바로 생성 (결과 페이지로 이동)</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <Link
                    href={`/posts/new?initialContent=${encodeURIComponent(generatedCaption)}&productId=${selectedSavedProductId}&initialImageUrl=${encodeURIComponent(generatedImageUrl || "")}`}
                    className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 p-2.5 text-xs font-bold text-neutral-700 transition-colors"
                  >
                    <span>📝 작성 화면에서 수동 편집하기</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
