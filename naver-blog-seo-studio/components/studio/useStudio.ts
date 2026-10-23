"use client";

// StudioPage의 상태·처리 함수를 그대로 옮긴 훅 (2026-10-17 파일 나누기, 로직 변경 없음)
import { useEffect, useState, useRef } from "react";
import { useCategories } from "@/components/categories/useCategories";
import { DEFAULT_SEO_PERSONA_ID, SEO_PERSONAS } from "@/lib/ai/personas";
import { DEFAULT_GEMINI_IMAGE_MODEL, type GeminiImageModel } from "@/lib/ai/geminiModels";
import { DEFAULT_OPENAI_CONTENT_MODEL } from "@/lib/ai/openaiModels";
import { CONTENT_MODEL_OPTIONS, getContentModels, type ContentProvider } from "@/lib/ai/contentModels";
import { parseSavedModel, SAVED_MODEL_KEY } from "@/lib/savedModel";
import { placeNodeBlock, reflowBlocks, removeNodeBlock, splitParagraphBlocks, upsertNode } from "@/lib/imageNodes";
import { handoffIdFromHash, titleSeed, type KeywordEvidence } from "@/lib/keywordEvidence";

// v2.00: 편집기 글 블록은 문단 하나씩(예전에 여러 문단을 묶어 저장한 원고도 열 때 나눔)
function blocksOfDraft(draft: DraftRecord) {
  const stored = getContentBlocks(draft);
  return splitParagraphBlocks(stored.length ? stored : createContentBlocks(draft));
}
import { strategies, type ContentImageCount, DraftRecord, ContentImageSlot, ContentImage, ContentBlock, getContentImages, getContentBlocks, fitContentBlockTextarea, createContentBlocks, withoutContentImages, missingBlockImages, RecommendedTitle, ContentAnalysis, TitleRecommendationRecord } from "./shared";

