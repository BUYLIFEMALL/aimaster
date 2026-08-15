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
