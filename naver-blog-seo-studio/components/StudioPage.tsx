"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
  naver_input_status?: "not_started" | "in_progress" | "completed" | "failed";
  naver_input_completed_at?: string | null;
  naver_input_error?: string | null;
};

type RecommendedTitle = { title: string; intent?: string };

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
  const [generateImageWithDraft, setGenerateImageWithDraft] = useState(true);
  const [editingTitleIndex, setEditingTitleIndex] = useState<number | null>(null);
  const [titleEditValue, setTitleEditValue] = useState("");
  const [existingBody, setExistingBody] = useState("");
  const [optimizePending, setOptimizePending] = useState(false);
  const [optimized, setOptimized] = useState<{ title: string; body: string; improvements: string[] } | null>(null);
  const [history, setHistory] = useState<DraftRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DraftRecord | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ dataUrl: string; model: string } | null>(null);
  const [extensionDraftId, setExtensionDraftId] = useState<string | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState("");

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
    setCurrentDraft(draft);
    setGeneratedImage(null);
    setExtensionDraftId(draft.id);
    setHandoffMessage("");
    setDraftSaveMessage("");
    setMessage("기존 생성 기록을 작업 화면에 불러왔습니다.");
    openMenu("new-draft");
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
      const response = await fetch("/api/drafts/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: existingBody, keywords }) });
      const result = await response.json() as { result?: { title: string; body: string; improvements: string[] }; error?: string };
      if (!response.ok) throw new Error(result.error || "기존 글 최적화에 실패했습니다.");
      setOptimized(result.result ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기존 글 최적화에 실패했습니다.");
    } finally { setOptimizePending(false); }
  }

  async function prepareDraft() {
    if (!topic.trim()) {
      setMessage("먼저 글 주제를 입력해주세요.");
      return;
    }
    setPending(true);
    setMessage("AI가 초안을 준비하고 있습니다. 잠시만 기다려주세요.");
    try {
      const response = await fetch("/api/drafts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, keywords, strategy, selectedTitle }) });
      const result = await response.json() as { draft?: { id: string; title: string; body: string; seo_report?: Record<string, string> | null; created_at?: string }; error?: string };
      if (!response.ok) throw new Error(result.error || "초안 생성에 실패했습니다.");
      const draft = result.draft;
      if (!draft) throw new Error("생성된 초안 결과를 받지 못했습니다.");
      setExtensionDraftId(draft.id);
      setSelectedTitle(draft.title);
      const preparedDraft: DraftRecord = { ...draft, topic, keywords: keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean), strategy };
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
      const response = await fetch("/api/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: draft.topic || topic, title: draft.title, keywords: draft.keywords.join(", ") || keywords }) });
      const result = await response.json() as { image?: { dataUrl: string; model: string }; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "이미지 생성에 실패했습니다.");
      setGeneratedImage(result.image);
      setMessage("대표 이미지가 생성되었습니다. 다음 단계에서 네이버 편집기에 삽입할 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 생성에 실패했습니다.");
    } finally { setImagePending(false); }
  }

  const activeHistoryDraft = history.find((draft) => draft.id === extensionDraftId);

  async function saveCurrentDraft(silent = false) {
    if (!currentDraft) return false;
    setDraftSaving(true);
    if (!silent) setDraftSaveMessage("수정한 초안을 저장하는 중...");
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(currentDraft.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: currentDraft.title, body: currentDraft.body }) });
      const result = await response.json() as { draft?: DraftRecord; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "초안 저장에 실패했습니다.");
      setCurrentDraft(result.draft);
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
          {titleRecommendations.length > 0 && <section className="saved-title-recommendations card"><div><strong>저장된 제목 추천 기록</strong><span>{titleRecommendations.length}건</span></div><div className="saved-title-recommendation-list">{titleRecommendations.map((recommendation) => <div key={recommendation.id} className={recommendation.id === titleRecommendationId ? "saved-title-recommendation selected" : "saved-title-recommendation"}><button type="button" onClick={() => loadTitleRecommendation(recommendation)}><strong>{recommendation.topic}</strong><small>{recommendation.selected_title || `${recommendation.titles.length}개 제목 저장됨`}</small></button><button type="button" className="text-button danger saved-title-delete" onClick={() => void deleteTitleRecommendation(recommendation)}>삭제</button></div>)}</div></section>}
          {recommendedTitles.length > 0 && <><section className="title-management card"><div className="title-management-head"><div><h3>생성된 제목 리스트</h3><p>{recommendedTitles.length}개 중 새 글에 사용할 제목을 하나 선택하세요.</p></div><span>{selectedTitle ? "제목 선택됨" : "제목을 선택해주세요"}</span></div><div className="title-list">{recommendedTitles.map((item, index) => <div key={`${item.title}-${index}`} className={`title-option ${selectedTitle === item.title ? "selected" : ""}`}>{editingTitleIndex === index ? <div className="title-edit-row"><input value={titleEditValue} onChange={(event) => setTitleEditValue(event.target.value)} aria-label="제목 수정" autoFocus /><button type="button" className="secondary compact" onClick={() => saveTitleEdit(index)}>저장</button><button type="button" className="text-button" onClick={() => setEditingTitleIndex(null)}>취소</button></div> : <><button type="button" className="title-select" onClick={() => selectRecommendedTitle(item.title)}><strong>{item.title}</strong><small>{item.intent || "검색 의도에 맞춘 제목"}</small></button><div className="title-option-actions"><button type="button" className="text-button" onClick={() => startTitleEdit(index)}>수정</button><button type="button" className="text-button danger" onClick={() => deleteRecommendedTitle(index)}>삭제</button></div></>}</div>)}</div></section><section className="title-strategy-section card"><div className="field"><label>글쓰기 전략</label><div className="strategy-grid">{strategies.map(([name, desc]) => <button type="button" key={name} className={`strategy ${strategy === name ? "selected" : ""}`} onClick={() => setStrategy(name)}><strong>{name}</strong><span>{desc}</span></button>)}</div></div><label className="image-with-draft-option"><input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} /> <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 초안과 대표 이미지를 함께 생성합니다.</small></span></label><button type="button" className="primary" onClick={() => void createDraftFromSelectedTitle()} disabled={!selectedTitle || pending || imagePending}>{pending ? "AI 초안 생성 중..." : imagePending ? "대표 이미지 생성 중..." : "선택한 제목과 전략으로 AI 초안 생성하기"}</button></section></>}
        </section>}

        {activeMenu === "new-draft" && <><section className="card new-draft-card" id="new-draft">
          <div className="card-head"><h2 className="card-title">새 글 만들기</h2><span className="card-caption">2 / 2 단계 · 생성 및 수정</span></div>
          <p className="section-description">1번 단계에서 선택한 제목·대표 이미지·글쓰기 전략을 기준으로 생성된 초안을 검토하고 수정합니다.</p>
          <div className="selected-title-summary"><div><span>선택한 제목</span><strong>{selectedTitle || "제목을 먼저 선택해주세요."}</strong></div><button type="button" className="secondary compact" onClick={() => openMenu("title")}>제목 다시 선택</button></div>
          <div className="selected-title-summary"><div><span>선택한 글쓰기 전략</span><strong>{strategy}</strong></div></div>
        </section>
        {currentDraft ? <section className="draft-result-card card" id="draft-result" aria-labelledby="draft-result-title"><div className="card-head"><div><h2 id="draft-result-title" className="card-title">생성된 초안</h2><p className="draft-result-subtitle">제목·이미지·본문을 검토하고 수정한 뒤 Chrome 확장 프로그램으로 보낼 수 있습니다.</p></div><span className="draft-ready-badge">초안 준비 완료</span></div><div className="draft-result-meta"><span>주제: {currentDraft.topic}</span><span>전략: {currentDraft.strategy || strategy}</span><span>키워드: {currentDraft.keywords.join(", ") || "없음"}</span></div><div className="draft-image-stage"><div><strong>대표 이미지</strong><p>선택한 제목을 바탕으로 나노바나나 AI 이미지를 생성합니다.</p></div><button type="button" className="secondary" onClick={() => void generateImage()} disabled={imagePending}>{imagePending ? "이미지 생성 중..." : generatedImage ? "대표 이미지 다시 생성" : "나노바나나 대표 이미지 생성"}</button>{generatedImage ? <div className="generated-image-preview"><Image src={generatedImage.dataUrl} alt="AI로 생성한 블로그 대표 이미지" width={1280} height={720} unoptimized /><div><span>생성 모델: {generatedImage.model}</span><a href={generatedImage.dataUrl} download="naver-blog-seo-studio-image.png">이미지 저장</a></div></div> : <p className="draft-image-empty">아직 대표 이미지가 없습니다. 필요할 경우 생성하면 Chrome 확장에서 본문과 함께 삽입할 수 있습니다.</p>}</div><div className="draft-result-grid"><article className="draft-content-preview"><div className="preview-label">제목</div><input className="draft-title-editor" value={currentDraft.title} onChange={(event) => setCurrentDraft({ ...currentDraft, title: event.target.value })} aria-label="초안 제목 수정" /><div className="preview-label">본문</div><textarea className="draft-body-editor" value={currentDraft.body} onChange={(event) => setCurrentDraft({ ...currentDraft, body: event.target.value })} aria-label="초안 본문 수정" /><div className="draft-content-actions"><button type="button" className="secondary" onClick={() => saveCurrentDraft()} disabled={draftSaving}>{draftSaving ? "저장 중..." : "수정한 초안 저장"}</button><button type="button" className="text-button" onClick={copyDraftText}>제목·본문 복사</button></div>{draftSaveMessage && <p className="draft-save-status" role="status">{draftSaveMessage}</p>}</article><aside className="draft-actions-panel"><div className="result-action"><strong>Chrome 확장 전송</strong><p>확장 프로그램에서 제목·이미지·본문을 네이버 편집기로 입력합니다. 최종 발행은 직접 진행합니다.</p><button type="button" className="primary compact" onClick={sendDraftToExtension} disabled={handoffPending}>{handoffPending ? "전송 준비 중..." : "이 초안을 Chrome 확장으로 보내기"}</button>{handoffMessage && <p className="handoff-status" role="status">{handoffMessage}</p>}</div></aside></div><div className="seo-report seo-report-bottom"><h3>SEO·사실 확인</h3>{Object.entries(currentDraft.seo_report ?? {}).length ? <dl>{Object.entries(currentDraft.seo_report ?? {}).map(([key, value]) => <div key={key}><dt>{reportLabels[key] ?? key}</dt><dd>{value}</dd></div>)}</dl> : <p>초안의 검색 의도와 사실 확인 항목을 직접 검토해주세요.</p>}</div></section> : <section className="draft-empty card"><h2 className="card-title">초안을 만들 준비가 되었습니다</h2><p>제목을 선택하고 글쓰기 전략을 고른 뒤 AI 초안을 생성해주세요.</p></section>}
        <section className="recent-drafts-card card" aria-labelledby="recent-drafts-title"><div className="card-head"><div><h2 id="recent-drafts-title" className="card-title">최근 생성한 초안</h2><p className="card-caption">새 글 만들기 화면에서 바로 다시 불러와 수정할 수 있습니다.</p></div><button type="button" className="history-refresh" onClick={() => openMenu("history")}>전체 생성 기록</button></div>{history.length === 0 ? <p className="history-empty">아직 생성한 초안이 없습니다.</p> : <div className="history-list">{history.slice(0, 5).map((draft) => <button type="button" key={draft.id} className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic}</small></span><time>{draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button>)}</div>}</section></>}

        {activeMenu === "draft" && <section className="optimize-card card" id="draft">
          <div className="card-head"><h2 className="card-title">기존 글 최적화</h2><span className="card-caption">의미는 유지하고 SEO 개선</span></div>
          <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="기존 네이버 블로그 글을 붙여넣으세요 (50자 이상)" />
          <button className="secondary" onClick={optimizeExisting} disabled={optimizePending}>{optimizePending ? "최적화 중..." : "기존 글 최적화"}</button>
          {optimized && <div className="optimize-result"><h3>{optimized.title}</h3><pre>{optimized.body}</pre><ul>{optimized.improvements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
        </section>}

        {activeMenu === "history" && <section className="history-card card" id="history">
          <div className="card-head"><h2 className="card-title">생성 기록</h2><span className="card-caption">최근 {history.length}건</span><button className="history-refresh" onClick={() => refreshHistory().catch(() => {})}>상태 새로고침</button></div>
          {history.length === 0 ? <p className="history-empty">아직 저장된 초안이 없습니다.</p> : <div className="history-list">{history.map((draft) => <button key={draft.id} className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic}</small>{draft.naver_input_status === "completed" && <em className="input-state done">확장 입력 완료</em>}{draft.naver_input_status === "in_progress" && <em className="input-state pending">확장 입력 진행 중</em>}{draft.naver_input_status === "failed" && <em className="input-state failed">확장 입력 재확인 필요</em>}</span><time>{draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button>)}</div>}
          {activeHistoryDraft?.naver_input_status === "completed" && <p className="history-detail success">확장 입력 검증 완료{activeHistoryDraft.naver_input_completed_at ? ` · ${new Date(activeHistoryDraft.naver_input_completed_at).toLocaleString("ko-KR")}` : ""}. 네이버 최종 발행은 내용을 검토한 뒤 직접 진행하세요.</p>}
          {activeHistoryDraft?.naver_input_status === "failed" && <p className="history-detail error">확장 입력 재확인 필요: {activeHistoryDraft.naver_input_error || "입력 또는 검증 과정에서 오류가 발생했습니다."} 초안을 다시 확장으로 보낸 뒤 재시도할 수 있습니다.</p>}
        </section>}

        <div className="notice workspace-notice" role="status">{message}</div>
      </main>
    </div>
  );
}
