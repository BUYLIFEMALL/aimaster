// 쿠팡 출고지·반품지 조회(C1-4·C1-5). 응답 정리 함수는 외부 호출 없이 시험한다(tests/logistics.test.mjs).
// 출고지: https://developers.coupang.com/ko/api/logistics/query-a-shipping-location
// 반품지: https://developers.coupang.com/ko/api/logistics/query-a-list-of-return-locations
//   (문서의 예시 주소는 /v5/providers…, 명세 경로는 /v2/providers… — 명세 경로를 쓰고 실제 키로 확인한다)

export const OUTBOUND_PATH = "/v2/providers/marketplace_openapi/apis/api/v2/vendor/shipping-place/outbound";
export const returnCentersPath = (vendorId: string) => `/v2/providers/openapi/apis/api/v5/vendors/${encodeURIComponent(vendorId)}/returnShippingCenters`;

type Addr = { addressType?: string; companyContactNumber?: string; returnZipCode?: string; returnAddress?: string; returnAddressDetail?: string };

export interface OutboundPlace {
  code: string;
  name: string;
  usable: boolean;
  address: string;
  /** 택배사별 제주·도서산간 추가배송비(출고지 설정, WING에서 정함) */
  remote: { courier: string; jeju: number; notJeju: number }[];
}

export interface ReturnCenter {
  code: string;
  name: string;
  usable: boolean;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  courierCode: string;
  courierName: string;
}

/** 도로명 주소를 우선, 없으면 첫 주소 */
function pickAddress(list: Addr[] | undefined): Addr {
  const arr = Array.isArray(list) ? list : [];
  return arr.find((a) => a.addressType === "ROADNAME") ?? arr[0] ?? {};
}

const str = (v: unknown) => (v == null ? "" : String(v)).trim();

export function normalizeOutbound(json: unknown): { places: OutboundPlace[]; totalPages: number } {
  const root = (json ?? {}) as { content?: unknown[]; data?: { content?: unknown[] }; pagination?: { totalPages?: number } };
  const content = (root.content ?? root.data?.content ?? []) as { outboundShippingPlaceCode?: unknown; shippingPlaceName?: unknown; usable?: unknown; placeAddresses?: Addr[]; remoteInfos?: { deliveryCode?: unknown; jeju?: unknown; notJeju?: unknown; usable?: unknown }[] }[];
  return {
    places: content
      .map((c) => {
        const a = pickAddress(c.placeAddresses);
        return { code: str(c.outboundShippingPlaceCode), name: str(c.shippingPlaceName), usable: c.usable !== false, address: [str(a.returnAddress), str(a.returnAddressDetail)].filter(Boolean).join(" "), remote: (Array.isArray(c.remoteInfos) ? c.remoteInfos : []).filter((x) => x.usable !== false).map((x) => ({ courier: str(x.deliveryCode), jeju: Number(x.jeju) || 0, notJeju: Number(x.notJeju) || 0 })) };
      })
      .filter((p) => p.code),
    totalPages: Number(root.pagination?.totalPages ?? 1) || 1,
  };
}

export function normalizeReturnCenters(json: unknown): { centers: ReturnCenter[]; totalPages: number } {
  const root = (json ?? {}) as { data?: { content?: unknown[]; pagination?: { totalPages?: number } } };
  const content = (root.data?.content ?? []) as { returnCenterCode?: unknown; shippingPlaceName?: unknown; usable?: unknown; deliverCode?: unknown; deliverName?: unknown; placeAddresses?: Addr[] }[];
  return {
    centers: content
      .map((c) => {
        const a = pickAddress(c.placeAddresses);
        return {
          code: str(c.returnCenterCode),
          name: str(c.shippingPlaceName),
          usable: c.usable !== false,
          phone: str(a.companyContactNumber),
          zipCode: str(a.returnZipCode),
          address: str(a.returnAddress),
          addressDetail: str(a.returnAddressDetail),
          courierCode: str(c.deliverCode),
          courierName: str(c.deliverName),
        };
      })
      .filter((c) => c.code),
    totalPages: Number(root.data?.pagination?.totalPages ?? 1) || 1,
  };
}
