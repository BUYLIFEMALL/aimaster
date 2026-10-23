import { MediaType } from "@/types/vinyl";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

interface RenderOptions {
  imageBase64: string;
  speedRpm: number;
  durationSec?: number;
  mediaType: MediaType;
  format: "mp4" | "gif";
  onProgress?: (progress: number) => void;
  /** 배경 음악(선택, MP4 전용). 넣으면 영상 길이 = 음악 길이, 소리 트랙을 함께 넣는다(브라우저 안에서만 처리) */
  audio?: AudioBuffer | null;
}

const AUDIO_RATE = 48000;

/**
 * 브라우저 캔버스를 회전시켜 고화질 MP4 또는 무한 루프 GIF를 생성
 * @returns 생성된 Blob의 Object URL (다운로드/미리보기용)
 */
export async function renderSpinningAnimation({
  imageBase64,
  speedRpm,
  durationSec = 0.16666666666666666, // 10초 기준 회전 팩터
  mediaType,
  format,
  onProgress,
  audio = null,
}: RenderOptions): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const img = new Image();
      img.src = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      // 해상도 및 FPS 설정
      const width = format === "gif" ? 360 : 720;
      const height = format === "gif" ? 360 : 720;
      const withAudio = format === "mp4" && !!audio;
      // GIF는 30fps로 용량 최적화, MP4는 60fps 부드러움. 음악을 넣으면 길이가 길어지므로 30fps
      const fps = format === "gif" || withAudio ? 30 : 60;

      // 회전 주기 및 프레임 수 계산 (완벽한 루프가 되도록 정수 회전수 계산)
      const totalRevCalculated = durationSec * 60 * (speedRpm / 60);
      const totalRevolutions = Math.max(1, Math.round(totalRevCalculated));
      // 음악이 있으면 음악 길이만큼 같은 속도로 계속 회전(반복 맞춤 불필요), 없으면 정수 회전수로 끊김 없는 반복 영상
      const totalFrames = withAudio ? Math.ceil(audio!.duration * fps) : Math.round((totalRevolutions * 60 * fps) / speedRpm);
      const exactSpeed = withAudio ? speedRpm : (totalRevolutions * 60 * fps) / totalFrames;

      console.log(`[MediaExporter] ${format.toUpperCase()}: ${totalFrames} frames, ${totalRevolutions} revs, ${fps}fps, ${width}x${height}`);

      let muxer: Muxer<ArrayBufferTarget> | null = null;
      let videoEncoder: VideoEncoder | null = null;
      let gifEncoder: GIFEncoder | null = null;
      let audioEncoder: AudioEncoder | null = null;
      let audioCodec: { muxer: "aac" | "opus"; codec: string } | null = null;
      if (withAudio) {
        if (typeof AudioEncoder === "undefined") throw new Error("현재 브라우저는 소리 인코딩(WebCodecs AudioEncoder)을 지원하지 않습니다. Chrome/Edge 최신 버전을 권장합니다.");
        for (const c of [{ muxer: "aac" as const, codec: "mp4a.40.2" }, { muxer: "opus" as const, codec: "opus" }]) {
          const ok = await AudioEncoder.isConfigSupported({ codec: c.codec, sampleRate: AUDIO_RATE, numberOfChannels: 2, bitrate: 192_000 }).then((r) => r.supported).catch(() => false);
          if (ok) { audioCodec = c; break; }
        }
        if (!audioCodec) throw new Error("이 컴퓨터에서 소리 인코딩을 쓸 수 없습니다. Chrome/Edge 최신 버전에서 다시 시도해 주세요.");
      }

      if (format === "mp4") {
        if (typeof VideoEncoder === "undefined") {
          throw new Error("현재 브라우저는 WebCodecs VideoEncoder를 지원하지 않습니다. Chrome/Edge/Safari 최신 버전을 권장합니다.");
        }

        muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: {
            codec: "avc",
            width,
            height,
          },
          ...(audioCodec ? { audio: { codec: audioCodec.muxer, sampleRate: AUDIO_RATE, numberOfChannels: 2 } } : {}),
          fastStart: "in-memory",
        });

        videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer?.addVideoChunk(chunk, meta),
          error: (e) => reject(new Error("Video Encoding 오류: " + e.message)),
        });

        videoEncoder.configure({
          codec: "avc1.42001f",
          width,
          height,
          bitrate: 4_500_000,
          framerate: fps,
        });

        if (audioCodec) {
          audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer?.addAudioChunk(chunk, meta),
            error: (e) => reject(new Error("Audio Encoding 오류: " + e.message)),
          });
          audioEncoder.configure({ codec: audioCodec.codec, sampleRate: AUDIO_RATE, numberOfChannels: 2, bitrate: 192_000 });
        }
      } else {
        gifEncoder = new GIFEncoder();
      }

      // 메인 렌더링 캔버스
      const mainCanvas = document.createElement("canvas");
      mainCanvas.width = width;
      mainCanvas.height = height;
      const ctx = mainCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("캔버스 2D 컨텍스트 생성 불가");

      // 디스크 크기
      const discSize = format === "gif" ? 300 : 600;

      // 배경 캔버스 (MP4는 고급 다크 섀도우 턴테이블 배경, GIF는 투명 배경)
      const bgCanvas = document.createElement("canvas");
      bgCanvas.width = width;
      bgCanvas.height = height;
      const bgCtx = bgCanvas.getContext("2d");
      if (!bgCtx) throw new Error("배경 캔버스 컨텍스트 생성 불가");

      if (format === "mp4") {
        // 프리미엄 턴테이블 다크 슬레이트 백그라운드 & 엠보싱 섀도우
        bgCtx.fillStyle = "#0f172a"; // slate-900
        bgCtx.fillRect(0, 0, width, height);

        // 은은한 원형 플레이터 섀도우
        bgCtx.save();
        bgCtx.translate(width / 2, height / 2);
        bgCtx.shadowColor = "rgba(0, 0, 0, 0.7)";
        bgCtx.shadowBlur = 45;
        bgCtx.shadowOffsetY = 22;
        bgCtx.beginPath();
        bgCtx.arc(0, 0, discSize / 2 - 2, 0, Math.PI * 2);
        bgCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        bgCtx.fill();
        bgCtx.restore();
      } else {
        bgCtx.clearRect(0, 0, width, height);
      }

      // 디스크 자체 캔버스
      const discCanvas = document.createElement("canvas");
      discCanvas.width = discSize;
      discCanvas.height = discSize;
      const discCtx = discCanvas.getContext("2d");
      if (!discCtx) throw new Error("디스크 캔버스 컨텍스트 생성 불가");
      discCtx.clearRect(0, 0, discSize, discSize);
      discCtx.drawImage(img, 0, 0, discSize, discSize);

      // 소리: 영상 프레임보다 1초 앞서도록 0.5초 단위로 나눠 넣는다(모노는 양쪽 복제). audio는 48kHz로 디코딩된 버퍼
      let audioPos = 0;
      const encodeAudioUntil = (untilFrame: number) => {
        if (!audioEncoder || !audio) return;
        const L = audio.getChannelData(0), Rch = audio.numberOfChannels > 1 ? audio.getChannelData(1) : L;
        const limit = Math.min(untilFrame, audio.length);
        while (audioPos < limit) {
          const n = Math.min(AUDIO_RATE / 2, limit - audioPos);
          const data = new Float32Array(n * 2);
          data.set(L.subarray(audioPos, audioPos + n), 0); data.set(Rch.subarray(audioPos, audioPos + n), n);
          const ad = new AudioData({ format: "f32-planar", sampleRate: audio.sampleRate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((audioPos / audio.sampleRate) * 1_000_000), data });
          audioEncoder.encode(ad); ad.close();
          audioPos += n;
        }
      };

      // 프레임별 회전 렌더링 루프
      for (let i = 0; i < totalFrames; i++) {
        if (audio) encodeAudioUntil(Math.floor((i / fps + 1) * audio.sampleRate));
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(bgCanvas, 0, 0);

        // 디스크 회전 렌더링
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.beginPath();
        ctx.arc(0, 0, discSize / 2, 0, Math.PI * 2);
        ctx.clip();

        const timeRatio = i / fps;
        const currentAngle = (exactSpeed / 60) * 2 * Math.PI * timeRatio;
        ctx.rotate(currentAngle);
        ctx.drawImage(discCanvas, -discSize / 2, -discSize / 2);
        ctx.restore();

        // 디스크 상단 고정 조명 광택 (턴테이블 조명 효과 - 빛은 회전하지 않고 고정)
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.globalCompositeOperation = "overlay";
        ctx.rotate(-currentAngle * 0.25); // 미세한 빛 산란

        const glare = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
        glare.addColorStop(0, "rgba(255, 255, 255, 0)");
        glare.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
        glare.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glare;
        ctx.beginPath();
        ctx.arc(0, 0, discSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 센터 스핀들 / 홀 마스킹
        ctx.save();
        ctx.translate(width / 2, height / 2);
        if (mediaType === "vinyl") {
          // 메탈 스핀들 핀
          ctx.beginPath();
          ctx.arc(0, 0, 4 * (width / 720), 0, Math.PI * 2);
          ctx.fillStyle = "#e2e8f0";
          ctx.fill();
        } else {
          // CD 중앙 투명 홀
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(0, 0, (discSize / 2) * 0.13, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        ctx.restore();

        // 인코더에 프레임 전달
        if (format === "mp4" && videoEncoder) {
          const bitmap = await createImageBitmap(mainCanvas);
          while (videoEncoder.encodeQueueSize > 5) {
            await new Promise((r) => setTimeout(r, 10));
          }
          const timestampUs = (i / fps) * 1_000_000;
          const frame = new VideoFrame(bitmap, { timestamp: timestampUs });
          videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
          frame.close();
        } else if (gifEncoder) {
          const { data: rgba } = ctx.getImageData(0, 0, width, height);
          // 투명 배경 클리어
          for (let p = 0; p < rgba.length; p += 4) {
            if (rgba[p + 3] < 128) {
              rgba[p + 3] = 0;
              rgba[p] = 0;
              rgba[p + 1] = 0;
              rgba[p + 2] = 0;
            }
          }
          const palette = quantize(rgba, 256);
          const index = applyPalette(rgba, palette);
          const transparentIndex = palette.findIndex((color) => color[3] === 0);
          gifEncoder.writeFrame(index, width, height, {
            palette,
            delay: Math.round(1000 / fps),
            transparent: transparentIndex !== -1 ? transparentIndex : true,
          });
          await new Promise((r) => setTimeout(r, 0));
        }

        // 진행률 업데이트
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalFrames) * 100));
        }
      }

      // 최종 파일 생성
      if (format === "mp4" && videoEncoder && muxer) {
        if (audio) encodeAudioUntil(audio.length); // 남은 소리
        await videoEncoder.flush();
        if (audioEncoder) { await audioEncoder.flush(); audioEncoder.close(); }
        muxer.finalize();
        const { buffer } = muxer.target;
        const blob = new Blob([buffer], { type: "video/mp4" });
        resolve(URL.createObjectURL(blob));
      } else if (gifEncoder) {
        gifEncoder.finish();
        const bytes = gifEncoder.bytes();
        const blob = new Blob([bytes as any], { type: "image/gif" });
        resolve(URL.createObjectURL(blob));
      }
    } catch (err: any) {
      console.error("[MediaExporter Error]:", err);
      reject(new Error("렌더링 실패: " + err.message));
    }
  });
}
