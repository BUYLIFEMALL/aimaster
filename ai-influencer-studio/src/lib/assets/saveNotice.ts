// 생성 응답의 원본 저장 결과(assetSaved)를 화면 안내 한 줄로 바꾼다 (W01v, 2026-11-18).
// 응답의 뜻은 src/lib/assets/generation.ts·store.ts가 정한 그대로다 — 여기서는 새 판정을 하지 않는다:
//   true      — DB가 저장 완료(ready)를 확인해 준 경우뿐이다.
//   false     — 저장하지 않았다(형식 불일치·용량·예약 실패 등). 원격 저장 요청이 나가기 전에 끝난 경우다.
//   "unknown" — 저장 요청이 나갔을 수 있는데 결과를 확인하지 못했다(응답 유실·시간 초과). 실패라는 뜻이 아니다.
// 지키는 것
//   * 필드가 없으면(저장 기능 off·옛 응답·히스토리에서 불러온 결과) null → 화면은 예전과 똑같다.
//   * 세 값 밖의 값(문자열 "true", 1, null 등)은 모른다고 보고 null을 돌려준다 — 성공으로 추정하지 않는다.
//   * 응답의 assetId·assetCode·오류 원문은 읽지 않는다. 화면에 나가는 것은 아래 고정 문구뿐이다.
//   * 이 모듈은 안내 문구만 만든다. 다시 생성·다시 저장·자동 조회를 시작하는 코드는 여기에도, 이것을 쓰는 화면에도 두지 않는다.

export type AssetSaveNoticeKind = "saved" | "not_saved" | "unknown";
export type AssetSaveNotice = { kind: AssetSaveNoticeKind; message: string };

export const ASSET_SAVE_MESSAGES: Record<AssetSaveNoticeKind, string> = {
  saved: "원본 이미지를 내 저장공간에 보관했습니다.",
  not_saved: "원본 이미지는 저장공간에 보관되지 않았습니다. 생성된 이미지는 지금 화면에서 그대로 내려받을 수 있습니다.",
  unknown:
    "원본 보관 여부를 아직 확인하지 못했습니다. 보관에 실패했다는 뜻은 아닙니다. 생성된 이미지는 그대로 쓰실 수 있으니 다시 생성하지 않으셔도 됩니다.",
};

/** 생성 응답 본문 → 안내. 저장 결과가 실리지 않았거나 알 수 없는 값이면 null(화면 변화 없음). */
export function assetSaveNotice(body: unknown): AssetSaveNotice | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  if (!Object.prototype.hasOwnProperty.call(body, "assetSaved")) return null;
  const v = (body as { assetSaved?: unknown }).assetSaved;
  const kind: AssetSaveNoticeKind | null = v === true ? "saved" : v === false ? "not_saved" : v === "unknown" ? "unknown" : null;
  return kind ? { kind, message: ASSET_SAVE_MESSAGES[kind] } : null;
}
