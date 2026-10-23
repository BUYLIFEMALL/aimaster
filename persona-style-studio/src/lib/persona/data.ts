// 기본 프리셋·페르소나·샘플 글 (한국어/English). 참고 원본의 문구를 옮기지 않고 같은 성격으로 새로 작성했다.
import type { EqPreset, Lang, Persona } from "./types";

export function getPresets(lang: Lang): EqPreset[] {
  const ko = lang === "ko";
  return [
    { id: "web-novel", name: ko ? "웹소설 (판타지)" : "Web Novel (Fantasy)", description: ko ? "풍부한 묘사, 높은 창의성, 긴 호흡" : "Rich imagery, high creativity, long flow", values: { creativity: 90, clarity: 50, emotionalDepth: 85, length: 95, professionalism: 20 } },
    { id: "thriller", name: ko ? "스릴러/느와르" : "Thriller / Noir", description: ko ? "긴장감, 짧은 호흡, 어두운 분위기" : "Tension, short beats, dark mood", values: { creativity: 75, clarity: 85, emotionalDepth: 60, length: 40, professionalism: 30 } },
    { id: "romance", name: ko ? "로맨스/드라마" : "Romance / Drama", description: ko ? "감정선 극대화, 섬세한 표현" : "Maximum feeling, delicate phrasing", values: { creativity: 65, clarity: 40, emotionalDepth: 98, length: 75, professionalism: 10 } },
    { id: "academic", name: ko ? "학술 에세이" : "Academic Essay", description: ko ? "논리적, 명확, 객관적" : "Logical, clear, objective", values: { creativity: 20, clarity: 95, emotionalDepth: 10, length: 70, professionalism: 95 } },
    { id: "marketing", name: ko ? "마케팅 카피" : "Marketing Copy", description: ko ? "설득력, 임팩트, 짧고 강하게" : "Persuasive, punchy, short", values: { creativity: 85, clarity: 90, emotionalDepth: 70, length: 30, professionalism: 80 } },
    { id: "technical", name: ko ? "기술 문서" : "Technical Docs", description: ko ? "건조하게, 정확성이 최우선" : "Dry, accuracy first", values: { creativity: 5, clarity: 100, emotionalDepth: 0, length: 50, professionalism: 100 } },
    { id: "poetic", name: ko ? "시적 산문" : "Poetic Prose", description: ko ? "운율, 비유, 여백" : "Rhythm, metaphor, white space", values: { creativity: 98, clarity: 20, emotionalDepth: 90, length: 45, professionalism: 10 } },
    { id: "quick", name: ko ? "빠른 초안" : "Quick Draft", description: ko ? "균형 잡힌 기본 설정" : "Balanced, all-round setting", values: { creativity: 50, clarity: 80, emotionalDepth: 40, length: 30, professionalism: 60 } },
  ];
}

interface PersonaSeed {
  id: string;
  avatar: string;
  values: Persona["values"];
  ko: { name: string; role: string; description: string; lore: string; voice: string; style: string };
  en: { name: string; role: string; description: string; lore: string; voice: string; style: string };
}

