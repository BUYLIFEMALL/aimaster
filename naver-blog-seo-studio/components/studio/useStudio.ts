"use client";

// StudioPage의 상태·처리 함수를 그대로 옮긴 훅 (2026-10-17 파일 나누기, 로직 변경 없음)
import { useEffect, useState } from "react";
import { useCategories } from "@/components/categories/useCategories";
import { DEFAULT_SEO_PERSONA_ID, SEO_PERSONAS } from "@/lib/ai/personas";
import { DEFAULT_GEMINI_IMAGE_MODEL, type GeminiImageModel } from "@/lib/ai/geminiModels";
import { DEFAULT_OPENAI_CONTENT_MODEL } from "@/lib/ai/openaiModels";
import { getContentModels, type ContentProvider } from "@/lib/ai/contentModels";
import { strategies, DraftRecord, ContentImageSlot, ContentImage, ContentBlock, getContentImages, getContentBlocks, fitContentBlockTextarea, createContentBlocks, withoutContentImages, RecommendedTitle, ContentAnalysis, TitleRecommendationRecord } from "./shared";

export function useStudio() {
  const [strategy, setStrategy] = useState(strategies[0][0]);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [message, setMessage] = useState("아직 생성된 블로그(원문)이 없습니다.");
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
  const [contentImageCount, setContentImageCount] = useState<2 | 3>(2);
  // v1.74 글쓰기 선택 사항(저장하지 않고 생성 요청에만 사용)
  const [experienceNote, setExperienceNote] = useState("");
  const [experienceQuestions, setExperienceQuestions] = useState<string[]>([]);
  const [experienceQuestionPending, setExperienceQuestionPending] = useState(false);
  const [experienceQuestionMessage, setExperienceQuestionMessage] = useState("");
  const [naturalStyle, setNaturalStyle] = useState(false);
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
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ dataUrl: string; model: string } | null>(null);
  const [contentImages, setContentImages] = useState<ContentImage[]>([]);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [contentImagePending, setContentImagePending] = useState(false);
  const [regeneratingContentImageSlot, setRegeneratingContentImageSlot] = useState<ContentImageSlot | null>(null);
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
      const hashParts = window.location.hash.slice(1).split("#");
      const menu = hashParts.find((part) => ["dashboard", "title", "new-draft", "draft", "history"].includes(part));
      setActiveMenu(menu ?? "dashboard");
    };

    syncMenuFromHash();
    window.addEventListener("hashchange", syncMenuFromHash);
    return () => window.removeEventListener("hashchange", syncMenuFromHash);
  }, []);

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

  function reuseDraft(draft: (typeof history)[number]) {
    setTopic(draft.topic);
    setKeywords(Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "");
    setStrategy(draft.strategy || strategies[0][0]);
    setSelectedTitle(draft.title);
    const restoredContentImages = getContentImages(draft);
    setContentImages(restoredContentImages);
    setContentImageCount(restoredContentImages.length === 3 ? 3 : 2);
    setContentBlocks(getContentBlocks(draft).length ? getContentBlocks(draft) : createContentBlocks(draft));
    setCurrentDraft(withoutContentImages(draft));
    setGeneratedImage(draft.image_path ? { dataUrl: `/api/drafts/${encodeURIComponent(draft.id)}/image`, model: draft.image_model || "나노바나나" } : null);
    setExtensionDraftId(draft.id);
    setHandoffMessage("");
    setDraftSaveMessage("");
    setMessage("기존 생성 기록을 작업 화면에 불러왔습니다.");
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
      const response = await fetch("/api/titles/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, keywords }) });
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
      const response = await fetch("/api/drafts/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: existingBody, keywords: optimizationKeywords, personaId, customPersona }) });
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
      const response = await fetch("/api/drafts/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: existingBody }) });
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
      setContentBlocks(getContentBlocks(result.draft).length ? getContentBlocks(result.draft) : createContentBlocks(result.draft));
      setCurrentDraft(withoutContentImages(result.draft));
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

  async function prepareDraft(overrides?: { topic: string; keywords: string; selectedTitle: string; sourceContext?: string }) {
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
      const response = await fetch("/api/drafts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: draftTopic, keywords: draftKeywords, strategy, selectedTitle: draftTitle, personaId, customPersona, sourceContext: overrides?.sourceContext, provider: contentProvider, model: contentModel, experienceNote, naturalStyle, includeFaq }) });
      const result = await response.json() as { draft?: { id: string; title: string; body: string; seo_report?: Record<string, string> | null; created_at?: string }; error?: string };
      if (!response.ok) throw new Error(result.error || "블로그(원문) 생성에 실패했습니다.");
      const draft = result.draft;
      if (!draft) throw new Error("생성된 블로그(원문) 결과를 받지 못했습니다.");
      setExtensionDraftId(draft.id);
      setSelectedTitle(draft.title);
      const preparedDraft: DraftRecord = { ...draft, topic: draftTopic, keywords: draftKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean), strategy };
      setContentImages(getContentImages(preparedDraft));
      setContentBlocks(createContentBlocks(preparedDraft));
      setCurrentDraft(withoutContentImages(preparedDraft));
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
    if (currentDraft && (!currentDraft.image_path || contentImages.length < contentImageCount)) {
      const missing = [!currentDraft.image_path ? "대표 이미지" : null, contentImages.length < contentImageCount ? `본문 이미지 ${contentImageCount}장` : null].filter(Boolean).join(" · ");
      return setHandoffMessage(`${missing}이 준비되지 않아 전송하지 않았습니다. 새 글 만들기에서 이미지를 생성한 뒤 다시 전송해주세요.`);
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

  async function generateContentImages(draft: DraftRecord | null = currentDraft) {
    if (!draft) return setMessage("먼저 AI 블로그(원문)을 생성하거나 생성 기록에서 블로그(원문)을 선택해주세요.");
    setContentImagePending(true);
    setMessage(`AI가 본문 핵심 문장 ${contentImageCount}개를 고르고, 각 문장에 맞는 이미지를 생성하고 있습니다.`);
    try {
      const response = await fetch("/api/images/generate-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id, count: contentImageCount, model: imageModel }) });
      const result = await response.json() as { images?: ContentImage[]; error?: string };
      if (!response.ok || !result.images?.length) throw new Error(result.error || "본문 매칭 이미지를 생성하지 못했습니다.");
      setContentImages(result.images);
      setContentBlocks(createContentBlocks({ ...draft, seo_report: { ...(draft.seo_report ?? {}), contentImages: result.images } as unknown as Record<string, string> }, result.images));
      setCurrentDraft((current) => current?.id === draft.id ? withoutContentImages(current) : withoutContentImages(draft));
      setMessage(`본문 핵심 문장 ${contentImageCount}개와 매칭된 이미지가 생성되었습니다. 각 문장 바로 위에 전송됩니다.`);
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 매칭 이미지 생성에 실패했습니다.");
    } finally { setContentImagePending(false); }
  }

  async function regenerateContentImage(image: ContentImage) {
    if (!currentDraft) return;
    setRegeneratingContentImageSlot(image.slot);
    setMessage(`${image.slot.replace("content-", "")}번 본문 이미지만 다시 생성하고 있습니다.`);
    try {
      const response = await fetch("/api/images/regenerate-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: currentDraft.id, slot: image.slot, model: imageModel }) });
      const result = await response.json() as { image?: ContentImage; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "본문 이미지를 다시 생성하지 못했습니다.");
      const nextImages = contentImages.map((item) => item.slot === image.slot ? result.image! : item);
      setContentImages(nextImages);
      setCurrentDraft((current) => current ? { ...current, seo_report: { ...(current.seo_report ?? {}), contentImages: nextImages } as unknown as Record<string, string> } : current);
      setMessage(`${image.slot.replace("content-", "")}번 본문 이미지를 새로 생성했습니다. 기준 문장과 위치는 유지됩니다.`);
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 이미지를 다시 생성하지 못했습니다.");
    } finally {
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
    const blocksForSave = syncBodyFromBlocks(contentBlocks) === currentDraft.body
      ? contentBlocks
      : createContentBlocks(currentDraft, contentImages);
    setDraftSaving(true);
    if (!silent) setDraftSaveMessage("수정한 블로그(원문)을 저장하는 중...");
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(currentDraft.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: currentDraft.title, body: currentDraft.body, contentBlocks: blocksForSave }) });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "블로그(원문) 저장에 실패했습니다.");
      setContentImages(getContentImages(result.draft));
      setContentBlocks(getContentBlocks(result.draft).length ? getContentBlocks(result.draft) : createContentBlocks(result.draft));
      setCurrentDraft(withoutContentImages(result.draft));
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
  };
}

export type Studio = ReturnType<typeof useStudio>;
