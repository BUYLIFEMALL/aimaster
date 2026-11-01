// 회원이 다른 프로그램에 연결해 둔 봇 중 이 프로그램에서 고를 수 있는 목록. 같은 봇은 한 번만 보여 준다.
export interface BotLink {
  program_slug: string;
  bot_username: string | null;
}

export function botChoices(links: BotLink[], thisSlug: string): { slug: string; name: string }[] {
  const own = links.find((l) => l.program_slug === thisSlug)?.bot_username;
  const seen = new Set<string>(own ? [own] : []);
  const out: { slug: string; name: string }[] = [];
  for (const l of links) {
    if (l.program_slug === thisSlug || !l.bot_username || seen.has(l.bot_username)) continue;
    seen.add(l.bot_username);
    out.push({ slug: l.program_slug, name: l.bot_username });
  }
  return out;
}
