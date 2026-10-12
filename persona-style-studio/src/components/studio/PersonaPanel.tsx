"use client";

import { useRef, useState } from "react";
import { Check, Download, Pencil, RotateCcw, Sparkles, Trash2, Upload, UserPlus, UserRound } from "lucide-react";
import { LIMITS, type EqValues, type Lang, type Persona } from "@/lib/persona/types";
import { isDefaultPersonaId } from "@/lib/persona/data";
import { STRINGS } from "./i18n";

interface Draft {
  id?: string;
  name: string;
  role: string;
  description: string;
  lore: string;
  voice: string;
  style: string;
}
const EMPTY: Draft = { name: "", role: "", description: "", lore: "", voice: "", style: "" };

export function PersonaPanel({
  lang,
  personas,
  overriddenIds,
  activeId,
  currentValues,
  onToggle,
  onSave,
  onRemove,
  onExport,
  onImport,
  onGenerate,
}: {
  lang: Lang;
  personas: Persona[];
  overriddenIds: Set<string>;
  activeId: string | null;
  currentValues: EqValues;
  onToggle: (id: string) => void;
  onSave: (p: Persona) => Promise<boolean>;
  onRemove: (id: string) => Promise<void>;
  onExport: () => void;
  onImport: (file: File) => void;
  onGenerate: (name: string, role: string) => Promise<{ description: string; lore: string; voice: string; style: string; values: EqValues } | null>;
}) {
  const t = STRINGS[lang];
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [overwriteEq, setOverwriteEq] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genValues, setGenValues] = useState<EqValues | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setIsEdit(false);
    setOverwriteEq(false);
    setGenValues(null);
    setEditing({ ...EMPTY });
  }
  function openEdit(p: Persona, e: React.MouseEvent) {
    e.stopPropagation();
    setIsEdit(true);
    setOverwriteEq(false);
    setGenValues(null);
    setEditing({ id: p.id, name: p.name, role: p.role, description: p.description, lore: p.context.lore, voice: p.context.voice, style: p.context.style });
  }

  async function autoGen() {
    if (!editing?.name.trim() || !editing.role.trim()) return;
    setGenBusy(true);
    const r = await onGenerate(editing.name.trim(), editing.role.trim());
    setGenBusy(false);
    if (r) {
      setEditing((d) => (d ? { ...d, description: r.description, lore: r.lore, voice: r.voice, style: r.style } : d));
      setGenValues(r.values);
      if (isEdit) setOverwriteEq(true);
    }
  }

  async function submit() {
    if (!editing || !editing.name.trim() || !editing.role.trim()) return;
    setSaving(true);
    const base = personas.find((p) => p.id === editing.id);
    const values = genValues ?? (isEdit && base && !overwriteEq ? base.values : currentValues);
    const persona: Persona = {
      id: editing.id ?? `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: editing.name.trim(),
      role: editing.role.trim(),
      description: editing.description.trim() || editing.role.trim(),
      avatar: base?.avatar ?? "👤",
      context: { lore: editing.lore, voice: editing.voice, style: editing.style },
      values,
    };
    const ok = await onSave(persona);
    setSaving(false);
    if (ok) setEditing(null);
  }

  const field = (key: keyof Draft, label: string, rows?: number) => (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-400">{label}</label>
      {rows ? (
        <textarea
          value={editing?.[key] ?? ""}
          maxLength={LIMITS.field}
          onChange={(e) => setEditing((d) => (d ? { ...d, [key]: e.target.value } : d))}
          className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-violet-600"
        />
      ) : (
        <input
          value={editing?.[key] ?? ""}
          maxLength={key === "name" ? LIMITS.name : LIMITS.role}
          onChange={(e) => setEditing((d) => (d ? { ...d, [key]: e.target.value } : d))}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-violet-600"
        />
      )}
    </div>
  );

  return (
    <aside className="relative flex max-h-[80vh] min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 xl:max-h-none">
      <div className="mb-3 space-y-2">
        <h2 className="flex items-center gap-2 whitespace-nowrap text-base font-black text-slate-800">
          <UserRound size={18} className="text-violet-700" />
          {t.personaTitle}
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={onExport} title={t.exportAll} className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-violet-600 hover:text-white">
            <Download size={13} />
            {t.exportAll}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} title={t.importAll} className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-violet-600 hover:text-white">
            <Upload size={13} />
            {t.importAll}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {personas.map((p) => {
          const active = activeId === p.id;
          const isDefault = isDefaultPersonaId(p.id);
          const canReset = isDefault && overriddenIds.has(p.id);
          return (
            <div
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 transition ${
                active ? "border-violet-600 bg-violet-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className={`flex size-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl ${active ? "ring-2 ring-violet-600 ring-offset-2" : ""}`}>{p.avatar || "👤"}</div>
                {active && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-violet-600 text-white">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-1">
                  <h3 className={`truncate text-sm font-bold ${active ? "text-violet-700" : "text-slate-800"}`}>{p.name}</h3>
                  <div className="flex shrink-0 gap-0.5">
                    <button type="button" title={t.edit} onClick={(e) => openEdit(p, e)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-violet-700">
                      <Pencil size={15} />
                    </button>
                    {canReset && (
                      <button
                        type="button"
                        title={t.reset}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t.resetConfirm)) void onRemove(p.id);
                        }}
                        className="rounded-md p-1 text-slate-400 hover:bg-orange-50 hover:text-orange-500"
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}
                    {!isDefault && (
                      <button
                        type="button"
                        title={t.del}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t.deleteConfirm)) void onRemove(p.id);
                        }}
                        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mb-0.5 text-xs font-bold text-slate-500">{p.role}</p>
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{p.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openNew}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-bold text-slate-500 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      >
        <UserPlus size={18} />
        {t.addPersona}
      </button>

      {editing && (
        <div className="absolute inset-0 z-20 flex flex-col rounded-2xl bg-white/95 p-4 backdrop-blur-sm">
          <h3 className="mb-3 text-base font-bold text-slate-800">{isEdit ? t.personaEdit : t.personaNew}</h3>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              {field("name", t.name)}
              {field("role", t.role)}
            </div>
            <button
              type="button"
              onClick={autoGen}
              disabled={genBusy || !editing.name.trim() || !editing.role.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-50 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Sparkles size={14} className={genBusy ? "animate-spin" : ""} />
              {t.autoGen}
            </button>
            {field("lore", t.lore, 3)}
            {field("voice", t.voice, 3)}
            {field("style", t.style, 3)}
            {isEdit ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={overwriteEq} onChange={(e) => setOverwriteEq(e.target.checked)} className="size-4 accent-violet-600" />
                {t.overwriteEq}
              </label>
            ) : (
              <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-snug text-blue-600">{t.saveEqHint}</p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !editing.name.trim() || !editing.role.trim()}
              className="rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:bg-slate-300"
            >
              {t.save}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
