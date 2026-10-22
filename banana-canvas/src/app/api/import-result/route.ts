import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { outPath } from "@/lib/bnc/paths";
import { MAX_HISTORY, type OutputItem } from "@/lib/bnc/types";
import { remove, upload } from "@/lib/files";
import { readResaveBody, resaveCors } from "@/lib/bnc/resaveReceiver";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.31(/api/import-result — /api/import는 원본 가져오기용이라 다른 경로): 이미지 변환 스튜디오 「바나나 기록에 다시 저장」 — 변환한 그림 1장을 본인 결과 기록(작업 종류 `import`)으로 추가한다.
// CORS·본문 읽기·형식 판별은 공용 기준 코드 `resave-receiver` 사본(src/lib/bnc/resaveReceiver.ts, 기준 4컷 — 직접 고치지 않음). 가로세로는 sharp로. AI 호출 없음.
/** base64 한도(Vercel 요청 본문 4.5MB 이하, 약 2.2MB 그림) */
export const MAX_IMPORT_B64 = 3_000_000;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: resaveCors(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const res = await importPost(request);
  for (const [k, v] of Object.entries(resaveCors(request.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

async function importPost(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const r = readResaveBody(await request.text(), MAX_IMPORT_B64);
  if (!r.ok) return json({ error: r.error }, r.status);
  // 첫 바이트 판별에 더해 실제로 열어 가로세로를 잰다(깨진 파일 거절)
  const meta = await sharp(r.bytes).metadata().catch(() => null);
  if (!meta?.width || !meta.height) return json({ error: "JPEG·PNG·WebP 그림만 저장할 수 있습니다." }, 400);

  const userId = access.user.id;
  const path = outPath(userId, crypto.randomUUID(), r.ext);
  if (!(await upload(path, r.bytes, r.mime))) return json({ error: "그림을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  const outputs: OutputItem[] = [{ path, mime: r.mime, w: meta.width, h: meta.height }];
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("banana_canvas_results")
    .insert({ user_id: userId, kind: "import", title: r.label ? `${r.label} · ${r.ext.toUpperCase()}` : "변환 스튜디오에서 다시 저장", options: { importedFrom: "image-convert-studio", format: r.ext }, outputs, model_used: "" })
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
