// 가사 언어(2026-11-06 주인님 「가사 한국어, 영어 외에 어떤 것이 되는지 조사해보고 반영해」).
// 근거: 설치된 ACE-Step 1.5 `acestep/constants.py` VALID_LANGUAGES(50개 + unknown) — 이 목록 밖 코드는 엔진에 보내지 않는다.
// 「잘 부름」 10개는 커뮤니티 정리(deAPI ACE-Step 1.5 Prompting Guide의 상위 10개 + 우리 한국어 실측). 나머지는 지원하지만 발음·음정이 덜 자연스러울 수 있다.
// 곡 기록에는 언어 칸이 없으므로(DB 변경 없이) 엔진에 보낼 때는 가사 글자로 언어를 알아낸다(detectLyricLanguage).

export type LyricLanguage = { code: string; ko: string; en: string; best?: true };

export const LYRIC_LANGUAGES: readonly LyricLanguage[] = [
  { code: "ko", ko: "한국어", en: "Korean", best: true },
  { code: "en", ko: "영어", en: "English", best: true },
  { code: "ja", ko: "일본어", en: "Japanese", best: true },
  { code: "zh", ko: "중국어(보통화)", en: "Mandarin Chinese", best: true },
  { code: "es", ko: "스페인어", en: "Spanish", best: true },
  { code: "fr", ko: "프랑스어", en: "French", best: true },
  { code: "de", ko: "독일어", en: "German", best: true },
  { code: "pt", ko: "포르투갈어", en: "Portuguese", best: true },
  { code: "it", ko: "이탈리아어", en: "Italian", best: true },
  { code: "ru", ko: "러시아어", en: "Russian", best: true },
  { code: "yue", ko: "광둥어", en: "Cantonese" },
  { code: "vi", ko: "베트남어", en: "Vietnamese" },
  { code: "th", ko: "태국어", en: "Thai" },
  { code: "id", ko: "인도네시아어", en: "Indonesian" },
  { code: "ms", ko: "말레이어", en: "Malay" },
  { code: "tl", ko: "타갈로그어(필리핀)", en: "Tagalog" },
  { code: "hi", ko: "힌디어", en: "Hindi" },
  { code: "bn", ko: "벵골어", en: "Bengali" },
  { code: "ta", ko: "타밀어", en: "Tamil" },
  { code: "te", ko: "텔루구어", en: "Telugu" },
  { code: "pa", ko: "펀자브어", en: "Punjabi" },
  { code: "ur", ko: "우르두어", en: "Urdu" },
  { code: "ne", ko: "네팔어", en: "Nepali" },
  { code: "sa", ko: "산스크리트어", en: "Sanskrit" },
  { code: "ar", ko: "아랍어", en: "Arabic" },
  { code: "fa", ko: "페르시아어", en: "Persian" },
  { code: "he", ko: "히브리어", en: "Hebrew" },
  { code: "tr", ko: "튀르키예어", en: "Turkish" },
  { code: "az", ko: "아제르바이잔어", en: "Azerbaijani" },
  { code: "nl", ko: "네덜란드어", en: "Dutch" },
  { code: "sv", ko: "스웨덴어", en: "Swedish" },
  { code: "no", ko: "노르웨이어", en: "Norwegian" },
  { code: "da", ko: "덴마크어", en: "Danish" },
  { code: "fi", ko: "핀란드어", en: "Finnish" },
  { code: "is", ko: "아이슬란드어", en: "Icelandic" },
  { code: "pl", ko: "폴란드어", en: "Polish" },
  { code: "cs", ko: "체코어", en: "Czech" },
  { code: "sk", ko: "슬로바키아어", en: "Slovak" },
  { code: "hu", ko: "헝가리어", en: "Hungarian" },
  { code: "ro", ko: "루마니아어", en: "Romanian" },
  { code: "bg", ko: "불가리아어", en: "Bulgarian" },
  { code: "sr", ko: "세르비아어", en: "Serbian" },
  { code: "hr", ko: "크로아티아어", en: "Croatian" },
  { code: "uk", ko: "우크라이나어", en: "Ukrainian" },
  { code: "lt", ko: "리투아니아어", en: "Lithuanian" },
  { code: "el", ko: "그리스어", en: "Greek" },
  { code: "ca", ko: "카탈루냐어", en: "Catalan" },
  { code: "la", ko: "라틴어", en: "Latin" },
  { code: "sw", ko: "스와힐리어", en: "Swahili" },
  { code: "ht", ko: "아이티 크리올어", en: "Haitian Creole" },
];

export const DEFAULT_LYRIC_LANGUAGE = "ko";
const BY_CODE = new Map(LYRIC_LANGUAGES.map((l) => [l.code, l]));

