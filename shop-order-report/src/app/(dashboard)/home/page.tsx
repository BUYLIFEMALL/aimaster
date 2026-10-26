"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData, won } from "@/components/DataProvider";
import { Notice } from "@/components/ui/PageHeader";
import { Stat, TrendChart } from "@/components/report/Widgets";
import { TOOLS } from "@/lib/tools";
import { byPeriod, inRange, summarize } from "@/lib/report/aggregate";
import { forecastStock, lastOrderDate } from "@/lib/report/inventory";

function shift(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function HomePage() {
  const { lines, settings, ready } = useData();
  const end = lastOrderDate(lines);
  const view = useMemo(() => {
    if (!end) return null;
    const cur = inRange(lines, shift(end, -29), end);
    const prev = inRange(lines, shift(end, -59), shift(end, -30));
    const stocks = Object.fromEntries(Object.entries(settings.products).map(([k, p]) => [k, p.stock ?? null]));
    return {
      cur: summarize(cur, settings),
      prev: prev.length ? summarize(prev, settings) : null,
      trend: byPeriod(cur, settings, "day"),
      danger: forecastStock(lines, stocks, end, 14).filter((f) => f.level === "danger").length,
      pendingNew: lines.filter((l) => l.status === "new").length,
    };
  }, [lines, settings, end]);

  const change = (a: number, b: number | undefined) => (b ? `${a >= b ? "▲" : "▼"} ${Math.abs(Math.round(((a - b) / b) * 100))}% (이전 30일 대비)` : "이전 30일 자료 없음");

  return (
    <div className="space-y-6">
      <section className="slw-card overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-6 text-white">
          <p className="text-sm font-bold opacity-90">📊 내 스토어 진짜 지표</p>
          <h1 className="mt-1 text-2xl font-extrabold">주문 엑셀 한 번 올리면, 매출·순이익·재고·리뷰까지</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50">숫자는 모두 회원님이 올린 실제 주문 파일에서 계산합니다. 구매자 개인정보는 읽자마자 버리고, 주문은 이 PC 브라우저에만 보관합니다.</p>
        </div>
      </section>

      {!ready ? (
        <p className="text-sm text-slate-600">불러오는 중…</p>
      ) : !view ? (
        <section className="slw-card p-6 text-center">
          <p className="font-extrabold text-slate-900">아직 올린 주문이 없습니다</p>
          <p className="mt-1 text-sm text-slate-600">스마트스토어·쿠팡·11번가·G마켓·옥션 판매자센터에서 주문 엑셀을 받아 올리세요. 예시 파일로 먼저 연습할 수도 있습니다.</p>
          <Link href="/upload" className="slw-primary mt-4">📥 주문 파일 올리기</Link>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={`최근 30일 매출 (~${end})`} value={won(view.cur.sales)} sub={change(view.cur.sales, view.prev?.sales)} />
            <Stat label="최근 30일 순이익" value={won(view.cur.profit)} sub={`순이익률 ${view.cur.marginPct}%`} tone={view.cur.profit < 0 ? "bad" : "good"} />
            <Stat label="발송 전 주문" value={`${view.pendingNew}건`} sub="올린 파일 기준" tone={view.pendingNew ? "accent" : "plain"} />
            <Stat label="7일 안 품절 예상" value={`${view.danger}개 상품`} sub="재고를 넣은 상품만" tone={view.danger ? "bad" : "plain"} />
          </div>
          {view.cur.missingCost > 0 && <Notice tone="warn">⚠ 원가를 넣지 않은 상품이 {view.cur.missingCost}개라 순이익이 실제보다 크게 보입니다. <Link href="/settings" className="font-bold underline">원가 넣기</Link></Notice>}
          <section className="slw-card p-4">
            <h2 className="mb-2 text-sm font-extrabold text-slate-900">최근 30일 일별 매출·순이익</h2>
            <TrendChart rows={view.trend} format={won} />
          </section>
        </>
      )}

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">작업 순서</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Link key={t.href} href={t.href} className="slw-card group flex gap-3 p-4 hover:border-teal-400">
              <span className="text-2xl" aria-hidden>{t.emoji}</span>
              <span className="min-w-0">
                <span className="block font-extrabold text-slate-900 group-hover:text-teal-800">{i + 1}. {t.label}</span>
                <span className="mt-0.5 block text-[13px] text-slate-600">{t.description}</span>
              </span>
            </Link>
          ))}
          {/* E5-3(2026-10-26): 사진 속 개인정보 가리기 — 바나나 캔버스 무료 이미지 도구(새 탭, 키·비용 없음) */}
          <a href="https://banana-canvas.buylife.xyz/tools?tab=face" target="_blank" rel="noopener noreferrer" className="slw-card group flex gap-3 p-4 hover:border-teal-400">
            <span className="text-2xl" aria-hidden>🙈</span>
            <span className="min-w-0">
              <span className="block font-extrabold text-slate-900 group-hover:text-teal-800">사진 속 개인정보 가리기 ↗</span>
              <span className="mt-0.5 block text-[13px] text-slate-600">후기·송장 사진을 공유하기 전에 얼굴과 송장·전화번호를 자동으로 가립니다(바나나 캔버스 무료 이미지 도구, 사진은 서버로 가지 않음).</span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
