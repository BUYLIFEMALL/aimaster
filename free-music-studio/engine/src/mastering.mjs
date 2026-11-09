// 마스터링(0.6.9) — 원본 boks-music `electron/mastering.mjs`(MIT, © 2026 boksajang)를 옮김.
// 2단계 음량 맞추기(먼저 재고 그 값으로 정확히) · 필요할 때만 압축(성격 3종) · 192kHz로 올려 정밀 리미터 ·
// 결과를 다시 재서 True Peak가 상한을 넘으면 낮춰 다시 확인, 그래도 넘으면 저장하지 않음 · 24bit WAV.
// 다른 점: 길이·샘플레이트를 music-metadata 대신 ffmpeg가 출력하는 정보에서 읽는다(꾸러미를 늘리지 않음).
import { spawn } from "node:child_process";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const MASTER_DEFAULTS = { targetLufs: -10, truePeak: -1, character: "balanced" };
export const MASTER_LUFS = [-18, -16, -14, -12, -10, -8];
export const MASTER_PEAKS = [-2, -1, -0.5, 0];
export const MASTER_CHARACTERS = ["balanced", "gentle", "punchy"];

// 소리 색깔(0.8.2, AI 마스터링 스튜디오 ai-mastering-studio의 처리 단계를 ffmpeg로 옮김 — 같은 저장소 코드):
// 입력 피크를 -9 dBTP로 맞춘 뒤 3밴드 EQ(100Hz 쉘프·1.5kHz 피킹·8kHz 쉘프) → 아날로그 포화(웨이브셰이퍼 곡선·원음 섞기)
// → 압축 → 스테레오 폭(M/S). 그 뒤는 지금처럼 정밀 음량 맞추기·True Peak 확인.
export const TONE_RANGES = {
  eq: { low: [-12, 12], mid: [-12, 12], high: [-12, 12], q: [0.1, 5] },
  saturation: { drive: [0, 10], harmonics: [0, 100] },
  compressor: { threshold: [-40, 0], ratio: [1, 10], attack: [1, 100], release: [10, 500] },
  width: [0, 200],
};
const PRE_PEAK_DB = -9;
const clampNum = (v, [lo, hi], name) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`소리 색깔 값(${name})이 올바르지 않습니다.`);
  return Math.round(Math.min(hi, Math.max(lo, n)) * 100) / 100;
};

/** 소리 색깔 설정 확인(없으면 null) */
export function validateTone(v) {
  if (v == null) return null;
  if (typeof v !== "object" || Array.isArray(v)) throw new Error("소리 색깔 설정이 올바르지 않습니다.");
  const R = TONE_RANGES;
  const g = (o, k) => (o && typeof o === "object" ? o[k] : undefined);
  const eq = { low: clampNum(g(v.eq, "low") ?? 0, R.eq.low, "저음"), mid: clampNum(g(v.eq, "mid") ?? 0, R.eq.mid, "중음"), high: clampNum(g(v.eq, "high") ?? 0, R.eq.high, "고음"), q: clampNum(g(v.eq, "q") ?? 1, R.eq.q, "Q") };
  const saturation = { drive: clampNum(g(v.saturation, "drive") ?? 0, R.saturation.drive, "포화"), harmonics: clampNum(g(v.saturation, "harmonics") ?? 0, R.saturation.harmonics, "배음") };
  const compressor = v.compressor == null ? null : { threshold: clampNum(g(v.compressor, "threshold"), R.compressor.threshold, "압축 기준"), ratio: clampNum(g(v.compressor, "ratio"), R.compressor.ratio, "압축 비율"), attack: clampNum(g(v.compressor, "attack"), R.compressor.attack, "어택"), release: clampNum(g(v.compressor, "release"), R.compressor.release, "릴리스") };
  return { eq, saturation, compressor, width: clampNum(v.width ?? 100, R.width, "스테레오 폭") };
}

