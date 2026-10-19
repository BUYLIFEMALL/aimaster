// v1.74 발행 전 자체 점검표·핵심 단어 빈도 (AI 호출 없음). 네이버 공식 점수가 아닌 참고용 점검입니다.

export type QualityStatus = "pass" | "warn" | "skip";
export type QualityCheck = { id: string; label: string; status: QualityStatus; detail: string };
export type QualityInput = { title: string; body: string; keywords: string[]; strategy?: string; imageCount: number };
export type WordCount = { word: string; count: number };

export const CLICHE_PHRASES = ["결론적으로", "알아보겠습니다", "중요한 것은 바로", "이상으로 마치겠습니다", "현대 사회에서", "다양한 방면에서", "함께 알아보", "도움이 되셨길 바랍니다"];

const compact = (value: string) => value.replace(/\s/g, "");

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, index + needle.length)) count += 1;
  return count;
}

export function splitParagraphs(body: string) {
  return body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function runQualityChecks(input: QualityInput): QualityCheck[] {
  const title = input.title.trim();
  const body = input.body;
  const bodyCompact = compact(body);
  const keyword = compact(input.keywords.find((item) => item.trim()) ?? "");
  const titleCompact = compact(title);
  const paragraphs = splitParagraphs(body);
  const checks: QualityCheck[] = [];
  const add = (id: string, label: string, status: QualityStatus, detail: string) => checks.push({ id, label, status, detail });

  add("title-length", "제목 길이 25~40자", title.length >= 25 && title.length <= 40 ? "pass" : "warn", `현재 ${title.length}자`);
  if (!keyword) {
    add("title-keyword", "제목에 핵심 키워드", "skip", "핵심 키워드를 입력하지 않았습니다.");
    add("title-keyword-front", "핵심 키워드를 제목 앞쪽에", "skip", "핵심 키워드 없음");
    add("intro-keyword", "첫 문단에 핵심 키워드", "skip", "핵심 키워드 없음");
    add("keyword-repeat", "핵심 키워드 반복 적당히", "skip", "핵심 키워드 없음");
  } else {
    const position = titleCompact.indexOf(keyword);
    add("title-keyword", "제목에 핵심 키워드", position >= 0 ? "pass" : "warn", position >= 0 ? "포함됨" : "제목에 키워드가 없습니다.");
    add("title-keyword-front", "핵심 키워드를 제목 앞쪽에", position >= 0 && position <= 12 ? "pass" : "warn", position >= 0 ? `${position + 1}번째 글자부터` : "제목에 키워드가 없습니다.");
    add("intro-keyword", "첫 문단에 핵심 키워드", compact(paragraphs[0] ?? "").includes(keyword) ? "pass" : "warn", "도입부에서 검색 의도에 바로 답하면 좋습니다.");
    const count = countOccurrences(bodyCompact, keyword);
    const max = Math.max(6, Math.ceil(bodyCompact.length / 300));
    add("keyword-repeat", "핵심 키워드 반복 적당히", count >= 2 && count <= max ? "pass" : "warn", count < 2 ? `본문에 ${count}번 — 조금 더 자연스럽게 넣어 보세요.` : count > max ? `본문에 ${count}번 — 억지 반복으로 보일 수 있습니다(권장 ${max}번 이하).` : `본문에 ${count}번`);
  }
  add("body-length", "본문 분량 2,000자 이상(공백 제외)", bodyCompact.length >= 2_000 ? "pass" : "warn", `현재 ${bodyCompact.length.toLocaleString("ko-KR")}자`);
  const longParagraphs = paragraphs.filter((paragraph) => compact(paragraph).length > 350).length;
  add("paragraph-length", "모바일에서 읽기 좋은 문단 길이", longParagraphs === 0 ? "pass" : "warn", longParagraphs === 0 ? `문단 ${paragraphs.length}개` : `350자가 넘는 긴 문단 ${longParagraphs}개 — 나누면 휴대폰에서 읽기 쉽습니다.`);
  const needsCheck = countOccurrences(body, "[확인 필요]");
  add("needs-check", "[확인 필요] 표시 정리", needsCheck === 0 ? "pass" : "warn", needsCheck === 0 ? "남은 표시 없음" : `${needsCheck}곳 — 발행 전에 직접 확인해 고쳐 주세요.`);
  const cliches = CLICHE_PHRASES.filter((phrase) => body.includes(phrase));
  add("cliche", "상투적인 표현 줄이기", cliches.length === 0 ? "pass" : "warn", cliches.length === 0 ? "발견되지 않음" : `발견: ${cliches.join(", ")}`);
  const hasFaq = /^\s*Q[.:]/m.test(body) || body.includes("자주 묻는 질문");
  if (input.strategy === "AEO" || hasFaq) add("faq", "자주 묻는 질문(FAQ)", hasFaq ? "pass" : "warn", hasFaq ? "포함됨" : "AEO 전략은 글 끝에 FAQ가 있으면 좋습니다.");
  add("images", "이미지 1장 이상", input.imageCount >= 1 ? "pass" : "warn", `현재 ${input.imageCount}장`);
  return checks;
}

export function summarizeChecks(checks: QualityCheck[]) {
  const counted = checks.filter((check) => check.status !== "skip");
  const passed = counted.filter((check) => check.status === "pass").length;
  return { passed, total: counted.length, percent: counted.length ? Math.round((passed / counted.length) * 100) : 0 };
}

// 단어 끝 조사·어미 (긴 것부터). 한 글자 조사는 명사 끝 글자와 헷갈리기 쉬운 것(이·가·도·만)을 뺐습니다.
const SUFFIXES = ["했습니다", "있습니다", "입니다", "합니다", "됩니다", "에서는", "으로는", "에게서", "이라는", "이라고", "에서", "으로", "에게", "까지", "부터", "보다", "처럼", "마다", "이나", "라는", "에는", "하고", "하는", "해서", "하면", "했던", "은", "는", "을", "를", "의", "에", "로", "와", "과"];
const STOPWORDS = new Set(["그리고", "그러나", "하지만", "그래서", "또한", "이런", "저런", "그런", "이것", "그것", "저것", "우리", "저희", "정말", "너무", "아주", "많이", "가장", "대한", "위해", "통해", "경우", "때문", "정도", "하나", "이번", "다음", "같은", "있는", "없는", "있다", "없다", "확인", "필요", "수도", "것이", "것을", "것은", "때는", "그냥", "바로", "먼저", "모든", "어떤", "다른", "자주", "묻는", "질문", "함께", "좋은", "많은", "특히", "실제로", "이렇게", "그렇게"]);

export function normalizeWord(token: string) {
  if (/(습니다|니다|어요|아요|해요|세요)$/.test(token)) return ""; // 서술어는 세지 않음
  if (token.endsWith("들이") && token.length >= 4) return token.slice(0, -1); // 아이들이 → 아이들
  for (const suffix of SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 2) return token.slice(0, -suffix.length);
  }
  return token;
}

export function topWords(body: string, limit = 15): WordCount[] {
  const counts = new Map<string, number>();
  for (const token of body.match(/[가-힣A-Za-z0-9]+/g) ?? []) {
    if (/^\d+$/.test(token)) continue;
    const word = normalizeWord(token);
    if (word.length < 2 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
