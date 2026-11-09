// 곡 끝 처리(0.8.3, 2026-11-10 주인님 「곡 뒷부분이 짤리는」) — 음악 모델은 고른 길이(상한)에 닿으면 노래 중간에서 멈춘다.
// 1) 끊긴 끝 부드럽게: 새로 만든 곡의 마지막 0.5초가 아직 크게 울리면(끊김) 끝 3초를 서서히 줄여 저장한다.
// 2) 끝 이어 만들기: 원곡 뒤에 빈 소리를 붙인 파일을 만들어 ACE-Step 부분 수정(repaint)으로 「원곡 끝 10초 전 ~ 새 끝」을 다시 그린다
//    (ACE-Step 1.5 Tutorial 「Repaint를 여러 번 해 길이를 늘림」 — 원곡 길이 밖 구간 지정은 문서에 없어 빈 소리로 길이를 먼저 늘린다).
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { parseMediaInfo, probe } from "./mastering.mjs";

/** 끝 0.5초 평균 음량이 이보다 크면 「끊김」 — 자연스러운 끝맺음은 이보다 훨씬 조용하다 */
export const CUT_TAIL_DB = -35;
export const FADE_SECONDS = 3;
export const EXTEND_SECONDS = [30, 60, 90];
/** 이어 그릴 때 원곡 끝에서 얼마나 앞부터 다시 그릴지(이음새를 자연스럽게) */
export const EXTEND_OVERLAP = 10;

/** volumedetect 출력에서 평균 음량(dB) */
export function parseMeanVolume(text) {
  const m = /mean_volume:\s*(-?\d+(?:\.\d+)?|-inf)\s*dB/.exec(String(text));
  if (!m) return NaN;
  return m[1] === "-inf" ? -Infinity : Number(m[1]);
}

/** 끝이 끊겼는가 — 끝 음량이 기준보다 크면 */
export const tailIsCut = (meanDb) => Number.isFinite(meanDb) && meanDb > CUT_TAIL_DB;

/** 원래 형식을 지키는 출력 코덱(WAV는 비트 수 그대로, FLAC, MP3 320k) */
export function codecArgs(ext, codec = "") {
  if (ext === "flac") return ["-c:a", "flac"];
  if (ext === "mp3") return ["-c:a", "libmp3lame", "-b:a", "320k"];
  const c = String(codec);
  const pcm = /pcm_f32/.test(c) ? "pcm_f32le" : /pcm_s32/.test(c) ? "pcm_s32le" : /pcm_s24/.test(c) ? "pcm_s24le" : "pcm_s16le";
  return ["-c:a", pcm];
}

/** 끝 이어 만들기 구간 — 원곡 끝 10초 전부터 새 끝까지(초, 정수) */
export function extendRange(sourceSec, seconds) {
  const add = EXTEND_SECONDS.includes(Number(seconds)) ? Number(seconds) : 30;
  const total = Math.ceil(sourceSec) + add;
  const start = Math.max(0, Math.floor(sourceSec) - EXTEND_OVERLAP);
  return { start, end: total, total, add };
}

function ff(ffmpeg, args) {
  return new Promise((resolve, reject) => {
    let err = "";
    const child = spawn(ffmpeg, ["-hide_banner", "-nostdin", ...args], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", (d) => (err = (err + d).slice(-16000)));
    child.on("error", (e) => reject(new Error("ffmpeg를 실행하지 못했습니다.", { cause: e })));
    child.on("close", (code) => (code === 0 ? resolve(err) : reject(new Error(`ffmpeg 처리에 실패했습니다. ${err.slice(-400)}`))));
  });
}

/**
 * 새로 만든 곡의 끝이 끊겼으면 끝 3초를 서서히 줄인 바이트를 돌려준다. 확인·처리에 실패하면 원래 바이트 그대로(곡은 꼭 저장).
 * @returns {Promise<{ bytes: Buffer, faded: boolean, tailDb?: number }>}
 */
export async function smoothEnding({ ffmpeg, bytes, ext, tmpDir }) {
  if (!ffmpeg || !bytes?.length) return { bytes, faded: false };
  const id = randomUUID();
  const src = path.join(tmpDir, `ending-${id}.${ext}`);
  const out = path.join(tmpDir, `ending-${id}.out.${ext}`);
  try {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(src, bytes);
    const info = parseMediaInfo(await probe(ffmpeg, src));
    if (!Number.isFinite(info.duration) || info.duration < FADE_SECONDS * 3) return { bytes, faded: false };
    const tailDb = parseMeanVolume(await ff(ffmpeg, ["-sseof", "-0.5", "-i", src, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"]));
    if (!tailIsCut(tailDb)) return { bytes, faded: false, tailDb };
    const st = Math.max(0, info.duration - FADE_SECONDS).toFixed(3);
    await ff(ffmpeg, ["-i", src, "-map", "0:a:0", "-map_metadata", "-1", "-af", `afade=t=out:st=${st}:d=${FADE_SECONDS}`, ...codecArgs(ext, info.codec), out]);
    const done = await readFile(out);
    return done.length ? { bytes: done, faded: true, tailDb } : { bytes, faded: false, tailDb };
  } catch {
    return { bytes, faded: false };
  } finally {
    await Promise.all([src, out].map((f) => rm(f, { force: true }).catch(() => {})));
  }
}

/**
 * 끝 이어 만들기 원곡 준비 — 원곡 뒤에 빈 소리를 붙인 WAV를 dir에 만든다. 결과 { file(파일 이름), sourceSec, range }
 */
export async function prepareExtendSource({ ffmpeg, src, dir, seconds }) {
  const info = parseMediaInfo(await probe(ffmpeg, src));
  if (!Number.isFinite(info.duration) || info.duration < 5) throw new Error("원곡 길이를 읽지 못했습니다(ffmpeg가 있는지 확인해 주세요).");
  const range = extendRange(info.duration, seconds);
  if (range.total > 600) throw new Error("이어 만든 곡이 10분을 넘습니다. 더 짧게 골라 주세요.");
  await mkdir(dir, { recursive: true });
  const file = `${randomUUID()}.wav`;
  await ff(ffmpeg, ["-i", src, "-map", "0:a:0", "-map_metadata", "-1", "-af", `apad=whole_dur=${range.total}`, "-c:a", "pcm_s16le", path.join(dir, file)]);
  return { file, sourceSec: info.duration, range };
}
