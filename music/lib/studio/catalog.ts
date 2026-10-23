import metadata from "./catalog-metadata.json";
import danceMetadata from "./dance-metadata.json";
import observedTags from "./tag-metadata.json";
import { recipe, type Brief } from "./config";

export interface LibraryPreset {
  id: string;
  name: string;
  group: string;
  eras: string[];
  market: string;
  type: string;
  genre: string;
  mood: string;
  instruments: string;
  bpm: number;
  markets: string[];
  bpmHints: number[];
  description: string;
  structure: string;
  voiceHint?: string;
}
// Independently written musical recipes. The reference site supplies factual selector metadata only.
const PALETTES: [RegExp, string, string, string, number][] = [
  [
    /trot|트로트/i,
    "trot",
    "festive, expressive",
    "accordion, brass, bass guitar, rhythmic drums",
    110,
  ],
  [
    /ballad|발라드|crooner|OST/i,
    "pop ballad",
    "tender, reflective",
    "piano, string ensemble, soft drums",
    76,
  ],
  [
    /k.pop|가요/i,
    "dance pop",
    "bright, confident",
    "synth bass, electronic drums, bright keys",
    120,
  ],
  [
    /folk|포크|통기타|country|컨트리/i,
    "folk pop",
    "warm, storytelling",
    "fingerpicked acoustic guitar, upright bass, soft percussion",
    86,
  ],
  [
    /city|시티/i,
    "city pop",
    "nostalgic, breezy",
    "electric piano, clean guitar, syncopated bass",
    104,
  ],
  [
    /lo.fi|indie|인디|홍대|bedroom/i,
    "indie pop",
    "intimate, understated",
    "acoustic guitar, mellow keys, dry drums",
    92,
  ],
  [
    /swing|ragtime|1920s|1930s/i,
    "swing jazz",
    "playful, lively",
    "stride piano, upright bass, brass ensemble",
    114,
  ],
  [
    /jazz|재즈|bebop|bossa/i,
    "jazz",
    "relaxed, elegant",
    "jazz piano, upright bass, brushed drums",
    96,
  ],
  [
    /blues/i,
    "blues",
    "earthy, soulful",
    "electric guitar, bass guitar, shuffle drums",
    82,
  ],
  [
    /drum.*bass|dnb|jungle|breakcore/i,
    "drum and bass",
    "flowing, energetic",
    "chopped breakbeats, rolling bass, atmospheric pads",
    174,
  ],
  [
    /hardstyle|hardcore|gabber|hard|speedcore/i,
    "hard dance",
    "intense, driving",
    "distorted kick drum, saw synth, gated bass",
    160,
  ],
  [
    /trance|psytrance/i,
    "trance",
    "expansive, uplifting",
    "arpeggiated synth, sustained pads, four-on-the-floor kick",
    138,
  ],
  [
    /techno/i,
    "techno",
    "hypnotic, focused",
    "electronic kick, sequenced bass, metallic percussion",
    130,
  ],
  [
    /dubstep|trap|drill|bass music|grime/i,
    "bass music",
    "bold, rhythmic",
    "sub bass, syncopated drums, sharp hi-hats",
    140,
  ],
  [
    /hip.hop|rap|힙합|랩/i,
    "hip hop",
    "confident, rhythmic",
    "sampled drums, deep bass, sparse keys",
    92,
  ],
  [
    /r&b|soul|알앤비/i,
    "r&b",
    "smooth, intimate",
    "electric piano, warm bass, pocket drums",
    84,
  ],
  [
    /disco|funk|디스코/i,
    "disco funk",
    "joyful, groovy",
    "rhythm guitar, syncopated bass, strings, disco drums",
    118,
  ],
  [
    /house/i,
    "house",
    "warm, danceable",
    "four-on-the-floor kick, chord stabs, grooving bass",
    124,
  ],
  [
    /latin|salsa|bachata|reggaeton|라틴|mexic|brazil/i,
    "latin pop",
    "festive, sunny",
    "hand percussion, nylon guitar, rhythmic bass",
    104,
  ],
  [
    /afro|afric|amapiano/i,
    "afro house",
    "buoyant, rhythmic",
    "layered hand percussion, log drum, warm synth",
    114,
  ],
  [
    /reggae|dancehall/i,
    "reggae",
    "laid-back, warm",
    "offbeat guitar, rounded bass, syncopated drums",
    92,
  ],
  [
    /metal|rock|punk|록/i,
    "rock",
    "energetic, expressive",
    "electric guitars, bass guitar, live drums",
    128,
  ],
  [
    /ambient|cinema|orchestral|게임|시네마틱/i,
    "cinematic ambient",
    "spacious, evocative",
    "piano, strings, soft atmospheric pads",
    72,
  ],
  [
    /synth|new wave|electro|edm/i,
    "synth pop",
    "dreamy, driving",
    "analog synth, electronic drums, sequenced bass",
    118,
  ],
];
function properties(subject: string) {
  const p = PALETTES.find(([pattern]) => pattern.test(subject));
  return p
    ? { genre: p[1], mood: p[2], instruments: p[3], bpm: p[4] }
    : {
        genre: "pop",
        mood: "expressive, balanced",
        instruments: "piano, bass guitar, drums",
        bpm: 100,
      };
}
export const LIBRARY: LibraryPreset[] = [
  ...metadata.map((p) => ({
    ...p,
    ...properties(p.group),
    bpm: p.bpm ?? properties(p.group).bpm,
    bpmHints: p.bpm ? [p.bpm] : [],
    description: `${p.group}의 음악적 특성을 출발점으로 구성합니다.`,
    structure: /dance|댄스|EDM/i.test(p.group) ? "댄스 드롭" : "표준",
  })),
  ...danceMetadata.map((p) => ({
    id: p.id,
    name: `${p.name} · ${p.englishName}`,
    group: p.family,
    eras: ["global"],
    market: "장르·월드",
    markets: ["장르·월드"],
    type: "dance",
    ...properties(p.englishName),
    genre: p.englishName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ")
      .toLowerCase(),
    bpm: p.bpms[0] ?? properties(p.englishName).bpm,
    bpmHints: p.bpms,
    description: p.bpmLabel,
    structure: "댄스 드롭",
  })),
];
export const ERA_LABELS: Record<string, string> = {
  modern: "현대 한국 가요",
  global: "시대 무관",
};
export interface LibraryFilter {
  market: string;
  era: string;
  group: string;
  type: string;
  query: string;
  bpm: string;
}
export function filterLibrary(f: LibraryFilter): LibraryPreset[] {
  const q = f.query.trim().toLowerCase();
  return LIBRARY.filter(
    (p) =>
      (!f.market || p.markets.includes(f.market)) &&
      (!f.era || p.eras.includes(f.era)) &&
      (!f.group || p.group === f.group) &&
      (!f.type || p.type === f.type) &&
      (!q ||
        `${p.name} ${p.group} ${p.genre} ${p.bpm} ${p.description}`
          .toLowerCase()
          .includes(q)) &&
      (!f.bpm ||
        p.bpmHints.some((n) => {
          const [lo, hi] = f.bpm.split("-").map(Number);
          return n >= lo && n < hi;
        })),
  );
}
export function applyPreset(
  b: Brief,
  p: LibraryPreset,
  variant = "기본",
): Brief {
  const base = {
    ...b,
    era: p.eras[0],
    market: p.market,
    styleGroup: p.group,
    presetId: p.id,
    presetVoice: p.voiceHint || "자연스러운 보컬",
    genre: p.genre,
    mood: p.mood,
    instruments: p.instruments,
    bpm: p.bpm,
    structure: p.structure,
    locked: true,
    generateStyle: false,
  };
  const adjusted =
    variant === "발라드"
      ? {
          ...base,
          genre: "pop ballad",
          mood: "tender, reflective",
          instruments: "piano, acoustic guitar, strings",
          bpm: Math.min(88, p.bpm),
          structure: "점층 전개",
        }
      : variant === "축제"
        ? {
            ...base,
            mood: "uplifting, celebratory",
            instruments: base.instruments + ", wide percussion",
            structure: "후렴 선행",
          }
        : base;
  return { ...adjusted, style: recipe(adjusted) };
}
export const SECTION_TAGS = [
  "Intro",
  "Verse 1",
  "Verse 2",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Outro",
  "Instrumental",
  "Post-Chorus",
  "Hook",
  "Break",
  "Drop",
  "Buildup",
  "Interlude",
  "Guitar Solo",
  "Fade Out",
  "Fade In",
  "Big Finish",
  "Refrain",
  "Key Change",
  "Rap Verse",
  "Rapped Hook",
];
const CORE_PALETTE: Record<string, string[]> = {
  장르: [
    "acoustic pop",
    "city pop",
    "trot",
    "jazz",
    "r&b",
    "hip hop",
    "folk",
    "rock",
    "synthwave",
    "house",
    "techno",
    "trance",
    "drum and bass",
    "disco",
    "reggae",
    "afrobeats",
    "ambient",
  ],
  분위기: [
    "warm",
    "hopeful",
    "melancholic",
    "energetic",
    "dreamy",
    "intimate",
    "cinematic",
    "playful",
    "hypnotic",
    "nostalgic",
    "bold",
    "euphoric",
  ],
  악기: [
    "piano",
    "acoustic guitar",
    "electric guitar",
    "strings",
    "brass",
    "saxophone",
    "accordion",
    "harmonica",
    "upright bass",
    "synth bass",
    "analog synth",
    "arpeggiator",
    "pads",
  ],
  보컬: [
    "male solo vocals",
    "female solo vocals",
    "male vocal group",
    "female vocal group",
    "male and female duet",
    "soft delivery",
    "spoken rap",
    "breathy vocals",
    "layered harmonies",
    "call and response",
  ],
  "드럼·리듬": [
    "four-on-the-floor kick",
    "breakbeats",
    "shuffle drums",
    "syncopated percussion",
    "brushed drums",
    "tight snare",
    "swung hi-hats",
    "half-time groove",
    "double-time groove",
    "drum machine",
  ],
  베이스: [
    "sub bass",
    "rolling bass",
    "reese bass",
    "log drum",
    "slap bass",
    "walking bass",
    "round bass",
    "acid bass",
  ],
  "이펙트·텍스처": [
    "tape warmth",
    "vinyl texture",
    "room ambience",
    "wide stereo",
    "reverb tail",
    "filtered delay",
    "granular texture",
    "dry mix",
  ],
  "구조·드롭": [
    "gradual buildup",
    "instrumental breakdown",
    "euphoric drop",
    "verse contrast",
    "short intro",
    "extended outro",
    "dynamic bridge",
    "final refrain",
  ],
  템포: [
    "70 BPM",
    "80 BPM",
    "90 BPM",
    "100 BPM",
    "110 BPM",
    "120 BPM",
    "128 BPM",
    "140 BPM",
    "150 BPM",
    "174 BPM",
    "200 BPM",
  ],
};
export const STYLE_PALETTE: Record<string, string[]> = Object.fromEntries(
  Object.entries(CORE_PALETTE).map(([category, values]) => [
    category,
    [
      ...new Set([
        ...values,
        ...((observedTags as Record<string, string[]>)[category] || []),
      ]),
    ],
  ]),
);
export function joinTags(value: string, tags: string[]): string {
  const seen = new Set<string>();
  return [...value.split(","), ...tags.flatMap((t) => t.split(","))]
    .map((s) => s.trim())
    .filter((s) => {
      const k = s.toLowerCase();
      if (!s || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(", ");
}
export function automaticExclude(b: Brief): string {
  return joinTags(b.exclude, [
    ...(b.instrumental
      ? ["vocals", "singing", "rap"]
      : b.rapPct === 100
        ? ["singing", "sung chorus", "melodic vocals", "humming"]
        : []),
    ...(!b.instrumental && b.highPitchRestraint
      ? ["extreme high notes", "piercing falsetto"]
      : []),
  ]);
}
export function syncStyleControls(
  previous: Brief,
  next: Brief,
  force = false,
): Brief {
  const keys: (keyof Brief)[] = [
    "voice",
    "rapPct",
    "instrumental",
    "harmony",
    "callResponse",
    "highPitchRestraint",
    "differentRapVoice",
    "rapVoice",
    "bpmHint",
    "bpm",
  ];
  if (
    !force &&
    (next.style !== previous.style ||
      !keys.some((k) => previous[k] !== next[k]))
  )
    return next;
  if (!next.style.trim()) return { ...next, style: recipe(next) };
  const onlyControls = (b: Brief) =>
    recipe({ ...b, genre: "", mood: "", instruments: "", era: "global" })
      .split(",")
      .map((s) => s.trim().toLowerCase());
  const old = new Set(onlyControls(previous));
  const retained = next.style
    .split(",")
    .map((s) => s.trim())
    .filter((s) => !old.has(s.toLowerCase()) && !/^\d{2,3}\s*bpm$/i.test(s));
  const style = joinTags(retained.join(", "), onlyControls(next));
  if (style.length > 1000)
    throw new Error(
      "설정 반영 후 Style이 1,000자를 초과합니다. 태그를 정리한 뒤 다시 변경해 주세요.",
    );
  return { ...next, style };
}
export function insertSection(
  value: string,
  start: number,
  end: number,
  tag: string,
) {
  if (!SECTION_TAGS.includes(tag))
    throw new Error("지원하지 않는 곡 구간입니다.");
  const addition = `${start > 0 && value[start - 1] !== "\n" ? "\n" : ""}[${tag}]\n`;
  const text = value.slice(0, start) + addition + value.slice(end);
  if (text.length > 5000)
    throw new Error("가사는 5,000자 이내로 작성해 주세요.");
  return { text, cursor: start + addition.length };
}
