import { z } from "zod";
import { APP_VERSION } from "../version";
import { stateSchema, type StudioState } from "./model";
export const backupSchema = z
  .object({
    program: z.literal("document-translator"),
    version: z.literal(1),
    appVersion: z.string().regex(/^v1\.\d{2}$/),
    exportedAt: z.iso.datetime(),
    title: z.string().max(120),
    document: stateSchema,
  })
  .strict();
export function makeBackup(title: string, document: StudioState) {
  return backupSchema.parse({
    program: "document-translator",
    version: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    title,
    document,
  });
}
export function parseBackup(text: string) {
  if (new TextEncoder().encode(text).length > 4 * 1024 * 1024)
    throw new Error("JSON 백업은 4MB까지 불러올 수 있습니다.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("올바른 JSON 백업이 아닙니다.");
  }
  const result = backupSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      "이 프로그램의 백업이 아니거나 내용·문단 정보가 올바르지 않습니다.",
    );
  if (new Date(result.data.exportedAt).getTime() > Date.now() + 60_000)
    throw new Error("백업 생성 시각을 확인해주세요.");
  if (Number(result.data.appVersion.slice(1)) > Number(APP_VERSION.slice(1)))
    throw new Error(
      "더 최신 버전의 백업입니다. 프로그램을 업데이트한 뒤 불러와주세요.",
    );
  return result.data;
}
