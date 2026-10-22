// 연도 정책 (주인님 결정 2026-10-09): 글을 생성하는 시점의 올해(new Date().getFullYear())가 기준이다.
// - 제목·태그·키워드·주제 같은 짧은 문구: 과거 연도를 모두 올해로 바꾼다.
// - 본문: 최신 정보를 가리키는 과거 연도만 올해로 바꾸고, 실제로 있었던 과거 사실의 연도는 보존한다.
// 순수 함수라서 서버와 브라우저 양쪽에서 쓴다.

const MIN_YEAR = 2020; // 이보다 오래된 연도는 역사적 표기로 보고 건드리지 않는다.
const YEAR_TOKEN = /(?<!\d)(20\d\d)(?=년|\s|[-_/.,;:!?)}\]>~]|$)/g;

function isStale(year: number, targetYear: number): boolean {
  return year >= MIN_YEAR && year < targetYear;
}

/** 짧은 문구(제목·태그·키워드·주제·목차): 과거 연도를 모두 올해로. */
export function sanitizeYear(text: string | undefined | null, targetYear: number = new Date().getFullYear()): string {
  if (!text) return "";
  return text.replace(YEAR_TOKEN, (m, y) => (isStale(Number(y), targetYear) ? String(targetYear) : m));
}

const CURRENT_FRAMING = /기준|현재|최신|올해|이번|신청|지원|혜택|전망|예정|트렌드|추천|가이드/;
const PAST_AFTER = /(됐|되었|됐던|했던|했다|했습니다|했어요|하였|였다|이었|있었|없었|이후|당시|시절|출시된|발표된|시행된|개정된|공개된|설립된|창립|개최된|열린|열렸)/;
const PAST_BEFORE = /(지난|과거|당시|이전|작년|재작년|그해|처음)\s*(?:\S{0,3})$/;

/** 본문: 최신 정보 표기는 올해로, 과거 사실(범위·"지난 2022년"·"2022년에 출시됐다")은 보존. */
export function sanitizeBodyYear(text: string | undefined | null, targetYear: number = new Date().getFullYear()): string {
  if (!text) return "";
  return text.replace(YEAR_TOKEN, (m, y, offset: number, whole: string) => {
    const year = Number(y);
    if (!isStale(year, targetYear)) return m;

    const before = whole.slice(0, offset);
    const after = whole.slice(offset + m.length);
    const sentenceStart = Math.max(before.lastIndexOf("\n"), before.lastIndexOf(". "), before.lastIndexOf("! "), before.lastIndexOf("? "));
    const lead = before.slice(sentenceStart + 1);
    const nextBreak = after.search(/[\n]|[.!?]\s/);
    const tail = nextBreak < 0 ? after : after.slice(0, nextBreak);

    // 범위: 2020~2022 / 2020년부터 2022년 — 다른 연도와 짝이면 과거 구간이므로 보존
    if (/(20\d\d)\s*년?\s*(?:~|-|–|—|부터|에서)\s*$/.test(lead) || /^\s*년?\s*(?:~|-|–|—|부터|에서)\s*20\d\d/.test(after)) return m;
    // 최신 정보로 쓰인 표기(기준·현재·신청 등)는 올해로
    if (CURRENT_FRAMING.test(tail.slice(0, 20))) return String(targetYear);
    if (PAST_BEFORE.test(lead)) return m;
    if (PAST_AFTER.test(tail)) return m;
    return String(targetYear);
  });
}
