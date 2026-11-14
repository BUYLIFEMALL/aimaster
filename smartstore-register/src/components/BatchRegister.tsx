"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createBatchJobsAction } from "@/lib/actions/register";
import { REGISTER_MODES } from "@/lib/smartstore/fields";
import { ExtensionPresence } from "@/components/ExtensionPresence";

export type BatchRow = {
  id: string;
  title: string;
  price: number | null;
  salePrice: number | null;
  category: string | null;
  reviewed: boolean;
  updated: string;
};

const won = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("ko-KR")}원`);
const MAX = 20;

/** 상품 목록 + 여러 상품 연속 보내기 (110번 네이버 스마트스토어 오리지널 그린 스타일) */
export function BatchRegister({ rows }: { rows: BatchRow[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<"temp_save" | "register">("temp_save");
  const [state, action, pending] = useActionState(createBatchJobsAction, {});
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));

  return (
    <form action={action} className="space-y-4">
      <ul className="grid gap-3.5 sm:grid-cols-2">
        {rows.map((p) => {
          const isSelected = picked.includes(p.id);
          return (
            <li
              key={p.id}
              className={`slw-card flex gap-3.5 p-4 transition-all ${
                isSelected
                  ? "border-[#03C75A] bg-[rgba(3,199,90,0.06)] ring-1 ring-[#03C75A]"
                  : "hover:border-[#03C75A] hover:bg-white"
              }`}
            >
              <input
                type="checkbox"
                name="productIds"
                value={p.id}
                checked={isSelected}
                onChange={() => toggle(p.id)}
                aria-label={`${p.title} 고르기`}
                className="mt-1 h-4 w-4 shrink-0 accent-[#03C75A]"
              />
              <Link href={`/products/${p.id}`} className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-extrabold text-[#111827]">{p.title}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      p.reviewed
                        ? "bg-[rgba(3,199,90,0.12)] text-[#03C75A]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.reviewed ? "✅ 검토 완료" : "검토 전"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#4B5563]">
                  정상가 {won(p.price)}
                  {p.salePrice ? ` · 할인가 ${won(p.salePrice)}` : ""} ·{" "}
                  <span className="text-[#03C75A] font-semibold">{p.category || "카테고리 미정"}</span>
                </p>
                <p className="mt-1 text-[11px] text-[#9CA3AF]">상세페이지 수정: {p.updated}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length > 0 && (
        <div className="slw-card sticky bottom-3 space-y-3.5 p-5 shadow-xl border-[#03C75A]/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#03C75A] px-2 py-0.5 text-[10px] font-black text-white">
                BATCH TRANSFER
              </span>
              <p className="text-sm font-black text-[#111827]">
                여러 상품 연속 보내기{" "}
                <span className="font-normal text-[#6B7280]">
                  — {picked.length}개 선택됨 (최대 {MAX}개)
                </span>
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPicked(rows.slice(0, MAX).map((r) => r.id))}
                className="btn-3d-secondary !min-h-[30px] !py-1 !px-2.5 text-xs"
              >
                위에서 {Math.min(MAX, rows.length)}개 선택
              </button>
              <button
                type="button"
                onClick={() => setPicked([])}
                className="btn-3d-secondary !min-h-[30px] !py-1 !px-2.5 text-xs"
              >
                전체 해제
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {(["temp_save", "register"] as const).map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer gap-2.5 rounded-xl border p-3 text-xs transition-all ${
                  mode === m
                    ? "border-[#03C75A] bg-[rgba(3,199,90,0.08)] ring-1 ring-[#03C75A]"
                    : "border-[#E5E8EB] bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="mt-0.5 accent-[#03C75A]"
                />
                <div>
                  <b className="text-sm font-extrabold text-[#111827]">{REGISTER_MODES[m].label}</b>
                  <p className="mt-0.5 text-[11px] text-[#6B7280] leading-snug">{REGISTER_MODES[m].hint}</p>
                </div>
              </label>
            ))}
          </div>

          {mode === "register" && (
            <label className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
              <input type="checkbox" name="confirmRegister" className="mt-0.5 accent-amber-600" />
              <span>
                선택한 상품이 실제로 네이버 스마트스토어에 바로 등록되는 것을 확인했습니다. 이미 「바로 등록」한 상품은 자동으로 건너뜁니다.
              </span>
            </label>
          )}

          <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
            상품마다 마지막에 보낸 입력(카테고리 검색어·옵션·태그·주요정보·상품속성·추가상품)을 그대로 씁니다. 처음 보내는 상품은 기본값만 들어갑니다. 「입력만」과 예약구매는 한 상품 화면에서 보내 주세요. 확장은 한 상품씩 차례로 처리합니다.
          </p>

          <ExtensionPresence />

          <button
            type="submit"
            disabled={pending || picked.length === 0}
            className="btn-3d-primary w-full !py-3 text-sm font-black disabled:opacity-50"
          >
            {pending ? "작업 큐 생성 중…" : `선택한 ${picked.length}개 상품 스마트스토어로 연속 전송`}
          </button>

          {state.error && <p className="text-sm font-bold text-rose-700">⚠️ {state.error}</p>}
          {state.created && (
            <div className="space-y-1 text-xs">
              {state.created.length > 0 && (
                <p className="font-bold text-[#03C75A]">
                  ✅ {state.created.length}개 작업을 생성했습니다: {state.created.join(", ")} —{" "}
                  <Link href="/history" className="underline font-black">
                    등록 기록에서 진행 보기 →
                  </Link>
                </p>
              )}
              {(state.skipped ?? []).map((s) => (
                <p key={s} className="text-amber-800">
                  건너뜀: {s}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
