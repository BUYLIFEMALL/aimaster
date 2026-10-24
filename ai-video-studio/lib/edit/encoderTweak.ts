// v1.24 맥 「영상 만들기」 인코더 35초 대기 대책(PLAN_20261024_EDIT_RENDER_SPEED.md §12).
// mediabunny는 인코더 대기열이 4개가 되면 인코더가 하나를 가져갈 때(dequeue)까지 기다리는데, 맥 하드웨어 인코더가
// latencyMode "quality"에서 약 35초에 하나씩만 가져갔다. 웹 렌더러는 이 값을 바꿀 옵션이 없어, 렌더하는 동안만
// 전역 VideoEncoder를 감싼 것으로 바꿔 ① ?render=realtime이면 latencyMode "realtime" ② trace용 대기열·출력 수를 센다.
// 돌려놓는 함수(restore)를 렌더 끝에 꼭 부른다.

export interface EncoderStats { queue: number; dequeued: number; outputs: number; latencyMode: string | null }

const EMPTY: EncoderStats = { queue: 0, dequeued: 0, outputs: 0, latencyMode: null };

export function tweakVideoEncoder(opts: { realtime: boolean }): { stats: () => EncoderStats; restore: () => void } {
  if (typeof VideoEncoder === "undefined") return { stats: () => EMPTY, restore: () => {} };
  const Original = VideoEncoder;
  let readQueue = () => 0;
  let latencyMode: string | null = null;
  let dequeued = 0;
  let outputs = 0;
  class Tweaked extends Original {
    constructor(init: VideoEncoderInit) {
      super({ ...init, output: (chunk, meta) => { outputs++; init.output(chunk, meta); } });
      this.addEventListener("dequeue", () => { dequeued++; });
    }
    configure(config: VideoEncoderConfig) {
      const c: VideoEncoderConfig = opts.realtime ? { ...config, latencyMode: "realtime" } : config;
      readQueue = () => this.encodeQueueSize; // 실제로 쓰는(설정한) 인코더 — 지원 확인용으로만 만든 것은 빼기 위해 여기서 잡는다
      latencyMode = c.latencyMode ?? null;
      return super.configure(c);
    }
  }
  (globalThis as { VideoEncoder: typeof VideoEncoder }).VideoEncoder = Tweaked;
  return {
    stats: () => ({ queue: readQueue(), dequeued, outputs, latencyMode }),
    restore: () => { (globalThis as { VideoEncoder: typeof VideoEncoder }).VideoEncoder = Original; },
  };
}