/** 소리 색깔 → ffmpeg 필터 목록(입력 피크 dBTP·스테레오 여부를 받아 만든다). 바꿀 것이 없으면 [] */
export function toneFilters(tone, { inputPeakDbtp, stereo }) {
  if (!tone) return [];
  const out = [];
  const { eq, saturation: s, compressor: c, width } = tone;
  if (eq.low) out.push(`lowshelf=g=${eq.low}:f=100:t=s:w=1`);
  if (eq.mid) out.push(`equalizer=f=1500:t=q:w=${eq.q}:g=${eq.mid}`);
  if (eq.high) out.push(`highshelf=g=${eq.high}:f=8000:t=s:w=1`);
  if (s.drive > 0 && s.harmonics > 0) {
    const d = s.drive, m = s.harmonics / 100, G = 1 + d * 0.1, M = 1 / (1 + d * 0.05);
    // 원본 곡선 y = (3+d)·x·20°/(π + d·|x|), 입력은 -1~1로 자름(웨이브셰이퍼와 같게), 원음 (1-0.4m) + 포화음 m
    const x = `clip(val(ch)*${G}\\,-1\\,1)`; // 필터 그래프 안 쉼표는 \, 로
    out.push(`aeval=exprs=${(1 - 0.4 * m).toFixed(4)}*val(ch)+${(m * M).toFixed(4)}*${3 + d}*${x}*0.3490659/(PI+${d}*abs(${x})):c=same`);
  }
  if (c) out.push(`acompressor=threshold=${10 ** (c.threshold / 20)}:ratio=${c.ratio}:attack=${c.attack}:release=${c.release}:makeup=1:knee=4:link=maximum:detection=rms`);
  if (stereo && width !== 100) out.push(`extrastereo=m=${width / 100}:c=false`);
  if (!out.length) return [];
  const pre = Math.round((PRE_PEAK_DB - inputPeakDbtp) * 100) / 100;
  return Math.abs(pre) >= 0.05 ? [`volume=${pre}dB`, ...out] : out;
}

export function validateMasteringOptions(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("마스터링 설정이 올바르지 않습니다.");
  const o = { targetLufs: value.targetLufs ?? MASTER_DEFAULTS.targetLufs, truePeak: value.truePeak ?? MASTER_DEFAULTS.truePeak, character: value.character ?? MASTER_DEFAULTS.character };
  if (!MASTER_LUFS.includes(o.targetLufs) || !MASTER_PEAKS.includes(o.truePeak) || !MASTER_CHARACTERS.includes(o.character)) throw new Error("지원하지 않는 마스터링 설정입니다.");
  const tone = validateTone(value.tone);
  return tone ? { ...o, tone } : o;
}

/** loudnorm(print_format=json) 결과 — 마지막 블록 */
export function parseLoudness(text) {
  const blocks = String(text).match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!blocks?.length) throw new Error("오디오 음량 분석 결과가 없습니다.");
  const raw = JSON.parse(blocks.at(-1));
  const r = { integratedLufs: Number(raw.input_i), truePeakDbtp: Number(raw.input_tp), loudnessRange: Number(raw.input_lra), threshold: Number(raw.input_thresh), offset: Number(raw.target_offset) };
  if (!Object.values(r).every(Number.isFinite) || r.integratedLufs <= -70) throw new Error("무음이거나 음량을 안정적으로 분석할 수 없는 오디오입니다.");
  return r;
}

/** 압축이 필요한지와 그 값 — 목표까지 올렸을 때 피크가 3dB 넘게 넘치거나 음량 폭이 성격 기준보다 넓으면 압축 */
export function masteringPlan(before, options) {
  const gain = options.targetLufs - before.integratedLufs;
  const excess = Math.max(0, before.truePeakDbtp + gain - options.truePeak);
  const s = { gentle: { ratio: 1.5, attack: 40, release: 250, lra: 15 }, balanced: { ratio: 2, attack: 25, release: 180, lra: 11 }, punchy: { ratio: 2.7, attack: 18, release: 120, lra: 8 } }[options.character];
  const needed = excess > 3 || before.loudnessRange > s.lra;
  const thresholdDb = Math.min(-6, Math.max(-36, before.integratedLufs + 6));
  const compressor = needed ? `acompressor=threshold=${10 ** (thresholdDb / 20)}:ratio=${s.ratio}:attack=${s.attack}:release=${s.release}:makeup=1:knee=2.828:link=maximum:detection=rms` : "";
  return { compressor, compressorApplied: needed, thresholdDb: needed ? thresholdDb : null, ratio: needed ? s.ratio : 1, lra: Math.min(50, Math.max(s.lra, before.loudnessRange)), anticipatedPeakExcessDb: excess };
}

