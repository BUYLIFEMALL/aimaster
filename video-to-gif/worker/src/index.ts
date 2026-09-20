import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "1mb" })); // 파일 바이트는 안 받는다 — 저장 경로 등 메타데이터만.
const port = Number(process.env.PORT ?? 8080);
const secret = process.env.VIDEOTOGIF_WORKER_SECRET ?? "";
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;
if (!secret || !supabase) {
  throw new Error("VIDEOTOGIF_WORKER_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required");
}
interface QueuedFile { storagePath: string; name: string; size: number }
const queue: Array<{ jobId: string; file: QueuedFile; userId: string; fps: number; width: number }> = [];
let running = false;

app.get("/healthz", (_req, res) => res.status(200).json({ ok: true, service: "videotogif-worker" }));
app.use((req, res, next) => { if (req.header("authorization") !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" }); next(); });

// 브라우저는 파일을 Supabase Storage(videotogif-uploads)에 직접 올려두고, 여기엔 그
// 저장 경로만 전달한다 — 이 워커가 Storage에서 직접 내려받아 변환한다.
app.post("/jobs", async (req, res) => {
  const files = Array.isArray(req.body?.files) ? (req.body.files as QueuedFile[]) : [];
  const userId = String(req.body?.userId ?? "");
  const fps = Number(req.body?.fps ?? 40);
  const width = Number(req.body?.width ?? 560);
  if (!userId || !files.length || ![40, 50].includes(fps) || width < 160 || width > 800) return res.status(400).json({ error: "Invalid job" });
  if (files.reduce((total, file) => total + file.size, 0) > 1024 * 1024 * 1024) {
    return res.status(413).json({ error: "Total upload size exceeds 1GiB" });
  }
  const jobs = files.map((file) => ({ jobId: crypto.randomUUID(), file, userId, fps, width }));
  const { error } = await supabase.from("videotogif_conversions").insert(jobs.map(({ jobId, file, userId, fps, width }) => ({
    job_id: jobId, user_id: userId, original_name: file.name, original_size_bytes: file.size, input_key: file.storagePath,
    options_fps: fps, options_width: width, status: "pending", progress_message: "변환 대기 중",
  })));
  if (error) {
    return res.status(500).json({ error: "작업을 저장하지 못했습니다." });
  }
  jobs.forEach((job) => queue.push(job));
  void drain();
  return res.status(202).json({ jobs: jobs.map(({ jobId, file }) => ({ jobId, name: file.name, status: "pending" })) });
});

async function drain() { if (running) return; running = true; while (queue.length) { const job = queue.shift()!; try { await convert(job); } catch (error) { console.error("conversion failed", error); } } running = false; }

async function convert(job: { jobId: string; file: QueuedFile; userId: string; fps: number; width: number }) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "videotogif-job-"));
  try {
    await updateJob(job.jobId, { status: "processing", progress_percent: 5, progress_message: "원본 파일을 내려받고 있습니다." });
    const download = await supabase!.storage.from("videotogif-uploads").download(job.file.storagePath);
    if (download.error) throw download.error;
    const input = path.join(workDir, path.basename(job.file.storagePath));
    const output = path.join(workDir, "output.gif");
    await fs.writeFile(input, Buffer.from(await download.data.arrayBuffer()));
    const candidates = [
      { scale: 1, colors: 256, fps: job.fps }, { scale: .94, colors: 256, fps: job.fps }, { scale: .86, colors: 256, fps: job.fps }, { scale: .76, colors: 256, fps: job.fps },
      { scale: .68, colors: 224, fps: job.fps }, { scale: .60, colors: 192, fps: job.fps }, { scale: .52, colors: 160, fps: 40 }, { scale: .45, colors: 128, fps: 40 },
    ];
    await updateJob(job.jobId, { progress_percent: 10, progress_message: "변환을 준비하고 있습니다." });
    for (const [index, candidate] of candidates.entries()) {
      const scale = Math.max(1, Math.floor(job.width * candidate.scale));
      await updateJob(job.jobId, { progress_percent: 15 + index * 10, progress_message: `품질 최적화 ${index + 1}/${candidates.length}` });
      await runFfmpeg(["-y", "-i", input, "-vf", `fps=${candidate.fps},scale=${scale}:-1:flags=lanczos,palettegen=max_colors=${candidate.colors}:stats_mode=diff`, path.join(workDir, "palette.png")]);
      await runFfmpeg(["-y", "-i", input, "-i", path.join(workDir, "palette.png"), "-lavfi", `fps=${candidate.fps},scale=${scale}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a:diff_mode=rectangle`, output]);
      const stat = await fs.stat(output); if (stat.size <= 8 * 1024 * 1024) break;
    }
    const stat = await fs.stat(output); if (stat.size > 8 * 1024 * 1024) throw new Error("GIF remains larger than 8MiB after optimization");
    const outputKey = `${job.userId}/${job.jobId}.gif`;
    const result = await supabase!.storage.from("videotogif-results").upload(outputKey, await fs.readFile(output), { contentType: "image/gif", upsert: false });
    if (result.error) throw result.error;
    await updateJob(job.jobId, { status: "done", progress_percent: 100, progress_message: "변환 완료", output_key: outputKey, file_size_bytes: stat.size, completed_at: new Date().toISOString() });
    console.log(JSON.stringify({ event: "conversion_done", jobId: job.jobId, userId: job.userId, size: stat.size }));
  } catch (error) {
    await updateJob(job.jobId, { status: "error", progress_message: "변환에 실패했습니다.", error_message: error instanceof Error ? error.message : "Unknown conversion error" });
    throw error;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
    // 변환 성공/실패와 무관하게 원본은 더 이상 필요 없으니 Storage에서 지워 용량을 아낀다.
    // input_key도 함께 null 처리해서, "이 작업엔 더 이상 지울 원본이 없다"는 걸 DB만 보고
    // 정확히 알 수 있게 한다(정리 크론이 워커 재시작 등으로 이 정리가 안 된 고아 파일만
    // 골라내는 기준이 된다).
    await supabase!.storage.from("videotogif-uploads").remove([job.file.storagePath]).catch(() => {});
    await updateJob(job.jobId, { input_key: null });
  }
}

async function updateJob(jobId: string, values: Record<string, unknown>) {
  const { error } = await supabase!.from("videotogif_conversions").update(values).eq("job_id", jobId);
  if (error) console.error("job state update failed", jobId, error.message);
}

function runFfmpeg(args: string[]) { return new Promise<void>((resolve, reject) => { const child = spawn(process.env.FFMPEG_PATH ?? "ffmpeg", args); let stderr = ""; child.stderr.on("data", (chunk) => { stderr += chunk.toString(); }); child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.slice(-2000)))); }); }

app.listen(port, () => console.log(`VideoToGIF worker listening on ${port}`));
