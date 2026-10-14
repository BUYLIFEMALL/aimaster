import type { AspectRatio, PurposeId, Retouch } from "./options";
import { ALL_RETOUCH, NO_RETOUCH } from "./options";

// 촬영 목적 프리셋. 모든 id는 options.ts의 실제 옵션을 가리켜야 한다(단위 테스트가 검사).

export interface Purpose {
  id: PurposeId;
  label: string;
  desc: string;
  badge: string;
  icon: string;
  aspect: AspectRatio;
  poseId: string;
  lightingId: string;
  backgroundId: string;
  colorId: string;
  outfitId: string;
  filmId: string;
  cameraId: string;
  skinIds: string[];
  /** 얼굴 좌우 대칭·정면 규격 지시를 넣는다 */
  symmetry: boolean;
  /** 계측 가이드선을 기본으로 보여 준다 */
  guide: boolean;
  /** 순백 배경 클린업을 기본으로 켠다 */
  whiteClean: boolean;
  retouch: Retouch;
}

export const PURPOSES: Purpose[] = [
  {
    id: "id-photo", label: "증명사진·이력서 사진", badge: "규격 정면", icon: "🪪",
    desc: "정면 응시, 좌우 대칭, 순백 배경, 정장. 3:4 비율의 증명사진 세트입니다.",
    aspect: "3:4", poseId: "id-front", lightingId: "flat-studio", backgroundId: "id-white", colorId: "pure-white",
    outfitId: "classic-suit", filmId: "portra", cameraId: "dslr-85", skinIds: ["pores", "glow"],
    symmetry: true, guide: true, whiteClean: true, retouch: ALL_RETOUCH,
  },
  {
    id: "business", label: "비즈니스·링크드인 프로필", badge: "신뢰감", icon: "💼",
    desc: "은은한 미소, 창가 자연광, 단정한 스마트 캐주얼.",
    aspect: "1:1", poseId: "soft-smile", lightingId: "window-soft", backgroundId: "modern-gray", colorId: "charcoal",
    outfitId: "smart-casual", filmId: "portra", cameraId: "dslr-85", skinIds: ["pores", "glow"],
    symmetry: true, guide: false, whiteClean: false, retouch: ALL_RETOUCH,
  },
  {
    id: "sns", label: "SNS·감성 프로필", badge: "감성·데일리", icon: "✨",
    desc: "따뜻한 골든아워, 부드러운 보케, 편안한 일상 룩. 9:16 세로.",
    aspect: "9:16", poseId: "contemplate", lightingId: "golden-hour", backgroundId: "warm-bokeh", colorId: "golden-ochre",
    outfitId: "turtleneck", filmId: "kodak-gold", cameraId: "dslr-50", skinIds: ["pores", "glow", "peach-fuzz"],
    symmetry: false, guide: false, whiteClean: false, retouch: NO_RETOUCH,
  },
  {
    id: "cinematic", label: "시네마틱 화보", badge: "영화 화보", icon: "🎬",
    desc: "드라마틱한 조명, 깊은 시선, 에디토리얼 무드. 16:9 가로.",
    aspect: "16:9", poseId: "stare", lightingId: "blue-hour", backgroundId: "city-night", colorId: "classic-black",
    outfitId: "leather", filmId: "bw", cameraId: "dslr-85", skinIds: ["pores", "imperfect", "asymmetry"],
    symmetry: false, guide: false, whiteClean: false, retouch: NO_RETOUCH,
  },
  {
    id: "custom", label: "자유 커스텀", badge: "전문가 모드", icon: "🎨",
    desc: "모든 조명·포즈·비율·의상·필름을 직접 조합합니다.",
    aspect: "1:1", poseId: "soft-smile", lightingId: "golden-hour", backgroundId: "solid", colorId: "charcoal",
    outfitId: "keep-original", filmId: "portra", cameraId: "dslr-50", skinIds: ["pores", "glow"],
    symmetry: false, guide: false, whiteClean: false, retouch: NO_RETOUCH,
  },
];

export function getPurpose(id: string): Purpose | undefined {
  return PURPOSES.find((p) => p.id === id);
}
