// v1.51 백로그 6 「장면 영상화 일괄」 — 여러 장면을 AI 영상으로 한 장면씩 차례로 만든다(순수 로직, 시험: tests/sceneBatch.test.mjs).
// 규칙(플랜 docs/PLAN_20261112_BACKLOG_8.md §6): 동시 실행 없음 · 한 장면 완성(또는 실패)을 확인한 뒤 다음 장면 · 자동 다시 보내기 없음(이중 과금 방지)
// · 실패한 장면은 목록으로 돌려주고 회원이 「실패한 장면만 다시」를 눌러야 다시 보낸다 · 멈추기는 지금 장면이 끝난 뒤 적용.
// 업체 호출은 기존 장면 영상 API(/api/video/scene)를 그대로 쓴다 — 이 파일은 순서·상태만 다룬다.

export interface BatchSegment { id: string; segment_index: number; image_url: string | null }
export interface BatchJob { [k: string]: unknown }
export type SubmitResult = { state: "done" } | { state: "running"; job: BatchJob };
export type CheckResult = { state: "done" } | { state: "running" };

/** 영상으로 만들 장면: 이미지가 있고, 아직 영상이 없고, 만드는 중이 아닌 장면을 장면 순서대로 */
export function batchTargets(segments: BatchSegment[], videos: Record<string, string | null | undefined>, pending: Set<string>): BatchSegment[] {
  return [...segments]
    .sort((a, b) => a.segment_index - b.segment_index)
    .filter((s) => !!s.image_url && !videos[s.id] && !pending.has(s.id));
}

/** 다음 장면에 이미지가 있는지(「다음 장면과 이어지게」 가능 여부) */
export function hasNextImage(segments: BatchSegment[], s: BatchSegment): boolean {
  return !!segments.find((x) => x.segment_index === s.segment_index + 1)?.image_url;
}

export interface BatchResult { done: string[]; failed: { id: string; error: string }[]; stopped: boolean; left: string[] }

export async function runSceneBatch(o: {
  targets: BatchSegment[];
  submit: (s: BatchSegment) => Promise<SubmitResult>;
  check: (s: BatchSegment, job: BatchJob) => Promise<CheckResult>;
  sleep: (ms: number) => Promise<void>;
  shouldStop: () => boolean;
  onProgress?: (p: { index: number; total: number; segment: BatchSegment; phase: "submit" | "wait" | "done" | "failed" }) => void;
  /** 업체 작업을 보낸 직후·끝난 뒤 알림(장면 카드가 새로고침 뒤에도 이어서 확인하도록 작업 번호 저장·삭제) */
  onJob?: (s: BatchSegment, job: BatchJob | null) => void;
  pollMs?: number;
  /** 확인 최대 횟수(기본 40회 × 15초 = 10분). 넘으면 실패로 두되 작업 번호는 남겨 장면 카드가 이어서 확인 */
  maxPolls?: number;
}): Promise<BatchResult> {
  const pollMs = o.pollMs ?? 15000, maxPolls = o.maxPolls ?? 40;
  const res: BatchResult = { done: [], failed: [], stopped: false, left: [] };
  for (let i = 0; i < o.targets.length; i++) {
    const s = o.targets[i];
    if (o.shouldStop()) { res.stopped = true; res.left = o.targets.slice(i).map((x) => x.id); break; }
    o.onProgress?.({ index: i + 1, total: o.targets.length, segment: s, phase: "submit" });
    let r: SubmitResult;
    try { r = await o.submit(s); } catch (e) { res.failed.push({ id: s.id, error: msgOf(e) }); o.onProgress?.({ index: i + 1, total: o.targets.length, segment: s, phase: "failed" }); continue; }
    if (r.state === "running") {
      o.onJob?.(s, r.job);
      let finished = false;
      for (let k = 0; k < maxPolls; k++) {
        o.onProgress?.({ index: i + 1, total: o.targets.length, segment: s, phase: "wait" });
        await o.sleep(pollMs);
        try {
          const c = await o.check(s, r.job);
          if (c.state === "done") { finished = true; break; }
        } catch (e) { res.failed.push({ id: s.id, error: msgOf(e) }); o.onJob?.(s, null); finished = true; break; }
      }
      if (!finished) { res.failed.push({ id: s.id, error: "시간이 오래 걸려 기다리기를 멈췄습니다. 장면 카드에서 이어서 확인합니다(다시 보내지 않음)." }); o.onProgress?.({ index: i + 1, total: o.targets.length, segment: s, phase: "failed" }); continue; }
      if (res.failed.some((f) => f.id === s.id)) { o.onProgress?.({ index: i + 1, total: o.targets.length, segment: s, phase: "failed" }); continue; }
      o.onJob?.(s, null);
    }
    res.done.push(s.id);
    o.onProgress?.({ index: i + 1, total: o.targets.length, segment: s, phase: "done" });
  }
  return res;
}

function msgOf(e: unknown): string { return e instanceof Error ? e.message : "영상 요청에 실패했습니다."; }
