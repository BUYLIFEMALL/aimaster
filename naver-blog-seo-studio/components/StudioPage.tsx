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
  title: string;
  body: string;
  seo_report?: Record<string, string> | null;
  created_at?: string;
  naver_input_status?: "not_started" | "in_progress" | "completed" | "failed";
  naver_input_completed_at?: string | null;
  naver_input_error?: string | null;
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
  const [recommendedTitles, setRecommendedTitles] = useState<{ title: string; intent?: string }[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [existingBody, setExistingBody] = useState("");
  const [optimizePending, setOptimizePending] = useState(false);
  const [optimized, setOptimized] = useState<{ title: string; body: string; improvements: string[] } | null>(null);
  const [history, setHistory] = useState<DraftRecord[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DraftRecord | null>(null);
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
  }, []);

  useEffect(() => {
    const sections = ["new-draft", "title", "draft", "history"].map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveMenu(visible.target.id);
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0.05, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function moveToSection(id: string) {
    setActiveMenu(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reuseDraft(draft: (typeof history)[number]) {
    setTopic(draft.topic);
    setKeywords(Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "");
    setSelectedTitle(draft.title);
    setCurrentDraft(draft);
    setGeneratedImage(null);
    setExtensionDraftId(draft.id);
    setHandoffMessage("");
    setMessage("기존 생성 기록을 작업 화면에 불러왔습니다.");
  }

  async function recommendTitles() {
    if (!topic.trim()) return setMessage("주제를 먼저 입력해주세요.");
    setTitlePending(true);
    try {
      const response = await fetch("/api/titles/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, keywords }) });
      const result = await response.json() as { titles?: { title: string; intent?: string }[]; error?: string };
      if (!response.ok) throw new Error(result.error || "제목 추천에 실패했습니다.");
      setRecommendedTitles(result.titles ?? []);
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
      setCurrentDraft({ ...draft, topic, keywords: keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean) });
      setGeneratedImage(null);
      setHandoffMessage("");
      refreshHistory().catch(() => {});
      setMessage(`초안이 준비되었습니다: ${draft.title}`);
      requestAnimationFrame(() => document.getElementById("draft-result")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안 생성에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function sendDraftToExtension() {
    if (!extensionDraftId) return setHandoffMessage("생성 기록에서 초안을 먼저 선택해주세요.");
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

  async function generateImage() {
    if (!topic.trim() || !currentDraft) return setMessage("먼저 AI 초안을 생성하거나 생성 기록에서 초안을 선택해주세요.");
    setImagePending(true);
    setMessage("나노바나나가 블로그 대표 이미지를 생성하고 있습니다.");
    try {
      const response = await fetch("/api/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, title: currentDraft.title, keywords }) });
      const result = await response.json() as { image?: { dataUrl: string; model: string }; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "이미지 생성에 실패했습니다.");
      setGeneratedImage(result.image);
      setMessage("대표 이미지가 생성되었습니다. 다음 단계에서 네이버 편집기에 삽입할 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 생성에 실패했습니다.");
    } finally { setImagePending(false); }
  }

  const activeHistoryDraft = history.find((draft) => draft.id === extensionDraftId);

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
          <div className="brand"><em>SEO</em> 스튜디오</div>
          <div className="brand-sub">네이버 블로그 콘텐츠 제작 도우미</div>
        </div>
        <nav className="nav" aria-label="주 메뉴">
          <button type="button" className={`nav-link ${activeMenu === "title" ? "active" : ""}`} aria-current={activeMenu === "title" ? "page" : undefined} onClick={() => moveToSection("title")}>제목 추천</button>
          <button type="button" className={`nav-link ${activeMenu === "new-draft" ? "active" : ""}`} aria-current={activeMenu === "new-draft" ? "page" : undefined} onClick={() => moveToSection("new-draft")}>새 글 만들기</button>
          <button type="button" className={`nav-link ${activeMenu === "draft" ? "active" : ""}`} aria-current={activeMenu === "draft" ? "page" : undefined} onClick={() => moveToSection("draft")}>기존 글 최적화</button>
          <button type="button" className={`nav-link ${activeMenu === "history" ? "active" : ""}`} aria-current={activeMenu === "history" ? "page" : undefined} onClick={() => moveToSection("history")}>생성 기록</button>
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

        <section className="title-recommendation card" id="title">
          <div className="card-head"><h2 className="card-title">제목 추천</h2><span className="card-caption">1 / 3 단계 · 검색 의도 기반 5개</span></div>
          <div className="field"><label htmlFor="topic">무슨 글을 쓰고 싶으신가요?</label><textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 서울 근교 당일치기 여행 코스 추천" /></div>
          <div className="field"><label htmlFor="keywords">핵심 키워드</label><input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="쉼표로 구분해 입력하세요" /></div>
          <p className="freshness-note">연도·통계·정책처럼 최신성 확인이 필요한 정보는 근거 없이 넣지 않습니다. 연도가 꼭 필요하면 주제 또는 키워드에 직접 입력하세요.</p>
          <button className="secondary" onClick={recommendTitles} disabled={titlePending}>{titlePending ? "추천 중..." : "AI 제목 추천"}</button>
          {recommendedTitles.length > 0 && <div className="title-list">{recommendedTitles.map((item, index) => <button key={`${item.title}-${index}`} className={`title-option ${selectedTitle === item.title ? "selected" : ""}`} onClick={() => setSelectedTitle(item.title)}><strong>{item.title}</strong><small>{item.intent || "검색 의도에 맞춘 제목"}</small></button>)}</div>}
        </section>

        <section className="card new-draft-card" id="new-draft">
          <div className="card-head"><h2 className="card-title">새 글 기획</h2><span className="card-caption">2 / 3 단계</span></div>
          <div className="field"><label>글쓰기 전략</label><div className="strategy-grid">{strategies.map(([name, desc]) => <button key={name} className={`strategy ${strategy === name ? "selected" : ""}`} onClick={() => setStrategy(name)}><strong>{name}</strong><span>{desc}</span></button>)}</div></div>
          <button className="primary" onClick={prepareDraft} disabled={pending}>{pending ? "초안 생성 중..." : "AI 초안 생성하기"}</button>
        </section>

        {currentDraft && <section className="draft-result-card card" id="draft-result" aria-labelledby="draft-result-title">
          <div className="card-head"><div><h2 id="draft-result-title" className="card-title">생성된 초안</h2><p className="draft-result-subtitle">검토 후 대표 이미지와 Chrome 확장 전송까지 이어서 진행하세요.</p></div><span className="draft-ready-badge">3 / 3 단계 · 준비 완료</span></div>
          <div className="draft-result-meta"><span>주제: {currentDraft.topic}</span><span>전략: {strategy}</span><span>키워드: {currentDraft.keywords.join(", ") || "없음"}</span></div>
          <div className="draft-image-stage">
            <div><strong>대표 이미지</strong><p>선택한 제목을 바탕으로 나노바나나 이미지를 생성합니다.</p></div>
            <button className="secondary" onClick={generateImage} disabled={imagePending}>{imagePending ? "이미지 생성 중..." : generatedImage ? "대표 이미지 다시 생성" : "나노바나나 이미지 생성"}</button>
            {generatedImage ? <div className="generated-image-preview"><Image src={generatedImage.dataUrl} alt="AI로 생성된 블로그 대표 이미지" width={1280} height={720} unoptimized /><div><span>생성 모델: {generatedImage.model}</span><a href={generatedImage.dataUrl} download="naver-blog-seo-studio-image.png">이미지 저장</a></div></div> : <p className="draft-image-empty">아직 대표 이미지가 없습니다. 필요한 경우 생성한 뒤 Chrome 확장에서 본문과 함께 삽입할 수 있습니다.</p>}
          </div>
          <div className="draft-result-grid">
            <article className="draft-content-preview"><div className="preview-label">제목</div><h3>{currentDraft.title}</h3><div className="preview-label">본문 미리보기</div><pre>{currentDraft.body}</pre><button type="button" className="secondary" onClick={copyDraftText}>제목·본문 복사</button></article>
            <aside className="draft-actions-panel">
              <div className="result-action"><strong>Chrome 확장 전송</strong><p>확장에서 제목·이미지·본문을 네이버 편집기로 입력합니다. 최종 발행은 직접 진행합니다.</p><button className="primary compact" onClick={sendDraftToExtension} disabled={handoffPending}>{handoffPending ? "전송 준비 중..." : "이 초안을 Chrome 확장으로 보내기"}</button>{handoffMessage && <p className="handoff-status" role="status">{handoffMessage}</p>}</div>
            </aside>
          </div>
          <div className="seo-report seo-report-bottom"><h3>SEO·사실 확인</h3>{Object.entries(currentDraft.seo_report ?? {}).length ? <dl>{Object.entries(currentDraft.seo_report ?? {}).map(([key, value]) => <div key={key}><dt>{reportLabels[key] ?? key}</dt><dd>{value}</dd></div>)}</dl> : <p>초안의 검색 의도와 사실 확인 항목을 직접 검토해주세요.</p>}</div>
        </section>}

        <section className="optimize-card card" id="draft">
          <div className="card-head"><h2 className="card-title">기존 글 최적화</h2><span className="card-caption">의미는 유지하고 SEO 개선</span></div>
          <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="기존 네이버 블로그 글을 붙여넣으세요 (50자 이상)" />
          <button className="secondary" onClick={optimizeExisting} disabled={optimizePending}>{optimizePending ? "최적화 중..." : "기존 글 최적화"}</button>
          {optimized && <div className="optimize-result"><h3>{optimized.title}</h3><pre>{optimized.body}</pre><ul>{optimized.improvements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
        </section>

        <section className="history-card card" id="history">
          <div className="card-head"><h2 className="card-title">생성 기록</h2><span className="card-caption">최근 {history.length}건</span><button className="history-refresh" onClick={() => refreshHistory().catch(() => {})}>상태 새로고침</button></div>
          {history.length === 0 ? <p className="history-empty">아직 저장된 초안이 없습니다.</p> : <div className="history-list">{history.map((draft) => <button key={draft.id} className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic}</small>{draft.naver_input_status === "completed" && <em className="input-state done">확장 입력 완료</em>}{draft.naver_input_status === "in_progress" && <em className="input-state pending">확장 입력 진행 중</em>}{draft.naver_input_status === "failed" && <em className="input-state failed">확장 입력 재확인 필요</em>}</span><time>{draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button>)}</div>}
          {activeHistoryDraft?.naver_input_status === "completed" && <p className="history-detail success">확장 입력 검증 완료{activeHistoryDraft.naver_input_completed_at ? ` · ${new Date(activeHistoryDraft.naver_input_completed_at).toLocaleString("ko-KR")}` : ""}. 네이버 최종 발행은 내용을 검토한 뒤 직접 진행하세요.</p>}
          {activeHistoryDraft?.naver_input_status === "failed" && <p className="history-detail error">확장 입력 재확인 필요: {activeHistoryDraft.naver_input_error || "입력 또는 검증 과정에서 오류가 발생했습니다."} 초안을 다시 확장으로 보낸 뒤 재시도할 수 있습니다.</p>}
        </section>

        <div className="workspace">
          <section className="card">
            <div className="card-head"><h2 className="card-title">품질 준비 체크</h2><span className="card-caption">초안 전 점검</span></div>
            <div className="checklist">
              <div className="check"><span className={`dot ${topic.trim() ? "done" : ""}`}>{topic.trim() ? "✓" : "1"}</span><div><strong>주제 입력</strong><p>독자가 얻어갈 한 가지를 먼저 정합니다.</p></div></div>
              <div className="check"><span className={`dot ${keywords.trim() ? "done" : ""}`}>{keywords.trim() ? "✓" : "2"}</span><div><strong>핵심 키워드</strong><p>억지 반복 없이 글의 방향을 잡습니다.</p></div></div>
              <div className="check"><span className="dot">3</span><div><strong>사실 확인</strong><p>AI 생성 후 직접 확인할 항목을 리포트로 제공합니다.</p></div></div>
              <div className="check"><span className="dot">4</span><div><strong>사람의 최종 발행</strong><p>네이버 발행 버튼은 자동으로 누르지 않습니다.</p></div></div>
            </div>
            <div className="notice" role="status">{message}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
