"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { todaySummaryAction, type Count, type TodayResult } from "@/lib/actions/today";

const show = (c: Count) => ("error" in c ? "확인 실패" : `${c.count}${c.more ? "+" : ""}건`);
const zero = (c: Count) => !("error" in c) && c.count === 0;

/** 플랜 A1 「오늘 할 일」 — 버튼을 눌렀을 때만 쿠팡에서 읽는다(고정 IP 사용량 보호) */
export function TodayBoard({ keysSaved }: { keysSaved: boolean }) {
  const [data, setData] = useState<Extract<TodayResult, { ok: true }> | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setError("");
      const r = await todaySummaryAction();
      if (!r.ok) return setError(r.error);
      setData(r);
    });

  const cards = data
    ? [
        { label: "출고중지 요청", hint: "발송 전에 먼저 처리", c: data.stopRequests, href: "/returns?view=RU", urgent: true },
        { label: "결제완료", hint: "상품준비중으로 바꿀 주문", c: data.accept, href: "/orders?status=ACCEPT", urgent: false },
        { label: "상품준비중", hint: "송장을 넣을 주문", c: data.instruct, href: "/orders?status=INSTRUCT", urgent: false },
        { label: "반품 접수", hint: "미처리 반품", c: data.returnsReceived, href: "/returns?view=UC", urgent: false },
      ]
    : [];

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">🗓 오늘 할 일</h2>
          <p className="mt-0.5 text-xs text-slate-600">최근 31일 주문 가운데 처리할 것을 한 번에 셉니다. 숫자를 누르면 그 목록으로 갑니다.</p>
        </div>
        <button type="button" disabled={!keysSaved || pending} onClick={load} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
          {pending ? "세는 중…" : data ? "다시 세기" : "오늘 할 일 불러오기"}
        </button>
      </div>
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {data && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((k) => (
            <Link key={k.label} href={k.href} className={`block rounded-xl border p-3 transition hover:border-rose-400 ${k.urgent && !zero(k.c) ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-bold text-slate-600">{k.urgent && !zero(k.c) ? "⚠ " : ""}{k.label}</p>
              <p className={`mt-1 text-2xl font-black ${zero(k.c) ? "text-slate-400" : "text-slate-900"}`}>{show(k.c)}</p>
              <p className="text-[11px] text-slate-500">{"error" in k.c ? k.c.error : k.hint}</p>
            </Link>
          ))}
        </div>
      )}
      {data && <p className="text-[11px] text-slate-500">기간 {data.from} ~ {data.to} · 교환·문의는 다음 단계에서 더합니다.</p>}
    </section>
  );
}
