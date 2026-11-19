/**
 * 관련성·언어·종교 거르기 순수 함수 (네트워크 없음) — youtube-viral-studio 기준 모듈.
 *
 * 출처: boks-youtube-finder (https://github.com/boksajang/boks-youtube-finder, 커밋 3aacecf)
 *       services/youtube.js — relevanceIssue, languageMismatch, isReligious/isReligiousQuery
 *       MIT License © 2026 복사장 (Boksajang) — 전문은 youtube-viral-studio/NOTICE.md
 * 이식: 2026-11-16 영상 담당(claude-win-video), boks/core.ts에 있던 것을 2026-11-20 이 파일로 그대로 옮김(값·문구·동작 동일).
 * boks/core.ts가 같은 이름으로 다시 내보내므로 기존 호출(search.ts 등)은 바뀌지 않는다.
 * 다른 프로그램 사본·공용 등록은 아직 하지 않음(별도 배정).
 */
// --- 관련성 거르기 ---
// YouTube 검색은 제목·설명에 키워드를 해시태그로 도배한 해외 스팸 쇼츠까지 돌려준다.

const HASHTAG_RE = /#[^\s#]+/gu;
const HANGUL_RE = /[ㄱ-ㆎ가-힣]/gu;
const hangulCount = (s: string) => (String(s || "").match(HANGUL_RE) || []).length;

function stripHashtags(s: string) {
  return String(s || "").replace(HASHTAG_RE, " ");
}

