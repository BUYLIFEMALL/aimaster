"use client";

// BLC-08a (2026-10-22): 「자료부터 집필」 — 자료 모으기 → 근거 정리 → 남길 근거 승인 → 이 근거로 글 만들기.
// 기존 「새 글 만들기」·「기존 글 최적화」 경로는 그대로이며, 이 화면에서 만든 글만 승인한 근거를 사용한다.
import { useEffect, useState } from "react";
import { CONTENT_PROVIDER_LABELS, CONTENT_PROVIDERS, getContentModels, getDefaultContentModel, type ContentProvider } from "@/lib/ai/contentModels";
import type { GroundPoint, ResearchSource } from "@/lib/grounding";
import { SectionWriter } from "./SectionWriter";
import { StyleSelect } from "./StyleSelect";
import type { Studio } from "./useStudio";

type Research = { id: string; keyword: string; sources: ResearchSource[]; points: GroundPoint[]; angle: string | null; approved_at: string | null; approval_hash: string | null; approval_valid?: boolean; created_at: string };
const KIND_LABEL: Record<string, string> = { blog: "블로그", news: "뉴스", url: "직접 URL", memo: "내 메모" };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { research?: Research; dropped?: number; warnings?: string[]; error?: string };
  if (!response.ok || !result.research) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result;
}

const OPEN_KEY = "seo-research-open";

