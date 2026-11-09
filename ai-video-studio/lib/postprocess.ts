// 2026-11-09 후처리(백로그 3차) — 내 보관함 영상에 회원 본인 fal 키로 립싱크·업스케일·배경 제거.
// 화면과 서버가 함께 쓰는 순수 함수만 둔다(다른 파일을 불러오지 않음 — node 시험에서 바로 불러온다).
// 결과는 avs_generations에 새 행(model = "post:<종류>", provider = fal)으로 저장돼 보관함·상태 확인·30일 정리를 그대로 쓴다.
// 주소·입력·가격: 2026-11-09 fal 공식 페이지·OpenAPI 확인(docs/PLAN_20261109_POSTPROCESS_FIT.md §2).

export type PostKind = "lipsync" | "upscale" | "bgremove";
export const POST_KINDS: PostKind[] = ["lipsync", "upscale", "bgremove"];
export type BgColor = "Green" | "White" | "Black";
export const BG_COLORS: { id: BgColor; label: string }[] = [{ id: "Green", label: "초록(크로마키)" }, { id: "White", label: "흰색" }, { id: "Black", label: "검정" }];

export interface PostSpec {
  kind: PostKind;
  name: string;
  emoji: string;
  endpoint: string;
  desc: string;
  /** 원본 영상 길이 제한(초) */
  minSeconds: number;
  maxSeconds: number;
}

export const POST_SPECS: Record<PostKind, PostSpec> = {
  lipsync: {
    kind: "lipsync", name: "립싱크", emoji: "👄", endpoint: "fal-ai/kling-video/lipsync/audio-to-video",
    desc: "영상 속 사람의 입 모양을 내가 올린 목소리(MP3·WAV, 2~60초, 3MB 이하)에 맞춥니다. 얼굴이 정면으로 잘 보이는 2~10초 영상에 맞습니다.",
    minSeconds: 2, maxSeconds: 10,
  },
  upscale: {
    kind: "upscale", name: "업스케일 1080p", emoji: "🔍", endpoint: "fal-ai/topaz/upscale/video",
    desc: "720p 영상을 1080p로 선명하게 키웁니다(Topaz). 결과는 1920×1080(세로 영상은 1080×1920) 안으로 맞춥니다. 이미 1080p인 영상은 키우지 않습니다.",
    minSeconds: 1, maxSeconds: 30,
  },
  bgremove: {
    kind: "bgremove", name: "배경 제거", emoji: "✂️", endpoint: "bria/video/background-removal",
    desc: "인물·물건만 남기고 배경을 한 가지 색으로 바꿉니다(30초 미만). 초록을 고르면 편집 프로그램에서 크로마키로 다른 배경을 넣을 수 있습니다. AI가 남길 주인공을 스스로 고르므로, 사람이나 물건 하나가 뚜렷하게 보이는 영상에 맞습니다(물건이 여러 개면 일부가 지워질 수 있습니다).",
    minSeconds: 1, maxSeconds: 29,
  },
};

export const postModelId = (k: PostKind) => `post:${k}`;
export function postKindOf(model: string): PostKind | null {
  const k = model.startsWith("post:") ? model.slice(5) : "";
  return (POST_KINDS as string[]).includes(k) ? (k as PostKind) : null;
}

/** 원본 해상도 — 생성 때 고른 값이 있으면 그 값, 없으면 대부분 모델의 기본인 720p로 본다 */
export function sourceHeight(resolution: unknown): number {
  const m = typeof resolution === "string" ? /(\d{3,4})p/.exec(resolution) : null;
  return m ? Number(m[1]) : 720;
}

export type VideoSize = { w: number; h: number };
/** 화면·요청에서 받은 실제 영상 크기 — 숫자가 이상하면 null(해상도 칸으로 계산) */
export function videoSize(v: unknown): VideoSize | null {
  const o = v as { w?: unknown; h?: unknown } | null;
  const w = Number(o?.w), h = Number(o?.h);
  return Number.isInteger(w) && Number.isInteger(h) && w >= 16 && h >= 16 && w <= 8192 && h <= 8192 ? { w, h } : null;
}

