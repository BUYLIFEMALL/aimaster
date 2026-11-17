// 실행: node --test tests/mp4FileFallback.test.ts  (그래픽 가속 멈춤 시험은 실제 대기 STALL_MS 10초씩 걸림)
// MOV-20261116-05 (MUS-20261116-05 재현): 「파일로 바로 저장」 방식(encodeMp4ToFile)도 그래픽 가속 인코더가 멈추면
// 같은 파일 핸들에서 새 쓰기 스트림을 한 번 열어 기본 방식(prefer-software)으로 다시 쓴다. 브라우저 WebCodecs를 흉내 내 실제 공용 코드를 돌린다.
import test from "node:test";
import assert from "node:assert/strict";

class FakeChunk { type: string; timestamp: number; duration: number; byteLength = 4; constructor(o: { type: string; timestamp: number; duration: number }) { this.type = o.type; this.timestamp = o.timestamp; this.duration = o.duration; } copyTo(b: Uint8Array) { b.set([0, 0, 0, 1]); } }
type Cfg = { hardwareAcceleration?: string; codec: string };
const env = { stallHardware: true, stallAll: false, errorOnEncode: false, configs: [] as string[] };

class FakeVideoEncoder {
  static async isConfigSupported(c: Cfg) { return { supported: true, config: c }; }
  state = "unconfigured";
  encodeQueueSize = 0;
  private cfg: Cfg | null = null;
  private first = true;
  private init: { output: (c: unknown, m?: unknown) => void; error: (e: unknown) => void };
  constructor(init: { output: (c: unknown, m?: unknown) => void; error: (e: unknown) => void }) { this.init = init; }
  configure(c: Cfg) { this.cfg = c; this.state = "configured"; env.configs.push(String(c.hardwareAcceleration)); }
  encode(frame: { timestamp: number; duration: number }, opt?: { keyFrame?: boolean }) {
    if (env.errorOnEncode) { this.init.error(new Error("인코더 오류(시험)")); return; }
    const stuck = env.stallAll || (env.stallHardware && this.cfg?.hardwareAcceleration === "prefer-hardware");
    if (stuck) { this.encodeQueueSize += 1; return; } // 출력 없이 대기열만 쌓임(맥 사례 흉내)
    const chunk = new FakeChunk({ type: opt?.keyFrame ? "key" : "delta", timestamp: frame.timestamp, duration: frame.duration });
    const meta = this.first ? { decoderConfig: { codec: this.cfg!.codec, codedWidth: 64, codedHeight: 36, description: new Uint8Array([1, 100, 0, 40, 255, 225, 0, 0]) } } : undefined;
    this.first = false;
    this.init.output(chunk, meta);
  }
  async flush() {}
  close() { this.state = "closed"; }
}
class FakeVideoFrame { timestamp: number; duration: number; constructor(_c: unknown, o: { timestamp: number; duration: number }) { this.timestamp = o.timestamp; this.duration = o.duration; } close() {} }

const g = globalThis as Record<string, unknown>;
g.VideoEncoder = FakeVideoEncoder;
g.AudioEncoder = class { static async isConfigSupported() { return { supported: true }; } };
g.VideoFrame = FakeVideoFrame;
g.EncodedVideoChunk = FakeChunk; // mp4-muxer가 instanceof로 확인
g.window = globalThis;
g.document = { visibilityState: "hidden", createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }) };

// 2026-11-17 MOV-20261117-07: 공용 인코더에 탭 단위 상태(hwStalled)가 생겨 시험마다 모듈을 새로 불러와 격리한다(시험 순서 의존 금지)
type Mod = typeof import("../src/lib/render/mp4Encoder.ts");
let loads = 0;
const fresh = async (): Promise<Mod> => import(`../src/lib/render/mp4Encoder.ts?t=${++loads}`);
let encodeMp4ToFile: Mod["encodeMp4ToFile"], encodeMp4: Mod["encodeMp4"], EncoderStallError: Mod["EncoderStallError"];
test.beforeEach(async () => { ({ encodeMp4ToFile, encodeMp4, EncoderStallError } = await fresh()); });

/** 모의 쓰기 스트림: 쓴 바이트·닫힘·버림을 기록(mp4-muxer가 instanceof로 확인하므로 같은 이름의 클래스로 만든다) */
class FakeWritable {}
g.FileSystemWritableFileStream = FakeWritable;
function fakeStream(name: string) {
  const s = Object.assign(new FakeWritable(), {
    name, written: 0, closed: false, aborted: false,
    async write(d: { data?: Uint8Array } | Uint8Array) { if (s.closed || s.aborted) throw new Error(`${name}: 이미 끝난 스트림에 씀`); const b = (d as { data?: Uint8Array }).data ?? (d as Uint8Array); s.written += b?.byteLength ?? 0; },
    async seek() {}, async truncate() {},
    async close() { if (s.aborted) throw new Error(`${name}: 버린 스트림을 닫음`); s.closed = true; },
    async abort() { s.aborted = true; },
  });
  return s;
}

const base = (signal = new AbortController().signal) => ({
  width: 64, height: 36, fps: 10, total: 1, audio: null, signal, // 10프레임 → 대기열 7부터 drain(6) 멈춤 감지
  drawFrame: () => {}, onProgress: () => {},
});
/** 같은 모듈에서 한 번 더 내보내기(멈춤 없음) — 첫 설정이 가속인지 보려고 */
const nextFirstConfig = async () => { reset({ stallHardware: false }); await encodeMp4ToFile({ ...base(), stream: fakeStream("next") as never }); return env.configs[0]; };
const reset = (o: Partial<typeof env> = {}) => Object.assign(env, { stallHardware: true, stallAll: false, errorOnEncode: false, configs: [] }, o);