export function ResearchView({ s }: { s: Studio }) {
  const { contentProvider, setContentProvider, contentModel, setContentModel, prepareDraft, openMenu, setTopic, setKeywords, pending } = s;
  const [keyword, setKeyword] = useState("");
  const [urlText, setUrlText] = useState("");
  const [memo, setMemo] = useState("");
  const [research, setResearch] = useState<Research | null>(null);
  const [keep, setKeep] = useState<Set<number>>(new Set());
  const [recent, setRecent] = useState<Research[]>([]);
  const [busy, setBusy] = useState<"" | "collect" | "analyze" | "approve" | "write">("");
  const [notice, setNotice] = useState("");

  const load = (item: Research | null) => {
    setResearch(item);
    setKeep(new Set((item?.points ?? []).map((p, i) => (p.kept ? i : -1)).filter((i) => i >= 0)));
    // v1.95: 메뉴를 옮겼다 돌아와도 같은 자료를 다시 열도록 이 탭에만 기억(실패하면 기억 없이 동작)
    try { if (item) sessionStorage.setItem(OPEN_KEY, item.id); else sessionStorage.removeItem(OPEN_KEY); } catch {}
  };
  useEffect(() => {
    fetch("/api/research").then((r) => r.json()).then((d: { research?: Research[] }) => {
      const list = d.research ?? [];
      setRecent(list);
      let openId: string | null = null;
      try { openId = sessionStorage.getItem(OPEN_KEY); } catch {}
      const item = openId ? list.find((r) => r.id === openId) : undefined;
      if (item) load(item);
    }).catch(() => {});
  }, []);

  async function run(step: typeof busy, task: () => Promise<void>) {
    setBusy(step); setNotice("");
    try { await task(); } catch (error) { setNotice(error instanceof Error ? error.message : "처리하지 못했습니다."); } finally { setBusy(""); }
  }
  const collect = () => run("collect", async () => {
    const urls = urlText.split(/\s+/).filter(Boolean);
    const result = await post("/api/research", { keyword, urls, memo });
    load(result.research!); setRecent((list) => [result.research!, ...list.filter((r) => r.id !== result.research!.id)]);
    setNotice(`자료 ${result.research!.sources.length}건을 모았습니다.${result.warnings?.length ? ` (${result.warnings.join(" / ")})` : ""}`);
  });
  const analyze = () => research && run("analyze", async () => {
    const result = await post(`/api/research/${research.id}/analyze`, { provider: contentProvider, model: contentModel });
    load(result.research!);
    setNotice(`근거 ${result.research!.points.length}개를 정리했습니다.${result.dropped ? ` 자료에서 인용을 확인하지 못했거나 원문을 그대로 옮긴 ${result.dropped}개는 뺐습니다.` : ""}`);
  });
  const approve = (revoke = false) => research && run("approve", async () => {
    const result = await post(`/api/research/${research.id}/approve`, revoke ? { revoke: true } : { keep: [...keep] });
    load(result.research!);
    setNotice(revoke ? "승인을 풀었습니다. 근거를 다시 고른 뒤 승인해주세요." : `근거 ${[...keep].length}개를 승인했습니다. 이제 이 근거로 글을 만들 수 있습니다.`);
  });
  const write = () => research && run("write", async () => {
    setTopic(research.keyword); setKeywords(research.keyword);
    const draft = await prepareDraft({ topic: research.keyword, keywords: research.keyword, selectedTitle: "", researchId: research.id });
    if (draft) openMenu("new-draft");
  });

  // 서버가 생성 때와 같은 규칙으로 계산한 승인 유효 여부. 승인 시각은 있는데 무효면 승인 뒤 근거가 바뀐 것이다.
  const approved = Boolean(research?.approval_valid);
  const stale = Boolean(research?.approved_at) && !approved;
  const sourceTitle = (n: number) => research?.sources.find((src) => src.n === n);

  return (
    <section className="card" id="research">
      <div className="card-head"><h2 className="card-title">자료부터 집필</h2><span className="card-caption">자료 → 근거 승인 → 글 만들기</span></div>
      <p className="section-description">검색어로 네이버 블로그 상위 글·뉴스를 모으고(본인 네이버 검색 키), 직접 넣은 공개 URL·메모도 자료로 씁니다. AI가 정리한 근거 중 <strong>남길 것만 승인</strong>하면, 그 근거만 사실로 사용해 새 글을 만듭니다.</p>
      <p className="freshness-note">근거 확인은 「인용한 구절이 그 자료에 실제로 있는지」만 봅니다. 전체 사실 확인이나 표절 판정이 아니니, 발행 전에 직접 확인해주세요.</p>

      <div className="field"><label htmlFor="research-keyword">① 검색어</label><input id="research-keyword" value={keyword} maxLength={60} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 가을 캠핑 준비물" /></div>
      <div className="field"><label htmlFor="research-urls">직접 넣을 공개 URL (선택, 최대 3개 · 띄어쓰기나 줄바꿈으로 구분)</label><textarea id="research-urls" rows={2} value={urlText} onChange={(e) => setUrlText(e.target.value)} placeholder="https://..." /></div>
      <div className="field"><label htmlFor="research-memo">내 메모 (선택, 2,000자 이내)</label><textarea id="research-memo" rows={3} maxLength={2000} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="내가 직접 확인한 사실·경험" /></div>
      <button type="button" className="primary" disabled={!keyword.trim() || Boolean(busy)} onClick={collect}>{busy === "collect" ? "자료를 모으는 중..." : "자료 모으기"}</button>

      {recent.length > 0 && <div className="field"><label htmlFor="research-recent">최근 자료 다시 열기 (30일 보관)</label>
        <select id="research-recent" value={research?.id ?? ""} onChange={(e) => load(recent.find((r) => r.id === e.target.value) ?? null)}>
          <option value="">선택 안 함</option>
          {recent.map((r) => <option key={r.id} value={r.id}>{r.keyword} · 자료 {r.sources.length}건 · {r.approval_valid ? "승인됨" : r.approved_at ? "승인 뒤 바뀜" : r.points.length ? "근거 정리됨" : "자료만"} · {new Date(r.created_at).toLocaleDateString("ko-KR")}</option>)}
        </select></div>}

      {research && <>
        <h3 className="card-title">모은 자료 {research.sources.length}건 — {research.keyword}</h3>
        <ol>{research.sources.map((src) => <li key={src.n}>[{KIND_LABEL[src.kind] ?? src.kind}] {src.link ? <a href={src.link} target="_blank" rel="noreferrer">{src.title || src.link}</a> : src.title}{!src.ok && " (본문을 읽지 못해 요약만 사용)"}</li>)}</ol>

        <div className="field"><label htmlFor="research-provider">② 근거 정리 AI (본인 키 1회 사용)</label>
          <select id="research-provider" value={contentProvider} onChange={(e) => { const p = e.target.value as ContentProvider; setContentProvider(p); setContentModel(getDefaultContentModel(p)); }}>
            {CONTENT_PROVIDERS.map((p) => <option key={p} value={p}>{CONTENT_PROVIDER_LABELS[p]}</option>)}
          </select>
          <select aria-label="근거 정리 모델" value={contentModel} onChange={(e) => setContentModel(e.target.value)}>
            {getContentModels(contentProvider).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select></div>
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={analyze}>{busy === "analyze" ? "근거를 정리하는 중..." : research.points.length ? "근거 다시 정리(승인이 풀립니다)" : "근거 정리하기"}</button>

        {research.points.length > 0 && <>
          <h3 className="card-title">③ 남길 근거 고르기 {approved ? "· ✅ 승인됨" : stale ? "· ⚠️ 승인 뒤 바뀜 · 다시 승인 필요" : ""}</h3>
          {stale && <p className="freshness-note">승인한 뒤 근거 내용이 바뀌어 이 근거로는 글을 만들 수 없습니다. 남길 근거를 다시 확인하고 승인해주세요.</p>}
          {research.angle && <p className="section-description">글의 방향: {research.angle}</p>}
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>{research.points.map((p, i) => (
            <li key={i}><label><input type="checkbox" disabled={approved} checked={keep.has(i)} onChange={(e) => setKeep((set) => { const next = new Set(set); if (e.target.checked) next.add(i); else next.delete(i); return next; })} /> {p.text} <small>— 「{p.quote}」 ({sourceTitle(p.source)?.title || `자료 ${p.source}`})</small></label></li>
          ))}</ul>
          {approved
            ? <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => approve(true)}>승인 풀기</button>
            : <button type="button" className="primary" disabled={!keep.size || Boolean(busy)} onClick={() => approve(false)}>{busy === "approve" ? "승인하는 중..." : `근거 ${keep.size}개 승인`}</button>}
        </>}

        {approved && <div className="field"><p className="section-description">④ 승인한 근거만 사실로 사용해 「{research.keyword}」 글을 만듭니다. 생성 AI·페르소나·전략은 「새 글 만들기」 설정을 따릅니다. 대표·본문 이미지는 만들지 않으니 필요하면 다음 화면에서 만드세요.</p>
          <StyleSelect value={s.selectedStyleId} onChange={s.setSelectedStyleId} onManage={() => openMenu("my-style")} />
          <button type="button" className="primary" disabled={Boolean(busy) || pending} onClick={write}>{busy === "write" || pending ? "글을 만드는 중..." : "이 근거로 글 만들기"}</button></div>}
        {approved && <SectionWriter key={research.id} s={s} researchId={research.id} />}
      </>}

      {notice && <div className="notice" role="status">{notice}</div>}
    </section>
  );
}
