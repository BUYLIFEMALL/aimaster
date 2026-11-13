// v1.57 (2026-11-14 주인님 「권장안으로 진행해」, 플랜 docs/PLAN_20261114_PRESET_GENRE_LINK.md)
// 기존 프리셋(한국 가요·POP·장르·월드 461개)마다 가장 가까운 Suno 공식 장르(lib/sunoGenres.ts)를 찾는다.
// 규칙: 프리셋 이름을 먼저 보고, 장르가 없으면 그룹 이름을 본다. 글자 안에서 가장 앞에 나오는 장르를 고르고
// (같은 위치면 더 긴 이름), 「약한」 별칭(가요·OST)은 강한 별칭이 하나도 없을 때만 쓴다 — 약한 연결은 배지만 붙이고
// Style은 바꾸지 않는다. 공식 목록에 없는 장르(트로트·뉴웨이브·두왑 등)는 영어 태그를 함께 넣는다.
import { SUNO_GENRES, type SunoGenre } from "../sunoGenres";

export interface PresetGenreLink {
  genre: SunoGenre;
  /** 공식 목록에 없는 세부 장르 영어 태그(예: trot, new wave) */
  tag?: string;
  /** 공식 장르 대신 쓸 분위기·악기(예: 트로트는 엔카 악기 대신 아코디언·브라스) */
  sound?: [mood: string, instruments: string];
  /** 약한 연결 — 배지만, Style은 기존 그대로 */
  weak: boolean;
  from: "name" | "group";
}

type Extra = [alias: string, slug: string, tag?: string, weak?: boolean, sound?: [string, string]];

const TROT_SOUND: [string, string] = ["festive, expressive", "accordion, brass, bass guitar, rhythmic drums"];

