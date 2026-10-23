import { photoReviewRevision, type PhotoReviewInput, type PhotoReviewResult } from "./photoReview";

type State = { revision: string; pending: boolean; result: PhotoReviewResult | null; error: string };
type Send = (input: PhotoReviewInput, signal: AbortSignal) => Promise<PhotoReviewResult>;
async function sendReview(input: PhotoReviewInput, signal: AbortSignal) {
  const response = await fetch("/api/photo-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    signal: AbortSignal.any([signal, AbortSignal.timeout(240_000)]), cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.result) throw new Error(data?.error || "사진 후기 결과를 확인하지 못했습니다. 자동으로 재시도하지 않습니다.");
  return data.result as PhotoReviewResult;
}

/** 입력 변경/취소/뒤늦은 응답이 이전 초안을 다시 표시하지 못하게 한다. */
export class PhotoReviewClient {
  private state: State = { revision: "", pending: false, result: null, error: "" };
  private listeners = new Set<() => void>();
  private input: PhotoReviewInput | null = null;
  private request: AbortController | null = null;
  constructor(private send: Send = sendReview) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: State) { this.state = state; this.listeners.forEach(listener => listener()); }
  update(input: PhotoReviewInput | null) {
    const revision = input ? photoReviewRevision(input) : "";
    this.input = input;
    if (revision === this.state.revision) return;
    this.request?.abort(); this.request = null;
    this.set({ revision, pending: false, result: null, error: this.state.pending ? "입력이 바뀌어 요청을 중단했습니다. 이미 진행된 AI 호출은 비용이 발생했을 수 있습니다." : "" });
  }
  cancel = () => {
    this.request?.abort(); this.request = null;
    this.set({ ...this.state, pending: false, error: "화면의 요청을 중단했습니다. 이미 진행된 AI 호출의 비용은 공급사 사용량에서 확인해 주세요." });
  };
  dispose = () => {
    this.request?.abort(); this.request = null; this.input = null;
    this.set({ revision: "", pending: false, result: null, error: "" });
  };
  async run() {
    if (!this.input || this.state.pending) return;
    const input = this.input, revision = this.state.revision;
    const request = new AbortController(); this.request = request;
    this.set({ revision, pending: true, result: null, error: "" });
    const current = () => this.request === request && !request.signal.aborted && this.state.revision === revision;
    try {
      const result = await this.send(input, request.signal);
      if (current()) this.set({ revision, pending: false, result, error: "" });
    } catch (error) {
      if (current()) this.set({ revision, pending: false, result: null, error: error instanceof Error && error.name !== "AbortError" && error.name !== "TimeoutError" ? error.message : "결과를 끝까지 확인하지 못했습니다. AI 사용량을 확인해 주세요. 자동 재시도하지 않습니다." });
    } finally { if (this.request === request) this.request = null; }
  }
}
