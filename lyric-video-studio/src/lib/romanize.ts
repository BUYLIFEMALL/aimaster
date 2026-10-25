// 한글 가사 → 로마자 발음 표기(노래방용). 국립국어원 「국어의 로마자 표기법」을 기준으로 이 프로그램에서 새로 작성했다.
// 기본 규칙만: 연음(받침이 다음 ㅇ으로 넘어감), 받침 대표음, 비음화(ㄱㄷㅂ+ㄴㅁ), ㄹ 겹침(ll), ㅎ 거센소리. 낱말(띄어쓰기) 사이는 잇지 않는다.

const INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
// 받침 번호(0=없음) → [앞에 남는 대표음, 다음 ㅇ으로 넘어갈 초성 번호(-1=넘어가지 않음)]
const FINAL: [string, number][] = [
  ["", -1], ["k", 0], ["k", 1], ["k", 9], ["n", 2], ["n", 12], ["n", 18], ["t", 3], ["l", 5], ["k", 0], ["m", 6], ["l", 7], ["l", 9], ["l", 16], ["p", 17], ["l", 18],
  ["m", 6], ["p", 7], ["p", 9], ["t", 9], ["t", 10], ["ng", -1], ["t", 12], ["t", 14], ["k", 15], ["t", 16], ["p", 17], ["t", 18],
];
// 겹받침이 넘어갈 때 앞에 남는 소리
const KEEP: Record<number, string> = { 3: "k", 5: "n", 6: "n", 9: "l", 10: "l", 11: "l", 12: "l", 13: "l", 14: "l", 15: "l", 18: "p" };

interface Syl { i: number; v: number; f: number }
const decompose = (ch: string): Syl | null => {
  const c = ch.charCodeAt(0) - 0xac00;
  if (c < 0 || c > 11171) return null;
  return { i: Math.floor(c / 588), v: Math.floor((c % 588) / 28), f: c % 28 };
};

const NASAL_NEXT = new Set([2, 6]); // 다음 초성 ㄴ·ㅁ
const ASPIRATE: Record<number, string> = { 0: "k", 3: "t", 12: "ch" }; // ㅎ 받침 + ㄱ·ㄷ·ㅈ

function word(syls: Syl[]): string {
  let out = "";
  const ini = syls.map((s) => INITIAL[s.i]);
  for (let k = 0; k < syls.length; k++) {
    const s = syls[k], next = syls[k + 1];
    out += ini[k] + VOWEL[s.v];
    if (!s.f) continue;
    const [sound, carry] = FINAL[s.f];
    if (!next) { out += sound; continue; }
    if (next.i === 11) { // 다음 소리가 ㅇ — 받침을 넘긴다(ㅎ 받침은 소리 나지 않음)
      if (s.f === 27) continue; // 좋아 → joa
      if (s.f === 6 || s.f === 15) { ini[k + 1] = s.f === 6 ? "n" : "r"; continue; } // 않아 → ana, 싫어 → sireo
      if (carry >= 0) { out += KEEP[s.f] ?? ""; ini[k + 1] = INITIAL[carry]; continue; }
      out += sound; continue;
    }
    if (s.f === 27 && ASPIRATE[next.i]) { ini[k + 1] = ASPIRATE[next.i]; continue; } // 좋다 → jota
    if (sound === "l" && (next.i === 5 || next.i === 2)) { out += "l"; ini[k + 1] = "l"; continue; } // 실로·설날 → ll
    if (sound === "n" && next.i === 5) { out += "l"; ini[k + 1] = "l"; continue; } // 신라 → silla
    if (NASAL_NEXT.has(next.i)) { // 국물 → gungmul, 받는 → banneun, 밥물 → bammul
      out += sound === "k" ? "ng" : sound === "t" ? "n" : sound === "p" ? "m" : sound;
      continue;
    }
    if (next.i === 5 && (sound === "m" || sound === "ng")) { out += sound; ini[k + 1] = "n"; continue; } // 종로 → jongno
    out += sound;
  }
  return out;
}

/** 한 줄 가사를 로마자로 바꾼다. 한글이 없으면 빈 문자열(영어 가사 줄은 표시하지 않음) */
export function romanize(text: string): string {
  if (!/[가-힣]/.test(text)) return "";
  let out = "", run: Syl[] = [];
  const flush = () => { if (run.length) { out += word(run); run = []; } };
  for (const ch of Array.from(text)) {
    const s = decompose(ch);
    if (s) { run.push(s); continue; }
    flush();
    out += /[ㄱ-ㅎㅏ-ㅣ]/.test(ch) ? "" : ch;
  }
  flush();
  return out.replace(/\s+/g, " ").trim();
}
