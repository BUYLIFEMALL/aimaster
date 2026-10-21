import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { detectImage, inPath } from "@/lib/bnc/paths";
import { MAX_UPLOAD_BYTES } from "@/lib/bnc/types";
import { signUrls, sweepInputs, upload } from "@/lib/files";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 다른 AIMaster 프로그램이 보낸 이미지를 원본으로 가져온다(v1.14, 「AI 이미지 스튜디오 → 바나나 캔버스로 보내 편집」).
// 아무 주소나 서버가 받아 오지 않도록, 우리 Supabase 저장소의 서명 주소이면서 허용한 버킷의 「본인 폴더」인 것만 받는다.
const ALLOWED_BUCKETS = ["ai-image-generations"];

function allowed(raw: unknown, userId: string): URL | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  const own = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.local");
  if (u.protocol !== "https:" || u.host !== own.host) return null;
  const ok = ALLOWED_BUCKETS.some((b) => decodeURIComponent(u.pathname).startsWith(`/storage/v1/object/sign/${b}/${userId}/`));
  return ok ? u : null;
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: { url?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const src = allowed(body.url, access.user.id);
  if (!src) return json({ error: "가져올 수 없는 이미지 주소입니다. 본인이 만든 AI 이미지 스튜디오 결과만 가져올 수 있습니다." }, 400);

  let res: Response;
  try { res = await fetch(src, { signal: AbortSignal.timeout(20_000), redirect: "error" }); }
  catch { return json({ error: "이미지를 받아 오지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502); }
  if (!res.ok) return json({ error: "이미지 주소가 만료됐거나 찾을 수 없습니다. AI 이미지 스튜디오에서 다시 보내 주세요.", expired: true }, 400);
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const det = detectImage(`x.${mime.split("/")[1] ?? ""}`, mime);
  if (!det) return json({ error: "JPG·PNG·WEBP 이미지만 가져올 수 있습니다." }, 400);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) return json({ error: "이미지 크기가 15MB를 넘어 가져올 수 없습니다." }, 413);

  await sweepInputs(access.user.id);
  const path = inPath(access.user.id, randomUUID(), det.ext);
  if (!(await upload(path, bytes, det.mime))) return json({ error: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, 500);
  const urls = await signUrls([path]);
  return json({ path, url: urls[path] ?? null });
}
