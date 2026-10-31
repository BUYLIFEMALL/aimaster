"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExchangeRequests } from "@/components/ExchangeRequests";
import { InquiryBoard } from "@/components/InquiryBoard";
import { OrderSheets } from "@/components/OrderSheets";
import { ReturnRequests } from "@/components/ReturnRequests";
import { todaySummaryAction, type Count, type TodayResult } from "@/lib/actions/today";
import { Truck, RotateCcw, AlertTriangle, RefreshCw, ArrowUpRight, CheckCircle2 } from "lucide-react";

const show = (c: Count) => ("error" in c ? "확인 실패" : `${c.count}${c.more ? "+" : ""}건`);
const zero = (c: Count) => !("error" in c) && c.count === 0;
/** 요약 카드 합계. 하나라도 못 읽으면 합계를 내지 않는다 */
const sum = (...list: Count[]) => (list.some((c) => "error" in c) ? "확인 실패" : `${list.reduce((n, c) => n + ("error" in c ? 0 : c.count), 0)}${list.some((c) => !("error" in c) && c.more) ? "+" : ""}건`);

/** 오늘 할 일: 위 카드 숫자도 모두 「불러오기」로 쿠팡에서 읽은 값이다(고정 숫자 금지) */
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="lab-card p-4 border-l-4 border-l-rose-500 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">먼저 볼 일</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={14} /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{data ? sum(data.stopRequests, data.inquiries) : "-"}</p>
          <p className="mt-1 text-[11px] text-slate-500">출고중지 요청 + 미답변 문의</p>
        </div>

        <div className="lab-card p-4 border-l-4 border-l-indigo-600 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">출고할 주문</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Truck size={14} /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{data ? sum(data.accept, data.instruct) : "-"}</p>
          <p className="mt-1 text-[11px] text-slate-500">결제완료 + 상품준비중</p>
        </div>

        <div className="lab-card p-4 border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">반품·교환</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600"><RotateCcw size={14} /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{data ? sum(data.returnsReceived, data.exchanges) : "-"}</p>
          <p className="mt-1 text-[11px] text-slate-500">반품 접수 + 처리 중인 교환</p>
        </div>

        <div className="lab-card p-4 border-l-4 border-l-blue-500 bg-white">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[12px] font-bold">쿠팡 키</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600"><CheckCircle2 size={14} /></span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{keysSaved ? "등록됨" : "미등록"}</p>
          <p className="mt-1 text-[11px] text-slate-500">{keysSaved ? "연결 확인은 「API키등록·플랫폼연동」에서" : "WING 키 등록 필요"}</p>
        </div>
      </div>

      <section className="lab-card space-y-4 p-5 sm:p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">📋 오늘 할 일</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              최근 31일 주문과 처리할 요청을 버튼을 누를 때 쿠팡에서 읽어 옵니다. 숫자를 누르면 이 자리에서 바로 처리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!keysSaved || pending}
              onClick={load}
              className="btn-3d-indigo text-xs py-2 px-4"
            >
              <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
              <span>{pending ? "쿠팡에서 읽는 중…" : data ? "다시 불러오기" : "오늘 할 일 불러오기"}</span>
            </button>
          </div>
        </div>

        {!keysSaved && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-center justify-between">
            <span>🔑 WING Open API 키가 아직 등록되지 않았습니다. API 키를 등록해야 주문을 처리할 수 있습니다.</span>
            <Link href="/connect" className="font-bold underline text-indigo-700 hover:text-indigo-900 ml-2 shrink-0">
              키 등록하러 가기 →
            </Link>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-900 font-medium">
            ❌ {error}
          </div>
        )}

        {/* 오늘 할 일 주문/배송 카드 그리드 */}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">주문·클레임 처리 대기 항목 (카드 클릭 시 인라인 빠른 처리)</span>
              <span>기간: {data.from} ~ {data.to}</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((k) => (
                <button
                  type="button"
                  key={k.label}
                  onClick={() => setOpen(open === k.href ? "" : k.href)}
                  aria-expanded={open === k.href}
                  className={`block rounded-xl border p-3.5 text-left transition-all ${
                    open === k.href
                      ? "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/30"
                      : "hover:border-indigo-300 hover:shadow-sm"
                  } ${
                    k.urgent && !zero(k.c)
                      ? "border-rose-300 bg-rose-50/60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">
                      {k.urgent && !zero(k.c) ? "🚨 " : ""}{k.label}
                    </p>
                    <ArrowUpRight size={13} className="text-slate-400" />
                  </div>
                  <p className={`mt-1.5 text-2xl font-black ${
                    k.urgent && !zero(k.c) ? "text-rose-600" : zero(k.c) ? "text-slate-400" : "text-slate-900"
                  }`}>
                    {show(k.c)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {"error" in k.c ? k.c.error : k.hint}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 인라인 작업 서브패널 */}
        {open && (
          <div className="space-y-3 rounded-xl border border-indigo-100 bg-slate-50/50 p-4 pt-3">
            <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200 pb-2">
              <span className="text-indigo-800">빠른 작업 패널 ({open})</span>
              <div className="flex items-center gap-3">
                <Link href={open} className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                  <span>전체 화면으로 열기</span>
                  <ArrowUpRight size={12} />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen("")}
                  className="rounded px-2 py-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                >
                  닫기 ✕
                </button>
              </div>
            </div>
            {open.startsWith("/orders") && <OrderSheets key={open} keysSaved={keysSaved} defaultCourier={defaultCourier} initialStatus={open.split("=")[1]} autoLoad />}
            {open.startsWith("/returns") && <ReturnRequests key={open} keysSaved={keysSaved} defaultCourier={defaultCourier} initialView={open.split("=")[1]} autoLoad />}
            {open === "/inquiries" && <InquiryBoard keysSaved={keysSaved} autoLoad />}
            {open === "/exchanges" && <ExchangeRequests keysSaved={keysSaved} defaultCourier={defaultCourier} autoLoad />}
          </div>
        )}
      </section>
    </div>
  );
}
