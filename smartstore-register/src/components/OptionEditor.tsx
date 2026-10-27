"use client";

import { useMemo, useState } from "react";
import { combineValues, splitValues, OPTION_GROUPS_MAX, type OptionCombo, type OptionSpec, type OptionType } from "@/lib/smartstore/options";

type Mode = "none" | OptionType;
interface Row { name: string; text: string }

/** 스마트스토어 옵션 입력 — 판매자센터 「엑셀 일괄등록」으로 올릴 값을 만든다. 숨은 칸 name="options"에 JSON으로 담긴다. */
export function OptionEditor({ initial, defaultStock }: { initial: unknown; defaultStock: number }) {
  const init = (initial && typeof initial === "object" ? initial : null) as OptionSpec | null;
  const [mode, setMode] = useState<Mode>(init?.type ?? "none");
  const [rows, setRows] = useState<Row[]>(init?.groups?.length ? init.groups.map((g) => ({ name: g.name, text: g.values.join(", ") })) : [{ name: "", text: "" }]);
  const [combos, setCombos] = useState<Record<string, { price: string; stock: string; code?: string }>>(() => {
    const m: Record<string, { price: string; stock: string; code?: string }> = {};
    for (const c of init?.combos ?? []) m[JSON.stringify(c.values)] = { price: String(c.price), stock: String(c.stock), code: c.code ?? "" };
    return m;
  });

  const groups = rows.map((r) => ({ name: r.name.trim(), values: splitValues(r.text) })).filter((g) => g.name || g.values.length);
  const all = useMemo(() => (mode === "combination" && groups.length && groups.every((g) => g.values.length) ? combineValues(groups) : []), [mode, JSON.stringify(groups)]); // eslint-disable-line react-hooks/exhaustive-deps
  const comboList: OptionCombo[] = all.map((values) => {
    const c = combos[JSON.stringify(values)];
    return { values, price: Number(c?.price ?? 0) || 0, stock: c?.stock === undefined || c.stock === "" ? defaultStock : Number(c.stock) || 0, ...(c?.code ? { code: c.code } : {}) };
  });
  const spec: OptionSpec | null = mode === "none" ? null : { type: mode, groups, ...(mode === "combination" ? { combos: comboList } : {}) };
  const setCombo = (values: string[], k: "price" | "stock" | "code", v: string) => setCombos((m) => ({ ...m, [JSON.stringify(values)]: { price: m[JSON.stringify(values)]?.price ?? "0", stock: m[JSON.stringify(values)]?.stock ?? String(defaultStock), [k]: v } }));

  return (
    <fieldset className="space-y-2">
      <legend className="slw-label">옵션</legend>
      <input type="hidden" name="options" value={JSON.stringify(spec)} />
      <div className="flex flex-wrap gap-1.5 text-xs">
        {([["none", "쓰지 않음"], ["simple", "단독형"], ["combination", "조합형(옵션별 가격·재고)"]] as [Mode, string][]).map(([m, label]) => (
          <label key={m} className={`cursor-pointer rounded-lg border px-2 py-1 ${mode === m ? "border-emerald-500 bg-emerald-50 font-bold" : "border-slate-200"}`}>
            <input type="radio" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
            {label}
          </label>
        ))}
      </div>
      {mode !== "none" && (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-slate-200 p-1.5">
              <div className="flex items-center gap-1.5">
                <input value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="옵션명 예: 색상" maxLength={25} className="slw-field" />
                {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="slw-btn shrink-0 px-2" aria-label="옵션 줄 빼기">✕</button>}
              </div>
              <input value={r.text} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="옵션값 예: 빨강, 파랑 (쉼표로 구분)" className="slw-field" />
            </div>
          ))}
          {rows.length < OPTION_GROUPS_MAX && <button type="button" onClick={() => setRows([...rows, { name: "", text: "" }])} className="slw-btn text-xs">＋ 옵션명 추가</button>}
          {mode === "combination" && comboList.length > 0 && (
            <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-slate-50 text-[11px] text-slate-500"><tr><th className="p-1.5">조합</th><th className="p-1.5">옵션가(원)</th><th className="p-1.5">재고</th><th className="p-1.5">관리코드</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {comboList.map((c) => (
                    <tr key={JSON.stringify(c.values)}>
                      <td className="p-1.5 text-slate-700">{c.values.join(" / ")}</td>
                      <td className="p-1"><input type="number" step={10} value={combos[JSON.stringify(c.values)]?.price ?? "0"} onChange={(e) => setCombo(c.values, "price", e.target.value)} className="slw-field w-20" /></td>
                      <td className="p-1"><input type="number" min={0} value={combos[JSON.stringify(c.values)]?.stock ?? String(defaultStock)} onChange={(e) => setCombo(c.values, "stock", e.target.value)} className="slw-field w-16" /></td>
                      <td className="p-1"><input value={combos[JSON.stringify(c.values)]?.code ?? ""} maxLength={20} onChange={(e) => setCombo(c.values, "code", e.target.value)} placeholder="선택" className="slw-field w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            {mode === "simple" ? "단독형: 옵션값마다 한 줄씩 올라갑니다(옵션별 가격·재고 없음)." : "조합형: 옵션가는 10원 단위, 0원인 조합이 하나 이상 있어야 합니다."} 확장이 판매자센터 「엑셀 일괄등록」으로 올립니다. 마지막으로 보낸 옵션이 다음에 다시 채워집니다.
          </p>
        </div>
      )}
    </fieldset>
  );
}
