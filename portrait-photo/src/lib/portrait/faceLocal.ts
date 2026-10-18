// v1.26 브라우저 안 얼굴 인식(회원 PC에서만 실행 — 사진을 서버로 보내지 않고 AI 호출·비용 없음).
// 모델·실행 파일은 우리 사이트 public/mediapipe/에 함께 올려 외부 CDN에 의존하지 않고, 처음 쓸 때만 불러온다.
import { landmarksToMeasure } from "./post";

type Landmarker = { detect: (img: HTMLImageElement) => { faceLandmarks: { x: number; y: number }[][] } };
let loading: Promise<Landmarker | null> | null = null;

function load(): Promise<Landmarker | null> {
  loading ??= (async () => {
    try {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return (await FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 1,
      })) as unknown as Landmarker;
    } catch {
      loading = null; // 다음에 다시 시도할 수 있게
      return null;
    }
  })();
  return loading;
}

/** 이미지(data URL 등)에서 머리 위치를 추정한다. 얼굴을 못 찾았거나 브라우저가 지원하지 않으면 null. */
export async function detectHeadLocal(src: string): Promise<{ crownY: number; chinY: number; centerX: number; srcW: number; srcH: number } | null> {
  const lm = await load();
  if (!lm) return null;
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); img.src = src; });
  try {
    const r = lm.detect(img);
    const m = landmarksToMeasure(r.faceLandmarks?.[0]);
    return m ? { ...m, srcW: img.naturalWidth, srcH: img.naturalHeight } : null;
  } catch {
    return null;
  }
}

/** 보정용: 이마 위(점 10)·턱(점 152)·볼 끝 좌표를 그대로 돌려준다(시험 스크립트 전용). */
export async function rawLandmarksLocal(src: string): Promise<{ top: number; chin: number; left: number; right: number; w: number; h: number } | null> {
  const lm = await load();
  if (!lm) return null;
  const img = new Image();
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("이미지를 읽지 못했습니다.")); img.src = src; });
  const p = lm.detect(img).faceLandmarks?.[0];
  return p ? { top: p[10].y, chin: p[152].y, left: p[234].x, right: p[454].x, w: img.naturalWidth, h: img.naturalHeight } : null;
}
