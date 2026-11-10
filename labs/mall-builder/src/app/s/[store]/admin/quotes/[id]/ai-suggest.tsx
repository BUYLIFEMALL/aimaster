"use client";

import { useActionState } from "react";
import { aiSuggestAction, type AiQuoteState } from "./ai-actions";

const won = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("ko-KR")}원`);

// D27 「AI 단가 제안」 — 제안은 아래 회신 칸에 채워 넣기만 한다(회신은 운영자가 직접)
export function AiSuggest({ slug, quoteId, settingsHref, last }: { slug: string; quoteId: string; settingsHref: string; last: string | null }) {
  const [state, run, pending] = useActionState(aiSuggestAction.bind(null, slug, quoteId), { ok: null } as AiQuoteState);
  const fill = () => {
    if (state.ok !== true) return;
    for (const r of state.rows) {
      if (r.final == null) continue;
      const input = document.querySelector<HTMLInputElement>(`input[name="price_${r.item_id}"]`);
      if (input) {
        input.value = String(r.final);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-violet-200 bg-violet-50/40 p-4 text-sm" data-ai-suggest>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">🤖 AI 단가 제안</h3>
        <span className="text-xs text-gray-500">판매가·이 거래처 지금 단가·원가·재고·최근 구매 단가를 보고 제안합니다. 몰 대표 본인 키로 호출되고 비용이 듭니다.</span>
        <form action={run} className="ml-auto">
          <button disabled={pending} className="min-h-10 rounded bg-violet-700 px-4 text-white disabled:opacity-50" data-ai-run>
            {pending ? "제안 받는 중…(10~30초)" : "AI 단가 제안 받기"}
          </button>
        </form>
      </div>
      {last && state.ok === null && <p className="mt-2 text-xs text-gray-500">지난 제안: {last}</p>}
      {state.ok === false && (
        <p className="mt-3 rounded bg-red-50 p-2 text-red-700" data-ai-error>
          {state.error}
          {state.needKey && (
            <a href={settingsHref} className="ml-2 underline">설정으로 가기</a>
          )}
        </p>
      )}
      {state.ok === true && (
        <div className="mt-3 space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs" data-ai-rows>
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1 pr-2">품목</th>
                  <th className="pr-2 text-right">수량</th>
                  <th className="pr-2 text-right">지금 거래처 단가</th>
                  <th className="pr-2 text-right">원가</th>
                  <th className="pr-2 text-right">제안</th>
                  <th className="pr-2 text-right">마진</th>
                  <th>이유·주의</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {state.rows.map((r) => (
                  <tr key={r.item_id}>
                    <td className="py-1.5 pr-2">{r.name}{r.option && <span className="text-gray-500"> · {r.option}</span>}</td>
                    <td className="pr-2 text-right">{r.qty}</td>
                    <td className="pr-2 text-right">{won(r.customer_unit)}</td>
                    <td className="pr-2 text-right">{won(r.cost)}</td>
                    <td className="pr-2 text-right font-semibold">
                      {won(r.final)}
                      {r.suggested != null && r.final !== r.suggested && <span className="block text-[10px] font-normal text-gray-400 line-through">{won(r.suggested)}</span>}
                    </td>
                    <td className="pr-2 text-right">{r.margin == null ? "—" : `${r.margin}%`}</td>
                    <td>
                      {r.reason}
                      {r.warnings.length > 0 && <span className="block text-amber-700">⚠ {r.warnings.join(" · ")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.note && <p className="text-gray-700" data-ai-note>💬 {state.note}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={fill} className="min-h-10 rounded border border-violet-700 bg-white px-4 text-violet-800" data-ai-fill>
              제안 단가를 아래 회신 칸에 채우기
            </button>
            <span className="text-xs text-gray-500">
              {state.model} · 대략 {state.cost.krw.toLocaleString("ko-KR")}원(${state.cost.usd}) · 최소 마진 {state.minMargin}% 보정 · 채운 뒤 고쳐서 「회신 보내기」
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