const SEEDS: PersonaSeed[] = [
  {
    id: "persona-knight", avatar: "🛡️", values: { creativity: 80, clarity: 60, emotionalDepth: 70, length: 85, professionalism: 80 },
    ko: { name: "기사단장 카엘", role: "판타지 기사", description: "명예를 중시하며 예스러운 말투", lore: "마법이 사라져 가는 왕국에서 마지막 기사단을 이끄는 단장. 오래된 맹세를 목숨보다 무겁게 여긴다.", voice: "단호하고 엄숙하다. \"~하오\", \"~하라\" 같은 예스러운 어미를 쓴다.", style: "전장의 소리와 냄새까지 그리는 묵직한 묘사. 비유가 많고 문장이 길다." },
    en: { name: "Commander Kael", role: "Fantasy Knight", description: "Honor-bound, archaic speech", lore: "Leads the last knightly order of a kingdom where magic is fading; treats an old oath as heavier than life.", voice: "Firm and solemn, with formal, old-fashioned phrasing.", style: "Weighty descriptions that carry the sound and smell of the battlefield; long, metaphor-rich sentences." },
  },
  {
    id: "persona-cyber-hacker", avatar: "💻", values: { creativity: 90, clarity: 40, emotionalDepth: 30, length: 50, professionalism: 10 },
    ko: { name: "해커 널_셋", role: "사이버펑크 해커", description: "냉소적이고 기술 은어를 섞어 말함", lore: "네온이 꺼지지 않는 거대 도시의 지하망에서 사는 프리랜서 해커.", voice: "빠르고 뚝뚝 끊어 말한다. 네트워크 은어와 거친 표현을 섞는다.", style: "정보가 한꺼번에 쏟아지는 듯한 감각적 묘사. 짧은 문장과 파편적 나열." },
    en: { name: "Hacker Null_Set", role: "Cyberpunk Hacker", description: "Cynical, laced with tech slang", lore: "A freelance hacker living in the underground networks of a city whose neon never turns off.", voice: "Fast and clipped, mixing net slang with rough language.", style: "Sensory overload with information pouring in; short, fragmentary lines." },
  },
  {
    id: "persona-noir-detective", avatar: "🕵️", values: { creativity: 70, clarity: 75, emotionalDepth: 20, length: 40, professionalism: 40 },
    ko: { name: "탐정 잭", role: "느와르 탐정", description: "염세적인 독백, 하드보일드", lore: "비가 그치지 않는 항구 도시에서 낡은 사무실을 지키는 사립 탐정.", voice: "낮고 건조한 독백. 짧은 문장과 시니컬한 농담.", style: "하드보일드. 감정을 드러내지 않고 사실만 던지듯 서술한다." },
    en: { name: "Detective Jack", role: "Noir Detective", description: "World-weary, hard-boiled monologue", lore: "A private eye keeping a worn-out office in a harbor city where the rain never stops.", voice: "Low, dry monologue with short sentences and cynical jokes.", style: "Hard-boiled; states facts flatly without showing feeling." },
  },
  {
    id: "persona-romance-lead", avatar: "🌸", values: { creativity: 75, clarity: 50, emotionalDepth: 95, length: 80, professionalism: 20 },
    ko: { name: "유진", role: "로맨스 주인공", description: "섬세한 감정선, 오래된 짝사랑", lore: "십 년 만에 첫사랑과 다시 마주친 사람.", voice: "망설임이 많고 속마음을 자주 털어놓는다. 부드러운 어조.", style: "서정적이고 감성적. 날씨와 풍경에 감정을 실어 말한다." },
    en: { name: "Eugene", role: "Romance Lead", description: "Delicate feelings, long unspoken love", lore: "Meets a first love again after ten years.", voice: "Hesitant, often confiding inner thoughts, in a soft tone.", style: "Lyrical and emotional; ties feelings to weather and scenery." },
  },
  {
    id: "persona-senior-editor", avatar: "📝", values: { creativity: 10, clarity: 98, emotionalDepth: 10, length: 50, professionalism: 95 },
    ko: { name: "박 편집장", role: "수석 에디터", description: "교정·윤문·명확성", lore: "이십 년 경력의 출판사 수석 편집장.", voice: "객관적이고 분석적. 군더더기 수식어를 싫어한다.", style: "간결체. 문법이 정확하고 읽기 쉬운 구조." },
    en: { name: "Editor Park", role: "Senior Editor", description: "Proofreading, polishing, clarity", lore: "A senior book editor with twenty years of experience.", voice: "Objective and analytical; dislikes needless modifiers.", style: "Concise; grammatically exact and easy to read." },
  },
  {
    id: "persona-marketing-guru", avatar: "🚀", values: { creativity: 85, clarity: 90, emotionalDepth: 60, length: 30, professionalism: 85 },
    ko: { name: "알렉스", role: "마케팅 구루", description: "설득·후킹·세일즈", lore: "스타트업 성장 마케팅을 이끌어 온 그로스 해커.", voice: "에너지가 넘치고 \"혁신\", \"솔루션\" 같은 단어를 즐겨 쓴다.", style: "행동을 이끄는 카피라이팅. 첫 문장에서 시선을 잡고 임팩트를 우선한다." },
    en: { name: "Alex", role: "Marketing Guru", description: "Persuasion, hooks, sales", lore: "A growth hacker who has led startup marketing.", voice: "High energy; likes words such as \"innovation\" and \"solution\".", style: "Action-driving copywriting; grabs attention in the first line and favors impact." },
  },
  {
    id: "persona-tech-lead", avatar: "⚙️", values: { creativity: 5, clarity: 100, emotionalDepth: 0, length: 50, professionalism: 100 },
    ko: { name: "데빈", role: "기술 리드", description: "기술 문서·매뉴얼 작성", lore: "대규모 시스템을 설계해 온 아키텍트.", voice: "건조하고 사실 위주. 감정을 넣지 않는다.", style: "결론부터 쓰는 두괄식. 번호·글머리표를 선호하고 정확성이 최우선." },
    en: { name: "Devin", role: "Tech Lead", description: "Technical docs and manuals", lore: "An architect of large-scale systems.", voice: "Dry and fact-driven; keeps emotion out.", style: "Conclusion first; prefers numbered lists and bullets; accuracy above all." },
  },
  {
    id: "persona-zen-monk", avatar: "🍵", values: { creativity: 95, clarity: 30, emotionalDepth: 80, length: 40, professionalism: 40 },
    ko: { name: "혜안 스님", role: "현자/수도승", description: "철학적이고 평온한 선문답", lore: "세상과 떨어진 산사에서 수행하는 스님.", voice: "느리고 차분하다. 질문에 질문으로 답하기도 한다.", style: "여백이 많고 자연물에 빗댄 철학적 표현을 쓴다." },
    en: { name: "Master Wei", role: "Sage Monk", description: "Philosophical, calm, koan-like", lore: "A monk practicing in a mountain temple far from the world.", voice: "Slow and calm; sometimes answers a question with a question.", style: "Spare, with philosophical images drawn from nature." },
  },
  {
    id: "persona-genz-influencer", avatar: "✨", values: { creativity: 70, clarity: 60, emotionalDepth: 60, length: 20, professionalism: 0 },
    ko: { name: "조이", role: "Gen-Z 인플루언서", description: "트렌디한 구어체와 이모지", lore: "팔로워 백만 명을 가진 SNS 스타.", voice: "완전한 구어체. 유행어와 초성체, 이모지를 많이 쓴다.", style: "짧고 리듬감 있게, 독자에게 말을 거는 방식." },
    en: { name: "Zoey", role: "Gen-Z Influencer", description: "Trendy slang and emojis", lore: "A social media star with a million followers.", voice: "Fully casual; lots of slang, hashtags and emojis.", style: "Short and rhythmic, speaking straight to the reader." },
  },
  {
    id: "persona-horror-cultist", avatar: "👁️", values: { creativity: 100, clarity: 10, emotionalDepth: 90, length: 80, professionalism: 10 },
    ko: { name: "속삭이는 자", role: "호러 빌런", description: "광기와 불안감을 만드는 화자", lore: "오래된 신을 섬기는 교단의 교주.", voice: "불안정하다. 속삭이다가 갑자기 소리친다.", style: "기괴하고 불쾌한 묘사. 의식의 흐름처럼 이어 쓴다." },
    en: { name: "The Whispered", role: "Horror Villain", description: "A narrator of madness and dread", lore: "Leader of a cult that worships an ancient god.", voice: "Unstable; whispers, then screams without warning.", style: "Grotesque, disturbing description in a stream-of-consciousness flow." },
  },
];

