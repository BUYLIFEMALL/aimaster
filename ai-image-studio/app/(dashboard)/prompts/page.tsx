"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Search, RefreshCw, Copy, Check, Wand2, Sparkles, X } from "lucide-react";
import type { CustomStylePrompt } from "@/lib/prompts/customStylePrompts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface PromptItem {
  id: string; style_id: string; label: string; prompt: string; display_order: number; created_at: string;
  source_prompt_id?: string | null; expires_at?: string;
}
type Scope = "defaults" | "personal";
type Editor = { target: Scope; item?: PromptItem; source?: PromptItem };
const PRESET_STYLES = [
  { id: "all", name: "전체 화풍 보기" },
  { id: "photorealistic", name: "실사 포토리얼리즘" },
  { id: "pixar_3d", name: "픽사 3D 애니메이션" },
  { id: "ghibli_anime", name: "지브리 감성 애니" },
  { id: "japanese_anime", name: "일본 2D 극장판 애니" },
  { id: "3d_digital", name: "3D 디지털 아트" },
  { id: "artistic_editorial", name: "감성 패션 화보" },
  { id: "vector_illustration", name: "벡터 일러스트" },
  { id: "cyberpunk_neon", name: "사이버펑크 네온" },
  { id: "oriental_ink", name: "동양 수묵화" },
  { id: "watercolor_pastel", name: "수채화 파스텔" },
  { id: "cinematic_film", name: "35mm 필름" },
  { id: "claymation", name: "클레이 스톱모션" },
  { id: "webtoon_lineart", name: "웹툰 라인아트" },
  { id: "architectural", name: "건축 & 인테리어" },
  { id: "dark_fantasy", name: "다크 판타지" },
  { id: "minimal_flat", name: "미니멀 플랫 아트" },
];
const button = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed";
const input = "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none";

function Modal({ title, blocked, onClose, children }: { title: string; blocked: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); if (!blocked) onClose(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/70">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
        <h2 className="font-bold text-white">{title}</h2>
        <button type="button" disabled={blocked} onClick={onClose} className={button} aria-label="닫기"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </dialog>
  );
}

