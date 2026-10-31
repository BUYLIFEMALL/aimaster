"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recheckJobsAction } from "@/lib/actions/alerts";
import { rejectReasonText } from "@/lib/coupang/status";

export type RejectedJob = { id: string; product_id: string | null; product_name: string; seller_product_id: number | null; message: string | null };

/** 플랜 B3 반려 상품 알림 — 목록은 등록 기록만 읽고(쿠팡 호출 없음), 다시 확인은 버튼을 눌렀을 때만 */
export function RejectedBoard({ jobs, keysSaved }: { jobs: RejectedJob[]; keysSaved: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const recheck = () =>
    start(async () => {
      const r = await recheckJobsAction();
      if (!r.ok) return setNote(`❌ ${r.error}`);
      setNote(r.checked === 0 ? "확인할 등록 기록이 없습니다." : `✅ ${r.checked}건 확인했습니다.${r.failed ? ` 읽지 못한 ${r.failed}건은 상품 화면에서 다시 확인해 주세요.` : ""}`);
      router.refresh();
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">⛔ 반려된 상품 {jobs.length > 0 && <span className="text-rose-700">{jobs.length}건</span>}</h2>
          <p className="mt-0.5 text-xs text-slate-600">이 프로그램에서 보낸 상품 가운데 쿠팡이 반려한 것을 최근 순으로 최대 10건 보여 줍니다. 저장 뒤 결과는 「등록 상태 다시 확인」으로 받아 옵니다.</p>
        </div>
        <button type="button" disabled={!keysSaved || pending} onClick={recheck} className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">
          {pending ? "확인 중…" : "등록 상태 다시 확인"}
        </button>
      </div>
      {note && <p className="text-[12px] text-slate-800">{note}</p>}
      {jobs.length === 0 ? (
        <p className="text-[13px] text-slate-500">기록된 반려 상품이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => {
            const body = (
              <>
                <p className="text-[13px] font-bold text-slate-900">{j.product_name || "(이름 없음)"}{j.seller_product_id ? <span className="ml-1 text-[11px] font-normal text-slate-500">상품번호 {j.seller_product_id}</span> : null}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-rose-900">{rejectReasonText(j.message)}</p>
              </>
            );
            return <li key={j.id}>{j.product_id ? <Link href={`/products/${j.product_id}`} className="block rounded-xl border border-rose-200 bg-rose-50 p-3 transition hover:border-rose-400">{body}</Link> : <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">{body}</div>}</li>;
          })}
        </ul>
      )}
    </section>
  );
}