/** `ffmpeg -i` 출력에서 길이(초)·샘플레이트·첫 오디오 비트 깊이 */
export function parseMediaInfo(text) {
  const d = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(String(text));
  const a = /Audio:\s*([^,\n]+),\s*(\d+)\s*Hz[^\n]*/.exec(String(text));
  const duration = d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : NaN;
  const sampleRate = a ? Number(a[2]) : NaN;
  const bits = a && /pcm_s24|s24|s32/.test(a[0]) ? (/pcm_s24/.test(a[0]) ? 24 : null) : null;
  const stereo = a ? /stereo|\b2 channels/.test(a[0]) : false;
  return { duration, sampleRate, codec: a ? a[1].trim() : "", bits, stereo };
}

function run(ffmpeg, args, { signal, stage, label, duration }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("작업이 취소되었습니다."));
    stage?.(label);
    let stderr = "";
    let pending = "";
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const abort = () => {
      if (!child.pid) return;
      if (process.platform === "win32") spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => child.kill());
      else child.kill("SIGKILL");
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-32000)));
    child.stdout.on("data", (d) => {
      pending += String(d);
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) {
        const m = /^out_time_us=(\d+)$/.exec(line);
        if (m && duration > 0) stage?.(`${label} ${Math.min(99, Math.round((Number(m[1]) / 1e6 / duration) * 100))}%`);
      }
    });
    child.on("error", (e) => (signal?.removeEventListener("abort", abort), reject(new Error("ffmpeg를 실행하지 못했습니다.", { cause: e }))));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) reject(new Error("작업이 취소되었습니다."));
      else if (code !== 0) reject(new Error(`마스터링에 실패했습니다. ${stderr.slice(-600)}`));
      else resolve(stderr);
    });
  });
}

/** 파일 정보(ffmpeg -i는 출력 파일이 없어 실패 코드로 끝나므로 출력만 읽는다) */
export function probe(ffmpeg, file) {
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(ffmpeg, ["-hide_banner", "-nostdin", "-i", file], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", (d) => (out += d));
    child.on("error", () => resolve(""));
    child.on("close", () => resolve(out));
  });
}

/**
 * 곡 파일을 마스터링해 outDir에 24bit WAV를 만든다. 결과 { file, metadata }
 * @param {{ src: string, outDir: string, options?: object, ffmpeg?: string }} p
 * @param {{ signal?: AbortSignal, stage?: (s: string) => void }} o
 */
