import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDedupKey,
  buildPnu,
  fetchApartAssessedPrice,
  fetchBuildingRegister,
  fetchSeoulRentComparables,
  fetchSeoulTrades,
} from "@/lib/publicdata/client";
import { sendTelegramMessage } from "@/lib/telegram/client";

// 관심 지역(자치구)에 새 실거래가 매물이 올라오면 수집해서 real_estate_listings에 저장하고,
// 그 지역을 watch 중인 사용자마다 real_estate_user_matches를 만드는 배치 잡.
// threads/vercel.json의 CRON_SECRET Bearer 인증 패턴을 그대로 재사용.
// 이 프로젝트 전체가 vercel.json의 regions: ["icn1"]로 고정되어 있어 별도 프록시 없이
// 공공 API를 직접 호출한다 (Phase 0 스파이크로 검증됨).

const MAX_NEW_LISTINGS_PER_DISTRICT = 20; // 함수 실행 시간 제한을 고려한 회당 처리 상한

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const supabase = createAdminClient();
  const year = new Date().getFullYear();

  const { data: districts, error: districtsError } = await supabase
    .from("real_estate_watch_districts")
    .select("sgg_cd, sgg_nm")
    .eq("is_active", true);

  if (districtsError) throw new Error(districtsError.message);

  const uniqueDistricts = Array.from(
    new Map((districts ?? []).map((d) => [d.sgg_cd, d])).values(),
  );

  const summary: Array<{ sgg_nm: string; newListings: number; error?: string }> = [];

  for (const district of uniqueDistricts) {
    try {
      const trades = await fetchSeoulTrades({ sggCd: district.sgg_cd, year, numOfRows: 200 });
      let newCount = 0;

      for (const row of trades) {
        if (newCount >= MAX_NEW_LISTINGS_PER_DISTRICT) break;

        const dedupKey = buildDedupKey(row);
        if (!row.CTRT_DAY || !row.BLDG_NM) continue;

        const { data: existing } = await supabase
          .from("real_estate_listings")
          .select("id")
          .eq("dedup_key", dedupKey)
          .maybeSingle();
        if (existing) continue;

        // 신규 매물 → 건축물대장/공시가격/전월세 순으로 보강 (하나 실패해도 나머지 저장은 진행)
        let exclusiveArea: number | null = null;
        let officialPrice: number | null = null;
        let prevDeposit: number | null = null;
        let prevRent: number | null = null;

        try {
          const items = await fetchBuildingRegister({
            sigunguCd: row.CGG_CD,
            bjdongCd: row.STDG_CD,
            bun: row.MNO,
            ji: row.SNO,
          });
          const area = items[0]?.area;
          if (area) exclusiveArea = Number(area);
        } catch (err) {
          console.error("건축물대장 조회 실패:", err);
        }

        try {
          const pnu = buildPnu(row);
          const priceFields = await fetchApartAssessedPrice({ pnu, stdrYear: year - 1 });
          if (priceFields[0]?.pblntfPc) officialPrice = Number(priceFields[0].pblntfPc);
        } catch (err) {
          console.error("VWorld 공시가격 조회 실패:", err);
        }

        try {
          const rents = await fetchSeoulRentComparables({
            sggCd: district.sgg_cd,
            sggNm: district.sgg_nm,
            stdgCd: row.STDG_CD,
            bldgNm: row.BLDG_NM,
            year,
          });
          const latest = rents[0];
          if (latest) {
            prevDeposit = Number(latest.RENT_GTN) || null;
            prevRent = Number(latest.RENT_FEE) || null;
          }
        } catch (err) {
          console.error("전월세 비교 조회 실패:", err);
        }

        const { data: inserted, error: insertError } = await supabase
          .from("real_estate_listings")
          .insert({
            dedup_key: dedupKey,
            sgg_cd: district.sgg_cd,
            sgg_nm: district.sgg_nm,
            stdg_nm: row.STDG_NM,
            bldg_nm: row.BLDG_NM,
            floor: row.FLR,
            contract_date: normalizeDate(row.CTRT_DAY, year),
            building_area: toNumberOrNull(row.ARCH_AREA),
            exclusive_area: exclusiveArea,
            price_amount: toNumberOrNull(row.THING_AMT),
            official_price: officialPrice,
            building_year: toNumberOrNull(row.ARCH_YR),
            prev_deposit: prevDeposit,
            prev_rent: prevRent,
            pnu: buildPnu(row),
            raw_data: row,
            data_provided_at: new Date().toISOString().slice(0, 10),
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          console.error("매물 저장 실패:", insertError?.message);
          continue;
        }

        newCount += 1;

        // 이 지역을 watch 중인 모든 사용자에게 매칭 레코드 생성
        const { data: watchers } = await supabase
          .from("real_estate_watch_districts")
          .select("user_id")
          .eq("sgg_cd", district.sgg_cd)
          .eq("is_active", true);

        const matchRows = (watchers ?? []).map((w) => ({
          user_id: w.user_id,
          listing_id: inserted.id,
          status: "new" as const,
        }));
        if (matchRows.length > 0) {
          await supabase.from("real_estate_user_matches").upsert(matchRows, {
            onConflict: "user_id,listing_id",
            ignoreDuplicates: true,
          });
        }

        // 이 지역을 watch 중인 사용자 중 텔레그램(각자 개인 봇)을 연동한 사람에게만 알림
        const watcherIds = (watchers ?? []).map((w) => w.user_id);
        if (watcherIds.length > 0) {
          const { data: telegramLinks } = await supabase
            .from("user_telegram_links")
            .select("user_id, bot_token, chat_id")
            .in("user_id", watcherIds);

          const priceEok = row.THING_AMT
            ? (Number(String(row.THING_AMT).replace(/,/g, "")) / 10000).toFixed(1)
            : "-";
          const message = `🏠 새 매물 발견\n\n${district.sgg_nm} ${row.STDG_NM} ${row.BLDG_NM}\n전용 ${exclusiveArea ?? "-"}m² / ${row.FLR ?? "-"}층\n거래금액 ${priceEok}억`;

          for (const link of telegramLinks ?? []) {
            if (!link.bot_token || !link.chat_id) continue;
            try {
              await sendTelegramMessage({
                botToken: link.bot_token,
                chatId: link.chat_id,
                text: message,
              });
              await supabase
                .from("real_estate_user_matches")
                .update({ status: "notified" })
                .eq("user_id", link.user_id)
                .eq("listing_id", inserted.id);
            } catch (err) {
              console.error(`텔레그램 알림 실패 (user ${link.user_id}):`, err);
            }
          }
        }
      }

      summary.push({ sgg_nm: district.sgg_nm, newListings: newCount });
    } catch (err) {
      console.error("district dispatch 실패:", err);
      summary.push({
        sgg_nm: district.sgg_nm,
        newListings: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

// 서울 열린데이터광장 응답은 필드가 문자열/숫자 어느 쪽으로도 올 수 있어 항상 String()으로 보정한다.
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// CTRT_DAY는 보통 "MMDD" 또는 "YYYYMMDD" 형태 — 서울 API 응답 형식에 맞춰 연도를 보정한다.
function normalizeDate(ctrtDay: unknown, year: number): string | null {
  if (!ctrtDay) return null;
  const digits = String(ctrtDay).replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (digits.length === 4) {
    return `${year}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await dispatch();
  return NextResponse.json({ ok: true, summary });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await dispatch();
  return NextResponse.json({ ok: true, summary });
}
