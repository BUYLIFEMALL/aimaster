import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { PageHero } from "@/components/ui/PageHero";
import { TradeTabs } from "@/components/trades/TradeTabs";
import { formatManwon, kindLabel, normalizePrefs, BUILDING_USES, JIMOKS } from "@/lib/trades/prefs";
import { applyTradeFilter } from "@/lib/trades/query";

const PAGE_SIZE = 50;
const STATS_LIMIT = 5000; // 요약 카드 계산에 쓰는 최대 건수

const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

interface Row {
  id: string;
  kind: string;
  sgg_nm: string;
  umd_nm: string;
  jibun: string;
  deal_date: string;
  amount_manwon: number;
  category: string;
  building_type: string | null;
  area_m2: number | null;
  price_per_pyeong: number | null;
  is_share: boolean;
  dealing_type: string | null;
  cancelled: boolean;
}

function Tags({ t, viewed }: { t: Row; viewed: boolean }) {
  return (
    <>
      {t.cancelled && <span className="mx-chip-amber ml-1 px-2 py-0.5 text-xs">취소</span>}
      {t.is_share && <span className="mx-chip ml-1 px-2 py-0.5 text-xs">지분</span>}
      {t.dealing_type === "직거래" && <span className="mx-chip ml-1 px-2 py-0.5 text-xs">직거래</span>}
      {viewed && <span className="ml-1 text-xs text-mx-muted">✔ 확인</span>}
    </>
  );
}