/** 목록에 있는 코드만, 아니면 한국어 */
export function toLyricLanguage(v: unknown): string {
  return typeof v === "string" && BY_CODE.has(v) ? v : DEFAULT_LYRIC_LANGUAGE;
}
/** AI에게 줄 영어 언어 이름 */
export const languageEnglishName = (code: string) => BY_CODE.get(code)?.en ?? "Korean";
export const languageKoreanName = (code: string) => BY_CODE.get(code)?.ko ?? code;
export const isBestLanguage = (code: string) => !!BY_CODE.get(code)?.best;

// 라틴 문자 언어 — 자주 나오는 짧은 낱말로 점수(가사 몇 줄이면 충분). 고유 글자는 한 번만 나와도 큰 점수.
const LATIN: { code: string; words: string[]; chars?: RegExp }[] = [
  { code: "es", words: ["el", "la", "que", "y", "de", "en", "mi", "tu", "yo", "amor", "corazón", "por", "para", "con", "como", "eres"], chars: /[ñ¿¡]/ },
  { code: "fr", words: ["le", "la", "les", "et", "je", "tu", "de", "des", "un", "une", "mon", "pas", "dans", "est", "moi", "toi"], chars: /[çœ]|[àèù]\b/ },
  { code: "de", words: ["der", "die", "das", "und", "ich", "du", "nicht", "mein", "ist", "mit", "dich", "mich", "liebe", "ein", "eine"], chars: /[ß]|[äöü]/ },
  { code: "pt", words: ["o", "a", "que", "e", "de", "não", "você", "meu", "minha", "com", "um", "uma", "coração", "eu"], chars: /[ãõ]/ },
  { code: "it", words: ["il", "la", "che", "e", "di", "non", "sono", "mio", "mia", "con", "un", "una", "cuore", "io", "ti"] },
  { code: "nl", words: ["de", "het", "en", "ik", "je", "niet", "een", "mijn", "van", "jij", "wij"], chars: /ij\b/ },
  { code: "id", words: ["aku", "kamu", "dan", "yang", "di", "ini", "itu", "tidak", "cinta", "hati", "dengan"] },
  { code: "tr", words: ["ve", "bir", "ben", "sen", "bu", "çok", "aşk", "gibi"], chars: /[ğış]/ },
  { code: "pl", words: ["i", "nie", "się", "jest", "ty", "ja", "mnie", "moje"], chars: /[ąęłńśźż]/ },
  { code: "en", words: ["the", "and", "you", "i", "my", "me", "is", "to", "of", "in", "your", "love", "it", "we", "be", "don't", "i'm"] },
];

/**
 * 가사 글자로 엔진에 보낼 언어 코드를 정한다. [구간 표시]는 빼고 본다.
 * 한글이 있으면 한국어(한국어 가사에 영어 후렴이 섞인 곡 포함). 가사가 없거나 판단이 안 되면 영어(예전 동작 그대로).
 */
export function detectLyricLanguage(lyrics: string): string {
  const t = String(lyrics || "").replace(/\[[^\]]*\]/g, " ").toLowerCase();
  if (/[가-힣]/.test(t)) return "ko";
  if (/[぀-ヿ]/.test(t)) return "ja";
  if (/[一-鿿]/.test(t)) return /[嘅咗喺唔佢哋冇嚟]/.test(t) ? "yue" : "zh";
  if (/[Ѐ-ӿ]/.test(t)) return /[іїєґ]/.test(t) ? "uk" : /[ђћџ]/.test(t) ? "sr" : /[ъ]/.test(t) && /щ/.test(t) && !/ы/.test(t) ? "bg" : "ru";
  if (/[؀-ۿ]/.test(t)) return /[ٹڈڑںے]/.test(t) ? "ur" : /[پچژگ]/.test(t) ? "fa" : "ar";
  if (/[֐-׿]/.test(t)) return "he";
  if (/[Ͱ-Ͽ]/.test(t)) return "el";
  if (/[฀-๿]/.test(t)) return "th";
  if (/[ऀ-ॿ]/.test(t)) return "hi";
  if (/[ঀ-৿]/.test(t)) return "bn";
  if (/[਀-੿]/.test(t)) return "pa";
  if (/[஀-௿]/.test(t)) return "ta";
  if (/[ఀ-౿]/.test(t)) return "te";
  if (/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/.test(t)) return "vi";
  const words = t.match(/[\p{L}']+/gu) ?? [];
  if (!words.length) return "en";
  let best = "en";
  let top = 0;
  for (const l of LATIN) {
    const set = new Set(l.words);
    let score = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
    if (l.chars?.test(t)) score += 5;
    if (score > top) (top = score), (best = l.code);
  }
  return best;
}