/** 업스케일 배율 — 결과가 1920×1080(세로 영상은 1080×1920) 안에 들어가게 한다.
 *  짧은 쪽만 보면 세로로 긴 영상(예 720×1440)이 1080×2160이 되어 1080p 넘는 단가(초당 $0.08)가 붙는다(2026-11-10 개선). 소수 둘째 자리 내림. */
export function upscaleFactor(resolution: unknown, size?: VideoSize | null): number {
  const f = size ? Math.min(1080 / Math.min(size.w, size.h), 1920 / Math.max(size.w, size.h)) : 1080 / sourceHeight(resolution);
  return Math.floor(f * 100) / 100;
}

/** 예상 비용(USD, 회원 fal 키) — 화면은 「약」으로 안내 */
export function postCostUsd(kind: PostKind, seconds: number): number {
  const s = Math.max(1, Math.ceil(seconds));
  const usd = kind === "lipsync" ? Math.ceil(s / 5) * 0.014 // 5초마다 $0.014(올림)
    : kind === "upscale" ? s * 0.02 // 결과 1080p 이하: 초당 $0.02
    : s * 0.14; // 배경 제거 초당 $0.14
  return Math.round(usd * 1000) / 1000;
}

/** 이 영상에 이 후처리를 할 수 있는가 — 안 되면 이유(화면·서버 같은 판정) */
export function postBlocked(kind: PostKind, seconds: number, resolution?: unknown, size?: VideoSize | null): string | null {
  const spec = POST_SPECS[kind];
  if (seconds < spec.minSeconds) return `${spec.name}은(는) ${spec.minSeconds}초 이상 영상만 됩니다.`;
  if (seconds > spec.maxSeconds) return `${spec.name}은(는) ${spec.maxSeconds}초 이하 영상만 됩니다. 영상 합치기에서 잘라 쓴 뒤 해 주세요.`;
  if (kind === "upscale" && (size ? upscaleFactor(resolution, size) <= 1.05 : sourceHeight(resolution) >= 1080)) return "이미 1080p 크기인 영상이라 키우지 않습니다.";
  return null;
}

/** fal에 보낼 입력 — 영상·소리는 1시간짜리 서명 주소 */
export function postInput(kind: PostKind, o: { videoUrl: string; audioUrl?: string; color?: BgColor; resolution?: unknown; size?: VideoSize | null }): Record<string, unknown> {
  if (kind === "lipsync") return { video_url: o.videoUrl, audio_url: o.audioUrl };
  if (kind === "upscale") return { video_url: o.videoUrl, upscale_factor: upscaleFactor(o.resolution, o.size), H264_output: true };
  return { video_url: o.videoUrl, background_color: o.color ?? "Green", output_container_and_codec: "mp4_h264", preserve_audio: true };
}

export function isBgColor(v: unknown): v is BgColor {
  return v === "Green" || v === "White" || v === "Black";
}

// ── 2026-11-09 내 영상 올리기(후처리용) — 회원 본인 파일만, 권리 확인 필수. 행 자체가 실행 기록(파일 이름·권리 확인·시각)이고 30일 규칙을 따른다
export const UPLOAD_MODEL = "upload:file";
export const UPLOAD_MAX_BYTES = 45 * 1024 * 1024; // 버킷 50MB 안
export const UPLOAD_MAX_SECONDS = 60;
export const isUploadModel = (model: string) => model === UPLOAD_MODEL;
/** 정수 칸(duration_s)에 넣을 길이 — 올림(10.4초를 11초로 적어 립싱크 10초 제한을 미리 막는다) */
export const uploadSeconds = (s: number) => Math.max(1, Math.ceil(s - 0.05));
/** 가로·세로 크기로 비율 칸 값 — 9:16·16:9에 가까울 때만, 나머지(정사각 등)는 null */
export function uploadAspect(w: number, h: number): "16:9" | "9:16" | null {
  if (!(w > 0 && h > 0)) return null;
  const r = w / h;
  return r >= 1.3 ? "16:9" : r <= 0.77 ? "9:16" : null;
}