export function useStudio() {
  const [strategy, setStrategy] = useState(strategies[0][0]);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  // BLC-11: 키워드 도구에서 넘어온 자료(서버가 같은 회원 기록을 다시 읽은 결과). SEO DB에는 저장하지 않는다.
  const [keywordHandoff, setKeywordHandoff] = useState<{ status: "loading" } | { status: "ready"; evidence: KeywordEvidence } | { status: "error"; error: string } | null>(null);
  const [researchSeed, setResearchSeed] = useState("");
  const [message, setMessage] = useState(""); // v1.76 처음엔 안내 없음(기록이 있어도 「없습니다」가 보이던 문제, 원장 #18)
  const [pending, setPending] = useState(false);
  const [titlePending, setTitlePending] = useState(false);
  const [recommendedTitles, setRecommendedTitles] = useState<RecommendedTitle[]>([]);
  const [titleRecommendationId, setTitleRecommendationId] = useState<string | null>(null);
  const [titleRecommendations, setTitleRecommendations] = useState<TitleRecommendationRecord[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [personaId, setPersonaId] = useState(DEFAULT_SEO_PERSONA_ID);
  const [customPersona, setCustomPersona] = useState("");
  const [generateImageWithDraft, setGenerateImageWithDraft] = useState(true);
  const [generateContentImagesWithDraft, setGenerateContentImagesWithDraft] = useState(true);
  const [imageModel, setImageModel] = useState<GeminiImageModel>(DEFAULT_GEMINI_IMAGE_MODEL);
  const [contentProvider, setContentProvider] = useState<ContentProvider>("openai");
  const [contentModel, setContentModel] = useState<string>(DEFAULT_OPENAI_CONTENT_MODEL);
  // v1.96: 고른 AI 회사·모델을 이 브라우저에 기억. 불러오기가 끝나기 전에는 저장하지 않아 기본값이 덮어쓰지 않게 한다.
  const modelLoadedRef = useRef(false);
  // v1.97: 계정 저장값이 우선(어느 PC에서나 같게). 브라우저 기억은 계정 값을 받기 전 잠깐 쓰고,
  // 계정 값을 받은 뒤에만 계정에 저장한다(받기 전에 저장하면 이 PC 값이 다른 PC에서 고른 값을 덮어씀).
  const accountModelRef = useRef<string | null>(null);
  const [openAIFeatureModel, setOpenAIFeatureModel] = useState<string>(DEFAULT_OPENAI_CONTENT_MODEL);
  // v1.98: OpenAI 전용 기능 요청에 함께 보내는 지금 적용 중인 OpenAI 모델(계정 저장 전에 눌러도 맞게)
  const activeOpenAIModel = contentProvider === "openai" ? contentModel : openAIFeatureModel;
  useEffect(() => {
    const restoreModel = () => {
      let saved = null;
      try { saved = parseSavedModel(localStorage.getItem(SAVED_MODEL_KEY), CONTENT_MODEL_OPTIONS); } catch {}
      if (saved) { setContentProvider(saved.provider); setContentModel(saved.model); }
      modelLoadedRef.current = true;
    };
    restoreModel();
    fetch("/api/settings/ai-model").then((r) => r.ok ? r.json() : null).then((d: { content?: { provider: ContentProvider; model: string } | null; openaiFeature?: string } | null) => {
      if (!d) return;
      if (d.openaiFeature) setOpenAIFeatureModel(d.openaiFeature);
      if (d.content) { setContentProvider(d.content.provider); setContentModel(d.content.model); }
      accountModelRef.current = d.content ? JSON.stringify(d.content) : "";
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!modelLoadedRef.current) return;
    const value = JSON.stringify({ provider: contentProvider, model: contentModel });
    try { localStorage.setItem(SAVED_MODEL_KEY, value); } catch {}
    if (accountModelRef.current === null || accountModelRef.current === value) return;
    accountModelRef.current = value;
    fetch("/api/settings/ai-model", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: { provider: contentProvider, model: contentModel } }) })
      .then((r) => r.ok ? r.json() : null).then((d: { openaiFeature?: string } | null) => { if (d?.openaiFeature) setOpenAIFeatureModel(d.openaiFeature); }).catch(() => {});
  }, [contentProvider, contentModel]);
  const [contentImageCount, setContentImageCount] = useState<ContentImageCount>(2);
  // v1.74 글쓰기 선택 사항(저장하지 않고 생성 요청에만 사용)
  const [experienceNote, setExperienceNote] = useState("");
  const [experienceQuestions, setExperienceQuestions] = useState<string[]>([]);
  const [experienceQuestionPending, setExperienceQuestionPending] = useState(false);
  const [experienceQuestionMessage, setExperienceQuestionMessage] = useState("");
  const [naturalStyle, setNaturalStyle] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState(""); // BLC-08b: 승인한 내 문체(빈 값 = 적용 안 함)
  const [includeFaq, setIncludeFaq] = useState(false);
  const [editingTitleIndex, setEditingTitleIndex] = useState<number | null>(null);
  const [titleEditValue, setTitleEditValue] = useState("");
  const [existingBody, setExistingBody] = useState("");
  const [optimizeMode, setOptimizeMode] = useState<"direct" | "analyze" | "url">("direct");
  const [optimizationKeywords, setOptimizationKeywords] = useState("");
  const [optimizationDraftId, setOptimizationDraftId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourcePending, setSourcePending] = useState(false);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [analysisTopic, setAnalysisTopic] = useState("");
  const [analysisKeywords, setAnalysisKeywords] = useState("");
  const [optimizePending, setOptimizePending] = useState(false);
  const [optimized, setOptimized] = useState<{ title: string; body: string; improvements: string[] } | null>(null);
  const [history, setHistory] = useState<DraftRecord[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyCategory, setHistoryCategory] = useState<string>("all"); // all | none(미분류) | 카테고리 id
  const [categoryManageOpen, setCategoryManageOpen] = useState(false);
  const { categories: seoCategories, saveCategories: saveSeoCategories } = useCategories();
  const [historyPeriod, setHistoryPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [historyInputStatus, setHistoryInputStatus] = useState<"all" | "not_started" | "in_progress" | "completed" | "publish_ready" | "failed">("all");
  const [duplicatingDraftId, setDuplicatingDraftId] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<DraftRecord | null>(null);
  // BLC-09: 서버에서 받은 시점의 제목·본문 — 저장할 때 보내서 다른 창·탭이 먼저 저장했는지 확인한다.
  const baseTextRef = useRef<{ id: string; title: string; body: string } | null>(null);
  const rememberBase = (draft: { id: string; title: string; body: string }) => { baseTextRef.current = { id: draft.id, title: draft.title, body: draft.body }; };
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ dataUrl: string; model: string } | null>(null);
  const [contentImages, setContentImages] = useState<ContentImage[]>([]);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [contentImagePending, setContentImagePending] = useState(false);
  const [regeneratingContentImageSlot, setRegeneratingContentImageSlot] = useState<ContentImageSlot | null>(null);
  // BLC-10: 노드마다 덧붙일 요청 입력값, 화면 안 삭제 확인 중인 노드
  const [imageRequests, setImageRequests] = useState<Partial<Record<ContentImageSlot, string>>>({});
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<ContentImageSlot | null>(null);
  const [extensionDraftId, setExtensionDraftId] = useState<string | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState("");
  const selectedPersonaName = personaId === "custom"
    ? "커스텀 페르소나"
    : SEO_PERSONAS.find((persona) => persona.id === personaId)?.name ?? "정보 전달형 전문 에디터";

  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>(".content-block textarea").forEach(fitContentBlockTextarea);
  }, [contentBlocks]);

  async function refreshHistory() {
    const response = await fetch("/api/drafts/history");
    const result = response.ok ? await response.json() as { drafts?: typeof history } : { drafts: [] };
    setHistory(result.drafts ?? []);
  }

  useEffect(() => {
    fetch("/api/drafts/history").then((response) => response.ok ? response.json() : { drafts: [] }).then((result: { drafts?: typeof history }) => setHistory(result.drafts ?? [])).catch(() => setHistory([]));
    fetch("/api/titles/recommend").then((response) => response.ok ? response.json() : { recommendation: null, recommendations: [] }).then((result: { recommendation?: TitleRecommendationRecord | null; recommendations?: TitleRecommendationRecord[] }) => {
      setTitleRecommendations(result.recommendations ?? []);
      const recommendation = result.recommendation;
      if (!recommendation) return;
      setTitleRecommendationId(recommendation.id);
      setTopic(recommendation.topic);
      setKeywords(recommendation.keywords);
      setRecommendedTitles(recommendation.titles);
      setSelectedTitle(recommendation.selected_title ?? "");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const syncMenuFromHash = () => {
      // 이전에 공유된 #new-draft#new-draft 같은 중복 해시도 지원한다.
      const hashParts = window.location.hash.slice(1).split("#").map((part) => part.split("&")[0]); // BLC-11: #title&keyword-report=… 도 메뉴로 읽는다
      const menu = hashParts.find((part) => ["dashboard", "title", "new-draft", "research", "my-style", "draft", "history"].includes(part));
      setActiveMenu(menu ?? "dashboard");
    };

    syncMenuFromHash();
    window.addEventListener("hashchange", syncMenuFromHash);
    return () => window.removeEventListener("hashchange", syncMenuFromHash);
  }, []);

  useEffect(() => {
    // BLC-11: 주소에 실린 것은 기록 번호뿐 — 내용은 서버가 두 프로그램 권한·본인 기록·30일 안인지 확인한 뒤 돌려준다.
    // v2.03: 같은 탭에서 해시만 바뀌어도(새 기록 번호) 다시 불러온다. 늦게 도착한 앞 번호의 응답은 버린다.
    let lastId = "";
    const loadKeywordHandoff = (id: string) => {
      setKeywordHandoff({ status: "loading" });
      fetch(`/api/keyword-handoff/${id}`, { cache: "no-store" })
        .then(async (response) => {
          const body = await response.json().catch(() => ({})) as { evidence?: KeywordEvidence; error?: string };
          if (id !== lastId) return;
          setKeywordHandoff(response.ok && body.evidence ? { status: "ready", evidence: body.evidence } : { status: "error", error: body.error || "넘어온 키워드 자료를 불러오지 못했습니다." });
        })
        .catch(() => id === lastId && setKeywordHandoff({ status: "error", error: "넘어온 키워드 자료를 불러오지 못했습니다. 네트워크를 확인해 주세요." }));
    };
    const syncKeywordHandoff = () => {
      const id = handoffIdFromHash(window.location.hash);
      if (!id || id === lastId) return;
      lastId = id;
      loadKeywordHandoff(id);
    };
    syncKeywordHandoff();
    window.addEventListener("hashchange", syncKeywordHandoff);
    return () => window.removeEventListener("hashchange", syncKeywordHandoff);
  }, []);

  function applyHandoffToTitle(evidence: KeywordEvidence) {
    const seed = titleSeed(evidence);
    setTopic(seed.topic);
    setKeywords(seed.keywords);
    setSelectedTitle("");
    setRecommendedTitles([]);
    setTitleRecommendationId(null);
    openMenu("title");
  }

  function applyHandoffToResearch(evidence: KeywordEvidence) {
    setResearchSeed(evidence.keyword);
    openMenu("research");
  }

  function openMenu(id: string) {
    setActiveMenu(id);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadTitleRecommendation(recommendation: TitleRecommendationRecord) {
    setTitleRecommendationId(recommendation.id);
    setTopic(recommendation.topic);
    setKeywords(recommendation.keywords);
    setRecommendedTitles(recommendation.titles);
    setSelectedTitle(recommendation.selected_title ?? "");
    setEditingTitleIndex(null);
    setMessage(`저장된 제목 추천을 불러왔습니다: ${recommendation.topic}`);
  }

  async function deleteTitleRecommendation(recommendation: TitleRecommendationRecord) {
    const response = await fetch(`/api/titles/recommend/${encodeURIComponent(recommendation.id)}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "저장된 제목 추천을 삭제하지 못했습니다.");

    const remaining = titleRecommendations.filter((item) => item.id !== recommendation.id);
    setTitleRecommendations(remaining);
    if (titleRecommendationId !== recommendation.id) return;
    if (remaining[0]) return loadTitleRecommendation(remaining[0]);
    setTitleRecommendationId(null);
    setTopic("");
    setKeywords("");
    setRecommendedTitles([]);
    setSelectedTitle("");
    setMessage("저장된 제목 추천을 삭제했습니다.");
  }

  function reuseDraft(draft: (typeof history)[number], notice = "기존 생성 기록을 작업 화면에 불러왔습니다.") {
    setTopic(draft.topic);
    setKeywords(Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "");
    setStrategy(draft.strategy || strategies[0][0]);
    setSelectedTitle(draft.title);
    const restoredContentImages = getContentImages(draft);
    setContentImages(restoredContentImages);
    setContentImageCount(Math.min(6, Math.max(2, restoredContentImages.length)) as ContentImageCount);
    setContentBlocks(blocksOfDraft(draft));
    setCurrentDraft(withoutContentImages(draft));
    rememberBase(draft);
    setGeneratedImage(draft.image_path ? { dataUrl: `/api/drafts/${encodeURIComponent(draft.id)}/image`, model: draft.image_model || "나노바나나" } : null);
    setExtensionDraftId(draft.id);
    setHandoffMessage("");
    setDraftSaveMessage("");
    setMessage(notice);
    openMenu("new-draft");
  }

  async function deleteDraft(draft: DraftRecord) {
    const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setMessage(result.error || "블로그(원문)을 삭제하지 못했습니다.");
    setHistory((items) => items.filter((item) => item.id !== draft.id));
    if (extensionDraftId === draft.id) {
      setCurrentDraft(null);
      setContentImages([]);
      setContentBlocks([]);
      setGeneratedImage(null);
      setExtensionDraftId(null);
    }
    setMessage("생성한 블로그(원문)과 대표 이미지를 삭제했습니다.");
  }

  async function duplicateDraft(draft: DraftRecord) {
    setDuplicatingDraftId(draft.id);
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}/duplicate`, { method: "POST" });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "블로그(원문)을 복제하지 못했습니다.");
      setHistory((items) => [result.draft!, ...items]);
      reuseDraft(result.draft);
      setMessage(`블로그(원문)을 복제해 편집 화면에 열었습니다: ${result.draft.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "블로그(원문)을 복제하지 못했습니다.");
    } finally {
      setDuplicatingDraftId(null);
    }
  }

  function startTitleEdit(index: number) {
    setEditingTitleIndex(index);
    setTitleEditValue(recommendedTitles[index]?.title ?? "");
  }

  async function persistRecommendedTitles(titles: RecommendedTitle[], nextSelectedTitle: string) {
    if (!titleRecommendationId) return;
    try {
      const response = await fetch(`/api/titles/recommend/${encodeURIComponent(titleRecommendationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles, selectedTitle: nextSelectedTitle || null }),
      });
      const result = await response.json() as { recommendation?: TitleRecommendationRecord; error?: string };
      if (!response.ok || !result.recommendation) throw new Error(result.error || "제목 추천 저장에 실패했습니다.");
      setRecommendedTitles(result.recommendation.titles);
      setSelectedTitle(result.recommendation.selected_title ?? "");
      setTitleRecommendations((items) => items.map((item) => item.id === result.recommendation?.id ? { ...item, ...result.recommendation } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "제목 추천 저장에 실패했습니다.");
    }
  }

  function selectRecommendedTitle(title: string) {
    setSelectedTitle(title);
    void persistRecommendedTitles(recommendedTitles, title);
  }

  function saveTitleEdit(index: number) {
    const title = titleEditValue.trim();
    if (!title) return setMessage("제목을 비워둘 수 없습니다.");
    const nextTitles = recommendedTitles.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item);
    const nextSelectedTitle = selectedTitle === recommendedTitles[index]?.title ? title : selectedTitle;
    setRecommendedTitles(nextTitles);
    setSelectedTitle(nextSelectedTitle);
    void persistRecommendedTitles(nextTitles, nextSelectedTitle);
    setEditingTitleIndex(null);
  }

  function deleteRecommendedTitle(index: number) {
    const removed = recommendedTitles[index];
    const nextTitles = recommendedTitles.filter((_, itemIndex) => itemIndex !== index);
    const nextSelectedTitle = removed?.title === selectedTitle ? "" : selectedTitle;
    setRecommendedTitles(nextTitles);
    setSelectedTitle(nextSelectedTitle);
    void persistRecommendedTitles(nextTitles, nextSelectedTitle);
    if (editingTitleIndex === index) setEditingTitleIndex(null);
  }

  async function recommendTitles() {
    if (!topic.trim()) return setMessage("주제를 먼저 입력해주세요.");
    setTitlePending(true);
    try {
      const response = await fetch("/api/titles/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, keywords, openaiModel: activeOpenAIModel }) });
      const result = await response.json() as { recommendation?: TitleRecommendationRecord; error?: string };
      if (!response.ok) throw new Error(result.error || "제목 추천에 실패했습니다.");
      if (!result.recommendation) throw new Error("저장된 제목 추천 결과를 받지 못했습니다.");
      setTitleRecommendationId(result.recommendation.id);
      setRecommendedTitles(result.recommendation.titles);
      setSelectedTitle("");
      setTitleRecommendations((items) => [result.recommendation!, ...items.filter((item) => item.id !== result.recommendation?.id)]);
      setEditingTitleIndex(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "제목 추천에 실패했습니다.");
    } finally { setTitlePending(false); }
  }

  async function optimizeExisting() {
    if (!existingBody.trim()) return setMessage("기존 글을 먼저 붙여넣어주세요.");
    setOptimizePending(true);
    try {
      const response = await fetch("/api/drafts/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: existingBody, keywords: optimizationKeywords, personaId, customPersona, openaiModel: activeOpenAIModel }) });
      const result = await response.json() as { result?: { title: string; body: string; improvements: string[] }; error?: string };
      if (!response.ok) throw new Error(result.error || "기존 글 최적화에 실패했습니다.");
      setOptimized(result.result ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기존 글 최적화에 실패했습니다.");
    } finally { setOptimizePending(false); }
  }

  function loadGeneratedDraftForOptimization(draftId: string) {
    setOptimizationDraftId(draftId);
    const draft = history.find((item) => item.id === draftId);
    if (!draft) return;
    setExistingBody(draft.body);
    setOptimizationKeywords(draft.keywords.join(", "));
    setSourceTitle(draft.topic || draft.title);
    setOptimized(null);
    setMessage(`생성 기록의 블로그(원문)을 불러왔습니다: ${draft.title}`);
  }

  async function extractFromUrl() {
    if (!sourceUrl.trim()) return setMessage("가져올 블로그 주소를 입력해주세요.");
    setSourcePending(true);
    try {
      const response = await fetch("/api/drafts/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: sourceUrl }) });
      const result = await response.json() as { article?: { title: string; body: string; url: string }; error?: string };
      if (!response.ok || !result.article) throw new Error(result.error || "글을 가져오지 못했습니다.");
      setExistingBody(result.article.body);
      setSourceUrl(result.article.url);
      setSourceTitle(result.article.title);
      setContentAnalysis(null);
      setMessage("글을 가져왔습니다. 핵심 분석 후 새 글 만들기를 진행하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "글을 가져오는 중 오류가 발생했습니다.");
    } finally { setSourcePending(false); }
  }

  async function analyzeExisting() {
    if (!existingBody.trim()) return setMessage("분석할 기존 글을 먼저 붙여넣거나 가져와주세요.");
    setAnalysisPending(true);
    try {
      const response = await fetch("/api/drafts/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: existingBody, openaiModel: activeOpenAIModel }) });
      const result = await response.json() as { analysis?: ContentAnalysis; error?: string };
      if (!response.ok || !result.analysis) throw new Error(result.error || "글 분석에 실패했습니다.");
      setContentAnalysis(result.analysis);
      setAnalysisTopic(result.analysis.topic);
      setAnalysisKeywords([...result.analysis.coreKeywords, ...result.analysis.relatedKeywords].join(", "));
      setSelectedTitle(result.analysis.suggestedTitle);
      setMessage("핵심 주제와 키워드를 추출했습니다. 내용을 확인한 뒤 새 글을 생성하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "글 분석에 실패했습니다.");
    } finally { setAnalysisPending(false); }
  }

  async function saveOptimizationAsDraft() {
    if (!optimized) return;
    setDraftSaving(true);
    try {
      const response = await fetch("/api/drafts/save-optimized", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: optimized.title, body: optimized.body, topic: sourceTitle || optimized.title, keywords: optimizationKeywords, strategy }) });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "최적화한 블로그(원문)을 저장하지 못했습니다.");
      setContentImages(getContentImages(result.draft));
      setContentBlocks(blocksOfDraft(result.draft));
      setCurrentDraft(withoutContentImages(result.draft));
      rememberBase(result.draft);
      setExtensionDraftId(result.draft.id);
      setSelectedTitle(result.draft.title);
      setTopic(result.draft.topic);
      setKeywords(result.draft.keywords.join(", "));
      setGeneratedImage(null);
      refreshHistory().catch(() => {});
      const generatedCover = generateImageWithDraft ? await generateImage(result.draft) : null;
      if (generateContentImagesWithDraft) await generateContentImages(generatedCover?.path ? { ...result.draft, image_path: generatedCover.path } : result.draft);
      setMessage("최적화한 글을 새 블로그(원문)으로 저장했습니다.");
      openMenu("new-draft");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "최적화한 블로그(원문)을 저장하지 못했습니다.");
    } finally { setDraftSaving(false); }
  }

  async function requestExperienceQuestions() {
    if (!topic.trim() && !selectedTitle.trim()) return setExperienceQuestionMessage("주제나 제목을 먼저 입력해주세요.");
    setExperienceQuestionPending(true);
    setExperienceQuestionMessage("");
    try {
      const response = await fetch("/api/drafts/experience-questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, title: selectedTitle, keywords, provider: contentProvider, model: contentModel }) });
      const result = await response.json().catch(() => ({})) as { questions?: string[]; error?: string };
      if (!response.ok || !result.questions?.length) throw new Error(result.error || "경험 질문을 만들지 못했습니다.");
      setExperienceQuestions(result.questions);
    } catch (error) {
      setExperienceQuestionMessage(error instanceof Error ? error.message : "경험 질문을 만들지 못했습니다.");
    } finally {
      setExperienceQuestionPending(false);
    }
  }

  function appendExperienceQuestion(question: string) {
    setExperienceNote((note) => `${note.trim() ? `${note.trim()}\n` : ""}- ${question} → `);
  }

  async function prepareDraft(overrides?: { topic: string; keywords: string; selectedTitle: string; sourceContext?: string; researchId?: string }) {
    const draftTopic = overrides?.topic ?? topic;
    const draftKeywords = overrides?.keywords ?? keywords;
    const draftTitle = overrides?.selectedTitle ?? selectedTitle;
    if (!draftTopic.trim()) {
      setMessage("먼저 글 주제를 입력해주세요.");
      return;
    }
    setPending(true);
    setMessage("AI가 블로그(원문)을 준비하고 있습니다. 잠시만 기다려주세요.");
    try {
      const response = await fetch("/api/drafts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: draftTopic, keywords: draftKeywords, strategy, selectedTitle: draftTitle, personaId, customPersona, sourceContext: overrides?.sourceContext, provider: contentProvider, model: contentModel, experienceNote, naturalStyle, includeFaq, researchId: overrides?.researchId, styleId: selectedStyleId || undefined }) });
      const result = await response.json() as { draft?: { id: string; title: string; body: string; seo_report?: Record<string, string> | null; created_at?: string }; error?: string };
      if (!response.ok) throw new Error(result.error || "블로그(원문) 생성에 실패했습니다.");
      const draft = result.draft;
      if (!draft) throw new Error("생성된 블로그(원문) 결과를 받지 못했습니다.");
      setExtensionDraftId(draft.id);
      setSelectedTitle(draft.title);
      const preparedDraft: DraftRecord = { ...draft, topic: draftTopic, keywords: draftKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean), strategy };
      setContentImages(getContentImages(preparedDraft));
      setContentBlocks(splitParagraphBlocks(createContentBlocks(preparedDraft)));
      setCurrentDraft(withoutContentImages(preparedDraft));
      rememberBase(preparedDraft);
      setGeneratedImage(null);
      setHandoffMessage("");
      refreshHistory().catch(() => {});
      setMessage(`블로그(원문)이 준비되었습니다: ${draft.title}`);
      return preparedDraft;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "블로그(원문) 생성에 실패했습니다.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function createDraftFromSelectedTitle() {
    if (!selectedTitle) {
      setMessage("새 글로 만들 제목을 먼저 선택해주세요.");
      return;
    }
    const draft = await prepareDraft();
    if (!draft) return;
    const generatedCover = generateImageWithDraft ? await generateImage(draft) : null;
    if (generateContentImagesWithDraft) await generateContentImages(generatedCover?.path ? { ...draft, image_path: generatedCover.path } : draft);
    openMenu("new-draft");
  }

  async function createDraftFromAnalysis() {
    if (!contentAnalysis || !analysisTopic.trim()) return setMessage("먼저 기존 글의 핵심 분석을 완료해주세요.");
    const sourceContext = [
      `검색 의도: ${contentAnalysis.searchIntent}`,
      `독자 대상: ${contentAnalysis.targetReader}`,
      `핵심 구조: ${contentAnalysis.outline.join(" / ")}`,
      `원문 강점: ${contentAnalysis.strengths.join(" / ")}`,
      `보완점: ${contentAnalysis.improvements.join(" / ")}`,
    ].filter((item) => !item.endsWith(": ")).join("\n");
    const draft = await prepareDraft({ topic: analysisTopic, keywords: analysisKeywords, selectedTitle: contentAnalysis.suggestedTitle, sourceContext });
    if (!draft) return;
    setGeneratedImage(null);
    const generatedCover = generateImageWithDraft ? await generateImage(draft) : null;
    if (generateContentImagesWithDraft) await generateContentImages(generatedCover?.path ? { ...draft, image_path: generatedCover.path } : draft);
    setTopic(analysisTopic);
    setKeywords(analysisKeywords);
    setSelectedTitle(draft.title);
    openMenu("new-draft");
  }

  async function sendDraftToExtension() {
    if (!extensionDraftId) return setHandoffMessage("생성 기록에서 블로그(원문)을 먼저 선택해주세요.");
    if (currentDraft && missingBlockImages(currentDraft, contentBlocks, contentImages).length) {
      return setHandoffMessage("전송 대상으로 선택한 이미지가 준비되지 않았습니다. 이미지를 생성하거나 해당 이미지 블록을 전송 제외한 뒤 다시 전송해주세요.");
    }
    if (currentDraft && !(await saveCurrentDraft(true))) return;
    setHandoffPending(true);
    setHandoffMessage("확장 프로그램 전송함에 블로그(원문)을 준비하는 중...");
    try {
      const response = await fetch("/api/drafts/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: extensionDraftId }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "블로그(원문) 전송 준비에 실패했습니다.");
      setHandoffMessage("확장 프로그램 전송함에 준비했습니다. Chrome 확장에서 ‘전송된 콘텐츠 목록 새로고침’ 후 불러오세요.");
    } catch (error) {
      setHandoffMessage(error instanceof Error ? error.message : "블로그(원문) 전송 준비에 실패했습니다.");
    } finally {
      setHandoffPending(false);
    }
  }

  async function generateImage(draft: DraftRecord | null = currentDraft) {
    if (!draft || !(draft.topic || topic).trim()) return setMessage("먼저 AI 블로그(원문)을 생성하거나 생성 기록에서 블로그(원문)을 선택해주세요.");
    setImagePending(true);
    setMessage("나노바나나가 블로그 대표 이미지를 생성하고 있습니다.");
    try {
      const response = await fetch("/api/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id, topic: draft.topic || topic, title: draft.title, keywords: draft.keywords.join(", ") || keywords, model: imageModel }) });
      const result = await response.json() as { image?: { dataUrl: string; model: string; path?: string; mimeType?: string }; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "이미지 생성에 실패했습니다.");
      const image = result.image;
      setGeneratedImage(image);
      setCurrentDraft((current) => current?.id === draft.id
        ? { ...current, image_path: image.path ?? null, image_model: image.model, image_mime_type: image.mimeType ?? null }
        : { ...draft, image_path: image.path ?? null, image_model: image.model, image_mime_type: image.mimeType ?? null });
      setContentBlocks((blocks) => {
        if (blocks.some((block) => block.type === "image" && block.slot === "cover")) return blocks;
        return [{ id: "cover", type: "image", slot: "cover", alt: "대표 이미지" }, ...blocks];
      });
      setMessage("대표 이미지가 생성되었습니다. 다음 단계에서 네이버 편집기에 삽입할 수 있습니다.");
      return image;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 생성에 실패했습니다.");
    } finally { setImagePending(false); }
  }

  // BLC-10 (2026-10-22): 본문 이미지를 노드 단위로 — 요청 1번에 이미지 1장, 서버가 그 노드만 저장(다른 이미지·위치 그대로).
  async function makeContentImage(draftId: string, slot: ContentImageSlot, request?: string) {
    const response = await fetch("/api/images/regenerate-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId, slot, model: imageModel, ...(request !== undefined ? { request } : {}) }) });
    const result = await response.json() as { image?: ContentImage; error?: string };
    if (!response.ok || !result.image) throw new Error(result.error || "본문 이미지를 만들지 못했습니다.");
    setContentImages((items) => upsertNode(items, result.image!));
    return result.image;
  }

  // ① 목표 장수까지 빈 칸의 기준 문장만 정하고(글 AI 1회) ② 이미지가 없는 노드만 1장씩 만든다. 실패하면 멈추고, 만든 장은 저장돼 있다.
  async function generateContentImages(draft: DraftRecord | null = currentDraft) {
    if (!draft) return setMessage("먼저 AI 블로그(원문)을 생성하거나 생성 기록에서 블로그(원문)을 선택해주세요.");
    setContentImagePending(true);
    let done = 0;
    try {
      setMessage("이미지가 들어갈 빈 칸의 기준 문장을 고르고 있습니다.");
      const response = await fetch("/api/images/plan-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id, count: contentImageCount, openaiModel: activeOpenAIModel }) });
      const result = await response.json() as { images?: ContentImage[]; blocks?: ContentBlock[]; added?: ContentImageSlot[]; error?: string };
      if (!response.ok || !result.images) throw new Error(result.error || "본문 이미지 구성을 정하지 못했습니다.");
      const images = result.images;
      setContentImages(images);
      // 화면 블록(아직 저장 안 한 이동·수정 포함)은 그대로 두고 새 노드만 기준 문단 앞에 넣는다
      setContentBlocks((blocks) => (result.added ?? []).reduce((next, slot) => {
        const node = images.find((image) => image.slot === slot);
        return node ? placeNodeBlock(next, node) : next;
      }, blocks.length ? blocks : result.blocks ?? []));
      const pending = images.filter((image) => !image.path).map((image) => image.slot);
      for (const slot of pending) {
        setRegeneratingContentImageSlot(slot);
        setMessage(`본문 이미지 ${done + 1}/${pending.length}장을 만들고 있습니다.`);
        await makeContentImage(draft.id, slot);
        done += 1;
      }
      setMessage(pending.length ? `본문 이미지 ${done}장을 만들었습니다. 이미 있던 이미지와 위치는 그대로입니다.` : "모든 칸에 이미지가 있습니다. 바꾸려면 이미지마다 「다시 만들기」를 눌러주세요.");
      refreshHistory().catch(() => {});
    } catch (error) {
      const reason = error instanceof Error ? error.message : "본문 이미지를 만들지 못했습니다.";
      setMessage(`${reason}${done ? ` (만든 ${done}장은 저장됐습니다.)` : ""} 다시 누르면 남은 칸만 만듭니다.`);
    } finally { setContentImagePending(false); setRegeneratingContentImageSlot(null); }
  }

  // 노드 하나만 (요청을 고쳐) 다시 만든다. request를 보내면 노드에 저장된다.
  async function regenerateContentImage(image: ContentImage, request?: string) {
    if (!currentDraft) return;
    const no = image.slot.replace("content-", "");
    setRegeneratingContentImageSlot(image.slot);
    setMessage(`${no}번 본문 이미지만 ${image.path ? "다시 " : ""}만들고 있습니다. 다른 이미지와 위치는 그대로입니다.`);
    try {
      await makeContentImage(currentDraft.id, image.slot, request);
      setMessage(`${no}번 본문 이미지를 ${image.path ? "새로 " : ""}만들었습니다. 기준 문장과 위치는 그대로입니다.`);
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 이미지를 만들지 못했습니다.");
    } finally {
      setRegeneratingContentImageSlot(null);
    }
  }

  // 노드 하나 삭제 — 기록·블록·파일을 함께 지운다(AI 호출 없음).
  async function deleteContentImage(slot: ContentImageSlot) {
    if (!currentDraft) return;
    setConfirmDeleteSlot(null);
    setRegeneratingContentImageSlot(slot);
    try {
      const response = await fetch("/api/images/delete-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: currentDraft.id, slot }) });
      const result = await response.json() as { images?: ContentImage[]; error?: string };
      if (!response.ok || !result.images) throw new Error(result.error || "본문 이미지를 삭제하지 못했습니다.");
      setContentImages(result.images);
      setContentBlocks((blocks) => removeNodeBlock(blocks, slot));
      setMessage(`${slot.replace("content-", "")}번 본문 이미지를 삭제했습니다. 다른 이미지와 위치는 그대로입니다.`);
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 이미지를 삭제하지 못했습니다.");
    } finally {
      setRegeneratingContentImageSlot(null);
    }
  }

  // v2.01: 내 사진으로 노드를 바꾸거나(slot) 그 문단 앞에 넣는다(blockId). AI 호출 없음.
  async function uploadContentImage(file: File, target: { slot: ContentImageSlot } | { blockId: string }) {
    if (!currentDraft) return;
    const block = "blockId" in target ? contentBlocks.find((item) => item.id === target.blockId) : undefined;
    if ("blockId" in target && block?.type !== "text") return;
    if (file.size > 4 * 1024 * 1024) return setMessage("사진은 4MB 이하로 올려주세요.");
    const form = new FormData();
    form.append("draftId", currentDraft.id);
    form.append("file", file);
    if ("slot" in target) form.append("slot", target.slot);
    else if (block?.type === "text") { form.append("beforeBlockId", block.id); form.append("paragraph", block.text); }
    setContentImagePending(true);
    if ("slot" in target) setRegeneratingContentImageSlot(target.slot);
    setMessage("내 사진을 올리고 있습니다.");
    try {
      const response = await fetch("/api/images/upload-content", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as { image?: ContentImage; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "사진을 올리지 못했습니다.");
      const node = result.image;
      setContentImages((items) => upsertNode(items, node));
      if ("blockId" in target) setContentBlocks((blocks) => placeNodeBlock(blocks, node, target.blockId));
      setMessage(`${node.slot.replace("content-", "")}번 본문 이미지를 내 사진으로 ${"slot" in target ? "바꿨" : "넣었"}습니다. 다른 이미지와 위치는 그대로입니다.`);
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "사진을 올리지 못했습니다.");
    } finally {
      setContentImagePending(false);
      setRegeneratingContentImageSlot(null);
    }
  }

  // 이 문단 앞에 이미지 노드를 넣고(글 AI 1회) 이어서 이미지 1장을 만든다.
  async function addContentImageAt(blockId: string) {
    const block = contentBlocks.find((item) => item.id === blockId);
    if (!currentDraft || block?.type !== "text") return;
    setContentImagePending(true);
    setMessage("이 문단에 맞는 장면을 정하고 있습니다.");
    try {
      const response = await fetch("/api/images/add-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: currentDraft.id, paragraph: block.text, beforeBlockId: blockId, openaiModel: activeOpenAIModel }) });
      const result = await response.json() as { image?: ContentImage; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "이 문단에 넣을 이미지를 준비하지 못했습니다.");
      const node = result.image;
      setContentImages((items) => upsertNode(items, node));
      setContentBlocks((blocks) => placeNodeBlock(blocks, node, blockId));
      setRegeneratingContentImageSlot(node.slot);
      setMessage(`${node.slot.replace("content-", "")}번 본문 이미지를 만들고 있습니다.`);
      await makeContentImage(currentDraft.id, node.slot);
      setMessage(`이 문단 앞에 ${node.slot.replace("content-", "")}번 본문 이미지를 넣었습니다.`);
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "이 문단에 이미지를 넣지 못했습니다."} 자리는 남아 있으니 「만들기」로 다시 시도할 수 있습니다.`);
    } finally {
      setContentImagePending(false);
      setRegeneratingContentImageSlot(null);
    }
  }

  const activeHistoryDraft = history.find((draft) => draft.id === extensionDraftId);
  const knownCategoryIds = new Set(seoCategories.map((c) => c.id));
  const historyCategoryOf = (draft: DraftRecord) => (draft.category_id && knownCategoryIds.has(draft.category_id) ? draft.category_id : "none");
  const historyCategoryCounts: Record<string, number> = {};
  for (const draft of history) historyCategoryCounts[historyCategoryOf(draft)] = (historyCategoryCounts[historyCategoryOf(draft)] ?? 0) + 1;
  async function moveDraftCategory(draft: DraftRecord, to: string) {
    const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}/category`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: to === "none" ? "" : to }) });
    if (!response.ok) { setMessage("카테고리를 바꾸지 못했습니다."); return; }
    setHistory((items) => items.map((item) => (item.id === draft.id ? { ...item, category_id: to === "none" ? null : to } : item)));
  }
  const filteredHistory = history.filter((draft) => {
    const query = historyQuery.trim().toLocaleLowerCase("ko-KR");
    const searchable = `${draft.title} ${draft.topic} ${draft.keywords.join(" ")}`.toLocaleLowerCase("ko-KR");
    if (query && !searchable.includes(query)) return false;
    const createdAt = draft.created_at ? new Date(draft.created_at) : new Date();
    const now = new Date();
    if (historyPeriod === "today" && createdAt.toDateString() !== now.toDateString()) return false;
    if (historyPeriod === "week" && createdAt.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) return false;
    if (historyPeriod === "month" && createdAt.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) return false;
    if (historyCategory !== "all" && historyCategoryOf(draft) !== historyCategory) return false;
    return historyInputStatus === "all" || (draft.naver_input_status ?? "not_started") === historyInputStatus;
  });

  function syncBodyFromBlocks(blocks: ContentBlock[]) {
    return blocks.filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
      .map((block) => block.text.trim()).filter(Boolean).join("\n\n");
  }

  function updateContentBlocks(nextBlocks: ContentBlock[]) {
    setContentBlocks(nextBlocks);
    setCurrentDraft((draft) => draft ? { ...draft, body: syncBodyFromBlocks(nextBlocks) } : draft);
  }

  function updateTextBlock(id: string, text: string) {
    updateContentBlocks(contentBlocks.map((block) => block.type === "text" && block.id === id ? { ...block, text } : block));
  }

  function moveContentBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= contentBlocks.length) return;
    const next = [...contentBlocks];
    [next[index], next[target]] = [next[target], next[index]];
    updateContentBlocks(next);
  }

  function removeContentBlock(id: string) {
    updateContentBlocks(contentBlocks.filter((block) => block.id !== id));
  }

  function addTextBlock() {
    updateContentBlocks([...contentBlocks, { id: `text-${Date.now()}`, type: "text", text: "새 문단을 입력하세요." }]);
  }

  async function saveCurrentDraft(silent = false) {
    if (!currentDraft) return false;
    // BLC-10: 공백·줄바꿈 차이만 있으면 블록 배치를 그대로 쓴다(문단 나누기로 생기는 줄바꿈 차이에 배치가 다시 만들어지지 않게)
    const squash = (text: string) => text.replace(/\s+/g, " ").trim();
    const blocksForSave = squash(syncBodyFromBlocks(contentBlocks)) === squash(currentDraft.body)
      ? contentBlocks
      : reflowBlocks(contentBlocks, currentDraft.body, contentImages); // v2.00: 통짜 입력칸 수정 — 이미지 위치를 「바로 뒤 문단」 기준으로 다시 맞춤(빼지 않음)
    setDraftSaving(true);
    if (!silent) setDraftSaveMessage("수정한 블로그(원문)을 저장하는 중...");
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(currentDraft.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: currentDraft.title, body: currentDraft.body, contentBlocks: blocksForSave, ...(baseTextRef.current?.id === currentDraft.id ? { baseTitle: baseTextRef.current.title, baseBody: baseTextRef.current.body } : {}) }) });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "블로그(원문) 저장에 실패했습니다.");
      setContentImages(getContentImages(result.draft));
      setContentBlocks(blocksOfDraft(result.draft));
      setCurrentDraft(withoutContentImages(result.draft));
      rememberBase(result.draft);
      setSelectedTitle(result.draft.title);
      refreshHistory().catch(() => {});
      if (!silent) setDraftSaveMessage("수정한 블로그(원문)을 저장했습니다.");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "블로그(원문) 저장에 실패했습니다.";
      setDraftSaveMessage(message);
      return false;
    } finally {
      setDraftSaving(false);
    }
  }

  async function copyDraftText() {
    if (!currentDraft) return;
    try {
      await navigator.clipboard.writeText(`${currentDraft.title}\n\n${currentDraft.body}`);
      setMessage("제목과 본문을 클립보드에 복사했습니다.");
    } catch {
      setMessage("복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해주세요.");
    }
  }

  const selectedContentModelLabel = getContentModels(contentProvider).find((option) => option.value === contentModel)?.label.split(" · ")[0] ?? contentModel;
  const completedInputCount = history.filter((draft) => draft.naver_input_status === "completed" || draft.naver_input_status === "publish_ready").length;

  return {
    keywordHandoff,
    setKeywordHandoff,
    researchSeed,
    setResearchSeed,
    applyHandoffToTitle,
    applyHandoffToResearch,
    strategy,
    setStrategy,
    activeMenu,
    setActiveMenu,
    topic,
    setTopic,
    keywords,
    setKeywords,
    message,
    setMessage,
    pending,
    setPending,
    titlePending,
    setTitlePending,
    recommendedTitles,
    setRecommendedTitles,
    titleRecommendationId,
    setTitleRecommendationId,
    titleRecommendations,
    setTitleRecommendations,
    selectedTitle,
    setSelectedTitle,
    personaId,
    setPersonaId,
    customPersona,
    setCustomPersona,
    generateImageWithDraft,
    setGenerateImageWithDraft,
    generateContentImagesWithDraft,
    setGenerateContentImagesWithDraft,
    imageModel,
    setImageModel,
    contentProvider,
    setContentProvider,
    contentModel,
    setContentModel,
    openAIFeatureModel,
    contentImageCount,
    setContentImageCount,
    editingTitleIndex,
    setEditingTitleIndex,
    titleEditValue,
    setTitleEditValue,
    existingBody,
    setExistingBody,
    optimizeMode,
    setOptimizeMode,
    optimizationKeywords,
    setOptimizationKeywords,
    optimizationDraftId,
    setOptimizationDraftId,
    sourceUrl,
    setSourceUrl,
    sourceTitle,
    setSourceTitle,
    sourcePending,
    setSourcePending,
    analysisPending,
    setAnalysisPending,
    contentAnalysis,
    setContentAnalysis,
    analysisTopic,
    setAnalysisTopic,
    analysisKeywords,
    setAnalysisKeywords,
    optimizePending,
    setOptimizePending,
    optimized,
    setOptimized,
    history,
    setHistory,
    historyQuery,
    setHistoryQuery,
    historyCategory,
    setHistoryCategory,
    categoryManageOpen,
    setCategoryManageOpen,
    seoCategories,
    saveSeoCategories,
    historyPeriod,
    setHistoryPeriod,
    historyInputStatus,
    setHistoryInputStatus,
    duplicatingDraftId,
    setDuplicatingDraftId,
    currentDraft,
    setCurrentDraft,
    draftSaving,
    setDraftSaving,
    draftSaveMessage,
    setDraftSaveMessage,
    imagePending,
    setImagePending,
    generatedImage,
    setGeneratedImage,
    contentImages,
    setContentImages,
    contentBlocks,
    setContentBlocks,
    contentImagePending,
    setContentImagePending,
    regeneratingContentImageSlot,
    setRegeneratingContentImageSlot,
    extensionDraftId,
    setExtensionDraftId,
    handoffPending,
    setHandoffPending,
    handoffMessage,
    setHandoffMessage,
    selectedPersonaName,
    refreshHistory,
    openMenu,
    loadTitleRecommendation,
    deleteTitleRecommendation,
    reuseDraft,
    deleteDraft,
    duplicateDraft,
    startTitleEdit,
    persistRecommendedTitles,
    selectRecommendedTitle,
    saveTitleEdit,
    deleteRecommendedTitle,
    recommendTitles,
    optimizeExisting,
    loadGeneratedDraftForOptimization,
    extractFromUrl,
    analyzeExisting,
    saveOptimizationAsDraft,
    prepareDraft,
    createDraftFromSelectedTitle,
    createDraftFromAnalysis,
    sendDraftToExtension,
    generateImage,
    generateContentImages,
    regenerateContentImage,
    deleteContentImage,
    addContentImageAt,
    uploadContentImage,
    imageRequests,
    setImageRequests,
    confirmDeleteSlot,
    setConfirmDeleteSlot,
    activeHistoryDraft,
    knownCategoryIds,
    historyCategoryOf,
    historyCategoryCounts,
    moveDraftCategory,
    filteredHistory,
    syncBodyFromBlocks,
    updateContentBlocks,
    updateTextBlock,
    moveContentBlock,
    removeContentBlock,
    addTextBlock,
    saveCurrentDraft,
    copyDraftText,
    selectedContentModelLabel,
    completedInputCount,
    experienceNote,
    setExperienceNote,
    experienceQuestions,
    experienceQuestionPending,
    experienceQuestionMessage,
    requestExperienceQuestions,
    appendExperienceQuestion,
    naturalStyle,
    setNaturalStyle,
    includeFaq,
    setIncludeFaq,
    selectedStyleId,
    setSelectedStyleId,
  };
}

export type Studio = ReturnType<typeof useStudio>;
