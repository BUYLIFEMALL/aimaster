import "server-only";
import { fetchApartAssessedPrice, fetchBuildingRecapTitle, fetchBuildingTitle, fetchMolitMonth, fetchMolitServiceMonth, vworldGeocode, type PublicDataKeys } from "@/lib/publicdata/client";
import { LEGAL_DONG } from "@/lib/publicdata/legalDong";
import { legalDongCode, LOT_TYPES, pickAssessedPrice, type PropertyType } from "@/lib/publicdata/molit";
import { ensureLandInfo } from "@/lib/realestate/collect";
import { recentMonths } from "@/lib/realestate/insights";
import { dongFromPnu, jibunFromPnu, NONRES_BUILDING_MONTHS, NONRES_LAND_MONTHS, summarizeNonRes, type NonResReport } from "@/lib/realestate/nonres";
import { molitItems } from "@/lib/publicdata/molit";
import { buildingFacts, jeonseRatio, lotDeals, mainZones, REPORT_MONTHS, summarize, type BuildingFacts, type DealSummary, type LotTarget, type ReportDeal } from "@/lib/realestate/report";

// B1 주소 리포트(2026-11-03): 한 필지의 공공 자료를 모은다. 공공 무료 키 예외(§8) — 회원 본인 키가 있으면 그 키.
// 호출 수: 유형을 알면 매매·전월세 각 12달 = 24회. 유형을 모르면 세 유형 매매 6달(18회)로 유형을 찾고 그 유형 전월세 6달.

export interface ReportInput extends LotTarget {
  sggCd: string;
  type: PropertyType | null; // null = 모름(세 유형에서 찾기)
  floor?: string | null;
  /** RQ-B5: 상가·건물·토지 필지면 주거 거래 대신 상업업무용·토지 거래를 붙인다 */
  nonResidential?: boolean;
  /** RQ-B5 지도: 좌표를 알면(임장 노트) 그대로, 모르면 addressText로 찾는다 */
  point?: { x: number; y: number } | null;
  addressText?: string;
}

