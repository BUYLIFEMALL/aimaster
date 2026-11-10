"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { addQuickAction, previewQuickAction, type QuickState } from "./actions";

const INITIAL: QuickState = { mode: "idle", error: null, inputErrors: [], rows: [] };

export function QuickForm({ slug }: { slug: string }) {
  // 입력은 화면 상태로 들고 있다가 미리보기·담기 때 같은 값을 보낸다(React 19 폼 초기화로 입력이 비는 것 방지)
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, previewAction, previewing] = useActionState(previewQuickAction.bind(null, slug), INITIAL);
  const [added, addAction, adding] = useActionState(addQuickAction.bind(null, slug), INITIAL);
  const [last, setLast] = useState<"preview" | "add">("preview");
  const state = last === "add" ? added : preview;
  const busy = previewing || adding;

  const send = (kind: "preview" | "add") => {
    const data = new FormData();
    if (file) data.set("file", file);
    else data.set("text", text);
    setLast(kind);
    startTransition(() => (kind === "preview" ? previewAction(data) : addAction(data)));
  };
  const okRows = state.rows.filter((r) => r.ok);
  const badCount = state.rows.length - okRows.length + state.inputErrors.length;
  const sum = okRows.reduce((s, r) => s + r.lineTotal, 0);
  const changed = () => setLast("preview");

  return (
    <section className="mt-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          changed();
        }}
        disabled={!!file}
        rows={8}
        placeholder={"P00001\t10\nP00002 검정 5\nPEN-BK 20"}
        className="w-full rounded border p-3 font-mono text-sm disabled:bg-gray-50"
        data-quick-text
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">또는 엑셀 파일</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            changed();
          }}
          data-quick-file
        />
        <a href={`/s/${slug}/quick-order/template`} className="text-blue-700 underline">
          양식 내려받기
        </a>
        {file && (
          <button type="button" className="text-xs text-gray-500 underline" onClick={() => { setFile(null); changed(); }}>
            파일 빼고 글로 입력
          </button>
        )}
      </div>
      <button type="button" disabled={busy || (!text.trim() && !file)} onClick={() => send("preview")} className="min-h-11 rounded bg-gray-900 px-4 py-2.5 text-sm text-white disabled:opacity-40" data-quick-preview>
        {previewing ? "확인하는 중…" : "미리보기"}
      </button>

      {state.error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.mode === "added" && (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800" data-quick-done>
          장바구니에 {state.added}개 품목을 담았습니다{badCount ? ` — 담지 못한 줄 ${badCount}개는 아래에서 확인해 주세요` : ""}.{" "}
          <Link href={`/s/${slug}/cart`} className="font-semibold underline">장바구니로 가기 →</Link>
        </p>
      )}

      {state.mode !== "idle" && (
        <div className="space-y-3">
          {state.inputErrors.length > 0 && (
            <ul className="list-disc space-y-1 rounded bg-red-50 p-3 pl-6 text-sm text-red-700" data-quick-input-errors>
              {state.inputErrors.map((e) => (
                <li key={e.line}>{e.line}줄 「{e.text}」 — {e.error}</li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm" data-quick-table>
              <thead className="border-b text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-2">줄</th>
                  <th className="py-2 pr-2">품번</th>
                  <th className="py-2 pr-2">상품</th>
                  <th className="py-2 pr-2 text-right">수량</th>
                  <th className="py-2 pr-2 text-right">단가</th>
                  <th className="py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {state.rows.map((r) => (
                  <tr key={`${r.lines.join(",")}-${r.code}`} className={r.ok ? "" : "bg-red-50/60"}>
                    <td className="py-2 pr-2 text-gray-500">{r.lines.join(",")}</td>
                    <td className="py-2 pr-2 font-mono">{r.code}{r.option && <span className="ml-1 text-gray-500">{r.option}</span>}</td>
                    <td className="py-2 pr-2">
                      {r.name}
                      {r.optionLabel && <span className="ml-1 text-gray-500">({r.optionLabel})</span>}
                      {r.inCart > 0 && r.ok && <span className="ml-1 text-xs text-gray-500">장바구니 {r.inCart}개에 더함</span>}
                      {r.error && <p className="text-xs text-red-700">{r.error}</p>}
                    </td>
                    <td className="py-2 pr-2 text-right">{r.qty.toLocaleString("ko-KR")}</td>
                    <td className="py-2 pr-2 text-right">{r.ok ? r.unitPrice.toLocaleString("ko-KR") : "—"}</td>
                    <td className="py-2 text-right">{r.ok ? `${r.lineTotal.toLocaleString("ko-KR")}원` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.mode === "preview" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm" data-quick-sum>
                담을 수 있는 {okRows.length}줄 · 상품 금액 <b>{sum.toLocaleString("ko-KR")}원</b>
                {badCount > 0 && <span className="ml-2 text-red-700">담지 못하는 줄 {badCount}개</span>}
              </span>
              <button type="button" disabled={busy || okRows.length === 0} onClick={() => send("add")} className="min-h-11 rounded bg-blue-600 px-4 py-2.5 text-sm text-white disabled:opacity-40" data-quick-add>
                {adding ? "담는 중…" : `장바구니에 담기 (${okRows.length}줄)`}
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500">단가는 수량 할인을 반영한 값이고, 배송비·쿠폰은 주문서에서 계산합니다.</p>
        </div>
      )}
    </section>
  );
}
