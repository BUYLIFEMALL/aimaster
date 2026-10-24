"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Plus, Trash2 } from "lucide-react";
import { BTN_PRIMARY, BTN_GHOST, ErrorNote, INPUT } from "@/components/studio/ui";
import { ProviderSelect } from "@/lib/compatibleChat/ProviderSelect";
import { PRESET_BOTS, type BotDefinition, type BotDraft } from "@/lib/bots/core";

const blank = (): BotDraft => ({ name: "", instructions: "", provider: "upstage", model: "solar-pro4", temperature: 0.3 });

export default function BotsPage() {
  const [bots, setBots] = useState<BotDefinition[]>([]);
  const [editing, setEditing] = useState<BotDefinition | null>(null);
  const [draft, setDraft] = useState<BotDraft>(blank);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/bots", { cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "내 봇을 불러오지 못했습니다.");
    setBots(data.bots ?? []); setLoaded(true);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((e: Error) => { if (!controller.signal.aborted) { setError(e.message); setLoaded(true); } });
    return () => controller.abort();
  }, [load]);

  function edit(bot: BotDefinition) {
    setError(""); setNotice("");
    setEditing(bot.builtin ? null : bot);
    setDraft({ name: bot.builtin ? `${bot.name} 사본` : bot.name, instructions: bot.instructions, provider: bot.available === false ? "upstage" : bot.provider, model: bot.available === false ? "solar-pro4" : bot.model, temperature: bot.temperature });
    if (bot.available === false) setNotice("지원이 끝난 모델 대신 기존 Upstage를 표시했습니다. 사용할 모델을 확인한 후 저장해 주세요.");
    document.getElementById("bot-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/bots", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, ...(editing ? { id: editing.id, revision: editing.revision } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "봇을 저장하지 못했습니다.");
      setEditing(data.bot); setNotice("내 봇 설정을 저장했습니다. 다음 답변부터 적용되며 과거 답변은 바뀌지 않습니다.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "봇을 저장하지 못했습니다."); void load().catch(() => undefined); }
    finally { setBusy(false); }
  }
  async function remove(bot: BotDefinition) {
    if (!confirm(`「${bot.name}」 봇을 삭제할까요? 과거 대화는 유지되며 이 봇을 고른 방에서는 새 봇을 선택하거나 해제해야 합니다.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/bots", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bot.id, revision: bot.revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "봇을 삭제하지 못했습니다.");
      if (editing?.id === bot.id) { setEditing(null); setDraft(blank()); }
      await load(); setNotice("내 봇을 삭제했습니다. 과거 답변과 당시 설정 기록은 유지됩니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "봇을 삭제하지 못했습니다."); void load().catch(() => undefined); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <header className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-5">
      <p className="text-xs text-indigo-300">🤖 내 봇 · 설정 약 2분 · <Link href="/chat" className="underline">채팅으로 이동 →</Link></p>
      <h1 className="mt-2 text-xl font-bold text-slate-100">내 봇 관리</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">자주 쓰는 역할과 답변 방식을 저장하고 채팅방에서 선택하세요. 기본 Upstage로도 사용할 수 있으며 새 AI 키는 해당 공급자를 고를 때만 필요합니다.</p>
    </header>
    <ol className="grid gap-2 text-xs text-slate-300 sm:grid-cols-4">{["① 기본 봇 선택 또는 새 봇 작성", "② 역할·모델·온도 저장", "③ 채팅방에서 봇 선택", "④ 답변과 당시 설정 확인"].map((step) => <li key={step} className="rounded-xl border border-slate-700 bg-[#161922] p-3">{step}</li>)}</ol>
    {error && <ErrorNote message={error} />}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
    <section className="space-y-3"><h2 className="font-bold">기본 제공 봇</h2><div className="grid gap-3 md:grid-cols-3">{PRESET_BOTS.map((bot) => <article key={bot.id} className="space-y-3 rounded-xl border border-slate-700 bg-[#161922] p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold"><Bot size={16} />{bot.name}</h3><p className="text-xs leading-relaxed text-slate-400">{bot.instructions}</p>
      <div className="flex flex-wrap gap-3 text-xs"><Link href={`/chat?bot=${bot.id}`} className="font-semibold text-indigo-300 underline">이 봇으로 새 대화</Link><button type="button" disabled={busy} onClick={() => edit(bot)} className="text-slate-300 underline disabled:opacity-50">내 봇으로 편집</button></div>
    </article>)}</div></section>
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">내가 저장한 봇 {bots.length}개</h2><button type="button" disabled={busy} className={BTN_GHOST} onClick={() => { setEditing(null); setDraft(blank()); setError(""); setNotice(""); }}><Plus size={14} /> 새 봇</button></div>
      {!loaded ? <p className="text-sm text-slate-400">불러오는 중…</p> : !bots.length ? <p className="text-sm text-slate-400">저장한 봇이 없습니다. 아래에서 역할 지침을 작성해 보세요.</p> : <ul className="grid gap-2 sm:grid-cols-2">{bots.map((bot) => <li key={bot.id} className="space-y-2 rounded-xl border border-slate-700 bg-[#161922] p-4">
        <h3 className="break-words text-sm font-bold">{bot.name}</h3><p className="break-all text-xs text-slate-400">{bot.provider} · {bot.model} · 온도 {bot.temperature}</p>{bot.available === false && <p className="text-xs text-amber-300">{bot.unavailableReason}</p>}
        <div className="flex flex-wrap items-center gap-3 text-xs"><button type="button" disabled={busy} onClick={() => edit(bot)} className="text-indigo-300 underline">수정</button>{bot.available !== false && <Link href={`/chat?bot=${bot.id}`} className="text-indigo-300 underline">이 봇으로 새 대화</Link>}<button type="button" disabled={busy} onClick={() => void remove(bot)} className="inline-flex items-center gap-1 text-rose-300"><Trash2 size={12} />삭제</button></div>
      </li>)}</ul>}
    </section>
    <form id="bot-editor" onSubmit={save} className="space-y-4 rounded-2xl border border-slate-700 bg-[#161922] p-5">
      <h2 className="font-bold">{editing ? "내 봇 수정" : "새 봇 작성"}</h2>
      <label className="block text-xs text-slate-300">봇 이름<input className={`${INPUT} mt-1`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} maxLength={60} required disabled={busy} placeholder="예: 거래처 이메일 작성" /></label>
      <label className="block text-xs text-slate-300">역할 지침<textarea className={`${INPUT} mt-1 min-h-36`} value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} maxLength={6000} required disabled={busy} placeholder="어떤 역할로, 누구에게, 어떤 형식으로 답해야 하는지 적어 주세요." /><span className="mt-1 block text-right text-slate-500">{draft.instructions.length.toLocaleString()} / 6,000자</span></label>
      <ProviderSelect dark legacy="upstage" value={draft} onChange={(value) => setDraft((d) => ({ ...d, ...value }))} disabled={busy} />
      <label className="block text-xs text-slate-300">온도 (낮을수록 일관된 답변)<input className={`${INPUT} mt-1 max-w-40`} type="number" min={0} max={1} step={0.1} value={Number.isNaN(draft.temperature) ? "" : draft.temperature} required disabled={busy} onChange={(e) => setDraft((d) => ({ ...d, temperature: e.target.valueAsNumber }))} /></label>
      <p className="rounded-lg bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">⚠️ API 키·비밀번호를 역할 지침에 넣지 마세요. 지침과 대화 내용은 선택한 AI에 전달됩니다. 봇 설정은 직접 지울 때까지 유지되고, 대화와 답변 당시 설정 기록은 기존 30일 보관을 따릅니다.</p>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}{editing ? "변경 저장" : "내 봇 저장"}</button>{editing && <Link className="text-sm text-indigo-300 underline" href={`/chat?bot=${editing.id}`}>저장한 봇으로 새 대화 →</Link>}</div>
    </form>
    <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-200">💡 기본 봇은 선택만 하면 바로 사용할 수 있습니다. 역할을 바꾸려면 「내 봇으로 편집」해 본인 설정으로 저장하세요. 실제 응답에는 회원 본인 API 키가 필요합니다. <Link href="/settings" className="font-semibold underline">API 설정 열기 →</Link></p>
  </div>;
}
