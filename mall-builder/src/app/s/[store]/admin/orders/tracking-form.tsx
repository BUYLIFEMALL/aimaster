"use client";

// M2-2 송장 엑셀 일괄 등록 — 주문 엑셀을 내려받아 「택배사·송장번호」를 채워 올리면 결제 완료·배송 준비 주문이 「배송 중」으로
import { useActionState } from "react";
import { trackingUploadAction, type TrackingState } from "./bulk-actions";

const INITIAL: TrackingState = { error: null, results: [], done: 0 };

export default function TrackingForm({ slug, downloadHref }: { slug: string; downloadHref: string }) {
  const [state, action, pending] = useActionState(trackingUploadAction.bind(null, slug), INITIAL);
  const failed = state.results.filter((r) => !r.ok);
  return (
    <details className="mt-3 rounded border p-3 text-sm" data-tracking-upload open={state.results.length > 0 || !!state.error}>
      <summary className="cursor-pointer font-semibold">📦 송장 엑셀로 한꺼번에 넣기</summary>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-gray-600">
        <li>
          <a href={downloadHref} className="text-blue-700 underline">주문 엑셀 내려받기</a> — 지금 목록 조건 그대로(최대 3,000건). 「송장 없음」을 켜고 받으면 보낼 주문만 나옵니다.
        </li>
        <li>노란 칸 「택배사」「송장번호」를 채워 저장합니다(다른 칸은 그대로 두셔도 됩니다).</li>
        <li>아래에 올리면 결제 완료·배송 준비 주문이 「배송 중」으로 바뀝니다. 한 번에 500건까지.</li>
      </ol>
      <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".xlsx" required className="text-sm" />
        <button disabled={pending} className="rounded bg-gray-900 px-3 py-1.5 text-white disabled:opacity-50">
          {pending ? "넣는 중…" : "송장 넣기"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-red-600">{state.error}</p>}
      {state.results.length > 0 && (
        <div className="mt-3" data-tracking-results>
          <p>
            <b className="text-green-700">{state.done}건 배송 중으로</b>
            {failed.length > 0 && <b className="ml-2 text-red-600">{failed.length}건 못 넣음</b>}
          </p>
          <ul className="mt-1 max-h-60 overflow-auto rounded border text-xs">
            {state.results.map((r, i) => (
              <li key={i} className={`flex gap-2 border-b px-2 py-1 ${r.ok ? "" : "bg-red-50"}`}>
                <span className="w-12 shrink-0 text-gray-500">{r.row}줄</span>
                <span className="w-36 shrink-0">{r.orderNo}</span>
                <span>{r.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
