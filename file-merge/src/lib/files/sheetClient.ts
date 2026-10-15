// 화면에서 엑셀 작업을 백그라운드(Worker)로 보내는 함수. Worker를 만들 수 없는 브라우저에서는 같은 처리(sheetStore)를 화면에서 실행한다.
import { handle, type MergeShape, type Pick, type SheetMeta, type SplitOpts, type StoreJob } from "./sheetStore";
import type { Cell } from "./table";
import type { Encoding } from "./text";

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./sheet.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(ev.data.id);
      if (!p) return;
      pending.delete(ev.data.id);
      if (ev.data.ok) p.resolve(ev.data.result); else p.reject(new Error(ev.data.error || "처리 중 오류"));
    };
    worker.onerror = () => {
      // Worker가 죽으면 기다리던 요청을 실패로 돌린다. 보관한 데이터도 사라지므로 화면에서 파일을 다시 올리게 안내한다
      pending.forEach((p) => p.reject(new Error("백그라운드 작업이 중단되었습니다. 파일을 다시 올려 주세요.")));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function run<T>(job: StoreJob, transfer: Transferable[] = []): Promise<T> {
  const w = getWorker();
  if (!w) return new Promise((resolve, reject) => setTimeout(() => { try { Promise.resolve(handle(job) as T).then(resolve, reject); } catch (e) { reject(e); } }, 30));
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ id, job }, transfer);
  });
}

/** 파일을 읽어 백그라운드에 보관하고 시트 목록(이름·행 수)만 받는다 */
export async function loadFile(fileId: string, file: File, enc: Encoding): Promise<SheetMeta[]> {
  const bytes = await file.arrayBuffer();
  return run<SheetMeta[]>({ op: "load", fileId, name: file.name, bytes, enc }, [bytes]);
}
export const dropFile = (fileId: string) => run<boolean>({ op: "drop", fileId });
export const mergePreview = (picks: Pick[], headerRow: number, addSource: boolean, shape: MergeShape, limit = 20) =>
  run<{ allHeader: string[]; header: string[]; rows: Cell[][]; total: number; removed: number; collect: { name: string; rows: number }[] }>({ op: "mergePreview", picks, headerRow, addSource, shape, limit });
/** style: 서식을 가져올 원본 .xlsx 바이트(파일 id별). 넘기면 서식 유지 저장(v1.04) */
export const mergeWrite = (picks: Pick[], headerRow: number, addSource: boolean, shape: MergeShape, format: "xlsx" | "csv", style?: Record<string, ArrayBuffer>) =>
  run<{ bytes: Uint8Array; rows: number; cols: number; removed: number }>({ op: "mergeWrite", picks, headerRow, addSource, shape, format, style }, style ? Object.values(style) : []);
export const collectWrite = (picks: Pick[], style?: Record<string, ArrayBuffer>) => run<{ bytes: Uint8Array }>({ op: "collectWrite", picks, style }, style ? Object.values(style) : []);
export const splitPlan = (opts: SplitOpts) => run<{ header: string[]; outs: { name: string; rows: number }[] }>({ op: "splitPlan", opts });
export const splitWrite = (opts: SplitOpts) => run<{ bytes: Uint8Array; count: number }>({ op: "splitWrite", opts });
