// 렌더러 「normalize」·「compress」 명령 묶음 시험 — 윈도우(host.ps1)·맥(host.pl) × 여러 경우 + 잘못된 값 거절.
// ① 결과가 H.264·yuv420p·짝수 크기·긴 변 제한 ② normalize는 고정 fps, 소리가 있으면 AAC 48k 2채널 ③ compress는 용량이 줄어듦 ④ 잘못된 값은 거절.
// 쓰는 법: node video-matrix.mjs <소리 없는 mp4> <소리 있는 mp4> [ps1|pl|both]   (맥판을 윈도우에서 돌릴 때는 PL_FFMPEG=<ffmpeg 실제 경로>)
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [silent, audio, which = "both"] = process.argv.slice(2);
const kinds = which === "both" ? ["ps1", "pl"] : [which];
const probe = (f, entries) => execFileSync("ffprobe", ["-v", "error", ...entries, "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
const dur = (f) => +Number(probe(f, ["-show_entries", "format=duration"])).toFixed(3);
const video = (f) => {
  const [codec, w, h, pix, rate] = probe(f, ["-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate"]).split(",");
  return { codec, w: +w, h: +h, pix, rate };
};
const audioOf = (f) => probe(f, ["-select_streams", "a:0", "-show_entries", "stream=codec_name,sample_rate,channels"]);

const cases = [
  { name: "normalize 30fps·긴 변 640 (소리 없음)", file: silent, cmd: { type: "normalize", fps: 30, maxSide: 640 }, fps: "30/1", max: 640, audio: "" },
  { name: "normalize 24fps·긴 변 1280 (소리 있음)", file: audio, cmd: { type: "normalize", fps: 24, maxSide: 1280 }, fps: "24/1", max: 1280, audio: "aac,48000,2" },
  { name: "compress small (소리 없음)", file: silent, cmd: { type: "compress", quality: "small" }, smaller: true, audio: "" },
  { name: "compress balanced·긴 변 480 (소리 있음)", file: audio, cmd: { type: "compress", quality: "balanced", maxSide: 480 }, max: 480, smaller: true, audio: "aac" },
  { name: "거절: fps 10", file: silent, cmd: { type: "normalize", fps: 10, maxSide: 640 }, reject: true },
  { name: "거절: maxSide 소수", file: silent, cmd: { type: "normalize", fps: 30, maxSide: 640.5 }, reject: true },
  { name: "거절: quality 낱말 아님", file: silent, cmd: { type: "compress", quality: "huge" }, reject: true },
  { name: "거절: 명령 문자열 끼워넣기", file: silent, cmd: { type: "compress", quality: "small", maxSide: "640 -f null" }, reject: true },
];

const out = mkdtempSync(join(tmpdir(), "video-matrix-"));
let fail = 0;
for (const kind of kinds) {
  for (const c of cases) {
    const cmd = { ...c.cmd, duration: dur(c.file) };
    const dest = join(out, `${kind}-${c.name.replace(/[^a-z0-9]+/gi, "-")}.mp4`);
    let line;
    try {
      line = execFileSync("node", [join(here, "host-harness.mjs"), kind, c.file, JSON.stringify(cmd), dest], { encoding: "utf8" }).trim().split("\n").pop();
    } catch (e) {
      line = String(e.stdout || "").trim().split("\n").pop() || JSON.stringify({ ok: false, error: e.message });
    }
    const r = JSON.parse(line);
    const problems = [];
    if (c.reject) {
      if (r.ok || !/bad params/.test(r.error || "")) problems.push("거절되어야 하는데 " + (r.ok ? "성공함" : r.error));
    } else if (!r.ok) problems.push("실패: " + (r.error || "크기 다름"));
    else {
      const v = video(dest);
      if (v.codec !== "h264" || v.pix !== "yuv420p") problems.push(`코덱 ${v.codec}/${v.pix}`);
      if (v.w % 2 || v.h % 2) problems.push(`홀수 크기 ${v.w}x${v.h}`);
      if (c.max && Math.max(v.w, v.h) > c.max) problems.push(`긴 변 ${Math.max(v.w, v.h)} > ${c.max}`);
      if (c.fps && v.rate !== c.fps) problems.push(`fps ${v.rate} (기대 ${c.fps})`);
      const a = audioOf(dest);
      if (c.audio ? !a.startsWith(c.audio) : a) problems.push(`소리 ${a || "없음"} (기대 ${c.audio || "없음"})`);
      if (r.hasAudio !== Boolean(c.audio)) problems.push(`hasAudio ${r.hasAudio}`);
      if (Math.abs(dur(dest) - cmd.duration) > 0.3) problems.push(`길이 ${dur(dest)}초 (원본 ${cmd.duration}초)`);
      if (c.smaller && !(statSync(dest).size < statSync(c.file).size)) problems.push(`용량이 줄지 않음 ${statSync(c.file).size} → ${statSync(dest).size}`);
    }
    if (problems.length) fail++;
    const size = r.ok ? ` ${statSync(c.file).size}B → ${r.size}B` : "";
    console.log(`${problems.length ? "✖" : "✔"} [${kind}] ${c.name} — ${r.ms ?? "?"}ms${size}${problems.length ? "\n   " + problems.join("\n   ") : ""}`);
  }
}
rmSync(out, { recursive: true, force: true });
console.log(fail ? `실패 ${fail}건` : "모두 통과");
process.exitCode = fail ? 1 : 0;
