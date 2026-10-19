import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed, NeedsAsyncParseError, parseDocument, submitAsyncParse } from "./upstage";
import { chunkText, fileKind } from "./core";

// 문서 저장 과정(공용): 글 읽기 → 조각 나누기 → 임베딩 → 저장. 원본 파일은 보관하지 않는다.
// onStage로 진행 단계를 알려 화면이 「읽는 중 → 조각 → 임베딩 → 저장」을 보여 준다(U2).
// 100쪽이 넘어 Upstage 동기 읽기가 거절되면 비동기 요청으로 넘기고 request_id를 돌려준다(L3).

export type IngestStage = "read" | "chunk" | "embed" | "save";

export interface IngestedDoc {
  id: string;
  name: string;
  size_bytes: number;
  chunk_count: number;
  created_at: string;
}

export type UploadOutcome = { kind: "done"; document: IngestedDoc } | { kind: "async"; requestId: string };

export class IngestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** 이미 뽑은 글을 조각 → 임베딩 → 저장 */
export async function ingestText(opts: {
  admin: SupabaseClient;
  userId: string;
  apiKey: string;
  name: string;
  sizeBytes: number;
  text: string;
  onStage?: (stage: IngestStage) => void;
}): Promise<IngestedDoc> {
  const { admin, userId, apiKey, name, sizeBytes, text, onStage } = opts;

  onStage?.("chunk");
  const chunks = chunkText(text);
  if (!chunks.length) throw new IngestError("문서에서 읽을 수 있는 글을 찾지 못했습니다.", 400);

  onStage?.("embed");
  let vectors: number[][];
  try {
    vectors = await embed(apiKey, chunks, "passage");
  } catch (err) {
    throw new IngestError((err as Error).message || "문서 임베딩에 실패했습니다.", 502);
  }

  onStage?.("save");
  const { data: doc, error: docErr } = await admin
    .from("dcb_documents")
    .insert({ user_id: userId, name, size_bytes: sizeBytes, chunk_count: chunks.length })
    .select("id, name, size_bytes, chunk_count, created_at")
    .single();
  if (docErr || !doc) throw new IngestError("문서를 저장하지 못했습니다.", 500);

  const rows = chunks.map((content, i) => ({ document_id: doc.id, user_id: userId, chunk_index: i, content, embedding: JSON.stringify(vectors[i]) }));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await admin.from("dcb_chunks").insert(rows.slice(i, i + 100));
    if (error) {
      await admin.from("dcb_documents").delete().eq("id", doc.id).eq("user_id", userId);
      throw new IngestError("문서 조각을 저장하지 못했습니다. 다시 시도해 주세요.", 500);
    }
  }
  return doc as IngestedDoc;
}

/** 파일 하나를 처리한다 — TXT·MD·CSV는 바로, 나머지는 Upstage 문서 읽기(100쪽 초과면 비동기 요청) */
export async function processFile(opts: {
  admin: SupabaseClient;
  userId: string;
  apiKey: string;
  name: string;
  file: Blob;
  onStage?: (stage: IngestStage) => void;
}): Promise<UploadOutcome> {
  const { apiKey, name, file, onStage } = opts;
  onStage?.("read");
  let text: string;
  try {
    text = fileKind(name) === "text" ? await file.text() : await parseDocument(apiKey, file, name);
  } catch (err) {
    if (err instanceof NeedsAsyncParseError) {
      try {
        return { kind: "async", requestId: await submitAsyncParse(apiKey, file, name) };
      } catch (e) {
        throw new IngestError((e as Error).message || "큰 문서 읽기를 요청하지 못했습니다.", 502);
      }
    }
    throw new IngestError((err as Error).message || "문서를 읽지 못했습니다.", 502);
  }
  return { kind: "done", document: await ingestText({ ...opts, sizeBytes: file.size, text }) };
}

/** 진행 단계를 한 줄 JSON으로 흘려보내는 응답. 마지막 줄은 done · async · error 중 하나 */
export function ingestStream(run: (onStage: (s: IngestStage) => void) => Promise<UploadOutcome>, onFinally?: () => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const out = await run((stage) => send({ type: "stage", stage }));
        send(out.kind === "done" ? { type: "done", document: out.document } : { type: "async", requestId: out.requestId });
      } catch (err) {
        send({ type: "error", error: (err as Error).message || "문서를 올리지 못했습니다." });
      } finally {
        await onFinally?.().catch(() => undefined);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
