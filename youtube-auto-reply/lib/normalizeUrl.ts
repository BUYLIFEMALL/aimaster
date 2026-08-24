/** 사용자가 스킴 없이 도메인만 입력해도(예: "example.com") 동작하도록 https://를 붙여준다. */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