function compact(s: string) {
  return String(s || "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, "");
}

// 언어별 문자 판정. 라틴 문자 언어(영어·스페인어 등)끼리는 글자로 구분할 수 없어 '라틴 문자 위주인지'만 본다.
const SCRIPT_RE: Record<string, RegExp> = {
  hangul: HANGUL_RE,
  kana: /[\p{Script=Hiragana}\p{Script=Katakana}]/gu,
  han: /\p{Script=Han}/gu,
  thai: /\p{Script=Thai}/gu,
  devanagari: /\p{Script=Devanagari}/gu,
  cyrillic: /\p{Script=Cyrillic}/gu,
  arabic: /\p{Script=Arabic}/gu,
  latin: /\p{Script=Latin}/gu,
};
const scriptCount = (s: string, key: string) => (String(s || "").match(SCRIPT_RE[key]) || []).length;
const LANG_SCRIPT: Record<string, string> = { ko: "hangul", ja: "kana", zh: "han", th: "thai", hi: "devanagari", ru: "cyrillic", ar: "arabic" };

/** 거르기에 필요한 영상 정보(YouTube videos.list snippet과 같은 이름). 없으면 빈 값으로 본다. */
export interface RelevanceInput {
  title: string;
  channelTitle: string;
  description: string;
  tags: string[];
  defaultAudioLanguage: string;
  defaultLanguage: string;
}

/**
 * 선택한 언어의 영상이 아니면 true.
 * 1) 영상의 음성·기본 언어가 선택 언어와 같으면 통과
 * 2) 제목(해시태그 제외)·채널명과 설명 앞부분에 그 언어의 글자가 거의 없으면 다른 언어
 */
export function languageMismatch(v: Partial<RelevanceInput>, lang: string, core: string, channelTitle: string, description: string): boolean {
  const base = String(lang || "").split("-")[0].toLowerCase();
  if (!base) return false;
  const declared = String(v.defaultAudioLanguage || v.defaultLanguage || "").split("-")[0].toLowerCase();
  if (declared && declared === base) return false;
  const head = core + " " + channelTitle;
  const desc = stripHashtags(description.slice(0, 400));
  const tags = (v.tags || []).join(" ");
  const script = LANG_SCRIPT[base];
  if (script) {
    // 태그에 그 언어 글자가 충분하면 같은 언어로 본다(제목·채널명이 영어인 K-pop 뮤직비디오 등)
    if (scriptCount(tags, script) >= 4) return false;
    // 중국어는 한자가 있어도 가나가 섞이면 일본어로 본다
    if (base === "zh" && scriptCount(head, "kana") >= 2) return true;
    // 일본어 제목은 한자만으로 이뤄지기도 한다. 가나가 한 글자라도 있거나, 설명이 비어 판단 근거가 없을 때 한자 제목이면 통과
    if (base === "ja") {
      if (scriptCount(head, "kana") >= 1 || scriptCount(desc, "kana") >= 10) return false;
      return !(scriptCount(head, "han") >= 2 && scriptCount(head, "hangul") === 0 && !desc.trim());
    }
    return scriptCount(head, script) < 2 && scriptCount(desc, script) < 10;
  }
  // 라틴 문자 언어: 제목·채널명과 설명 모두 라틴 문자보다 다른 문자가 많으면 다른 언어
  const nonLatin = (s: string) => ["hangul", "kana", "han", "thai", "devanagari", "cyrillic", "arabic"].reduce((n, k) => n + scriptCount(s, k), 0);
  return nonLatin(head) > scriptCount(head, "latin") && nonLatin(desc) >= scriptCount(desc, "latin");
}

/** @returns null(통과) | 'spam'(해시태그 도배) | 'language'(다른 언어) | 'offtopic'(키워드 무관) */
export function relevanceIssue(v: Partial<RelevanceInput>, query: string, relevanceLanguage = "ko", langOnly = true): null | "spam" | "language" | "offtopic" {
  // 분해형(NFD) 한글도 같은 글자로 보도록 먼저 정규화
  const title = String(v.title || "").normalize("NFC");
  const channelTitle = String(v.channelTitle || "").normalize("NFC");
  const description = String(v.description || "").normalize("NFC");
  query = String(query || "").normalize("NFC");
  const q = compact(query);
  const words = query.split(/\s+/).map(compact).filter((w) => w.length > 0);
  const base = String(relevanceLanguage || "").split("-")[0].toLowerCase();
  const titleC = compact(title);
  // 키워드 없이 찾은 경우(인기 영상 탐색)는 제목에 키워드가 있는 것으로 본다
  const titleHasQuery = !q || titleC.includes(q) || words.some((w) => w.length >= 2 && titleC.includes(w));

  // #shorts·#쇼츠 같은 형식 표시 해시태그는 도배로 세지 않는다
  const tagsInTitle = (title.match(HASHTAG_RE) || []).filter((t) => !/^#(shorts?|쇼츠|숏츠)$/i.test(t));
  const core = stripHashtags(title);
  const coreLetters = (core.match(/[\p{L}\p{N}]/gu) || []).length;
  // 1) 해시태그 도배: 제목에 해시태그 5개 이상, 또는 해시태그를 빼면 글자가 거의 없는 제목
  if (coreLetters < 3 && tagsInTitle.length >= 2) return "spam";
  const coreOk = base === "ko" ? hangulCount(core) >= 2 : coreLetters >= 6;
  if (tagsInTitle.length >= 5 && !(coreOk && titleHasQuery)) return "spam";

  // 2) 언어
  if (langOnly && languageMismatch(v, relevanceLanguage, core, channelTitle, description)) return "language";

  // 3) 키워드: 제목·태그·설명·채널명 어디에도 키워드(띄어쓰기 무시)가 없으면 무관한 영상
  if (!q) return null;
  const hay = compact(title + " " + (v.tags || []).join(" ") + " " + description + " " + channelTitle);
  if (hay.includes(q)) return null;
  if (words.length > 1) {
    const found = words.filter((w) => hay.includes(w)).length;
    if (found === words.length) return null;
    if (titleHasQuery && found >= Math.ceil(words.length / 2)) return null;
  }
  return "offtopic";
}

// --- 종교 영상 판별(기본 제외) ---
// API에 종교 구분이 없어 글자로 판별한다(100% 정확하지 않음).
//   확실한 단어: 하나만 있어도 종교 영상 / 약한 단어: 서로 다른 단어가 두 개 이상일 때만
const RELIGION_STRONG_KO = ["ccm", "찬양", "찬송", "복음성가", "워십", "예배", "설교", "성경", "교회", "성가대", "큐티", "불경", "염불", "법문", "독경", "천수경", "반야심경", "금강경", "법회", "설법"];
const RELIGION_STRONG_EN = /\b(ccm|worship|hymns?|gospel|sermons?|bible|church|christian|praise\s*(?:&|and)\s*worship)\b/i;
const RELIGION_WEAK_KO = ["하나님", "하느님", "주님", "예수", "그리스도", "할렐루야", "아멘", "은혜", "기도", "말씀", "성령", "십자가", "부처님", "불교", "스님", "목사", "찬미"];
const RELIGION_WEAK_EN = /\b(jesus|christ|god|lord|amen|hallelujah|holy\s*spirit|pray(?:er|ing)?|buddha|buddhist)\b/gi;

function religionHits(text: string) {
  const raw = String(text || "").normalize("NFC");
  const c = compact(raw);
  const strong = RELIGION_STRONG_KO.some((w) => c.includes(w)) || RELIGION_STRONG_EN.test(raw);
  const weak = new Set(RELIGION_WEAK_KO.filter((w) => c.includes(w)));
  for (const m of raw.matchAll(RELIGION_WEAK_EN)) weak.add(m[1].toLowerCase().replace(/\s+/g, ""));
  return { strong, weak: weak.size };
}

/** 검색어 자체가 종교 단어면(예: "찬양 모음") 사용자가 찾으려는 것이므로 빼지 않는다 */
export function isReligiousQuery(query: string): boolean {
  const h = religionHits(query);
  return h.strong || h.weak > 0;
}

export function isReligious(v: Partial<RelevanceInput>): boolean {
  const head = [v.title, v.channelTitle, (v.tags || []).join(" ")].join(" ");
  const h = religionHits(head);
  if (h.strong) return true;
  const all = religionHits(`${head} ${String(v.description || "").slice(0, 300)}`);
  return (all.strong && h.weak > 0) || all.weak >= 2;
}
