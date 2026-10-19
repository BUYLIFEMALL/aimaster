import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "./upstage";
import { chunkText } from "./core";

// 문서 저장 과정(공용): 글 읽기 → 조각 나누기 → 임베딩 → 저장. 원본 파일은 보관하지 않는다.
// onStage로 진행 단계를 알려 화면이 「읽는 중 → 조각 → 임베딩 → 저장」을 보여 준다(U2).

export type IngestStage = "read" | "chunk" | "embed" | "save";

export interface IngestedDoc {
  id: string;
  name: string;
  size_bytes: number;
  chunk_count: number;
  created_at: string;
}

export class IngestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function ingestDocument(opts: {
  admin: SupabaseClient;
  userId: string;
  apiKey: string;
  name: string;
  sizeBytes: number;
  readText: () => Promise<string>;
  onStage?: (stage: IngestStage) => void;
}): Promise<IngestedDoc> {
  const { admin, userId, apiKey, name, sizeBytes, readText, onStage } = opts;

  onStage?.("read");
  let text: string;
  try {
    text = await readText();
  } catch (err) {
    throw new IngestError((err as Error).message || "문서를 읽지 못했습니다.", 502);
  }

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

/** 진행 단계를 한 줄 JSON으로 흘려보내는 응답. 마지막 줄은 done 또는 error */
export function ingestStream(run: (onStage: (s: IngestStage) => void) => Promise<IngestedDoc>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const document = await run((stage) => send({ type: "stage", stage }));
        send({ type: "done", document });
      } catch (err) {
        send({ type: "error", error: (err as Error).message || "문서를 올리지 못했습니다." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
