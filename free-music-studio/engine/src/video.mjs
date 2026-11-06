// 플레이리스트 영상(0.6.9) — 원본 boks-music `electron/video-render.mjs`·`playlist-video.mjs`(MIT, © 2026 boksajang)를 옮김.
// 원본은 숨은 Electron 창이 그려 인코딩했지만, 여기서는 사이트 화면(브라우저 WebCodecs)이 그려 H.264 조각을 올린다.
// 엔진이 하는 일: 1) 곡마다 음량 맞춘 WAV + 12kHz 분석(JSON, 화면이 스펙트럼을 그림) 2) 올라온 조각 이어 쓰기
// 3) 그림 담기·곡 잇기·끝 채우기·반복(다시 인코딩 없음)·AAC 320k·faststart·MP4 머리 정보로 검증 → 영상 폴더에 저장.
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { copyFile, link, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { analyzeAudioFrame } from "./audio-frame.mjs";
import { readMp4Info } from "./mp4-info.mjs";
import { parseLoudness, parseMediaInfo } from "./mastering.mjs";
import { freeBytes } from "./storage.mjs";
import { isTrackId, safeFileName } from "./library.mjs";

// 유튜브 음량 기준 — 회원이 「음량 맞추기」를 켰을 때만
const LOUDNESS = { I: -14, TP: -1, LRA: 11 };
export const VIDEO_RESOLUTIONS = [480, 720, 1080, 1440, 2160, 4320];
export const VIDEO_FPS = [24, 25, 30, 50, 60];
export const MAX_TRACKS = 500;
const ANALYSIS_FPS = 15;
const IDLE_MS = 30 * 60_000; // 화면이 30분 동안 조각을 안 올리면 작업을 버린다

/** H.264 글자 많은 움직임 그래픽 비트레이트(프레임당 픽셀당 약 0.15bit) — 원본 canvas-render.mjs */
export const canvasBitrate = ({ width, height, fps }) => Math.round(Math.min(80e6, Math.max(2.5e6, width * height * fps * 0.15)));

/** 엔진이 확인하는 영상 설정(템플릿·색·스펙트럼 모양은 화면이 확인) */
export function validateEngineVideoOptions(input = {}) {
  const o = {
    aspect: input.aspect ?? "16:9",
    resolution: input.resolution ?? 1080,
    fps: input.fps ?? 30,
    format: input.format ?? "mp4",
    repeat: input.repeat ?? 1,
    normalize: input.normalize === true,
  };
  if (!["16:9", "9:16"].includes(o.aspect) || !VIDEO_RESOLUTIONS.includes(o.resolution) || !VIDEO_FPS.includes(o.fps) || !["mp4", "mov"].includes(o.format) || !Number.isInteger(o.repeat) || o.repeat < 1 || o.repeat > 20) {
    throw new Error("지원하지 않는 영상 설정입니다.");
  }
  const short = o.resolution;
  const long = Math.round((short * 16) / 9 / 2) * 2;
  return { ...o, width: o.aspect === "16:9" ? long : short, height: o.aspect === "16:9" ? short : long };
}

/** 챕터 — 반복마다 곡이 시작하는 시각(유튜브 「0:00 제목」) */
export function videoChapters(tracks, { cycleDuration, repeat = 1 }) {
  const chapters = [];
  for (let round = 0; round < repeat; round++) {
    let offset = round * cycleDuration;
    for (const t of tracks) {
      chapters.push({ start: Math.round(offset * 1000) / 1000, title: t.title || "", trackId: t.id });
      offset += t.duration;
    }
  }
  return chapters;
}

/** 프레임 수·길이 — 한 바퀴를 프레임 단위로 맞추고(끝을 1프레임 미만 채움) 반복한다 */
export function videoTiming(durations, { fps, repeat }) {
  const cycleDuration = durations.reduce((s, d) => s + d, 0);
  const cycleFrames = Math.ceil(cycleDuration * fps);
  const alignedCycleDuration = cycleFrames / fps;
  return { cycleDuration, cycleFrames, alignedCycleDuration, duration: alignedCycleDuration * repeat, frames: cycleFrames * repeat };
}

/** 12kHz 모노 샘플 → 분석(초당 15번, 64칸 스펙트럼 + 128칸 파형, 원본 `u8-bins-i8-wave` 형식) */
export async function analysisOf(samples, duration, { signal } = {}) {
  const frameCount = Math.ceil(duration * ANALYSIS_FPS);
  const out = Buffer.alloc(frameCount * 192);
  for (let f = 0; f < frameCount; f++) {
    if (f % 120 === 0) {
      signal?.throwIfAborted?.();
      await new Promise((r) => setImmediate(r));
    }
    const frame = analyzeAudioFrame(samples, f / ANALYSIS_FPS);
    frame.bins.forEach((v, j) => (out[f * 192 + j] = Math.round(v * 255)));
    frame.waveform.forEach((v, j) => out.writeInt8(Math.round(Math.max(-1, Math.min(1, v)) * 127), f * 192 + 64 + j));
  }
  return { fps: ANALYSIS_FPS, frameCount, encoding: "u8-bins-i8-wave", data: out.toString("base64") };
}

/** 완성 영상 검증 — 코덱·크기·프레임 수·재생 시간(원본 기준 그대로). 문제가 없으면 null, 있으면 어긋난 값 설명 */
export function videoInfoProblem(info, { width, height, fps, frames, duration, repeat }) {
  const video = info.tracks.find((t) => t.type === "video");
  const audio = info.tracks.find((t) => t.type === "audio");
  if (video?.codec !== "h264") return `영상 코덱 ${video?.codec ?? "없음"}`;
  if (audio?.codec !== "aac") return `소리 코덱 ${audio?.codec ?? "없음"}`;
  if (video.width !== width || video.height !== height) return `크기 ${video.width}×${video.height}(기대 ${width}×${height})`;
  if (video.frames !== frames) return `프레임 ${video.frames}개(기대 ${frames}개)`;
  if (!(Math.abs(video.frameRate - fps) <= 0.001) || !(Math.abs(video.averageFrameRate - fps) <= 0.001)) return `초당 프레임 ${video.frameRate?.toFixed?.(3)}/${video.averageFrameRate?.toFixed?.(3)}(기대 ${fps})`;
  if (!(Math.abs(info.duration - duration) <= 0.15 + repeat * 0.025)) return `길이 ${info.duration.toFixed(3)}초(기대 ${duration.toFixed(3)}초)`;
  return null;
}
export const checkVideoInfo = (info, want) => videoInfoProblem(info, want) === null;

function runFfmpeg(ffmpeg, args, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("작업이 취소되었습니다."));
    let stderr = "";
    const child = spawn(ffmpeg, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const abort = () => {
      if (!child.pid) return;
      if (process.platform === "win32") spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => child.kill());
      else child.kill("SIGKILL");
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-32000)));
    child.on("error", (e) => (signal?.removeEventListener("abort", abort), reject(new Error("ffmpeg를 실행하지 못했습니다.", { cause: e }))));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) reject(new Error("작업이 취소되었습니다."));
      else if (code !== 0) reject(new Error(`영상 처리에 실패했습니다. ${stderr.slice(-600)}`));
      else resolve(stderr);
    });
  });
}

