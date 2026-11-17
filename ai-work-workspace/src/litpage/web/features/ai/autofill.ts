
//   import { runAutofill } from '../ai/autofill.ts';
//   await runAutofill(rowId, propId, 'summary');                  // Summary
//   await runAutofill(rowId, propId, 'keywords');                 // Key info
//   await runAutofill(rowId, propId, 'translation', { language: 'Korean' });
//   await runAutofill(rowId, propId, 'custom', { prompt: 'Classify the sentiment' });
// The server builds the row context (title, properties, page body), asks Claude, and returns the value
// already encoded for the property type; this helper writes it with a transaction (undoable, synced).

import type { BlockRecord, CollectionRecord, PropertySchema } from '#shared/records.ts';
import { api } from '../../lib/api.ts';
import { run, setProperty } from '../../lib/blocks.ts';
import { records } from '../../lib/store/records.ts';
import { useAiStatus, NO_KEY_MESSAGE } from './aiApi.ts';

export type AutofillKind = 'summary' | 'keywords' | 'translation' | 'custom';

export interface AutofillResult {
  text: string;
  value: unknown[];
  /** 2026-11-17 E3-4 「웹에서 찾기」: 값의 근거가 된 출처(서버가 검색 결과 번호에서만 만든 것) */
  sources?: { n: number; title: string; url: string }[];
  /** 출처 주소를 고른 URL 칸에 함께 저장했는지 / 건너뛴 이유 */
  sourceSaved?: boolean;
  sourceSkipped?: 'exists';
}

/** 「웹에서 찾기」 실행 선택(기본 모두 꺼짐) */
export interface AutofillWebOpts {
  web?: boolean;
  /** 출처 주소를 넣을 같은 행의 URL 칸(회원이 직접 고른 것만) */
  sourceProp?: string;
  /** 그 칸에 이미 주소가 있어도 바꿀지(직접 고른 경우만) */
  overwriteSource?: boolean;
}

/**
 * E3-4: 출처 주소를 같은 행의 URL 칸에 쓸지 정한다(순수 함수). 쓰지 않는 경우: 칸을 고르지 않음·채우는 칸 자신·URL 칸이 아님·
 * 출처 없음(→ 빈 값으로 지우지 않음)·이미 값이 있는데 덮어쓰기를 고르지 않음·http(s)가 아닌 주소.
 */
export function sourceUrlToWrite(input: {
  schema: Record<string, PropertySchema> | undefined; targetPropId: string; sourceProp?: string; overwrite?: boolean;
  current: unknown; sources?: { url: string }[];
}): { url: string } | { skip: 'none' | 'exists' } {
  const { schema, targetPropId, sourceProp, overwrite, current, sources } = input;
  if (!sourceProp || sourceProp === targetPropId || schema?.[sourceProp]?.type !== 'url') return { skip: 'none' };
  const url = sources?.[0]?.url ?? '';
  if (!/^https?:\/\//i.test(url)) return { skip: 'none' };
  const has = Array.isArray(current) && current.some((d) => Array.isArray(d) && typeof d[0] === 'string' && d[0].trim());
  if (has && !overwrite) return { skip: 'exists' };
  return { url };
}


export async function fetchAutofill(rowId: string, propId: string, kind: AutofillKind, opts?: { prompt?: string; language?: string; web?: boolean }): Promise<AutofillResult> {
  try {
    return await api<AutofillResult>('aiAutofill', { rowId, propId, kind, prompt: opts?.prompt, language: opts?.language, ...(opts?.web ? { web: true } : {}) });
  } catch (e: any) {
    if (e?.message === NO_KEY_MESSAGE) useAiStatus.getState().markUnconfigured();
    throw e;
  }
}


export async function runAutofill(rowId: string, propId: string, kind: AutofillKind, opts?: { prompt?: string; language?: string } & AutofillWebOpts): Promise<AutofillResult> {
  const res = await fetchAutofill(rowId, propId, kind, opts);
  // E3-4: 값과 출처 주소를 같은 회원 거래 하나로(서버가 칸 권한을 함께 확인 — 하나라도 거절되면 둘 다 반영 안 됨)
  let write: { url: string } | { skip: 'none' | 'exists' } = { skip: 'none' };
  if (opts?.web) {
    const row = records.get<BlockRecord>('block', rowId);
    const schema = records.get<CollectionRecord>('collection', row?.parent_id ?? '')?.schema;
    write = sourceUrlToWrite({ schema, targetPropId: propId, sourceProp: opts.sourceProp, overwrite: opts.overwriteSource, current: (row?.properties as Record<string, unknown> | undefined)?.[opts.sourceProp ?? ''], sources: res.sources });
  }
  run('aiAutofill', (tx) => {
    setProperty(tx, rowId, propId, res.value);
    if ('url' in write) setProperty(tx, rowId, opts!.sourceProp!, [[write.url]]);
  });
  return { ...res, sourceSaved: 'url' in write, ...('skip' in write && write.skip === 'exists' ? { sourceSkipped: 'exists' as const } : {}) };
}


export async function runAutofillAll(rowIds: string[], propId: string, kind: AutofillKind, opts?: { prompt?: string; language?: string; concurrency?: number; onProgress?: (done: number, total: number) => void } & AutofillWebOpts) {
  let done = 0;
  const queue = [...rowIds];
  const errors: { rowId: string; message: string }[] = [];
  const web = { saved: 0, skippedExisting: 0, sources: 0 };
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift()!;
      try {
        const r = await runAutofill(id, propId, kind, opts);
        if (r.sourceSaved) web.saved++;
        if (r.sourceSkipped === 'exists') web.skippedExisting++;
        web.sources += r.sources?.length ?? 0;
      } catch (e: any) {
        errors.push({ rowId: id, message: e?.message ?? 'Failed' });
        if (e?.message === NO_KEY_MESSAGE) queue.length = 0;
      }
      opts?.onProgress?.(++done, rowIds.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts?.concurrency ?? 3, rowIds.length)) }, worker));
  return { errors, web };
}
