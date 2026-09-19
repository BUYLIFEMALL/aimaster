import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  const { data: job, error } = await supabase.from("videotogif_conversions").select("*").eq("job_id", params.jobId).eq("user_id", access.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "작업 상태를 조회하지 못했습니다." }, { status: 500 });
  if (!job) return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  let downloadUrl: string | null = null;
  if (job.output_key) {
    const signed = await supabase.storage.from("videotogif-results").createSignedUrl(job.output_key, 3600, { download: `${job.original_name.replace(/\.[^.]+$/, "")}.gif` });
    downloadUrl = signed.data?.signedUrl ?? null;
  }
  return NextResponse.json({ job, downloadUrl });
}

export async function DELETE(_request: Request, { params }: { params: { jobId: string } }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = await createClient();
  const { data: job } = await supabase.from("videotogif_conversions").select("output_key").eq("job_id", params.jobId).eq("user_id", access.user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  if (job.output_key) await supabase.storage.from("videotogif-results").remove([job.output_key]);
  const { error } = await supabase.from("videotogif_conversions").delete().eq("job_id", params.jobId).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: "작업을 삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