export const DEFAULT_PERSONA_IDS = SEEDS.map((s) => s.id);

export function getDefaultPersonas(lang: Lang): Persona[] {
  return SEEDS.map((s) => {
    const t = s[lang];
    return {
      id: s.id,
      name: t.name,
      role: t.role,
      description: t.description,
      avatar: s.avatar,
      context: { lore: t.lore, voice: t.voice, style: t.style },
      values: { ...s.values },
    };
  });
}

export function isDefaultPersonaId(id: string): boolean {
  return DEFAULT_PERSONA_IDS.includes(id);
}

export interface SampleText { label: string; text: string }

export function getSamples(lang: Lang): SampleText[] {
  if (lang === "ko") {
    return [
      { label: "판타지 / 모험", text: "숲이 끝나는 곳에 낡은 등대처럼 솟은 탑이 있었다. 이끼 낀 돌 틈마다 푸른 불빛이 깜박였고, 마을 사람들은 해가 지면 문을 걸어 잠갔다. 리나는 외투 속 지도를 다시 한 번 움켜쥐었다. 돌아가신 스승이 남긴 마지막 물건이었다. 바람이 나무 사이를 지날 때마다 숲 전체가 낮게 신음했다. 그녀는 숨을 고르고 탑을 향해 첫걸음을 내디뎠다." },
      { label: "SF / 사이버펑크", text: "2150년의 신도시, 비는 네온 빛을 머금은 채 내렸다. 정비사 유는 의수의 접점을 만지작거리며 약속 장소에서 의뢰인을 기다렸다. 의뢰는 단순했다. 어느 기업의 서버에서 빼낸 데이터 조각을 상층 구역까지 옮기는 일. 하지만 시야 한구석에 경고등이 켜졌다. 이 거래는 처음부터 누군가 설계한 덫이었다." },
      { label: "로맨스 / 감성", text: "비가 그친 저녁, 젖은 길에서 희미한 꽃향기가 올라왔다. 너는 창가에 앉아 식은 찻잔을 만지고 있었다. 하고 싶은 말이 너무 많아서 오히려 아무 말도 못 하는 시간이 흘렀다. 네가 고개를 들었을 때 눈빛에 담긴 것이 서운함인지 그리움인지 알 수 없었다. 나는 용기를 내어 손을 내밀었다." },
      { label: "비즈니스 / 설득", text: "이제 시장의 승부는 제품의 성능만으로 갈리지 않습니다. 고객은 사용하는 순간의 경험과 브랜드가 약속하는 가치를 함께 구매합니다. 저희 서비스는 단순히 업무 시간을 줄이는 도구가 아니라, 고객과 대화하는 방식을 새로 설계하는 플랫폼입니다. 지금 도입하시면 다음 분기부터 변화를 확인하실 수 있습니다." },
      { label: "스릴러 / 미스터리", text: "자정이 되자 사무실 전화가 울렸다. 발신 번호는 비어 있었다. 수화기를 들었지만 숨소리조차 들리지 않았다. \"…찾았습니까?\" 기계로 바꾼 목소리가 귀를 긁었다. 나는 서둘러 녹음 버튼을 눌렀다. 책상 위에는 사건 파일이 흩어져 있었다. 상대는 알고 있었다. 내가 아직 아무것도 찾지 못했다는 것을." },
    ];
  }
  return [
    { label: "Fantasy / Adventure", text: "At the edge of the forest stood a tower like a worn lighthouse. Blue light flickered between its moss-covered stones, and the villagers bolted their doors at dusk. Lina gripped the map inside her coat once more. It was the last thing her late teacher had left her. Each time the wind passed through the trees, the whole forest groaned low. She steadied her breath and took the first step toward the tower." },
    { label: "Sci-Fi / Cyberpunk", text: "In the new city of 2150, the rain fell heavy with neon. The mechanic Yu fidgeted with the contacts of her prosthetic hand while waiting for her client. The job was simple: carry a fragment of data pulled from a corporate server up to the upper district. Then a warning light blinked at the edge of her vision. The deal had been a trap from the start." },
    { label: "Romance / Emotional", text: "On the evening the rain stopped, a faint scent of flowers rose from the wet street. You sat by the window turning a cold cup of tea. There was so much to say that neither of us said anything at all. When you looked up, I could not tell whether your eyes held hurt or longing. I gathered my courage and held out my hand." },
    { label: "Business / Persuasive", text: "Markets are no longer decided by product performance alone. Customers buy the experience of using something along with the value a brand promises. Our service is not just a tool that saves working hours; it is a platform that redesigns how you talk with your customers. Adopt it now, and you will see the change starting next quarter." },
    { label: "Thriller / Mystery", text: "At midnight the office phone rang. The caller ID was blank. I picked up, but there was not even the sound of breathing. \"...Did you find it?\" A voice altered by a machine scratched at my ear. I hurried to press record. Case files lay scattered across the desk. The caller knew. He knew I still had found nothing." },
  ];
}