test("그래픽 가속이 멈추면 새 스트림을 1번 열어 기본 방식으로 끝까지 쓴다(이전 스트림은 버림)", async () => {
  reset();
  const first = fakeStream("first"); const second = fakeStream("second"); let reopened = 0;
  await encodeMp4ToFile({ ...base(), stream: first as never, reopenStream: async () => { reopened += 1; return second as never; } });
  assert.equal(reopened, 1);
  assert.equal(first.aborted, true);
  assert.equal(first.closed, false);
  assert.equal(second.closed, true);
  assert.equal(second.aborted, false);
  assert.ok(second.written > 0, "새 스트림에 MP4가 써져야 함");
  assert.deepEqual(env.configs, ["prefer-hardware", "prefer-software"]);
  // MOV-20261117-07: 같은 탭의 다음 내보내기는 기본 방식부터(가속 시도·10초 대기 없음, 새 스트림도 안 엶)
  reset(); const third = fakeStream("third");
  await encodeMp4ToFile({ ...base(), stream: third as never, reopenStream: async () => { reopened += 1; return fakeStream("x") as never; } });
  assert.deepEqual(env.configs, ["prefer-software"]);
  assert.equal(reopened, 1);
  assert.equal(third.closed, true);
});

test("기존 호출(새 스트림 함수 없음)은 예전처럼 멈춤 오류를 던지고 스트림을 버린다", async () => {
  reset();
  const s = fakeStream("only");
  await assert.rejects(encodeMp4ToFile({ ...base(), stream: s as never }), (e) => e instanceof EncoderStallError);
  assert.equal(s.aborted, true);
  assert.deepEqual(env.configs, ["prefer-hardware"]);
});

test("기본 방식도 멈추면 더 다시 하지 않고 새 스트림도 버린 뒤 오류(무한 재시도 없음)", async () => {
  reset({ stallAll: true });
  const first = fakeStream("first"); const second = fakeStream("second"); let reopened = 0;
  await assert.rejects(encodeMp4ToFile({ ...base(), stream: first as never, reopenStream: async () => { reopened += 1; return second as never; } }), (e) => e instanceof EncoderStallError);
  assert.equal(reopened, 1);
  assert.equal(first.aborted, true);
  assert.equal(second.aborted, true);
  assert.equal(second.closed, false);
  assert.equal(await nextFirstConfig(), "prefer-hardware", "대체 실패는 기록하지 않음");
});

test("새 스트림 열기가 실패하면 그 오류를 알리고 이전 스트림은 버린 상태로 끝난다", async () => {
  reset();
  const first = fakeStream("first");
  await assert.rejects(encodeMp4ToFile({ ...base(), stream: first as never, reopenStream: async () => { throw new Error("파일 권한 없음"); } }), /파일 권한 없음/);
  assert.equal(first.aborted, true);
  assert.equal(await nextFirstConfig(), "prefer-hardware", "대체 못 함은 기록하지 않음");
});

test("회원 취소는 다시 만들지 않는다", async () => {
  reset();
  const ac = new AbortController(); ac.abort();
  const first = fakeStream("first"); let reopened = 0;
  await assert.rejects(encodeMp4ToFile({ ...base(ac.signal), stream: first as never, reopenStream: async () => { reopened += 1; return fakeStream("x") as never; } }), (e) => (e as Error).name === "AbortError");
  assert.equal(reopened, 0);
  assert.equal(first.aborted, true);
  assert.equal(await nextFirstConfig(), "prefer-hardware", "회원 취소는 기록하지 않음");
});

test("그래픽 가속 멈춤이 아닌 인코더 오류는 다시 만들지 않는다", async () => {
  reset({ errorOnEncode: true });
  const first = fakeStream("first"); let reopened = 0;
  await assert.rejects(encodeMp4ToFile({ ...base(), stream: first as never, reopenStream: async () => { reopened += 1; return fakeStream("x") as never; } }), /인코더 오류/);
  assert.equal(reopened, 0);
  assert.equal(first.aborted, true);
  assert.equal(await nextFirstConfig(), "prefer-hardware", "일반 인코더 오류는 기록하지 않음");
});

test("멈춤 없으면 처음 스트림에 그대로 쓰고 새 스트림을 열지 않는다", async () => {
  reset({ stallHardware: false });
  const first = fakeStream("first"); let reopened = 0;
  await encodeMp4ToFile({ ...base(), stream: first as never, reopenStream: async () => { reopened += 1; return fakeStream("x") as never; } });
  assert.equal(reopened, 0);
  assert.equal(first.closed, true);
  assert.ok(first.written > 0);
});

test("멈춤 없는 기기는 여러 번 내보내도 계속 가속부터 시작한다(MOV-20261117-07)", async () => {
  reset({ stallHardware: false });
  await encodeMp4ToFile({ ...base(), stream: fakeStream("a") as never });
  await encodeMp4(base());
  assert.deepEqual(env.configs, ["prefer-hardware", "prefer-hardware"]);
});

test("메모리 방식(encodeMp4)도 대체 성공 뒤 같은 탭 다음 내보내기는 기본 방식부터, 새로 불러오면 다시 가속부터(MOV-20261117-07)", async () => {
  reset();
  const blob = await encodeMp4(base());
  assert.ok(blob.size > 0);
  assert.deepEqual(env.configs, ["prefer-hardware", "prefer-software"]);
  reset(); await encodeMp4(base());
  assert.deepEqual(env.configs, ["prefer-software"], "같은 모듈(탭)은 기본 방식부터");
  const other = await fresh(); // 새로고침 흉내: 모듈 상태 초기화
  reset({ stallHardware: false }); await other.encodeMp4(base());
  assert.deepEqual(env.configs, ["prefer-hardware"], "새로 불러오면 가속부터");
});
