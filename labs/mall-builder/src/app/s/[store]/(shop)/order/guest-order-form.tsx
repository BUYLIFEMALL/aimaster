"use client";

import { useActionState, useState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { regionOfZip, type Region } from "@/lib/shipping";
import AddressFields from "../my/address-fields";
import { placeGuestOrderAction, type GuestOrderState } from "./guest-actions";

type Totals = { subtotal: number; shipping: number; total: number };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const REGION_NOTE: Record<Region, string> = { mainland: "", jeju: "제주 추가 배송비 포함", island: "도서산간 추가 배송비 포함" };
const input = "mt-1 w-full rounded border px-3 py-2";

// 비회원 주문서(D15) — 주문하는 분·받는 분·주소를 직접 넣는다. 무통장 입금만. 배송비 지역은 우편번호로 바로 다시 계산
export default function GuestOrderForm({ slug, totalsByRegion, bankText, loginHref }: { slug: string; totalsByRegion: Record<Region, Totals>; bankText: string; loginHref: string }) {
  const [state, formAction, pending] = useActionState(placeGuestOrderAction.bind(null, slug), { error: null, values: {} } as GuestOrderState);
  const v = state.values;
  const [zip, setZip] = useState(v.zip ?? "");
  const region = /^\d{5}$/.test(zip) ? regionOfZip(zip) : "mainland";
  const t = totalsByRegion[region];
  const [same, setSame] = useState(true);
  const [name, setName] = useState(v.guest_name ?? "");
  const [phone, setPhone] = useState(v.guest_phone ?? "");

  return (
    <form onSubmit={noResetSubmit(formAction)} className="mt-6 space-y-6" data-guest-order-form>
      <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
        비회원으로 주문합니다. 주문 조회는 <b>주문번호와 휴대폰 번호</b>로 합니다. 회원이시면 <a href={loginHref} className="underline">로그인</a>하면 등급가·카드 결제를 쓸 수 있습니다.
      </p>
      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">주문하는 분</h2>
        <label className="block">
          <span className="text-sm">이름</span>
          <input name="guest_name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} className={input} />
        </label>
        <label className="block">
          <span className="text-sm">휴대폰 (주문 조회에 씁니다)</span>
          <input name="guest_phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" maxLength={13} placeholder="010-1234-5678" className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm">이메일 (선택 — 주문·발송 안내 메일)</span>
          <input name="guest_email" type="email" defaultValue={v.guest_email ?? ""} maxLength={100} className={input} />
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">받는 분</h2>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} /> 주문하는 분과 같음
        </label>
        <label className="block">
          <span className="text-sm">받는 분 이름</span>
          {same ? <input name="receiver" value={name} readOnly className={`${input} bg-gray-50`} /> : <input name="receiver" defaultValue={v.receiver ?? ""} required maxLength={30} className={input} />}
        </label>
        <label className="block">
          <span className="text-sm">받는 분 휴대폰</span>
          {same ? <input name="phone" value={phone} readOnly className={`${input} bg-gray-50`} /> : <input name="phone" defaultValue={v.phone ?? ""} required maxLength={13} className={input} />}
        </label>
        <AddressFields zip={v.zip ?? ""} addr1={v.addr1 ?? ""} onZip={setZip} />
        <label className="block">
          <span className="text-xs text-gray-500">상세 주소</span>
          <input name="addr2" defaultValue={v.addr2 ?? ""} maxLength={120} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">입금자명 (비우면 주문하는 분 이름)</span>
          <input name="depositor" defaultValue={v.depositor ?? ""} maxLength={20} className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">배송 메모 (선택)</span>
          <input name="memo" defaultValue={v.memo ?? ""} maxLength={200} placeholder="예: 문 앞에 놓아 주세요" className={input} />
        </label>
      </section>

      <section className="rounded border bg-gray-50 p-4 text-sm">
        <p className="font-medium">결제 방법: 무통장 입금</p>
        <p className="mt-1 text-gray-600">{bankText}</p>
      </section>

      <section className="ml-auto max-w-sm space-y-2 text-sm" data-order-totals>
        <p className="flex justify-between"><span>상품 금액</span><span>{won(t.subtotal)}</span></p>
        <p className="flex justify-between"><span>배송비{REGION_NOTE[region] && ` (${REGION_NOTE[region]})`}</span><span>{won(t.shipping)}</span></p>
        <p className="flex justify-between border-t pt-2 text-lg font-bold"><span>결제 금액</span><span>{won(t.total)}</span></p>
        <input type="hidden" name="expected_total" value={t.total} />
        {state.error && <p className="text-red-600" data-order-error>{state.error}</p>}
        <button disabled={pending} className="min-h-12 w-full rounded bg-gray-900 text-white disabled:opacity-50">{pending ? "주문하는 중…" : `${won(t.total)} 비회원 주문하기`}</button>
        <p className="text-xs text-gray-500">주문하면 재고가 확보되고 장바구니가 비워집니다. 입금이 확인되면 배송을 준비합니다.</p>
      </section>
    </form>
  );
}
