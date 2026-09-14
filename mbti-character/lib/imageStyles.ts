/**
 * AI 캐릭터 이미지 생성 시 고를 수 있는 아트 스타일. 프롬프트 조립은 항상 서버
 * (app/api/generate-character-image/route.ts)에서만 이 목록 + lib/characters.ts의 고정
 * 데이터로 이뤄진다 — 클라이언트가 자유 텍스트 프롬프트를 보내게 허용하면, 방문자가 각자
 * 넣은 Gemini API 키를 우리 서버가 임의 프롬프트를 대신 전달해주는 범용 릴레이로 악용할
 * 여지가 생기기 때문에, 반드시 style id + type code 조합만 받도록 제한한다.
 */

export interface ImageStyle {
  id: string;
  label: string;
  promptModifier: string;
}

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: "cute",
    label: "🎀 귀여운 캐릭터",
    promptModifier:
      "cute chibi-style character illustration, big sparkling eyes, soft pastel color palette, adorable simplified proportions, clean flat vector illustration, kawaii aesthetic",
  },
  {
    id: "realistic",
    label: "📷 실물 캐릭터",
    promptModifier:
      "photorealistic portrait illustration of a Korean person, realistic skin texture and natural lighting, cinematic photographic detail, shallow depth of field",
  },
  {
    id: "animal",
    label: "🐾 귀여운 동물 캐릭터",
    promptModifier:
      "cute anthropomorphic animal mascot character illustration (choose an animal species that fits the personality described), big round eyes, soft rounded proportions, fluffy fur texture, adorable Pixar/mascot-style character design, simple clean shading",
  },
  {
    id: "anime",
    label: "🌸 애니메이션풍",
    promptModifier:
      "Japanese anime/manga style illustration, vibrant colors, clean line art, expressive anime-style eyes, dynamic pose",
  },
  {
    id: "watercolor",
    label: "🎨 수채화 일러스트",
    promptModifier:
      "soft watercolor painting style, gentle visible brush strokes, dreamy pastel atmosphere, artistic paper texture",
  },
];

export function getImageStyle(id: string): ImageStyle | undefined {
  return IMAGE_STYLES.find((s) => s.id === id);
}

/**
 * 랜딩 페이지에서 미리 골라둔 스타일을 결과 페이지의 CharacterImageGenerator가 그대로
 * 이어받아 쓰기 위한 localStorage 키. 로그인 여부와 무관하게 이 브라우저에서의 취향
 * 기억용이라 서버에는 저장하지 않는다.
 */
export const STYLE_PREFERENCE_STORAGE_KEY = "mbti-character:preferred-style";

