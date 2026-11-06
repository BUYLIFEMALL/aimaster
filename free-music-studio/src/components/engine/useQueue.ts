"use client";

import { useCallback, useEffect, useState } from "react";
import { hasQueue, listQueue, markJobRecorded, trackRecordOf, type QueueJob } from "@/lib/engine";
import { useEngine } from "./useEngine";

// 같은 작업을 두 화면(좌측 메뉴·대기열 화면)이 동시에 기록하지 않게
const recording = new Set<string>();

/** 끝났는데 아직 「모든 음악」 기록이 없는 작업을 기록한다. 기록 API는 같은 곡 번호를 두 번 받아도 성공으로 돌려준다. */
async function recordFinished(jobs: QueueJob[]): Promise<boolean> {
  let changed = false;
  for (const job of jobs) {
    if (job.status !== "done" || job.recorded || recording.has(job.id)) continue;
    if (job.kind === "stems") continue; // Stem 분리 결과는 곡이 아니라 PC 「Stem」 폴더의 WAV — 「모든 음악」에 기록하지 않는다
    recording.add(job.id);
    try {
      // 가사 자동 맞추기 — 새 곡이 아니라 원곡 기록의 가사 시간을 바꾼다
      const res =
        job.kind === "align"
          ? await fetch(`/api/tracks/${job.result?.sourceId ?? job.track.parent_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lyric_timing: job.result?.timing }) })
          : await fetch("/api/tracks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trackRecordOf(job)) });
      // 가사 맞추기 결과를 받을 곡이 없거나(지움) 형식이 맞지 않으면 다시 시도하지 않는다
      if (res.ok || (job.kind === "align" && (res.status === 400 || res.status === 404))) {
        await markJobRecorded(job.id);
        changed = true;
      }
    } catch {
      // 다음 확인 때 다시 한다
    } finally {
      recording.delete(job.id);
    }
  }
  return changed;
}

/** 내 PC 엔진 작업 대기열 — 몇 초마다 확인하고, 끝난 곡은 자동으로 「모든 음악」에 기록한다. */
export function useQueue(intervalMs = 4000) {
  const engine = useEngine();
  const supported = engine.paired && hasQueue(engine.status);
  const [jobs, setJobs] = useState<QueueJob[]>([]);

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      let list = await listQueue();
      if (await recordFinished(list)) list = await listQueue();
      setJobs(list);
    } catch {
      // 엔진이 잠깐 응답하지 않으면 다음 확인 때
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) {
      setJobs([]);
      return;
    }
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [supported, refresh, intervalMs]);

  return { engine, supported, jobs, refresh };
}