export default function PromptsManagementPage() {
  const [defaults, setDefaults] = useState<PromptItem[]>([]);
  const [personal, setPersonal] = useState<CustomStylePrompt[]>([]);
  const [scope, setScope] = useState<Scope>("defaults");
  const [canEditDefaults, setCanEditDefaults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [personalReady, setPersonalReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [personalError, setPersonalError] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState({ style_id: "photorealistic", label: "", prompt: "", display_order: 0 });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<{ item: PromptItem; target: Scope } | null>(null);
  const [copiedId, setCopiedId] = useState("");
  const refreshId = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshId.current;
    setLoading(true); setLoadError(""); setPersonalError("");
    const results = await Promise.allSettled([
      fetch("/api/prompts", { cache: "no-store" }).then(async response => ({ ok: response.ok, data: await response.json() })),
      fetch("/api/prompts/custom", { cache: "no-store" }).then(async response => ({ ok: response.ok, data: await response.json() })),
    ]);
    if (requestId !== refreshId.current) return;
    const [base, own] = results;
    if (base.status === "fulfilled" && base.value.ok) {
      setDefaults(base.value.data.prompts ?? []); setCanEditDefaults(Boolean(base.value.data.canEdit));
    } else { setDefaults([]); setCanEditDefaults(false); setLoadError(base.status === "fulfilled" ? base.value.data.error : "기본 예시를 불러오지 못했습니다."); }
    if (own.status === "fulfilled" && own.value.ok) {
      setPersonal(own.value.data.prompts ?? []); setPersonalReady(true);
    } else { setPersonal([]); setPersonalReady(false); setPersonalError(own.status === "fulfilled" ? own.value.data.error : "개인 프롬프트를 불러오지 못했습니다."); }
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); return () => { refreshId.current++; }; }, [refresh]);

  const openEditor = (target: Scope, item?: PromptItem, source?: PromptItem) => {
    setEditor({ target, item, source }); setFormError("");
    const initial = item ?? source;
    setDraft({ style_id: initial?.style_id ?? (selectedStyle === "all" ? "photorealistic" : selectedStyle),
      label: item?.label ?? (source ? `#나만의 ${source.label.replace(/^#/, "")}` : ""),
      prompt: initial?.prompt ?? "", display_order: initial?.display_order ?? 0 });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editor || busy) return;
    setBusy(true); setFormError("");
    try {
      const response = await fetch(editor.target === "personal" ? "/api/prompts/custom" : "/api/prompts", {
        method: editor.item ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: editor.item?.id, source_prompt_id: editor.source?.id }),
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setScope(editor.target); setSelectedStyle(draft.style_id); setSearch(""); setEditor(null); await refresh();
    } catch (error) { setFormError(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return; setBusy(true); setFormError("");
    try {
      const url = deleting.target === "personal" ? "/api/prompts/custom" : "/api/prompts";
      const response = await fetch(`${url}?id=${encodeURIComponent(deleting.item.id)}`, { method: "DELETE" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "삭제하지 못했습니다.");
      setDeleting(null); await refresh();
    } catch (error) { setFormError(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };
  const copy = async (item: PromptItem) => {
    try { await navigator.clipboard.writeText(item.prompt); setCopiedId(item.id); }
    catch { setLoadError("복사하지 못했습니다. 전문을 펼쳐 직접 복사해주세요."); }
  };
  const seed = async () => {
    if (!confirm("기본 예시 160개를 추가 등록합니다. 기존 예시가 있으면 중복될 수 있습니다. 계속하시겠습니까?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/prompts/seed", { method: "POST" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "초기 등록에 실패했습니다.");
      await refresh();
    } catch (error) { setLoadError(error instanceof Error ? error.message : "초기 등록 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  };

  const active = scope === "personal" ? personal : defaults;
  const visible = active.filter(item => (selectedStyle === "all" || item.style_id === selectedStyle) &&
    `${item.label} ${item.prompt}`.toLowerCase().includes(search.trim().toLowerCase()));
  const styleName = (id: string) => PRESET_STYLES.find(item => item.id === id)?.name ?? id;
  const original = editor?.source ?? defaults.find(item => item.id === editor?.item?.source_prompt_id);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Wand2 className="mt-1 h-7 w-7 shrink-0 text-amber-400" />
          <div><h1 className="text-xl font-bold text-white">화풍 프롬프트 게시판</h1>
            <p className="mt-1 text-sm text-zinc-400">16가지 화풍의 기본 예시를 바탕으로 나만의 프롬프트를 만들어보세요.</p></div>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading || busy} className={button}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />새로고침</button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" aria-pressed={scope === "defaults"} onClick={() => { setScope("defaults"); setSearch(""); }}
          className={`rounded-xl border p-4 text-left ${scope === "defaults" ? "border-amber-500 bg-amber-500/10" : "border-zinc-800 bg-zinc-900"}`}>
          <span className="font-bold text-amber-300">기본 예시 · {defaults.length}개</span><span className="mt-1 block text-xs text-zinc-400">마음에 드는 예시에서 ‘나만의 버전 만들기’를 누르세요.</span>
        </button>
        <button type="button" aria-pressed={scope === "personal"} onClick={() => { setScope("personal"); setSearch(""); }}
          className={`rounded-xl border p-4 text-left ${scope === "personal" ? "border-amber-500 bg-amber-500/10" : "border-zinc-800 bg-zinc-900"}`}>
          <span className="font-bold text-amber-300">나만의 프롬프트 · {personal.length}개</span><span className="mt-1 block text-xs text-zinc-400">본인만 볼 수 있는 커스텀 프롬프트 보관함입니다.</span>
        </button>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-relaxed text-zinc-300">
        {scope === "personal" ? "개인 프롬프트는 최초 저장일부터 30일 후 자동 삭제됩니다. 수정해도 기한은 늘어나지 않습니다. 필요한 내용은 만료 전에 복사해두세요." : "기본 예시는 그대로 보존됩니다. ‘나만의 버전 만들기’로 제목·화풍·상황 묘사를 수정해 저장하면 본인 보관함에만 반영됩니다."}
        <Link href="/guide#custom-prompts" className="ml-2 inline-block font-semibold text-amber-300 underline">사용 방법</Link>
      </div>
      {(loadError || personalError) && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{loadError || personalError}</p>}
      {canEditDefaults && scope === "defaults" && <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={busy} onClick={() => openEditor("defaults")}><Plus className="h-4 w-4" />기본 예시 등록 (관리자)</button>
        <button type="button" className={button} disabled={busy} onClick={() => void seed()}><Sparkles className="h-4 w-4" />초기 160개 추가 (관리자)</button>
      </div>}
      <div className="flex flex-wrap gap-2">
        {PRESET_STYLES.map(style => <button key={style.id} type="button" aria-pressed={selectedStyle === style.id} onClick={() => setSelectedStyle(style.id)}
          className={`${button} ${selectedStyle === style.id ? "border-amber-500 bg-amber-500/10 text-amber-300" : ""}`}>
          {style.name}<span className="rounded bg-zinc-800 px-1.5">{style.id === "all" ? active.length : active.filter(item => item.style_id === style.id).length}</span>
        </button>)}
      </div>
      <label className="relative block"><span className="sr-only">프롬프트 검색</span><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="태그 또는 프롬프트 검색" className={`${input} pl-10`} />
      </label>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs text-zinc-300">
          <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400"><tr>
            <th className="w-36 p-4">화풍</th><th className="w-44 p-4">프롬프트 이름</th><th className="p-4">프롬프트 내용</th><th className="w-52 p-4">활용·관리</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? <tr><td colSpan={4} className="p-8 text-center">프롬프트를 불러오는 중입니다...</td></tr> : visible.length === 0 ?
              <tr><td colSpan={4} className="p-8 text-center">{search || selectedStyle !== "all" ? "조건에 맞는 프롬프트가 없습니다." : scope === "personal" ? "아직 개인 프롬프트가 없습니다. 기본 예시에서 ‘나만의 버전 만들기’를 눌러보세요." : "등록된 기본 예시가 없습니다."}</td></tr> :
              visible.map(item => <tr key={item.id} className="align-top hover:bg-zinc-800/30">
                <td className="p-4 text-amber-300">{styleName(item.style_id)}</td>
                <td className="p-4 font-bold text-amber-300">{item.label}{item.expires_at && <span className="mt-2 block text-[11px] font-normal text-zinc-400">{new Date(item.expires_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 삭제 예정</span>}</td>
                <td className="p-4 leading-relaxed"><details><summary className="cursor-pointer"><span className="line-clamp-3">{item.prompt}</span><span className="mt-1 inline-block text-amber-400">전문 펼치기</span></summary><p className="mt-3 whitespace-pre-wrap break-words">{item.prompt}</p></details></td>
                <td className="space-y-2 p-4"><button type="button" className={button} onClick={() => void copy(item)}>{copiedId === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedId === item.id ? "복사됨" : "복사"}</button>
                  {scope === "defaults" ? <button type="button" disabled={!personalReady || busy} className={`${button} w-full border-amber-500/40 text-amber-300`} onClick={() => openEditor("personal", undefined, item)}><Plus className="h-3.5 w-3.5" />나만의 버전 만들기</button> :
                    <Link href={`/dashboard?customPrompt=${encodeURIComponent(item.id)}`} className={`${button} w-full border-amber-500/40 text-amber-300`}>작업실에서 사용</Link>}
                  {(scope === "personal" || canEditDefaults) && <div className="flex flex-wrap gap-2">
                    <button type="button" className={button} disabled={busy} onClick={() => openEditor(scope, item)}><Edit2 className="h-3.5 w-3.5" />{scope === "personal" ? "수정" : "원본 수정"}</button>
                    <button type="button" className={button} disabled={busy} onClick={() => { setFormError(""); setDeleting({ item, target: scope }); }}><Trash2 className="h-3.5 w-3.5" />{scope === "personal" ? "삭제" : "원본 삭제"}</button>
                  </div>}
                </td>
              </tr>)}
          </tbody>
        </table></div>
      </div>

      {editor && <Modal title={editor.target === "personal" ? (editor.item ? "나만의 프롬프트 수정" : "나만의 버전 만들기") : "기본 예시 관리 (관리자)"} blocked={busy} onClose={() => setEditor(null)}>
        <form onSubmit={save} className="space-y-4">
          <p className="text-sm text-zinc-400">{editor.target === "personal" ? "변경한 내용은 본인 보관함에만 저장됩니다. 처음 저장한 날부터 30일간 보관됩니다." : "기본 예시는 모든 회원에게 보입니다. 개인 수정본은 ‘나만의 버전 만들기’를 이용하세요."}</p>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm">프롬프트 이름<input aria-label="프롬프트 이름" autoFocus required maxLength={120} value={draft.label} onChange={event => setDraft({ ...draft, label: event.target.value })} className={input} /></label>
            <label className="space-y-2 text-sm">화풍<select aria-label="화풍" value={draft.style_id} onChange={event => setDraft({ ...draft, style_id: event.target.value })} className={input}>{PRESET_STYLES.filter(style => style.id !== "all").map(style => <option key={style.id} value={style.id}>{style.name}</option>)}</select></label></div>
          <label className="block space-y-2 text-sm">프롬프트 본문<textarea aria-label="프롬프트 본문" required maxLength={20000} rows={10} value={draft.prompt} onChange={event => setDraft({ ...draft, prompt: event.target.value })} className={`${input} leading-relaxed`} /></label>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs">정렬 순서<input aria-label="정렬 순서" type="number" min={0} max={9999} required value={draft.display_order} onChange={event => setDraft({ ...draft, display_order: Number(event.target.value) })} className={`${input} max-w-24`} /></label>
            <span className="text-xs text-zinc-400">{draft.prompt.length.toLocaleString()} / 20,000자</span></div>
          {original && editor.target === "personal" && <details className="rounded-xl border border-zinc-700 p-3 text-xs"><summary className="cursor-pointer text-amber-300">기본 원문 참고 · {original.label}</summary><p className="mt-3 whitespace-pre-wrap leading-relaxed text-zinc-400">{original.prompt}</p>
            <button type="button" className={`${button} mt-3`} onClick={() => setDraft({ ...draft, prompt: original.prompt })}>원문을 편집창에 불러오기</button></details>}
          {formError && <p role="alert" className="text-sm text-red-300">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><button type="button" disabled={busy} className={button} onClick={() => setEditor(null)}>취소</button><button type="submit" disabled={busy} className={`${button} border-amber-500 bg-amber-500/10 text-amber-300`}>{busy ? "저장 중..." : editor.target === "personal" ? "내 보관함에 저장" : "기본 예시 저장"}</button></div>
        </form>
      </Modal>}
      {deleting && <Modal title="프롬프트 삭제 확인" blocked={busy} onClose={() => setDeleting(null)}>
        <p className="text-sm leading-relaxed">{deleting.item.label}을 삭제하시겠습니까? {deleting.target === "personal" ? "본인 사본만 삭제되며 기본 예시는 그대로 남습니다." : "모든 회원이 보는 기본 예시가 삭제됩니다. 이미 저장한 개인 사본은 보존됩니다."}</p>
        {formError && <p role="alert" className="mt-3 text-sm text-red-300">{formError}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={() => setDeleting(null)}>취소</button><button type="button" disabled={busy} onClick={() => void remove()} className={`${button} border-red-500/40 text-red-300`}>{busy ? "삭제 중..." : "삭제하기"}</button></div>
      </Modal>}
    </div>
  );
}
