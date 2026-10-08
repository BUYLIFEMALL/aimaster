"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, CircleAlert, ExternalLink, Flame, FolderCog, FolderInput, PenLine, Search, Trash2 } from "lucide-react";
import RetentionNotice from "./RetentionNotice";
import { retentionDaysLeft } from "@/threads-content-ops/lib/retention";
import ViralCategoryManager, { type ViralCategory } from "./ViralCategoryManager";
import ShortsSearch from "./ShortsSearch";
import {
  collectViralFromPerplexity,
  collectViralFromUrl,
  deleteViralCandidate,
  deleteViralCandidates,
  moveViralCandidates,
  setViralCandidateStatus,
} from "./web-actions";

type Candidate = {
  id: string;
  method: string;
  source_input: string;
  title: string;
  content: string;
  keywords: string[];
  status: string;
  category_id: string | null;
  created_at: string;
};

const METHODS = [
  { value: "http", label: "주소 지정", hint: "글 1건이면 그 글로, 목록 페이지(예: 뉴스 섹션)면 안의 글 중 무작위 5건으로 글감을 만듭니다." },
  { value: "perplexity", label: "화제 검색 (Perplexity)", hint: "주제를 넣으면 최근 72시간 안에 화제가 된 이슈를 찾아 글감을 만듭니다." },
  { value: "shorts", label: "유튜브 쇼츠 떡상 분석", hint: "" },
] as const;

