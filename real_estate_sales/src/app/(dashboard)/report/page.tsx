import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findDistrict } from "@/lib/publicdata/districts";
import { resolveMemberPublicDataKeys } from "@/lib/publicdata/memberKeys";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/publicdata/molit";
import { buildAddressReport, type ReportInput } from "@/lib/realestate/reportData";
import { ReportBody } from "@/components/report/ReportBody";
import { SaveReportForm } from "@/components/report/ReportActions";
import { RegistryCheck } from "@/components/report/RegistryCheck";
import { OnsiteNotes } from "@/components/report/OnsiteNotes";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// B1 주소 리포트(2026-11-03, 플랜 docs/PLAN_20261102_B_ADDRESS_REPORT.md). 들어오는 길: 실거래 상세(?listing=) · 임장 기록(?onsite=)
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const ONSITE_TYPE: Record<string, PropertyType | null | "비주거"> = { 아파트: "아파트", "빌라·주택": "빌라", 오피스텔: "오피스텔", 상가: "비주거", 건물: "비주거", 토지: "비주거" };
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
  let source: "listing" | "onsite" = "listing";
  let sourceId = "";

  if (sp.listing) {
    const { data: l } = await db.from("real_estate_listings").select("id, pnu, sgg_cd, sgg_nm, stdg_nm, bldg_nm, property_type, exclusive_area, floor").eq("id", sp.listing).maybeSingle();
    if (l?.pnu && /^\d{19}$/.test(l.pnu)) {
      const type = (PROPERTY_TYPES as readonly string[]).includes(l.property_type) ? (l.property_type as PropertyType) : null;
      input = { pnu: l.pnu, sggCd: l.sgg_cd, name: l.bldg_nm, dong: l.stdg_nm, area: l.exclusive_area, floor: l.floor, type };
      title = l.bldg_nm || "이름 없는 건물";
      subtitle = `${l.sgg_nm ?? ""} ${l.stdg_nm ?? ""} · ${l.property_type ?? ""}${l.exclusive_area ? ` · 전용 ${l.exclusive_area}㎡ 기준` : ""}`;
      backHref = `/listings/${l.id}`;
      sourceId = String(l.id);
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
      source = "onsite";
      sourceId = String(o.id);
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
          <p><Link href="/report/saved" className="text-mx-link underline">💾 저장한 리포트 보기</Link></p>
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
  // 저장본에는 거래 목록(trades)을 빼고 숫자만(크기·개인정보 최소화)
  const { trades: _trades, ...snapshot } = r; // eslint-disable-line @typescript-eslint/no-unused-vars
  const assessedManwon = typeof r.assessedPrice === "number" ? r.assessedPrice / 10000 : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href={backHref} className="inline-flex min-h-[40px] items-center text-sm text-mx-muted hover:text-mx-text print:hidden">← 돌아가기</Link>
      <div className="rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5">
        <span className="mx-chip-blue mb-2">📄 주소 리포트</span>
        <h1 className="text-2xl font-black text-mx-text">{title}</h1>
        <p className="mt-1 text-sm text-mx-muted">{subtitle}</p>
        <p className="mt-1 text-xs text-mx-muted">기준: 국토부 실거래·전월세 최근 {r.months}개월{r.type ? ` · ${r.type}` : ""} · 같은 지번{input.name ? "·같은 단지 이름" : ""}{input.area ? " · 전용 ±3㎡" : ""}</p>
      </div>

      <SaveReportForm
        source={source}
        sourceId={sourceId}
        pnu={input.pnu}
        title={title}
        subtitle={subtitle}
        reportJson={JSON.stringify(snapshot)}
        saleMedian={r.sale.median}
        latest={r.sale.latest?.amount ?? null}
        assessed={assessedManwon}
        months={r.months}
      />

      {source === "onsite" && sourceId && <OnsiteNotes onsiteId={sourceId} userId={user.id} />}

      <ReportBody r={snapshot} nonResidential={nonResidential} />

      <RegistryCheck saleMedian={r.sale.median} jeonseMedian={r.jeonse.median} />
    </div>
  );
}
