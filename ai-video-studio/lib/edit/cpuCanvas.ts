// v1.25 맥 「영상 만들기」 막힘 대책(PLAN_20261024_EDIT_RENDER_SPEED.md §17). 맥미니 시험(§16)에서 크롬 「Accelerated 2D canvas」를 끄자
// 5초 영상이 4.5초에 끝났다 — GPU 2D 캔버스에 그린 장면을 인코더가 읽어 가지 못해 대기열 4에서 멈춘 것. 웹 렌더러는 캔버스 옵션을 받지 않아,
// 렌더하는 동안만 getContext("2d")에 willReadFrequently: true를 넣어 메모리 쪽 캔버스를 쓰게 한다. 돌려놓는 함수를 돌려준다(끝에 꼭 부른다).
// 형식 확인(시험 렌더)과 본 렌더가 겹쳐도 되도록 사용 수를 센다.

type GetContext = (this: unknown, id: string, options?: unknown) => unknown;

let users = 0;
const saved: { proto: { getContext: GetContext }; original: GetContext }[] = [];

function protos(): { getContext: GetContext }[] {
  const list: { getContext: GetContext }[] = [];
  if (typeof OffscreenCanvas !== "undefined") list.push(OffscreenCanvas.prototype as unknown as { getContext: GetContext });
  if (typeof HTMLCanvasElement !== "undefined") list.push(HTMLCanvasElement.prototype as unknown as { getContext: GetContext });
  return list;
}

export function preferCpuCanvas(): () => void {
  if (users++ === 0) {
    for (const proto of protos()) {
      const original = proto.getContext;
      saved.push({ proto, original });
      proto.getContext = function (this: unknown, id: string, options?: unknown) {
        if (id !== "2d") return original.call(this, id, options);
        return original.call(this, id, { ...(options as object | undefined), willReadFrequently: true });
      };
    }
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (--users > 0) return;
    for (const { proto, original } of saved.splice(0)) proto.getContext = original;
  };
}
