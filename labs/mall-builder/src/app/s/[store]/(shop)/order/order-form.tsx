"use client";

import { useActionState, useState } from "react";
import type { CustomerAddress } from "@/lib/store";
import { placeOrderAction, type PlaceOrderState } from "./actions";

type Totals = { subtotal: number; shipping: number; total: number };
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const REGION_NOTE = { mainland: "", jeju: "제주 추가 배송비 포함", island: "도서산간 추가 배송비 포함" } as const;

export default function OrderForm({
  slug,
  addresses,
  regionOf,
  totalsByRegion,
  defaultDepositor,
  bankText,
}: {
  slug: string;
  addresses: CustomerAddress[];
  regionOf: Record<string, "mainland" | "jeju" | "island">;
  totalsByRegion: Record<"mainland" | "jeju" | "island", Totals>;
  defaultDepositor: string;
  bankText: string;
}) {
  const [addressId, setAddressId] = useState(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? "");
  const initial: PlaceOrderState = { error: null, depositor: defaultDepositor, memo: "" };
  const [state, formAction, pending] = useActionState(placeOrderAction.bind(null, slug), initial);
  const region = regionOf[addressId] ?? "mainland";
  const t = totalsByRegion[region];

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <section>
        <h2 className="mb-2 font-semibold">배송지</h2>
        <div className="space-y-2">
          {addresses.map((a) => (
            <label key={a.id} className="flex items-start gap-2 rounded border p-3 text-sm" data-address-option>
              <input type="radio" name="address_id" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
              <span>
                <b>{a.label}</b>
                {a.is_default && <span className="ml-1 rounded bg-gray-900 px-1.5 text-xs text-white">기본</span>}
                <br />
                {a.receiver} · {a.phone}
                <br />({a.zip}) {a.addr1} {a.addr2}
              </span>
            </label>
          ))}
        </div>
        <a href={`/s/${slug}/my`} className="mt-2 inline-block text-sm underline">배송지 추가·수정(마이페이지)</a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">입금자명</span>
          <input name="depositor" defaultValue={state.depositor} required maxLength={20} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">배송 메모 (선택)</span>
          <input name="memo" defaultValue={state.memo} maxLength={200} placeholder="예: 문 앞에 놓아 주세요" className="mt-1 w-full rounded border px-3 py-2" />
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
        <button disabled={pending || !addressId} className="min-h-12 w-full rounded bg-gray-900 text-white disabled:opacity-50">
          {pending ? "주문하는 중…" : `${won(t.total)} 주문하기`}
        </button>
        <p className="text-xs text-gray-500">주문하면 재고가 확보되고 장바구니가 비워집니다. 입금이 확인되면 배송을 준비합니다.</p>
      </section>
    </form>
  );
}
