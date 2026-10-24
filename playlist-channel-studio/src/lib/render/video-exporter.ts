import { Track, StudioSettings, ExportSettings, ExportQuality } from '@/types/playlist';
import { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } from 'mp4-muxer';
import {
  drawSpectrumVisualizer,
  drawVignette,
  drawFilmGrain,
  drawLightLeaks,
  getFilterString
} from './canvas-visualizer';
import { ParticleSystem } from './particle-system';
import { drawCover, drawLyricsLayer, locate, trackTimelines } from './lyrics-layer';
import { drawTitleLayer, trackTitle } from './title-layer';
import { bassLevelOf, createSpectrumReader } from './audio-spectrum';
import { loadGifSticker } from './gif-frames';

export interface RenderProgress {
  progress: number; // 0 to 100
  currentSecond: number;
  totalSeconds: number;
  status: string;
  /** P-2 남은 예상 시간(초) — 프레임 그리기가 시작된 뒤부터 */
  etaSeconds?: number;
  /** P-2 실제로 쓴 인코더(「하드웨어 가속」/「소프트웨어」) */
  encoder?: string;
}

// P-2 품질 단계별 영상 비트레이트(1080p 기준, 720p는 화소 수 비율로) — 우리 값
const VIDEO_BITRATE: Record<ExportQuality, number> = { quality: 14_000_000, balanced: 9_000_000, speed: 6_000_000 };
const MAX_ENCODE_QUEUE = 12; // 인코더 대기열이 이보다 길면 잠깐 기다린다(메모리 넘침 방지)

/** 하드웨어 가속을 먼저 확인하고 안 되면 소프트웨어로 — 지원되는 첫 설정을 돌려준다 */
async function pickVideoConfig(width: number, height: number, fps: number, quality: ExportQuality): Promise<{ config: VideoEncoderConfig; label: string }> {
  const pixels = (width * height) / (1920 * 1080);
  const base: VideoEncoderConfig = {
    codec: 'avc1.4d002a',
    width,
    height,
    bitrate: Math.round(VIDEO_BITRATE[quality] * Math.max(0.45, pixels) * (fps > 30 ? 1.4 : 1)),
    framerate: fps,
    latencyMode: quality === 'speed' ? 'realtime' : 'quality',
  };
  const tries: [VideoEncoderConfig, string][] = [
    [{ ...base, hardwareAcceleration: 'prefer-hardware' }, '하드웨어 가속'],
    [{ ...base, hardwareAcceleration: 'prefer-software' }, '소프트웨어'],
    [{ ...base, codec: 'avc1.42002a', hardwareAcceleration: 'no-preference' }, '기본(호환 모드)'],
  ];
  for (const [config, label] of tries) {
    try {
      const r = await VideoEncoder.isConfigSupported(config);
      if (r.supported) return { config: r.config ?? config, label };
    } catch { /* 다음 설정 시도 */ }
  }
  return { config: base, label: '기본' };
}

/** 인코더 대기열이 줄어들 때까지 기다린다 */
async function drainEncoder(enc: VideoEncoder) {
  while (enc.encodeQueueSize > MAX_ENCODE_QUEUE) {
    await new Promise<void>((resolve) => {
      const done = () => { clearTimeout(t); resolve(); };
      const t = setTimeout(done, 20);
      enc.addEventListener('dequeue', done, { once: true });
    });
  }
}

