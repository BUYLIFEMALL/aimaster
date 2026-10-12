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
  const width = exportSettings.resolution === '720p' ? 1280 : 1920;
  const height = exportSettings.resolution === '720p' ? 720 : 1080;

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

  // Create an AnalyserNode for audio visualization frames
  const offlineAnalyser = audioCtx.createAnalyser();
  offlineAnalyser.fftSize = 256;
  const freqData = new Uint8Array(offlineAnalyser.frequencyBinCount);

  // Synthesize and encode frames
  onProgress({ progress: 25, currentSecond: 0, totalSeconds: Math.round(totalDuration), status: '비디오 프레임 렌더링 중...' });

  const dummyFreq = new Uint8Array(128);
  for (let frameIdx = 0; frameIdx < totalVideoFrames; frameIdx++) {
    if (encoderError) throw encoderError;

    const currentTimeSec = frameIdx / fps;
    const timeMs = currentTimeSec * 1000;

    // Simulate frequency oscillation for visualization
    for (let f = 0; f < dummyFreq.length; f++) {
      dummyFreq[f] = Math.round(
        Math.abs(Math.sin(currentTimeSec * 4 + f * 0.15)) * 180 +
        Math.abs(Math.cos(currentTimeSec * 2.5 + f * 0.08)) * 60
      );
    }

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw background
    if (bgImg) {
      ctx.save();
      const filterStr = getFilterString(settings.filterType, settings.filterIntensity, 120);
      if (filterStr) ctx.filter = filterStr;
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.restore();
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
    drawSpectrumVisualizer(ctx, width, height, dummyFreq, settings, timeMs);

    // Particles
    particleSystem.updateAndDraw(ctx, width, height, settings, timeMs);

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
  await videoEncoder.flush();
  videoEncoder.close();

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
