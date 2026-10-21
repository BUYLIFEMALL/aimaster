import { NextResponse } from "next/server";
import { resolveSaveStatus } from "./postStatus";
import { changesAuthoring, getPostReview } from "./postReview";
import { nextTimestamp } from "./executionRuns";
import { validateReservation } from "./scheduleSlots";
import { newNaverDraftSummary } from "./naverPublishing";
import { SAVE_CONFLICT, SAVE_UPGRADE, savedPost, postSaveRevision, saveFingerprint, saveReceipt, saveUuid, withSaveReceipt } from "./postSaveProtocol";

import { validatePrivatePhotoPost } from "./privatePhotoPost";
import { PrivatePhotoError } from "./privatePhotos";
import { validateSourcePost, SourceError } from "./collectedMaterials";

const reply = (body: unknown, status = 200) => NextResponse.json(body, {status, headers: {"Cache-Control": "no-store"}});
const conflict = () => reply({error: SAVE_CONFLICT, code: "SAVE_CONFLICT"}, 409);
const accepted = (row: any, replayed = false) => reply({success: true, post: {...savedPost(row), review: getPostReview(row)}, replayed});
export async function handlePostSave(admin: any, userId: string, payload: Record<string, any>, method: "POST" | "PUT") {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply({error: "저장할 원고 형식을 확인해 주세요."}, 400);
  if (["prepared", "publishing", "published"].includes(payload.status)) return reply({error: "입력·준비·발행 완료 상태는 확장 결과로만 기록합니다."}, 400);
  if (!saveUuid(payload.id) || !saveUuid(payload.save_request_id)) return reply({error: SAVE_UPGRADE, code: "SAVE_UPGRADE_REQUIRED"}, 409);
  if (payload.status !== undefined && !["draft", "queued", "failed"].includes(payload.status)) return reply({error: "저장 상태를 확인해 주세요."}, 400);
  for (const key of ["title", "content", "blog_id", "category_name"]) if (payload[key] !== undefined && typeof payload[key] !== "string") return reply({error: "원고 입력 형식을 확인해 주세요."}, 400);
  for (const key of ["tags", "images"]) if (payload[key] !== undefined && !Array.isArray(payload[key])) return reply({error: "태그·이미지 목록 형식을 확인해 주세요."}, 400);
  if (method === "POST" && !payload.title && !payload.content) return reply({error: "제목 또는 본문이 비어있습니다."}, 400);

  const fingerprint = saveFingerprint(method, payload);
  const read = () => admin.from("nba_posts").select("*").eq("id", payload.id).eq("user_id", userId).maybeSingle();
  const {data: current, error: readError} = await read();
  if (readError) return reply({error: "기존 원고를 확인하지 못했습니다."}, 503);
  const receipt = saveReceipt(current, payload.save_request_id, fingerprint);
  if (receipt === "same") return accepted(current, true);
  if (receipt === "changed") return conflict();
  if (!current && method === "PUT") return reply({error: "본인 원고를 찾을 수 없습니다."}, 404);
  if (current && (payload.create === true || payload.expected_revision !== postSaveRevision(current))) return conflict();
  if (!current && payload.create !== true) return reply({error: SAVE_UPGRADE, code: "SAVE_UPGRADE_REQUIRED"}, 409);

  let updates: Record<string, any>;
  if (method === "POST") {
    updates = {blog_id: payload.blog_id || "myblog_sample", category_name: payload.category_name || "일반", title: payload.title || "제목 없음",
      content: payload.content || "", tags: payload.tags || [], images: payload.images || [], status: resolveSaveStatus(current?.status, payload.status)};
    if (payload.scheduled_at) updates.scheduled_at = payload.scheduled_at;
    if (payload.post_url) updates.post_url = payload.post_url;
  } else {
    const reservationError = validateReservation(payload.is_reserved, payload.scheduled_at);
    if (reservationError) return reply({error: reservationError}, 400);
    const keys = ["blog_id", "title", "content", "category_name", "tags", "images", "status", "post_url", "error_message", "publish_visibility", "is_reserved", "scheduled_at"];
    updates = Object.fromEntries(keys.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]));
    if (!Object.keys(updates).length) return reply({error: "저장할 변경 내용을 확인해 주세요."}, 400);
    if (updates.publish_visibility !== undefined) updates.publish_visibility = updates.publish_visibility === "public" ? "public" : "private";
    if (updates.is_reserved === false) updates.scheduled_at = null;
    if (current.status === "prepared" && payload.status === undefined && [payload.title, payload.content, payload.tags, payload.images, payload.publish_visibility, payload.is_reserved, payload.scheduled_at].some(value => value !== undefined)) updates.status = "draft";
  }
  if (current?.status === "publishing" && ((updates.status !== undefined && updates.status !== current.status) || [payload.publish_visibility, payload.post_url, payload.error_message].some(value => value !== undefined))) return conflict();
  if (current && ["queued", "publishing"].includes(current.status) && changesAuthoring(current, updates)) return reply({error: "대기·입력 중인 원고는 변경할 수 없습니다. 대기를 취소한 뒤 저장해 주세요."}, 409);
  let privatePhoto: Awaited<ReturnType<typeof validatePrivatePhotoPost>> = {};
  if (payload.photo_review !== undefined || payload.images !== undefined || payload.content !== undefined || updates.status === "queued") {
    try { privatePhoto = await validatePrivatePhotoPost(admin, userId, payload, current); }
    catch (error) { return reply({error: error instanceof PrivatePhotoError ? error.message : "사진 원고를 확인하지 못했습니다. 다시 저장해 주세요."}, error instanceof PrivatePhotoError ? error.status : 503); }
    if (privatePhoto.images) updates.images = privatePhoto.images;
  }
  let sourceBundle;
  try { sourceBundle = await validateSourcePost(admin, userId, payload, current); }
  catch (error) {return reply({error: error instanceof SourceError ? error.message : "원고의 출처를 확인하지 못했습니다."}, error instanceof SourceError ? error.status : 503);}
  if (updates.status === "queued" && !getPostReview({...current, ...updates}).allowed) return reply({error: "저장한 최종 원고를 직접 검수한 뒤 전송해 주세요."}, 422);
  updates.updated_at = nextTimestamp(current?.updated_at);
  const summary = current ? current.research_summary : newNaverDraftSummary(updates.blog_id);
  updates.research_summary = withSaveReceipt({...summary, ...(privatePhoto.photoReview ? {photo_review: privatePhoto.photoReview} : {}), ...(sourceBundle ? {source_bundle: sourceBundle} : {})}, payload.save_request_id, fingerprint);
  const originalDates = [privatePhoto.createdAt, sourceBundle?.collectedAt].filter((date): date is string => Boolean(date)).sort();
  if (!current && originalDates.length) updates.created_at = originalDates[0];

  let query;
  if (current) {
    if (!current.updated_at) return reply({error: "원고 저장 버전을 확인하지 못했습니다."}, 503);
    query = admin.from("nba_posts").update(updates).eq("id", current.id).eq("user_id", userId).eq("status", current.status).eq("updated_at", current.updated_at);
  } else query = admin.from("nba_posts").insert({...updates, id: payload.id, user_id: userId});
  const {data, error} = await query.select("*").maybeSingle();
  if (error?.code === "23505" && !current) {
    const {data: inserted, error: checkError} = await read();
    if (checkError) return reply({error: "저장 결과를 확인하지 못했습니다. 같은 내용으로 다시 저장해 주세요."}, 503);
    return saveReceipt(inserted, payload.save_request_id, fingerprint) === "same" ? accepted(inserted, true) : conflict();
  }
  if (error) return reply({error: "원고 저장을 확인하지 못했습니다. 같은 내용으로 다시 저장해 주세요."}, 503);
  if (!data) {
    const {data: latest, error: checkError} = await read();
    if (checkError) return reply({error: "저장 결과를 확인하지 못했습니다. 같은 내용으로 다시 저장해 주세요."}, 503);
    return saveReceipt(latest, payload.save_request_id, fingerprint) === "same" ? accepted(latest, true) : conflict();
  }
  return accepted(data);
}
