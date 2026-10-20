import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/extensionBridge";
import { leaseExpired, ownsExecution, readExecution } from "@/lib/executionRuns";
import { PrivatePhotoError, signPrivatePhotos } from "@/lib/privatePhotos";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 긴 원고 입력 중에도 현재 실행에 속한 사진만 다운로드 직전에 갱신한다. */
export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const auth = await authenticateExtension(req);
    if (!auth.ok) return reply({ error: auth.error }, auth.status);
    const body = await req.json().catch(() => null);
    if (typeof body?.taskId !== "string" || typeof body?.runId !== "string" || typeof body?.storagePath !== "string") {
      return reply({ error: "사진을 사용할 현재 실행을 확인해 주세요." }, 400);
    }
    const { data: row, error } = await auth.admin.from("nba_posts").select("status,images,research_summary")
      .eq("id", body.taskId).eq("user_id", auth.userId).maybeSingle();
    if (error) return reply({ error: "사진 실행 정보를 확인하지 못했습니다." }, 503);
    if (!row) return reply({ error: "사진 작업을 찾을 수 없습니다." }, 404);
    const run = readExecution(row.research_summary);
    if (row.status !== "publishing" || !run || !ownsExecution(run, body.runId, auth.token) || leaseExpired(run)) {
      return reply({ error: "사진을 사용하는 실행이 종료되거나 변경되었습니다." }, 409);
    }
    if (!Array.isArray(row.images) || !row.images.some((image: any) => image?.storagePath === body.storagePath)) {
      return reply({ error: "이 원고에 연결된 사진을 찾을 수 없습니다." }, 404);
    }
    const [photo] = await signPrivatePhotos(auth.admin, auth.userId, [body.storagePath]);
    return reply({ photo });
  } catch (error) {
    return reply({ error: error instanceof PrivatePhotoError ? error.message : "사진 임시 주소를 확인하지 못했습니다." }, error instanceof PrivatePhotoError ? error.status : 503);
  }
}