export default async function TradesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: watches }, { data: prefRow }] = await Promise.all([
    supabase.from("commercial_land_watch").select("sgg_cd, sgg_nm").eq("user_id", user.id).eq("is_active", true),
    supabase.from("commercial_land_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const regions = (watches ?? []) as { sgg_cd: string; sgg_nm: string }[];
  const codes = regions.map((r) => r.sgg_cd);
  const prefs = normalizePrefs(prefRow);
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = { kind: sp.kind ?? "", sgg: sp.sgg ?? "", q: sp.q ?? "", category: sp.category ?? "", mine: sp.mine !== "0", sort: sp.sort ?? "" };

  const { data, count, error } = await applyTradeFilter(supabase.from("commercial_land_trades").select("*", { count: "exact" }), filter, codes, prefs).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];
  const { data: seen } = rows.length
    ? await supabase.from("commercial_land_user_trades").select("trade_id").eq("user_id", user.id).not("viewed_at", "is", null).in("trade_id", rows.map((r) => r.id))
    : { data: [] };
  const viewed = new Set(((seen ?? []) as { trade_id: string }[]).map((s) => s.trade_id));
  const total: number = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const view = sp.view === "grid" ? "grid" : "table";
  const { data: statRows } = total
    ? await applyTradeFilter(supabase.from("commercial_land_trades").select("amount_manwon, price_per_pyeong"), filter, codes, prefs).limit(STATS_LIMIT)
    : { data: [] };
  const amounts = ((statRows ?? []) as { amount_manwon: number }[]).map((r) => Number(r.amount_manwon)).filter(Number.isFinite);
  const pyeongs = ((statRows ?? []) as { price_per_pyeong: number | null }[]).filter((r) => r.price_per_pyeong !== null).map((r) => Number(r.price_per_pyeong));
  const avgAmount = amounts.length ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : null;

  const params = new URLSearchParams(Object.entries({ ...filter, mine: filter.mine ? "" : "0" }).filter(([, v]) => v) as [string, string][]);
  const pageLink = (p: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(p));
    if (view === "grid") q.set("view", "grid");
    return `/trades?${q}`;
  };
  const viewLink = (v: string) => {
    const q = new URLSearchParams(params);
    if (v === "grid") q.set("view", "grid");
    return `/trades?${q}`;
  };
  const toggle = (on: boolean) => `rounded-md px-3 py-1.5 text-sm font-semibold ${on ? "bg-mx-primary/10 text-mx-primary" : "text-mx-muted"}`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero badge="🏢 STEP 4 · 실거래 내역" title="실거래 내역" description="실거래 지역의 상가·건물·토지 실거래입니다. 계약 후 신고까지 시간이 걸려 최근 거래는 늦게 들어올 수 있습니다." tip={`조건에 맞는 거래 ${total.toLocaleString("ko-KR")}건`} />
      <TradeTabs active="trades" />
      <div className="mt-4">
        <KpiGrid>
          <KpiCard icon="🏢" label="전체 실거래" value={`${total.toLocaleString("ko-KR")}건`} />
          <KpiCard icon="📊" label="평균 금액" value={formatManwon(avgAmount)} tone="green" />
          <KpiCard icon="🏆" label="최고 금액" value={formatManwon(amounts.length ? Math.max(...amounts) : null)} tone="amber" />
          <KpiCard icon="📐" label="평당가 중간값" value={formatManwon(median(pyeongs))} tone="muted" hint={total > STATS_LIMIT ? `정렬 기준 앞 ${STATS_LIMIT.toLocaleString("ko-KR")}건 기준` : undefined} />
        </KpiGrid>
      </div>
      <form className="mx-card my-4 grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <select name="kind" defaultValue={filter.kind} aria-label="종류" className="mx-input min-h-[40px] py-2 text-sm">
          <option value="">상가·건물 + 토지</option>
          <option value="building">상가·건물</option>
          <option value="land">토지</option>
        </select>
        <select name="sgg" defaultValue={filter.sgg} aria-label="지역" className="mx-input min-h-[40px] py-2 text-sm">
          <option value="">모든 실거래 지역</option>
          {regions.map((r) => (
            <option key={r.sgg_cd} value={r.sgg_cd}>
              {r.sgg_nm}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={filter.category} aria-label="분류" className="mx-input min-h-[40px] py-2 text-sm">
          <option value="">모든 분류</option>
          {[...BUILDING_USES, ...JIMOKS.filter((j) => j !== "기타")].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={filter.q} placeholder="동 이름" aria-label="동 이름" className="mx-input min-h-[40px] py-2 text-sm" />
        <select name="sort" defaultValue={filter.sort} aria-label="정렬" className="mx-input min-h-[40px] py-2 text-sm">
          <option value="">최신 계약순</option>
          <option value="amount">금액 높은순</option>
          <option value="pyeong">평당가 높은순</option>
        </select>
        <select name="mine" defaultValue={filter.mine ? "" : "0"} aria-label="내 조건" className="mx-input min-h-[40px] py-2 text-sm">
          <option value="">내 조건만</option>
          <option value="0">전체 (취소·지분 포함)</option>
        </select>
        {view === "grid" && <input type="hidden" name="view" value="grid" />}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="mx-btn-primary min-h-[40px] text-sm">
            적용
          </button>
          <a href={`/api/export?${params}`} className="mx-btn-ghost min-h-[40px] text-sm">
            📥 CSV 내려받기
          </a>
          <div className="ml-auto flex rounded-lg border border-mx-border p-0.5">
            <Link href={viewLink("table")} aria-current={view === "table" ? "true" : undefined} className={toggle(view === "table")}>☰ 표</Link>
            <Link href={viewLink("grid")} aria-current={view === "grid" ? "true" : undefined} className={toggle(view === "grid")}>▦ 카드</Link>
          </div>
        </div>
      </form>

      {error && <p className="mx-card text-sm text-mx-danger">목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>}
      {!error && codes.length === 0 && (
        <p className="mx-card text-sm text-mx-muted">
          아직 고른 지역이 없습니다.{" "}
          <Link href="/districts" className="text-mx-link underline">
            실거래 지역 추가
          </Link>
        </p>
      )}
      {!error && codes.length > 0 && rows.length === 0 && <p className="mx-card text-sm text-mx-muted">조건에 맞는 거래가 없습니다. 방금 지역을 골랐다면 5~10분 뒤 다시 확인해 주세요.</p>}

      {rows.length > 0 && (
        <>
          <div className={`mx-card hidden overflow-x-auto p-0 ${view === "table" ? "md:block" : ""}`}>
            <table className="mx-table min-w-[820px]">
              <thead>
                <tr>
                  <th>계약일</th>
                  <th>지역</th>
                  <th>분류</th>
                  <th>금액</th>
                  <th>면적</th>
                  <th>평당가</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.deal_date}</td>
                    <td>
                      <Link href={`/trades/${t.id}`} className="text-mx-link hover:underline">
                        {t.sgg_nm} {t.umd_nm}
                      </Link>
                    </td>
                    <td>
                      {kindLabel(t.kind)} · {t.category}
                      {t.building_type ? ` · ${t.building_type}` : ""}
                      <Tags t={t} viewed={viewed.has(t.id)} />
                    </td>
                    <td className="font-semibold">{formatManwon(t.amount_manwon)}</td>
                    <td>{t.area_m2 ? `${Number(t.area_m2).toLocaleString("ko-KR")}㎡` : "-"}</td>
                    <td>{formatManwon(t.price_per_pyeong)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={view === "grid" ? "grid gap-2 md:grid-cols-2 lg:grid-cols-3" : "space-y-2 md:hidden"}>
            {rows.map((t) => (
              <Link key={t.id} href={`/trades/${t.id}`} className="mx-card block p-4">
                <p className="font-semibold text-mx-text">
                  {t.sgg_nm} {t.umd_nm} · {formatManwon(t.amount_manwon)}
                </p>
                <p className="mt-1 text-sm text-mx-muted">
                  {t.deal_date} · {kindLabel(t.kind)} · {t.category}
                  <Tags t={t} viewed={viewed.has(t.id)} />
                </p>
                <p className="mt-1 text-sm text-mx-muted">
                  {t.area_m2 ? `${Number(t.area_m2).toLocaleString("ko-KR")}㎡` : "-"} · 평당 {formatManwon(t.price_per_pyeong)}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-mx-muted">
            {page > 1 && (
              <Link href={pageLink(page - 1)} className="mx-btn-ghost min-h-[40px] text-sm">
                이전
              </Link>
            )}
            <span>
              {page} / {pages}
            </span>
            {page < pages && (
              <Link href={pageLink(page + 1)} className="mx-btn-ghost min-h-[40px] text-sm">
                다음
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
