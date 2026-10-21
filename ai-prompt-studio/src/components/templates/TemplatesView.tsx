"use client";

// 「📁 내 템플릿 보관함」(2026-10-21 병합 C — 옛 AI 프롬프트 템플릿 자동화의 보관함·변수·실행).
// 바뀐 점: 브라우저(localStorage)가 아니라 내 계정 DB(/api/templates)에 저장해 기기를 바꿔도 남는다.
// 보관함이 비어 있으면 예제를 보여 주고, 예제를 편집해 저장하면 내 템플릿으로 새로 저장된다.
import { useEffect, useMemo, useState } from "react";
import { PromptLibrary } from "./PromptLibrary";
import { PromptFormModal } from "./PromptFormModal";
import { PromptExecuteModal } from "./PromptExecuteModal";
import { BackupModal } from "./BackupModal";
import { PromptTemplate } from "@/types/template";
import { DEFAULT_CATEGORIES, DEFAULT_PROMPTS } from "@/data/templatePresets";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isSaved = (p: PromptTemplate) => UUID.test(p.id);

async function callJson<T>(url: string, init: RequestInit | undefined, onNeedApiKey: () => void): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.needApiKey) onNeedApiKey();
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  }
  return data as T;
}

export function TemplatesView({
  draft,
  onDraftConsumed,
  onNeedApiKey,
}: {
  /** 결과 화면 「내 템플릿으로 저장」에서 넘겨받은 새 템플릿 초안 */
  draft: PromptTemplate | null;
  onDraftConsumed: () => void;
  onNeedApiKey: () => void;
}) {
  const [saved, setSaved] = useState<PromptTemplate[] | null>(null);
  const [hiddenExamples, setHiddenExamples] = useState<string[]>([]);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState<PromptTemplate | null>(null);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [executingPrompt, setExecutingPrompt] = useState<PromptTemplate | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  useEffect(() => {
    callJson<{ templates: PromptTemplate[] }>("/api/templates", undefined, onNeedApiKey)
      .then((d) => setSaved(d.templates))
      .catch((e) => { setSaved([]); setLoadError(e.message); });
  }, [onNeedApiKey]);

  // 결과 화면에서 넘어온 초안은 편집 창을 바로 열어 저장하게 한다
  useEffect(() => {
    if (draft) {
      setEditPrompt(draft);
      setFormModalOpen(true);
      onDraftConsumed();
    }
  }, [draft, onDraftConsumed]);

  const showExamples = saved !== null && saved.length === 0;
  const prompts = useMemo(
    () => (showExamples ? DEFAULT_PROMPTS.filter((p) => !hiddenExamples.includes(p.id)) : saved ?? []),
    [showExamples, saved, hiddenExamples],
  );
  const categories = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...prompts.map((p) => p.category).filter(Boolean), ...extraCategories])),
    [prompts, extraCategories],
  );

  const handleSavePrompt = async (data: Omit<PromptTemplate, "id" | "createdAt">, editId?: string) => {
    try {
      if (editId && UUID.test(editId)) {
        const r = await callJson<{ template: PromptTemplate }>("/api/templates", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, template: data }),
        }, onNeedApiKey);
        setSaved((cur) => (cur ?? []).map((p) => (p.id === editId ? r.template : p)));
      } else {
        const r = await callJson<{ template: PromptTemplate }>("/api/templates", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: data }),
        }, onNeedApiKey);
        setSaved((cur) => [r.template, ...(cur ?? [])]);
      }
      setNotice("내 템플릿에 저장했습니다.");
      setEditPrompt(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장하지 못했습니다.");
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const target = prompts.find((p) => p.id === id);
    if (!target) return;
    if (!isSaved(target)) { setHiddenExamples((cur) => [...cur, id]); return; }
    if (!confirm("이 프롬프트 템플릿을 삭제하시겠습니까?")) return;
    try {
      await callJson(`/api/templates?id=${encodeURIComponent(id)}`, { method: "DELETE" }, onNeedApiKey);
      setSaved((cur) => (cur ?? []).filter((p) => p.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    }
  };

  const handleImportPrompts = async (imported: PromptTemplate[], overwrite: boolean) => {
    if (overwrite && !confirm("내 템플릿을 모두 지우고 백업 파일 내용으로 바꿀까요? 되돌릴 수 없습니다.")) return;
    try {
      const r = await callJson<{ added: number; skipped: number; templates: PromptTemplate[] }>("/api/templates", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: imported, replace: overwrite }),
      }, onNeedApiKey);
      setSaved(r.templates);
      setNotice(`${r.added}개를 가져왔습니다.${r.skipped ? ` 이미 있거나 형식이 맞지 않는 ${r.skipped}개는 건너뛰었습니다.` : ""}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "가져오지 못했습니다.");
    }
  };

  const post = <T,>(url: string, body: unknown) =>
    callJson<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, onNeedApiKey);

  return (
    <div className="space-y-4">
      {saved === null && <p className="text-xs text-slate-500">내 템플릿을 불러오는 중…</p>}
      {loadError && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{loadError}</p>}
      {showExamples && (
        <p className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs text-violet-800">
          아직 저장한 템플릿이 없어 예제를 보여 드립니다. 예제를 수정해 저장하거나 [새 프롬프트]·결과 화면의 [📁 내 템플릿으로 저장]으로 나만의 템플릿을 만드세요.
          예전 「AI 프롬프트 템플릿 자동화」에 만든 템플릿은 그 주소에서 [AI Prompt로 옮기기]를 누르면 이곳으로 옮겨집니다.
        </p>
      )}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800" role="status">{notice}</p>}

      <PromptLibrary
        prompts={prompts}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onAddCategory={(c) => { setExtraCategories((cur) => (cur.includes(c) ? cur : [...cur, c])); setActiveCategory(c); }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreate={() => { setEditPrompt(null); setFormModalOpen(true); }}
        onEditPrompt={(p) => { setEditPrompt(p); setFormModalOpen(true); }}
        onDeletePrompt={(id) => void handleDeletePrompt(id)}
        onExecutePrompt={(p) => { setExecutingPrompt(p); setExecuteModalOpen(true); }}
      />

      <div className="flex justify-end">
        <button type="button" onClick={() => setBackupModalOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
          💾 백업 파일 내보내기·가져오기
        </button>
      </div>

      <PromptFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={(d, editId) => void handleSavePrompt(d, editId)}
        editPrompt={editPrompt}
        categories={categories}
        onCallSuggest={(field, context) => post<{ text: string }>("/api/templates/suggest-field", { field, ...context }).then((d) => d.text)}
      />
      <PromptExecuteModal
        isOpen={executeModalOpen}
        onClose={() => setExecuteModalOpen(false)}
        prompt={executingPrompt}
        onExecute={(promptText) => post<{ text: string }>("/api/templates/execute", { promptText }).then((d) => d.text)}
        onAutoFill={(title, description, variables) => post<{ values: Record<string, string> }>("/api/templates/auto-fill", { title, description, variables }).then((d) => d.values)}
      />
      <BackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        prompts={saved ?? []}
        onImportPrompts={(items, overwrite) => void handleImportPrompts(items, overwrite)}
      />
    </div>
  );
}
