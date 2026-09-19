import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const upload = multer({ dest: path.join(os.tmpdir(), "videotogif-inputs"), limits: { fileSize: 200 * 1024 * 1024, files: 20 } });
const port = Number(process.env.PORT ?? 8080);
const secret = process.env.VIDEOTOGIF_WORKER_SECRET ?? "";
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;
if (!secret || !supabase) {
  throw new Error("VIDEOTOGIF_WORKER_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required");
}
const queue: Array<{ jobId: string; file: Express.Multer.File; userId: string; fps: number; width: number }> = [];
let running = false;

app.get("/healthz", (_req, res) => res.status(200).json({ ok: true, service: "videotogif-worker" }));
app.use((req, res, next) => { if (req.header("authorization") !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" }); next(); });

app.post("/jobs", upload.array("files", 20), async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  const userId = String(req.body.userId ?? "");
  const fps = Number(req.body.fps ?? 40);
  const width = Number(req.body.width ?? 560);
  if (!userId || !files.length || ![40, 50].includes(fps) || width < 160 || width > 800) return res.status(400).json({ error: "Invalid job" });
  if (files.reduce((total, file) => total + file.size, 0) > 1024 * 1024 * 1024) {
    await Promise.all(files.map((file) => fs.rm(file.path, { force: true })));
    return res.status(413).json({ error: "Total upload size exceeds 1GiB" });
  }
  const jobs = files.map((file) => ({ jobId: crypto.randomUUID(), file, userId, fps, width }));
  const { error } = await supabase.from("videotogif_conversions").insert(jobs.map(({ jobId, file, userId, fps, width }) => ({
    job_id: jobId, user_id: userId, original_name: file.originalname, original_size_bytes: file.size,
    options_fps: fps, options_width: width, status: "pending", progress_message: "변환 대기 중",
  })));
  if (error) {
    await Promise.all(files.map((file) => fs.rm(file.path, { force: true })));
    return res.status(500).json({ error: "작업을 저장하지 못했습니다." });
  }
  jobs.forEach((job) => queue.push(job));
  void drain();
  return res.status(202).json({ jobs: jobs.map(({ jobId, file }) => ({ jobId, name: file.originalname, status: "pending" })) });
});

async function drain() { if (running) return; running = true; while (queue.length) { const job = queue.shift()!; try { await convert(job); } catch (error) { console.error("conversion failed", error); } } running = false; }

async function convert(job: { jobId: string; file: Express.Multer.File; userId: string; fps: number; width: number }) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "videotogif-job-"));
  try {
    await updateJob(job.jobId, { status: "processing", progress_percent: 5, progress_message: "변환을 준비하고 있습니다." });
    const input = path.join(workDir, path.basename(job.file.path)); const output = path.join(workDir, "output.gif");
    await fs.rename(job.file.path, input);
    const candidates = [
      { scale: 1, colors: 256, fps: job.fps }, { scale: .94, colors: 256, fps: job.fps }, { scale: .86, colors: 256, fps: job.fps }, { scale: .76, colors: 256, fps: job.fps },
      { scale: .68, colors: 224, fps: job.fps }, { scale: .60, colors: 192, fps: job.fps }, { scale: .52, colors: 160, fps: 40 }, { scale: .45, colors: 128, fps: 40 },
    ];
    for (const [index, candidate] of candidates.entries()) {
      const scale = Math.max(1, Math.floor(job.width * candidate.scale));
      await updateJob(job.jobId, { progress_percent: 10 + index * 10, progress_message: `품질 최적화 ${index + 1}/${candidates.length}` });
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
  } finally { await fs.rm(workDir, { recursive: true, force: true }); }
}

async function updateJob(jobId: string, values: Record<string, unknown>) {
  const { error } = await supabase!.from("videotogif_conversions").update(values).eq("job_id", jobId);
  if (error) console.error("job state update failed", jobId, error.message);
}

function runFfmpeg(args: string[]) { return new Promise<void>((resolve, reject) => { const child = spawn(process.env.FFMPEG_PATH ?? "ffmpeg", args); let stderr = ""; child.stderr.on("data", (chunk) => { stderr += chunk.toString(); }); child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.slice(-2000)))); }); }

app.listen(port, () => console.log(`VideoToGIF worker listening on ${port}`));