/** 파일 정보(ffmpeg -i는 출력 파일이 없어 실패 코드로 끝나므로 출력만 읽는다) */
function probe(ffmpeg, file) {
  return new Promise((resolve) => {
    let out = "";
    const child = spawn(ffmpeg, ["-hide_banner", "-nostdin", "-i", file], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr.on("data", (d) => (out += d));
    child.on("error", () => resolve(""));
    child.on("close", () => resolve(out));
  });
}

/** 같은 이름이 있으면 「제목 (2).mp4」 */
async function freeName(dir, title, ext) {
  const base = safeFileName(title) || "플레이리스트 영상";
  for (let n = 1; n < 1000; n++) {
    const p = path.join(dir, `${base}${n > 1 ? ` (${n})` : ""}.${ext}`);
    if (!(await stat(p).then(() => true, () => false))) return p;
  }
  return path.join(dir, `${base}-${randomUUID().slice(0, 8)}.${ext}`);
}

/**
 * 영상 작업 — 한 번에 하나(그림·인코딩은 화면, 음원·담기는 엔진이 무거움).
 * @param {{ dataDir: string, library: ReturnType<typeof import("./library.mjs").createLibrary>, getFfmpeg: () => boolean,
 *           ffmpegPath?: string, log?: (s: string) => void, now?: () => number, keepWork?: boolean }} p
 */
export function createVideoStudio({ dataDir, library, getFfmpeg, ffmpegPath = "ffmpeg", log = () => {}, now = Date.now, keepWork = false }) {
  const listFile = path.join(dataDir, "videos.json");
  /** @type {Map<string, any>} */
  const sessions = new Map();
  let videos = null;

  const outDir = () => path.join(library.dir, "영상");
  const loadList = async () => {
    if (videos) return videos;
    try {
      const v = JSON.parse(await readFile(listFile, "utf8"));
      videos = Array.isArray(v) ? v : [];
    } catch {
      videos = [];
    }
    return videos;
  };
  const saveList = async () => {
    await mkdir(dataDir, { recursive: true });
    const tmp = `${listFile}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(videos, null, 1));
    await rename(tmp, listFile);
  };

  const view = (s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    stage: s.stage,
    progress: s.progress,
    error: s.error ?? null,
    options: s.options,
    tracks: s.tracks.map((t) => ({ id: t.id, title: t.title, duration: t.duration ?? null })),
    timing: s.timing ?? null,
    bitrate: s.timing ? canvasBitrate(s.options) : null,
    written: s.written,
    video: s.video ?? null,
  });

  const cleanup = async (s) => {
    s.stream?.destroy();
    s.stream = null;
    if (!keepWork) await rm(s.work, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 }).catch(() => {}); // keepWork: 시험 때 작업 폴더 남기기
  };
  const fail = async (s, e) => {
    if (s.status === "cancelled") return;
    s.status = "failed";
    s.error = e instanceof Error ? e.message : String(e);
    s.stage = "실패";
    log(`⚠ 영상 만들기 실패: ${s.title} — ${s.error}`);
    await cleanup(s);
  };
  const expire = () => {
    for (const s of sessions.values()) {
      if (["analyzing", "rendering"].includes(s.status) && now() - s.touched > IDLE_MS) {
        s.abort.abort();
        s.status = "cancelled";
        s.stage = "화면 연결이 끊겨 중단됨";
        cleanup(s);
      }
      if (["done", "failed", "cancelled"].includes(s.status) && now() - s.touched > IDLE_MS) sessions.delete(s.id);
    }
  };
  const active = () => [...sessions.values()].find((s) => ["analyzing", "rendering", "finishing"].includes(s.status));

  async function prepare(s) {
    const ffmpeg = ffmpegPath;
    const signal = s.abort.signal;
    const common = ["-hide_banner", "-nostdin", "-v", "error", "-y"];
    for (const t of s.tracks) {
      const info = parseMediaInfo(await probe(ffmpeg, t.file));
      if (!Number.isFinite(info.duration) || info.duration <= 0) throw new Error(`「${t.title || "곡"}」의 길이를 확인하지 못했습니다.`);
      t.duration = info.duration;
    }
    s.timing = videoTiming(s.tracks.map((t) => t.duration), s.options);
    // 저장 공간 — 곡마다 풀어 둔 소리(32bit 48kHz 스테레오)·그림 조각 사본 3개·완성 파일
    const videoBytes = canvasBitrate(s.options) / 8;
    const finalBytes = Math.ceil(s.timing.duration * (videoBytes + 320000 / 8) * 1.1);
    const workBytes = Math.ceil(s.timing.cycleDuration * 48000 * 8 * 2 + s.timing.alignedCycleDuration * videoBytes * 3 * 1.1) + finalBytes;
    const free = await freeBytes(s.work).catch(() => null);
    if (free !== null && free < workBytes) throw new Error(`저장 공간이 부족합니다. 약 ${Math.ceil(workBytes / 1024 ** 3)}GB가 필요합니다.`);
    for (let i = 0; i < s.tracks.length; i++) {
      signal.throwIfAborted();
      const t = s.tracks[i];
      s.stage = `오디오 분석 ${i + 1}/${s.tracks.length}`;
      s.progress = (i / s.tracks.length) * 8;
      const wav = path.join(s.work, `audio-${i}.wav`);
      const pcm = path.join(s.work, `analysis-${i}.f32`);
      const plain = [...common, "-i", t.file, "-map", "0:a:0", "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_f32le", "-rf64", "auto", wav];
      if (s.options.normalize) {
        // 2단계 음량 맞추기 — 먼저 재고, 잰 값으로 선형 적용(무음 곡은 원음 그대로)
        let measured = null;
        try {
          measured = parseLoudness(await runFfmpeg(ffmpeg, ["-hide_banner", "-nostdin", "-i", t.file, "-map", "0:a:0", "-af", `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}:print_format=json`, "-f", "null", "-"], { signal }));
        } catch (e) {
          signal.throwIfAborted();
          log(`음량을 잴 수 없어 원음으로 넣습니다: ${t.title} (${e instanceof Error ? e.message : e})`);
        }
        if (measured) {
          const filter = `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}:measured_I=${measured.integratedLufs}:measured_TP=${measured.truePeakDbtp}:measured_LRA=${measured.loudnessRange}:measured_thresh=${measured.threshold}:offset=${measured.offset}:linear=true`;
          await runFfmpeg(ffmpeg, [...common, "-i", t.file, "-map", "0:a:0", "-vn", "-af", filter, "-ac", "2", "-ar", "48000", "-c:a", "pcm_f32le", "-rf64", "auto", wav], { signal });
        } else await runFfmpeg(ffmpeg, plain, { signal });
      } else await runFfmpeg(ffmpeg, plain, { signal });
      await runFfmpeg(ffmpeg, [...common, "-i", wav, "-ac", "1", "-ar", "12000", "-f", "f32le", pcm], { signal });
      const raw = await readFile(pcm);
      const samples = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
      const analysis = await analysisOf(samples, t.duration, { signal });
      t.analysisFile = path.join(s.work, `analysis-${i}.json`);
      await writeFile(t.analysisFile, JSON.stringify(analysis));
      await rm(pcm, { force: true });
      t.wav = wav;
    }
    s.stream = createWriteStream(path.join(s.work, "visual.h264"));
    s.status = "rendering";
    s.stage = "화면에서 그리는 중";
    s.progress = 8;
    s.touched = now();
  }

  async function assemble(s, report) {
    const ffmpeg = ffmpegPath;
    const signal = s.abort.signal;
    const common = ["-hide_banner", "-nostdin", "-v", "error", "-n"];
    const { fps, repeat, format } = s.options;
    const { cycleDuration, alignedCycleDuration, duration, frames } = s.timing;
    const streamPath = path.join(s.work, "visual.h264");
    const rawVideo = path.join(s.work, "visual.mp4");
    const cycle = path.join(s.work, "cycle.mp4");
    const candidate = path.join(s.work, `final.${format}`);
    s.stage = "그림 담는 중";
    s.progress = 90;
    // -framerate만으로는 브라우저 하드웨어 인코더가 적은 시간 정보(VUI)를 따라가 「초당 120만 프레임」으로 담겼다
    // (2026-11-06 ego 실측) — 입력 -r로 프레임 간격을 고정하고 시각을 새로 만든다
    await runFfmpeg(ffmpeg, [...common, "-fflags", "+genpts", "-f", "h264", "-r", String(fps), "-i", streamPath, "-c:v", "copy", "-an", rawVideo], { signal });
    if (!keepWork) await rm(streamPath, { force: true });
    // 반복하는 부분은 그림만 — AAC 앞부분 지연이 반복 주기를 바꾸지 않게
    await runFfmpeg(ffmpeg, [...common, "-i", rawVideo, "-map", "0:v:0", "-c:v", "copy", "-an", cycle], { signal });
    await rm(rawVideo, { force: true });
    s.stage = repeat > 1 ? "반복 영상과 음악 합치는 중" : "영상 파일 저장 중";
    s.progress = 94;
    const manifest = path.join(s.work, "audio-list.txt");
    const pcmCycle = path.join(s.work, "playlist.wav");
    await writeFile(manifest, s.tracks.map((t) => `file '${t.wav.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n"));
    // 한 바퀴 끝만(1프레임 미만) 채워, 복사한 그림 반복과 음악이 함께 다시 시작하게
    await runFfmpeg(ffmpeg, [...common, "-f", "concat", "-safe", "0", "-i", manifest, "-af", `apad=whole_dur=${alignedCycleDuration}`, "-t", String(alignedCycleDuration), "-c:a", "pcm_f32le", "-rf64", "auto", pcmCycle], { signal });
    for (const t of s.tracks) await rm(t.wav, { force: true });
    const loop = repeat > 1 ? ["-stream_loop", String(repeat - 1)] : [];
    await runFfmpeg(ffmpeg, [...common, ...loop, "-i", cycle, ...loop, "-i", pcmCycle, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-t", String(duration), "-movflags", "+faststart", candidate], { signal });
    await rm(cycle, { force: true });
    await rm(pcmCycle, { force: true });
    if ((await stat(candidate)).size < 1024) throw new Error("영상 출력이 비어 있습니다.");
    signal.throwIfAborted();
    s.stage = "완성 영상 확인 중";
    s.progress = 98;
    const info = await readMp4Info(candidate);
    const problem = videoInfoProblem(info, { ...s.options, frames, duration });
    if (problem) throw new Error(`완성 영상의 코덱·크기·프레임 수·재생시간 검증에 실패했습니다(${problem}).`);
    signal.throwIfAborted();
    await mkdir(outDir(), { recursive: true });
    const out = await freeName(outDir(), s.title, format);
    try {
      await link(candidate, out);
    } catch (e) {
      if (!["EXDEV", "EPERM", "ENOTSUP"].includes(e.code)) throw e;
      await copyFile(candidate, out);
    }
    const video = {
      id: randomUUID(),
      title: s.title,
      file: out,
      createdAt: new Date(now()).toISOString(),
      size: (await stat(out)).size,
      duration,
      width: s.options.width,
      height: s.options.height,
      fps,
      format,
      repeat,
      template: s.template,
      trackIds: s.tracks.map((t) => t.id),
      chapters: videoChapters(s.tracks, { cycleDuration: alignedCycleDuration, repeat }),
      cycleAudioDuration: cycleDuration,
      loudness: s.options.normalize ? `${LOUDNESS.I} LUFS` : "원음",
      encoder: { encoder: "webcodecs-h264", hardware: !!report.hardware, codec: String(report.codec ?? "").slice(0, 40) },
    };
    await loadList();
    videos.unshift(video);
    await saveList();
    return video;
  }

  return {
    get outDir() {
      return outDir();
    },
    /** 새 영상 작업 — { title, template, tracks:[{id,title}], options } */
    async start(input) {
      expire();
      if (!getFfmpeg()) return { ok: false, status: 501, error: "이 PC에 ffmpeg가 없어 영상을 만들 수 없습니다. 엔진을 다시 켜면 받습니다." };
      if (active()) return { ok: false, status: 409, error: "다른 영상을 만드는 중입니다. 끝난 뒤 다시 시작해 주세요." };
      let options;
      try {
        options = validateEngineVideoOptions(input?.options ?? {});
      } catch (e) {
        return { ok: false, status: 400, error: e.message };
      }
      const list = Array.isArray(input?.tracks) ? input.tracks : [];
      if (!list.length) return { ok: false, status: 400, error: "영상에 넣을 음악이 없습니다." };
      if (list.length > MAX_TRACKS) return { ok: false, status: 400, error: `한 영상에는 ${MAX_TRACKS}곡까지 넣을 수 있습니다.` };
      const tracks = [];
      for (const t of list) {
        if (!isTrackId(t?.id)) return { ok: false, status: 400, error: "곡 번호가 올바르지 않습니다." };
        const file = await library.fileOf(t.id);
        const title = typeof t.title === "string" ? t.title.slice(0, 120) : "";
        if (!file) return { ok: false, status: 404, error: `「${title || "곡"}」 음원이 이 PC 보관함에 없습니다.` };
        tracks.push({ id: t.id, title, file });
      }
      const id = randomUUID();
      const s = {
        id,
        title: (typeof input.title === "string" && input.title.trim() ? input.title.trim() : "플레이리스트 영상").slice(0, 180),
        template: typeof input.template === "string" ? input.template.slice(0, 40) : "",
        options,
        tracks,
        status: "analyzing",
        stage: "준비 중",
        progress: 0,
        written: 0,
        work: path.join(dataDir, "tmp", `video-${id}`),
        abort: new AbortController(),
        touched: now(),
      };
      sessions.set(id, s);
      await mkdir(s.work, { recursive: true });
      prepare(s).catch((e) => fail(s, e));
      return { ok: true, session: view(s) };
    },
    get(id) {
      expire();
      const s = sessions.get(id);
      if (s && s.status === "rendering") s.touched = now();
      return s ? view(s) : null;
    },
    /** 곡 분석(JSON 문자열) — i번째 곡 */
    async analysis(id, i) {
      const s = sessions.get(id);
      const t = s?.tracks[i];
      if (!s || s.status !== "rendering" || !t?.analysisFile) return null;
      s.touched = now();
      return readFile(t.analysisFile, "utf8");
    },
    /** 그림 조각 이어 쓰기 — offset이 지금까지 쓴 크기와 같아야 한다(같은 조각을 두 번 보내도 안전) */
    async append(id, offset, bytes) {
      const s = sessions.get(id);
      if (!s || s.status !== "rendering" || !s.stream) return { ok: false, status: 409, error: "그림을 받을 수 있는 영상 작업이 아닙니다." };
      if (offset !== s.written) return { ok: false, status: 409, error: "조각 순서가 맞지 않습니다.", written: s.written };
      await new Promise((resolve, reject) => s.stream.write(bytes, (e) => (e ? reject(e) : resolve())));
      s.written += bytes.length;
      s.touched = now();
      return { ok: true, written: s.written };
    },
    /** 화면이 그리기를 마침 — { frames, written, hardware, codec } */
    async finish(id, report = {}) {
      const s = sessions.get(id);
      if (!s || s.status !== "rendering") return { ok: false, status: 409, error: "마무리할 수 있는 영상 작업이 아닙니다." };
      if (report.frames !== s.timing.cycleFrames || report.written !== s.written || !s.written) return { ok: false, status: 400, error: "그린 프레임 수나 받은 크기가 맞지 않습니다." };
      s.status = "finishing";
      s.touched = now();
      await new Promise((resolve) => s.stream.end(resolve));
      s.stream = null;
      assemble(s, report)
        .then(async (video) => {
          s.video = video;
          s.status = "done";
          s.stage = "완성";
          s.progress = 100;
          s.touched = now();
          log(`🎬 영상 완성: ${video.title} → ${video.file}`);
          await cleanup(s);
        })
        .catch((e) => fail(s, e));
      return { ok: true, session: view(s) };
    },
    async cancel(id) {
      const s = sessions.get(id);
      if (!s) return false;
      if (["analyzing", "rendering", "finishing"].includes(s.status)) {
        s.abort.abort();
        s.status = "cancelled";
        s.stage = "취소됨";
        s.touched = now();
        await cleanup(s);
      }
      return true;
    },
    async list() {
      const all = await loadList();
      const out = [];
      for (const v of all) out.push({ ...v, missing: !(await stat(v.file).then((x) => x.isFile(), () => false)) });
      return out;
    },
    async fileOf(id) {
      const v = (await loadList()).find((x) => x.id === id);
      if (!v || !(await stat(v.file).then((x) => x.isFile(), () => false))) return null;
      return v.file;
    },
    /** 목록에서 지우기 — removeFile이면 파일도(영상 폴더 안 파일만) */
    async remove(id, { removeFile = false } = {}) {
      const list = await loadList();
      const v = list.find((x) => x.id === id);
      if (!v) return { ok: false, status: 404, error: "그 영상을 찾지 못했습니다." };
      let fileRemoved = false;
      if (removeFile) {
        const rel = path.relative(outDir(), v.file);
        if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
          await rm(v.file, { force: true });
          fileRemoved = true;
        }
      }
      videos = list.filter((x) => x.id !== id);
      await saveList();
      return { ok: true, fileRemoved };
    },
  };
}
