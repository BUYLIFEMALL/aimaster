"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { KeyRound, Trash2, X } from "lucide-react";
import { DEFAULT_VALUES, type EqKey, type EqPreset, type EqValues, type Lang, type Persona } from "@/lib/persona/types";
import { getDefaultPersonas, getPresets } from "@/lib/persona/data";
import { clampValues, draftFileName, safeFileName } from "@/lib/persona/prompt";
import { STRINGS } from "./i18n";
import { EqPanel } from "./EqPanel";
import { PersonaPanel } from "./PersonaPanel";
import { CanvasPanel } from "./CanvasPanel";

interface DraftRow {
  id: string;
  title: string;
  content: string;
  eq_values: EqValues | null;
  persona_key: string | null;
  created_at: string;
}

async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; needKey?: boolean } }> {
  try {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "네트워크 오류가 발생했습니다." } as never };
  }
}

function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function StudioWorkspace() {
  const [lang, setLang] = useState<Lang>("ko");
  const t = STRINGS[lang];
  const [values, setValues] = useState<EqValues>({ ...DEFAULT_VALUES });
  const [presetId, setPresetId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Persona[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [prevText, setPrevText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [stats, setStats] = useState<{ ms: number; out: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = useCallback((m: string) => {
    setNotice(m);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  useEffect(() => {
    let alive = true;
    api<{ personas: Persona[] }>("/api/personas").then((r) => alive && r.ok && setOverrides(r.data.personas ?? []));
    return () => { alive = false; };
  }, []);

  // 기본 페르소나(언어별) + 내가 수정한 값/직접 만든 페르소나를 합친다
  const personas = useMemo<Persona[]>(() => {
    const byId = new Map(overrides.map((p) => [p.id, p]));
    const defaults = getDefaultPersonas(lang).map((d) => byId.get(d.id) ?? d);
    const custom = overrides.filter((p) => p.id.startsWith("custom-"));
    return [...defaults, ...custom];
  }, [overrides, lang]);
  const overriddenIds = useMemo(() => new Set(overrides.map((p) => p.id)), [overrides]);
  const activePersona = personas.find((p) => p.id === activeId) ?? null;
  const presets = useMemo(() => getPresets(lang), [lang]);

  const onSlider = (key: EqKey, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setPresetId(null);
  };
  const onPreset = (p: EqPreset) => {
    setValues({ ...p.values });
    setPresetId(p.id);
  };
  const onTogglePersona = (id: string) => {
    if (activeId === id) {
      setActiveId(null);
      return;
    }
    setActiveId(id);
    const p = personas.find((x) => x.id === id);
    if (p) {
      setValues({ ...p.values });
      setPresetId(null);
    }
  };

  async function generate() {
    if (!text.trim()) return flash(t.emptyText);
    setBusy(true);
    setError(null);
    const r = await api<{ text: string; ms: number; outputChars: number }>("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, values, lang, persona: activePersona ? { name: activePersona.name, role: activePersona.role, context: activePersona.context } : null }),
    });
    setBusy(false);
    if (!r.ok) {
      if (r.data.needKey) setNeedKey(true);
      else setError(r.data.error ?? "생성에 실패했습니다.");
      return;
    }
    setPrevText(text);
    setText(r.data.text);
    setStats({ ms: r.data.ms, out: r.data.outputChars });
  }

  async function savePersona(p: Persona): Promise<boolean> {
    const r = await api("/api/personas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: p }) });
    if (!r.ok) {
      setError(r.data.error ?? "저장하지 못했습니다.");
      return false;
    }
    setOverrides((prev) => [...prev.filter((x) => x.id !== p.id), p]);
    if (activeId === p.id) setValues({ ...p.values });
    return true;
  }

  async function removePersona(id: string) {
    const r = await api(`/api/personas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return setError(r.data.error ?? "삭제하지 못했습니다.");
    setOverrides((prev) => prev.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function generatePersona(name: string, role: string) {
    const r = await api<{ persona: { description: string; lore: string; voice: string; style: string; values: EqValues } }>("/api/persona-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, lang }),
    });
    if (!r.ok) {
      if (r.data.needKey) setNeedKey(true);
      else setError(r.data.error ?? "생성에 실패했습니다.");
      return null;
    }
    return r.data.persona;
  }

  function exportPersonas() {
    download(`personas_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "persona-style-studio", personas }, null, 2), "application/json");
  }

  async function importPersonas(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const list: Persona[] = Array.isArray(parsed) ? parsed : parsed?.personas;
      if (!Array.isArray(list)) throw new Error("bad");
      let ok = 0;
      for (const raw of list.slice(0, 100)) {
        if (!raw?.name || !raw?.role) continue;
        const keepId = typeof raw.id === "string" && /^persona-[a-z-]+$/.test(raw.id) ? raw.id : `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const p: Persona = {
          id: keepId,
          name: String(raw.name),
          role: String(raw.role),
          description: String(raw.description ?? raw.role),
          avatar: String(raw.avatar ?? "👤"),
          context: { lore: String(raw.context?.lore ?? ""), voice: String(raw.context?.voice ?? ""), style: String(raw.context?.style ?? "") },
          values: clampValues(raw.values),
        };
        if (await savePersona(p)) ok++;
      }
      flash(lang === "ko" ? `${ok}개의 페르소나를 가져왔습니다.` : `Imported ${ok} personas.`);
    } catch {
      setError(lang === "ko" ? "페르소나 파일을 읽지 못했습니다. 내보내기로 만든 JSON 파일인지 확인해 주세요." : "Could not read the persona file.");
    }
  }

  async function saveDraft() {
    if (!text.trim()) return flash(t.emptyText);
    const r = await api("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, values, personaKey: activeId }),
    });
    if (!r.ok) return setError(r.data.error ?? "저장하지 못했습니다.");
    download(draftFileName(), text);
    flash(t.draftSaved);
  }

  async function openDrafts() {
    setDraftsOpen(true);
    setDrafts(null);
    const r = await api<{ drafts: DraftRow[] }>("/api/drafts");
    setDrafts(r.ok ? r.data.drafts : []);
  }

  async function deleteDraft(id: string) {
    const r = await api(`/api/drafts?id=${id}`, { method: "DELETE" });
    if (r.ok) setDrafts((d) => (d ? d.filter((x) => x.id !== id) : d));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(lang === "ko" ? "복사하지 못했습니다. 브라우저 권한을 확인해 주세요." : "Could not copy.");
    }
  }

  const label = (key: EqKey) => values[key];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{lang === "ko" ? "페르소나 문체 자동화" : "Persona Style Studio"}</h1>
          <p className="text-sm text-neutral-500">{lang === "ko" ? "소리처럼 조절하는 문장의 맛 — 슬라이더와 캐릭터 페르소나로 글의 문체를 다시 써 드립니다." : "Tune the flavor of your sentences like sound — rewrite style with sliders and character personas."}</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
          {(["en", "ko"] as Lang[]).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-md px-3 py-1.5 ${lang === l ? "bg-white text-violet-700 shadow-sm" : "text-slate-400"}`}>
              {l === "en" ? "ENGLISH" : "한국어"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label={t.close}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_21rem]">
        <div className="order-2 xl:order-1">
          <PersonaPanel
            lang={lang}
            personas={personas}
            overriddenIds={overriddenIds}
            activeId={activeId}
            currentValues={values}
            onToggle={onTogglePersona}
            onSave={savePersona}
            onRemove={removePersona}
            onExport={exportPersonas}
            onImport={importPersonas}
            onGenerate={generatePersona}
          />
        </div>
        <div className="order-1 xl:order-2">
          <CanvasPanel
            lang={lang}
            text={text}
            setText={(s) => {
              setText(s);
              setPrevText(null);
            }}
            creativity={label("creativity")}
            busy={busy}
            canUndo={prevText !== null}
            onGenerate={generate}
            onUndo={() => {
              if (prevText !== null) {
                setText(prevText);
                setPrevText(null);
              }
            }}
            onSaveDraft={saveDraft}
            onOpenLoad={openDrafts}
            onCopy={copy}
            copied={copied}
          />
        </div>
        <div className="order-3">
          <EqPanel lang={lang} values={values} presets={presets} activePresetId={presetId} onChange={onSlider} onPreset={onPreset} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span>
          {t.personaActive}: {activePersona ? activePersona.name : t.none}
        </span>
        <span>
          {t.statChars}: {text.length.toLocaleString()} · {t.statLatency}: {stats ? `${(stats.ms / 1000).toFixed(1)}s` : "-"} · {t.statModel}: Gemini
        </span>
      </div>

      {needKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setNeedKey(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
              <KeyRound size={18} className="text-amber-600" />
              {t.needKeyTitle}
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">{t.needKeyBody}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNeedKey(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">
                {t.close}
              </button>
              <Link href="/settings" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
                {t.goSettings}
              </Link>
            </div>
          </div>
        </div>
      )}

      {draftsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDraftsOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="font-bold text-slate-900">{t.draftsTitle}</h3>
              <button type="button" onClick={() => setDraftsOpen(false)} aria-label={t.close} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-bold text-slate-500 hover:border-violet-300 hover:text-violet-700">
                {t.fromFile}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setText((await f.text()).slice(0, 8000));
                    setPrevText(null);
                    setDraftsOpen(false);
                  }
                  e.target.value = "";
                }}
              />
              {drafts === null ? (
                <p className="py-6 text-center text-sm text-slate-400">...</p>
              ) : drafts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">{t.draftsEmpty}</p>
              ) : (
                drafts.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setText(d.content);
                        setPrevText(null);
                        if (d.eq_values) {
                          setValues(clampValues(d.eq_values));
                          setPresetId(null);
                        }
                        setDraftsOpen(false);
                      }}
                    >
                      <p className="truncate text-sm font-bold text-slate-800">{safeFileName(d.title) || d.content.slice(0, 20)}</p>
                      <p className="line-clamp-2 text-xs text-slate-500">{d.content}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(d.created_at).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}</p>
                    </button>
                    <button type="button" onClick={() => deleteDraft(d.id)} title={t.del} className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

