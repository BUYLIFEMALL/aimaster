import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { outPath } from "@/lib/bnc/paths";
import { MAX_HISTORY, type OutputItem } from "@/lib/bnc/types";
import { remove, upload } from "@/lib/files";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.31(/api/import-result — /api/import는 원본 가져오기용이라 다른 경로): 이미지 변환 스튜디오 「바나나 기록에 다시 저장」 — 변환한 그림 1장을 본인 결과 기록(작업 종류 `import`)으로 추가한다.
// 그 주소만, 회원 본인 로그인 쿠키(.buylife.xyz)로 POST 허용. AI 호출 없음. 실행 가능한 작업 목록(`KINDS`)에는 없다.
const IMPORT_ORIGIN = "https://image-convert-studio.buylife.xyz";
/** base64 한도(Vercel 요청 본문 4.5MB 이하, 약 2.2MB 그림) */
export const MAX_IMPORT_B64 = 3_000_000;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const FORMATS: Record<string, { mime: string; ext: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
};

function cors(request: NextRequest): Record<string, string> {
  return request.headers.get("origin") === IMPORT_ORIGIN
    ? { "Access-Control-Allow-Origin": IMPORT_ORIGIN, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
    : {};
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(request) });
}

export async function POST(request: NextRequest) {
  const res = await importPost(request);
  for (const [k, v] of Object.entries(cors(request))) res.headers.set(k, v);
  return res;
}

async function importPost(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const raw = await request.text();
  if (raw.length > MAX_IMPORT_B64 + 2_000) return json({ error: "이미지가 너무 큽니다." }, 413);
  let body: { image?: { data?: unknown } } = {};
  try { body = JSON.parse(raw); } catch { /* 아래에서 처리 */ }
  const data = body.image?.data;
  if (typeof data !== "string" || data.length < 100 || data.length > MAX_IMPORT_B64 || !B64.test(data)) return json({ error: "이미지 데이터가 올바르지 않습니다." }, 400);

  // 보낸 쪽이 적은 형식은 믿지 않고 실제로 열어 형식·크기를 확인한다
  const bytes = Buffer.from(data, "base64");
  const meta = await sharp(bytes).metadata().catch(() => null);
  const fmt = meta?.format ? FORMATS[meta.format] : undefined;
  if (!meta || !fmt || !meta.width || !meta.height) return json({ error: "JPEG·PNG·WebP 그림만 저장할 수 있습니다." }, 400);

  const userId = access.user.id;
  const path = outPath(userId, crypto.randomUUID(), fmt.ext);
  if (!(await upload(path, bytes, fmt.mime))) return json({ error: "그림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  const outputs: OutputItem[] = [{ path, mime: fmt.mime, w: meta.width, h: meta.height }];
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("banana_canvas_results")
    .insert({ user_id: userId, kind: "import", title: "변환 스튜디오에서 다시 저장", options: { importedFrom: "image-convert-studio", format: meta.format }, outputs, model_used: "" })
    .select("id")
    .single();
  if (error || !row) {
    await remove([path]);
    return json({ error: "기록을 저장하지 못했습니다. 다시 시도해 주세요." }, 500);
  }

  // 기록은 최대 MAX_HISTORY건: 즐겨찾기가 아닌 오래된 것부터 정리(파일 포함) — /api/run과 같은 규칙
  const { data: old } = await admin
    .from("banana_canvas_results").select("id, outputs").eq("user_id", userId).eq("favorite", false)
    .order("created_at", { ascending: false }).range(MAX_HISTORY, MAX_HISTORY + 100);
  if (old?.length) {
    await admin.from("banana_canvas_results").delete().eq("user_id", userId).in("id", old.map((r) => r.id as string));
    await remove(old.flatMap((r) => ((r.outputs as OutputItem[]) ?? []).map((o) => o.path)));
  }
  return json({ id: row.id });
}
