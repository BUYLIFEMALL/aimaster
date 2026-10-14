import { BACKGROUND, CAMERA, COLOR, FILM, LIGHTING, OUTFIT, POSE, RETOUCH, SKIN, byId } from "./options";
import type { Retouch } from "./options";

// 이미지 모델에 보내는 프롬프트 조립(순수 함수). 클라이언트가 보낸 옵션 id만 받아 서버가 문장을 만든다
// — 사용자가 임의 문장을 프롬프트에 끼워 넣을 수 없다.

export interface PromptInput {
  lightingId: string;
  cameraId: string;
  skinIds: string[];
  poseId: string;
  outfitId: string;
  filmId: string;
  colorId: string;
  backgroundId: string;
  retouch: Retouch;
  /** 셀카를 좌우 반전해 보낸 경우 방향을 유지하도록 지시 */
  truePerspective: boolean;
  /** 정면·대칭·순백 배경 등 증명사진 규격 지시 */
  symmetry: boolean;
}

const MASTER_RULES = `PHOTOREALISTIC PORTRAIT RULES:
- IDENTITY FIRST: the person must remain clearly recognizable as the same individual as in the reference photo. Do not change the shape of the eyes, nose, mouth, jawline or the overall face structure, age or skin tone.
- Change only what is requested below (clothing, background, lighting, pose, retouching). Do not add or remove tattoos, scars, glasses or jewelry unless the clothing description requires it.
- Absolutely no text, signs, logos, watermarks or typography anywhere in the image.
- No heavy HDR and no artificial over-sharpening. Use smooth highlight roll-off and subtle film grain.
- Natural, lifelike skin: fine pores and natural imperfections, never plastic or airbrushed.
- Lighting must feel organic and physically accurate.`;

const TRUE_PERSPECTIVE = `FACIAL ORIENTATION:
- The reference photo has already been horizontally inverted to show the person as others see them. Keep this exact left-to-right orientation. Do not mirror or flip the face.
- Hair parting, moles, freckles and asymmetries must stay on the same sides as in the reference image.`;

const KEEP_ORIENTATION = `FACIAL ORIENTATION:
- Keep exactly the same left-to-right orientation as the reference image without flipping or mirroring.`;

const SYMMETRY = `ID-STYLE FRAMING:
- Frontal head-on composition with the eyes looking straight into the lens on a level eye line.
- Balanced natural facial symmetry, both ears visible and level, shoulders balanced and horizontal.
- TIGHT ID FRAMING: the distance from the top of the head to the bottom of the chin must be about 80% of the full image height (a very tight, close-up ID framing). The head almost fills the frame, with only a thin margin above the head, and only the neck and the very top of the shoulders visible at the bottom edge.
- Neutral composed expression with the mouth closed.
- Even, shadowless lighting with a clean separation from the backdrop and no shadow behind the shoulders or neck.`;

/** 옵션 id가 하나라도 없으면 null (호출 쪽에서 400 처리) */
export function buildPrompt(i: PromptInput): string | null {
  const lighting = byId(LIGHTING, i.lightingId);
  const camera = byId(CAMERA, i.cameraId);
  const pose = byId(POSE, i.poseId);
  const outfit = byId(OUTFIT, i.outfitId);
  const film = byId(FILM, i.filmId);
  const color = byId(COLOR, i.colorId);
  const bg = byId(BACKGROUND, i.backgroundId);
  if (!lighting || !camera || !pose || !outfit || !film || !color || !bg) return null;
  const skins = i.skinIds.map((id) => byId(SKIN, id)).filter((x): x is NonNullable<typeof x> => !!x);
  if (skins.length !== i.skinIds.length) return null;

  const retouch = RETOUCH.filter((r) => i.retouch[r.key]).map((r) => `- ${r.fragment}`);
  const background = bg.fragment.replace("{colorName}", color.name);

  const blocks = [
    MASTER_RULES,
    i.truePerspective ? TRUE_PERSPECTIVE : KEEP_ORIENTATION,
    ...(i.symmetry ? [SYMMETRY] : []),
    ...(retouch.length ? [`NATURAL RETOUCHING (subtle, never alter identity):\n${retouch.join("\n")}`] : []),
    `SUBJECT: the person in the provided reference image.
OUTFIT: ${outfit.fragment}
LIGHTING: ${lighting.fragment}
CAMERA: ${camera.fragment}
SKIN DETAIL: ${skins.length ? skins.map((s) => s.fragment).join("; ") : "natural realistic skin"}
POSE AND EXPRESSION: ${pose.fragment}
BACKGROUND: ${background}
FILM LOOK: ${film.fragment}
COLOR THEME: ${color.name} (${color.hex})`,
    "FINAL OUTPUT: a single high-end professional photograph of this person, hyper-detailed, lifelike and indistinguishable from a real photo.",
  ];
  return blocks.join("\n\n");
}
