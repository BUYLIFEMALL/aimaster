// v1.18(G-23-02·03): 넣을 파일 고르기(화면과 무관한 순수 함수). 파일 선택 창의 accept는 끌어 놓기에는 적용되지 않는다.

export const VIDEO_EXTENSIONS = ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "ts"];
export const ACCEPT = VIDEO_EXTENSIONS.map((ext) => `.${ext}`).join(",");

type FileLike = { name: string; size: number; type: string };

/** 영상 형식인지: 브라우저가 알려 준 형식이 video/…이거나 확장자가 목록에 있으면 영상으로 본다. */
export function isVideoFile(file: Pick<FileLike, "name" | "type">): boolean {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.name.includes(".") && VIDEO_EXTENSIONS.includes(ext);
}

/**
 * 넣을 파일과 뺀 이유별 개수. existing은 이미 목록에 있는 파일(이름·크기가 같으면 같은 파일로 본다),
 * room은 목록에 더 들어갈 수 있는 개수.
 */
export function pickFiles<T extends FileLike>(
  files: T[],
  existing: ReadonlyArray<Pick<FileLike, "name" | "size">>,
  maxBytes: number,
  room: number,
): { accepted: T[]; notVideo: number; tooBig: number; duplicate: number; overLimit: number } {
  const accepted: T[] = [];
  let notVideo = 0;
  let tooBig = 0;
  let duplicate = 0;
  let overLimit = 0;
  const seen = [...existing];
  for (const file of files) {
    if (!isVideoFile(file)) notVideo++;
    else if (file.size > maxBytes) tooBig++;
    else if (seen.some((f) => f.name === file.name && f.size === file.size)) duplicate++;
    else if (accepted.length >= room) overLimit++;
    else {
      accepted.push(file);
      seen.push(file);
    }
  }
  return { accepted, notVideo, tooBig, duplicate, overLimit };
}

/** 뺀 파일 안내 한 줄. 뺀 파일이 없으면 빈 문자열. */
export function skippedNote(r: { notVideo: number; tooBig: number; duplicate: number; overLimit: number }, maxFiles: number): string {
  const parts: string[] = [];
  if (r.notVideo) parts.push(`영상이 아닌 파일 ${r.notVideo}개`);
  if (r.tooBig) parts.push(`200MB가 넘는 파일 ${r.tooBig}개`);
  if (r.duplicate) parts.push(`이미 목록에 있는 파일 ${r.duplicate}개`);
  if (r.overLimit) parts.push(`최대 ${maxFiles}개를 넘는 파일 ${r.overLimit}개`);
  if (!parts.length) return "";
  return `${parts.join(", ")}는 빼고 넣었습니다. 영상 파일(MP4·MOV·WEBM 등)만 넣을 수 있습니다.`;
}
