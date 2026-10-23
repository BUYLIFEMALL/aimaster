import {
  GENDERS,
  ETHNICITIES,
  HAIR_STYLES,
  FACE_STYLES,
  LIGHTINGS,
  CAMERA_MODES,
  FILM_STOCKS,
  SKIN_TEXTURES,
  AD_TYPES,
  MASTER_NEGATIVE_PROMPT,
} from "@/data/influencer-options";
import type { InfluencerConfig } from "@/types/influencer";

/**
 * AI 인플루언서 초정밀 이미지 프롬프트 빌더 (PureGlow PRO Engine 기반)
 * 당해 연도(2026년) 기준 및 엄격한 3각 시점 제어 / 광고 결합 규칙 반영
 */
export function buildInfluencerPrompt(config: InfluencerConfig): string {
  const currentYear = new Date().getFullYear();

  // 1. 세부 디테일 매핑 (기본 미선택 시 자연스러운 K-인플루언서 기본 폴백 적용)
  const genderDetail =
    GENDERS.find((g) => g.id === config.gender)?.detail || (config.gender ? config.gender : "female");
  const ethnicityDetail =
    ETHNICITIES.find((e) => e.id === config.ethnicity)?.detail ||
    (config.ethnicity ? config.ethnicity : "East Asian (Korean)");
  const ageDetail = config.age ? `${config.age}-year-old` : "young adult in 20s";
  const faceDetail =
    FACE_STYLES.find((f) => f.id === config.faceStyle)?.detail ||
    (config.faceStyle || "natural aesthetic facial features");

  // 헤어스타일 특수 처리 (레퍼런스와 동일 옵션)
  const hairDetail =
    config.hairStyle === "ref_same"
      ? "EXACTLY MATCH THE HAIR STYLE, TEXTURE, AND COLOR OF THE PERSON IN IMAGE 1"
      : HAIR_STYLES.find((h) => h.id === config.hairStyle)?.detail ||
        (config.hairStyle || "natural stylish hair");

  const lightingDetail =
    LIGHTINGS.find((l) => l.id === config.lighting)?.detail ||
    (config.lighting || "natural soft flattering light");

  // 카메라 모드
  const allCameras = CAMERA_MODES.flatMap((c) => c.options);
  const cameraDetail =
    allCameras.find((c) => c.id === config.camera)?.detail ||
    (config.camera || "high-end smartphone selfie camera");
  const filmDetail =
    FILM_STOCKS.find((f) => f.id === config.filmStock)?.detail ||
    (config.filmStock || "crisp digital photography");

  // 피부 질감 멀티 매핑
  const skinArray = Array.isArray(config.skin) ? config.skin : [];
  const skinDetails = skinArray
    .map((sId) => SKIN_TEXTURES.find((st) => st.id === sId)?.detail || sId)
    .filter(Boolean)
    .join(", ");
  const skinString = skinDetails
    ? `${skinDetails}, hyper-realistic skin texture`
    : "natural clean skin texture";

  // 포즈 및 시점 제어
  const poseLower = (config.pose || "selfie pose").toLowerCase();
  const isSelfieCam = CAMERA_MODES[0].options.some((c) => c.id === config.camera);
  const isThirdPersonCam = CAMERA_MODES[1].options.some((c) => c.id === config.camera);

  const isMirror = poseLower.includes("mirror");
  const isHandheldSelfie =
    !isMirror &&
    (poseLower.includes("selfie") ||
      poseLower.includes("vlog") ||
      poseLower.includes("gimbal") ||
      poseLower.includes("holding the device") ||
      isSelfieCam);

  let perspectiveBlock = "";
  let finalPose = config.pose || "natural pose";

  if (isMirror) {
    perspectiveBlock = `[CAMERA PERSPECTIVE: MIRROR SELFIE]
- The subject is facing a mirror.
- Smartphone/Camera MUST BE CLEARLY VISIBLE in the mirror reflection or in hands.`;
  } else if (isHandheldSelfie && !isThirdPersonCam) {
    perspectiveBlock = `[CAMERA PERSPECTIVE: FRONT-FACING HANDHELD SELFIE]
- Handheld shot at arm's length.
- The recording device/phone itself is INVISIBLE (outside the camera frame).`;
  } else {
    perspectiveBlock = `[CAMERA PERSPECTIVE: THIRD-PERSON VIEW]
- High-end professional editorial fashion photography.
- DO NOT hold a camera or phone for selfie. Natural model posture.`;
    if (finalPose.toLowerCase().includes("selfie")) {
      finalPose = finalPose.replace(/selfie/gi, "fashion model pose");
    }
  }

  // 광고 / 공구 모드 PPL 결합
  let adBlock = "";
  if (config.isAdMode && config.productImages && config.productImages.length > 0) {
    const adTypeItem = AD_TYPES.find((a) => a.id === config.adType);
    const adAction = adTypeItem?.detail || "Showing product naturally";
    adBlock = `
[CRITICAL: PRODUCT INTEGRATION]
- The user provided REFERENCE IMAGES of a specific PRODUCT (${config.productName || "Sponsored Product"}).
- YOU MUST COMPOSITE THIS EXACT PRODUCT INTO THE SCENE.
- The subject action: ${adAction}.
- The product MUST BE CLEARLY VISIBLE, in sharp focus, held naturally by the subject or positioned prominently in the foreground.
- ENSURE THE PRODUCT LOOKS 100% IDENTICAL TO THE REFERENCE IMAGES (labels, packaging, texture, color).`;
    finalPose = `${finalPose}, naturally showcasing the featured product with clear view in hand`;
  }

  // 씬 내러티브
  const narrativeBlock = config.storyContext ? `[SCENE NARRATIVE: ${config.storyContext}]` : "";

  // 최종 결합 프롬프트
  const finalPrompt = `
[Year: ${currentYear} Modern Instagram Aesthetics]
[Technical] ${lightingDetail}, ${cameraDetail}, ${filmDetail}. Skin: ${skinString}.
[Perspective]
${perspectiveBlock}
[Subject] ${genderDetail}, ${ethnicityDetail}, ${ageDetail}, ${faceDetail}. Hair: ${hairDetail}. Expression: ${config.expression || "natural neutral expression"}. Pose: ${finalPose}.
[Setting] ${config.placeImage ? "MATCH PROVIDED BACKGROUND" : config.location || "minimalist aesthetic background"}. Outfit: ${config.outfit || "stylish casual chic outfit"}.
${narrativeBlock}
${adBlock}
[Rules] ${MASTER_NEGATIVE_PROMPT}
  `.trim();

  return finalPrompt;
}
