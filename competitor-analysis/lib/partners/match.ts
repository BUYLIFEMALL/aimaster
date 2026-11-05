// 제휴 타깃 찾기 — 주제 매칭 판정(주인님 2026-11-05 「주제와 키워드에 맞지 않는 데이터는 의미가 없어, 매칭되는 사람만」).
// 검색 결과에 나왔다는 것만으로는 부족하다: 여러 번 나오는가, 이름·분류에 주제가 있는가, 보조 단어가 함께 나오는가를 점수로 본다.
// 기준 점수 미만 채널은 저장하지 않는다. 스캔 단계(확장)가 프로필·소개글의 주제 단어로 점수를 더한다.

export const DEFAULT_MIN_SCORE = 40;

export interface MatchInput {
  name: string;
  category: string;
  texts: string[];
  hitCount: number;
}

export interface MatchResult { score: number; reasons: string[] }

/** 공백·특수문자를 빼고 소문자로(「공동 구매」·「공동구매!」를 같은 단어로). */
export function normalize(v: string): string {
  return v.toLowerCase().replace(/[\s·.,!?~\-_/()[\]"'#]+/g, "");
}

/** 회원 입력 「공동구매, 공구 체험단」 → 핵심 키워드 + 보조 단어 목록(최대 8개). */
export function parseTerms(keyword: string, extra: string): { main: string; extras: string[] } {
  const main = keyword.trim();
  const extras = extra
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter((t) => t && normalize(t) !== normalize(main))
    .slice(0, 8);
  return { main, extras };
}

function has(haystack: string, term: string): boolean {
  const t = normalize(term);
  return t.length > 0 && normalize(haystack).includes(t);
}

export function scoreChannel(input: MatchInput, main: string, extras: string[]): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const joined = input.texts.join(" ");

  // 1) 같은 키워드 검색에 여러 번 나옴 = 그 주제로 꾸준히 활동(최대 40점)
  if (input.hitCount >= 2) {
    const pts = Math.min(40, (input.hitCount - 1) * 15);
    score += pts;
    reasons.push(`검색 ${input.hitCount}회 등장`);
  }
  // 2) 채널 이름에 주제(30점) — 그 주제가 채널의 정체성
  if (has(input.name, main)) { score += 30; reasons.push("채널 이름에 주제"); }
  // 3) 분류에 주제(20점) — 업체·쇼핑몰 분류
  if (input.category && has(input.category, main)) { score += 20; reasons.push("분류에 주제"); }
  // 4) 글 제목·요약에 주제(20점)
  if (has(joined, main)) { score += 20; reasons.push("글에 주제"); }
  // 5) 보조 단어가 함께(개당 10점, 최대 30점)
  const extraHits = extras.filter((t) => has(`${input.name} ${input.category} ${joined}`, t));
  if (extraHits.length > 0) {
    score += Math.min(30, extraHits.length * 10);
    reasons.push(`보조 단어: ${extraHits.slice(0, 3).join("·")}`);
  }
  return { score: Math.min(100, score), reasons };
}

/** 스캔 단계(확장): 프로필·소개글에 주제·보조 단어가 있으면 더한다(가장 강한 신호). */
export function scoreProfile(profileText: string, main: string, extras: string[]): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  if (has(profileText, main)) { score += 40; reasons.push("프로필·소개에 주제"); }
  const extraHits = extras.filter((t) => has(profileText, t));
  if (extraHits.length > 0) { score += Math.min(20, extraHits.length * 10); reasons.push(`프로필 보조 단어: ${extraHits.slice(0, 3).join("·")}`); }
  return { score, reasons };
}
