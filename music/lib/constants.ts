import type { VocalGender } from "@/types/database.types";

// 곡 기획 폼(PlanningForm)과 기획 수정(PlanningHeaderCard)이 동일한 선택지를 쓰도록 공유한다.
export const LANG_OPTIONS = ["한국어", "English", "Japanese", "Chinese"];
export const VOCAL_GENDER_OPTIONS: VocalGender[] = ["여성", "남성", "혼성"];

// "생성하기" 패널에서 기획 내용(곡 설명)을 바탕으로 GPT가 이미 만든 스타일에 사용자가 장르/무드
// 태그를 얹어서 최종 프롬프트에 반영할 수 있게 한다. value는 GPT/Suno에 영어로 그대로 전달되고
// label만 한글로 보여준다(D:\PDS\메타테그.png 참고 자료의 Genre/Mood 표를 그대로 옮김).
export interface TagOption {
  value: string;
  label: string;
}

export const GENRE_OPTIONS: TagOption[] = [
  { value: "Pop", label: "Pop(팝)" },
  { value: "K-pop", label: "K-pop(케이팝)" },
  { value: "J-pop", label: "J-pop(제이팝)" },
  { value: "Hip-hop", label: "Hip-hop(힙합)" },
  { value: "Trap", label: "Trap(트랩)" },
  { value: "R&B", label: "R&B(알앤비)" },
  { value: "EDM", label: "EDM(일렉트로닉댄스)" },
  { value: "House", label: "House(하우스)" },
  { value: "Synthwave", label: "Synthwave(신스웨이브)" },
  { value: "Lo-fi", label: "Lo-fi(로우파이)" },
  { value: "Indie", label: "Indie(인디)" },
  { value: "Rock", label: "Rock(록)" },
  { value: "Jazz", label: "Jazz(재즈)" },
  { value: "Blues", label: "Blues(블루스)" },
  { value: "Funk", label: "Funk(펑크)" },
  { value: "Reggaeton", label: "Reggaeton(레게톤)" },
  { value: "Latin Pop", label: "Latin Pop(라틴팝)" },
  { value: "Cinematic", label: "Cinematic(시네마틱)" },
  { value: "Epic", label: "Epic(에픽)" },
  { value: "World music", label: "World music(월드뮤직)" },
];
export const GENRE_MAX_SELECT = 3;

export const MOOD_OPTIONS: TagOption[] = [
  { value: "romantic", label: "romantic(사랑스러운)" },
  { value: "sad", label: "sad(슬픈)" },
  { value: "happy / playful", label: "happy/playful(밝고 즐거운)" },
  { value: "dark", label: "dark(어두운)" },
  { value: "hopeful", label: "hopeful(희망적인)" },
  { value: "energetic", label: "energetic(활기찬)" },
  { value: "melancholic", label: "melancholic(우울한)" },
  { value: "dreamy", label: "dreamy(몽환적인)" },
  { value: "angry / aggressive", label: "angry/aggressive(분노/강렬)" },
  { value: "mysterious", label: "mysterious(신비로운)" },
  { value: "nostalgic", label: "nostalgic(추억/그리움)" },
  { value: "peaceful / calm", label: "peaceful/calm(평화로운)" },
  { value: "uplifting", label: "uplifting(고양되는)" },
  { value: "chill", label: "chill(여유로운)" },
  { value: "emotional", label: "emotional(감정적인)" },
  { value: "dramatic", label: "dramatic(극적인)" },
  { value: "sentimental", label: "sentimental(감상적인)" },
  { value: "powerful", label: "powerful(웅장한)" },
  { value: "groovy", label: "groovy(흥겨운)" },
  { value: "introspective", label: "introspective(사색적인)" },
];
export const MOOD_MAX_SELECT = 2;

// Suno API(docs.sunoapi.org/suno-api/generate-music)는 genre/mood/instrument/vocal tone을 위한
// 별도 구조화 필드가 없다 — style(최대 1,000자, 예시: "Classical", "Jazz", "Electronic") 자유
// 텍스트 하나에 전부 녹여 넣는 방식이다. 그래서 아래 악기/보컬톤/템포 옵션도 장르/무드와 동일하게
// GPT가 style 문장에 반드시 반영하도록 지시만 하고, Suno 쪽 별도 파라미터로 보내지 않는다.
export const INSTRUMENT_OPTIONS: TagOption[] = [
  { value: "Piano", label: "Piano(피아노)" },
  { value: "Acoustic guitar", label: "Acoustic guitar(어쿠스틱 기타)" },
  { value: "Electric guitar", label: "Electric guitar(일렉 기타)" },
  { value: "Synth bass", label: "Synth bass(신스 베이스)" },
  { value: "808 drums", label: "808 drums(808 드럼)" },
  { value: "Strings section", label: "Strings section(스트링 섹션)" },
  { value: "Brass section", label: "Brass section(브라스 섹션)" },
  { value: "Saxophone", label: "Saxophone(색소폰)" },
  { value: "Lo-fi vinyl noise", label: "Lo-fi vinyl noise(로파이 바이닐 노이즈)" },
  { value: "Percussion", label: "Percussion(타악기)" },
  { value: "Harp", label: "Harp(하프)" },
  { value: "Reverb-heavy pads", label: "Reverb-heavy pads(리버브 강한 패드)" },
  { value: "Vocoder / Talkbox", label: "Vocoder/Talkbox(보코더/톡박스)" },
  { value: "Choir background", label: "Choir background(합창 배경)" },
  { value: "Ambient textures", label: "Ambient textures(앰비언트 배경음)" },
  { value: "Distorted guitar", label: "Distorted guitar(디스토션 기타)" },
  { value: "Steel drum", label: "Steel drum(스틸 드럼)" },
  { value: "Drum machine", label: "Drum machine(드럼 머신)" },
  { value: "Sampling / loops", label: "Sampling/loops(샘플링/루프)" },
  { value: "Orchestra ensemble", label: "Orchestra ensemble(오케스트라)" },
];
export const INSTRUMENT_MAX_SELECT = 4;