// 공식 이름 말고 더 알아들을 이름. 영어는 단어 경계로, 한글은 글자 그대로 찾는다.
const EXTRAS: Extra[] = [
  // 한국어
  ["트로트", "enka", "trot", false, TROT_SOUND],
  ["발라드", "ballad", "korean ballad"],
  ["힙합", "hip-hop"],
  ["랩", "hip-hop"],
  ["인디록", "indie-rock"],
  ["인디팝", "indie-pop"],
  ["인디", "indie-pop"],
  ["얼터너티브", "alternative-rock"],
  ["사이키델릭", "classic-rock", "psychedelic rock"],
  ["록", "rock"],
  ["포크", "folk"],
  ["통기타", "folk"],
  ["디스코", "disco"],
  ["재즈", "jazz"],
  ["시티팝", "city-pop"],
  ["댄스", "pop", "dance pop"],
  ["걸그룹", "k-pop"],
  ["보이그룹", "k-pop"],
  ["아이돌", "k-pop"],
  ["어쿠스틱", "acoustic"],
  ["싱어송라이터", "acoustic", "singer-songwriter"],
  ["네오소울", "neo-soul"],
  ["소울", "soul"],
  ["레게톤", "reggaeton"],
  ["레게", "reggae"],
  ["트랩", "trap"],
  ["드릴", "drill"],
  ["붐백", "boom-bap"],
  ["바차타", "bachata"],
  ["살사", "salsa"],
  ["동요", "easy-listening", "children's song"],
  ["찬양", "gospel", "ccm"],
  ["ccm", "gospel", "ccm"],
  ["가요", "pop", "korean pop", true],
  ["ost", "cinematic", "soundtrack", true],
  // 2026-11-14 검토 보강(한국어)
  ["댄스 트로트", "enka", "dance trot", false, TROT_SOUND],
  ["어쿠스틱 발라드", "ballad", "acoustic ballad"],
  ["얼터너티브 r&b", "r-and-b", "alternative r&b"],
  ["얼터너티브 힙합", "hip-hop", "alternative hip-hop"],
  ["인디 록", "indie-rock"],
  ["인디 팝", "indie-pop"],
  ["다크 팝", "electropop", "dark pop"],
  ["컨트리 팝", "contemporary-country"],
  ["컨트리", "country"],
  ["팝", "pop"],
  ["1세대", "k-pop"],
  ["2세대", "k-pop"],
  ["3세대", "k-pop"],
  ["4세대", "k-pop"],
  ["아프로비츠", "afrobeat", "afrobeats"],
  ["시네마틱", "cinematic"],
  ["아니메", "rock", "anime rock"],
  ["마리아치", "mariachi"],
  ["보사노바", "bossa-nova"],
  ["발리우드", "indian-pop", "bollywood"],
  // 영어 — 공식 목록에 없는 세부 장르
  ["indie", "indie-pop"],
  ["pop ballad", "ballad", "pop ballad"],
  ["pop rap", "hip-hop", "pop rap"],
  ["metalcore", "metal", "metalcore"],
  ["yacht rock", "soft-rock", "yacht rock"],
  ["surf rock", "rock", "surf rock"],
  ["future bass", "kawaii-future-bass", "future bass"],
  ["electroclash", "electropop", "electroclash"],
  ["indian classical", "indian-pop", "indian classical", false, ["meditative, devotional", "sitar, tabla, tanpura"]],
  ["k-r&b", "r-and-b", "korean r&b"],
  ["hip hop", "hip-hop"],
  ["rap", "hip-hop"],
  ["j-pop", "pop", "j-pop"],
  ["j-rock", "rock", "j-rock"],
  ["anime opening", "rock", "anime rock"],
  ["anime ending ballad", "ballad", "anime ballad"],
  ["latin pop", "latin", "latin pop"],
  ["latin trap", "trap", "latin trap"],
  ["dance-pop", "pop", "dance pop"],
  ["dance pop", "pop", "dance pop"],
  ["teen pop", "pop", "teen pop"],
  ["dark pop", "electropop", "dark pop"],
  ["hyperpop", "electropop", "hyperpop"],
  ["synth-pop", "electropop", "synth-pop"],
  ["synth pop", "electropop", "synth-pop"],
  ["new wave", "electropop", "new wave"],
  ["sunshine pop", "pop", "sunshine pop"],
  ["jangle pop", "indie-pop", "jangle pop"],
  ["dream pop", "indie-pop", "dream pop"],
  ["sadcore", "indie-pop", "sadcore"],
  ["country pop", "contemporary-country"],
  ["modern country", "contemporary-country"],
  ["nashville sound", "traditional-country", "nashville sound"],
  ["honky tonk", "traditional-country", "honky tonk"],
  ["country rock", "southern-rock", "country rock"],
  ["heartland rock", "classic-rock", "heartland rock"],
  ["roots rock", "southern-rock", "roots rock"],
  ["stadium rock", "classic-rock", "stadium rock"],
  ["british invasion", "classic-rock", "british invasion"],
  ["psychedelic", "classic-rock", "psychedelic rock"],
  ["progressive rock", "classic-rock", "progressive rock"],
  ["glam rock", "hard-rock", "glam rock"],
  ["hair metal", "hard-rock", "glam metal"],
  ["blues rock", "hard-rock", "blues rock"],
  ["mod rock", "classic-rock", "mod rock"],
  ["art rock", "rock", "art rock"],
  ["garage rock", "indie-rock", "garage rock"],
  ["noise rock", "indie-rock", "noise rock"],
  ["britpop", "indie-rock", "britpop"],
  ["post-grunge", "grunge", "post-grunge"],
  ["post-punk", "punk", "post-punk"],
  ["proto-punk", "punk", "proto-punk"],
  ["gothic rock", "rock", "gothic rock"],
  ["nu-metal", "metal", "nu metal"],
  ["thrash metal", "metal", "thrash metal"],
  ["rap metal", "metal", "rap metal"],
  ["nwobhm", "heavy-metal"],
  ["rock & roll", "rock-and-roll"],
  ["early rock", "rock-and-roll"],
  ["g-funk", "hip-hop", "g-funk"],
  ["p-funk", "funk", "p-funk"],
  ["crunk", "hip-hop", "crunk"],
  ["east coast hip-hop", "boom-bap", "east coast hip-hop"],
  ["west coast hip-hop", "hip-hop", "west coast hip-hop"],
  ["alternative r&b", "r-and-b", "alternative r&b"],
  ["hip-hop soul", "r-and-b", "hip-hop soul"],
  ["doo-wop", "soul", "doo-wop"],
  ["stax", "soul", "southern soul"],
  ["rhythm & blues", "blues", "rhythm and blues"],
  ["new orleans r&b", "blues", "new orleans rhythm and blues"],
  ["jump blues", "blues", "jump blues"],
  ["vaudeville blues", "blues", "vaudeville blues"],
  ["vaudeville", "ragtime", "vaudeville"],
  ["stride piano", "ragtime", "stride piano"],
  ["dixieland", "jazz", "dixieland"],
  ["hot jazz", "jazz", "hot jazz"],
  ["new orleans jazz", "jazz", "new orleans jazz"],
  ["creole jazz", "jazz", "creole jazz"],
  ["gypsy jazz", "jazz", "gypsy jazz"],
  ["modal jazz", "jazz", "modal jazz"],
  ["jazz fusion", "jazz", "jazz fusion"],
  ["big band jazz", "big-band"],
  ["crooner", "swing", "crooner"],
  ["eurodance", "edm", "eurodance"],
  ["tropical house", "house", "tropical house"],
  ["big room", "edm", "big room"],
  ["electronic dance", "edm"],
  ["industrial", "electronic", "industrial"],
  ["chiptune", "8-bit"],
  ["afrobeats", "afrobeat", "afrobeats"],
  ["baile funk", "brazilian-funk"],
  ["corrido tumbado", "corridos", "corrido tumbado"],
  ["bollywood", "indian-pop", "bollywood"],
  ["bhangra", "indian-pop", "bhangra"],
  ["raga", "indian-pop", "raga", true],
  ["arabic pop", "tarab", "arabic pop"],
  ["irish", "irish-folk"],
  ["christmas", "easy-listening", "christmas"],
  ["lo-fi hip-hop", "lofi", "lo-fi hip-hop"],
  ["american folk", "folk", "american folk"],
  ["folk revival", "folk", "folk revival"],
  ["singer-songwriter", "acoustic", "singer-songwriter"],
];

