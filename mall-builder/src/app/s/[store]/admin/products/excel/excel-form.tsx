"use client";

import { startTransition, useActionState, useState } from "react";
import { applyExcelAction, previewExcelAction, type ExcelState } from "./actions";
import { useInlineConfirm } from "@/app/inline-confirm";

const INITIAL: ExcelState = { mode: "idle", error: null, sheetErrors: [], counts: { create: 0, update: 0, same: 0, error: 0 }, rows: [] };
const ACTION_LABEL = { create: "새로 등록", update: "수정", same: "바뀐 것 없음", error: "오류" } as const;
const ACTION_TONE = {
  create: "bg-green-50 text-green-700",
  update: "bg-blue-50 text-blue-700",
  same: "bg-gray-100 text-gray-500",
  error: "bg-red-50 text-red-700",
} as const;

export function ExcelForm({ slug }: { slug: string }) {
  // 고른 파일은 화면 상태에 들고 있다가 미리보기·적용 때 같은 파일을 보낸다(React 19 폼 초기화로 파일 칸이 비는 것 방지)
  const [file, setFile] = useState<File | null>(null);
  const [preview, previewAction, previewing] = useActionState(previewExcelAction.bind(null, slug), INITIAL);
  const [applied, applyAction, applying] = useActionState(applyExcelAction.bind(null, slug), INITIAL);
  const [last, setLast] = useState<"preview" | "apply">("preview");
  const confirmBox = useInlineConfirm();
  const state = last === "apply" ? applied : preview;
  const busy = previewing || applying;

  const send = (kind: "preview" | "apply") => {
    if (!file) return;
    const data = new FormData();
    data.set("file", file);
    setLast(kind);
    startTransition(() => (kind === "preview" ? previewAction(data) : applyAction(data)));
  };
  const blocked = state.sheetErrors.length > 0 || state.counts.error > 0;
  const changes = state.counts.create + state.counts.update;
  const [onlyIssues, setOnlyIssues] = useState(true);
  const rows = onlyIssues ? state.rows.filter((r) => r.action !== "same") : state.rows;

  return (
    <section className="mt-6 rounded-lg border p-4">
      <h2 className="font-medium">엑셀 올리기</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setLast("preview");
          }}
          className="text-sm"
          data-excel-file
        />
        <button type="button" disabled={!file || busy} onClick={() => send("preview")} className="min-h-11 rounded bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-40" data-excel-preview>
          {previewing ? "확인하는 중…" : "미리보기"}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">.xlsx · 4MB · 상품 1,000개까지</p>

      {state.error && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}

      {state.mode === "applied" && state.applied && (
        <p className="mt-3 rounded bg-green-50 p-3 text-sm text-green-800" data-excel-done>
          적용했습니다 — 새로 등록 {state.applied.created}개 · 수정 {state.applied.updated}개
        </p>
      )}

      {state.mode !== "idle" && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm" data-excel-counts>
            {(["create", "update", "same", "error"] as const).map((k) => (
              <span key={k} className={`rounded px-2 py-1 ${ACTION_TONE[k]}`}>
                {ACTION_LABEL[k]} {state.counts[k]}
              </span>
            ))}
          </div>

          {state.sheetErrors.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 rounded bg-red-50 p-3 pl-6 text-sm text-red-700">
              {state.sheetErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> 바뀐 것 없는 줄 숨기기
          </label>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-2">줄</th>
                  <th className="py-2 pr-2">품번</th>
                  <th className="py-2 pr-2">상품명</th>
                  <th className="py-2 pr-2">처리</th>
                  <th className="py-2">내용</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 300).map((r) => (
                  <tr key={`${r.row}-${r.code}`} className={r.action === "error" ? "bg-red-50/50" : ""}>
                    <td className="py-2 pr-2 text-gray-500">{r.row}</td>
                    <td className="py-2 pr-2 font-mono">{r.code}</td>
                    <td className="py-2 pr-2">{r.name}</td>
                    <td className="py-2 pr-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${ACTION_TONE[r.action]}`}>{ACTION_LABEL[r.action]}</span>
                    </td>
                    <td className="py-2 text-xs">
                      {r.action === "error" ? <span className="text-red-700">{r.errors.join(" · ")}</span> : r.changes.length ? `바뀜: ${r.changes.join(", ")}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 300 && <p className="mt-2 text-xs text-gray-500">앞 300줄만 보여 줍니다(전체 {rows.length}줄).</p>}
          </div>

          {state.mode === "preview" && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || blocked || changes === 0}
                onClick={() => confirmBox.ask(`새로 등록 ${state.counts.create}개, 수정 ${state.counts.update}개를 적용할까요?`, () => send("apply"))}
                className="min-h-11 rounded bg-blue-600 px-4 py-2.5 text-sm text-white disabled:opacity-40"
                data-excel-apply
              >
                {applying ? "적용하는 중…" : `적용 (${changes}개)`}
              </button>
              {confirmBox.box}
              {blocked && <span className="text-sm text-red-700">오류를 고쳐 다시 올려야 적용할 수 있습니다.</span>}
              {!blocked && changes === 0 && <span className="text-sm text-gray-500">바뀐 상품이 없습니다.</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
