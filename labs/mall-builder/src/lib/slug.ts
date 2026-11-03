// 몰 주소(slug) 규칙 — supabase/migrations/0001_init.sql 의 검사·예약어와 같게 유지한다.
export const RESERVED_SLUGS = [
  "admin", "api", "s", "login", "logout", "signup", "www", "app", "mall", "store", "stores",
  "help", "guide", "support", "static", "assets", "public", "dashboard", "settings", "new",
] as const;

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,29}$/;

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

/** 쓸 수 있으면 null, 아니면 화면에 보여 줄 이유 */
export function slugError(input: string): string | null {
  const slug = normalizeSlug(input);
  if (!SLUG_PATTERN.test(slug) || slug.includes("--") || slug.endsWith("-")) {
    return "몰 주소는 영문 소문자·숫자·하이픈 3~30자로 입력해 주세요(하이픈으로 끝나거나 두 번 이어 쓸 수 없음).";
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return `「${slug}」는 쓸 수 없는 주소입니다.`;
  }
  return null;
}

export function storeNameError(input: string): string | null {
  const name = input.trim();
  if (name.length < 1 || name.length > 40) return "몰 이름은 1~40자로 입력해 주세요.";
  return null;
}
