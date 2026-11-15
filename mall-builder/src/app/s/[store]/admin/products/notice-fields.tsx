"use client";

// M2-4 상품정보제공고시·KC 인증 입력 — 품목군을 고르면 자주 쓰는 항목이 채워지고, 칸을 더하거나 고칠 수 있다.
// 값은 숨은 칸 info_notice_json·kc_certs_json으로 넘기고 서버(lib/productNotice)가 다시 검사한다.
import { useState } from "react";
import { KC_KINDS, KC_MAX, KC_NONE, NOTICE_MAX_ITEMS, NOTICE_TYPES, templateItems, type KcCert, type NoticeItem, type ProductNotice } from "@/lib/productNotice";

export default function NoticeFields({ initial, initialKc, error }: { initial: ProductNotice | null; initialKc: KcCert[]; error?: string }) {
  const [type, setType] = useState(initial?.type ?? "");
  const [items, setItems] = useState<NoticeItem[]>(initial?.items ?? []);
  const none0 = initialKc.length === 1 && initialKc[0].kind === KC_NONE;
  const [kcNone, setKcNone] = useState(none0);
  const [kc, setKc] = useState<KcCert[]>(none0 ? [] : initialKc);

  const pickType = (t: string) => {
    setType(t);
    // 이미 쓴 값은 이름이 같은 칸으로 옮기고, 새 품목군의 칸을 채운다
    const old = new Map(items.map((i) => [i.label, i.value]));
    setItems(t ? templateItems(t).map((i) => ({ ...i, value: old.get(i.label) ?? "" })) : []);
  };
  const setItem = (n: number, patch: Partial<NoticeItem>) => setItems(items.map((it, i) => (i === n ? { ...it, ...patch } : it)));
  const fillAll = () => setItems(items.map((i) => (i.value ? i : { ...i, value: "상세페이지 참조" })));

  const noticeJson = type ? JSON.stringify({ type, items }) : "";
  const kcJson = kcNone ? JSON.stringify([{ kind: KC_NONE, no: "" }]) : JSON.stringify(kc.filter((c) => c.kind || c.no));

  return (
    <fieldset className="space-y-3 rounded-lg border p-4" data-notice-fields>
      <legend className="px-1 text-sm font-semibold">상품정보제공고시·KC 인증</legend>
      <input type="hidden" name="info_notice_json" value={noticeJson} />
      <input type="hidden" name="kc_certs_json" value={kcJson} />

      <label className="block text-sm">
        <span>품목군</span>
        <select value={type} onChange={(e) => pickType(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 sm:w-64" data-notice-type>
          <option value="">고르지 않음(고시 없음)</option>
          {NOTICE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <p className="text-xs text-gray-500">
        전자상거래법에 따라 판매 상품의 정보를 알려야 합니다. 품목군을 고르면 자주 쓰는 항목이 채워집니다 — 정확한 항목은 공정위 「상품정보제공 고시」를 확인해 칸을 더하거나 고쳐 주세요.
      </p>

      {type && (
        <div className="space-y-2" data-notice-items>
          {items.map((it, n) => (
            <div key={n} className="grid gap-2 sm:grid-cols-[16rem_1fr_auto]">
              <input value={it.label} onChange={(e) => setItem(n, { label: e.target.value })} maxLength={60} aria-label="항목 이름" className="rounded border bg-gray-50 px-2 py-1.5 text-sm" />
              <input value={it.value} onChange={(e) => setItem(n, { value: e.target.value })} maxLength={500} aria-label={`${it.label} 내용`} placeholder="내용" className="rounded border px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => setItems(items.filter((_, i) => i !== n))} className="rounded px-2 text-sm text-gray-500 hover:bg-gray-100" aria-label="항목 지우기">✕</button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 text-sm">
            {items.length < NOTICE_MAX_ITEMS && (
              <button type="button" onClick={() => setItems([...items, { label: "", value: "" }])} className="rounded border px-3 py-1">+ 항목 더하기</button>
            )}
            <button type="button" onClick={fillAll} className="rounded border px-3 py-1">빈 칸을 「상세페이지 참조」로</button>
          </div>
        </div>
      )}

      <div className="border-t pt-3">
        <p className="text-sm">KC 인증</p>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={kcNone} onChange={(e) => setKcNone(e.target.checked)} /> {KC_NONE}(인증 대상이 아닌 상품)
        </label>
        {!kcNone && (
          <div className="mt-2 space-y-2" data-kc-rows>
            {kc.map((c, n) => (
              <div key={n} className="grid gap-2 sm:grid-cols-[16rem_1fr_auto]">
                <select value={c.kind} onChange={(e) => setKc(kc.map((x, i) => (i === n ? { ...x, kind: e.target.value } : x)))} aria-label="인증 구분" className="rounded border px-2 py-1.5 text-sm">
                  <option value="">인증 구분</option>
                  {KC_KINDS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <input value={c.no} onChange={(e) => setKc(kc.map((x, i) => (i === n ? { ...x, no: e.target.value } : x)))} maxLength={40} placeholder="인증번호(예: XU100123-12345)" aria-label="인증번호" className="rounded border px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => setKc(kc.filter((_, i) => i !== n))} className="rounded px-2 text-sm text-gray-500 hover:bg-gray-100" aria-label="인증 지우기">✕</button>
              </div>
            ))}
            {kc.length < KC_MAX && (
              <button type="button" onClick={() => setKc([...kc, { kind: "", no: "" }])} className="rounded border px-3 py-1 text-sm">+ KC 인증 더하기</button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600" data-notice-error>{error}</p>}
    </fieldset>
  );
}
