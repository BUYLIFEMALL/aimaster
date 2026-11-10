import "server-only";
// 「확인 필요」 정리 — 보낸 뒤 결과를 모르는 원고는 자동으로 다시 보내지 않는다(블로그 핵심 지침).
// 회원이 블로그에서 직접 확인한 결과로만 상태를 정한다: 올라갔음 → published(주소 선택 입력), 안 올라갔음 → failed(다시 보낼 수 있음).
import { InputError } from "./draft/service";
import { retentionPatch } from "./publishFlow";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };

export const STALE_PUBLISHING_MS = 10 * 60_000;

/** 정리할 수 있는 상태: 확인 필요, 또는 10분 넘게 「발행 중」에 멈춘 원고 */
export function canResolve(status: string, updatedAt: string, now = Date.now()) {
  return status === "uncertain" || (status === "publishing" && Date.parse(updatedAt) < now - STALE_PUBLISHING_MS);
}

export async function resolveUncertain(admin: AdminDb, userId: string, postId: string, body: unknown, now = Date.now()) {
  const b = (body ?? {}) as { outcome?: unknown; url?: unknown };
  if (b.outcome !== "sent" && b.outcome !== "not_sent") throw new InputError("블로그에서 확인한 결과를 골라 주세요.");
  let url: string | null = null;
  if (b.outcome === "sent" && typeof b.url === "string" && b.url.trim()) {
    try {
      const u = new URL(b.url.trim());
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      url = u.toString().slice(0, 1000);
    } catch {
      throw new InputError("글 주소 형식이 올바르지 않습니다(https://로 시작).");
    }
  }
  const { data: cur } = await admin.from("wba_posts").select("status, updated_at, platform, images").eq("id", postId).eq("user_id", userId).maybeSingle();
  if (!cur) throw new InputError("원고를 찾지 못했습니다.", 404, "not_found");
  if (!canResolve(cur.status, cur.updated_at, now)) throw new InputError("「확인 필요」 상태인 원고만 정리할 수 있습니다.", 409, "not_uncertain");
  const nowIso = new Date(now).toISOString();
  const patch =
    b.outcome === "sent"
      ? { status: "published", remote_id: "manual", remote_url: url, published_at: nowIso, error_code: null, error_detail: "회원이 블로그에서 올라간 것을 확인함",
          // 구글 블로그에 실제 발행된 글이면 이미지를 발행일부터 1년 보관
          ...retentionPatch(cur.platform, "published", Array.isArray(cur.images) ? cur.images.filter((i: { status?: string }) => i?.status === "done").length : 0, nowIso) }
      : { status: "failed", remote_id: null, keep_images: false, image_expires_at: null, error_code: "not_sent", error_detail: "회원이 블로그에서 올라가지 않은 것을 확인함 — 다시 보낼 수 있습니다" };
  const { data, error } = await admin.from("wba_posts").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", postId).eq("user_id", userId).eq("status", cur.status).eq("updated_at", cur.updated_at).select("id");
  if (error) throw new InputError("저장하지 못했습니다.", 500, "server");
  if (!Array.isArray(data) || data.length !== 1) throw new InputError("「확인 필요」 상태인 원고만 정리할 수 있습니다.", 409, "not_uncertain");
  return patch.status;
}
