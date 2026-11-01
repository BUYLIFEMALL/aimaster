// 임장 노트는 주소 자동 등록이 끝날 때까지 관리자·시험 계정에만 연다(2026-11-01 주인님 결정).
const ONSITE_PREVIEW_EMAILS = ["buylifemall@gmail.com", "buylifemall@naver.com"];

export function canUseOnsite(email: string | null | undefined): boolean {
  return ONSITE_PREVIEW_EMAILS.includes(email ?? "");
}

export const ONSITE_BUCKET = "real-estate-onsite";
export const ONSITE_STATUSES = { new: "임장함", interested: "관심", contact: "연락 중", excluded: "제외" } as const;
export const ONSITE_KINDS = ["아파트", "빌라·주택", "오피스텔", "상가", "건물", "토지", "기타"] as const;

export type OnsiteStatus = keyof typeof ONSITE_STATUSES;
export type CoordSource = "capture" | "exif" | "manual";

export type OnsiteProperty = {
  id: string;
  lat: number;
  lon: number;
  accuracy_m: number | null;
  coord_source: CoordSource;
  coord_confirmed: boolean;
  sgg_cd: string | null;
  admin_dong: string | null;
  address: string | null;
  kind: string | null;
  status: OnsiteStatus;
  rating: number | null;
  floor: string | null;
  unit: string | null;
  memo: string | null;
  visited_on: string;
};

export type OnsitePhoto = { id: string; property_id: string; storage_path: string };
