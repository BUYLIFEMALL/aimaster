// 내 PC 렌더러 시험 도구 — 크롬 확장 없이 렌더러(host.ps1·host.pl)와 Native Messaging 약속(4바이트 길이 + UTF-8 JSON)으로 주고받는다.
// 쓰는 법: node host-harness.mjs <ps1|pl> <입력 파일> '<명령 JSON>' [결과 저장 경로]
//   예) node host-harness.mjs ps1 in.mp4 '{"type":"loop","mode":"smart","start":0,"end":4,"crossfade":0.5,"repeat":3,"format":"mp4","duration":4}' out.mp4
// 명령 JSON의 job·req는 도구가 채운다. 결과 메타(JSON)를 한 줄로 출력한다.
import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [kind, inFile, cmdJson, outFile] = process.argv.slice(2);
if (!["ps1", "pl"].includes(kind) || !inFile || !cmdJson) {
  console.error("쓰는 법: node host-harness.mjs <ps1|pl> <입력 파일> '<명령 JSON>' [결과 저장 경로]");
  process.exit(2);
}
let host = join(here, "..", "host", kind === "ps1" ? "host.ps1" : "host.pl");
// 맥판을 윈도우에서 1차 시험할 때: 맥 전용 경로에 ffmpeg가 없으므로 임시 폴더에 복사하고 옆에 config.json(PL_FFMPEG)을 둔다(저장소에는 남기지 않음)
if (kind === "pl" && process.env.PL_FFMPEG) {
  const tmp = mkdtempSync(join(tmpdir(), "host-pl-"));
  copyFileSync(host, join(tmp, "host.pl"));
  writeFileSync(join(tmp, "config.json"), JSON.stringify({ ffmpeg: process.env.PL_FFMPEG }));
  host = join(tmp, "host.pl");
}
const child = kind === "ps1"
  ? spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", host], { stdio: ["pipe", "pipe", "inherit"] })
  : spawn("perl", [host.replace(/\\/g, "/")], { stdio: ["pipe", "pipe", "inherit"] }); // msys perl은 역슬래시 경로의 폴더를 못 읽음

const send = (obj) => {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length, 0);
  child.stdin.write(Buffer.concat([head, body]));
};
let buf = Buffer.alloc(0);
const waiters = [];
const queue = [];
child.stdout.on("data", (d) => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= 4) {
    const n = buf.readUInt32LE(0);
    if (buf.length < 4 + n) break;
    const msg = JSON.parse(buf.subarray(4, 4 + n).toString("utf8"));
    buf = buf.subarray(4 + n);
    const w = waiters.findIndex((x) => x.pred(msg));
    if (w >= 0) waiters.splice(w, 1)[0].resolve(msg);
    else queue.push(msg);
  }
});
const wait = (pred, ms = 600_000) => new Promise((resolve, reject) => {
  const i = queue.findIndex(pred);
  if (i >= 0) return resolve(queue.splice(i, 1)[0]);
  const t = setTimeout(() => reject(new Error("시간 초과")), ms);
  waiters.push({ pred, resolve: (m) => { clearTimeout(t); resolve(m); } });
});

const job = "t" + Date.now();
const started = Date.now();
try {
  send({ type: "ping" });
  const pong = await wait((m) => m.type === "pong" || m.type === "error", 20_000);
  if (pong.type === "error") throw new Error("ping 실패: " + pong.message);
  send({ type: "begin", job });
  await wait((m) => m.type === "begin-ok" || m.type === "error");
  const data = readFileSync(inFile);
  const CH = 512 * 1024;
  for (let seq = 0, off = 0; off < data.length; seq++, off += CH) {
    send({ type: "chunk", job, seq, data: data.subarray(off, off + CH).toString("base64") });
    const ack = await wait((m) => (m.type === "chunk-ok" && m.seq === seq) || m.type === "error");
    if (ack.type === "error") throw new Error("조각 실패: " + ack.message);
  }
  send({ type: "end", job });
  await wait((m) => m.type === "end-ok" || m.type === "error");
  send({ ...JSON.parse(cmdJson), job, req: 1 });
  let progress = 0;
  let result;
  for (;;) {
    const m = await wait((x) => x.job === job || x.type === "error");
    if (m.type === "progress") { progress++; continue; }
    if (m.type === "error") throw new Error("명령 실패: " + m.message);
    if (m.type === "result") { result = m; break; }
  }
  const parts = [];
  for (let i = 0; i < result.chunks; i++) parts.push(Buffer.from((await wait((m) => m.type === "result-chunk" && m.seq === i)).data, "base64"));
  await wait((m) => m.type === "result-end");
  const out = Buffer.concat(parts);
  if (outFile) writeFileSync(outFile, out);
  send({ type: "release", job });
  const { type: _t, job: _j, req: _r, chunks: _c, ...meta } = result;
  console.log(JSON.stringify({ ok: out.length === result.size, hostVersion: pong.hostVersion, capabilities: pong.capabilities, progressMsgs: progress, ms: Date.now() - started, ...meta }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exitCode = 1;
} finally {
  child.stdin.end();
}
