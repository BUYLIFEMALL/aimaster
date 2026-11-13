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
import { DETAIL_IMAGE_NOTICE, sendBlockReason, type SendStatus } from "@/lib/elevenst/register";
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, SendHorizontal, Sparkles } from "lucide-react";

// 등록 화면 — 상세페이지 상품 → 카테고리 → 가격·재고·옵션 → 배송 → 고시 → 「검사하기」 → 「11번가에 보내기」(4단계, 등록 직후 전시중지).
// 배송·안내 문구·브랜드처럼 상품마다 같은 값은 이 브라우저에 기억해 다음 상품에 미리 채운다(서버 저장은 4단계에서 함께 정함).

const LAST_KEY = "elevenst-register:last-form";
const input = "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-[#FA0050] focus:ring-3 focus:ring-rose-500/15 focus:outline-none";
const label = "mb-1.5 block text-xs font-bold text-slate-700";
const box = "space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs";

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
        <span className="shrink-0 text-xs font-bold text-slate-500">{suffix}</span>
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

export function RegisterForm(props: { productId: string; initialName: string; price: number; listPrice: number; detailCategory: string; specs: string; keySaved: boolean; lastJob?: { status: string; productNo: string; createdAt: string } | null }) {
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

  // 이미 등록됐거나 결과를 모르는 상품은 화면을 열 때부터 보내기를 잠근다(서버 sendProductAction도 같은 판정으로 다시 막음)
  const lastBlock = sendBlockReason(props.lastJob?.status as SendStatus | undefined);
  const canSend = Boolean(!lastBlock && check && check.errors.length === 0 && checkedJson === JSON.stringify(draft) && !(sent && sent.ok));
  const runSend = () =>
    start(async () => {
      setConfirmSend(false);
      setSent(await sendProductAction(props.productId, draft));
    });

  const setRow = (i: number, patch: Partial<OptionRow>) => setOptionRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-6">
      {lastBlock && props.lastJob && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-[13px] text-emerald-950 shadow-xs">
          <p className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {props.lastJob.status === "stopped" ? "이미 11번가에 등록됨 · 전시중지 완료" : props.lastJob.status === "registered" ? "이미 11번가에 등록됨(전시중지 실패)" : props.lastJob.status === "sending" ? "11번가로 보내는 중" : "지난 보내기 결과 확인 필요"}
            {props.lastJob.productNo && <> · 상품번호 <b className="font-mono text-emerald-700">#{props.lastJob.productNo}</b></>}
            <span className="font-normal text-emerald-800 text-xs">({new Date(props.lastJob.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })})</span>
          </p>
          <p className="mt-1 text-slate-700">{lastBlock} 안전을 위해 이 화면의 「11번가에 보내기」는 잠겨 있습니다.</p>
          <a href="https://soffice.11st.co.kr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-emerald-800 underline mt-1.5">
            11번가 셀러오피스에서 확인하기 →
          </a>
        </div>
      )}
      {!props.keySaved && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-[13px] text-amber-950 shadow-xs">
          <p className="font-bold flex items-center gap-1.5 text-amber-900">
            <AlertTriangle size={15} className="text-amber-600" />
            11번가 API 키가 등록되지 않았습니다.
          </p>
          <p className="mt-1 text-slate-700">출고지·반품지를 불러오려면 API 키가 필요합니다. 연동 탭에서 키를 먼저 등록해 주세요.</p>
          <Link href="/connect" className="inline-flex items-center gap-1 font-bold text-[#FA0050] hover:underline mt-1.5">
            API키등록·플랫폼연동으로 이동하기 →
          </Link>
        </div>
      )}

      {/* 1. 기본 정보 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">1</span>
            기본 정보
          </h2>
          <span className="text-[11px] font-bold text-slate-400">상품명 / 브랜드 / 원산지</span>
        </div>
        {specs.size > 0 && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-2.5 text-[12px] text-rose-950 flex items-center gap-2">
            <Sparkles size={14} className="text-[#FA0050] shrink-0" />
            <span>상세페이지 상품 정보에서 브랜드·원산지·카테고리·고시 항목을 자동 연동했습니다. 필요 시 수정 가능합니다.</span>
          </div>
        )}
        <div>
          <label htmlFor="f-name" className={label}>
            상품명 <span className="font-normal text-slate-400">({[...name].length}/100자)</span>
          </label>
          <input id="f-name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="f-brand" className={label}>
              브랜드 <span className="font-normal text-slate-400">(미입력 시 「알수없음」 자동 적용)</span>
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

      {/* 2. 11번가 카테고리 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">2</span>
            11번가 카테고리 매핑
          </h2>
          <span className="text-[11px] font-bold text-slate-400">최하위 카테고리 필수</span>
        </div>
        <p className="text-[13px] text-slate-600">상품명으로 후보를 검색하거나 직접 분류를 찾아보세요. 11번가는 최하위 리프 카테고리에만 등록됩니다.</p>
        <CategoryPicker productName={name} detailCategory={props.detailCategory} value={category} onPick={pickCategory} />
      </section>

      {/* 3. 판매가·재고·옵션 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">3</span>
            판매가 · 재고 · 옵션
          </h2>
          <span className="text-[11px] font-bold text-slate-400">10원 단위 절사 준수</span>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <NumberField id="f-price" text="판매가 (10원 단위)" value={price} onChange={setPrice} />
          <NumberField id="f-stock" text="기본 재고수량" value={stock} onChange={setStock} suffix="개" />
          <div>
            <label htmlFor="f-tax" className={label}>
              과세 구분
            </label>
            <select id="f-tax" value={tax} onChange={(e) => setTax(e.target.value as ElevenstDraft["tax"])} className={input}>
              <option value="01">과세 상품 (일반)</option>
              <option value="02">면세 상품</option>
              <option value="03">영세 상품</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={minorOk} onChange={(e) => setMinorOk(e.target.checked)} className="rounded text-[#FA0050] focus:ring-rose-500" />
            <span>미성년자 구매 가능 상품 (체크 해제 시 성인 전용)</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={useDiscount} disabled={!canDiscount} onChange={(e) => setUseDiscount(e.target.checked)} className="rounded text-[#FA0050] focus:ring-rose-500" />
            <span>11번가 자체 즉시할인 적용 {!canDiscount && "(정가가 판매가보다 높을 때만 가능)"}</span>
          </label>
        </div>

        {/* 옵션 관리 */}
        <div className="pt-2">
          <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 cursor-pointer">
            <input type="checkbox" checked={useOption} onChange={(e) => setUseOption(e.target.checked)} className="rounded text-[#FA0050] focus:ring-rose-500" />
            <span>단일/다중 옵션 구성 사용</span>
          </label>
          {useOption && (
            <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="max-w-xs">
                <label className={label}>옵션 그룹명 (예: 색상, 사이즈)</label>
                <input value={optionTitle} onChange={(e) => setOptionTitle(e.target.value)} className={input} />
              </div>
              <div className="space-y-2">
                <p className={label}>옵션 항목 목록</p>
                {optionRows.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="항목명 (예: 블랙)" value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} className={input} />
                    <input placeholder="추가금액" type="number" value={r.addPrice} onChange={(e) => setRow(i, { addPrice: Number(e.target.value) })} className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" />
                    <input placeholder="재고" type="number" value={r.qty} onChange={(e) => setRow(i, { qty: Number(e.target.value) })} className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white" />
                    <button type="button" onClick={() => setOptionRows((rows) => rows.filter((_, j) => j !== i))} className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1">
                      삭제
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setOptionRows((rows) => [...rows, { value: "", addPrice: 0, qty: 99 }])} className="text-xs font-bold text-[#FA0050] hover:underline">
                  + 옵션 항목 추가
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. 배송·반품 설정 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">4</span>
            배송 · 교환 · 반품 설정
          </h2>
          <span className="text-[11px] font-bold text-slate-400">11번가 출고/반품지 연동</span>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <div>
            <label className={label}>배송비 유형</label>
            <select value={delivery.feeType} onChange={(e) => dl({ feeType: e.target.value as FeeType })} className={input}>
              <option value="01">무료 배송</option>
              <option value="02">유료 배송</option>
              <option value="03">조건부 무료</option>
            </select>
          </div>
          {delivery.feeType !== "01" && (
            <NumberField id="f-delivery-fee" text="기본 배송비" value={delivery.fee} onChange={(v) => dl({ fee: v })} />
          )}
          {delivery.feeType === "03" && (
            <NumberField id="f-free-over" text="무료배송 조건금액" value={delivery.freeOver} onChange={(v) => dl({ freeOver: v })} />
          )}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <div>
            <label htmlFor="f-out" className={label}>출고지 주소</label>
            <select id="f-out" value={delivery.outSeq} onChange={(e) => dl({ outSeq: e.target.value })} className={input}>
              {!setup?.ok && <option value="">{setup ? "불러오지 못함" : "불러오는 중…"}</option>}
              {setup?.ok && setup.outbound.map((a) => (
                <option key={a.seq} value={a.seq}>
                  #{a.seq} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-in" className={label}>반품/교환지 주소</label>
            <select id="f-in" value={delivery.inSeq} onChange={(e) => dl({ inSeq: e.target.value })} className={input}>
              {!setup?.ok && <option value="">{setup ? "불러오지 못함" : "불러오는 중…"}</option>}
              {setup?.ok && setup.inbound.map((a) => (
                <option key={a.seq} value={a.seq}>
                  #{a.seq} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-template" className={label}>발송마감 템플릿</label>
            <select id="f-template" value={delivery.sendCloseNo} onChange={(e) => dl({ sendCloseNo: e.target.value })} className={input}>
              {!setup?.ok && <option value="">{setup ? "불러오지 못함" : "불러오는 중…"}</option>}
              {setup?.ok && setup.templates.map((t) => (
                <option key={t.no} value={t.no}>
                  #{t.no} {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
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

      {/* 5. 상품정보제공고시 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">5</span>
            상품정보제공고시
          </h2>
          <span className="text-[11px] font-bold text-slate-400">공정위 필수 규격</span>
        </div>
        <div className="max-w-md">
          <label htmlFor="f-noti" className={label}>
            고시 품목군 선택
          </label>
          <select id="f-noti" value={notiTypeCode} onChange={(e) => applyNoti(e.target.value, leafOf(category?.path ?? props.detailCategory))} className={input}>
            {NOTI_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[12px] text-slate-500">상세페이지 상품 정보(색상·소재·크기 등)를 찾아 자동 반영했습니다. 미확인 항목은 「{NOTI_DEFAULT_VALUE}」로 안전하게 채워집니다.</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {noti?.items.map(([code, itemName]) => (
            <div key={code}>
              <label htmlFor={`noti-${code}`} className="mb-1 block text-[11px] font-bold text-slate-600 truncate">
                {itemName}
              </label>
              <input id={`noti-${code}`} value={values[code] ?? ""} onChange={(e) => setNotiValues((v) => ({ ...v, [code]: e.target.value }))} className={input} />
            </div>
          ))}
        </div>
      </section>

      {/* 6. 검사하기 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">6</span>
            11번가 등록 규격 검사
          </h2>
          <span className="text-[11px] font-bold text-slate-400">XML 데이터 검증</span>
        </div>
        <p className="text-[13px] text-slate-600">입력한 내용으로 11번가 오픈 API 등록 규격 본문을 실제로 빌드해 필수 항목 누락이나 규칙 위반을 사전 검사합니다 (11번가 전송 없음).</p>
        <div className="pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={runCheck}
            className="btn-3d-11st !py-2.5 !px-6"
          >
            {pending ? "11st 규격 검사 중…" : "🧪 11st 규격 검사하기 (보내지 않음)"}
          </button>
        </div>
        {checkError && <p className="text-[13px] font-semibold text-rose-800">❌ {checkError}</p>}
        {check && (
          <div role="status" className="space-y-2.5 text-[13px] pt-1">
            {check.errors.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>검사 통과 — 11번가 등록 규격에 적합합니다 (XML 본문 {check.xmlBytes.toLocaleString()} 바이트 생성 완료).</span>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-rose-900 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5 text-sm">
                  <AlertTriangle size={15} className="text-rose-600" />
                  수정 필요 항목 {check.errors.length}건
                </p>
                <ul className="ml-5 list-disc space-y-0.5 text-xs font-medium">
                  {check.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {check.warnings.length > 0 && (
              <ul className="ml-5 list-disc text-amber-900 text-xs">
                {check.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
            {check.categoryPath && <p className="text-xs text-slate-600 font-medium">선택 카테고리: <b>{check.categoryPath}</b></p>}
            <p className="text-xs text-slate-600">
              상세설명 구성:{" "}
              {check.detailMode === "images"
                ? `상세페이지 고화질 사진 ${check.detailImageCount}장 (저장 구독 회원 혜택)`
                : "핵심 특징·상품 정보·사용법 텍스트 (상세 사진은 저장 구독 회원에게 제공)"}
            </p>
            <details className="pt-1">
              <summary className="cursor-pointer text-[12px] font-bold text-slate-500 hover:text-slate-800">생성된 11번가 XML 본문 미리보기 (개발 확인용)</summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-3.5 text-[11px] font-mono text-slate-100">{check.preview}</pre>
            </details>
          </div>
        )}
      </section>

      {/* 7. 11번가에 보내기 */}
      <section className={box}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">7</span>
            11번가에 보내기 (등록 즉시 전시중지)
          </h2>
          <span className="text-[11px] font-bold text-slate-400">공식 API 직접 전송</span>
        </div>
        <p className="text-[13px] text-slate-600">
          11번가는 임시저장이 지원되지 않아 전송 시 즉시 상품이 생성됩니다. 따라서 안전을 위해 등록 직후 자동으로 <b>전시중지</b> 상태로 보호됩니다. 셀러오피스에서 최종 점검 후 판매를 개시하세요.
        </p>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          대표·추가 이미지는 11번가가 서버로 즉시 복제해 저장합니다. 상세설명의 고화질 사진은 11번가가 우리 서버에서 직접 불러오므로 <b>저장 구독 회원</b>에게만 자동 삽입됩니다.
        </p>

        {lastBlock && !sent && <p className="text-xs font-bold text-slate-500">{lastBlock}</p>}
        {!lastBlock && !canSend && !sent?.ok && (
          <p className="text-xs font-bold text-[#FA0050]">
            * 먼저 상단의 「6. 11st 규격 검사하기」를 통과해야 전송할 수 있습니다.
          </p>
        )}

        <div className="pt-2">
          {!confirmSend ? (
            <button
              type="button"
              disabled={pending || !canSend}
              onClick={() => setConfirmSend(true)}
              className="btn-3d-red !py-3 !px-7 !text-sm flex items-center gap-2"
            >
              <SendHorizontal size={16} />
              <span>11번가에 보내기 (등록 후 바로 전시중지)</span>
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-[13px] text-rose-950">
              <p className="font-extrabold text-sm">정말 전송하시겠습니까? 11번가 셀러오피스에 실제 상품이 등록되고 즉시 전시중지됩니다.</p>
              {check?.detailMode === "images" && <p className="text-xs text-rose-800">📷 {DETAIL_IMAGE_NOTICE}</p>}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={runSend}
                  className="btn-3d-red !py-2 !px-5 !text-xs"
                >
                  {pending ? "11번가 전송 중…" : "네, 전송합니다"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmSend(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {sent && (
          <div role="status" className={`rounded-xl border p-4 text-[13px] ${sent.ok ? (sent.status === "stopped" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900") : sent.status === "unknown" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              {sent.ok ? (sent.status === "stopped" ? "✅ 11번가 등록 완료 · 전시중지 성공" : "⚠ 11번가 등록 완료 (전시중지 실패 - 셀러오피스 확인 필요)") : sent.status === "unknown" ? "⚠ 확인 필요" : "❌ 전송 실패"}
            </p>
            <p className="mt-1 text-slate-700">{sent.message}</p>
            {sent.ok && <p className="mt-1 font-mono text-xs font-bold text-slate-900">11번가 상품번호: #{sent.productNo}</p>}
            {(sent.ok || sent.status === "unknown") && (
              <a href="https://soffice.11st.co.kr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#FA0050] underline mt-2 text-xs">
                11번가 셀러오피스에서 확인하기 →
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
