"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import type { CardStyle } from "@/lib/cardnews/types";
import { useStudio } from "./ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, INPUT, SELECT } from "./ui";

interface Template {
  id: string;
  name: string;
  style: CardStyle;
}

/** 내 디자인 템플릿: 현재 스타일을 이름 붙여 저장하고, 다른 프로젝트에서 불러와 적용한다(문구·이미지는 담지 않는다). */
export function TemplateBox() {
  const { project, update } = useStudio();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/templates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "템플릿을 불러오지 못했습니다.");
      setTemplates(data.templates);
    } catch (e) {
      setTemplates([]);
      setMessage({ type: "error", text: e instanceof Error ? e.message : "템플릿을 불러오지 못했습니다." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = () => {
    const t = templates?.find((x) => x.id === selected);
    if (!t) return;
    update((d) => ({ ...d, style: t.style }));
    setMessage({ type: "ok", text: `"${t.name}" 템플릿을 적용했습니다. (이미 만든 배경 이미지는 바뀌지 않습니다)` });
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, style: project.style }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "템플릿을 저장하지 못했습니다.");
      setName("");
      setMessage({ type: "ok", text: "현재 디자인을 템플릿으로 저장했습니다." });
      await load();
      setSelected(data.id);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "템플릿을 저장하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${selected}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "삭제하지 못했습니다.");
      setSelected("");
      setConfirmDelete(false);
      setMessage({ type: "ok", text: "템플릿을 삭제했습니다." });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "삭제하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-bold text-gray-900">내 템플릿</h2>
      <p className="text-[11px] text-gray-500">자주 쓰는 디자인(화풍·글자·배치·효과)을 저장해 두고 다른 프로젝트에서 불러옵니다. 문구와 이미지는 저장하지 않습니다.</p>

      {templates === null ? (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 불러오는 중…
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${SELECT} sm:w-64`} value={selected} onChange={(e) => { setSelected(e.target.value); setConfirmDelete(false); }}>
            <option value="">{templates.length ? "저장한 템플릿 선택…" : "저장한 템플릿이 없습니다"}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={!selected || busy} onClick={apply} className={BTN_GHOST}>
            적용
          </button>
          {confirmDelete ? (
            <>
              <button type="button" disabled={busy} onClick={() => void remove()} className="rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                삭제 확인
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 underline">
                취소
              </button>
            </>
          ) : (
            <button type="button" aria-label="템플릿 삭제" disabled={!selected || busy} onClick={() => setConfirmDelete(true)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input className={`${INPUT} sm:w-64`} value={name} maxLength={40} placeholder="현재 디자인을 저장할 이름" onChange={(e) => setName(e.target.value)} />
        <button type="button" disabled={!name.trim() || busy} onClick={() => void save()} className={BTN_PRIMARY}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 템플릿으로 저장
        </button>
      </div>
      {message && (message.type === "error" ? <ErrorNote message={message.text} /> : <p className="text-xs text-emerald-700">{message.text}</p>)}
    </Card>
  );
}
