import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.20 작업 히스토리를 회원 계정에 저장 — 표 aif_history(본인 읽기만, 쓰기는 이 서버만) + 비공개 버킷 aif-history.
// 회원당 최근 30개, 생성 30일 지나면 목록을 불러올 때 지운다(최상위 규칙: 생성 데이터 30일 삭제). 플랜 docs/PLAN_20261020_HISTORY_DB.md
const TABLE = "aif_history";
const BUCKET = "aif-history";
const MAX_ITEMS = 30;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
/** 설정 중 사진 데이터(얼굴·장소·상품 사진, 직전 결과)는 저장하지 않는다 — 글자 설정만 */
const PHOTO_KEYS = ["personImage", "placeImage", "productImages", "lastResultImage"];

type Row = { id: string; image_path: string; captions: unknown; config: unknown; summary: string; created_at: string };

async function removeRows(admin: ReturnType<typeof createAdminClient>, userId: string, rows: Pick<Row, "id" | "image_path">[]) {
  if (!rows.length) return;
  await admin.storage.from(BUCKET).remove(rows.map((r) => r.image_path)).catch(() => undefined);
  await admin.from(TABLE).delete().eq("user_id", userId).in("id", rows.map((r) => r.id));
}

/** GET — 내 히스토리(최근 30개, 이미지는 1시간 서명 주소). 30일 지난 것·30개 넘는 것은 먼저 지운다. */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient();
  const userId = access.user.id;

  const { data, error } = await admin.from(TABLE).select("id, image_path, captions, config, summary, created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "작업 히스토리를 불러오지 못했습니다." }, { status: 500 });
  const rows = (data ?? []) as Row[];
  const cutoff = Date.now() - RETENTION_MS;
  const keep = rows.filter((r, i) => i < MAX_ITEMS && Date.parse(r.created_at) > cutoff);
  await removeRows(admin, userId, rows.filter((r) => !keep.includes(r)));

  const signed = keep.length ? (await admin.storage.from(BUCKET).createSignedUrls(keep.map((r) => r.image_path), 60 * 60)).data ?? [] : [];
  const urlOf = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return NextResponse.json({
    items: keep.map((r) => ({ id: r.id, createdAt: r.created_at, imageUrl: urlOf.get(r.image_path) ?? "", captions: r.captions, config: r.config, summary: r.summary })),
  });
}

/** POST — 히스토리 한 건 저장. body: { image: "data:image/jpeg;base64,…", captions: string[], config: object, summary: string } */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await request.json().catch(() => null)) as { image?: unknown; captions?: unknown; config?: unknown; summary?: unknown } | null;
  const m = typeof body?.image === "string" ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.image) : null;
  if (!m) return NextResponse.json({ error: "저장할 이미지가 올바르지 않습니다." }, { status: 400 });
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 400 });

  const captions = Array.isArray(body?.captions) ? body.captions.filter((c): c is string => typeof c === "string").slice(0, 10).map((c) => c.slice(0, 3000)) : [];
  const config: Record<string, unknown> = body?.config && typeof body.config === "object" && !Array.isArray(body.config) ? { ...(body.config as Record<string, unknown>) } : {};
  for (const k of PHOTO_KEYS) delete config[k];
  const summary = typeof body?.summary === "string" ? body.summary.slice(0, 200) : "";

  const admin = createAdminClient();
  const userId = access.user.id;
  const id = crypto.randomUUID();
  const path = `${userId}/history/${id}.jpg`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (upErr) return NextResponse.json({ error: "이미지를 저장하지 못했습니다." }, { status: 500 });
  const { data: row, error } = await admin.from(TABLE).insert({ id, user_id: userId, image_path: path, captions, config, summary }).select("created_at").single();
  if (error || !row) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => undefined);
    return NextResponse.json({ error: "작업 히스토리를 저장하지 못했습니다." }, { status: 500 });
  }

  // 30개를 넘으면 오래된 것부터 지운다
  const { data: extra } = await admin.from(TABLE).select("id, image_path").eq("user_id", userId).order("created_at", { ascending: false }).range(MAX_ITEMS, MAX_ITEMS + 50);
  await removeRows(admin, userId, (extra ?? []) as Pick<Row, "id" | "image_path">[]);

  const { data: s } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return NextResponse.json({ item: { id, createdAt: row.created_at, imageUrl: s?.signedUrl ?? "", captions, config, summary } });
}

/** DELETE — ?id=한 건 / ?all=1 전체 */
export async function DELETE(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient();
  const userId = access.user.id;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all") === "1";
  if (!id && !all) return NextResponse.json({ error: "지울 항목을 알려 주세요." }, { status: 400 });
  let q = admin.from(TABLE).select("id, image_path").eq("user_id", userId);
  if (id) q = q.eq("id", id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "작업 히스토리를 지우지 못했습니다." }, { status: 500 });
  await removeRows(admin, userId, (data ?? []) as Pick<Row, "id" | "image_path">[]);
  return NextResponse.json({ ok: true, removed: (data ?? []).length });
}
