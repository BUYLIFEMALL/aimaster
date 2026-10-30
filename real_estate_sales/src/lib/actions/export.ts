"use server";

// RE-N2(2026-10-26): 실거래 목록 CSV 내보내기 — 회원 본인 매칭 전체(최대 5,000건). 공공 실거래 자료라 개인정보 칸 없음.
// 엑셀에서 한글이 깨지지 않게 BOM을 붙인다. 이용 권한은 화면과 같은 requireProgramAccess로 확인.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

const MAX_ROWS = 5000;
const STATUS: Record<string, string> = { new: "새 실거래", notified: "확인됨", analyzed: "분석 완료" };
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportListingsCsvAction(): Promise<{ csv?: string; count?: number; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("real_estate_user_matches")
    .select("status, created_at, listing:real_estate_listings(bldg_nm, sgg_nm, stdg_nm, contract_date, exclusive_area, floor, price_amount, official_price, building_year, property_type)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) return { error: `내보내기에 실패했어요: ${error.message}` };
  const head = ["단지명", "자치구", "법정동", "계약일", "전용면적(㎡)", "층", "거래금액(만 원)", "공시가격(원)", "건축년도", "상태", "수집일", "유형"];
  const rows = (data ?? []).flatMap((m) => {
    const l = (Array.isArray(m.listing) ? m.listing[0] : m.listing) as Record<string, unknown> | null;
    if (!l) return [];
    return [[l.bldg_nm, l.sgg_nm, l.stdg_nm, l.contract_date, l.exclusive_area, l.floor, l.price_amount, l.official_price, l.building_year, STATUS[m.status] ?? m.status, String(m.created_at ?? "").slice(0, 10), l.property_type]];
  });
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return { csv, count: rows.length };
}
