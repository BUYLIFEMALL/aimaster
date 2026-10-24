// 2026-10-24 영상(MP4) 배경 — 올리기는 받았지만 미리보기·MP4에 그리는 코드가 처음부터 없던 문제를 고침(음악 담당 `claude-win-20261024-music`).
// MP4 만들 때 프레임마다 되감기(seek)는 한 번에 약 50ms로 느려서, 쇼츠 원스톱(`shorts-onestop-studio/src/lib/render/export.ts`,
// 2026-10-16 실측)과 같은 방식을 쓴다: 영상을 미리 통째로 받아 로컬(blob)로 바꾸고, 2배속으로 재생하며 목표 시각까지 기다렸다 그 장면을 쓴다.
// 영상이 곡보다 짧으면 처음부터 반복한다(미리보기도 반복 재생).

/** 영상 요소 준비(소리 끔·첫 장면까지 기다림). 원격 주소면 먼저 받아 로컬로 — 실패하면 원래 주소로 */
export async function prepareBgVideo(url: string, onStatus?: (t: string) => void): Promise<{ video: HTMLVideoElement; release: () => void } | null> {
  let src = url, local: string | null = null;
  if (!url.startsWith('blob:')) {
    try {
      onStatus?.('배경 영상 받는 중…');
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (res.ok) { local = URL.createObjectURL(await res.blob()); src = local; }
    } catch { /* 원래 주소 사용(느리지만 결과는 같음) */ }
  }
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  const ok = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 20_000);
    v.onloadeddata = () => { clearTimeout(t); resolve(true); };
    v.onerror = () => { clearTimeout(t); resolve(false); };
    v.src = src;
  });
  if (!ok) { if (local) URL.revokeObjectURL(local); return null; }
  return { video: v, release: () => { v.pause(); v.removeAttribute('src'); v.load(); if (local) URL.revokeObjectURL(local); } };
}

function seekTo(v: HTMLVideoElement, target: number): Promise<void> {
  return new Promise((res) => {
    const done = () => { clearTimeout(to); v.removeEventListener('seeked', done); res(); };
    const to = setTimeout(done, 3000);
    v.addEventListener('seeked', done);
    v.currentTime = target;
  });
}

/** MP4 만들 때: 영상이 t초(반복 고려) 장면을 보여 주게 맞춘다 */
export async function syncBgVideo(v: HTMLVideoElement, t: number, fps: number): Promise<void> {
  const d = v.duration;
  if (!d || !Number.isFinite(d)) return;
  const target = t % d;
  const diff = v.currentTime - target;
  if (diff > 1 || diff < -1.5) { v.pause(); if (Math.abs(diff) > 0.5 / fps) await seekTo(v, target); return; } // 반복 처음으로·큰 차이
  if (diff > 0.1) { if (!v.paused) v.pause(); return; } // 영상이 앞섬 → 그 장면 유지
  if (v.paused) { v.playbackRate = 2; await v.play().catch(() => undefined); }
  const start = performance.now();
  while (v.currentTime + 0.5 / fps < target && !v.ended && performance.now() - start < 1500) await new Promise((r) => setTimeout(r, 2));
}

/** 화면 비율을 지키며 꽉 채워 그린다(남는 부분은 잘림) */
export function drawVideoCover(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, width: number, height: number) {
  const vw = v.videoWidth, vh = v.videoHeight;
  if (!vw || !vh || v.readyState < 2) return false;
  const sc = Math.max(width / vw, height / vh), w = vw * sc, h = vh * sc;
  ctx.drawImage(v, (width - w) / 2, (height - h) / 2, w, h);
  return true;
}
