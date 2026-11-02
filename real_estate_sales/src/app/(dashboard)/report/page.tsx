import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findDistrict } from "@/lib/publicdata/districts";
import { resolveMemberPublicDataKeys } from "@/lib/publicdata/memberKeys";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/publicdata/molit";
import { buildAddressReport, type ReportInput } from "@/lib/realestate/reportData";
import { formatWon } from "@/lib/format";
import { ymLabel } from "@/lib/realestate/insights";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// B1 주소 리포트(2026-11-03, 플랜 docs/PLAN_20261102_B_ADDRESS_REPORT.md). 들어오는 길: 실거래 상세(?listing=) · 임장 기록(?onsite=)
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const ONSITE_TYPE: Record<string, PropertyType | null | "비주거"> = { 아파트: "아파트", "빌라·주택": "빌라", 오피스텔: "오피스텔", 상가: "비주거", 건물: "비주거", 토지: "비주거" };
const dayLabel = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : d);

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-mx-raised p-3">
      <dt className="text-xs text-mx-muted">{label}</dt>
      <dd className="mt-1 font-bold text-mx-text">{value}</dd>
      {note && <p className="mt-1 text-[11px] text-mx-muted">{note}</p>}
    </div>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ listing?: string; onsite?: string }> }) {
  const user = await requireProgramAccess();
  const sp = await searchParams;
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseLike;

  let input: ReportInput | null = null;
  let title = "";
  let subtitle = "";
  let backHref = "/report";
  let nonResidential = false;

  if (sp.listing) {
    const { data: l } = await db.from("real_estate_listings").select("id, pnu, sgg_cd, sgg_nm, stdg_nm, bldg_nm, property_type, exclusive_area, floor").eq("id", sp.listing).maybeSingle();
    if (l?.pnu && /^\d{19}$/.test(l.pnu)) {
      const type = (PROPERTY_TYPES as readonly string[]).includes(l.property_type) ? (l.property_type as PropertyType) : null;
      input = { pnu: l.pnu, sggCd: l.sgg_cd, name: l.bldg_nm, dong: l.stdg_nm, area: l.exclusive_area, floor: l.floor, type };
      title = l.bldg_nm || "이름 없는 건물";
      subtitle = `${l.sgg_nm ?? ""} ${l.stdg_nm ?? ""} · ${l.property_type ?? ""}${l.exclusive_area ? ` · 전용 ${l.exclusive_area}㎡ 기준` : ""}`;
      backHref = `/listings/${l.id}`;
    }
  } else if (sp.onsite) {
    const { data: o } = await db.from("real_estate_onsite_properties").select("id, pnu, sgg_cd, admin_dong, address, kind").eq("id", sp.onsite).eq("user_id", user.id).maybeSingle();
    if (o?.pnu && /^\d{19}$/.test(o.pnu)) {
      const mapped = o.kind ? ONSITE_TYPE[o.kind] : null;
      nonResidential = mapped === "비주거";
      input = { pnu: o.pnu, sggCd: o.pnu.slice(0, 5), type: mapped && mapped !== "비주거" ? mapped : null };
      title = o.address || [findDistrict(o.pnu.slice(0, 5))?.sgg_nm, o.admin_dong].filter(Boolean).join(" ") || "임장 기록";
      subtitle = `임장 노트${o.kind ? ` · ${o.kind}` : ""}`;
      backHref = `/onsite/${o.id}`;
    }
  }

  if (!input) {
    const { data: mine } = await db.from("real_estate_onsite_properties").select("id, address, kind, admin_dong").eq("user_id", user.id).not("pnu", "is", null).order("created_at", { ascending: false }).limit(10);
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <h1 className="text-2xl font-black text-mx-text">📄 주소 리포트</h1>
        <div className="mx-card space-y-2 p-5 text-sm text-mx-muted">
          <p>한 필지(지번)의 <b className="text-mx-text">최근 12개월 실거래·전세, 공시가격, 공시지가·용도지역, 건물 정보</b>를 한 장으로 모아 보여 줘요.</p>
          <p>들어오는 길은 두 가지예요. <Link href="/listings" className="text-mx-link underline">실거래 내역</Link>에서 한 줄을 열고 「📄 이 단지 주소 리포트」를 누르거나, 아래 임장 기록을 고르세요.</p>
          <p className="text-xs">주소를 직접 입력하는 기능은 도로명주소 검색 키를 받은 뒤 열어요.</p>
        </div>
        <div className="mx-card p-5">
          <h2 className="mx-section-title">📷 지번이 확인된 내 임장 기록</h2>
          {(mine ?? []).length === 0 ? (
            <p className="text-sm text-mx-muted">아직 없어요. <Link href="/onsite" className="text-mx-link underline">임장 노트</Link>에서 위치를 확정하면 여기에 보여요.</p>
          ) : (
            <ul className="divide-y divide-mx-border text-sm">
              {(mine as { id: string; address: string | null; kind: string | null; admin_dong: string | null }[]).map((m) => (
                <li key={m.id}>
                  <Link href={`/report?onsite=${m.id}`} className="flex min-h-[44px] items-center justify-between gap-2 py-2 text-mx-text hover:text-mx-link">
                    <span>{m.address || m.admin_dong || "임장 기록"}</span>
                    <span className="text-xs text-mx-muted">{m.kind ?? "유형 미정"} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const keys = await resolveMemberPublicDataKeys(supabase, user.id);
  const r = await buildAddressReport(nonResidential ? { ...input, type: null } : input, keys);
  const maxMonth = Math.max(1, ...r.sale.byMonth.map((m) => m.median));
  const noDeals = r.sale.count === 0 && r.jeonse.count === 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href={backHref} className="inline-flex min-h-[40px] items-center text-sm text-mx-muted hover:text-mx-text">← 돌아가기</Link>
      <div className="rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5">
        <span className="mx-chip-blue mb-2">📄 주소 리포트</span>
        <h1 className="text-2xl font-black text-mx-text">{title}</h1>
        <p className="mt-1 text-sm text-mx-muted">{subtitle}</p>
        <p className="mt-1 text-xs text-mx-muted">기준: 국토부 실거래·전월세 최근 {r.months}개월{r.type ? ` · ${r.type}` : ""} · 같은 지번{input.name ? "·같은 단지 이름" : ""}{input.area ? " · 전용 ±3㎡" : ""}</p>
      </div>

      {nonResidential && <p className="mx-card px-4 py-3 text-sm text-mx-muted">상가·건물·토지 거래는 다음 단계에서 붙여요. 지금은 주거 실거래(있으면)와 토지·건물 정보만 보여요.</p>}

      <div className="mx-card p-5">
        <h2 className="mx-section-title">💰 실거래 (매매)</h2>
        {r.sale.count === 0 ? (
          <p className="text-sm text-mx-muted">최근 {r.months}개월 동안 이 필지의 매매 신고가 없어요(자료 없음).</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <Fact label="거래 건수" value={`${r.sale.count}건`} />
              <Fact label="중간값" value={formatWon(r.sale.median)} />
              <Fact label="범위" value={`${formatWon(r.sale.min)} ~ ${formatWon(r.sale.max)}`} />
              <Fact label="가장 최근" value={formatWon(r.sale.latest?.amount)} note={r.sale.latest ? `${dayLabel(r.sale.latest.day)} · ${r.sale.latest.floor || "-"}층${r.sale.latest.area ? ` · ${r.sale.latest.area}㎡` : ""}` : undefined} />
            </dl>
            <div className="mt-4 space-y-1">
              {r.sale.byMonth.map((m) => (
                <div key={m.ym} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-mx-muted">{ymLabel(m.ym)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-mx-raised">
                    <div className="h-full rounded bg-mx-primary" style={{ width: `${Math.round((m.median / maxMonth) * 100)}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right tabular-nums text-mx-text">{formatWon(m.median)} · {m.count}건</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mx-card p-5">
        <h2 className="mx-section-title">🔑 전세·월세</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <Fact label="전세 건수" value={r.jeonse.count ? `${r.jeonse.count}건` : "자료 없음"} />
          <Fact label="전세 중간값" value={r.jeonse.count ? formatWon(r.jeonse.median) : "-"} />
          <Fact label="전세가율" value={r.jeonseRatio !== null ? `${r.jeonseRatio}%` : "-"} note="전세 중간값 ÷ 매매 중간값" />
          <Fact label="월세 건수" value={`${r.monthlyCount}건`} />
        </dl>
      </div>

      <div className="mx-card p-5">
        <h2 className="mx-section-title">🏛️ 공시가격 · 토지</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Fact
            label="공동주택 공시가격"
            value={r.assessedPrice === "대상 아님" ? "대상 아님(오피스텔)" : r.assessedPrice ? formatWon(r.assessedPrice / 10000) : "자료 없음"}
            note={r.assessedPrice && r.assessedPrice !== "대상 아님" && r.sale.median ? `매매 중간값의 ${Math.round((r.assessedPrice / 10000 / r.sale.median) * 100)}%` : "면적이 맞는 세대 기준"}
          />
          <Fact label={`개별공시지가${r.land?.year ? ` (${r.land.year}년)` : ""}`} value={r.land?.pricePerM2 ? `${r.land.pricePerM2.toLocaleString("ko-KR")}원/㎡` : "자료 없음"} />
          <Fact label="용도지역" value={r.land?.zones.length ? r.land.zones.join(", ") : "자료 없음"} />
        </dl>
        {r.land?.allZones && (
          <details className="mt-2 text-xs text-mx-muted">
            <summary className="cursor-pointer">지구·구역 전체 보기</summary>
            <p className="mt-1">{r.land.allZones}</p>
          </details>
        )}
      </div>

      <div className="mx-card p-5">
        <h2 className="mx-section-title">🏢 건물 정보 (건축물대장)</h2>
        {r.building ? (
          <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-3">
            <Fact label="사용승인일" value={r.building.approvalDay ?? "-"} note={r.building.ageYears !== null ? `약 ${r.building.ageYears}년 차` : undefined} />
            <Fact label="용적률" value={r.building.floorAreaRatio ? `${r.building.floorAreaRatio}%` : "-"} />
            <Fact label="건폐율" value={r.building.coverageRatio ? `${r.building.coverageRatio}%` : "-"} />
            <Fact label="주차" value={r.building.parking ? `${r.building.parking}대` : "-"} note={r.building.households && r.building.parking ? `세대당 ${(r.building.parking / r.building.households).toFixed(2)}대` : undefined} />
            <Fact label="세대수" value={r.building.households ? `${r.building.households}세대` : "-"} />
            <Fact label="최고 층수" value={r.building.topFloor ? `${r.building.topFloor}층` : "-"} />
          </dl>
        ) : (
          <p className="text-sm text-mx-muted">자료 없음 — 건축물대장 조회가 되지 않았어요.</p>
        )}
      </div>

      {noDeals && !nonResidential && (
        <p className="mx-card px-4 py-3 text-sm text-mx-muted">이 지번으로 신고된 거래가 없거나, 단지가 여러 지번에 걸쳐 대표 지번이 다를 수 있어요.</p>
      )}

      {r.errors.length > 0 && (
        <details className="mx-card p-4 text-xs text-mx-muted">
          <summary className="cursor-pointer">⚠️ 일부 자료를 받지 못했어요 ({r.errors.length}건)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {r.errors.slice(0, 12).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-mx-muted">※ 국토교통부 실거래·전월세, 브이월드 공시가격·토지이용계획, 건축물대장(공공데이터포털) 자료를 모은 참고용 요약이에요. 투자 판단과 책임은 본인에게 있어요.</p>
    </div>
  );
}
