import { stableJson } from "./postReviewSnapshot";

type Post = { id: string; save_revision?: string; updated_at?: string; [key: string]: any };
type Operation = { fields: Record<string, unknown>; signature: string; method: string; body: Record<string, unknown> };
export class PostSaveClient {
  readonly id: string;
  readonly initialRevision: string | undefined;
  revision: string | undefined;
  pending: Operation | null = null;
  busy = false;
  private create: boolean;
  private conflict = false;
  get needsSaveRecovery() { return this.create || !this.revision || this.busy || Boolean(this.pending) || this.conflict; }
  constructor(post: Post, create = false, private transport: typeof fetch = fetch, private uuid = () => crypto.randomUUID()) {
    this.id = post.id; this.initialRevision = post.save_revision; this.revision = post.save_revision; this.create = create;
  }
  adopt(post: Post, expected: string | undefined) {
    if (post.id === this.id && this.revision === expected && !this.pending && !this.busy) this.revision = post.save_revision;
  }
  private async send(operation: Operation): Promise<Post> {
    const response = await this.transport.call(globalThis, "/api/posts", {method: operation.method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(operation.body)});
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409) { this.conflict = true; this.pending = null; }
      if (response.status >= 400 && response.status < 500 && response.status !== 409) this.pending = null;
      throw new Error(data.error || "원고 저장을 확인하지 못했습니다. 같은 내용으로 다시 저장해 주세요.");
    }
    if (data.success !== true || data.post?.id !== this.id || typeof data.post?.save_revision !== "string") throw new Error("원고 저장 응답을 확인하지 못했습니다. 같은 내용으로 다시 저장해 주세요.");
    this.revision = data.post.save_revision; this.create = false; this.pending = null;
    return data.post;
  }
  async save(fields: Record<string, unknown>): Promise<Post> {
    if (this.busy) throw new Error("이 원고를 저장 중입니다. 저장 확인 후 다시 시도해 주세요.");
    if (this.conflict) throw new Error("다른 탭 또는 작업에서 원고가 변경됐습니다. 편집 내용을 복사해 보관한 뒤 최신 원고를 다시 열어 비교해 주세요.");
    this.busy = true;
    try {
      const signature = stableJson(fields);
      const captured = JSON.parse(signature);
      if (this.pending) {
        const previous = this.pending;
        const acknowledged = await this.send(previous);
        if (previous.signature === signature) return acknowledged;
      }
      const method = this.create ? "POST" : "PUT";
      this.pending = {fields: captured, signature, method, body: {...captured, id: this.id, save_request_id: this.uuid(),
        ...(this.create ? {create: true} : {expected_revision: this.revision})}};
      return await this.send(this.pending);
    } finally { this.busy = false; }
  }
}

// A late save response only merges its own row and never replaces a newer read.
export function mergeSavedPosts<T extends Post>(current: T[], acknowledged: T[], removed: string[] = []): T[] {
  const updates = new Map(acknowledged.map(post => [post.id, post]));
  const remaining = current.filter(post => !removed.includes(post.id)).map(post => {
    const next = updates.get(post.id); updates.delete(post.id);
    if (!next || Date.parse(post.updated_at || "") > Date.parse(next.updated_at || "")) return post;
    return {...post, ...next};
  });
  return [...updates.values(), ...remaining];
}
