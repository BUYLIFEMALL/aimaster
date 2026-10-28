// 배송·반품 기본값 정리(C1-5). 화면 입력·DB jsonb를 CoupangDefaults로 바꾼다 — 외부 호출 없음(tests/defaults.test.mjs).
import type { CoupangDefaults, DeliveryChargeType, DeliveryMethod } from "@/lib/coupang/product";

export const DELIVERY_METHODS: { value: DeliveryMethod; label: string }[] = [
  { value: "SEQUENCIAL", label: "일반배송(택배)" },
  { value: "COLD_FRESH", label: "신선냉동" },
  { value: "MAKE_ORDER", label: "주문제작" },
  { value: "AGENT_BUY", label: "구매대행" },
  { value: "VENDOR_DIRECT", label: "설치배송·직접 전달" },
];

export const CHARGE_TYPES: { value: DeliveryChargeType; label: string }[] = [
  { value: "FREE", label: "무료배송" },
  { value: "CONDITIONAL_FREE", label: "조건부 무료배송" },
  { value: "NOT_FREE", label: "유료배송" },
  { value: "CHARGE_RECEIVED", label: "착불배송" },
];

/** 자주 쓰는 택배사(쿠팡 택배사 코드 문서 2026-10-28 기준) — 그 밖은 코드 직접 입력 */
export const COMMON_COURIERS: { code: string; name: string }[] = [
  { code: "CJGLS", name: "CJ대한통운" },
  { code: "HANJIN", name: "한진택배" },
  { code: "HYUNDAI", name: "롯데택배" },
  { code: "EPOST", name: "우체국" },
  { code: "KGB", name: "로젠택배" },
  { code: "KDEXP", name: "경동택배" },
  { code: "DAESIN", name: "대신택배" },
  { code: "ILYANG", name: "일양택배" },
  { code: "DIRECT", name: "업체직송" },
];

const text = (v: unknown, max = 200) => (v == null ? "" : String(v)).trim().slice(0, max);
const won = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/[,\s원]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};
const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "Y";
const pick = <T extends string>(v: unknown, list: { value: T }[], fallback: T): T => (list.some((x) => x.value === v) ? (v as T) : fallback);

/** 화면 폼·DB 어디서 오든 같은 모양으로 정리(모르는 값은 안전한 기본값) */
export function normalizeDefaults(raw: Record<string, unknown> | null | undefined): CoupangDefaults {
  const r = raw ?? {};
  const rc = (r.returnCenter ?? {}) as Record<string, unknown>;
  return {
    outboundShippingPlaceCode: text(r.outboundShippingPlaceCode, 30),
    returnCenter: {
      code: text(r.returnCenterCode ?? rc.code, 30),
      name: text(r.returnCenterName ?? rc.name, 50),
      phone: text(r.returnPhone ?? rc.phone, 20),
      zipCode: text(r.returnZipCode ?? rc.zipCode, 10),
      address: text(r.returnAddress ?? rc.address, 150),
      addressDetail: text(r.returnAddressDetail ?? rc.addressDetail, 200),
    },
    deliveryMethod: pick(r.deliveryMethod, DELIVERY_METHODS, "SEQUENCIAL"),
    deliveryCompanyCode: text(r.deliveryCompanyCode, 30).toUpperCase(),
    deliveryChargeType: pick(r.deliveryChargeType, CHARGE_TYPES, "FREE"),
    deliveryCharge: won(r.deliveryCharge),
    freeShipOverAmount: won(r.freeShipOverAmount),
    deliveryChargeOnReturn: won(r.deliveryChargeOnReturn),
    returnCharge: won(r.returnCharge),
    remoteAreaDeliverable: bool(r.remoteAreaDeliverable),
    unionDelivery: r.unionDelivery === undefined ? true : bool(r.unionDelivery),
    outboundShippingTimeDay: Math.max(1, Math.min(30, won(r.outboundShippingTimeDay) || 2)),
    maximumBuyForPerson: won(r.maximumBuyForPerson),
    adultOnly: bool(r.adultOnly),
    taxFree: bool(r.taxFree),
  };
}

/** 저장 전 검사(빈 배열이면 저장) — 보내기 전 검사(checkDraft)와 같은 규칙 중 기본값에 해당하는 것 */
export function checkDefaults(d: CoupangDefaults): string[] {
  const p: string[] = [];
  if (!d.outboundShippingPlaceCode) p.push("출고지를 골라 주세요(「연결 시험」으로 불러온 목록에서).");
  if (!d.returnCenter.code) p.push("반품지를 골라 주세요.");
  if (!d.deliveryCompanyCode) p.push("택배사를 골라 주세요.");
  if (d.deliveryChargeType === "CONDITIONAL_FREE" && !(d.freeShipOverAmount > 0)) p.push("조건부 무료배송이면 무료배송 기준 금액을 넣어 주세요.");
  if ((d.deliveryChargeType === "NOT_FREE" || d.deliveryChargeType === "CONDITIONAL_FREE") && !(d.deliveryCharge > 0)) p.push("기본 배송비를 넣어 주세요.");
  if (d.deliveryChargeOnReturn > 0 && (d.returnCharge < d.deliveryChargeOnReturn || d.returnCharge > d.deliveryChargeOnReturn * 1.5)) {
    p.push("반품배송비는 초도 반품배송비의 100~150% 사이여야 합니다(쿠팡 규칙).");
  }
  return p;
}
