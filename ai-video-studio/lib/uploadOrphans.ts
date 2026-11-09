// 2026-11-10 내 영상 올리기 중 멈춘 파일 정리(IMPROVEMENTS 「행 없는 파일」).
// 올리기는 start(일회용 주소) → 브라우저가 파일 올림 → finish(보관함 줄 저장) 순서라, 중간에 창을 닫으면 `<회원>/<번호>/video.mp4`만 남고 줄이 없다.
// 줄이 없으면 30일 정리(줄 기준)가 찾지 못하므로 매일 정리 때 따로 찾는다. 판정은 좁게 — 아래 셋을 모두 만족할 때만 지운다:
//   1. 폴더 이름이 번호(UUID)이고 그 번호의 보관함 줄(avs_generations)이 없다
//   2. 폴더 안 파일이 video.mp4 하나뿐이다(생성 영상·첫 장면 이미지·목소리 파일이 있는 폴더는 건드리지 않음)
//   3. 그 파일이 올라간 지 하루가 지났다(지금 올리는 중인 파일을 지우지 않게)
// 다른 파일을 불러오지 않는 순수 함수만 둔다(node 시험에서 바로 불러온다). 실제 찾기·지우기는 app/api/cron/cleanup.

export const ORPHAN_MIN_AGE_MS = 24 * 3_600_000;
export const UPLOAD_FILE_NAME = "video.mp4";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

export type FolderFile = { name: string; created_at?: string | null };

/** 이 폴더가 지워도 되는 「멈춘 올리기」인가 */
export function isOrphanUpload(folderId: string, files: FolderFile[], hasRow: boolean, now = Date.now()): boolean {
  if (!isUuid(folderId) || hasRow) return false;
  if (files.length !== 1 || files[0].name !== UPLOAD_FILE_NAME) return false;
  const at = files[0].created_at ? new Date(files[0].created_at).getTime() : NaN;
  return Number.isFinite(at) && now - at >= ORPHAN_MIN_AGE_MS;
}