export interface AddressReport {
  type: PropertyType | null;
  months: number;
  trades: ReportDeal[];
  sale: DealSummary;
  jeonse: DealSummary;
  monthlyCount: number;
  jeonseRatio: number | null;
  assessedPrice: number | null | "대상 아님";
  land: { pricePerM2: number | null; year: string | null; zones: string[]; allZones: string | null } | null;
  building: BuildingFacts | null;
  /** RQ-B5(v1.52~): 비주거 필지 거래 요약. 이전 저장본에는 없음 */
  nonres?: NonResReport | null;
  /** RQ-B5 지도 좌표(경도 x, 위도 y). 이전 저장본에는 없음 */
  point?: { x: number; y: number } | null;
  errors: string[];
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function months(type: PropertyType, deal: "trade" | "rent", input: ReportInput, keys: PublicDataKeys | undefined, yms: string[], errors: string[]) {
  const jsons: unknown[] = [];
  for (const ymd of yms) {
    try {
      jsons.push(await fetchMolitMonth({ keys, type, deal, sggCd: input.sggCd, ymd }));
    } catch (e) {
      errors.push(`${type} ${deal === "trade" ? "매매" : "전월세"} ${ymd}: ${msg(e)}`);
      if (/승인이 필요/.test(msg(e))) break; // 같은 원인이면 남은 달도 실패
    }
  }
  return lotDeals(jsons, input, (umd) => legalDongCode(LEGAL_DONG, input.sggCd, umd), deal);
}

export async function buildAddressReport(input: ReportInput, keys?: PublicDataKeys, now = new Date()): Promise<AddressReport> {
  const errors: string[] = [];
  let type = input.type;
  let trades: ReportDeal[] = [];
  const count = type ? REPORT_MONTHS : 6;
  const yms = recentMonths(now, count);
  if (input.nonResidential) {
    // RQ-B5: 비주거 필지는 주거 세 유형 찾기(18회)를 건너뛴다
  } else if (type) trades = await months(type, "trade", input, keys, yms, errors);
  else {
    for (const t of LOT_TYPES) { // 단독/다가구는 지번이 가려져 필지로 맞출 수 없음(v1.46)
      const found = await months(t, "trade", input, keys, yms, errors);
      if (found.length) {
        type = t;
        trades = found;
        break;
      }
    }
  }
  const rents = type ? await months(type, "rent", input, keys, yms, errors) : [];
  const jeonseDeals = rents.filter((r) => !r.rent);
  const sale = summarize(trades);
  const jeonse = summarize(jeonseDeals);

  const lot = { sigunguCd: input.pnu.slice(0, 5), bjdongCd: input.pnu.slice(5, 10), bun: input.pnu.slice(11, 15), ji: input.pnu.slice(15, 19) };
  const [titles, recap, prices, land] = await Promise.all([
    fetchBuildingTitle({ keys, ...lot }).catch((e) => {
      errors.push(`건물 정보: ${msg(e)}`);
      return [];
    }),
    // 총괄표제부는 동이 여러 개인 단지만 있다 — 없거나 실패하면 표제부 값으로 채운다(오류 줄을 따로 남기지 않음)
    fetchBuildingRecapTitle({ keys, ...lot }).catch(() => []),
    type === "오피스텔"
      ? Promise.resolve(null)
      : fetchApartAssessedPrice({ keys, pnu: input.pnu, stdrYear: now.getFullYear() - 1, numOfRows: 1000 }).catch((e) => {
          errors.push(`공시가격: ${msg(e)}`);
          return [];
        }),
    ensureLandInfo(input.pnu, keys).catch((e) => {
      errors.push(`토지 정보: ${msg(e)}`);
      return null;
    }),
  ]);
  const [nonres, point] = await Promise.all([
    input.nonResidential ? nonResReport(input, keys, now, errors) : Promise.resolve(null),
    input.point ? Promise.resolve(input.point) : input.addressText ? vworldGeocode(input.addressText, keys).catch(() => null) : Promise.resolve(null),
  ]);
  const area = input.area ?? sale.latest?.area ?? null;
  const assessed = prices === null ? "대상 아님" : area ? pickAssessedPrice(prices, String(area), input.floor ?? sale.latest?.floor ?? "") : null;

  return {
    type,
    months: count,
    trades,
    sale,
    jeonse,
    monthlyCount: rents.length - jeonseDeals.length,
    jeonseRatio: jeonseRatio(sale.median, jeonse.median),
    assessedPrice: assessed,
    land: land ? { pricePerM2: land.pricePerM2 ?? null, year: land.priceStdrYear ?? null, zones: mainZones(land.useZones), allZones: land.useZones ?? null } : null,
    building: buildingFacts(titles as Record<string, unknown>[], now, recap as Record<string, unknown>[]),
    nonres,
    point,
    errors,
  };
}

/** RQ-B5: 상업업무용 12달·토지 6달(토지는 하루 호출 한도 1,000건이라 짧게)을 받아 요약. 한 달이 실패해도 나머지로 만든다 */
async function nonResReport(input: ReportInput, keys: PublicDataKeys | undefined, now: Date, errors: string[]): Promise<NonResReport> {
  const get = async (service: "NrgTrade" | "LandTrade", n: number) => {
    const out: Record<string, unknown>[] = [];
    for (const ymd of recentMonths(now, n)) {
      try {
        out.push(...molitItems(await fetchMolitServiceMonth({ keys, service, sggCd: input.sggCd, ymd })));
      } catch (e) {
        errors.push(`${service === "NrgTrade" ? "상업업무용" : "토지"} ${ymd}: ${msg(e)}`);
        if (/승인이 필요|한도/.test(msg(e))) break;
      }
    }
    return out;
  };
  const [bld, land] = await Promise.all([get("NrgTrade", NONRES_BUILDING_MONTHS), get("LandTrade", NONRES_LAND_MONTHS)]);
  const dong = input.dong || dongFromPnu(LEGAL_DONG[input.sggCd], input.pnu);
  return summarizeNonRes(bld, land, dong, jibunFromPnu(input.pnu));
}
