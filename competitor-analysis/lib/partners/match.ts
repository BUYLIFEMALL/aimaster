// 제휴 타깃 찾기 — 주제 매칭 판정(주인님 2026-11-05 「주제와 키워드에 맞지 않는 데이터는 의미가 없어, 매칭되는 사람만」).
// 검색 결과에 나왔다는 것만으로는 부족하다: 여러 번 나오는가, 이름·분류에 주제가 있는가, 보조 단어가 함께 나오는가를 점수로 본다.
// 기준 점수 미만 채널은 저장하지 않는다. 스캔 단계(확장)가 프로필·소개글의 주제 단어로 점수를 더한다.

export const DEFAULT_MIN_SCORE = 40;
/** 검색 단계에서 기준보다 이만큼 낮아도 「후보」로 담고, 스캔(화면 점수)으로 최종 판정한다. 블로그 검색은 글 한 편만 보여 줘 처음 점수가 낮기 때문. */
export const CANDIDATE_MARGIN = 20;
const BAR_TAG = /기준 (\d{1,3})점/;

/** 매칭 이유 끝에 적어 둔 「기준 N점」(옛 줄은 기본값). */
export function barOf(reasons: string): number {
  const m = BAR_TAG.exec(reasons ?? "");
  return m ? Number(m[1]) : DEFAULT_MIN_SCORE;
}

export type Verdict = "matched" | "candidate" | "weak";
/** 최종 판정: 검색 점수 + 화면 점수 ≥ 기준 → 매칭, 아직 스캔 전이면 후보, 스캔했는데 모자라면 주제 약함. */
export function verdict(r: { match_score: number; profile_match_score?: number | null; match_reasons: string; scan_status: string }): { verdict: Verdict; total: number; bar: number } {
  const bar = barOf(r.match_reasons);
  const total = Math.min(100, r.match_score + (r.profile_match_score ?? 0));
  if (total >= bar) return { verdict: "matched", total, bar };
  const scanned = r.scan_status === "done" || r.scan_status === "none";
  return { verdict: scanned ? "weak" : "candidate", total, bar };
}

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

/** 정규화한 글에서 주제가 몇 번 나오는지. */
export function countTopic(text: string, term: string): number {
  const t = normalize(term);
  if (!t) return 0;
  return normalize(text).split(t).length - 1;
}

/** 스캔 단계(확장과 같은 규칙): 채널 화면에 주제가 3번 이상 = 그 주제로 꾸준히 활동(+40), 1~2번 = +10. 보조 단어 개당 10(최대 20). */
export function scoreProfile(profileText: string, main: string, extras: string[]): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const n = countTopic(profileText, main);
  if (n >= 3) { score += 40; reasons.push(`화면에 주제 ${n}회`); }
  else if (n >= 1) { score += 10; reasons.push(`화면에 주제 ${n}회`); }
  const extraHits = extras.filter((t) => has(profileText, t));
  if (extraHits.length > 0) { score += Math.min(20, extraHits.length * 10); reasons.push(`프로필 보조 단어: ${extraHits.slice(0, 3).join("·")}`); }
  return { score, reasons };
}
