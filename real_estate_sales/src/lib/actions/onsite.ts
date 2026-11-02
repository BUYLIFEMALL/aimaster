"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ONSITE_BUCKET, ONSITE_KINDS, ONSITE_STATUSES, canUseOnsite } from "@/lib/onsite/types";

// AIMaster Database 타입에 아직 없는 표라 from()의 반환값만 느슨하게 받는다(lib/access.ts와 같은 방식).
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type OnsiteResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

async function requireOnsiteUser() {
  const user = await requireProgramAccess();
  if (!canUseOnsite(user.email)) redirect("/dashboard");
  return { user, db: (await createClient()) as unknown as SupabaseLike };
}

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  sggCd: z.string().max(10).nullable(),
  adminDong: z.string().max(50).nullable(),
});

const captureSchema = coordsSchema.extend({
  propertyId: z.string().uuid().nullable(),
  path: z.string().max(200),
  accuracy: z.number().nonnegative().nullable(),
  source: z.enum(["capture", "exif", "manual"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  address: z.string().trim().max(200).nullable().optional(),
});

/** 함수 본문 4.5MB 제한을 피하려고 사진은 브라우저에서 저장소로 바로 올린다. 경로는 서버가 정한다 */
export async function prepareOnsiteUploadAction(): Promise<OnsiteResult<{ path: string; token: string }>> {
  const { user } = await requireOnsiteUser();
  const path = `${user.id}/${randomUUID()}.jpg`;
  const { data, error } = await createAdminClient().storage.from(ONSITE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "사진을 올릴 준비를 하지 못했습니다. 다시 시도해 주세요." };
  return { ok: true, path: data.path, token: data.token };
}

export async function saveOnsiteCaptureAction(input: z.input<typeof captureSchema>): Promise<OnsiteResult<{ propertyId: string }>> {
  const { user, db } = await requireOnsiteUser();
  const v = captureSchema.parse(input);
  if (!v.path.startsWith(`${user.id}/`)) return { ok: false, error: "잘못된 사진 경로입니다." };
  const accuracy = v.accuracy === null ? null : Math.round(v.accuracy);

  let propertyId = v.propertyId;
  if (!propertyId) {
    const { data, error } = await db
      .from("real_estate_onsite_properties")
      .insert({
        user_id: user.id,
        lat: v.lat,
        lon: v.lon,
        accuracy_m: accuracy,
        coord_source: v.source,
        coord_confirmed: v.source === "manual",
        sgg_cd: v.sggCd,
        admin_dong: v.adminDong,
        address: v.address || null,
        address_source: v.address ? "auto" : null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "저장하지 못했습니다. 다시 시도해 주세요." };
    propertyId = data.id as string;
  }

  const { error } = await db.from("real_estate_onsite_photos").insert({
    property_id: propertyId,
    user_id: user.id,
    storage_path: v.path,
    lat: v.lat,
    lon: v.lon,
    accuracy_m: accuracy,
    coord_source: v.source,
    width: v.width,
    height: v.height,
    bytes: v.bytes,
  });
  if (error) return { ok: false, error: "사진 기록을 저장하지 못했습니다. 다시 시도해 주세요." };
  revalidatePath("/onsite");
  return { ok: true, propertyId };
}

const editSchema = z.object({
  address: z.string().trim().max(200),
  kind: z.enum(ONSITE_KINDS).nullable(),
  status: z.enum(Object.keys(ONSITE_STATUSES) as [keyof typeof ONSITE_STATUSES]),
  rating: z.number().int().min(1).max(5).nullable(),
  floor: z.string().trim().max(30),
  unit: z.string().trim().max(30),
  memo: z.string().trim().max(2000),
  visitedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function updateOnsitePropertyAction(id: string, input: z.input<typeof editSchema>): Promise<OnsiteResult> {
  const { user, db } = await requireOnsiteUser();
  const v = editSchema.parse(input);
  const { error } = await db
    .from("real_estate_onsite_properties")
    .update({
      address: v.address || null,
      address_source: v.address ? "member" : null,
      kind: v.kind,
      status: v.status,
      rating: v.rating,
      floor: v.floor || null,
      unit: v.unit || null,
      memo: v.memo || null,
      visited_on: v.visitedOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "저장하지 못했습니다. 다시 시도해 주세요." };
  revalidatePath("/onsite");
  return { ok: true };
}

const moveSchema = coordsSchema.extend({ address: z.string().trim().max(200).nullable().optional() });

export async function moveOnsitePropertyAction(id: string, input: z.input<typeof moveSchema>): Promise<OnsiteResult> {
  const { user, db } = await requireOnsiteUser();
  const v = moveSchema.parse(input);
  const { error } = await db
    .from("real_estate_onsite_properties")
    .update({
      lat: v.lat,
      lon: v.lon,
      accuracy_m: null,
      coord_source: "manual",
      coord_confirmed: true,
      sgg_cd: v.sggCd,
      admin_dong: v.adminDong,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "위치를 저장하지 못했습니다. 다시 시도해 주세요." };
  // 회원이 직접 적은 주소는 그대로 두고, 자동 주소이거나 비어 있을 때만 새 위치의 주소로 바꾼다
  if (v.address !== undefined) {
    await db
      .from("real_estate_onsite_properties")
      .update({ address: v.address || null, address_source: v.address ? "auto" : null })
      .eq("id", id)
      .eq("user_id", user.id)
      .or("address_source.is.null,address_source.eq.auto");
  }
  revalidatePath("/onsite");
  return { ok: true };
}

export async function deleteOnsitePhotoAction(photoId: string): Promise<OnsiteResult> {
  const { user, db } = await requireOnsiteUser();
  const { data } = await db.from("real_estate_onsite_photos").select("storage_path").eq("id", photoId).eq("user_id", user.id).maybeSingle();
  if (!data) return { ok: false, error: "사진을 찾지 못했습니다." };
  const { error } = await createAdminClient().storage.from(ONSITE_BUCKET).remove([data.storage_path]);
  if (error) return { ok: false, error: "사진을 지우지 못했습니다. 다시 시도해 주세요." };
  await db.from("real_estate_onsite_photos").delete().eq("id", photoId).eq("user_id", user.id);
  revalidatePath("/onsite");
  return { ok: true };
}

export async function deleteOnsitePropertyAction(id: string): Promise<OnsiteResult> {
  const { user, db } = await requireOnsiteUser();
  const { data: photos } = await db.from("real_estate_onsite_photos").select("storage_path").eq("property_id", id).eq("user_id", user.id);
  const paths = ((photos ?? []) as { storage_path: string }[]).map((p) => p.storage_path);
  if (paths.length) {
    const { error } = await createAdminClient().storage.from(ONSITE_BUCKET).remove(paths);
    if (error) return { ok: false, error: "사진을 지우지 못했습니다. 다시 시도해 주세요." };
  }
  const { error } = await db.from("real_estate_onsite_properties").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "지우지 못했습니다. 다시 시도해 주세요." };
  revalidatePath("/onsite");
  return { ok: true };
}
