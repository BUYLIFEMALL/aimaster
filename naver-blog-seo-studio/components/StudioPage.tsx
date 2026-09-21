"use client";

import { useEffect, useState } from "react";

const strategies = [
  ["C-Rank 기본", "전문성과 경험 중심"],
  ["ALCON", "검색 의도 확장"],
  ["AEO", "AI 브리핑 구조"],
  ["홈판 스토리", "공감과 체류시간"],
  ["인사이트 엣지", "좁고 깊은 관점"],
];

export default function StudioPage({ email }: { email: string }) {
  const [strategy, setStrategy] = useState(strategies[0][0]);
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
  const [history, setHistory] = useState<{ id: string; topic: string; keywords: string[]; title: string; body: string; created_at: string }[]>([]);

  useEffect(() => {
    fetch("/api/drafts/history").then((response) => response.ok ? response.json() : { drafts: [] }).then((result: { drafts?: typeof history }) => setHistory(result.drafts ?? [])).catch(() => setHistory([]));
  }, []);

  function reuseDraft(draft: (typeof history)[number]) {
    setTopic(draft.topic);
    setKeywords(Array.isArray(draft.keywords) ? draft.keywords.join(", ") : "");
    setSelectedTitle(draft.title);
    setExistingBody(draft.body);
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
      const result = await response.json() as { draft?: { title: string; body: string }; error?: string };
      if (!response.ok) throw new Error(result.error || "초안 생성에 실패했습니다.");
      setMessage(`초안이 준비되었습니다: ${result.draft?.title ?? "제목 없음"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안 생성에 실패했습니다.");
    } finally {
      setPending(false);
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
          <button className="nav-link active">새 글 만들기</button>
          <button className="nav-link">제목 추천</button>
          <button className="nav-link">기존 글 최적화</button>
          <button className="nav-link">생성 기록</button>
          <button className="nav-link">API키등록·플랫폼연동</button>
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

        <div className="title-recommendation card">
          <div className="card-head"><h2 className="card-title">제목 추천</h2><span className="card-caption">검색 의도 기반 5개</span></div>
          <button className="secondary" onClick={recommendTitles} disabled={titlePending}>{titlePending ? "추천 중..." : "AI 제목 추천"}</button>
          {recommendedTitles.length > 0 && <div className="title-list">{recommendedTitles.map((item, index) => <button key={`${item.title}-${index}`} className={`title-option ${selectedTitle === item.title ? "selected" : ""}`} onClick={() => setSelectedTitle(item.title)}><strong>{item.title}</strong><small>{item.intent || "검색 의도에 맞춘 제목"}</small></button>)}</div>}
        </div>

        <section className="optimize-card card">
          <div className="card-head"><h2 className="card-title">기존 글 최적화</h2><span className="card-caption">의미는 유지하고 SEO 개선</span></div>
          <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="기존 네이버 블로그 글을 붙여넣으세요 (50자 이상)" />
          <button className="secondary" onClick={optimizeExisting} disabled={optimizePending}>{optimizePending ? "최적화 중..." : "기존 글 최적화"}</button>
          {optimized && <div className="optimize-result"><h3>{optimized.title}</h3><pre>{optimized.body}</pre><ul>{optimized.improvements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>}
        </section>

        <section className="history-card card" id="history">
          <div className="card-head"><h2 className="card-title">생성 기록</h2><span className="card-caption">최근 {history.length}건</span></div>
          {history.length === 0 ? <p className="history-empty">아직 저장된 초안이 없습니다.</p> : <div className="history-list">{history.map((draft) => <button key={draft.id} className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic}</small></span><time>{new Date(draft.created_at).toLocaleDateString("ko-KR")}</time></button>)}</div>}
        </section>

        <div className="workspace">
          <section className="card">
            <div className="card-head"><h2 className="card-title">새 글 기획</h2><span className="card-caption">1 / 3 단계</span></div>
            <div className="field"><label htmlFor="topic">무슨 글을 쓰고 싶으신가요?</label><textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 서울 근교 당일치기 여행 코스 추천" /></div>
            <div className="field"><label htmlFor="keywords">핵심 키워드</label><input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="쉼표로 구분해 입력하세요" /></div>
            <div className="field"><label>글쓰기 전략</label><div className="strategy-grid">{strategies.map(([name, desc]) => <button key={name} className={`strategy ${strategy === name ? "selected" : ""}`} onClick={() => setStrategy(name)}><strong>{name}</strong><span>{desc}</span></button>)}</div></div>
            <button className="primary" onClick={prepareDraft} disabled={pending}>{pending ? "초안 생성 중..." : "AI 초안 생성하기"}</button>
          </section>

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
