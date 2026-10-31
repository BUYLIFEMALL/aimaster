"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recheckJobsAction } from "@/lib/actions/alerts";
import { rejectReasonText } from "@/lib/coupang/status";
import { AlertCircle, RefreshCw, Sparkles, ExternalLink } from "lucide-react";

export type RejectedJob = {
  id: string;
  product_id: string | null;
  product_name: string;
  seller_product_id: number | null;
  message: string | null;
};

/** 3안: 반려 상품 AI 자동 수정 및 재검토 관제 보드 */
export function RejectedBoard({ jobs, keysSaved }: { jobs: RejectedJob[]; keysSaved: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const recheck = () =>
    start(async () => {
      const r = await recheckJobsAction();
      if (!r.ok) return setNote(`❌ ${r.error}`);
      setNote(
        r.checked === 0
          ? "확인할 등록 기록이 없습니다."
          : `✅ ${r.checked}건 확인했습니다.${
              r.failed ? ` 읽지 못한 ${r.failed}건은 상품 화면에서 다시 확인해 주세요.` : ""
            }`
      );
      router.refresh();
    });

  return (
    <section className="lab-card space-y-3.5 p-5 sm:p-6 bg-white border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-black text-xs">
              <AlertCircle size={15} />
            </span>
            <h2 className="text-base font-extrabold text-slate-900">
              쿠팡 반려 상품 AI 관제{" "}
              {jobs.length > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {jobs.length}건
                </span>
              )}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            쿠팡 WING 승인 심사에서 반려된 상품을 감지하고, 사유 분석을 통해 원클릭 AI 자동 수정을 지원합니다.
          </p>
        </div>

        <button
          type="button"
          disabled={!keysSaved || pending}
          onClick={recheck}
          className="btn-3d-indigo text-xs py-1.5 px-3.5"
        >
          <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
          <span>{pending ? "상태 확인 중…" : "등록 상태 다시 확인"}</span>
        </button>
      </div>

      {note && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800">
          {note}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          ✨ 현재 반려된 상품이 없습니다. 등록된 모든 상품이 정상 승인 및 위너 매칭 진행 중입니다.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {jobs.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-bold text-slate-900">{j.product_name}</span>
                  {j.seller_product_id && (
                    <span className="font-mono text-[10px] text-slate-500">
                      ID: {j.seller_product_id}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-rose-600 font-medium">
                  {rejectReasonText(j.message || "반려 사유를 확인해 주세요")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/products?edit=${j.product_id || j.id}`}
                  className="btn-3d-emerald text-xs py-1 px-3"
                >
                  <Sparkles size={12} />
                  <span>AI 자동 수정</span>
                </Link>
                {j.seller_product_id && (
                  <a
                    href={`https://wing.coupang.com/seller/products/${j.seller_product_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <span>WING 보기</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
