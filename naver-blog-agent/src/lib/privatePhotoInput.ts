import { checkImageFile } from "./imageFileCheck";
import { MAX_REVIEW_PHOTOS, photoFileProblem } from "./privatePhotoRules";

export type PhotoAsset = { storagePath: string; mimeType: string; size: number };
export type PhotoMetadata = { storagePath: string; createdAt: string; expiresAt: string };
export type PhotoInputItem = {
  id: string; name: string; caption: string; localUrl: string;
  status: "checking" | "uploading" | "resolving" | "ready" | "failed" | "expired";
  asset?: PhotoAsset; metadata?: PhotoMetadata; error?: string;
};
export type PreparedPhotoSet = {
  coverId: string;
  photos: (PhotoAsset & PhotoMetadata & { id: string; caption: string })[];
};
export type PhotoInputState = { items: PhotoInputItem[]; coverId: string | null; notice: string };
type PhotoInputServices = {
  check: typeof checkImageFile;
  upload: (file: File, signal: AbortSignal) => Promise<PhotoAsset>;
  resolve: (path: string, signal: AbortSignal) => Promise<PhotoMetadata>;
  createUrl: (file: File) => string; revokeUrl: (url: string) => void;
  id: () => string; now: () => number;
};

async function responseJson(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw Object.assign(new Error(data?.error || "사진 처리 결과를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요."), { status: response.status });
  return data;
}
async function photoRequest(url: string, init: RequestInit) {
  try {
    const signal = AbortSignal.any([init.signal!, AbortSignal.timeout(30_000)]);
    return await responseJson(await fetch(url, { ...init, signal, cache: "no-store" }));
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) throw new Error("사진 처리 결과를 확인하지 못했습니다. 연결 상태를 확인해 주세요. 업로드는 자동으로 반복하지 않습니다.");
    throw error;
  }
}
const browserServices: PhotoInputServices = {
  check: checkImageFile,
  upload: async (file, signal) => {
    const body = new FormData(); body.append("file", file);
    const data = await photoRequest("/api/photos", { method: "POST", body, signal });
    if (!data.success || typeof data.photo?.storagePath !== "string") throw new Error("사진 저장 결과를 확인하지 못했습니다. 자동 재업로드하지 않습니다.");
    return data.photo;
  },
  resolve: async (path, signal) => {
    const data = await photoRequest("/api/photos/resolve", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: [path] }), signal, cache: "no-store",
    });
    const photo = data.photos?.[0];
    if (photo?.storagePath !== path) throw new Error("등록한 사진 정보를 확인하지 못했습니다.");
    // 임시 서명 주소를 선택 데이터에 넣지 않는다. 화면은 로컬 미리보기만 쓴다.
    return { storagePath: path, createdAt: photo.createdAt, expiresAt: photo.expiresAt };
  },
  createUrl: file => URL.createObjectURL(file), revokeUrl: url => URL.revokeObjectURL(url),
  id: () => crypto.randomUUID(), now: () => Date.now(),
};

