"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DEFAULT_SEO_PERSONA_ID, SEO_PERSONAS } from "@/lib/ai/personas";

const strategies = [
  ["C-Rank 기본", "전문성과 실제 경험 중심의 일반 SEO 초안"],
  ["ALCON", "여러 검색 의도를 소제목별로 넓게 답하는 구성"],
  ["AEO", "첫 요약, 비교, FAQ 중심의 답변형 구조"],
  ["홈판 스토리", "공감되는 이야기 흐름과 읽기 체류를 고려한 구성"],
  ["인사이트 엣지", "좁은 주제를 깊게 다루고 실용적 판단 기준을 제시"],
];

type DraftRecord = {
  id: string;
  topic: string;
  keywords: string[];
  strategy?: string;
  title: string;
  body: string;
  seo_report?: Record<string, string> | null;
  created_at?: string;
  image_path?: string | null;
  image_model?: string | null;
  image_mime_type?: string | null;
  naver_input_status?: "not_started" | "in_progress" | "completed" | "failed";
  naver_input_completed_at?: string | null;
  naver_input_error?: string | null;
};

type ContentImage = { slot: "content-1" | "content-2"; sentence: string; prompt?: string; path?: string; mimeType?: string; model?: string };

function getContentImages(draft: DraftRecord | null): ContentImage[] {
  const images = (draft?.seo_report as unknown as { contentImages?: unknown } | null)?.contentImages;
  return Array.isArray(images) ? images.filter((item): item is ContentImage => typeof item === "object" && item !== null && "slot" in item && "sentence" in item) : [];
}

function withoutContentImages(draft: DraftRecord): DraftRecord {
  const report = { ...(draft.seo_report ?? {}) } as Record<string, unknown>;
  delete report.contentImages;
  return { ...draft, seo_report: report as Record<string, string> };
}

type RecommendedTitle = { title: string; intent?: string };

type ContentAnalysis = {
  topic: string;
  coreKeywords: string[];
  relatedKeywords: string[];
  searchIntent: string;
  targetReader: string;
  strengths: string[];
  improvements: string[];
  suggestedTitle: string;
  outline: string[];
};

type TitleRecommendationRecord = {
  id: string;
  topic: string;
  keywords: string;
  titles: RecommendedTitle[];
  selected_title?: string | null;
  created_at?: string;
  updated_at?: string;
};

const reportLabels: Record<string, string> = {
  searchIntent: "검색 의도",
  strength: "초안 강점",
  factCheck: "사실 확인",
  readability: "가독성",
  paragraphCount: "문단 수",
};

