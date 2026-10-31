"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExchangeRequests } from "@/components/ExchangeRequests";
import { InquiryBoard } from "@/components/InquiryBoard";
import { OrderSheets } from "@/components/OrderSheets";
import { ReturnRequests } from "@/components/ReturnRequests";
import { todaySummaryAction, type Count, type TodayResult } from "@/lib/actions/today";

const show = (c: Count) => ("error" in c ? "확인 실패" : `${c.count}${c.more ? "+" : ""}건`);
const zero = (c: Count) => !("error" in c) && c.count === 0;

/** 플랜 A1 「오늘 할 일」 — 버튼을 눌렀을 때만 쿠팡에서 읽는다(고정 IP 사용량 보호) */
export function TodayBoard({ keysSaved, defaultCourier }: { keysSaved: boolean; defaultCourier: string }) {
  const [open, setOpen] = useState("");
  const [data, setData] = useState<Extract<TodayResult, { ok: true }> | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setError("");
      const r = await todaySummaryAction();
      if (!r.ok) return setError(r.error);
      setData(r);
      setOpen("");
    });

  const cards = data
    ? [
        { label: "출고중지 요청", hint: "발송 전에 먼저 처리", c: data.stopRequests, href: "/returns?view=RU", urgent: true },
        { label: "결제완료", hint: "상품준비중으로 바꿀 주문", c: data.accept, href: "/orders?status=ACCEPT", urgent: false },
        { label: "상품준비중", hint: "송장을 넣을 주문", c: data.instruct, href: "/orders?status=INSTRUCT", urgent: false },
        { label: "반품 접수", hint: "미처리 반품", c: data.returnsReceived, href: "/returns?view=UC", urgent: false },
        { label: "미답변 문의", hint: "최근 7일 상품·고객센터", c: data.inquiries, href: "/inquiries", urgent: false },
        { label: "처리 중인 교환", hint: "최근 7일", c: data.exchanges, href: "/exchanges", urgent: false },
      ]
    : [];

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">🗓 오늘 할 일</h2>
          <p className="mt-0.5 text-xs text-slate-600">최근 31일 주문 가운데 처리할 것을 한 번에 셉니다. 숫자를 누르면 이 자리에서 바로 처리합니다.</p>
        </div>
        <button type="button" disabled={!keysSaved || pending} onClick={load} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          {pending ? "세는 중…" : data ? "다시 세기" : "오늘 할 일 불러오기"}
        </button>
      </div>
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {data && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((k) => (
            <button type="button" key={k.label} onClick={() => setOpen(open === k.href ? "" : k.href)} aria-expanded={open === k.href} className={`block rounded-xl border p-3 text-left transition hover:border-blue-400 ${open === k.href ? "ring-2 ring-blue-500 " : ""}${k.urgent && !zero(k.c) ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-bold text-slate-600">{k.urgent && !zero(k.c) ? "⚠ " : ""}{k.label}</p>
              <p className={`mt-1 text-2xl font-black ${zero(k.c) ? "text-slate-400" : "text-slate-900"}`}>{show(k.c)}</p>
              <p className="text-[11px] text-slate-500">{"error" in k.c ? k.c.error : k.hint}</p>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <div className="flex justify-end gap-3 text-[12px] font-bold">
            <Link href={open} className="text-blue-700 underline">전체 화면으로 열기</Link>
            <button type="button" onClick={() => setOpen("")} className="text-slate-600">닫기</button>
          </div>
          {open.startsWith("/orders") && <OrderSheets key={open} keysSaved={keysSaved} defaultCourier={defaultCourier} initialStatus={open.split("=")[1]} autoLoad />}
          {open.startsWith("/returns") && <ReturnRequests key={open} keysSaved={keysSaved} defaultCourier={defaultCourier} initialView={open.split("=")[1]} autoLoad />}
          {open === "/inquiries" && <InquiryBoard keysSaved={keysSaved} autoLoad />}
          {open === "/exchanges" && <ExchangeRequests keysSaved={keysSaved} defaultCourier={defaultCourier} autoLoad />}
        </div>
      )}
      {data && <p className="text-[11px] text-slate-500">기간 {data.from} ~ {data.to}</p>}
    </section>
  );
}
