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
  searchRelatedCoupangProductsAction,
  generateAiExamplePostsAction,
  importViralPostAction,
  type ViralPostItem,
  type ViralPostMedia,
  type ThreadsSearchStatus,
} from "@/lib/actions/viral";
import { connectThreadsAccountWithKeywordSearchAction } from "@/lib/actions/accounts";
import type { CoupangProduct } from "@/lib/coupang/client";
import { PRESET_PERSONAS } from "@/lib/constants/personas";
import { PersonaPicker } from "@/components/personas/PersonaPicker";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { GUIDE_BASE_URL } from "@/lib/deployment";
import { deleteMyPersonaAction, listMyPersonasAction } from "@/lib/actions/personas";
import { resolvePersonaTone, type SavedPersona } from "@/lib/personaTone";
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
  ExternalLink,
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
  const [searchType, setSearchType] = useState<"TOP" | "RECENT">("TOP");

  const [posts, setPosts] = useState<ViralPostItem[]>([]);
  const [threadsStatus, setThreadsStatus] = useState<ThreadsSearchStatus>("no_keyword");
  const [threadsMessage, setThreadsMessage] = useState<string | undefined>();
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [aiPosts, setAiPosts] = useState<ViralPostItem[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [importedPosts, setImportedPosts] = useState<ViralPostItem[]>([]);
  const [importUrl, setImportUrl] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [coupangProducts, setCoupangProducts] = useState<CoupangProduct[] | null>(null);
  const [coupangError, setCoupangError] = useState<string | null>(null);
  const [loadingCoupang, setLoadingCoupang] = useState(false);
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
  const [savedPersonas, setSavedPersonas] = useState<SavedPersona[]>([]);

  useEffect(() => {
    listMyPersonasAction().then((res) => setSavedPersonas(res.personas));
  }, []);

  const handleDeletePersona = async (personaId: string) => {
    const res = await deleteMyPersonaAction(personaId);
    if (res.error) return;
    setSavedPersonas((prev) => prev.filter((p) => p.id !== personaId));
    if (selectedPersonaId === personaId) setSelectedPersonaId("p-01");
  };

  const [generating, setGenerating] = useState(false);
  const [creatingDirectPost, setCreatingDirectPost] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [imageModel, setImageModel] = useState<string>("nanobanana");
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [searchMode, setSearchMode] = useState<"KEYWORD" | "TAG">("KEYWORD");
  const [mediaType, setMediaType] = useState<"" | "TEXT" | "IMAGE" | "VIDEO">("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [threadsUsername, setThreadsUsername] = useState<string | null>(null);
  const [searchAccess, setSearchAccess] = useState<"unknown" | "public" | "own">("unknown");

  const fetchPosts = () => {
    if (activeSubTab === "personas") return;
    setLoading(true);
    startTransition(async () => {
      if (activeSubTab === "saved") {
        const res = await getSavedBookmarksAction();
        setSavedPosts(res.posts);
      } else {
        const keyword = searchQuery.trim() || selectedTag;
        const res = await getViralPostsAction({
          keyword,
          dateRange,
          searchType,
          searchMode,
          mediaType: mediaType || undefined,
          authorUsername: authorFilter.trim() || undefined,
        });
        setPosts(res.posts);
        setThreadsStatus(res.threadsStatus);
        setThreadsMessage(res.threadsMessage);
        setThreadsUsername(res.threadsUsername);
        if (res.threadsStatus === "ok") setSearchAccess("public");
        if (res.threadsStatus === "own_posts_only") setSearchAccess("own");
        if (keyword !== searchedKeyword) {
          setAiPosts([]);
          setAiError(null);
          setCoupangProducts(null);
          setCoupangError(null);
        }
        setSearchedKeyword(keyword === "전체" ? "" : keyword.replace(/^#/, ""));
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedTag, dateRange, searchType, searchMode, mediaType, activeSubTab]);

  const handleGenerateAiExamples = async () => {
    if (!searchedKeyword) return;
    setLoadingAi(true);
    setAiError(null);
    const res = await generateAiExamplePostsAction(searchedKeyword);
    setLoadingAi(false);
    if (res.error) setAiError(res.error);
    setAiPosts(res.posts);
  };

  const handleImportPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportError(null);
    const res = await importViralPostAction({ url: importUrl, content: importContent });
    setImporting(false);
    if (res.error || !res.post) {
      setImportError(res.error ?? "가져오기에 실패했습니다.");
      return;
    }
    const imported = res.post;
    setImportedPosts((prev) => [imported, ...prev.filter((p) => p.id !== imported.id)]);
    setImportUrl("");
    setImportContent("");
  };

  const handleSearchCoupang = async () => {
    if (!searchedKeyword) return;
    setLoadingCoupang(true);
    setCoupangError(null);
    const res = await searchRelatedCoupangProductsAction(searchedKeyword);
    setLoadingCoupang(false);
    if (res.error) setCoupangError(res.error);
    setCoupangProducts(res.products);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  const handleToggleBookmark = async (post: ViralPostItem) => {
    const res = await toggleBookmarkAction(post);
    const applySaved = (list: ViralPostItem[]) =>
      list.map((p) => (p.id === post.id ? { ...p, isSaved: res.isSaved } : p));
    setPosts(applySaved);
    setImportedPosts(applySaved);
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

    const personaDescription = resolvePersonaTone(
      selectedPersonaId,
      customPersonaText,
      savedPersonas,
      "솔직하고 친근한 쇼핑 팁 톤",
    );

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

  const handleCreateDirectPost = async (publishNow: boolean = false) => {
    if (!generatedCaption || !productName.trim()) {
      setGenError("상품 정보를 먼저 선택하거나 입력해주세요.");
      return;
    }
    if (publishNow) {
      setPublishingNow(true);
    } else {
      setCreatingDirectPost(true);
    }
    setGenError(null);
    const res = await createDirectBenchmarkPostAction({
      content: generatedCaption,
      productName: productName.trim(),
      productId: selectedSavedProductId || undefined,
      platform,
      affiliateUrl: affiliateUrl.trim(),
      imageUrl: generatedImageUrl || undefined,
      publishNow,
    });
    setCreatingDirectPost(false);
    setPublishingNow(false);
    if (res.postId) {
      router.push(`/posts/${res.postId}`);
    } else if (res.error) {
      setGenError(res.error);
    }
  };

  const displayList =
    activeSubTab === "saved"
      ? savedPosts
      : [
          ...importedPosts,
          ...posts.filter((p) => p.source === "threads"),
          ...aiPosts,
          ...posts.filter((p) => p.source !== "threads"),
        ];

  const SOURCE_BADGE: Record<ViralPostItem["source"], { label: string; className: string }> = {
    threads: { label: "실제 Threads 글", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    manual: { label: "직접 가져온 글", className: "bg-blue-50 text-blue-700 border-blue-200" },
    ai: { label: "AI 작성 예시", className: "bg-purple-50 text-purple-700 border-purple-200" },
    example: { label: "작성 예시", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  };

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
              Threads 포스팅 생성 시 적용할 페르소나(글쓰기 어조 및 인격)를 미리 확인하고 선택해보세요. 벤치마킹 캡션 생성 시 선택한 AI 엔진(OpenAI / Gemini / Claude)이 이 페르소나의 어조에 맞춰 캡션을 작성합니다.
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

            {savedPersonas.map((persona) => (
              <div
                key={persona.id}
                className="flex flex-col justify-between rounded-xl border border-purple-200 bg-white p-4 shadow-xs transition-all hover:border-purple-400 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      💾 내 저장 페르소나
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePersona(persona.id)}
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900 mb-2">{persona.name}</h4>
                  <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-100 whitespace-pre-line leading-relaxed mb-4">
                    {persona.toneDescription}
                    {persona.sampleWriting && (
                      <span className="mt-1 block text-[11px] text-neutral-500">📝 예시 문장: {persona.sampleWriting}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedPersonaId(persona.id);
                    setActiveSubTab("detector");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-2 text-xs font-bold text-white transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-200" />
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
        <SearchModeGuide threadsUsername={threadsUsername} searchAccess={searchAccess} />
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
                className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-8 py-2 text-xs focus:border-neutral-900 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTag("전체");
                  }}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
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
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "TOP" | "RECENT")}
                className="rounded-lg border border-neutral-300 bg-white p-1 text-xs focus:outline-none"
              >
                <option value="TOP">🔥 인기 글 (Threads 인기순)</option>
                <option value="RECENT">🕒 최신 글</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-600">검색 방식:</span>
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as "KEYWORD" | "TAG")}
                className="rounded-lg border border-neutral-300 bg-white p-1 text-xs focus:outline-none"
              >
                <option value="KEYWORD">🔤 키워드</option>
                <option value="TAG">#️⃣ 해시태그(주제 태그)</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-600">미디어:</span>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as "" | "TEXT" | "IMAGE" | "VIDEO")}
                className="rounded-lg border border-neutral-300 bg-white p-1 text-xs focus:outline-none"
              >
                <option value="">전체</option>
                <option value="TEXT">글만</option>
                <option value="IMAGE">이미지</option>
                <option value="VIDEO">동영상</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-600">작성자:</span>
              <input
                type="text"
                placeholder="@아이디 (선택, 검색 버튼으로 적용)"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                maxLength={31}
                className="w-44 rounded-lg border border-neutral-300 bg-white p-1 text-xs focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-neutral-400">
              다른 사람의 글·작성자 필터는 Meta 앱 검수 승인 회원만 결과가 나옵니다.
            </span>
          </div>
        </div>
      )}

      {activeSubTab === "detector" && (
        <form
          id="import-panel"
          onSubmit={handleImportPost}
          className="scroll-mt-4 space-y-2 rounded-2xl border border-blue-200 bg-blue-50/40 p-4"
        >
          <div>
            <h3 className="text-sm font-bold text-neutral-900">🔗 떡상글 직접 가져오기</h3>
            <p className="text-[11px] text-neutral-600">
              Threads에서 발견한 인기 글의 링크와 본문을 붙여넣으면 내 보관함에 저장되고, 바로 벤치마킹 캡션을 만들 수 있습니다.
              링크는 Meta 공식 방식으로 공개 게시글인지 확인합니다.
            </p>
          </div>
          <input
            type="url"
            placeholder="게시글 링크 (선택) 예: https://www.threads.com/@아이디/post/코드"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs focus:border-neutral-900 focus:outline-none"
          />
          <textarea
            placeholder="떡상글 본문을 그대로 붙여넣어 주세요 (필수, 10~2,000자)"
            value={importContent}
            onChange={(e) => setImportContent(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs focus:border-neutral-900 focus:outline-none"
          />
          {importError && <p className="text-xs font-semibold text-red-600">{importError}</p>}
          <button
            type="submit"
            disabled={importing || importContent.trim().length < 10}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? "확인 및 저장 중..." : "가져와서 보관함에 저장"}
          </button>
        </form>
      )}

      {activeSubTab === "detector" && !(loading || isPending) && (
        <ThreadsStatusNotice status={threadsStatus} message={threadsMessage} keyword={searchedKeyword} />
      )}

      {activeSubTab === "detector" && searchedKeyword && !(loading || isPending) && (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-700">&ldquo;{searchedKeyword}&rdquo; 추가 자료:</span>
            <button
              type="button"
              onClick={handleGenerateAiExamples}
              disabled={loadingAi}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingAi ? "AI 예시 작성 중..." : "🤖 AI 예시 글 3개 만들기"}
            </button>
            <button
              type="button"
              onClick={handleSearchCoupang}
              disabled={loadingCoupang}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loadingCoupang ? "쿠팡 검색 중..." : "🛒 관련 쿠팡 상품 보기"}
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            AI 예시는 본인 OpenAI 키로 1회 호출되며 비용이 발생합니다. 쿠팡 상품 검색은 쿠팡파트너스 정책상 시간당 호출 횟수가 제한됩니다.
          </p>
          {aiError && <p className="text-xs font-semibold text-red-600">{aiError}</p>}
          {coupangError && <p className="text-xs font-semibold text-red-600">{coupangError}</p>}
          {coupangProducts && coupangProducts.length === 0 && !coupangError && (
            <p className="text-xs text-neutral-500">쿠팡에서 &ldquo;{searchedKeyword}&rdquo; 관련 상품을 찾지 못했습니다.</p>
          )}
          {coupangProducts && coupangProducts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {coupangProducts.map((p) => (
                <a
                  key={p.productId}
                  href={p.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 p-2 hover:border-neutral-400"
                >
                  {p.productImage && (
                    <img
                      src={p.productImage}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-neutral-900">{p.productName}</p>
                    <p className="text-[11px] text-neutral-500">
                      {p.productPrice ? `${p.productPrice.toLocaleString()}원` : "가격 정보 없음"}
                      {p.isRocket ? " · 로켓배송" : ""}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab !== "personas" && (
        loading || isPending ? (
          <div className="py-12 text-center text-sm text-neutral-500">
            🔥 Threads에서 관련 글을 검색하는 중입니다...
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center text-sm text-neutral-500 rounded-xl border border-dashed border-neutral-200 bg-white">
            <p>
              {activeSubTab === "saved"
                ? "보관함에 찜한 포스팅이 없습니다. 탐지기에서 찜하기를 눌러보세요!"
                : `검색어 "${searchQuery || selectedTag}"에 해당하는 글이 없습니다.`}
            </p>
            {activeSubTab !== "saved" && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag("전체");
                  setDateRange("all");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700 transition-colors"
              >
                🔄 검색 필터 초기화 (전체 보기)
              </button>
            )}
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
                        <p className="text-[10px] text-neutral-400">{post.postedAtLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${SOURCE_BADGE[post.source].className}`}
                      >
                        {SOURCE_BADGE[post.source].label}
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

                  {post.media && <MediaPreviewStrip media={post.media} />}

                  {post.permalink && (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Threads에서 원문·반응 보기
                    </a>
                  )}
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

              {/* 3대 Provider 선택 카드 (GPT / Claude / Gemini) */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* 1. GPT */}
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider("openai");
                    setAiModel(DEFAULT_AI_MODELS["openai"]);
                  }}
                  className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    aiProvider === "openai"
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-sm">🤖</span>
                  <span className="font-extrabold text-sm tracking-tight">GPT</span>
                  <span className="text-[10px] opacity-75 font-normal">OpenAI</span>
                </button>

                {/* 2. Claude */}
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider("anthropic");
                    setAiModel(DEFAULT_AI_MODELS["anthropic"]);
                  }}
                  className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    aiProvider === "anthropic"
                      ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-sm">🧠</span>
                  <span className="font-extrabold text-sm tracking-tight">Claude</span>
                  <span className="text-[10px] opacity-75 font-normal">Anthropic</span>
                </button>

                {/* 3. Gemini */}
                <button
                  type="button"
                  onClick={() => {
                    setAiProvider("gemini");
                    setAiModel(DEFAULT_AI_MODELS["gemini"]);
                  }}
                  className={`rounded-xl p-2.5 border font-bold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    aiProvider === "gemini"
                      ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="text-sm">✨</span>
                  <span className="font-extrabold text-sm tracking-tight">Gemini</span>
                  <span className="text-[10px] opacity-75 font-normal">Google</span>
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
              <label className="block text-xs font-bold text-neutral-700">글쓰기 페르소나 선택 *</label>
              <PersonaPicker
                value={selectedPersonaId}
                onChange={setSelectedPersonaId}
                customText={customPersonaText}
                onCustomTextChange={setCustomPersonaText}
                savedPersonas={savedPersonas}
                onPersonaSaved={(p) => setSavedPersonas((prev) => [...prev, p])}
              />
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
                  <option value="nanobanana">🍌 1K 표준 경량 모델</option>
                  <option value="nanobanana-2-2k">🍌 NanoBanana 2-2K (2K 고화질 비주얼)</option>
                  <option value="nanobanana-pro">🍌 NanoBanana Pro (프로페셔널 인포그래픽)</option>
                  <option value="nanobanana-2-4k">🍌 NanoBanana 2-4K (4K 울트라 HD)</option>
                  <option value="none">🚫 이미지 생성 안 함 (텍스트 캡션만 생성)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateCaption}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 p-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
              >
                {generating ? (
                  <span>선택된 페르소나로 {PROVIDER_SHORT_LABELS[aiProvider]} 캡션{imageModel !== "none" ? " 및 나노바나나 이미지" : ""} 생성 중...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-400 fill-amber-300" />
                    <span>AI 쓰레드 캡션 생성하기</span>
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateDirectPost(false)}
                      disabled={creatingDirectPost || publishingNow}
                      className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 p-3 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                    >
                      {creatingDirectPost ? (
                        <span>저장 중...</span>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4" />
                          <span>게시글 보러가기</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateDirectPost(true)}
                      disabled={creatingDirectPost || publishingNow}
                      className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 p-3 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                    >
                      {publishingNow ? (
                        <span>Threads 포스팅 중...</span>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                          <span>게시물 포스팅하기</span>
                        </>
                      )}
                    </button>
                  </div>

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

// Images/videos of a searched Threads post, for reference only. The URLs are Meta CDN links that
// expire, so broken ones are hidden and nothing here is stored or reposted.
function MediaPreviewStrip({ media }: { media: ViralPostMedia[] }) {
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const visible = media.map((m, i) => ({ m, i })).filter(({ i }) => !broken.has(i));
  if (visible.length === 0) return null;

  const shown = visible.slice(0, 4);
  const hiddenCount = visible.length - shown.length;

  return (
    <div className="mb-3 space-y-1">
      <div className="flex gap-1.5">
        {shown.map(({ m, i }, idx) => (
          <a
            key={i}
            href={m.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={m.type === "VIDEO" ? "영상 원본 열기" : "이미지 원본 열기"}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.previewUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBroken((prev) => new Set(prev).add(i))}
              className="h-full w-full object-cover"
            />
            {m.type === "VIDEO" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-lg text-white">▶</span>
            )}
            {idx === shown.length - 1 && hiddenCount > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                +{hiddenCount}
              </span>
            )}
          </a>
        ))}
      </div>
      <p className="text-[10px] text-neutral-400">
        참고용 미리보기입니다. 다른 사람의 사진·영상은 저작권이 있어 내 게시글에 그대로 쓰면 안 됩니다. (링크는 일정 시간이 지나면 열리지 않을 수 있어요)
      </p>
    </div>
  );
}

const THREADS_GUIDE_ID = "343996d3-8c77-455d-9bd4-54bcd47a34cd";
const APP_REVIEW_GUIDE_ID = "ae85d991-d907-4349-809e-818a6b3a2f54";

function SearchModeGuide({
  threadsUsername,
  searchAccess,
}: {
  threadsUsername: string | null;
  searchAccess: "unknown" | "public" | "own";
}) {
  const accessLabel =
    searchAccess === "public"
      ? { text: "✅ 다른 사람의 공개 글 검색 가능", className: "bg-emerald-100 text-emerald-800" }
      : searchAccess === "own"
        ? { text: "⏳ 본인 글만 검색됨 (앱 검수 승인 전)", className: "bg-amber-100 text-amber-800" }
        : { text: "검색어로 한 번 검색하면 확인됩니다", className: "bg-neutral-100 text-neutral-600" };

  return (
    <div className="rounded-2xl border-2 border-neutral-900 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-neutral-900">📌 떡상글 찾는 방법 — 내 상황에 맞는 방식을 쓰세요</h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-700">
            Threads 연결: {threadsUsername ? `@${threadsUsername}` : "연결 안 됨"}
          </span>
          <span className={`rounded-full px-2.5 py-1 ${accessLabel.className}`}>{accessLabel.text}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 space-y-2">
          <p className="text-xs font-black text-emerald-900">A. Meta 앱 검수 승인 회원 — 다른 사람의 공개 글 검색</p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-emerald-900">
            <li>
              본인 Meta 앱에서 <b>threads_keyword_search</b> 권한의 <b>고급 액세스</b>를 승인받습니다
              (비즈니스 인증 · 테크 제공업체 등록 · 앱 검수 필요).
            </li>
            <li>아래 버튼으로 <b>검색 권한을 포함해서</b> Threads 계정을 연결합니다.</li>
            <li>
              키워드·해시태그로 검색하면 다른 사용자의 공개 글이 <b>&ldquo;실제 Threads 글&rdquo;</b> 카드로 나옵니다.
              작성자·미디어 필터도 쓸 수 있습니다.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-1">
            <form action={connectThreadsAccountWithKeywordSearchAction}>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
              >
                🔑 검색 권한 포함해서 Threads 연결
              </button>
            </form>
            {GUIDE_BASE_URL && (
              <a
                href={`${GUIDE_BASE_URL}/guides/${THREADS_GUIDE_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-400 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
              >
                📖 연동 매뉴얼 보기
              </a>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-blue-300 bg-blue-50/70 p-3.5 space-y-2">
          <p className="text-xs font-black text-blue-900">B. 앱 검수 승인 전 회원 — 떡상글 직접 가져오기</p>
          <p className="text-[11px] leading-relaxed text-blue-900">
            승인 전에는 Meta 정책상 검색 결과가 <b>본인 계정 글만</b> 나옵니다. 대신 이렇게 쓰세요.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-blue-900">
            <li>Threads 앱에서 반응 좋은 인기 글을 찾습니다.</li>
            <li>그 글의 <b>링크</b>와 <b>본문</b>을 복사합니다.</li>
            <li>
              아래 <b>&ldquo;🔗 떡상글 직접 가져오기&rdquo;</b>에 붙여넣으면 보관함에 저장되고, 바로 AI 벤치마킹 캡션을 만들 수 있습니다.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => document.getElementById("import-panel")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
            >
              🔗 떡상글 직접 가져오기로 이동
            </button>
          </div>
          {GUIDE_BASE_URL && (
            <div className="rounded-lg border border-blue-200 bg-white p-2.5 space-y-1.5">
              <p className="text-[11px] leading-relaxed text-blue-900">
                💼 사업자가 있다면 <b>Meta 비즈니스 앱 승인</b>을 받아 A 방식(다른 사람의 공개 글 검색)으로 바꿀 수 있습니다.
                준비물부터 제출·승인 후까지 단계별로 정리한 매뉴얼을 확인하세요.
              </p>
              <GuideLinkButton guideId={APP_REVIEW_GUIDE_ID} label="비즈니스 앱 승인 절차 매뉴얼 (공개 글 검색 권한 받기)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const APPROVAL_NOTE =
  "Meta 정책상 본인 Meta 앱의 threads_keyword_search 권한이 앱 심사로 승인되기 전에는 본인 계정 글만 검색됩니다.";

function ThreadsStatusNotice({
  status,
  message,
  keyword,
}: {
  status: ThreadsSearchStatus;
  message?: string;
  keyword: string;
}) {
  if (status === "ok") return null;

  const box = "rounded-xl border p-3 text-xs leading-relaxed";

  if (status === "no_keyword") {
    return (
      <div className={`${box} border-neutral-200 bg-neutral-50 text-neutral-600`}>
        검색어를 입력하거나 브랜드를 선택하면 Threads 공식 검색으로 실제 글을 찾아옵니다. 지금 보이는 글은 작성 예시입니다.
      </div>
    );
  }

  if (status === "not_connected") {
    return (
      <div className={`${box} border-amber-200 bg-amber-50 text-amber-900`}>
        Threads 계정이 연결되지 않아 실제 글을 검색할 수 없습니다.{" "}
        <Link href="/settings" className="font-bold underline">
          API키등록·플랫폼연동
        </Link>
        에서 계정을 먼저 연결해주세요.
      </div>
    );
  }

  if (status === "permission_missing") {
    return (
      <div className={`${box} border-amber-200 bg-amber-50 text-amber-900 space-y-2`}>
        <p className="font-bold">Threads 키워드 검색 권한이 없어 실제 글을 가져오지 못했습니다.</p>
        <p>
          1) Meta 개발자 센터의 내 앱 → Threads API 사용 사례에서 <b>threads_keyword_search</b> 권한을 추가하고,
          2) 아래 버튼으로 검색 권한을 포함해 계정을 다시 연결해주세요. {APPROVAL_NOTE}
        </p>
        {message && <p className="text-[11px] text-amber-700">Meta 응답: {message}</p>}
        <form action={connectThreadsAccountWithKeywordSearchAction}>
          <button
            type="submit"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            🔑 검색 권한 포함해서 Threads 다시 연결
          </button>
        </form>
      </div>
    );
  }

  if (status === "own_posts_only") {
    return (
      <div className={`${box} border-blue-200 bg-blue-50 text-blue-900`}>
        현재 &ldquo;{keyword}&rdquo; 검색 결과가 본인 계정 글로만 나오고 있습니다. {APPROVAL_NOTE} 승인 후에는 다른 사용자의 공개 글도 검색됩니다.
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className={`${box} border-neutral-200 bg-neutral-50 text-neutral-700`}>
        Threads에서 &ldquo;{keyword}&rdquo; 관련 글을 찾지 못했습니다. 다른 검색어나 기간을 바꿔보세요. {APPROVAL_NOTE}
      </div>
    );
  }

  return (
    <div className={`${box} border-red-200 bg-red-50 text-red-800`}>
      Threads 검색 중 오류가 발생했습니다{message ? `: ${message}` : "."}
    </div>
  );
}
