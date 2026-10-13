"use client";
import { useState } from "react";
import { PRIORITY_LABELS, taskInputSchema, type Workspace, type Task, type TaskInput } from "@/lib/planner/model";

export function TaskEditor({
  workspace,
  date,
  editing,
  busy,
  save,
  cancel
}: {
  workspace: Workspace;
  date: string;
  editing?: Task;
  busy: boolean;
  save: (input: TaskInput) => Promise<boolean>;
  cancel: () => void;
}) {
  const [error, setError] = useState("");
  const [showDate, setShowDate] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const result = taskInputSchema.safeParse({
      title: data.get("title"),
      categoryId: data.get("categoryId"),
      priority: data.get("priority"),
      estimatedMinutes: Number(data.get("estimatedMinutes")),
      plannedDate: data.get("plannedDate") || date
    });
    if (!result.success) {
      setError("제목과 유효한 예상 시간(0~1440분)을 입력해주세요.");
      return;
    }
    if (await save(result.data)) {
      if (!editing) form.reset();
    }
  }

  return (
    <section className="card task-editor-card">
      <div className="section-header">
        <h2>{editing ? "할 일 수정" : "새 할 일"}</h2>
      </div>
      <form onSubmit={submit} className="task-editor-form">
        <label className="form-field">
          <span className="field-label">제목</span>
          <input
            name="title"
            defaultValue={editing?.title ?? ""}
            maxLength={200}
            placeholder="예: 보고서 초안 작성"
            required
            autoComplete="off"
          />
        </label>

        <label className="form-field">
          <span className="field-label">카테고리</span>
          <select name="categoryId" defaultValue={editing?.categoryId ?? workspace.settings.defaultCategoryId}>
            {workspace.categories
              .filter(c => !c.archived)
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>

        <div className="form-grid-2col">
          <label className="form-field">
            <span className="field-label">우선순위</span>
            <select name="priority" defaultValue={editing?.priority ?? "normal"}>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="field-label">시간(분)</span>
            <input
              type="number"
              name="estimatedMinutes"
              min={0}
              max={1440}
              step={1}
              defaultValue={editing?.estimatedMinutes ?? 30}
              placeholder="30"
              required
            />
          </label>
        </div>

        <input type="hidden" name="plannedDate" value={editing?.plannedDate ?? date} />

        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}

        <div className="form-submit-row">
          <button
            type="submit"
            className="add-task-submit-btn"
            disabled={busy}
            aria-label={editing ? "수정 저장" : "할 일 추가"}
          >
            {busy ? "저장 중…" : editing ? "수정 저장" : "+ 추가"}
          </button>
          {editing && (
            <button type="button" className="cancel-edit-btn" disabled={busy} onClick={cancel}>
              수정 취소
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

