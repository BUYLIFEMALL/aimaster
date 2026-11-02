// 임장 노트는 v1.35 주소 자동 등록 뒤 이용 권한이 있는 회원 모두에게 연다(2026-11-02 주인님 「오픈해도 되」).
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