const STATUS: Record<string, { label: string; tone: string }> = {
  ready: { label: "사용 가능", tone: "bg-emerald-50 text-emerald-700" },
  used: { label: "✅ 사용 완료", tone: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" },
  archived: { label: "📦 보관 중", tone: "bg-amber-100 text-amber-800 ring-1 ring-amber-300" },
};

const inputClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function ViralCollector({ candidates, categories, configuredProviders }: { candidates: Candidate[]; categories: ViralCategory[]; configuredProviders: string[] }) {
  const [method, setMethod] = useState<"http" | "perplexity" | "shorts">("http");
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all"); // all | none(미분류) | 카테고리 id
  const [collectCategory, setCollectCategory] = useState(""); // 수집·저장 대상 카테고리 id(빈 값 = 미분류)
  const [bulkMoveTo, setBulkMoveTo] = useState("");
  const [managing, setManaging] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const hasOpenai = configuredProviders.includes("openai");
  const hasPerplexity = configuredProviders.includes("perplexity");
  const keysReady = hasOpenai && (method !== "perplexity" || hasPerplexity);
  const categoryIds = useMemo(() => new Set(categories.map((item) => item.id)), [categories]);
  // 카테고리가 지워졌거나 없는 글감은 모두 미분류로 본다.
  const categoryOf = (item: Candidate) => (item.category_id && categoryIds.has(item.category_id) ? item.category_id : null);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of candidates) {
      const key = item.category_id && categoryIds.has(item.category_id) ? item.category_id : "none";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [candidates, categoryIds]);
  const visible = useMemo(() => candidates.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (categoryFilter === "all" || (categoryFilter === "none" ? !(item.category_id && categoryIds.has(item.category_id)) : item.category_id === categoryFilter))), [candidates, statusFilter, categoryFilter, categoryIds]);
  const count = (status: string) => candidates.filter((item) => item.status === status).length;
  const current = METHODS.find((item) => item.value === method) ?? METHODS[0];

  const collect = async () => {
    if (collecting) return;
    setCollecting(true);
    setMessage(null);
    try {
      if (method === "shorts") return;
      const result = method === "http" ? await collectViralFromUrl(url, collectCategory || null) : await collectViralFromPerplexity(topic, collectCategory || null);
      if (result.ok) {
        setMessage({ ok: true, text: `글감 ${result.count}건을 수집했습니다. 아래 목록에서 확인하고, 마음에 드는 글감으로 콘텐츠를 작성해 보세요.` });
        if (method === "http") setUrl(""); else setTopic("");
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "수집 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setCollecting(false);
    }
  };

  const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      setMessage(result.ok ? { ok: true, text: success } : { ok: false, text: result.error });
    } catch {
      setMessage({ ok: false, text: "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Candidate) => {
    if (!window.confirm(`"${item.title}" 글감을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    await run(() => deleteViralCandidate(item.id), "글감을 삭제했습니다.");
  };

  // 보관 글감은 선택·삭제 대상에서 제외한다(서버에서도 한 번 더 막는다).
  const deletable = visible.filter((item) => item.status !== "archived");
  const checkedDeletable = checked.filter((id) => deletable.some((item) => item.id === id));
  const unarchivedTotal = candidates.filter((item) => item.status !== "archived").length;
  const archivedTotal = candidates.length - unarchivedTotal;
  const toggleChecked = (id: string) => setChecked((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const moveTo = async (ids: string[], target: string, label: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await moveViralCandidates({ ids, categoryId: target || null });
      if (result.ok) {
        setChecked([]);
        setBulkMoveTo("");
        setMessage({ ok: true, text: `글감 ${result.moved}건을 "${label}" 카테고리로 이동했습니다.` });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "이동 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };
  const labelOf = (id: string) => (id ? categories.find((item) => item.id === id)?.name ?? "미분류" : "미분류");
  // 이동은 보관 글감도 가능하다(삭제만 막힘) — 그래서 선택 목록은 visible 기준으로 따로 쓴다.
  const checkedVisible = checked.filter((id) => visible.some((item) => item.id === id));

  const bulkDelete = async (ids: string[] | "all_unarchived", count: number) => {
    const scope = ids === "all_unarchived" ? `보관하지 않은 글감 전체 ${count}건` : `선택한 글감 ${count}건`;
    if (!window.confirm(`${scope}을 삭제할까요? 보관한 글감은 삭제되지 않으며, 삭제한 글감은 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await deleteViralCandidates({ ids });
      if (result.ok) {
        setChecked([]);
        setMessage({ ok: true, text: `글감 ${result.deleted}건을 삭제했습니다.${archivedTotal ? " 보관한 글감은 그대로 남아 있습니다." : ""}` });
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "삭제 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-gold">VIRAL CONTENT COLLECTOR</p>
      <h2 className="mt-1 text-xl font-bold text-neutral-900">떡상 콘텐츠 수집</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">콘텐츠를 생성하기 전에 글감을 모으는 곳입니다. 세 가지 방법으로 모을 수 있습니다. ① 뉴스·블로그 같은 공개 페이지 주소를 넣기 ② 주제를 검색해 최근 화제 이슈 찾기(Perplexity) ③ 유튜브 쇼츠를 검색해 구독자 대비 조회수가 터진 영상을 고르고, AI가 그 영상이 터진 이유를 분석해 글감으로 저장하기. 모은 글감은 아래 목록에서 보관하거나 삭제하고, 콘텐츠 생성에서 골라 주목받는 글로 만들 수 있습니다. 원문 전체는 저장하지 않고 정리된 글감과 출처만 본인 계정에 저장하며, 사용되는 OpenAI·Perplexity·YouTube·Gemini 키는 모두 회원님 본인의 키입니다.</p>
    </section>

    <RetentionNotice scope="viral" />

    <section className="grid gap-3 sm:grid-cols-4">
      <Overview label="수집한 글감" value={candidates.length} tone="text-violet-700" />
      <Overview label="사용 가능" value={count("ready")} tone="text-emerald-700" />
      <Overview label="사용 완료" value={count("used")} tone="text-sky-700" />
      <Overview label="보관" value={count("archived")} tone="text-neutral-600" />
    </section>

    <section className="rounded-2xl border-2 border-violet-300 bg-violet-50/60 p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-neutral-900"><Search size={18} className="text-gold" />글감 수집</h3>
      <div className="mt-3 flex flex-wrap gap-2">{METHODS.map((item) => <button key={item.value} type="button" onClick={() => { setMethod(item.value); setMessage(null); }} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${method === item.value ? "bg-neutral-900 text-[#ffffff]" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{item.label}</button>)}</div>
      <label className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-800">📁 저장할 카테고리
        <select className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-normal text-neutral-800" value={collectCategory} onChange={(event) => setCollectCategory(event.target.value)} aria-label="수집한 글감을 저장할 카테고리"><option value="">미분류</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <span className="text-xs font-normal text-neutral-500">모든 수집 방법(쇼츠 "글감으로 저장" 포함)에 적용됩니다.</span>
      </label>
      {method === "shorts"
        ? <div className="mt-4"><ShortsSearch embedded hasYoutubeKey={configuredProviders.includes("youtube_api_key")} hasGeminiKey={configuredProviders.includes("gemini")} hasOpenaiKey={hasOpenai} savedSources={candidates.map((item) => item.source_input)} categoryId={collectCategory || null} /></div>
        : <>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">{current.hint}</p>
      {!keysReady && <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span>{!hasOpenai ? "글감 정리에 쓸 OpenAI API 키가 등록되지 않았습니다. " : "Perplexity API 키(pplx-...)가 등록되지 않았습니다. "}<Link className="font-semibold underline" href="/threads-content-ops?tab=settings">API키등록·플랫폼연동</Link>에서 본인 키를 저장해 주세요.</span></p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {method === "http"
          ? <input className={inputClass} maxLength={2000} inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && url.trim() && keysReady) void collect(); }} placeholder="https://news.naver.com/section/105" aria-label="대상 페이지 주소" />
          : <input className={inputClass} maxLength={200} value={topic} onChange={(event) => setTopic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && topic.trim() && keysReady) void collect(); }} placeholder="예: 다이어트 보조제, 겨울 난방비" aria-label="시드 주제" />}
        <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={collecting || !keysReady || !(method === "http" ? url.trim() : topic.trim())} onClick={() => void collect()}><Flame size={16} />{collecting ? "수집 중… (최대 1분)" : "글감 수집"}</button>
      </div>
      <p className="mt-3 text-xs text-neutral-500">수집은 회원님의 OpenAI(와 Perplexity) 사용량을 소모합니다. 공개된 페이지만 읽을 수 있고, 로그인이 필요한 페이지나 내부 주소는 읽지 않습니다.</p>
        </>}
    </section>


    {message && <p className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800" role="status">{message.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />}{message.text}</p>}

    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-bold text-neutral-900">수집한 글감 <span className="text-sm font-normal text-neutral-500">({visible.length}건)</span></h3>
        <select aria-label="상태 필터" className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">전체 상태</option><option value="ready">사용 가능</option><option value="used">사용 완료</option><option value="archived">보관</option></select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="카테고리 필터">
        <CategoryChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>전체 ({candidates.length})</CategoryChip>
        {categories.map((item) => <CategoryChip key={item.id} active={categoryFilter === item.id} onClick={() => setCategoryFilter(item.id)}>{item.name} ({categoryCounts[item.id] ?? 0})</CategoryChip>)}
        {(categoryCounts.none ?? 0) > 0 && <CategoryChip active={categoryFilter === "none"} onClick={() => setCategoryFilter("none")}>미분류 ({categoryCounts.none})</CategoryChip>}
        <button type="button" onClick={() => setManaging(true)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 hover:bg-violet-100"><FolderCog size={14} />카테고리 관리</button>
      </div>
      {candidates.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
        <label className="inline-flex items-center gap-1.5 font-semibold"><input type="checkbox" className="h-4 w-4 accent-rose-600" checked={visible.length > 0 && checkedVisible.length === visible.length} disabled={busy || !visible.length} onChange={(event) => setChecked(event.target.checked ? visible.map((item) => item.id) : [])} />현재 목록 전체 선택</label>
        <span className="text-neutral-500">선택 {checkedVisible.length}건 (삭제 가능 {checkedDeletable.length}건)</span>
        <button type="button" disabled={busy || !checkedDeletable.length} onClick={() => void bulkDelete(checkedDeletable, checkedDeletable.length)} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={13} />선택 삭제</button>
        <button type="button" disabled={busy || !unarchivedTotal} onClick={() => void bulkDelete("all_unarchived", unarchivedTotal)} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-[#ffffff] hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-neutral-300"><Trash2 size={13} />보관 제외 전체 삭제 ({unarchivedTotal}건)</button>
        <span className="text-neutral-500">※ 보관한 글감({archivedTotal}건)은 삭제되지 않습니다.</span>
        <span className="flex w-full flex-wrap items-center gap-2 border-t border-neutral-200 pt-2">
          <FolderInput size={14} className="text-violet-700" /><span className="font-semibold">선택한 글감 {checkedVisible.length}건을</span>
          <select aria-label="이동할 카테고리" className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-800" value={bulkMoveTo} onChange={(event) => setBulkMoveTo(event.target.value)}><option value="">카테고리 선택…</option><option value="none">미분류</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button type="button" disabled={busy || !checkedVisible.length || !bulkMoveTo} onClick={() => void moveTo(checkedVisible, bulkMoveTo === "none" ? "" : bulkMoveTo, labelOf(bulkMoveTo === "none" ? "" : bulkMoveTo))} className="rounded-lg bg-violet-600 px-3 py-1.5 font-bold text-[#ffffff] hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-neutral-300">선택 이동</button>
        </span>
      </div>}
      {!visible.length ? <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">{candidates.length ? "조건에 맞는 글감이 없습니다. 필터를 바꿔 보세요." : "아직 수집한 글감이 없습니다. 위에서 주소를 넣거나 주제를 검색해 글감을 모아 보세요."}</div> : <ul className="mt-4 space-y-3">{visible.map((item) => {
        const status = STATUS[item.status] ?? { label: item.status, tone: "bg-neutral-100 text-neutral-600" };
        const link = item.method === "http" ? safeHttpUrl(item.source_input) : null;
        const locked = item.status === "archived";
        return <li key={item.id} className="rounded-xl border border-neutral-200 p-4">
          <label className="mb-2 inline-flex items-center gap-1.5 text-xs text-neutral-600"><input type="checkbox" className="h-4 w-4 accent-rose-600" checked={checked.includes(item.id)} disabled={busy} onChange={() => toggleChecked(item.id)} />{locked ? "선택 (보관 글감은 삭제에서 제외, 이동은 가능)" : "삭제·이동할 글감으로 선택"}</label>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{item.method === "perplexity" ? "Perplexity" : item.source_input.startsWith("https://www.youtube.com/shorts/") ? "유튜브 쇼츠" : "주소"}</span>{item.status !== "used" && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>}<label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800 focus-within:ring-2 focus-within:ring-violet-400 hover:bg-violet-100"><FolderInput size={12} />{labelOf(categoryOf(item) ?? "")}<span className="border-l border-violet-300 pl-1.5">변경 ▼</span><select aria-label="카테고리 변경" disabled={busy} value={categoryOf(item) ?? ""} onChange={(event) => void moveTo([item.id], event.target.value, labelOf(event.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"><option value="">미분류</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label><span className="text-xs text-neutral-400">{new Date(item.created_at).toLocaleDateString("ko-KR")}</span></div>
          <p className="mt-2 font-semibold text-neutral-900">{item.title}</p>
          {locked ? <p className="mt-0.5 text-[11px] font-semibold text-amber-700">📦 보관 중 · 자동 삭제 제외</p> : <p className="mt-0.5 text-[11px] text-neutral-500">🗓️ {retentionDaysLeft(item.created_at) <= 3 ? <b className="text-rose-600">{retentionDaysLeft(item.created_at)}일 뒤 자동 삭제</b> : `${retentionDaysLeft(item.created_at)}일 뒤 자동 삭제`}</p>}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{item.content}</p>
          {item.keywords.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{item.keywords.map((keyword) => <span key={keyword} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">#{keyword}</span>)}</div>}
          <p className="mt-2 flex items-center gap-1 text-xs text-neutral-500">{item.method === "perplexity" ? "검색 주제: " : "출처: "}{link ? <a className="inline-flex min-w-0 items-center gap-1 text-sky-700 hover:underline" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} className="shrink-0" /><span className="truncate">{item.source_input}</span></a> : <span className="truncate">{item.source_input}</span>}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href={`/threads-content-ops?tab=create&viral=${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-[#ffffff] hover:bg-neutral-700"><PenLine size={14} />이 글감으로 작성</Link>
            {item.status === "used"
              ? <ActionButton label="사용가능" ok onClick={() => void run(() => setViralCandidateStatus({ id: item.id, status: "ready" }), "사용 가능으로 되돌렸습니다.")} disabled={busy}><CheckCircle2 size={14} /></ActionButton>
              : <ActionButton label="사용완료" onClick={() => void run(() => setViralCandidateStatus({ id: item.id, status: "used" }), "사용 완료로 표시했습니다.")} disabled={busy}><CheckCircle2 size={14} /></ActionButton>}
            {item.status === "archived"
              ? <ActionButton label="보관 중" warn onClick={() => void run(() => setViralCandidateStatus({ id: item.id, status: "ready" }), "보관을 해제하고 사용 가능으로 되돌렸습니다.")} disabled={busy}><Archive size={14} /></ActionButton>
              : <ActionButton label="보관하기" onClick={() => void run(() => setViralCandidateStatus({ id: item.id, status: "archived" }), "보관했습니다. 보관한 글감은 일괄 삭제에서 제외됩니다.")} disabled={busy}><Archive size={14} /></ActionButton>}
            <ActionButton label="삭제" danger onClick={() => void remove(item)} disabled={busy}><Trash2 size={14} /></ActionButton>
          </div>
        </li>;
      })}</ul>}
    </section>
    {managing && <ViralCategoryManager categories={categories} counts={categoryCounts} onClose={() => setManaging(false)} />}
  </div>;
}

export function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-neutral-900 text-[#ffffff]" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}>{children}</button>;
}

function Overview({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p></div>;
}

function ActionButton({ label, onClick, disabled, danger, warn, ok, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; warn?: boolean; ok?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border-rose-200 text-rose-600 hover:bg-rose-50" : ok ? "border-emerald-600 bg-emerald-500 text-[#ffffff] hover:bg-emerald-600" : warn ? "border-amber-400 bg-amber-300 text-amber-950 hover:bg-amber-200" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>{children}{label}</button>;
}