export default function StudioPage({ email }: { email: string }) {
  const [strategy, setStrategy] = useState(strategies[0][0]);
  const [activeMenu, setActiveMenu] = useState("title");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [message, setMessage] = useState("아직 생성된 초안이 없습니다.");
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
  const [historyPeriod, setHistoryPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [historyInputStatus, setHistoryInputStatus] = useState<"all" | "not_started" | "in_progress" | "completed" | "failed">("all");
  const [duplicatingDraftId, setDuplicatingDraftId] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<DraftRecord | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ dataUrl: string; model: string } | null>(null);
  const [contentImages, setContentImages] = useState<ContentImage[]>([]);
  const [contentImagePending, setContentImagePending] = useState(false);
  const [extensionDraftId, setExtensionDraftId] = useState<string | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState("");
  const selectedPersonaName = personaId === "custom"
    ? "커스텀 페르소나"
    : SEO_PERSONAS.find((persona) => persona.id === personaId)?.name ?? "정보 전달형 전문 에디터";

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
      const menu = hashParts.find((part) => ["title", "new-draft", "draft", "history"].includes(part));
      setActiveMenu(menu ?? "title");
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
    setContentImages(getContentImages(draft));
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
    if (!response.ok) return setMessage(result.error || "초안을 삭제하지 못했습니다.");
    setHistory((items) => items.filter((item) => item.id !== draft.id));
    if (extensionDraftId === draft.id) {
      setCurrentDraft(null);
      setContentImages([]);
      setGeneratedImage(null);
      setExtensionDraftId(null);
    }
    setMessage("생성한 초안과 대표 이미지를 삭제했습니다.");
  }

  async function duplicateDraft(draft: DraftRecord) {
    setDuplicatingDraftId(draft.id);
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}/duplicate`, { method: "POST" });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "초안을 복제하지 못했습니다.");
      setHistory((items) => [result.draft!, ...items]);
      reuseDraft(result.draft);
      setMessage(`초안을 복제해 편집 화면에 열었습니다: ${result.draft.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안을 복제하지 못했습니다.");
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
    setMessage(`생성 기록의 초안을 불러왔습니다: ${draft.title}`);
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
      if (!response.ok || !result.draft) throw new Error(result.error || "최적화한 초안을 저장하지 못했습니다.");
      setCurrentDraft(result.draft);
      setExtensionDraftId(result.draft.id);
      setSelectedTitle(result.draft.title);
      setTopic(result.draft.topic);
      setKeywords(result.draft.keywords.join(", "));
      setGeneratedImage(null);
      refreshHistory().catch(() => {});
      if (generateImageWithDraft) await generateImage(result.draft);
      if (generateContentImagesWithDraft) await generateContentImages(result.draft);
      setMessage("최적화한 글을 새 초안으로 저장했습니다.");
      openMenu("new-draft");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "최적화한 초안을 저장하지 못했습니다.");
    } finally { setDraftSaving(false); }
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
    setMessage("AI가 초안을 준비하고 있습니다. 잠시만 기다려주세요.");
    try {
      const response = await fetch("/api/drafts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: draftTopic, keywords: draftKeywords, strategy, selectedTitle: draftTitle, personaId, customPersona, sourceContext: overrides?.sourceContext }) });
      const result = await response.json() as { draft?: { id: string; title: string; body: string; seo_report?: Record<string, string> | null; created_at?: string }; error?: string };
      if (!response.ok) throw new Error(result.error || "초안 생성에 실패했습니다.");
      const draft = result.draft;
      if (!draft) throw new Error("생성된 초안 결과를 받지 못했습니다.");
      setExtensionDraftId(draft.id);
      setSelectedTitle(draft.title);
      const preparedDraft: DraftRecord = { ...draft, topic: draftTopic, keywords: draftKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean), strategy };
      setCurrentDraft(preparedDraft);
      setGeneratedImage(null);
      setHandoffMessage("");
      refreshHistory().catch(() => {});
      setMessage(`초안이 준비되었습니다: ${draft.title}`);
      return preparedDraft;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안 생성에 실패했습니다.");
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
    if (generateImageWithDraft) await generateImage(draft);
    if (generateContentImagesWithDraft) await generateContentImages(draft);
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
    if (generateImageWithDraft) await generateImage(draft);
    if (generateContentImagesWithDraft) await generateContentImages(draft);
    setTopic(analysisTopic);
    setKeywords(analysisKeywords);
    setSelectedTitle(draft.title);
    openMenu("new-draft");
  }

  async function sendDraftToExtension() {
    if (!extensionDraftId) return setHandoffMessage("생성 기록에서 초안을 먼저 선택해주세요.");
    if (currentDraft && !(await saveCurrentDraft(true))) return;
    setHandoffPending(true);
    setHandoffMessage("확장 프로그램 전송함에 초안을 준비하는 중...");
    try {
      const response = await fetch("/api/drafts/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: extensionDraftId }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "초안 전송 준비에 실패했습니다.");
      setHandoffMessage("확장 프로그램 전송함에 준비했습니다. Chrome 확장에서 ‘웹 초안 새로고침’ 후 불러오세요.");
    } catch (error) {
      setHandoffMessage(error instanceof Error ? error.message : "초안 전송 준비에 실패했습니다.");
    } finally {
      setHandoffPending(false);
    }
  }

  async function generateImage(draft: DraftRecord | null = currentDraft) {
    if (!draft || !(draft.topic || topic).trim()) return setMessage("먼저 AI 초안을 생성하거나 생성 기록에서 초안을 선택해주세요.");
    setImagePending(true);
    setMessage("나노바나나가 블로그 대표 이미지를 생성하고 있습니다.");
    try {
      const response = await fetch("/api/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id, topic: draft.topic || topic, title: draft.title, keywords: draft.keywords.join(", ") || keywords }) });
      const result = await response.json() as { image?: { dataUrl: string; model: string; path?: string; mimeType?: string }; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "이미지 생성에 실패했습니다.");
      setGeneratedImage(result.image);
      setCurrentDraft({ ...draft, image_path: result.image.path ?? null, image_model: result.image.model, image_mime_type: result.image.mimeType ?? null });
      setMessage("대표 이미지가 생성되었습니다. 다음 단계에서 네이버 편집기에 삽입할 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 생성에 실패했습니다.");
    } finally { setImagePending(false); }
  }

  async function generateContentImages(draft: DraftRecord | null = currentDraft) {
    if (!draft) return setMessage("먼저 AI 초안을 생성하거나 생성 기록에서 초안을 선택해주세요.");
    setContentImagePending(true);
    setMessage("AI가 본문 핵심 문장 2개를 고르고, 각 문장에 맞는 이미지를 생성하고 있습니다.");
    try {
      const response = await fetch("/api/images/generate-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id }) });
      const result = await response.json() as { images?: ContentImage[]; error?: string };
      if (!response.ok || !result.images?.length) throw new Error(result.error || "본문 매칭 이미지를 생성하지 못했습니다.");
      setContentImages(result.images);
      setCurrentDraft(withoutContentImages(draft));
      setMessage("본문 핵심 문장 2개와 매칭된 이미지가 생성되었습니다. 각 문장 바로 위에 전송됩니다.");
      refreshHistory().catch(() => {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 매칭 이미지 생성에 실패했습니다.");
    } finally { setContentImagePending(false); }
  }

  const activeHistoryDraft = history.find((draft) => draft.id === extensionDraftId);
  const filteredHistory = history.filter((draft) => {
    const query = historyQuery.trim().toLocaleLowerCase("ko-KR");
    const searchable = `${draft.title} ${draft.topic} ${draft.keywords.join(" ")}`.toLocaleLowerCase("ko-KR");
    if (query && !searchable.includes(query)) return false;
    const createdAt = draft.created_at ? new Date(draft.created_at) : new Date();
    const now = new Date();
    if (historyPeriod === "today" && createdAt.toDateString() !== now.toDateString()) return false;
    if (historyPeriod === "week" && createdAt.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) return false;
    if (historyPeriod === "month" && createdAt.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) return false;
    return historyInputStatus === "all" || (draft.naver_input_status ?? "not_started") === historyInputStatus;
  });

  async function saveCurrentDraft(silent = false) {
    if (!currentDraft) return false;
    setDraftSaving(true);
    if (!silent) setDraftSaveMessage("수정한 초안을 저장하는 중...");
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(currentDraft.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: currentDraft.title, body: currentDraft.body }) });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "초안 저장에 실패했습니다.");
      setContentImages(getContentImages(result.draft));
      setCurrentDraft(withoutContentImages(result.draft));
      setSelectedTitle(result.draft.title);
      refreshHistory().catch(() => {});
      if (!silent) setDraftSaveMessage("수정한 초안을 저장했습니다.");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "초안 저장에 실패했습니다.";
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

  return (
    <div className="studio-shell">
      <aside className="sidebar">
        <div>
          <div className="brand"><em>SEO블로그</em> 스튜디오</div>
          <div className="brand-sub">네이버 블로그 콘텐츠 제작 도우미</div>
        </div>
        <nav className="nav" aria-label="주 메뉴">
          <button type="button" className={`nav-link ${activeMenu === "title" ? "active" : ""}`} aria-current={activeMenu === "title" ? "page" : undefined} onClick={() => openMenu("title")}>제목 추천</button>
          <button type="button" className={`nav-link ${activeMenu === "new-draft" ? "active" : ""}`} aria-current={activeMenu === "new-draft" ? "page" : undefined} onClick={() => openMenu("new-draft")}>새 글 만들기</button>
          <button type="button" className={`nav-link ${activeMenu === "draft" ? "active" : ""}`} aria-current={activeMenu === "draft" ? "page" : undefined} onClick={() => openMenu("draft")}>기존 글 최적화</button>
          <button type="button" className={`nav-link ${activeMenu === "history" ? "active" : ""}`} aria-current={activeMenu === "history" ? "page" : undefined} onClick={() => openMenu("history")}>생성 기록</button>
          <a className="nav-link utility" href="/settings">API키등록·플랫폼연동</a>
        </nav>
        <div className="sidebar-account" title={email}>
          <span className="sidebar-account-label">로그인 계정</span>
          <strong>{email}</strong>
        </div>
        <div className="side-note">AI는 초안을 돕고, 사실 확인과 최종 발행은 주인님의 판단으로 완성합니다.</div>
      </aside>

      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Naver blog content studio</div>
            <h1>검색 의도를 읽고,<br />내 이야기로 작성해보세요.</h1>
            <p className="lede">주제 선정부터 SEO 검수까지 한 화면에서 준비합니다.</p>
          </div>
          <div className="account">AIMaster 계정 연동 전</div>
        </div>

        {activeMenu === "title" && <section className="title-recommendation" id="title">
          <section className="card title-input-section">
          <div className="card-head"><h2 className="card-title">제목 추천</h2><span className="card-caption">1 / 2 단계 · 검색 의도 기반</span></div>
          <p className="section-description">글의 주제와 핵심 키워드를 입력하면 AI가 제목을 제안합니다. 제목은 수정하거나 삭제할 수 있고, 하나를 선택해야 다음 단계로 이동할 수 있습니다.</p>
          <div className="field"><label htmlFor="topic">무슨 글을 쓰고 싶으신가요?</label><textarea id="topic" value={topic} onChange={(e) => { setTopic(e.target.value); setSelectedTitle(""); setRecommendedTitles([]); setTitleRecommendationId(null); }} placeholder="예: 서울 근교 당일치기 여행 코스 추천" /></div>
          <div className="field"><label htmlFor="keywords">핵심 키워드</label><input id="keywords" value={keywords} onChange={(e) => { setKeywords(e.target.value); setSelectedTitle(""); setRecommendedTitles([]); setTitleRecommendationId(null); }} placeholder="쉼표로 구분해 입력하세요" /></div>
          <p className="freshness-note">연도·통계·정책처럼 최신성 확인이 필요한 정보는 근거 없이 넣지 않습니다. 연도가 꼭 필요하면 주제 또는 키워드에 직접 입력하세요.</p>
          <button type="button" className="secondary" onClick={recommendTitles} disabled={titlePending}>{titlePending ? "추천 중..." : "AI 제목 추천 생성"}</button>
          </section>
          {titleRecommendations.length > 0 && <section className="saved-title-recommendations card"><div><strong>저장된 제목 추천 기록</strong><span>{titleRecommendations.length}건 · 30일 보관</span></div><div className="saved-title-recommendation-list">{titleRecommendations.map((recommendation) => <div key={recommendation.id} className={recommendation.id === titleRecommendationId ? "saved-title-recommendation selected" : "saved-title-recommendation"}><button type="button" onClick={() => loadTitleRecommendation(recommendation)}><strong>{recommendation.topic}</strong><small>{recommendation.selected_title || `${recommendation.titles.length}개 제목 저장됨`}</small></button><button type="button" className="text-button danger saved-title-delete" onClick={() => void deleteTitleRecommendation(recommendation)}>삭제</button></div>)}</div></section>}
          {recommendedTitles.length > 0 && <><section className="title-management card"><div className="title-management-head"><div><h3>생성된 제목 리스트</h3><p>{recommendedTitles.length}개 중 새 글에 사용할 제목을 하나 선택하세요.</p></div><span>{selectedTitle ? "제목 선택됨" : "제목을 선택해주세요"}</span></div><div className="title-list">{recommendedTitles.map((item, index) => <div key={`${item.title}-${index}`} className={`title-option ${selectedTitle === item.title ? "selected" : ""}`}>{editingTitleIndex === index ? <div className="title-edit-row"><input value={titleEditValue} onChange={(event) => setTitleEditValue(event.target.value)} aria-label="제목 수정" autoFocus /><button type="button" className="secondary compact" onClick={() => saveTitleEdit(index)}>저장</button><button type="button" className="text-button" onClick={() => setEditingTitleIndex(null)}>취소</button></div> : <><button type="button" className="title-select" onClick={() => selectRecommendedTitle(item.title)}><strong>{item.title}</strong><small>{item.intent || "검색 의도에 맞춘 제목"}</small></button><div className="title-option-actions"><button type="button" className="text-button" onClick={() => startTitleEdit(index)}>수정</button><button type="button" className="text-button danger" onClick={() => deleteRecommendedTitle(index)}>삭제</button></div></>}</div>)}</div></section><section className="title-strategy-section card"><div className="field"><label>글쓰기 전략</label><div className="strategy-grid">{strategies.map(([name, desc]) => <button type="button" key={name} className={`strategy ${strategy === name ? "selected" : ""}`} onClick={() => setStrategy(name)}><strong>{name}</strong><span>{desc}</span></button>)}</div></div><div className="field"><label htmlFor="persona">글쓰기 페르소나 선택</label><select id="persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>{SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}<option value="custom">✍️ 커스텀 페르소나 직접 입력</option></select><small>선택한 말투와 관점을 초안에 반영합니다. 사실이 아닌 체험담은 만들지 않습니다.</small></div>{personaId === "custom" && <div className="field"><label htmlFor="custom-persona">커스텀 페르소나</label><input id="custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} placeholder="예: 30대 초보 창업자에게 차분하게 설명하는 실무 멘토" /><small>말투, 독자 대상, 설명 방식 등을 500자 이내로 입력하세요.</small></div>}<label className="image-with-draft-option"><input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} /> <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 초안과 대표 이미지를 함께 생성합니다.</small></span></label><button type="button" className="primary" onClick={() => void createDraftFromSelectedTitle()} disabled={!selectedTitle || pending || imagePending || (personaId === "custom" && !customPersona.trim())}>{pending ? "AI 초안 생성 중..." : imagePending ? "대표 이미지 생성 중..." : "선택한 제목과 전략으로 AI 초안 생성하기"}</button></section></>}
        </section>}

        {activeMenu === "new-draft" && <><section className="card new-draft-card" id="new-draft">
          <div className="card-head"><h2 className="card-title">새 글 만들기</h2><span className="card-caption">2 / 2 단계 · 생성 및 수정</span></div>
          <p className="section-description">1번 단계에서 선택한 제목·대표 이미지·글쓰기 전략을 기준으로 생성된 초안을 검토하고 수정합니다.</p>
          <div className="selected-title-summary"><div><span>선택한 제목</span><strong>{selectedTitle || "제목을 먼저 선택해주세요."}</strong></div><button type="button" className="secondary compact" onClick={() => openMenu("title")}>제목 다시 선택</button></div>
          <div className="selected-title-summary"><div><span>선택한 글쓰기 전략</span><strong>{strategy}</strong></div></div>
          <div className="field"><label htmlFor="draft-persona">글쓰기 페르소나 선택</label><select id="draft-persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>{SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}<option value="custom">✍️ 커스텀 페르소나 직접 입력</option></select><small>선택한 말투와 관점을 본문 초안에 반영합니다. 사실이 아닌 체험담은 만들지 않습니다.</small></div>
          {personaId === "custom" && <div className="field"><label htmlFor="draft-custom-persona">커스텀 페르소나</label><input id="draft-custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} placeholder="예: 30대 초보 창업자에게 차분하게 설명하는 실무 멘토" /><small>말투, 독자 대상, 설명 방식을 500자 이내로 입력하세요.</small></div>}
          <div className="selected-title-summary"><div><span>선택한 글쓰기 페르소나</span><strong>{selectedPersonaName}</strong></div></div>
        </section>
        {currentDraft ? <section className="draft-result-card card" id="draft-result" aria-labelledby="draft-result-title"><div className="card-head"><div><h2 id="draft-result-title" className="card-title">생성된 초안</h2><p className="draft-result-subtitle">제목·이미지·본문을 검토하고 수정한 뒤 Chrome 확장 프로그램으로 보낼 수 있습니다.</p></div><span className="draft-ready-badge">초안 준비 완료</span></div><div className="draft-result-meta"><span>주제: {currentDraft.topic}</span><span>전략: {currentDraft.strategy || strategy}</span><span>키워드: {currentDraft.keywords.join(", ") || "없음"}</span></div><div className="draft-image-stage"><div><strong>대표 이미지</strong><p>선택한 제목을 바탕으로 나노바나나 AI 이미지를 생성합니다.</p></div><button type="button" className="secondary" onClick={() => void generateImage()} disabled={imagePending}>{imagePending ? "이미지 생성 중..." : generatedImage ? "대표 이미지 다시 생성" : "대표 이미지 생성 (나노바나나)"}</button>{generatedImage ? <div className="generated-image-preview"><Image src={generatedImage.dataUrl} alt="AI로 생성한 블로그 대표 이미지" width={1280} height={720} unoptimized /><div><span>생성 모델: {generatedImage.model}</span><a href={generatedImage.dataUrl} download="naver-blog-seo-studio-image.png">이미지 저장</a></div></div> : <p className="draft-image-empty">아직 대표 이미지가 없습니다. 필요할 경우 생성하면 Chrome 확장에서 본문과 함께 삽입할 수 있습니다.</p>}</div><div className="draft-result-grid"><article className="draft-content-preview"><div className="preview-label">제목</div><input className="draft-title-editor" value={currentDraft.title} onChange={(event) => setCurrentDraft({ ...currentDraft, title: event.target.value })} aria-label="초안 제목 수정" /><div className="preview-label">본문</div><textarea className="draft-body-editor" value={currentDraft.body} onChange={(event) => setCurrentDraft({ ...currentDraft, body: event.target.value })} aria-label="초안 본문 수정" /><div className="draft-content-actions"><button type="button" className="secondary" onClick={() => saveCurrentDraft()} disabled={draftSaving}>{draftSaving ? "저장 중..." : "수정한 초안 저장"}</button><button type="button" className="text-button" onClick={copyDraftText}>제목·본문 복사</button></div>{draftSaveMessage && <p className="draft-save-status" role="status">{draftSaveMessage}</p>}</article></div><div className="seo-report seo-report-bottom"><h3>SEO·사실 확인</h3>{Object.entries(currentDraft.seo_report ?? {}).length ? <dl>{Object.entries(currentDraft.seo_report ?? {}).map(([key, value]) => <div key={key}><dt>{reportLabels[key] ?? key}</dt><dd>{value}</dd></div>)}</dl> : <p>초안의 검색 의도와 사실 확인 항목을 직접 검토해주세요.</p>}</div><aside className="draft-actions-panel"><div className="result-action"><strong>Chrome 확장 전송</strong><p>확장 프로그램에서 제목·이미지·본문을 네이버 편집기로 입력합니다. 최종 발행은 직접 진행합니다.</p><button type="button" className="primary compact" onClick={sendDraftToExtension} disabled={handoffPending}>{handoffPending ? "전송 준비 중..." : "이 초안을 Chrome 확장으로 보내기"}</button>{handoffMessage && <p className="handoff-status" role="status">{handoffMessage}</p>}</div></aside></section> : <section className="draft-empty card"><h2 className="card-title">초안을 만들 준비가 되었습니다</h2><p>제목을 선택하고 글쓰기 전략을 고른 뒤 AI 초안을 생성해주세요.</p></section>}
        {currentDraft && <section className="draft-image-stage card" aria-labelledby="content-images-title">
          <div><strong id="content-images-title">본문 문장 매칭 이미지 2장</strong><p>AI가 본문에서 핵심 문장 2개를 고르고, 각 문장 바로 위에 이미지가 삽입되도록 준비합니다.</p></div>
          <label className="image-with-draft-option"><input type="checkbox" checked={generateContentImagesWithDraft} onChange={(event) => setGenerateContentImagesWithDraft(event.target.checked)} /> <span><strong>초안 생성 시 본문 이미지도 함께 생성</strong><small>활성화하면 대표 이미지와 별도로 핵심 문장 이미지 2장을 생성합니다.</small></span></label>
          <button type="button" className="secondary" onClick={() => void generateContentImages()} disabled={contentImagePending}>{contentImagePending ? "본문 이미지 생성 중..." : contentImages.length === 2 ? "본문 이미지 2장 다시 생성" : "본문 이미지 2장 생성"}</button>
          {contentImages.length === 2 && <div className="content-image-list">{contentImages.map((item, index) => <div className="generated-image-preview" key={item.slot}><strong>{index + 1}번 이미지가 들어갈 문장</strong><p>{item.sentence}</p><Image src={`/api/drafts/${encodeURIComponent(currentDraft.id)}/image?slot=${item.slot}`} alt={`${index + 1}번 본문 문장 매칭 이미지`} width={1280} height={720} unoptimized /></div>)}</div>}
        </section>}
        <section className="recent-drafts-card card" aria-labelledby="recent-drafts-title"><div className="card-head"><div><h2 id="recent-drafts-title" className="card-title">최근 생성한 초안</h2><p className="card-caption">새 글 만들기 화면에서 바로 다시 불러와 수정할 수 있습니다.</p></div><button type="button" className="history-refresh" onClick={() => openMenu("history")}>전체 생성 기록</button></div>{history.length === 0 ? <p className="history-empty">아직 생성한 초안이 없습니다.</p> : <div className="history-list">{history.slice(0, 5).map((draft) => <button type="button" key={draft.id} className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic}</small></span><time>{draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button>)}</div>}</section></>}

        {activeMenu === "draft" && <section className="optimize-card card" id="draft">
          <div className="card-head"><div><h2 className="card-title">기존 글 최적화</h2><p className="section-description">내 글을 다듬거나, 권한 있는 외부 글을 분석해 새로운 SEO 초안을 만듭니다.</p></div><span className="card-caption">3가지 작업 방식</span></div>
          <div className="optimize-tabs" role="tablist" aria-label="기존 글 작업 방식">
            <button type="button" role="tab" aria-selected={optimizeMode === "direct"} className={optimizeMode === "direct" ? "selected" : ""} onClick={() => setOptimizeMode("direct")}>내 글 바로 최적화</button>
            <button type="button" role="tab" aria-selected={optimizeMode === "analyze"} className={optimizeMode === "analyze" ? "selected" : ""} onClick={() => setOptimizeMode("analyze")}>붙여넣기 분석 후 재작성</button>
            <button type="button" role="tab" aria-selected={optimizeMode === "url"} className={optimizeMode === "url" ? "selected" : ""} onClick={() => setOptimizeMode("url")}>URL에서 가져와 재작성</button>
          </div>

          {optimizeMode === "url" && <div className="optimize-mode-panel">
            <div className="field"><label htmlFor="source-url">블로그 글 주소</label><input id="source-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://blog.naver.com/..." /></div>
            <p className="freshness-note">본문은 주제·키워드·구조 분석에만 임시 사용하며 서버에 원문을 보관하거나 문장을 그대로 복제하지 않습니다. 로그인·유료벽·접근 제한 글은 직접 붙여넣어주세요.</p>
            <button type="button" className="secondary" onClick={() => void extractFromUrl()} disabled={sourcePending}>{sourcePending ? "글 가져오는 중..." : "글 가져오기"}</button>
            {sourceTitle && <p className="source-result">가져온 글: <strong>{sourceTitle}</strong></p>}
            {existingBody && <><textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} aria-label="가져온 글 본문" /><button type="button" className="primary" onClick={() => void analyzeExisting()} disabled={analysisPending}>{analysisPending ? "핵심 분석 중..." : "핵심 분석 후 새 글 만들기"}</button></>}
          </div>}

          {optimizeMode === "direct" && <div className="optimize-mode-panel">
            <div className="field"><label htmlFor="optimization-history">내 생성 기록에서 불러오기</label><select id="optimization-history" value={optimizationDraftId} onChange={(event) => loadGeneratedDraftForOptimization(event.target.value)}><option value="">기존 글 가져오기</option>{history.map((draft) => <option key={draft.id} value={draft.id}>{draft.title} · {draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</option>)}</select><small>{history.length ? "선택하면 저장된 제목·본문·키워드를 가져옵니다. 최근 30일 기록을 표시합니다." : "최근 30일 안에 저장된 초안이 없습니다. 아래에 원문을 직접 붙여넣을 수 있습니다."}</small></div>
            <div className="field"><label htmlFor="optimize-keywords">보강할 핵심 키워드 (선택)</label><input id="optimize-keywords" value={optimizationKeywords} onChange={(event) => setOptimizationKeywords(event.target.value)} placeholder="쉼표로 구분해 입력하세요" /></div>
            <div className="field"><label htmlFor="optimize-persona">글쓰기 페르소나</label><select id="optimize-persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>{SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}<option value="custom">✍️ 커스텀 페르소나 직접 입력</option></select></div>
            {personaId === "custom" && <div className="field"><label htmlFor="optimize-custom-persona">커스텀 페르소나</label><input id="optimize-custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} placeholder="예: 초보자에게 차분하게 설명하는 실무 멘토" /></div>}
            <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="내가 작성한 기존 네이버 블로그 글을 붙여넣으세요 (50자 이상)" />
            <button type="button" className="secondary" onClick={() => void optimizeExisting()} disabled={optimizePending || (personaId === "custom" && !customPersona.trim())}>{optimizePending ? "최적화 중..." : "내 글 SEO 최적화"}</button>
            {optimized && <div className="optimize-result"><h3>{optimized.title}</h3><pre>{optimized.body}</pre><h4>개선한 점</h4><ul>{optimized.improvements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul><label className="image-with-draft-option"><input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} /> <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 초안과 대표 이미지를 함께 생성합니다.</small></span></label><button type="button" className="primary" onClick={() => void saveOptimizationAsDraft()} disabled={draftSaving || imagePending}>{draftSaving ? "초안 저장 중..." : imagePending ? "대표 이미지 생성 중..." : "이 결과를 초안으로 저장하고 편집하기"}</button></div>}
          </div>}

          {optimizeMode === "analyze" && <div className="optimize-mode-panel">
            <p className="freshness-note">원문에서 핵심 주제·핵심/연관 키워드·검색 의도·보완점을 먼저 추출합니다. 분석 결과는 수정할 수 있고, 원문을 그대로 복제하지 않는 새 초안을 생성합니다.</p>
            <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="분석할 기존 글을 붙여넣으세요 (50자 이상)" />
            <button type="button" className="secondary" onClick={() => void analyzeExisting()} disabled={analysisPending}>{analysisPending ? "핵심 분석 중..." : "핵심 주제·키워드 분석하기"}</button>
          </div>}

          {contentAnalysis && (optimizeMode === "analyze" || optimizeMode === "url") && <section className="analysis-result" aria-labelledby="analysis-result-title">
            <div><h3 id="analysis-result-title">원문 핵심 분석</h3><span>확인·수정 후 새 글을 생성하세요.</span></div>
            <div className="analysis-edit-grid"><div className="field"><label htmlFor="analysis-topic">핵심 주제</label><input id="analysis-topic" value={analysisTopic} onChange={(event) => setAnalysisTopic(event.target.value)} /></div><div className="field"><label htmlFor="analysis-keywords">핵심·연관 키워드</label><input id="analysis-keywords" value={analysisKeywords} onChange={(event) => setAnalysisKeywords(event.target.value)} /></div></div>
            <dl className="analysis-list"><div><dt>검색 의도</dt><dd>{contentAnalysis.searchIntent || "확인이 필요합니다."}</dd></div><div><dt>독자 대상</dt><dd>{contentAnalysis.targetReader || "확인이 필요합니다."}</dd></div><div><dt>추천 구조</dt><dd>{contentAnalysis.outline.join(" · ") || "글 구조를 직접 구성해주세요."}</dd></div><div><dt>기존 글 강점</dt><dd>{contentAnalysis.strengths.join(" · ") || "확인이 필요합니다."}</dd></div><div><dt>보완점</dt><dd>{contentAnalysis.improvements.join(" · ") || "확인이 필요합니다."}</dd></div></dl>
            <div className="field"><label htmlFor="analysis-persona">새 글 페르소나</label><select id="analysis-persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>{SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}<option value="custom">✍️ 커스텀 페르소나 직접 입력</option></select></div>
            {personaId === "custom" && <div className="field"><label htmlFor="analysis-custom-persona">커스텀 페르소나</label><input id="analysis-custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} /></div>}
            <label className="image-with-draft-option"><input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} /> <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 초안과 대표 이미지를 함께 생성합니다.</small></span></label>
            <button type="button" className="primary" onClick={() => void createDraftFromAnalysis()} disabled={pending || (personaId === "custom" && !customPersona.trim())}>{pending ? "새 글 생성 중..." : "이 분석으로 새로운 SEO 초안 만들기"}</button>
          </section>}
          <p className="optimization-safety">AI 결과는 초안입니다. 가격·날짜·정책·의학·법률 등 사실은 직접 확인하고, 네이버 최종 발행은 내용을 검토한 뒤 직접 진행하세요.</p>
        </section>}

        {activeMenu === "history" && <section className="history-card card" id="history">
          <div className="card-head"><div><h2 className="card-title">생성 기록</h2><p className="card-caption">최근 {history.length}건 · 생성일 기준 30일간 보관됩니다. 항목을 열어 수정하거나 복제할 수 있습니다.</p></div><button className="history-refresh" onClick={() => refreshHistory().catch(() => {})}>상태 새로고침</button></div>
          {history.length > 0 && <div className="history-controls"><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="제목·주제·키워드 검색" aria-label="생성 기록 검색" /><select value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value as typeof historyPeriod)} aria-label="생성 기간 필터"><option value="all">전체 기간</option><option value="today">오늘</option><option value="week">최근 7일</option><option value="month">최근 30일</option></select><select value={historyInputStatus} onChange={(event) => setHistoryInputStatus(event.target.value as typeof historyInputStatus)} aria-label="확장 입력 상태 필터"><option value="all">전체 상태</option><option value="not_started">미전송</option><option value="in_progress">입력 진행 중</option><option value="completed">입력 완료</option><option value="failed">재확인 필요</option></select></div>}
          {history.length === 0 ? <p className="history-empty">최근 30일 안에 저장된 초안이 없습니다.</p> : filteredHistory.length === 0 ? <p className="history-empty">조건에 맞는 생성 기록이 없습니다.</p> : <div className="history-list">{filteredHistory.map((draft) => <div className="history-row" key={draft.id}><button type="button" className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic} · {draft.keywords.join(", ") || "키워드 없음"}</small>{draft.naver_input_status === "completed" && <em className="input-state done">확장 입력 완료</em>}{draft.naver_input_status === "in_progress" && <em className="input-state pending">확장 입력 진행 중</em>}{draft.naver_input_status === "failed" && <em className="input-state failed">확장 입력 재확인 필요</em>}{(!draft.naver_input_status || draft.naver_input_status === "not_started") && <em className="input-state">미전송</em>}</span><time>{draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button><div className="history-actions"><button type="button" className="text-button" onClick={() => void duplicateDraft(draft)} disabled={duplicatingDraftId === draft.id}>{duplicatingDraftId === draft.id ? "복제 중..." : "복제"}</button><button type="button" className="text-button danger history-delete" onClick={() => void deleteDraft(draft)} aria-label={`${draft.title} 삭제`}>삭제</button></div></div>)}</div>}
          {activeHistoryDraft?.naver_input_status === "completed" && <p className="history-detail success">확장 입력 검증 완료{activeHistoryDraft.naver_input_completed_at ? ` · ${new Date(activeHistoryDraft.naver_input_completed_at).toLocaleString("ko-KR")}` : ""}. 네이버 최종 발행은 내용을 검토한 뒤 직접 진행하세요.</p>}
          {activeHistoryDraft?.naver_input_status === "failed" && <p className="history-detail error">확장 입력 재확인 필요: {activeHistoryDraft.naver_input_error || "입력 또는 검증 과정에서 오류가 발생했습니다."} 초안을 다시 확장으로 보낸 뒤 재시도할 수 있습니다.</p>}
        </section>}

        <div className="notice workspace-notice" role="status">{message}</div>
      </main>
    </div>
  );
}
