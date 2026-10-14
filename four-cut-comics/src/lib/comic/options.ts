// 4컷 만화 옵션 데이터. 서버·클라이언트가 같은 id를 쓰고, 프롬프트 문장은 서버만 조립한다.

export interface StyleOption { id: string; name: string; summary: string; role: string; guide: string; avoid: string }
export interface GenreOption { id: string; role: string; rules: string; search?: boolean }
export interface BubbleOption { id: string; name: string; hint: string }

const TEXT_RULE = "Full-color digital illustration. If any in-picture text (sign, clothing print) is needed, write it in English only, never Korean or any other language. Do not draw speech bubbles or captions.";

export const STYLES: StyleOption[] = [
  {
    id: "meongrang", name: "명랑만화", summary: "2~3등신, 점 눈, 파스텔 셀 채색의 90년대 코믹 스타일",
    role: "You are an animator who perfectly reproduces the cheerful everyday comic animation style of the late 1990s to early 2000s (Korean meongrang cartoons).",
    guide: [
      "1. Character design: exaggerated simple shapes (oval, inverted triangle, peanut). Eyes are tiny black dots or short lines, never big sparkling eyes. Nose omitted or a tiny line; mouth large and exaggerated when laughing. 2-3 heads tall, short and chubby, head very large.",
      "2. Line and color: clean even black outline, flat cel shading with no gradients, bright but not harsh pastel colors.",
      "3. Background and vibe: plain or very simplified background, comic, warm, everyday mood.",
    ].join("\n"),
    avoid: "Avoid realistic rendering, 8-head proportions, complex shading, lavish backgrounds.",
  },
  {
    id: "american", name: "아메리칸 코믹스", summary: "굵은 잉크선, 벤데이 점, 원색 위주의 클래식 히어로 코믹스",
    role: "You are an expert in classic Silver Age American superhero comic books.",
    guide: [
      "1. Character design: dynamic poses and angular muscular bodies, 5-6 heads tall, exaggerated dramatic expressions.",
      "2. Line and color: bold thick black ink outlines with hatching and cross-hatching, Ben-Day dot textures, strong primary colors, no complex gradients.",
      "3. Background and vibe: speed lines for dynamism, dramatic, heroic, energetic mood.",
    ].join("\n"),
    avoid: "Avoid Japanese manga/anime style, thin lines, soft pastel colors.",
  },
  {
    id: "webtoon", name: "한국 최신 웹툰", summary: "5~6등신, 큰 눈, 그라데이션과 극적인 조명",
    role: "You are a popular Korean webtoon artist known for a sleek, trendy style.",
    guide: [
      "1. Character design: modern attractive faces with individual character, big detailed expressive eyes, slim stylish 5-6 heads tall bodies.",
      "2. Line and color: refined digital line work with varied stroke weight, mixed gradients and cel coloring for volume, dramatic lighting, bright high-saturation colors.",
      "3. Background and vibe: modern detailed backgrounds fitting the scene, trendy, dramatic, emotional mood.",
    ].join("\n"),
    avoid: "Avoid dot eyes, 2-3 heads proportions, crude drawing.",
  },
  {
    id: "ligne-claire", name: "복고풍 만화(린 클레어)", summary: "땡땡 같은 린 클레어 스타일, 일정한 선과 단색 채색",
    role: "You are a master of the classic Franco-Belgian ligne claire comic style, in the manner of Tintin.",
    guide: [
      "1. Character design: realistic yet simplified figures, 4-5 heads tall, clear non-exaggerated expressions.",
      "2. Line and color: clean outlines of even thickness, no hatching or shading lines, flat solid colors without gradients, bright clear colors.",
      "3. Background and vibe: highly detailed realistic backgrounds with detail level close to the characters, adventurous, cheerful, realistic mood.",
    ].join("\n"),
    avoid: "Avoid Japanese manga style, exaggerated American action, complex shading or gradients.",
  },
];

