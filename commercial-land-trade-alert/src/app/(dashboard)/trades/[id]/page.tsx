import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatArea, formatManwon, kindLabel } from "@/lib/trades/prefs";
import { daysAgoIso, medianOrNull } from "@/lib/trades/parse";

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-mx-border bg-dark-100 p-3">
      <p className="text-xs text-mx-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-mx-text">{value}</p>
    </div>
  );
}

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: t } = await supabase.from("commercial_land_trades").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  await supabase
    .from("commercial_land_user_trades")
    .upsert({ user_id: user.id, trade_id: id, viewed_at: new Date().toISOString() }, { onConflict: "user_id,trade_id" });

  // 같은 동·같은 분류(건물은 일반/집합까지) 최근 12개월. 지분·취소는 값이 왜곡되어 뺀다.
  const since = daysAgoIso(365).slice(0, 10);
  let compare = supabase
    .from("commercial_land_trades")
    .select("price_per_pyeong")
    .eq("sgg_cd", t.sgg_cd)
    .eq("umd_nm", t.umd_nm)
    .eq("kind", t.kind)
    .eq("category", t.category)
    .eq("is_share", false)
    .eq("cancelled", false)
    .gte("deal_date", since)
    .not("price_per_pyeong", "is", null)
    .limit(1000);
  if (t.building_type) compare = compare.eq("building_type", t.building_type);
  const { data: peers } = await compare;
  const values = ((peers ?? []) as { price_per_pyeong: number }[]).map((p) => Number(p.price_per_pyeong));
  const median = medianOrNull(values);
  const diff = median && t.price_per_pyeong && !t.is_share && !t.cancelled ? Math.round((Number(t.price_per_pyeong) / median - 1) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/trades" className="text-sm text-mx-muted hover:text-mx-text">
        ← 목록으로
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-mx-text">
        {t.sgg_nm} {t.umd_nm} {t.jibun}
      </h1>
      <p className="mt-1 text-sm text-mx-muted">
        {kindLabel(t.kind)} · {t.category}
        {t.building_type ? ` · ${t.building_type}` : ""} · 계약일 {t.deal_date}
      </p>
      {t.cancelled && <p className="mx-card mt-4 text-sm text-mx-danger">⚠️ 취소된 거래입니다{t.cancelled_on ? ` (취소일 ${t.cancelled_on})` : ""}.</p>}
      {t.is_share && <p className="mx-card mt-4 text-sm text-mx-muted">ℹ️ 지분 거래입니다. 전체 필지 가격이 아니므로 평당가를 그대로 비교하기 어렵습니다.</p>}

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        <Item label="거래 금액" value={formatManwon(t.amount_manwon)} />
        <Item label={t.kind === "building" ? "건물면적" : "거래면적"} value={formatArea(t.area_m2)} />
        <Item label="평당가" value={formatManwon(t.price_per_pyeong)} />
        {t.plot_m2 && <Item label="대지면적" value={formatArea(t.plot_m2)} />}
        {t.floor && <Item label="층" value={`${t.floor}층`} />}
        {t.build_year && <Item label="건축년도" value={`${t.build_year}년`} />}
        <Item label="용도지역" value={t.land_use ?? "-"} />
        <Item label="거래 방식" value={t.dealing_type ?? "-"} />
      </div>

      <section className="mx-card mt-4">
        <h2 className="mx-section-title mb-2">📊 같은 동 비교</h2>
        {median === null ? (
          <p className="text-sm text-mx-muted">같은 동·같은 분류의 최근 12개월 거래가 {values.length}건이라 비교하지 않습니다(5건 이상일 때 표시).</p>
        ) : (
          <p className="text-sm text-mx-text">
            같은 동·같은 분류 {values.length}건의 평당가 중간값은 <b>{formatManwon(median)}</b>입니다.
            {diff !== null && (
              <>
                {" "}
                이 거래는 중간값보다 <b>{Math.abs(diff)}% {diff >= 0 ? "높습니다" : "낮습니다"}</b>.
              </>
            )}
          </p>
        )}
        <p className="mt-2 text-xs text-mx-muted">위치·도로 조건·건물 상태는 반영되지 않은 참고값이며 투자 판단을 보증하지 않습니다.</p>
      </section>
      {t.jibun_masked && <p className="mt-3 text-xs text-mx-muted">🔒 국토부가 지번 일부를 가려서 제공해 정확한 필지를 알 수 없습니다.</p>}
    </div>
  );
}