export async function masterFile({ src, outDir, options: input, ffmpeg = "ffmpeg" }, { signal, stage } = {}) {
  const options = validateMasteringOptions(input);
  const info = parseMediaInfo(await probe(ffmpeg, src));
  if (!Number.isFinite(info.duration) || info.duration < 0.4 || !Number.isInteger(info.sampleRate) || info.sampleRate < 8000 || info.sampleRate > 192000) {
    throw new Error("길이나 샘플레이트를 읽을 수 없는 음원입니다(ffmpeg가 있는지 확인해 주세요).");
  }
  const { duration, sampleRate } = info;
  await mkdir(outDir, { recursive: true });
  const id = randomUUID();
  const candidate = path.join(outDir, `mastering-${id}.partial.wav`);
  const corrected = path.join(outDir, `mastering-${id}.guard.wav`);
  const final = path.join(outDir, `mastered-${id}.wav`);
  const ctx = { signal, stage, duration };
  const common = ["-hide_banner", "-nostdin", "-n"];
  const loudnorm = `loudnorm=I=${options.targetLufs}:TP=${options.truePeak - 0.15}:LRA=50:print_format=json`;
  const analyze = async (file, filter, label) => parseLoudness(await run(ffmpeg, [...common, "-i", file, "-map", "0:a:0", "-vn", "-af", filter, "-progress", "pipe:1", "-nostats", "-f", "null", "-"], { ...ctx, label }));
  try {
    const raw = await analyze(src, loudnorm, "원곡 음량·피크 재는 중");
    // 소리 색깔(0.8.2) — 있으면 그 결과를 다시 재서 아래 음량 맞추기의 기준으로 쓴다. 압축을 고른 소리 색깔이면 자동 압축은 하지 않는다
    const tone = toneFilters(options.tone, { inputPeakDbtp: raw.truePeakDbtp, stereo: info.stereo });
    const before = tone.length ? await analyze(src, [...tone, loudnorm].join(","), "소리 색깔 적용 뒤 음량 재는 중") : raw;
    const auto = masteringPlan(before, options);
    const plan = options.tone?.compressor && tone.length ? { ...auto, compressor: "", compressorApplied: false } : auto;
    const head = [...tone, plan.compressor].filter(Boolean).join(",");
    const prepared = plan.compressor ? await analyze(src, `${head},${loudnorm}`, "압축 뒤 음량 재는 중") : before;
    const norm = `loudnorm=I=${options.targetLufs}:TP=${options.truePeak - 0.15}:LRA=${plan.lra}:measured_I=${prepared.integratedLufs}:measured_TP=${prepared.truePeakDbtp}:measured_LRA=${prepared.loudnessRange}:measured_thresh=${prepared.threshold}:offset=${prepared.offset}:linear=true:print_format=json`;
    const limit = 10 ** ((options.truePeak - 0.15) / 20);
    const filter = [head, norm, "aresample=192000", `alimiter=limit=${limit}:level=false:attack=5:release=80:latency=true`, `aresample=${sampleRate}`].filter(Boolean).join(",");
    await run(ffmpeg, [...common, "-i", src, "-map", "0:a:0", "-vn", "-map_metadata", "-1", "-af", filter, "-c:a", "pcm_s24le", "-ar", String(sampleRate), "-progress", "pipe:1", "-nostats", candidate], { ...ctx, label: "음량 맞추기·리미터 처리 중" });
    let after = await analyze(candidate, loudnorm, "결과 음량·True Peak 확인 중");
    let guardReductionDb = 0;
    if (after.truePeakDbtp > options.truePeak) {
      guardReductionDb = after.truePeakDbtp - options.truePeak + 0.1;
      await run(ffmpeg, [...common, "-i", candidate, "-map", "0:a:0", "-vn", "-af", `volume=-${guardReductionDb}dB`, "-c:a", "pcm_s24le", "-ar", String(sampleRate), "-progress", "pipe:1", "-nostats", corrected], { ...ctx, label: "피크 여유 확보 중" });
      after = await analyze(corrected, loudnorm, "보정 결과 True Peak 다시 확인 중");
    }
    if (after.truePeakDbtp > options.truePeak) throw new Error("결과 True Peak가 설정한 상한을 넘어 저장하지 않았습니다.");
    signal?.throwIfAborted?.();
    const result = guardReductionDb ? corrected : candidate;
    const check = parseMediaInfo(await probe(ffmpeg, result));
    if (check.bits !== 24 || Math.abs(check.duration - duration) > 0.1) throw new Error("마스터링 결과의 길이나 형식(24bit WAV)이 올바르지 않습니다.");
    await rename(result, final);
    await Promise.all([candidate, corrected].map((f) => rm(f, { force: true })));
    if (!(await stat(final)).size) throw new Error("마스터링 결과 파일이 비었습니다.");
    return {
      file: final,
      metadata: {
        options,
        before: raw,
        after,
        toneApplied: tone.length > 0,
        compressorApplied: plan.compressorApplied,
        guardReductionDb,
        sampleRate,
        achievedTarget: Math.abs(after.integratedLufs - options.targetLufs) <= 0.5,
      },
    };
  } catch (e) {
    await Promise.all([candidate, corrected, final].map((f) => rm(f, { force: true }).catch(() => {})));
    throw e;
  }
}
