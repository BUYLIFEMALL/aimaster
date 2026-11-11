// Lab 배포는 AIMaster_dev만 쓴다(docs/AIMASTER_DEV_LAB_GUIDELINES.md). 운영 DB는 운영 스위치(T0)가 켜진 배포에서만.
const PLATFORM_AIMASTER = process.env.NEXT_PUBLIC_MALL_PLATFORM === "aimaster"; // lib/platform.ts와 같은 판단(시험 실행기가 읽도록 가져오기 없이)
const PROD_REF = "esgxyikcnnvmlhygjkth";

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(); // 환경변수 등록 때 붙은 줄바꿈 대비
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

if (SUPABASE_URL.includes(PROD_REF) && !PLATFORM_AIMASTER) {
  throw new Error("Lab 배포에 운영 AIMaster DB 주소가 들어 있습니다. AIMaster_dev 주소로 바꾸거나, 운영 배포라면 NEXT_PUBLIC_MALL_PLATFORM=aimaster 를 넣어 주세요.");
}