export const GENRES: GenreOption[] = [
  { id: "free", role: "You are a 4-panel comic writer who best expresses the given topic. Capture the core content and mood of the topic and write a 4-panel script in the most fitting style, focusing only on the topic.", rules: "" },
  { id: "satire", role: "You are a cynical, satirical 4-panel comic scriptwriter. The last panel must contain a sharp punchline that hits the core of the story.", rules: "1. Overall mood in the style of late-1990s everyday comic animation.\n2. Very important: the last panel's line must be a strong, cynical punchline.", search: true },
  { id: "daily", role: "You are a witty, humorous 4-panel comic writer. Write an everyday relatable gag comic that makes readers say that is me!", rules: "1. Keep the mood bright and light.\n2. End the last panel with a twist or peak relatability.\n3. Aim for a warm, comic cheerful style." },
  { id: "pet", role: "You are a 4-panel comic writer who warmly draws life with pets. Write a lovable, relatable pet comic that makes readers smile.", rules: "1. Center on the bond between person and animal.\n2. Add the animal's inner monologue for fun.\n3. End the last panel with warm emotion or a cute twist." },
  { id: "touching", role: "You are a 4-panel comic writer who moves readers with touching true stories. Write a story that leaves deep emotion and afterglow.", rules: "1. Make it realistic and sincere as if based on a true story.\n2. Describe the characters' emotional changes delicately.\n3. End the last panel with deep emotion or a warm lesson." },
  { id: "growth", role: "You are a 4-panel comic writer who delivers positive messages. Write a healing comic that raises readers' self-esteem and confidence.", rules: "1. Show a timid character changing through a small success.\n2. Offer a perspective shift that reads a negative situation positively.\n3. End the last panel with a courage-giving message or a small actionable tip." },
  { id: "campaign", role: "You are a 4-panel campaign comic writer who conveys social messages effectively. Write a positive and persuasive comic that changes awareness or behavior.", rules: "1. Make the message clear and easy to understand.\n2. Prefer positive alternatives and hopeful messages over negative or aggressive expressions.\n3. End the last panel by recalling the core message or call to action." },
  { id: "manual", role: "You are a 4-panel manual comic writer who explains complex information in an easy, fun way. Write a clear, friendly step-by-step guide.", rules: "1. Each panel shows one clear step (step 1, 2, 3, result).\n2. Use concise, direct expressions.\n3. Set characters as an expert who teaches and a beginner who learns." },
  { id: "scifi", role: "You are an imaginative SF/fantasy 4-panel comic writer. Write a comic with a creative alternate-history or SF idea.", rules: "1. Hint at the world setting to spark curiosity.\n2. End the last panel with a surprising twist, a new mystery, or the core of the world.\n3. Describe characters and backgrounds so SF/fantasy traits show." },
  { id: "concept", role: "You are a science/education comic writer who unravels difficult concepts with pictures. Explain the core principle of the given topic clearly in four panels using analogy or examples.", rules: "1. Panel 1 poses a question or an intriguing phenomenon.\n2. Middle panels explain the principle step by step.\n3. The last panel summarizes or gives a real-life application.\n4. Characters work best as a questioning student and an explaining teacher." },
  { id: "language", role: "You are a 4-panel comic writer for foreign-language education content. For the given situation, teach one key expression (a word or a sentence).", rules: "1. Panels 1-3 show a natural conversation using the key expression.\n2. The last panel explains the meaning or nuance, or shows another example.\n3. Make the expression to learn clearly visible.\n4. Settings like a foreigner learning Korean or a Korean with a foreign friend work well." },
];

export const GENRE_LABELS: Record<string, string> = {
  free: "사용자 주제에 따름", satire: "시사 풍자 만화", daily: "일상 공감 및 개그 만화", pet: "반려동물", touching: "감동실화",
  growth: "자기계발(자신감상승)", campaign: "캠페인", manual: "매뉴얼", scifi: "가상 역사/SF 만화", concept: "개념 설명 및 원리 소개", language: "언어 학습",
};

export const FORMATS = [
  { id: "single", name: "4컷 단편", hint: "4컷 안에서 이야기가 끝납니다." },
  { id: "serial", name: "연속 만화", hint: "1화로 시작해 다음 화가 궁금하게 끝납니다." },
] as const;

export const IMAGE_MODELS = [
  { id: "gemini-3.1-flash-lite-image", name: "Nano Banana 2 Lite", hint: "빠르고 비용이 적게 듭니다. 초안·연습용으로 추천합니다." },
  { id: "gemini-3.1-flash-image", name: "Nano Banana 2", hint: "품질이 더 높고 캐릭터 일관성이 좋습니다. 최종본용으로 추천합니다." },
] as const;
export const DEFAULT_IMAGE_MODEL: string = IMAGE_MODELS[0].id;

// 대사를 그림 위에 합성하는 방식. 말풍선(AI 자동 배치·직접 편집)은 v1.02에서 추가한다.
export const BUBBLES: BubbleOption[] = [
  { id: "simple", name: "심플 (반투명 흰색)", hint: "아래쪽 반투명 흰색 상자" },
  { id: "webtoon", name: "웹툰 (흰색 테두리)", hint: "아래쪽 흰색 둥근 상자와 테두리, 화자 이름은 주황색" },
  { id: "narration", name: "나레이션 (상단 노란색)", hint: "위쪽 노란색 상자" },
  { id: "cinematic", name: "시네마틱 (글자 테두리)", hint: "영화 자막처럼 흰 글자와 검은 테두리" },
];

export const NO_SPEAKER = "없음";
export const THOUGHT_SPEAKER = "생각";

export function styleById(id: string) { return STYLES.find((s) => s.id === id); }
export function genreById(id: string) { return GENRES.find((g) => g.id === id); }
export function isImageModel(id: unknown): id is string { return IMAGE_MODELS.some((m) => m.id === id); }
export function isBubble(id: unknown): id is string { return BUBBLES.some((b) => b.id === id); }
export function styleDirectives(s: StyleOption) { return { role: s.role, guide: s.guide, avoid: `${TEXT_RULE}\n${s.avoid}` }; }
