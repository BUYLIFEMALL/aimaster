import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { ROADMAP, TOOLS } from "@/lib/tools";
import { getWingKeys } from "@/lib/data";
import { TodayBoard } from "@/components/TodayBoard";
import { RejectedBoard, type RejectedJob } from "@/components/RejectedBoard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  const { data: rejected } = await createAdminClient().from("coupang_ops_jobs").select("id,product_id,product_name,seller_product_id,message").eq("user_id", user.id).eq("status", "rejected").order("created_at", { ascending: false }).limit(10);

  return (
    <div className="space-y-5">
      <PageHeader emoji="📦" title="AI 쿠팡 운영 자동화" description="쿠팡 공식 WING Open API로 상품 등록부터 주문·송장·문의까지 내 쿠팡 판매를 처리합니다." />

      <Notice tone="tip">
        🧭 <b>시작 순서</b>: 1. WING에서 Open API 키 발급(연동 방식 「자체개발」, 허용 IP 등록) → 2. 이 프로그램에 키 등록 → 3. 연결 시험 → 4. 상품 등록.
        키 발급 방법은 <Link href="/guide" className="font-bold text-rose-700 underline">📖 연동 &amp; 사용 매뉴얼</Link>에 있습니다.
      </Notice>

      <TodayBoard keysSaved={!!keys} />

      <RejectedBoard jobs={(rejected ?? []) as RejectedJob[]} keysSaved={!!keys} />

      {TOOLS.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Link key={t.href} href={t.href} className="slw-card block p-4 transition hover:border-rose-300">
              <p className="text-[11px] font-black text-rose-700">STEP {i + 1}</p>
              <p className="mt-1 font-extrabold text-slate-900">{t.emoji} {t.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.description}</p>
            </Link>
          ))}
        </div>
      )}

      <section className="slw-card p-5">
        <h2 className="text-base font-extrabold text-slate-900">🛠 기능 출시 순서</h2>
        <p className="mt-1 text-xs text-slate-600">기능을 하나씩 만들어 순서대로 엽니다. 지금은 1단계를 만드는 중입니다.</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((r, i) => (
            <li key={r.stage} className={`rounded-xl border p-3 ${i === 0 ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <p className="text-[11px] font-black text-rose-700">{r.stage}{i === 0 ? " · 만드는 중" : " · 예정"}</p>
              <p className="mt-0.5 font-extrabold text-slate-900">{r.emoji} {r.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.items}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
