"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Zap,
  TrendingUp,
  Newspaper,
  BookOpen,
  Compass,
  Flame,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { AppSettings } from "@/lib/storage";
import { askLlmJson } from "@/lib/blog/askJson";
import { missingKeyMessage } from "@/lib/blog/models";

interface KeywordFighterSectionProps {
  settings: AppSettings;
  onSelectTopic: (topic: string, promptHint?: string) => void;
  onOpenSettings: () => void;
}

type FighterTab =
  | "competition"
  | "autocomplete"
  | "related"
  | "news"
  | "topblogs"
  | "angles"
  | "todaystrategy";

export function KeywordFighterSection({
  settings,
  onSelectTopic,
  onOpenSettings,
}: KeywordFighterSectionProps) {
  const [activeTab, setActiveTab] = useState<FighterTab>("competition");

  // Common keyword inputs
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Tab 1: Competition State
  const [competitionResult, setCompetitionResult] = useState<{
    intent: string;
    paaQuestions: string[];
    contentGaps: string[];
    suggestedTitles: string[];
  } | null>(null);

  // Tab 2: Autocomplete State
  const [portalSource, setPortalSource] = useState<"naver" | "google">("naver");
  const [autocompleteList, setAutocompleteList] = useState<string[]>([]);

  // Tab 3: AI Related Keywords State
  const [relatedResult, setRelatedResult] = useState<{
    difficulty: "낮음 (추천)" | "보통" | "높음 (경쟁 치열)";
    targetAudience: string;
    longtailKeywords: string[];
    bestTitles: string[];
  } | null>(null);

  // Tab 4: Realtime News State
  const [newsQuery, setNewsQuery] = useState("부동산 정책");
  const [newsArticles, setNewsArticles] = useState<
    { title: string; link: string; pubDate: string; source: string }[]
  >([]);

  // Tab 5: Top Blogs Analysis State
  const [topBlogQuery, setTopBlogQuery] = useState("");
  const [topBlogResult, setTopBlogResult] = useState<{
    avgWordCount: number;
    avgImageCount: number;
    keyThemes: string[];
    strategy: string;
    suggestedTitle: string;
  } | null>(null);

  // Tab 6: 4 Angles State
  const [angleQuery, setAngleQuery] = useState("");
  const [anglesResult, setAnglesResult] = useState<{
    beginner: { angle: string; title: string; desc: string };
    practical: { angle: string; title: string; desc: string };
    cost: { angle: string; title: string; desc: string };
    future: { angle: string; title: string; desc: string };
  } | null>(null);

  // Tab 7: Today's Strategy Keywords (10 Cards)
  const [strategyCards, setStrategyCards] = useState<
    {
      title: string;
      desc: string;
      headline: string;
      thumbnailCopy: string;
      angleTip: string;
    }[]
  >([]);

  // Tab 1: 키워드 경쟁력 분석 실행 (SERP & PAA)
  const handleAnalyzeCompetition = async () => {
    const keyMissing = missingKeyMessage("text", settings);
    if (keyMissing) {
      setErrorMsg(keyMissing);
      onOpenSettings();
      return;
    }
    if (!keyword.trim()) {
      setErrorMsg("분석할 키워드를 입력해주세요 (예: 여름 휴가, 신용대출 등).");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setCompetitionResult(null);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 Google SERP 및 네이버 상위노출 알고리즘 수석 분석가입니다.
현재 연도는 ${currentYear}년입니다.
키워드: "${keyword.trim()}"에 대해 Google SERP, PAA(People Also Ask), 콘텐츠 갭 분석을 정밀 수행하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "intent": "검색 사용자의 주요 검색 의도 (정보형 / 상업형 / 비교형 / 탐색형)",
  "paaQuestions": [
    "사람들이 함께 가장 많이 검색하는 핵심 질문 1",
    "사람들이 함께 가장 많이 검색하는 핵심 질문 2",
    "사람들이 함께 가장 많이 검색하는 핵심 질문 3",
    "사람들이 함께 가장 많이 검색하는 핵심 질문 4"
  ],
  "contentGaps": [
    "상위 노출 글들이 놓치고 있는 차별화 공략 포인트 1",
    "상위 노출 글들이 놓치고 있는 차별화 공략 포인트 2",
    "상위 노출 글들이 놓치고 있는 차별화 공략 포인트 3"
  ],
  "suggestedTitles": [
    "${currentYear}년 최신 상위노출 공략 포스트 제목 1",
    "${currentYear}년 최신 상위노출 공략 포스트 제목 2",
    "${currentYear}년 최신 상위노출 공략 포스트 제목 3"
  ]
}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await askLlmJson<any>(settings, prompt, "object", 0.7);
      setCompetitionResult(parsed);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "경쟁력 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Tab 2: 자동완성 키워드 조회 (Naver / Google 다이렉트)
  const handleFetchAutocomplete = async () => {
    if (!keyword.trim()) {
      setErrorMsg("조회할 검색 키워드를 입력해주세요 (예: 캠핑, 재택근무 등).");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setAutocompleteList([]);

    try {
      const res = await fetch(
        `/api/keywords/autocomplete?query=${encodeURIComponent(
          keyword.trim()
        )}&source=${portalSource}`
      );
      if (!res.ok) throw new Error("자동완성 조회에 실패했습니다.");
      const data = await res.json();
      setAutocompleteList(data.keywords || []);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "자동완성 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Tab 3: AI 연관검색어 분석
  const handleAnalyzeRelated = async () => {
    const keyMissing = missingKeyMessage("text", settings);
    if (keyMissing) {
      setErrorMsg(keyMissing);
      onOpenSettings();
      return;
    }
    if (!keyword.trim()) {
      setErrorMsg("분석할 키워드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setRelatedResult(null);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 네이버 키워드 난이도 및 롱테일 확장 전문가입니다.
현재 연도는 ${currentYear}년입니다.
키워드: "${keyword.trim()}"에 대해 상위 노출 난이도, 유입 타겟층, 6가지 롱테일 키워드와 최적 제목을 분석하세요.

반드시 아래 JSON 형식으로 응답하세요:
{
  "difficulty": "낮음 (추천)",
  "targetAudience": "주요 타겟 독자 설명 (예: 2030 직장인 및 부업 준비자)",
  "longtailKeywords": ["롱테일1", "롱테일2", "롱테일3", "롱테일4", "롱테일5", "롱테일6"],
  "bestTitles": [
    "상위노출 최적화 추천 제목 1",
    "상위노출 최적화 추천 제목 2",
    "상위노출 최적화 추천 제목 3"
  ]
}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await askLlmJson<any>(settings, prompt, "object", 0.7);
      setRelatedResult(parsed);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "연관검색어 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Tab 4: 실시간 뉴스 수집
  const handleFetchNews = async () => {
    if (!newsQuery.trim()) {
      setErrorMsg("검색할 뉴스 키워드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setNewsArticles([]);

    try {
      const res = await fetch(`/api/keywords/news?query=${encodeURIComponent(newsQuery.trim())}`);
      if (!res.ok) throw new Error("뉴스 수집에 실패했습니다.");
      const data = await res.json();
      setNewsArticles(data.articles || []);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "뉴스 수집 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Tab 5: 상위 블로그 분석
  const handleAnalyzeTopBlogs = async () => {
    const keyMissing = missingKeyMessage("text", settings);
    if (keyMissing) {
      setErrorMsg(keyMissing);
      onOpenSettings();
      return;
    }
    if (!topBlogQuery.trim()) {
      setErrorMsg("분석할 키워드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setTopBlogResult(null);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 네이버 상위 1~5위 블로그 구조 분석관입니다.
현재 연도는 ${currentYear}년입니다.
키워드: "${topBlogQuery.trim()}"로 네이버 상위에 랭크되는 상위 블로그 글들의 구조 패턴, 평균 글자수, 이미지수, 핵심 공략 포인트를 분석하세요.

반드시 아래 JSON 형식으로 응답:
{
  "avgWordCount": 2400,
  "avgImageCount": 12,
  "keyThemes": ["핵심소제목패턴1", "비교표활용", "실제경험강조", "체크리스트포함"],
  "strategy": "상위 1~5위 경쟁글을 추월하여 1위에 오르기 위한 구체적 차별화 전략 (2~3문장)",
  "suggestedTitle": "${currentYear}년 기준 상위 1위 탈환형 완벽 가이드 제목"
}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await askLlmJson<any>(settings, prompt, "object", 0.7);
      setTopBlogResult(parsed);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "상위 블로그 분석 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // Tab 6: 다각도 블로그 주제 발굴 (4가지 관점)
  const handleAnalyzeAngles = async () => {
    const keyMissing = missingKeyMessage("text", settings);
    if (keyMissing) {
      setErrorMsg(keyMissing);
      onOpenSettings();
      return;
    }
    if (!angleQuery.trim()) {
      setErrorMsg("확장할 키워드를 입력해주세요 (예: 인공지능, 전기차 등).");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setAnglesResult(null);

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 콘텐츠 기획 전문가입니다.
현재 연도는 ${currentYear}년입니다.
키워드: "${angleQuery.trim()}"를 4가지 전혀 다른 관점으로 확장하여 각각 매력적인 포스트 제목과 기획안을 도출하세요.

반드시 아래 JSON 형식으로 응답:
{
  "beginner": {
    "angle": "초보자/입문 관점",
    "title": "초보자를 위한 완벽 가이드 제목",
    "desc": "기초 개념부터 시작법까지 알기 쉽게 설명하는 기획"
  },
  "practical": {
    "angle": "실전 활용/비교 관점",
    "title": "실전 활용 및 생산성 극대화 비교 제목",
    "desc": "실제 실무에서 써먹는 실전 꿀팁과 툴 비교"
  },
  "cost": {
    "angle": "비용/가성비 관점",
    "title": "비용 절약 및 가성비 극대화 가이드 제목",
    "desc": "무료 vs 유료 비교, 할인 팁 및 비용 최적화"
  },
  "future": {
    "angle": "미래/트렌드 관점",
    "title": "${currentYear}년 최신 트렌드 및 향후 전망 제목",
    "desc": "최신 기술 동향과 놓치지 말아야 할 변화 전망"
  }
}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await askLlmJson<any>(settings, prompt, "object", 0.7);
      setAnglesResult(parsed);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "다각도 분석 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // Tab 7: 오늘의 전략 키워드 10선
  const handleFetchTodayStrategy = async () => {
    const keyMissing = missingKeyMessage("text", settings);
    if (keyMissing) {
      setErrorMsg(keyMissing);
      onOpenSettings();
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const currentYear = new Date().getFullYear();
    const prompt = `당신은 대한민국 실시간 이슈 및 트렌드 데이터 분석가입니다.
현재 연도는 반드시 ${currentYear}년입니다.
오늘 실시간으로 검색량이 폭발하거나 독자의 클릭률이 가장 높은 '2026년 오늘의 전략 키워드' 10가지를 발굴하세요.

반드시 아래 JSON 형식의 10개 객체 배열로만 응답하세요:
[
  {
    "title": "이슈 키워드 명 (예: 2026 AI 개인정보 주권 보상제 시행)",
    "desc": "이슈 배경 설명 (1~2문장)",
    "headline": "클릭률을 극대화하는 매력적인 블로그 제목",
    "thumbnailCopy": "썸네일에 넣을 한 줄 카피 (예: 클릭 한 번에 현금 보상!)",
    "angleTip": "포스트 작성 시 강조해야 할 체류시간 극대화 공략 팁"
  }
]`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await askLlmJson<any>(settings, prompt, "array", 0.8);
      setStrategyCards(parsed);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "전략 키워드 발굴 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // Initialize Strategy Cards on first open of Tab 7 if empty
  useEffect(() => {
    if (activeTab === "todaystrategy" && strategyCards.length === 0 && !missingKeyMessage("text", settings)) {
      handleFetchTodayStrategy();
    }
  }, [activeTab]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("competition")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "competition"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>키워드 경쟁력 분석</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("autocomplete")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "autocomplete"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span>자동완성 키워드 분석</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("related")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "related"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI 연관검색어 분석</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("news");
            if (newsArticles.length === 0) handleFetchNews();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "news"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>실시간 최신 뉴스</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("topblogs")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "topblogs"
              ? "bg-emerald-700 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>상위 블로그/글 분석</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("angles")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "angles"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>다각도 블로그 주제 발굴</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("todaystrategy")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shrink-0 ${
            activeTab === "todaystrategy"
              ? "bg-rose-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>오늘의 전략 키워드</span>
        </button>
      </div>

      {/* Tab 1: 키워드 경쟁력 분석 */}
      {activeTab === "competition" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              💡 Google SERP & PAA 분석 및 콘텐츠 갭 전략
            </span>
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setCompetitionResult(null);
              }}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeCompetition()}
              placeholder="예: 여름 휴가"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              type="button"
              onClick={handleAnalyzeCompetition}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>키워드 검색</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Google SERP를 분석하고 콘텐츠 전략을 수립할 기준 키워드를 입력해주세요.
          </p>

          {competitionResult && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                <span className="font-bold text-indigo-900">검색 의도 분석: </span>
                <span className="text-indigo-800">{competitionResult.intent}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PAA Questions */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    PAA (사람들이 함께 묻는 질문)
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {competitionResult.paaQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Content Gaps */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    콘텐츠 갭 (차별화 공략 포인트)
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {competitionResult.contentGaps.map((gap, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Titles */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800">
                  추천 공략 포스트 제목 (클릭 시 하단 포스트 생성란에 자동 주입)
                </h5>
                <div className="space-y-2">
                  {competitionResult.suggestedTitles.map((st, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectTopic(st, `콘텐츠 갭 공략: ${keyword}`)}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer transition flex items-center justify-between group"
                    >
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {st}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 자동완성 키워드 분석 */}
      {activeTab === "autocomplete" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              💡 Google/Naver 자동완성 키워드 조회 및 주제 생성
            </span>
          </div>

          <div className="grid grid-cols-2 max-w-xs gap-2">
            <button
              type="button"
              onClick={() => setPortalSource("naver")}
              className={`py-2 text-xs font-bold rounded-lg border transition ${
                portalSource === "naver"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Naver
            </button>
            <button
              type="button"
              onClick={() => setPortalSource("google")}
              className={`py-2 text-xs font-bold rounded-lg border transition ${
                portalSource === "google"
                  ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Google
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchAutocomplete()}
              placeholder="예: 캠핑"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              type="button"
              onClick={handleFetchAutocomplete}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>키워드 검색</span>
            </button>
          </div>

          {autocompleteList.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800">
                실시간 자동완성 검색어 ({autocompleteList.length}건)
              </span>
              <div className="flex flex-wrap gap-2">
                {autocompleteList.map((ak, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectTopic(`${ak} 총정리 및 실전 가이드`)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-400 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 hover:text-indigo-600 transition flex items-center gap-1.5"
                  >
                    <span>{ak}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AI 연관검색어 분석 */}
      {activeTab === "related" && (
        <div className="space-y-4">
          <span className="text-xs text-slate-600 font-medium block">
            💡 AI 기반 키워드 성공 가능성 및 전략 분석
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeRelated()}
              placeholder="예: 재택근무"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              type="button"
              onClick={handleAnalyzeRelated}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>키워드 검색</span>
            </button>
          </div>

          {relatedResult && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500">상위 노출 난이도:</span>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {relatedResult.difficulty}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500">유입 타겟층:</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {relatedResult.targetAudience}
                  </div>
                </div>
              </div>

              {/* Longtail keywords */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800">
                  연관 롱테일 확장 키워드 6종
                </span>
                <div className="flex flex-wrap gap-2">
                  {relatedResult.longtailKeywords.map((lk, idx) => (
                    <span
                      key={idx}
                      onClick={() => onSelectTopic(`${lk} 완벽 분석 및 후기`)}
                      className="px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition"
                    >
                      #{lk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Best titles */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800">
                  추천 포스트 제목 (클릭 시 자동 주입)
                </span>
                <div className="space-y-2">
                  {relatedResult.bestTitles.map((bt, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectTopic(bt)}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer transition flex items-center justify-between group"
                    >
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {bt}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: 실시간 최신 뉴스 */}
      {activeTab === "news" && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-emerald-950">
                실시간 언론사 뉴스 피드 (Google News & AI 실시간 그라운딩)
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-600 text-white rounded-md">
                별도 API 키 없이 100% 무료 직접 수집
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              국내 주요 언론사(조선, 연합, 중앙, 동아, 매경, 한경 등)의 실시간 최신 뉴스 피드를 별도 유료 API 없이 실시간 직접 수집하여 보도 기사 기반 AI 트렌드 콘텐츠 전략을 즉시 수립합니다.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newsQuery}
              onChange={(e) => setNewsQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchNews()}
              placeholder="예: 부동산 정책 (실시간 뉴스 수집)"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              type="button"
              onClick={handleFetchNews}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>키워드 검색</span>
            </button>
          </div>

          <div className="text-[11px] text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>실시간 다이렉트 수집기 활성화 - 별도 API 키 없이 실시간 블로그 본문 및 최신 뉴스를 100% 무료로 즉시 수집합니다.</span>
          </div>

          {/* News articles list */}
          {newsArticles.length > 0 && (
            <div className="pt-2 space-y-3">
              <span className="text-xs font-bold text-slate-800">
                수집된 실시간 보도 뉴스 ({newsArticles.length}건)
              </span>
              <div className="space-y-2.5">
                {newsArticles.map((art, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-md">
                          {art.source}
                        </span>
                        <a
                          href={art.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1"
                        >
                          {art.title}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                      <span className="text-[10px] text-slate-400">{art.pubDate}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onSelectTopic(
                          `[속보/이슈 분석] ${art.title} 핵심 요약 및 전망`,
                          `출처: ${art.source} (${art.pubDate})`
                        )
                      }
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shrink-0 flex items-center gap-1"
                    >
                      <span>이 기사로 포스트 기획</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: 상위 블로그/글 분석 */}
      {activeTab === "topblogs" && (
        <div className="space-y-4">
          <span className="text-xs text-slate-600 font-medium block">
            💡 네이버 상위 1~5위 블로그 본문 다이렉트 수집 및 구조 분석
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              value={topBlogQuery}
              onChange={(e) => setTopBlogQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeTopBlogs()}
              placeholder="예: 2026 연말정산 환급금 조회"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              type="button"
              onClick={handleAnalyzeTopBlogs}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>분석하기</span>
            </button>
          </div>

          {topBlogResult && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500">평균 글자 수:</span>
                  <div className="text-base font-black text-indigo-600 mt-0.5">
                    약 {topBlogResult.avgWordCount.toLocaleString()}자
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500">평균 이미지 수:</span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    약 {topBlogResult.avgImageCount}장
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-slate-800">
                  상위 1위 탈환을 위한 초월 포스팅 전략:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {topBlogResult.strategy}
                </p>
              </div>

              <div
                onClick={() => onSelectTopic(topBlogResult.suggestedTitle, topBlogResult.strategy)}
                className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl hover:bg-indigo-100/50 cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <span className="text-[10px] font-bold text-indigo-600">추천 완성형 제목:</span>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                    {topBlogResult.suggestedTitle}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: 다각도 블로그 주제 발굴 */}
      {activeTab === "angles" && (
        <div className="space-y-4">
          <span className="text-xs text-slate-600 font-medium block">
            💡 하나의 키워드를 4가지 다른 관점으로 확장
          </span>

          <div className="flex gap-2">
            <input
              type="text"
              value={angleQuery}
              onChange={(e) => setAngleQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeAngles()}
              placeholder="예: 인공지능"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <button
              type="button"
              onClick={handleAnalyzeAngles}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>키워드 검색</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            하나의 키워드를 다양한 관점으로 확장할 '다각도 블로그 주제'를 발굴할 키워드를 입력해주세요.
          </p>

          {anglesResult && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                anglesResult.beginner,
                anglesResult.practical,
                anglesResult.cost,
                anglesResult.future,
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectTopic(item.title, item.desc)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-400 cursor-pointer transition space-y-1.5 flex flex-col justify-between group"
                >
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                      {item.angle}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition mt-2">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-slate-600 mt-1">{item.desc}</p>
                  </div>
                  <div className="pt-2 text-right">
                    <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center justify-end gap-1">
                      이 주제로 글쓰기 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: 오늘의 전략 키워드 (10선) */}
      {activeTab === "todaystrategy" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              💡 AI가 실시간으로 발굴한 최신 이슈 키워드를 추천합니다
            </span>
            <button
              type="button"
              onClick={handleFetchTodayStrategy}
              disabled={loading}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              새로고침
            </button>
          </div>

          {strategyCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {strategyCards.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectTopic(card.headline, card.desc)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-rose-50/40 hover:border-rose-400 cursor-pointer transition space-y-2 flex flex-col justify-between group shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 group-hover:text-rose-600 transition">
                        {card.title}
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-md">
                        HOT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{card.desc}</p>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="text-xs font-bold text-slate-900">{card.headline}</div>
                      <div className="text-[10px] text-rose-600 font-semibold">
                        썸네일: {card.thumbnailCopy}
                      </div>
                      <div className="text-[10px] text-slate-500">{card.angleTip}</div>
                    </div>
                  </div>
                  <div className="text-right pt-1">
                    <span className="text-[11px] font-bold text-rose-600 group-hover:underline flex items-center justify-end gap-1">
                      원클릭 주제 주입 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <button
                type="button"
                onClick={handleFetchTodayStrategy}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition"
              >
                {loading ? "전략 키워드 발굴 중..." : "오늘의 전략 키워드 10선 불러오기"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