const fmtEta = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${Math.round(s % 60)}초` : `${Math.max(1, Math.round(s))}초`);

/** P-2 저장하는 동안 화면이 꺼지지 않게(지원하는 브라우저만) 감싼다 */
export async function exportVideoMp4(...args: Parameters<typeof renderVideoMp4>): Promise<Blob | null> {
  let lock: { release: () => Promise<void> } | null = null;
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (wl && document.visibilityState === 'visible') lock = await wl.request('screen');
  } catch { /* 화면 꺼짐 방지를 못 해도 저장은 계속 */ }
  try {
    return await renderVideoMp4(...args);
  } finally {
    lock?.release().catch(() => {});
  }
}

async function renderVideoMp4(
  tracks: Track[],
  bgMedia: { type: 'image' | 'video'; url: string } | null,
  logoImg: HTMLImageElement | null,
  settings: StudioSettings,
  exportSettings: ExportSettings,
  onProgress: (p: RenderProgress) => void,
  gifUrl: string | null = null // v1.21 GIF 스티커(미리보기에만 있던 것)
): Promise<Blob | null> {
  if (tracks.length === 0) {
    throw new Error('렌더링할 오디오 트랙이 없습니다.');
  }

  if (typeof window === 'undefined' || !('VideoEncoder' in window)) {
    throw new Error('이 브라우저는 고속 인코딩(WebCodecs)을 지원하지 않습니다. Chrome/Edge 최신 버전을 사용해주세요.');
  }

  const sampleRate = 48000;
  const fps = exportSettings.fps;
  // v1.17 세로(9:16) — 긴 변·짧은 변을 바꾼다(1080×1920 / 720×1280)
  const long = exportSettings.resolution === '720p' ? 1280 : 1920, short = exportSettings.resolution === '720p' ? 720 : 1080;
  const portrait = exportSettings.aspect === '9:16';
  const width = portrait ? short : long;
  const height = portrait ? long : short;

  onProgress({ progress: 1, currentSecond: 0, totalSeconds: 0, status: '오디오 디코딩 준비 중...' });

  const audioCtx = new AudioContext({ sampleRate });

  // 1. Fetch & decode all tracks
  const decodedTracks: { track: Track; audioBuffer: AudioBuffer }[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    onProgress({
      progress: Math.round(5 + (i / tracks.length) * 20),
      currentSecond: 0,
      totalSeconds: 0,
      status: `음원 디코딩 중: ${t.name} (${i + 1}/${tracks.length})`
    });

    const res = await fetch(t.url);
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    decodedTracks.push({ track: t, audioBuffer: audioBuf });
  }

  // 2. Calculate total audio duration and samples considering repeatCount
  let singlePassDuration = 0;
  for (const item of decodedTracks) {
    singlePassDuration += item.audioBuffer.duration;
  }
  const totalDuration = singlePassDuration * exportSettings.repeatCount;
  const totalVideoFrames = Math.floor(totalDuration * fps);
  // v1.17 가사 층: 곡별 시간표와 곡 길이(실제 디코딩 길이)
  const lyricTimelines = trackTimelines(decodedTracks.map((d) => d.track));
  const trackDurations = decodedTracks.map((d) => d.audioBuffer.duration);
  const hasLyrics = lyricTimelines.some((l) => l.length > 0);

  // 3. Prepare background image if any
  let bgImg: HTMLImageElement | null = null;
  if (bgMedia && bgMedia.type === 'image') {
    bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = bgMedia.url;
    await new Promise((resolve) => {
      bgImg!.onload = resolve;
      bgImg!.onerror = resolve;
    });
  }

  // 4. File save target setup
  let fileHandle: any = null;
  let fileWritable: any = null;
  let muxerTarget: any = null;

  if ('showSaveFilePicker' in window) {
    try {
      fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: `playlist_render_${Date.now()}.mp4`,
        types: [{ description: 'MP4 Video File', accept: { 'video/mp4': ['.mp4'] } }]
      });
      fileWritable = await fileHandle.createWritable();
      muxerTarget = new FileSystemWritableFileStreamTarget(fileWritable);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error('내보내기가 취소되었습니다.');
      }
      muxerTarget = new ArrayBufferTarget();
    }
  } else {
    muxerTarget = new ArrayBufferTarget();
  }

  // 5. Initialize Muxer
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: 'avc',
      width,
      height
    },
    audio: {
      codec: 'aac',
      sampleRate,
      numberOfChannels: 2
    },
    fastStart: false,
    firstTimestampBehavior: 'offset'
  });

  // 6. Initialize VideoEncoder
  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      console.error('VideoEncoder error:', e);
      encoderError = e;
    }
  });

  // P-2 하드웨어 가속 → 소프트웨어 순으로 지원되는 설정을 골라 쓴다
  const picked = await pickVideoConfig(width, height, fps, exportSettings.quality ?? 'balanced');
  videoEncoder.configure(picked.config);

  // 7. Initialize AudioEncoder
  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => {
      console.error('AudioEncoder error:', e);
      encoderError = e;
    }
  });

  audioEncoder.configure({
    codec: 'mp4a.40.2',
    sampleRate,
    numberOfChannels: 2,
    bitrate: exportSettings.audioBitrate
  });

  // 8. Render Canvas setup
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;
  const ctx = renderCanvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('렌더링 캔버스 생성 실패');

  const particleSystem = new ParticleSystem();


  // 소리: 디코딩한 트랙을 순서대로(반복 횟수만큼) 이어 붙여 0.5초 단위로 인코딩한다.
  // 2026-10-16 수정 — 예전에는 AudioEncoder를 설정만 하고 데이터를 넣지 않아 완성 MP4가 무음이었다.
  // 큰 배열로 합치지 않고 트랙 버퍼에서 바로 잘라 넣고, 영상 프레임 시각보다 1초 앞서도록 나눠 넣어 두 트랙이 섞여 저장되게 한다.
  const passes: AudioBuffer[] = [];
  for (let r = 0; r < exportSettings.repeatCount; r++) for (const item of decodedTracks) passes.push(item.audioBuffer);
  const totalAudioFrames = Math.floor(totalDuration * sampleRate);
  let audioPos = 0; // 지금까지 넣은 샘플 수(전체 기준)
  let passIdx = 0, passOffset = 0;
  const encodeAudioUntil = (untilFrame: number) => {
    const limit = Math.min(untilFrame, totalAudioFrames);
    while (audioPos < limit && passIdx < passes.length) {
      const buf = passes[passIdx];
      const n = Math.min(sampleRate / 2, buf.length - passOffset, limit - audioPos);
      if (n <= 0) { passIdx++; passOffset = 0; continue; }
      const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
      const data = new Float32Array(n * 2);
      data.set(L.subarray(passOffset, passOffset + n), 0); data.set(R.subarray(passOffset, passOffset + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((audioPos / sampleRate) * 1_000_000), data });
      audioEncoder.encode(ad); ad.close();
      audioPos += n; passOffset += n;
      if (passOffset >= buf.length) { passIdx++; passOffset = 0; }
    }
  };

  // Synthesize and encode frames
  onProgress({ progress: 25, currentSecond: 0, totalSeconds: Math.round(totalDuration), status: '비디오 프레임 렌더링 중...' });

  // v1.18 (IMP-PLS-006) 스펙트럼·저음 효과를 실제 소리로 — 미리보기 분석기와 같은 계산(예전엔 sin/cos 가짜 값)
  const frequencyAt = createSpectrumReader(passes, fps);
  // v1.21 (IMP-PLS-008) GIF 스티커 — 장면을 미리 나눠 두고 시각에 맞춰 그린다(미리보기와 같은 위치·크기·투명도·그림자)
  const gif = gifUrl ? await loadGifSticker(gifUrl).catch(() => null) : null;
  const unit = Math.min(width, height) / 1080; // 미리보기 캔버스가 1080p 기준이라 720p는 비율로 줄인다
  const renderStart = performance.now();
  for (let frameIdx = 0; frameIdx < totalVideoFrames; frameIdx++) {
    if (encoderError) throw encoderError;
    if (videoEncoder.encodeQueueSize > MAX_ENCODE_QUEUE) await drainEncoder(videoEncoder);

    const currentTimeSec = frameIdx / fps;
    const timeMs = currentTimeSec * 1000;
    encodeAudioUntil(Math.floor((currentTimeSec + 1) * sampleRate)); // 소리를 영상보다 1초 앞서 넣는다

    const freqData = frequencyAt(currentTimeSec);
    const bassLevel = bassLevelOf(freqData);

    // 저음 확대 맥동·흔들림(미리보기 EditorStudio와 같은 조건)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    let scale = 1;
    if (settings.zoomPulse && bassLevel > 80) scale = 1 + (bassLevel / 255) * 0.04;
    let shakeX = 0, shakeY = 0;
    if (settings.shakeEnabled && bassLevel > 70) {
      const p = (settings.shakeIntensity / 100) * 12;
      shakeX = (Math.random() - 0.5) * p; shakeY = (Math.random() - 0.5) * p;
    }
    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw background (밝기 + 저음에 반응하는 필터)
    if (bgImg) {
      ctx.save();
      const filterStr = getFilterString(settings.filterType, settings.filterIntensity, bassLevel);
      ctx.filter = `brightness(${settings.brightness}%) ${filterStr}`.trim();
      if (portrait) drawCover(ctx, bgImg, width, height); else ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.restore();
    }

    // Strobe
    if (settings.strobeFlash && bassLevel > 160) {
      const strobeA = ((bassLevel - 160) / 95) * (settings.strobeIntensity / 100) * 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${strobeA})`;
      ctx.fillRect(0, 0, width, height);
    }

    // FX: Vignette, FilmGrain, LightLeaks
    if (settings.vignette) {
      drawVignette(ctx, width, height, settings.vignetteIntensity);
    }
    if (settings.lightLeaks) {
      drawLightLeaks(ctx, width, height, settings.lightLeaksIntensity, timeMs);
    }
    if (settings.filmGrain) {
      drawFilmGrain(ctx, width, height, settings.filmGrainIntensity);
    }

    // Visualizer
    drawSpectrumVisualizer(ctx, width, height, freqData, settings, timeMs);

    // Particles
    particleSystem.updateAndDraw(ctx, width, height, settings, timeMs);

    // v1.17 가사(곡별 시간표, 반복도 같은 순서)
    if (hasLyrics) {
      const [ti, lt] = locate(trackDurations, currentTimeSec);
      if (ti >= 0) drawLyricsLayer(ctx, width, height, lyricTimelines[ti], lt, settings);
    }
    // P-1 곡 제목(곡 시작부터 몇 초 — 미리보기와 같은 함수, 가사 유무와 상관없음)
    if (settings.titleEnabled) {
      const [ti, lt] = locate(trackDurations, currentTimeSec);
      if (ti >= 0) drawTitleLayer(ctx, width, height, { title: trackTitle(tracks[ti].name), artist: tracks[ti].artist, index: ti, total: tracks.length }, lt, settings);
    }

    // Channel Logo
    if (logoImg) {
      ctx.save();
      ctx.globalAlpha = settings.logoOpacity / 100;
      const lSize = (settings.logoSize / 100) * 120;
      const lX = (settings.logoX / 100) * width;
      const lY = (settings.logoY / 100) * height;
      if (settings.logoShadowEnabled) {
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = settings.logoShadowSize;
      }
      ctx.drawImage(logoImg, lX, lY, lSize, lSize);
      ctx.restore();
    }
    if (gif) {
      ctx.save();
      ctx.globalAlpha = settings.gifOpacity / 100;
      const gSize = (settings.gifSize / 100) * 150 * unit;
      const gX = settings.gifCentered ? (width - gSize) / 2 : (settings.gifX / 100) * width;
      const gY = settings.gifCentered ? (height - gSize) / 2 : (settings.gifY / 100) * height;
      if (settings.gifShadowEnabled) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = settings.gifShadowSize * unit; }
      ctx.drawImage(gif.frameAt(timeMs), gX, gY, gSize, gSize);
      ctx.restore();
    }

    ctx.restore(); // 확대·흔들림 끝

    // Encode video frame
    const videoFrame = new VideoFrame(renderCanvas, {
      timestamp: Math.round(currentTimeSec * 1_000_000), // microsec
      duration: Math.round((1 / fps) * 1_000_000)
    });

    videoEncoder.encode(videoFrame, { keyFrame: frameIdx % (fps * 2) === 0 });
    videoFrame.close();

    // Progress update every 15 frames
    if (frameIdx % 15 === 0 || frameIdx === totalVideoFrames - 1) {
      const pct = Math.round(25 + (frameIdx / totalVideoFrames) * 70);
      // P-2 남은 시간: 지금까지 프레임당 걸린 시간으로 추정(처음 2초는 추정하지 않음)
      const spent = (performance.now() - renderStart) / 1000;
      const eta = frameIdx > 0 && spent > 2 ? (spent / (frameIdx + 1)) * (totalVideoFrames - frameIdx - 1) : undefined;
      onProgress({
        progress: pct,
        currentSecond: Math.round(currentTimeSec),
        totalSeconds: Math.round(totalDuration),
        etaSeconds: eta,
        encoder: picked.label,
        status: `MP4 렌더링 중... ${pct}% (${Math.round(currentTimeSec)}초 / ${Math.round(totalDuration)}초) · ${picked.label}${eta !== undefined ? ` · 남은 시간 약 ${fmtEta(eta)}` : ''}`
      });
    }
  }

  // Flush encoders
  onProgress({ progress: 96, currentSecond: Math.round(totalDuration), totalSeconds: Math.round(totalDuration), status: '인코딩 마무리 및 파일 패키징 중...' });
  encodeAudioUntil(totalAudioFrames); // 남은 소리
  gif?.close();
  await videoEncoder.flush();
  videoEncoder.close();
  await audioEncoder.flush();
  audioEncoder.close();
  if (encoderError) throw encoderError;

  // Finalize Muxer
  muxer.finalize();

  if (fileWritable) {
    await fileWritable.close();
    onProgress({ progress: 100, currentSecond: Math.round(totalDuration), totalSeconds: Math.round(totalDuration), status: '디스크에 비디오 저장 완료!' });
    return null;
  } else {
    const buffer = (muxerTarget as ArrayBufferTarget).buffer;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    onProgress({ progress: 100, currentSecond: Math.round(totalDuration), totalSeconds: Math.round(totalDuration), status: '비디오 생성 완료!' });
    return blob;
  }
}