/** 사진 ID로 요청과 편집 상태를 결합한다. 배열 위치나 늦은 응답으로 선택을 복원하지 않는다. */
export class PrivatePhotoInput {
  private state: PhotoInputState = { items: [], coverId: null, notice: "" };
  private listeners = new Set<() => void>();
  private files = new Map<string, File>();
  private requests = new Map<string, AbortController>();
  constructor(private services: PhotoInputServices = browserServices) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(state: PhotoInputState) { this.state = state; this.listeners.forEach(listener => listener()); }
  private patch(id: string, patch: Partial<PhotoInputItem>) {
    if (this.state.items.some(item => item.id === id)) this.set({ ...this.state, items: this.state.items.map(item => item.id === id ? { ...item, ...patch } : item) });
  }
  add(files: File[]) {
    const slots = MAX_REVIEW_PHOTOS - this.state.items.length;
    const accepted = files.slice(0, slots);
    const items = accepted.map(file => {
      const id = this.services.id(); this.files.set(id, file);
      return { id, name: file.name, caption: "", localUrl: "", status: "checking" as const };
    });
    this.set({ items: [...this.state.items, ...items], coverId: this.state.coverId || items[0]?.id || null,
      notice: files.length > slots ? `사진은 최대 ${MAX_REVIEW_PHOTOS}장입니다. 초과한 ${files.length - slots}장은 추가하지 않았습니다.` : "" });
    items.forEach(item => { void this.run(item.id); });
  }
  private async run(id: string) {
    const file = this.files.get(id);
    const item = this.state.items.find(candidate => candidate.id === id);
    if (!file || !item) return;
    this.requests.get(id)?.abort();
    const request = new AbortController(); this.requests.set(id, request);
    const current = () => !request.signal.aborted && this.requests.get(id) === request && this.files.has(id);
    try {
      let asset = item.asset;
      if (!asset) {
        const problem = photoFileProblem(file); if (problem) throw new Error(problem);
        const decoded = await this.services.check(file);
        if (!current()) return;
        if (!decoded.ok) throw new Error(decoded.message);
        const localUrl = this.services.createUrl(file);
        this.patch(id, { localUrl, status: "uploading", error: undefined });
        asset = await this.services.upload(file, request.signal);
        if (!current()) return;
        this.patch(id, { asset });
      }
      this.patch(id, { status: "resolving", error: undefined });
      const metadata = await this.services.resolve(asset.storagePath, request.signal);
      if (!current()) return;
      const created = Date.parse(metadata.createdAt), expires = Date.parse(metadata.expiresAt);
      if (metadata.storagePath !== asset.storagePath || !Number.isFinite(created) || expires - created !== 30 * 86400000) throw new Error("사진의 원래 보관 기간을 확인하지 못했습니다.");
      this.patch(id, { metadata, status: expires <= this.services.now() ? "expired" : "ready", error: undefined });
    } catch (error) {
      if (current()) this.patch(id, { status: (error as { status?: number })?.status === 410 ? "expired" : "failed", error: error instanceof Error ? error.message : "사진을 처리하지 못했습니다." });
    } finally { if (this.requests.get(id) === request) this.requests.delete(id); }
  }
  refresh(id: string) {
    const item = this.state.items.find(candidate => candidate.id === id);
    if (item?.asset && !this.requests.has(id)) return this.run(id);
    return Promise.resolve();
  }
  caption(id: string, caption: string) { this.patch(id, { caption: caption.slice(0, 500) }); }
  cover(id: string) {
    if (this.state.items.some(item => item.id === id && item.status === "ready")) this.set({ ...this.state, coverId: id });
  }
  move(id: string, direction: -1 | 1) {
    const items = [...this.state.items], index = items.findIndex(item => item.id === id), next = index + direction;
    if (index < 0 || next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]]; this.set({ ...this.state, items });
  }
  remove(id: string) {
    this.requests.get(id)?.abort(); this.requests.delete(id); this.files.delete(id);
    const removed = this.state.items.find(item => item.id === id);
    if (removed?.localUrl) this.services.revokeUrl(removed.localUrl);
    const items = this.state.items.filter(item => item.id !== id);
    this.set({ items, coverId: this.state.coverId === id ? items[0]?.id || null : this.state.coverId, notice: "사진을 준비 목록에서 제외했습니다. 이미 전송된 파일은 원래 등록일 기준 30일 후 정리됩니다." });
  }
  clear = () => {
    if (!this.state.items.length && !this.requests.size) return;
    this.requests.forEach(request => request.abort()); this.requests.clear(); this.files.clear();
    this.state.items.forEach(item => { if (item.localUrl) this.services.revokeUrl(item.localUrl); });
    this.set({ items: [], coverId: null, notice: "사진 준비를 취소했습니다. 이미 전송된 파일은 원래 등록일 기준 30일 후 정리됩니다." });
  };
  expire = () => {
    const items = this.state.items.map(item => item.status === "ready" && Date.parse(item.metadata!.expiresAt) <= this.services.now() ? { ...item, status: "expired" as const } : item);
    if (items.some((item, index) => item !== this.state.items[index])) this.set({ ...this.state, items });
  };
  prepared(): PreparedPhotoSet | null {
    const { items, coverId } = this.state;
    if (!items.length || !coverId || !items.some(item => item.id === coverId) || items.some(item => item.status !== "ready" || !item.asset || !item.metadata || Date.parse(item.metadata.expiresAt) <= this.services.now())) return null;
    return { coverId, photos: items.map(item => ({ ...item.asset!, ...item.metadata!, id: item.id, caption: item.caption })) };
  }
}