interface Alias {
  text: string;
  korean: boolean;
  genre: SunoGenre;
  tag?: string;
  sound?: [string, string];
  weak: boolean;
}

const plain = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const bySlug = new Map(SUNO_GENRES.map((g) => [g.slug, g]));

const ALIASES: Alias[] = [
  ...SUNO_GENRES.map((g) => ({ text: plain(g.name), korean: false, genre: g, weak: false })),
  ...EXTRAS.map(([text, slug, tag, weak, sound]) => {
    const genre = bySlug.get(slug);
    if (!genre) throw new Error(`presetGenreLink: 없는 공식 장르 ${slug}`);
    return { text: plain(text), korean: /[가-힣]/.test(text), genre, tag, sound, weak: !!weak };
  }),
];

const isLetter = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);

function firstIndex(hay: string, a: Alias): number {
  let from = 0;
  for (;;) {
    const i = hay.indexOf(a.text, from);
    if (i < 0) return -1;
    if (a.korean || (!isLetter(hay[i - 1]) && !isLetter(hay[i + a.text.length]))) return i;
    from = i + 1;
  }
}

function best(text: string, weak: boolean): Alias | null {
  const hay = plain(text);
  let pick: { a: Alias; i: number } | null = null;
  for (const a of ALIASES) {
    if (a.weak !== weak) continue;
    const i = firstIndex(hay, a);
    if (i < 0) continue;
    if (!pick || i < pick.i || (i === pick.i && a.text.length > pick.a.text.length)) pick = { a, i };
  }
  return pick?.a ?? null;
}

// 사람 검토로 고정한 프리셋(이름이 장르처럼 읽히거나 자동 규칙이 틀린 것). 키 = 프리셋 이름 그대로.
const OVERRIDES: Record<string, Extra> = {
  "Daft Punk": ["", "electronic", "french house"],
  Prince: ["", "funk", "minneapolis sound"],
  "Bing Crosby": ["", "swing", "crooner"],
  "The Police": ["", "rock", "new wave"],
  "노브레인 / 크라잉넛 (펑크/조선펑크)": ["", "punk-rock", "korean punk"],
  "폴킴 / 김나영 / 멜로망스 (감성 보컬)": ["", "ballad", "korean ballad"],
  "서태지와 아이들": ["", "hip-hop", "90s korean dance"],
  "1992 서태지 풍": ["", "hip-hop", "90s korean dance"],
  "Studio Ghibli Style": ["", "orchestral", "whimsical film score"],
  "Traditional Japanese": [
    "",
    "enka",
    "traditional japanese",
    false,
    ["serene, traditional", "koto, shakuhachi, taiko"],
  ],
};

export function linkPresetGenre(name: string, group: string): PresetGenreLink | null {
  const fixed = OVERRIDES[name];
  if (fixed) {
    const genre = bySlug.get(fixed[1]);
    if (!genre) throw new Error(`presetGenreLink: 없는 공식 장르 ${fixed[1]}`);
    return { genre, tag: fixed[2], sound: fixed[4], weak: !!fixed[3], from: "name" };
  }
  const order: [string, "name" | "group", boolean][] = [
    [name, "name", false],
    [group, "group", false],
    [name, "name", true],
    [group, "group", true],
  ];
  for (const [text, from, weak] of order) {
    const a = best(text, weak);
    if (a) return { genre: a.genre, tag: a.tag, sound: a.sound, weak: a.weak, from };
  }
  return null;
}

/** Suno style에 넣는 장르 칸 — 세부 태그 + 공식 이름(악센트 제거) */
export function linkedGenreText(link: PresetGenreLink): string {
  const official = link.genre.name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();
  return link.tag && link.tag.toLowerCase() !== official.toLowerCase() ? `${link.tag}, ${official}` : official;
}
