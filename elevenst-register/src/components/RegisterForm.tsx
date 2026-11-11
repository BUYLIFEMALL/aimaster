"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CategoryPicker, type PickedCategory } from "@/components/CategoryPicker";
import { checkDraftAction, loadSellerSetupAction, type CheckResult, type SellerSetup } from "@/lib/actions/register";
import { sendProductAction, type SendResult } from "@/lib/actions/send";
import type { ElevenstDraft, FeeType, KcChoice, OptionRow } from "@/lib/elevenst/product";
import { DEFAULT_AS, DEFAULT_RETURN, SEND_KIND } from "@/lib/elevenst/draftDefaults";
import { NOTI_DEFAULT_VALUE, NOTI_TYPES, notiType } from "@/lib/elevenst/notification";
import { guessNotiType, parseSpecs, prefillBasics, prefillNoti } from "@/lib/elevenst/prefill";

// 등록 화면 — 상세페이지 상품 → 카테고리 → 가격·재고·옵션 → 배송 → 고시 → 「검사하기」 → 「11번가에 보내기」(4단계, 등록 직후 전시중지).
// 배송·안내 문구·브랜드처럼 상품마다 같은 값은 이 브라우저에 기억해 다음 상품에 미리 채운다(서버 저장은 4단계에서 함께 정함).

const LAST_KEY = "elevenst-register:last-form";
const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
const label = "mb-1 block text-xs font-bold text-slate-700";
const box = "space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs";

interface Remembered {
  brand: string;
  originText: string;
  kc: KcChoice;
  tax: ElevenstDraft["tax"];
  delivery: ElevenstDraft["delivery"];
  asDetail: string;
  returnDetail: string;
  notiType: string;
}

const DEFAULT_DELIVERY: ElevenstDraft["delivery"] = { feeType: "01", fee: 3000, freeOver: 30000, jeju: 3000, island: 5000, returnFee: 3000, exchangeFee: 6000, outSeq: "", inSeq: "", sendCloseNo: "", bundle: true };

