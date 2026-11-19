// 큰 파일(4MB 초과 ~ 50MB) 올리기(2026-11-14, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md A).
// POST { step: "sign", name, type, size, spaceId } → 서명된 Storage 올리기 주소
// POST { step: "done", id, blockId }               → 실제로 올라갔는지 확인하고 파일 주소
// POST { step: "import-*", jobId, … }              → 큰 ZIP 가져오기 작업(2026-11-19, fileStorage.ts importJobStep)
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { memberFromUser } from "@/server/member";
import { finishLargeUpload, importJobStep, signLargeUpload } from "@/server/fileStorage";
import "@/server/runtime";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return NextResponse.json({ message: "Cross-site request blocked" }, { status: 403 });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ message: access.error }, { status: access.status });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const member = memberFromUser(access.user);
  const r = typeof body.step === "string" && body.step.startsWith("import-") ? await importJobStep(member, body)
    : body.step === "done" ? await finishLargeUpload(member, body) : await signLargeUpload(member, body);
  return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "private, no-store" } });
}