// 보컬 톤은 가사가 있는 보컬버전에만 의미가 있다(장르/악기/템포와 달리 인스트루멘탈에는 숨김).
export const VOCAL_TONE_OPTIONS: TagOption[] = [
  { value: "Soft female vocals", label: "Soft female vocals(부드러운 여성 보컬)" },
  { value: "Powerful female vocals", label: "Powerful female vocals(파워풀한 여성 보컬)" },
  { value: "Deep male voice", label: "Deep male voice(낮은 남성 보컬)" },
  { value: "Raspy male vocals", label: "Raspy male vocals(거친 남성 보컬)" },
  { value: "Whispered vocals", label: "Whispered vocals(속삭이는 보컬)" },
  { value: "Emotional vocal delivery", label: "Emotional vocal delivery(감성적 표현)" },
  { value: "Airy vocal harmonies", label: "Airy vocal harmonies(공기 섞인 화음)" },
  { value: "Auto-tuned vocals", label: "Auto-tuned vocals(오토튠 보컬)" },
  { value: "Soulful male vocals", label: "Soulful male vocals(소울 넘치는 남성 보컬)" },
  { value: "Childlike vocals", label: "Childlike vocals(어린아이 같은 보컬)" },
  { value: "Smooth female vocals", label: "Smooth female vocals(매끄러운 여성 보컬)" },
  { value: "Gritty male vocals", label: "Gritty male vocals(탁하고 강한 남성 보컬)" },
  { value: "Layered vocal textures", label: "Layered vocal textures(다층 보컬)" },
  { value: "Minimalist vocal lines", label: "Minimalist vocal lines(최소한의 보컬)" },
  { value: "Spoken word style", label: "Spoken word style(말하듯이 부르는)" },
  { value: "Echoed background vocals", label: "Echoed background vocals(에코 섞인 백보컬)" },
  { value: "Fast rap vocals", label: "Fast rap vocals(빠른 랩 보컬)" },
  { value: "Breathless delivery", label: "Breathless delivery(숨 가쁜 표현)" },
  { value: "Backing chorus", label: "Backing chorus(백코러스)" },
  { value: "Melismatic R&B vocals", label: "Melismatic R&B vocals(멜리스마 보컬)" },
];
export const VOCAL_TONE_MAX_SELECT = 2;

export const TEMPO_OPTIONS: TagOption[] = [
  { value: "Slow tempo", label: "Slow tempo(느린 템포)" },
  { value: "Mid-tempo", label: "Mid-tempo(중간 템포)" },
  { value: "Fast tempo", label: "Fast tempo(빠른 템포)" },
  { value: "Upbeat", label: "Upbeat(경쾌한 리듬)" },
  { value: "Downtempo", label: "Downtempo(다운템포)" },
  { value: "Laid-back rhythm", label: "Laid-back rhythm(여유로운 리듬)" },
  { value: "Driving rhythm", label: "Driving rhythm(밀어붙이는 리듬)" },
  { value: "Swing groove", label: "Swing groove(스윙 리듬)" },
  { value: "Syncopated beat", label: "Syncopated beat(당김음 리듬)" },
  { value: "Triplet rhythm", label: "Triplet rhythm(셋잇단음 리듬)" },
  { value: "4-on-the-floor", label: "4-on-the-floor(4비트 킥)" },
  { value: "Chill tempo", label: "Chill tempo(느긋한 템포)" },
  { value: "Hard-hitting drums", label: "Hard-hitting drums(강한 드럼)" },
  { value: "Minimal beat", label: "Minimal beat(미니멀한 비트)" },
  { value: "Breakbeat feel", label: "Breakbeat feel(브레이크비트)" },
  { value: "Shuffling rhythm", label: "Shuffling rhythm(셔플 리듬)" },
  { value: "Steady ballad pace", label: "Steady ballad pace(일정한 발라드 템포)" },
  { value: "Double-time rap beat", label: "Double-time rap beat(더블 템포 랩)" },
  { value: "Looped rhythm", label: "Looped rhythm(반복 리듬)" },
  { value: "Bouncy groove", label: "Bouncy groove(통통 튀는 그루브)" },
];
export const TEMPO_MAX_SELECT = 1;