function num(v: string): number {
  const n = Number(v.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function NumberField({ id, text, value, onChange, suffix = "원" }: { id: string; text: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="flex items-center gap-1.5">
        <input id={id} inputMode="numeric" value={String(value)} onChange={(e) => onChange(num(e.target.value))} className={input} />
        <span className="shrink-0 text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

const tens = (n: number) => Math.round(n / 10) * 10;
const leafOf = (path: string) => path.split(/\s*[›>]\s*/).pop() ?? "";

/** 고시 유형 하나를 상세페이지 정보(specs)로 채운 값 */
function notiFill(code: string, specs: Map<string, string>, leaf: string): Record<string, string> {
  const t = notiType(code);
  return t ? prefillNoti(t, specs, leaf).values : {};
}

export function RegisterForm(props: { productId: string; initialName: string; price: number; listPrice: number; detailCategory: string; specs: string; keySaved: boolean }) {
  // 상세페이지 자동화 정보로 미리 채움(브랜드·원산지·고시) — 회원이 고칠 수 있음
  const specs = useMemo(() => parseSpecs(props.specs), [props.specs]);
  const basics = useMemo(() => prefillBasics(specs), [specs]);
  const initialNoti = guessNotiType(props.detailCategory);
  const [name, setName] = useState(props.initialName);
  const [brand, setBrand] = useState(basics.brand);
  const [category, setCategory] = useState<PickedCategory | null>(null);
  const [price, setPrice] = useState(tens(props.price));
  const listPrice = tens(props.listPrice);
  const [useDiscount, setUseDiscount] = useState(false); // 기본 끔(주인님 결정 2026-11-11)
  const [stock, setStock] = useState(99);
  const [tax, setTax] = useState<ElevenstDraft["tax"]>("01");
  const [minorOk, setMinorOk] = useState(true);
  const [originText, setOriginText] = useState(basics.origin || "상세설명 참조");
  const [kc, setKc] = useState<KcChoice>("none");
  const [useOption, setUseOption] = useState(false);
  const [optionTitle, setOptionTitle] = useState("색상");
  const [optionRows, setOptionRows] = useState<OptionRow[]>([{ value: "", addPrice: 0, qty: 99 }]);
  const [delivery, setDelivery] = useState(DEFAULT_DELIVERY);
  const [asDetail, setAsDetail] = useState(DEFAULT_AS);
  const [returnDetail, setReturnDetail] = useState(DEFAULT_RETURN);
  const [notiTypeCode, setNotiTypeCode] = useState(initialNoti);
  const [notiValues, setNotiValues] = useState<Record<string, string>>(() => notiFill(initialNoti, specs, leafOf(props.detailCategory)));
  const [setup, setSetup] = useState<SellerSetup | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState("");
  const [checkedJson, setCheckedJson] = useState(""); // 검사한 순간의 입력값 — 바뀌면 다시 검사해야 보낼 수 있다
  const [confirmSend, setConfirmSend] = useState(false);
  const [sent, setSent] = useState<SendResult | null>(null);
  const [pending, start] = useTransition();
  const dl = (patch: Partial<ElevenstDraft["delivery"]>) => setDelivery((d) => ({ ...d, ...patch }));

  // 지난번 값 불러오기(이 브라우저에만)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_KEY);
      if (!saved) return;
      const r = JSON.parse(saved) as Partial<Remembered>;
      // 상세페이지에서 찾은 값이 있으면 그것을 쓰고, 없을 때만 지난번 값
      if (r.brand && !basics.brand) setBrand(r.brand);
      if (r.originText && !basics.origin) setOriginText(r.originText);
      if (r.kc) setKc(r.kc);
      if (r.tax) setTax(r.tax);
      if (r.delivery) setDelivery({ ...DEFAULT_DELIVERY, ...r.delivery });
      if (r.asDetail) setAsDetail(r.asDetail);
      if (r.returnDetail) setReturnDetail(r.returnDetail);
      if (r.notiType && notiType(r.notiType) && !props.detailCategory.trim()) {
        setNotiTypeCode(r.notiType);
        setNotiValues(notiFill(r.notiType, specs, ""));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 고시 유형을 바꾸면 상세페이지 정보로 다시 채운다 */
  const applyNoti = (code: string, leaf: string) => {
    setNotiTypeCode(code);
    setNotiValues(notiFill(code, specs, leaf));
  };
  /** 카테고리를 고르면 고시 유형도 그 카테고리에 맞춘다 */
  const pickCategory = (c: PickedCategory | null) => {
    setCategory(c);
    if (c) applyNoti(guessNotiType(c.path, props.detailCategory), leafOf(c.path));
  };
  const canDiscount = listPrice > price && price > 0;
  const discountOn = useDiscount && canDiscount;

  // 출고지·반품지·발송마감 템플릿(읽기만). 기억한 값이 목록에 없으면 첫 번째로
  useEffect(() => {
    if (!props.keySaved) return;
    loadSellerSetupAction()
      .then((s) => {
        setSetup(s);
        if (!s.ok) return;
        setDelivery((d) => ({
          ...d,
          outSeq: s.outbound.some((a) => a.seq === d.outSeq) ? d.outSeq : (s.outbound[0]?.seq ?? ""),
          inSeq: s.inbound.some((a) => a.seq === d.inSeq) ? d.inSeq : (s.inbound[0]?.seq ?? ""),
          sendCloseNo: s.templates.some((t) => t.no === d.sendCloseNo) ? d.sendCloseNo : (s.templates[0]?.no ?? ""),
        }));
      })
      .catch(() => setSetup({ ok: false, error: "11번가 주소를 읽지 못했습니다." }));
  }, [props.keySaved]);

  const noti = notiType(notiTypeCode);
  const values = useMemo(() => {
    const v: Record<string, string> = {};
    for (const [code] of noti?.items ?? []) v[code] = notiValues[code] ?? NOTI_DEFAULT_VALUE;
    return v;
  }, [noti, notiValues]);

  const draft: ElevenstDraft = {
    name,
    brand,
    categoryNo: category?.no ?? "",
    price: discountOn ? listPrice : price,
    discount: discountOn ? listPrice - price : 0,
    stock,
    tax,
    minorOk,
    originText,
    kc,
    option: useOption ? { title: optionTitle, rows: optionRows } : null,
    delivery,
    asDetail,
    returnDetail,
    noti: { type: notiTypeCode, values },
  };

  const runCheck = () =>
    start(async () => {
      setCheckError("");
      setCheck(null);
      try {
        const remembered: Remembered = { brand, originText, kc, tax, delivery, asDetail, returnDetail, notiType: notiTypeCode };
        localStorage.setItem(LAST_KEY, JSON.stringify(remembered));
      } catch {}
      const r = await checkDraftAction(props.productId, draft);
      if (!r.ok) return setCheckError(r.error);
      setCheck(r.result);
      setCheckedJson(JSON.stringify(draft));
    });

  const canSend = Boolean(check && check.errors.length === 0 && checkedJson === JSON.stringify(draft) && !(sent && sent.ok));
  const runSend = () =>
    start(async () => {
      setConfirmSend(false);
      setSent(await sendProductAction(props.productId, draft));
    });

  const setRow = (i: number, patch: Partial<OptionRow>) => setOptionRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      {!props.keySaved && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          11번가 API 키가 없어 출고지·반품지를 불러올 수 없습니다.{" "}
          <Link href="/connect" className="font-bold underline">
            API키등록·플랫폼연동에서 저장하기 →
          </Link>
        </p>
      )}

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">1. 기본 정보</h2>
        {specs.size > 0 && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-[12px] text-indigo-900">📄 상세페이지 상품 정보에서 브랜드·원산지·카테고리·고시 항목을 미리 채웠습니다. 다르면 고쳐 주세요.</p>}
        <div>
          <label htmlFor="f-name" className={label}>
            상품명 <span className="font-normal text-slate-500">({[...name].length}/100자)</span>
          </label>
          <input id="f-name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="f-brand" className={label}>
              브랜드 <span className="font-normal text-slate-500">(없으면 비워 두면 「알수없음」)</span>
            </label>
            <input id="f-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="f-origin" className={label}>
              원산지
            </label>
            <input id="f-origin" value={originText} onChange={(e) => setOriginText(e.target.value)} className={input} />
          </div>
        </div>
      </section>

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">2. 11번가 카테고리</h2>
        <p className="text-[13px] text-slate-600">상품명으로 후보를 찾거나 직접 찾아봅니다. 11번가는 맨 아래 카테고리에만 등록됩니다.</p>
        <CategoryPicker productName={name} detailCategory={props.detailCategory} value={category} onPick={pickCategory} />
      </section>

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">3. 가격·재고·옵션</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <NumberField id="f-price" text="판매가 (10원 단위)" value={price} onChange={setPrice} />
            {canDiscount && (
              <label className="mt-1.5 flex items-start gap-1.5 text-[12px] text-slate-700">
                <input type="checkbox" checked={useDiscount} onChange={(e) => setUseDiscount(e.target.checked)} className="mt-0.5" />
                <span>
                  상세페이지 정가 {listPrice.toLocaleString()}원에서 {(listPrice - price).toLocaleString()}원 즉시할인으로 보여 주기
                </span>
              </label>
            )}
          </div>
          {!useOption && <NumberField id="f-stock" text="재고" value={stock} onChange={setStock} suffix="개" />}
          <div>
            <label htmlFor="f-tax" className={label}>
              과세
            </label>
            <select id="f-tax" value={tax} onChange={(e) => setTax(e.target.value as ElevenstDraft["tax"])} className={input}>
              <option value="01">과세상품</option>
              <option value="02">면세상품</option>
              <option value="03">영세상품</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
          <input type="checkbox" checked={useOption} onChange={(e) => setUseOption(e.target.checked)} /> 옵션 쓰기(한 가지 기준, 예: 색상)
        </label>
        {useOption && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <div className="max-w-xs">
              <label htmlFor="f-opt-title" className={label}>
                옵션명
              </label>
              <input id="f-opt-title" value={optionTitle} onChange={(e) => setOptionTitle(e.target.value)} className={input} />
            </div>
            {optionRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_6rem_auto] items-end gap-2">
                <input aria-label={`옵션값 ${i + 1}`} placeholder="옵션값(예: 블랙)" value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} className={input} />
                <input aria-label={`추가금액 ${i + 1}`} inputMode="numeric" value={String(r.addPrice)} onChange={(e) => setRow(i, { addPrice: num(e.target.value) })} className={input} />
                <input aria-label={`옵션 재고 ${i + 1}`} inputMode="numeric" value={String(r.qty)} onChange={(e) => setRow(i, { qty: num(e.target.value) })} className={input} />
                <button type="button" onClick={() => setOptionRows((rows) => (rows.length > 1 ? rows.filter((_, j) => j !== i) : rows))} className="px-2 py-2 text-xs font-bold text-slate-500">
                  삭제
                </button>
              </div>
            ))}
            <p className="text-[11px] text-slate-500">칸 순서: 옵션값 · 추가금액(원) · 재고. 추가금액 0원인 옵션이 하나 이상 있어야 합니다.</p>
            <button type="button" onClick={() => setOptionRows((rows) => [...rows, { value: "", addPrice: 0, qty: 99 }])} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700">
              ➕ 옵션 줄 추가
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="f-kc" className={label}>
              KC 인증
            </label>
            <select id="f-kc" value={kc} onChange={(e) => setKc(e.target.value as KcChoice)} className={input}>
              <option value="none">KC 인증 대상 아님</option>
              <option value="exempt-buy">KC 면제 — 구매대행</option>
              <option value="exempt-parallel">KC 면제 — 병행수입</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">인증번호가 필요한 상품(전기·어린이 제품 등)은 아직 지원하지 않습니다.</p>
          </div>
          <label className="flex items-center gap-2 self-center text-[13px] font-bold text-slate-700">
            <input type="checkbox" checked={!minorOk} onChange={(e) => setMinorOk(!e.target.checked)} /> 미성년자 구매 불가(19세 상품)
          </label>
        </div>
      </section>

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">4. 배송</h2>
        {setup && !setup.ok && <p className="text-[13px] font-semibold text-rose-800">❌ {setup.error}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="f-out" className={label}>
              출고지
            </label>
            <select id="f-out" value={delivery.outSeq} onChange={(e) => dl({ outSeq: e.target.value })} className={input}>
              {!setup?.ok && <option value="">{setup ? "불러오지 못함" : "불러오는 중…"}</option>}
              {setup?.ok && setup.outbound.map((a) => <option key={a.seq} value={a.seq}>#{a.seq} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-in" className={label}>
              반품/교환지
            </label>
            <select id="f-in" value={delivery.inSeq} onChange={(e) => dl({ inSeq: e.target.value })} className={input}>
              {!setup?.ok && <option value="">{setup ? "불러오지 못함" : "불러오는 중…"}</option>}
              {setup?.ok && setup.inbound.map((a) => <option key={a.seq} value={a.seq}>#{a.seq} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-close" className={label}>
              발송마감 템플릿
            </label>
            <select id="f-close" value={delivery.sendCloseNo} onChange={(e) => dl({ sendCloseNo: e.target.value })} className={input}>
              <option value="">사용 안 함</option>
              {setup?.ok && setup.templates.map((t) => <option key={t.no} value={t.no}>{SEND_KIND[t.kind] ?? "발송"} · {t.name}</option>)}
            </select>
            {setup?.ok && setup.templateError && <p className="mt-1 text-[11px] text-amber-800">{setup.templateError}</p>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="f-fee-type" className={label}>
              배송비
            </label>
            <select id="f-fee-type" value={delivery.feeType} onChange={(e) => dl({ feeType: e.target.value as FeeType })} className={input}>
              <option value="01">무료배송</option>
              <option value="02">고정 배송비</option>
              <option value="03">조건부 무료</option>
            </select>
          </div>
          {delivery.feeType !== "01" && <NumberField id="f-fee" text="배송비" value={delivery.fee} onChange={(n) => dl({ fee: n })} />}
          {delivery.feeType === "03" && <NumberField id="f-free-over" text="이 금액 이상 무료" value={delivery.freeOver} onChange={(n) => dl({ freeOver: n })} />}
        </div>
        <details className="text-[13px]">
          <summary className="cursor-pointer font-bold text-slate-700">추가 배송비·반품/교환 배송비 (기본값 그대로 써도 됩니다)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <NumberField id="f-jeju" text="제주 추가" value={delivery.jeju} onChange={(n) => dl({ jeju: n })} />
            <NumberField id="f-island" text="도서산간 추가" value={delivery.island} onChange={(n) => dl({ island: n })} />
            <NumberField id="f-return" text="반품(편도)" value={delivery.returnFee} onChange={(n) => dl({ returnFee: n })} />
            <NumberField id="f-exchange" text="교환(왕복)" value={delivery.exchangeFee} onChange={(n) => dl({ exchangeFee: n })} />
          </div>
          <label className="mt-3 flex items-center gap-2 font-bold text-slate-700">
            <input type="checkbox" checked={delivery.bundle} onChange={(e) => dl({ bundle: e.target.checked })} /> 묶음배송 가능
          </label>
        </details>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="f-as" className={label}>
              A/S 안내
            </label>
            <textarea id="f-as" rows={2} value={asDetail} onChange={(e) => setAsDetail(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="f-return-text" className={label}>
              반품/교환 안내
            </label>
            <textarea id="f-return-text" rows={2} value={returnDetail} onChange={(e) => setReturnDetail(e.target.value)} className={input} />
          </div>
        </div>
      </section>

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">5. 상품정보제공고시</h2>
        <div className="max-w-md">
          <label htmlFor="f-noti" className={label}>
            고시 유형
          </label>
          <select id="f-noti" value={notiTypeCode} onChange={(e) => applyNoti(e.target.value, leafOf(category?.path ?? props.detailCategory))} className={input}>
            {NOTI_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[12px] text-slate-500">상세페이지 상품 정보(색상·소재·크기 등)를 찾아 미리 넣고, 못 찾은 항목은 「{NOTI_DEFAULT_VALUE}」로 둡니다. 아는 내용은 바꿔 적어 주세요(항목당 50자까지).</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {noti?.items.map(([code, itemName]) => (
            <div key={code}>
              <label htmlFor={`noti-${code}`} className="mb-0.5 block text-[11px] font-bold text-slate-600">
                {itemName}
              </label>
              <input id={`noti-${code}`} value={values[code] ?? ""} onChange={(e) => setNotiValues((v) => ({ ...v, [code]: e.target.value }))} className={input} />
            </div>
          ))}
        </div>
      </section>

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">6. 검사하기</h2>
        <p className="text-[13px] text-slate-600">입력한 내용으로 11번가 등록 본문을 실제로 만들어 빠진 칸·규칙 위반을 찾습니다. 11번가에는 보내지 않습니다.</p>
        <button type="button" disabled={pending} onClick={runCheck} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm disabled:opacity-50">
          {pending ? "검사 중…" : "🧪 검사하기(보내지 않음)"}
        </button>
        {checkError && <p className="text-[13px] font-semibold text-rose-800">❌ {checkError}</p>}
        {check && (
          <div role="status" className="space-y-2 text-[13px]">
            {check.errors.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-900">✅ 검사 통과 — 11번가 등록 본문을 만들 수 있습니다(본문 {check.xmlBytes.toLocaleString()}바이트).</p>
            ) : (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900">
                <p className="font-bold">고칠 것 {check.errors.length}가지</p>
                <ul className="ml-4 list-disc">
                  {check.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {check.warnings.length > 0 && (
              <ul className="ml-4 list-disc text-amber-900">
                {check.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
            {check.categoryPath && <p className="text-slate-600">카테고리: {check.categoryPath}</p>}
            <details>
              <summary className="cursor-pointer text-[12px] font-bold text-slate-600">만들어진 본문 앞부분 보기(개발 확인용)</summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-900 p-3 text-[11px] text-slate-100">{check.preview}</pre>
            </details>
          </div>
        )}
      </section>

      <section className={box}>
        <h2 className="text-base font-extrabold text-slate-900">7. 11번가에 보내기</h2>
        <p className="text-[13px] text-slate-600">
          11번가는 임시저장이 없어 보내면 바로 상품이 생깁니다. 그래서 보낸 직후 자동으로 <b>전시중지</b>해 손님에게는 보이지 않게 둡니다. 셀러오피스에서 확인한 뒤 판매를 시작해 주세요.
        </p>
        <p className="text-[12px] text-slate-500">대표·추가 이미지는 11번가가 받아 가 저장합니다. 상세설명은 상세페이지의 핵심 특징·상품 정보·사용법을 글로 넣습니다(섹션 이미지는 셀러오피스에서 올릴 수 있습니다).</p>
        {!canSend && !sent?.ok && <p className="text-[12px] font-semibold text-slate-500">먼저 「검사하기」를 통과해야 보낼 수 있습니다. 검사 뒤 값을 바꿨으면 다시 검사해 주세요.</p>}
        {!confirmSend ? (
          <button type="button" disabled={pending || !canSend} onClick={() => setConfirmSend(true)} className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm disabled:opacity-40">
            🟠 11번가에 보내기(등록 후 바로 전시중지)
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-3 text-[13px] text-orange-950">
            <p className="font-bold">정말 보낼까요? 11번가에 실제 상품이 하나 만들어지고, 바로 전시중지됩니다.</p>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={runSend} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50">
                {pending ? "보내는 중…" : "네, 보냅니다"}
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirmSend(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                취소
              </button>
            </div>
          </div>
        )}
        {sent && (
          <div role="status" className={`rounded-lg border px-3 py-2 text-[13px] ${sent.ok ? (sent.status === "stopped" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900") : sent.status === "unknown" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            <p className="font-bold">{sent.ok ? (sent.status === "stopped" ? "✅ 등록됨·전시중지" : "⚠ 등록됨(전시중지 실패)") : sent.status === "unknown" ? "⚠ 확인 필요" : "❌ 보내지 못했습니다"}</p>
            <p>{sent.message}</p>
            {sent.ok && <p>11번가 상품번호: <b>{sent.productNo}</b></p>}
            {(sent.ok || sent.status === "unknown") && (
              <a href="https://soffice.11st.co.kr" target="_blank" rel="noreferrer" className="font-bold underline">
                11번가 셀러오피스 열기 →
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
