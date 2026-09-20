import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// Vercel Functions 기본 실행시간 한도(300초)에 안전하게 걸리도록, 스트림 자체는 4분마다
// 스스로 끊는다(끊기면 클라이언트가 새 연결로 이어붙임 — 아래 ConverterWorkspace.tsx의
// onerror 재연결 로직 참고). 이전엔 여기서 10분을 기다리려다가 300초 만에 Vercel이
// 강제 종료시켜서(Runtime Timeout Error) 클라이언트가 진행률을 더 못 받는 문제가 있었다.
export const maxDuration = 290;

// EventSource는 커스텀 헤더를 못 붙이므로, 쿠키가 아직 최신이 아닐 때를 대비한 fallback
// 토큰은 쿼리스트링(?token=...)으로 받는다 — checkProgramAccessApi가 Authorization
// 헤더가 없으면 이 쿼리스트링도 확인한다.
export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  const access = await checkProgramAccessApi(request);
  if (!access.allowed) return new Response(JSON.stringify({ error: access.error }), { status: access.status, headers: { "content-type": "application/json" } });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const supabase = await createClient();
      const startedAt = Date.now();
      try {
        while (Date.now() - startedAt < 4 * 60 * 1000) {
          const { data: job } = await supabase.from("videotogif_conversions").select("job_id,status,progress_percent,progress_message,error_message,file_size_bytes,output_key").eq("job_id", params.jobId).eq("user_id", access.user.id).maybeSingle();
          if (!job) { controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "작업을 찾을 수 없습니다." })}\n\n`)); break; }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
          if (job.status === "done" || job.status === "error") break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-store", connection: "keep-alive" } });
}
