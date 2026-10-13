"use client";
import { useState } from "react";
import { PRIORITY_LABELS, taskInputSchema, type Workspace, type Task, type TaskInput } from "@/lib/planner/model";
export function TaskEditor({ workspace, date, editing, busy, save, cancel }: { workspace: Workspace; date: string; editing?: Task; busy: boolean; save: (input: TaskInput) => Promise<boolean>; cancel: () => void }) {
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const form = e.currentTarget, data = new FormData(form);
    const result = taskInputSchema.safeParse({ title: data.get("title"), categoryId: data.get("categoryId"), priority: data.get("priority"), estimatedMinutes: Number(data.get("estimatedMinutes")), plannedDate: data.get("plannedDate") });
    if (!result.success) { setError("제목·날짜를 입력하고 예상시간은 0~1440 사이 정수로 입력해주세요."); return; }
    if (await save(result.data)) { if (!editing) form.reset(); }
  }
  return <section className="card"><h2>{editing ? "할 일 수정" : "새 할 일"}</h2><form onSubmit={submit} className="stack">
    <label>제목<input name="title" defaultValue={editing?.title ?? ""} maxLength={200} placeholder="오늘 끝내고 싶은 일을 적어주세요" required/></label>
    <div className="form-grid"><label>분류<select name="categoryId" defaultValue={editing?.categoryId ?? workspace.settings.defaultCategoryId}>{workspace.categories.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>우선순위<select name="priority" defaultValue={editing?.priority ?? "normal"}>{Object.entries(PRIORITY_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>예상시간 (분)<input type="number" name="estimatedMinutes" min={0} max={1440} step={1} defaultValue={editing?.estimatedMinutes ?? 30} required/></label><label>계획 날짜<input type="date" name="plannedDate" defaultValue={editing?.plannedDate ?? date} required/></label></div>
    <p className="muted">예상시간 0분은 예상 미설정으로 기록합니다. 수정해도 집중 기록은 유지됩니다.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="actions"><button className="primary" disabled={busy}>{busy ? "저장 중…" : editing ? "수정 저장" : "할 일 추가"}</button>{editing && <button type="button" disabled={busy} onClick={cancel}>수정 취소</button>}</div>
  </form></section>;
}
