import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInRetentionGrace, retentionCutoff, RETENTION_DAYS, RETENTION_GRACE_END } from "@/lib/retention";
import { exemptInFilter, loadRetentionExemptIds } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const TABLE = "ui_canvas_projects";
const PROJECTS_PER_RUN = 500;

// CRON_SECRET Bearer 인증. 비어 있으면 통과시키지 않는다.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * 2026-11-13 생성 자료 30일 자동 정리. 매일 1회(vercel.json).
 * 만든 지 30일 지난 프로젝트 행(ui_canvas_projects — 캔버스 문서·저장한 AI 컴포넌트가 doc 안에 함께 있음)을 지운다.
 * 예외 회원(profiles.retention_exempt)은 지우지 않는다. 이 프로그램은 저장소 파일을 쓰지 않는다.
 * 로그·응답에는 개수만 남긴다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isInRetentionGrace()) {
    return NextResponse.json({ skipped: "grace", graceEnd: RETENTION_GRACE_END, retentionDays: RETENTION_DAYS });
  }

  const admin = createAdminClient();
  const cutoff = retentionCutoff();
  let exempt: Set<string>;
  try {
    exempt = await loadRetentionExemptIds(admin);
  } catch {
    return NextResponse.json({ error: "자동 삭제 예외 회원 목록을 읽지 못해 정리를 멈췄습니다." }, { status: 503 });
  }
  const exemptFilter = exemptInFilter(exempt);
  const errors: string[] = [];
  let projectsDeleted = 0;

  let query = admin.from(TABLE).select("id").lt("created_at", cutoff);
  if (exemptFilter) query = query.not("user_id", "in", exemptFilter);
  const { data: expired, error: expiredError } = await query.limit(PROJECTS_PER_RUN);
  if (expiredError) errors.push(`${TABLE}: ${expiredError.message}`);

  const ids = (expired ?? []).map((r) => r.id as string);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error } = await admin.from(TABLE).delete().in("id", chunk);
    if (error) errors.push(`${TABLE} 삭제: ${error.message}`);
    else projectsDeleted += chunk.length;
  }

  const result = { cutoff, retentionDays: RETENTION_DAYS, projectsDeleted };
  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
