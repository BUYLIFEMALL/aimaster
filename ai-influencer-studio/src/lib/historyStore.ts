// 작업 히스토리(aif_history + 비공개 버킷 aif-history) 처리 로직 — 라우트(src/app/api/history/route.ts)는 로그인 확인과 응답만 한다.
// 2026-11-18 W01b(CC-SNS-01): 보관 연장·열외 회원(profiles.retention_exempt = true — 유료 저장 구독·등급·관리자 지정·관리자/시험 계정)은
// 30일 자동 삭제와 30개 초과 자동 삭제에서 모두 뺀다. 예외 여부를 확인하지 못하면(오류·이상한 응답) 자동 삭제를 하지 않는다(fail-closed).
// 목록 응답은 누구나 최근 30개까지만 보여 준다(응답 제한일 뿐 삭제 아님). 수동 삭제(DELETE)는 예전 그대로.
// 시험에서 바로 불러올 수 있게 경로 별칭·Next 모듈을 쓰지 않고, DB/저장소 클라이언트와 예외 조회 함수는 호출부가 넘긴다.

export const TABLE = "aif_history";
export const BUCKET = "aif-history";
export const MAX_ITEMS = 30;
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
/** 설정 중 사진 데이터(얼굴·장소·상품 사진, 직전 결과)는 저장하지 않는다 — 글자 설정만 */
export const PHOTO_KEYS = ["personImage", "placeImage", "productImages", "lastResultImage"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any; // Supabase 서비스 키 클라이언트(createAdminClient) 또는 시험용 가짜

export type Row = { id: string; image_path: string; captions: unknown; config: unknown; summary: string; created_at: string };
export type ExemptState = "exempt" | "not_exempt" | "unknown";
export type Result = { status: number; body: Record<string, unknown> };

/** 보관 예외 여부. 목록 조회가 실패하거나 이상한 값을 돌려주면 "unknown" — 호출부는 이때 자동 삭제를 하지 않는다. */
export async function resolveExemptState(loadExemptIds: () => Promise<Set<string>>, userId: string): Promise<ExemptState> {
  try {
    const ids = await loadExemptIds();
    if (!(ids instanceof Set)) return "unknown";
    return ids.has(userId) ? "exempt" : "not_exempt";
  } catch {
    return "unknown";
  }
}

/** 목록 정리 계획(순수 함수). rows는 최신순. 예외 확인이 not_exempt일 때만 30일·30개 넘는 행을 지운다. */
export function planList(rows: Row[], now: number, state: ExemptState): { visible: Row[]; remove: Row[] } {
  if (state !== "not_exempt") return { visible: rows.slice(0, MAX_ITEMS), remove: [] };
  const cutoff = now - RETENTION_MS;
  const keep = rows.filter((r, i) => i < MAX_ITEMS && Date.parse(r.created_at) > cutoff);
  return { visible: keep, remove: rows.filter((r) => !keep.includes(r)) };
}

async function removeRows(admin: Admin, userId: string, rows: Pick<Row, "id" | "image_path">[]) {
  if (!rows.length) return;
  await admin.storage.from(BUCKET).remove(rows.map((r) => r.image_path)).catch(() => undefined);
  await admin.from(TABLE).delete().eq("user_id", userId).in("id", rows.map((r) => r.id));
}

type Deps = { admin: Admin; userId: string; loadExemptIds: () => Promise<Set<string>>; now?: number };

/** GET — 내 히스토리(최근 30개, 이미지는 1시간 서명 주소). 예외 회원이 아니라고 확인된 경우에만 30일·30개 넘는 것을 지운다. */
export async function getHistory({ admin, userId, loadExemptIds, now = Date.now() }: Deps): Promise<Result> {
  const { data, error } = await admin.from(TABLE).select("id, image_path, captions, config, summary, created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return { status: 500, body: { error: "작업 히스토리를 불러오지 못했습니다." } };
  const rows = (Array.isArray(data) ? data : []) as Row[];
  const state = await resolveExemptState(loadExemptIds, userId);
  const { visible, remove } = planList(rows, now, state);
  await removeRows(admin, userId, remove);

  const signed = visible.length ? (await admin.storage.from(BUCKET).createSignedUrls(visible.map((r) => r.image_path), 60 * 60)).data ?? [] : [];
  const urlOf = new Map((signed as { path: string; signedUrl: string }[]).map((s) => [s.path, s.signedUrl]));
  return {
    status: 200,
    body: { items: visible.map((r) => ({ id: r.id, createdAt: r.created_at, imageUrl: urlOf.get(r.image_path) ?? "", captions: r.captions, config: r.config, summary: r.summary })) },
  };
}

/** POST — 히스토리 한 건 저장. body: { image: "data:image/jpeg;base64,…", captions: string[], config: object, summary: string }
 *  예외 여부는 쓰기 전에 한 번 확인한다. 확인 실패는 저장을 막지 않고, 저장 뒤 30개 초과 정리만 건너뛴다(쓰기 결과는 늘 확정 상태). */
export async function postHistory({ admin, userId, loadExemptIds }: Deps, body: unknown, newId: () => string = () => crypto.randomUUID()): Promise<Result> {
  const b = (body && typeof body === "object" ? body : null) as { image?: unknown; captions?: unknown; config?: unknown; summary?: unknown } | null;
  const m = typeof b?.image === "string" ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(b.image) : null;
  if (!m) return { status: 400, body: { error: "저장할 이미지가 올바르지 않습니다." } };
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return { status: 400, body: { error: "이미지가 너무 큽니다." } };

  const captions = Array.isArray(b?.captions) ? b.captions.filter((c): c is string => typeof c === "string").slice(0, 10).map((c) => c.slice(0, 3000)) : [];
  const config: Record<string, unknown> = b?.config && typeof b.config === "object" && !Array.isArray(b.config) ? { ...(b.config as Record<string, unknown>) } : {};
  for (const k of PHOTO_KEYS) delete config[k];
  const summary = typeof b?.summary === "string" ? b.summary.slice(0, 200) : "";

  const state = await resolveExemptState(loadExemptIds, userId);

  const id = newId();
  const path = `${userId}/history/${id}.jpg`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (upErr) return { status: 500, body: { error: "이미지를 저장하지 못했습니다." } };
  const { data: row, error } = await admin.from(TABLE).insert({ id, user_id: userId, image_path: path, captions, config, summary }).select("created_at").single();
  if (error || !row) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => undefined);
    return { status: 500, body: { error: "작업 히스토리를 저장하지 못했습니다." } };
  }

  // 30개를 넘으면 오래된 것부터 지운다 — 예외 회원이 아니라고 확인된 경우에만
  if (state === "not_exempt") {
    const { data: extra } = await admin.from(TABLE).select("id, image_path").eq("user_id", userId).order("created_at", { ascending: false }).range(MAX_ITEMS, MAX_ITEMS + 50);
    await removeRows(admin, userId, (Array.isArray(extra) ? extra : []) as Pick<Row, "id" | "image_path">[]);
  }

  const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return { status: 200, body: { item: { id, createdAt: row.created_at, imageUrl: s?.signedUrl ?? "", captions, config, summary } } };
}

/** DELETE — ?id=한 건 / ?all=1 전체 (회원이 직접 누른 삭제, 예외 회원도 그대로 지움) */
export async function deleteHistory({ admin, userId }: Pick<Deps, "admin" | "userId">, opts: { id: string | null; all: boolean }): Promise<Result> {
  if (!opts.id && !opts.all) return { status: 400, body: { error: "지울 항목을 알려 주세요." } };
  let q = admin.from(TABLE).select("id, image_path").eq("user_id", userId);
  if (opts.id) q = q.eq("id", opts.id);
  const { data, error } = await q;
  if (error) return { status: 500, body: { error: "작업 히스토리를 지우지 못했습니다." } };
  await removeRows(admin, userId, (data ?? []) as Pick<Row, "id" | "image_path">[]);
  return { status: 200, body: { ok: true, removed: (data ?? []).length } };
}
