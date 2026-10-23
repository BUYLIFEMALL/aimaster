import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { detectImage, inPath, isOwnPath, sizeError } from "@/lib/bnc/paths";
import { remove, signUpload, sweepInputs } from "@/lib/files";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 임시 업로드 서명 발급 — 브라우저가 Storage로 직접 올린다(Vercel 4.5MB 본문 한도 회피) */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  let body: { name?: unknown; mime?: unknown; size?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const det = detectImage(typeof body.name === "string" ? body.name.slice(0, 200) : "", typeof body.mime === "string" ? body.mime : "");
  if (!det) return json({ error: "지원하지 않는 형식입니다. JPG·PNG·WEBP 이미지만 올릴 수 있습니다." }, 400);
  const big = sizeError(Number(body.size));
  if (big) return json({ error: big }, 413);

  await sweepInputs(access.user.id);
  const path = inPath(access.user.id, randomUUID(), det.ext);
  const signed = await signUpload(path);
  if (!signed) return json({ error: "업로드 준비에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  return json({ path, token: signed.token, mime: det.mime });
}

/** 임시 파일 즉시 삭제(본인 파일만) */
export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const path = request.nextUrl.searchParams.get("path");
  if (!isOwnPath(access.user.id, path)) return json({ error: "삭제할 파일이 올바르지 않습니다." }, 400);
  await remove([path]);
  return json({ ok: true });
}
