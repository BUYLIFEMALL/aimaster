// IMP-PLS-008 (v1.21) MP4 내보내기에 GIF 스티커를 넣는다 — 미리보기는 <img>가 GIF를 스스로 움직이지만,
// 내보내기는 프레임을 직접 그려야 하므로 브라우저 내장 ImageDecoder로 장면과 표시 시간을 미리 읽어 둔다.
// ImageDecoder가 없는 브라우저(일부 사파리 등)는 첫 장면을 고정 그림으로 쓴다.

export interface GifSticker {
  /** 시각(ms)에 맞는 장면 — 반복 재생 */
  frameAt(timeMs: number): CanvasImageSource;
  close(): void;
}

const MAX_FRAMES = 300; // 메모리 보호(1080p에서도 스티커는 작으므로 충분)

type DecodedFrame = { image: VideoFrame; duration: number | null; close(): void };
type Decoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  decode(o: { frameIndex: number }): Promise<{ image: DecodedFrame["image"] }>;
  close(): void;
};

export async function loadGifSticker(url: string): Promise<GifSticker | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();

  const Ctor = (globalThis as unknown as { ImageDecoder?: new (init: { data: ArrayBuffer; type: string }) => Decoder }).ImageDecoder;
  if (Ctor) {
    try {
      const decoder = new Ctor({ data: await blob.arrayBuffer(), type: blob.type || "image/gif" });
      await decoder.tracks.ready;
      const count = Math.min(decoder.tracks.selectedTrack?.frameCount ?? 1, MAX_FRAMES);
      const frames: ImageBitmap[] = [], ends: number[] = [];
      let acc = 0;
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        frames.push(await createImageBitmap(image));
        acc += Math.max(20, (image.duration ?? 100_000) / 1000); // μs → ms, 0이면 브라우저처럼 최소 20ms
        ends.push(acc);
        image.close();
      }
      decoder.close();
      if (frames.length) {
        const total = acc;
        return {
          frameAt(timeMs) {
            if (frames.length === 1) return frames[0];
            const t = timeMs % total;
            const i = ends.findIndex((e) => t < e);
            return frames[i < 0 ? frames.length - 1 : i];
          },
          close() { frames.forEach((f) => f.close()); },
        };
      }
    } catch { /* 아래 고정 그림으로 */ }
  }
  const still = await createImageBitmap(blob).catch(() => null);
  return still ? { frameAt: () => still, close: () => still.close() } : null;
}
