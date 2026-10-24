// 렌더러 「loop」 명령 묶음 시험 — 윈도우(host.ps1)·맥(host.pl) × 여러 경우.
// ① 렌더러가 만든 필터 = 무한 루프 영상 plan.ts buildFilter() ② 결과 길이 ≈ 1회분 × 반복(GIF는 1회분) ③ 소리 트랙이 있어야 할 때만 있음.
// 쓰는 법(무한 루프 영상 폴더의 tsx 사용): cd infinite-loop-video && node --import tsx ../video-to-gif/local-renderer/test/loop-matrix.mjs <소리 없는 mp4> <소리 있는 mp4> [ps1|pl|both]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const plan = await import(pathToFileURL(resolve(here, "../../../infinite-loop-video/src/lib/loop/plan.ts")).href);
const [silent, audio, which = "both"] = process.argv.slice(2);
const kinds = which === "both" ? ["ps1", "pl"] : [which];
const probe = (f, entries) => execFileSync("ffprobe", ["-v", "error", ...entries, "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
const durOf = (f) => Number(probe(f, ["-show_entries", "format=duration"]));
const srcDur = (f) => Number(probe(f, ["-show_entries", "format=duration"]));

const cases = [
  { name: "smart mp4 ×3 (소리 없음)", file: silent, cmd: { mode: "smart", start: 0, end: 4, crossfade: 0.5, repeat: 3, format: "mp4" }, audio: false },
  { name: "smart mp4 ×2 (소리 있음)", file: audio, cmd: { mode: "smart", start: 0.5, end: 4.5, crossfade: 0.8, repeat: 2, format: "mp4" }, audio: true },
  { name: "overlap mp4 ×1 (소리 있음)", file: audio, cmd: { mode: "overlap", start: 0, end: 5, crossfade: 1, repeat: 1, format: "mp4" }, audio: true },
  { name: "bounce webm ×2 (소리 있음)", file: audio, cmd: { mode: "bounce", start: 1, end: 3, crossfade: 0, repeat: 2, format: "webm" }, audio: true },
  { name: "smart gif (소리 있음 → GIF는 소리 없음)", file: audio, cmd: { mode: "smart", start: 0, end: 3, crossfade: 0.5, repeat: 5, format: "gif" }, audio: false },
];

const out = mkdtempSync(join(tmpdir(), "loop-matrix-"));
let fail = 0;
for (const kind of kinds) {
  for (const c of cases) {
    const duration = srcDur(c.file);
    const cmd = { type: "loop", ...c.cmd, duration: +duration.toFixed(3) };
    const dest = join(out, `${kind}-${c.name.replace(/[^a-z0-9]+/gi, "-")}.${c.cmd.format}`);
    const line = execFileSync("node", [join(here, "host-harness.mjs"), kind, c.file, JSON.stringify(cmd), dest], { encoding: "utf8" }).trim().split("\n").pop();
    const r = JSON.parse(line);
    const problems = [];
    if (!r.ok) problems.push("실패: " + (r.error || "크기 다름"));
    else {
      const want = plan.buildFilter(plan.normalize({ ...c.cmd, duration: cmd.duration, hasAudio: c.audio })).filter;
      if (r.filter !== want) problems.push(`필터 다름\n   렌더러 ${r.filter}\n   plan.ts ${want}`);
      if (r.hasAudio !== c.audio) problems.push(`hasAudio ${r.hasAudio} (기대 ${c.audio})`);
      const unit = plan.unitLength(plan.normalize({ ...c.cmd, duration: cmd.duration, hasAudio: c.audio }));
      const expect = c.cmd.format === "gif" ? unit : unit * c.cmd.repeat;
      const got = durOf(dest);
      if (Math.abs(got - expect) > 0.25) problems.push(`길이 ${got.toFixed(2)}초 (기대 ${expect.toFixed(2)}초)`);
      const hasA = probe(dest, ["-select_streams", "a", "-show_entries", "stream=codec_name"]).length > 0;
      if (hasA !== c.audio) problems.push(`결과 소리 트랙 ${hasA} (기대 ${c.audio})`);
    }
    if (problems.length) fail++;
    console.log(`${problems.length ? "✖" : "✔"} [${kind}] ${c.name} — ${r.ms ?? "?"}ms ${r.size ?? ""}B${problems.length ? "\n   " + problems.join("\n   ") : ""}`);
  }
}
rmSync(out, { recursive: true, force: true });
console.log(fail ? `실패 ${fail}건` : "모두 통과");
process.exitCode = fail ? 1 : 0;
