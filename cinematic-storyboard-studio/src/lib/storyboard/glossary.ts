// 촬영 용어 사전(사용 안내 화면). 설명은 직접 작성했다.
export interface GlossaryItem {
  term: string;
  full: string;
  ko: string;
  en: string;
}

export const GLOSSARY: GlossaryItem[] = [
  { term: "ELS", full: "Extreme Long Shot", ko: "아주 멀리서 잡아 장소와 규모를 보여주는 샷", en: "A very distant shot that shows place and scale" },
  { term: "LS", full: "Long Shot", ko: "인물의 전신이 보이는 샷", en: "The whole body is visible" },
  { term: "MLS", full: "Medium Long Shot", ko: "무릎 위까지 담는 샷", en: "Framed from the knees up" },
  { term: "MS", full: "Medium Shot", ko: "허리 위, 대화 장면에 자주 쓰는 샷", en: "Waist up, common for dialogue" },
  { term: "MCU", full: "Medium Close Up", ko: "가슴 위, 표정과 몸짓을 함께 보여주는 샷", en: "Chest up, expression plus gesture" },
  { term: "CU", full: "Close Up", ko: "얼굴 중심, 감정을 강조하는 샷", en: "Face-centered to stress emotion" },
  { term: "ECU", full: "Extreme Close Up", ko: "눈·입·손 등 세부만 크게 잡는 샷", en: "A tight detail such as eyes or hands" },
  { term: "Low Angle", full: "Low Angle", ko: "아래에서 올려다봐 위압감이나 권위를 주는 앵글", en: "Looking up; conveys power or threat" },
  { term: "High Angle", full: "High Angle", ko: "위에서 내려다봐 왜소함이나 약함을 주는 앵글", en: "Looking down; conveys weakness" },
  { term: "Bird's Eye", full: "Overhead", ko: "수직으로 내려다보는 부감 샷", en: "Straight down from above" },
  { term: "Dutch", full: "Dutch Angle", ko: "화면을 기울여 불안감을 주는 앵글", en: "A tilted horizon for unease" },
  { term: "OTS", full: "Over the Shoulder", ko: "한 인물의 어깨 너머로 상대를 보는 샷", en: "Seen past one character's shoulder" },
  { term: "POV", full: "Point of View", ko: "인물의 눈으로 보는 1인칭 시점 샷", en: "Seen through a character's eyes" },
  { term: "Two Shot", full: "Two Shot", ko: "두 인물을 한 화면에 담는 샷", en: "Two subjects in one frame" },
  { term: "Rack Focus", full: "Rack Focus", ko: "초점을 A에서 B로 옮겨 시선을 이끄는 기법", en: "Focus shifts from A to B to guide attention" },
  { term: "Dolly Zoom", full: "Vertigo Effect", ko: "카메라는 다가가고 줌은 빼서 배경만 일그러지는 현기증 효과", en: "Move in while zooming out so the background warps" },
  { term: "Pan", full: "Panning", ko: "카메라 위치는 두고 좌우로 돌리는 움직임", en: "Rotate left or right from a fixed position" },
  { term: "Tilt", full: "Tilting", ko: "카메라 위치는 두고 위아래로 돌리는 움직임", en: "Rotate up or down from a fixed position" },
  { term: "Tracking", full: "Tracking Shot", ko: "피사체를 따라 함께 이동하며 찍는 샷", en: "Moves along with the subject" },
];
