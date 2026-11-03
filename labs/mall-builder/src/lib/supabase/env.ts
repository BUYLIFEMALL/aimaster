// Lab 프로그램은 AIMaster_dev만 쓴다(docs/AIMASTER_DEV_LAB_GUIDELINES.md).
const PROD_REF = "esgxyikcnnvmlhygjkth";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

if (SUPABASE_URL.includes(PROD_REF)) {
  throw new Error("Lab 프로그램에 운영 AIMaster DB 주소가 들어 있습니다. AIMaster_dev 주소로 바꿔 주세요.");
}
