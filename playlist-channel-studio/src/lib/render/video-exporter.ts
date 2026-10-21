import { Track, StudioSettings, ExportSettings } from '@/types/playlist';
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
import { bassLevelOf, createSpectrumReader } from './audio-spectrum';

export interface RenderProgress {
  progress: number; // 0 to 100
  currentSecond: number;
  totalSeconds: number;
  status: string;
}

export async function exportVideoMp4(
  tracks: Track[],
  bgMedia: { type: 'image' | 'video'; url: string } | null,
  logoImg: HTMLImageElement | null,
  settings: StudioSettings,
  exportSettings: ExportSettings,
  onProgress: (p: RenderProgress) => void
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

  videoEncoder.configure({
    codec: 'avc1.4d002a',
    width,
    height,
    bitrate: 10_000_000,
    framerate: fps
  });

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
  for (let frameIdx = 0; frameIdx < totalVideoFrames; frameIdx++) {
    if (encoderError) throw encoderError;

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
      onProgress({
        progress: pct,
        currentSecond: Math.round(currentTimeSec),
        totalSeconds: Math.round(totalDuration),
        status: `MP4 렌더링 중... ${pct}% (${Math.round(currentTimeSec)}초 / ${Math.round(totalDuration)}초)`
      });
    }
  }

  // Flush encoders
  onProgress({ progress: 96, currentSecond: Math.round(totalDuration), totalSeconds: Math.round(totalDuration), status: '인코딩 마무리 및 파일 패키징 중...' });
  encodeAudioUntil(totalAudioFrames); // 남은 소리
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
