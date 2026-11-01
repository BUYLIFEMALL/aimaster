// 회원이 다른 프로그램에 연결해 둔 봇 중 이 프로그램에서 고를 수 있는 목록. 같은 봇은 한 번만 보여 준다.
export interface BotLink {
  program_slug: string;
  bot_username: string | null;
}

// 그 프로그램에서만 쓰는 봇. 다른 프로그램이 고르거나 빌려 쓰지 않는다(2026-11-01 주인님 지시: 쿠팡 봇은 쿠팡 자동화 전용).
const DEDICATED_BOT_PROGRAMS = new Set(["coupang-ops"]);
export const canBorrowBot = (slug: string) => !DEDICATED_BOT_PROGRAMS.has(slug);

export function botChoices(links: BotLink[], thisSlug: string): { slug: string; name: string }[] {
  const own = links.find((l) => l.program_slug === thisSlug)?.bot_username;
  const seen = new Set<string>(own ? [own] : []);
  const out: { slug: string; name: string }[] = [];
  for (const l of links) {
    if (l.program_slug === thisSlug || !canBorrowBot(l.program_slug) || !l.bot_username || seen.has(l.bot_username)) continue;
    seen.add(l.bot_username);
    out.push({ slug: l.program_slug, name: l.bot_username });
  }
  return out;
}
