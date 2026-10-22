"use client";

// BLC-08b (2026-10-22): 「내 문체」 — 내 글(공개 RSS 또는 붙여 넣은 표본) → 문체 분석 → 승인. 승인한 문체는 「새 글 만들기」·「자료부터 집필」에서 고른다.
import { useEffect, useState } from "react";
import { CONTENT_PROVIDER_LABELS, CONTENT_PROVIDERS, getContentModels, getDefaultContentModel, type ContentProvider } from "@/lib/ai/contentModels";
import type { StyleProfile, StylePost } from "@/lib/style";
import type { Studio } from "./useStudio";

type Style = { id: string; name: string; blog_id: string | null; samples: string[]; posts: StylePost[]; profile: StyleProfile | null; approved_at: string | null; approval_valid?: boolean; created_at: string };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as { style?: Style; error?: string };
  if (!response.ok || !result.style) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result.style;
}

export function StyleView({ s }: { s: Studio }) {
  const { contentProvider, setContentProvider, contentModel, setContentModel, setSelectedStyleId, openMenu } = s;
  const [name, setName] = useState("");
  const [blog, setBlog] = useState("");
  const [depth, setDepth] = useState<5 | 10>(5);
  const [sampleText, setSampleText] = useState("");
  const [style, setStyle] = useState<Style | null>(null);
  const [list, setList] = useState<Style[]>([]);
  const [busy, setBusy] = useState<"" | "create" | "analyze" | "approve">("");
  const [notice, setNotice] = useState("");

  useEffect(() => { fetch("/api/styles").then((r) => r.json()).then((d: { styles?: Style[] }) => setList(d.styles ?? [])).catch(() => {}); }, []);
  const keep = (next: Style) => { setStyle(next); setList((l) => [next, ...l.filter((x) => x.id !== next.id)]); };
  async function run(step: typeof busy, task: () => Promise<void>) {
    setBusy(step); setNotice("");
    try { await task(); } catch (error) { setNotice(error instanceof Error ? error.message : "처리하지 못했습니다."); } finally { setBusy(""); }
  }
  const create = () => run("create", async () => {
    const samples = sampleText.split(/\n-{3,}\n/).map((x) => x.trim()).filter(Boolean);
    const next = await post("/api/styles", { name, blog, samples, depth });
    keep(next);
    setNotice(`문체 자료를 만들었습니다: 블로그 글 ${next.posts.length}개 · 표본 ${next.samples.length}개`);
  });
  const analyze = () => style && run("analyze", async () => { keep(await post(`/api/styles/${style.id}/analyze`, { provider: contentProvider, model: contentModel })); setNotice("문체를 분석했습니다. 내용을 확인하고 승인해주세요."); });
  const approve = (revoke = false) => style && run("approve", async () => {
    const next = await post(`/api/styles/${style.id}/approve`, revoke ? { revoke: true } : {});
    keep(next);
    if (!revoke) setSelectedStyleId(next.id);
    setNotice(revoke ? "승인을 풀었습니다." : "승인했습니다. 「새 글 만들기」·「자료부터 집필」의 「내 문체 적용」에서 고를 수 있습니다(지금 선택해 두었습니다).");
  });

  const p = style?.profile;
  const stale = Boolean(style?.approved_at) && !style?.approval_valid;
  return (
    <section className="card" id="my-style">
      <div className="card-head"><h2 className="card-title">내 문체</h2><span className="card-caption">내 글 → 분석 → 승인</span></div>
      <p className="section-description">내 블로그 공개 글이나 직접 붙여 넣은 글 표본으로 말투·문장·구성 습관을 분석합니다. 승인한 문체만 새 글에 적용되며, 기본은 「적용 안 함」입니다.</p>
      <p className="freshness-note">문체를 따라 쓰는 것은 읽는 느낌을 맞추기 위한 것이며 AI 탐지 회피를 약속하지 않습니다. 공개 글만 읽고, 자료와 분석은 30일 뒤 자동 삭제됩니다.</p>

      <div className="field"><label htmlFor="style-name">이름 (선택)</label><input id="style-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="예: 내 생활정보 블로그" /></div>
      <div className="field"><label htmlFor="style-blog">네이버 블로그 주소 또는 ID (선택)</label><input id="style-blog" value={blog} onChange={(e) => setBlog(e.target.value)} placeholder="https://blog.naver.com/아이디" />
        <select aria-label="가져올 최신 글 수" value={depth} onChange={(e) => setDepth(Number(e.target.value) === 10 ? 10 : 5)}><option value={5}>최신 글 5개</option><option value={10}>최신 글 10개</option></select></div>
      <div className="field"><label htmlFor="style-samples">내 글 표본 붙여넣기 (선택, 40자 이상 · 여러 개는 --- 줄로 구분, 최대 10개)</label><textarea id="style-samples" rows={5} value={sampleText} onChange={(e) => setSampleText(e.target.value)} placeholder={"첫 번째 글 본문\n---\n두 번째 글 본문"} /></div>
      <button type="button" className="primary" disabled={(!blog.trim() && !sampleText.trim()) || Boolean(busy)} onClick={create}>{busy === "create" ? "글을 가져오는 중..." : "문체 자료 만들기"}</button>

      {list.length > 0 && <div className="field"><label htmlFor="style-recent">내 문체 목록 (30일 보관)</label>
        <select id="style-recent" value={style?.id ?? ""} onChange={(e) => setStyle(list.find((x) => x.id === e.target.value) ?? null)}>
          <option value="">선택 안 함</option>
          {list.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.approval_valid ? "승인됨" : x.approved_at ? "승인 뒤 바뀜" : x.profile ? "분석됨" : "자료만"} · {new Date(x.created_at).toLocaleDateString("ko-KR")}</option>)}
        </select></div>}

      {style && <>
        <h3 className="card-title">{style.name} — 블로그 글 {style.posts.length}개 · 표본 {style.samples.length}개</h3>
        {style.posts.length > 0 && <ol>{style.posts.map((x, i) => <li key={i}><a href={x.link} target="_blank" rel="noreferrer">{x.title}</a></li>)}</ol>}
        <div className="field"><label htmlFor="style-provider">문체 분석 AI (본인 키 1회 사용)</label>
          <select id="style-provider" value={contentProvider} onChange={(e) => { const v = e.target.value as ContentProvider; setContentProvider(v); setContentModel(getDefaultContentModel(v)); }}>
            {CONTENT_PROVIDERS.map((v) => <option key={v} value={v}>{CONTENT_PROVIDER_LABELS[v]}</option>)}
          </select>
          <select aria-label="문체 분석 모델" value={contentModel} onChange={(e) => setContentModel(e.target.value)}>
            {getContentModels(contentProvider).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select></div>
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={analyze}>{busy === "analyze" ? "분석하는 중..." : p ? "다시 분석(승인이 풀립니다)" : "문체 분석하기"}</button>

        {p && <>
          <h3 className="card-title">분석 결과 {style.approval_valid ? "· ✅ 승인됨" : stale ? "· ⚠️ 승인 뒤 바뀜 · 다시 승인 필요" : ""}</h3>
          <dl>
            <dt>성격</dt><dd>{p.summary}</dd><dt>어조</dt><dd>{p.tone}</dd><dt>문장</dt><dd>{p.sentence}</dd><dt>구성</dt><dd>{p.structure}</dd><dt>독자</dt><dd>{p.reader}</dd>
            {p.expressions.length > 0 && <><dt>자주 쓰는 표현</dt><dd>{p.expressions.join(", ")}</dd></>}
            {p.avoid.length > 0 && <><dt>쓰지 않는 표현</dt><dd>{p.avoid.join(", ")}</dd></>}
            {p.cautions.length > 0 && <><dt>따라 쓸 때 주의</dt><dd>{p.cautions.join(" / ")}</dd></>}
          </dl>
          {style.approval_valid
            ? <><button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => approve(true)}>승인 풀기</button> <button type="button" className="primary" onClick={() => openMenu("title")}>이 문체로 새 글 만들기 →</button></>
            : <button type="button" className="primary" disabled={Boolean(busy)} onClick={() => approve(false)}>{busy === "approve" ? "승인하는 중..." : "이 문체 승인"}</button>}
        </>}
      </>}

      {notice && <div className="notice" role="status">{notice}</div>}
    </section>
  );
}
