"use client";

import { useMemo, useState, useTransition } from "react";
import { checkProductDraftAction, loadCategoryAction, type DraftCheck } from "@/lib/actions/product";
import type { CategoryMeta } from "@/lib/coupang/category";
import type { CoupangOption } from "@/lib/coupang/product";

const MAX_COMBOS = 200;
const DEFAULT_STOCK = 100;
const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const label = "mb-1 block text-xs font-bold text-slate-700";

type Row = CoupangOption & { key: string };

/** 구매옵션 값들의 모든 조합(예: 색상 2 × 사이즈 3 = 6줄) */
function combos(axes: { type: string; values: string[] }[]): { type: string; value: string }[][] {
  return axes.reduce<{ type: string; value: string }[][]>((acc, ax) => acc.flatMap((c) => ax.values.map((v) => [...c, { type: ax.type, value: v }])), [[]]);
}
const splitValues = (s: string) => [...new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean))];

export function ProductForm(props: {
  productId: string;
  initialName: string;
  originalPrice: number;
  salePrice: number;
  shopCategory: string | null;
  keysSaved: boolean;
  defaultsSaved: boolean;
}) {
  const [name, setName] = useState(props.initialName);
  const [brand, setBrand] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [cat, setCat] = useState<{ code: number; name: string; meta: CategoryMeta } | null>(null);
  const [catError, setCatError] = useState("");
  const [axisText, setAxisText] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [searchVals, setSearchVals] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string>("");
  const [tags, setTags] = useState("");
  const [check, setCheck] = useState<DraftCheck | null>(null);
  const [pending, start] = useTransition();

  const purchaseAttrs = useMemo(() => cat?.meta.attributes.filter((a) => a.purchase) ?? [], [cat]);
  const searchAttrs = useMemo(() => cat?.meta.attributes.filter((a) => !a.purchase) ?? [], [cat]);

  function loadCategory(code?: number) {
    setCatError("");
    start(async () => {
      const r = await loadCategoryAction({ name, code });
      if (!r.ok) { setCatError(r.error); return; }
      setCat({ code: r.code, name: r.name, meta: r.meta });
      setAxisText({});
      setSearchVals({});
      setNotice(r.meta.notices[0]?.category ?? "");
      setRows(r.meta.singleAllowed ? [singleRow()] : []);
      setCheck(null);
    });
  }

  function singleRow(): Row {
    return { key: "single", name: name.trim(), originalPrice: props.originalPrice, salePrice: props.salePrice, stock: DEFAULT_STOCK, attributes: [] };
  }

  const axes = purchaseAttrs.map((a) => ({ type: a.name, values: splitValues(axisText[a.name] ?? "") })).filter((a) => a.values.length);
  const comboCount = axes.length ? axes.reduce((n, a) => n * a.values.length, 1) : 0;

  function buildRows() {
    if (!axes.length) { setRows(cat?.meta.singleAllowed ? [singleRow()] : []); return; }
    if (comboCount > MAX_COMBOS) return;
    const prev = new Map(rows.map((r) => [r.key, r]));
    setRows(combos(axes).map((attrs) => {
      const key = attrs.map((a) => `${a.type}=${a.value}`).join("|");
      const old = prev.get(key);
      return old ?? { key, name: attrs.map((a) => a.value).join(" / "), originalPrice: props.originalPrice, salePrice: props.salePrice, stock: DEFAULT_STOCK, attributes: attrs };
    }));
  }

  const setRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;

  function runCheck() {
    start(async () => {
      setCheck(await checkProductDraftAction(props.productId, {
        categoryCode: cat?.code ?? null,
        name,
        brand,
        manufacturer,
        options: rows.map(({ key: _key, ...o }) => o),
        searchAttributes: Object.entries(searchVals).map(([type, value]) => ({ type, value })),
        noticeCategory: notice || null,
        searchTags: splitValues(tags).slice(0, 20),
      }));
    });
  }

  return (
    <div className="space-y-5">
      {(!props.keysSaved || !props.defaultsSaved) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
          ⚠ {!props.keysSaved ? "「쿠팡 연결」에서 키를 먼저 등록해 주세요. " : ""}{!props.defaultsSaved ? "「배송·반품 기본값」을 먼저 저장해 주세요." : ""}
        </div>
      )}

      <section className="slw-card space-y-3 p-5">
        <h2 className="text-base font-extrabold text-slate-900">1. 상품명 · 카테고리</h2>
        <label className="block"><span className={label}>쿠팡 상품명(100자까지)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={input} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className={label}>브랜드(없으면 비움)</span><input value={brand} onChange={(e) => setBrand(e.target.value)} className={input} /></label>
          <label className="block"><span className={label}>제조사(없으면 비움)</span><input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={input} /></label>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" disabled={pending || !props.keysSaved || !name.trim()} onClick={() => loadCategory()} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
            {pending ? "쿠팡에 묻는 중…" : "🗂 쿠팡 카테고리 추천받기"}
          </button>
          <span className="text-xs text-slate-500">또는 번호 직접</span>
          <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))} placeholder="예: 69579" className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          <button type="button" disabled={pending || !codeInput} onClick={() => loadCategory(Number(codeInput))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">이 번호로</button>
        </div>
        {props.shopCategory && <p className="text-xs text-slate-500">상세페이지에 적힌 분류: {props.shopCategory}</p>}
        {catError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {catError}</p>}
        {cat && (
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">
            ✅ <b>{cat.name}</b> <span className="font-mono text-xs">#{cat.code}</span> · 옵션 없는 단일 상품 {cat.meta.singleAllowed ? "가능" : <b>불가 — 구매옵션을 넣어야 합니다</b>}
          </p>
        )}
      </section>

      {cat && (
        <section className="slw-card space-y-3 p-5">
          <h2 className="text-base font-extrabold text-slate-900">2. 구매옵션 · 옵션 표</h2>
          <p className="text-sm text-slate-600">고객이 고르는 옵션입니다. 값을 쉼표로 나눠 넣고 「옵션 표 만들기」를 누르면 조합마다 한 줄씩 생깁니다(최대 {MAX_COMBOS}줄).</p>
          {purchaseAttrs.length === 0 && <p className="text-xs text-slate-500">이 카테고리는 구매옵션이 없습니다.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {purchaseAttrs.map((a) => (
              <label key={a.name} className="block">
                <span className={label}>{a.name}{a.required ? " *필수" : ""}{a.basicUnit && a.basicUnit !== "없음" ? ` (단위 ${a.basicUnit})` : ""}</span>
                <input list={`pv-${a.name}`} value={axisText[a.name] ?? ""} onChange={(e) => setAxisText({ ...axisText, [a.name]: e.target.value })} placeholder={a.values.length ? `예: ${a.values.slice(0, 3).join(", ")}` : "예: 블랙, 네이비"} className={input} />
                {a.values.length > 0 && <datalist id={`pv-${a.name}`}>{a.values.map((v) => <option key={v} value={v} />)}</datalist>}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={buildRows} disabled={comboCount > MAX_COMBOS} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50">🧮 옵션 표 만들기</button>
            <span className="text-xs text-slate-500">{axes.length ? `조합 ${comboCount}개${comboCount > MAX_COMBOS ? ` — ${MAX_COMBOS}개를 넘어 만들 수 없습니다` : ""}` : cat.meta.singleAllowed ? "값이 없으면 옵션 없는 상품 1줄" : ""}</span>
          </div>
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 pr-2">옵션명</th><th className="py-1 pr-2">정가</th><th className="py-1 pr-2">판매가</th><th className="py-1 pr-2">재고</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t border-slate-100">
                      <td className="py-1 pr-2"><input value={r.name} onChange={(e) => setRow(r.key, { name: e.target.value })} className={input} /></td>
                      <td className="py-1 pr-2"><input inputMode="numeric" value={r.originalPrice || ""} onChange={(e) => setRow(r.key, { originalPrice: num(e.target.value) })} className={input} /></td>
                      <td className="py-1 pr-2"><input inputMode="numeric" value={r.salePrice || ""} onChange={(e) => setRow(r.key, { salePrice: num(e.target.value) })} className={input} /></td>
                      <td className="py-1 pr-2"><input inputMode="numeric" value={String(r.stock)} onChange={(e) => setRow(r.key, { stock: num(e.target.value) })} className={input} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {cat && (
        <section className="slw-card space-y-3 p-5">
          <h2 className="text-base font-extrabold text-slate-900">3. 검색 속성 · 고시 · 태그</h2>
          <p className="text-sm text-slate-600">검색 속성은 쿠팡 목록에서 고릅니다(*필수만 꼭 넣으면 됩니다). 고시 항목은 「상세페이지 참조」로 채워집니다.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searchAttrs.map((a) => (
              <label key={a.name} className="block">
                <span className={label}>{a.name}{a.required ? " *필수" : ""}</span>
                {a.inputType === "SELECT" && a.values.length ? (
                  <select value={searchVals[a.name] ?? ""} onChange={(e) => setSearchVals({ ...searchVals, [a.name]: e.target.value })} className={input}>
                    <option value="">고르지 않음</option>
                    {a.values.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <input value={searchVals[a.name] ?? ""} onChange={(e) => setSearchVals({ ...searchVals, [a.name]: e.target.value })} placeholder={a.basicUnit && a.basicUnit !== "없음" ? `단위 ${a.basicUnit}` : ""} className={input} />
                )}
              </label>
            ))}
          </div>
          {cat.meta.notices.length > 0 && (
            <label className="block max-w-sm"><span className={label}>상품정보제공고시 상품군</span>
              <select value={notice} onChange={(e) => setNotice(e.target.value)} className={input}>
                {cat.meta.notices.map((n) => <option key={n.category} value={n.category}>{n.category}</option>)}
              </select>
            </label>
          )}
          <label className="block"><span className={label}>검색 태그(쉼표로 나눔, 20개까지)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 노트북가방, 출장백팩" className={input} /></label>
        </section>
      )}

      {cat && (
        <section className="slw-card space-y-3 p-5">
          <h2 className="text-base font-extrabold text-slate-900">4. 보내기 전 검사</h2>
          <p className="text-sm text-slate-600">빠진 값과 쿠팡 규칙 위반을 미리 찾습니다. 쿠팡에는 아직 아무것도 보내지 않습니다.</p>
          <button type="button" disabled={pending} onClick={runCheck} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">{pending ? "검사 중…" : "🔍 검사하기"}</button>
          {check && (
            <div className="space-y-2 text-[13px]">
              <p className="text-slate-600">이미지: 대표 {check.images.main ? "1장" : "없음"} · 추가 {check.images.extras}장 · 상세 {check.images.contents}장 (보낼 때 쿠팡이 받아 갈 짧은 주소로 바뀝니다)</p>
              {check.problems.length === 0 && check.warnings.length === 0 ? (
                <p className="rounded-lg bg-teal-50 px-3 py-2 text-teal-900">✅ 검사 통과 — 보낼 준비가 됐습니다.</p>
              ) : (
                <>
                  {check.problems.length > 0 && <ul className="list-disc space-y-0.5 rounded-lg bg-rose-50 py-2 pl-7 pr-3 text-rose-900">{check.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
                  {check.warnings.length > 0 && <ul className="list-disc space-y-0.5 rounded-lg bg-amber-50 py-2 pl-7 pr-3 text-amber-900">{check.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
