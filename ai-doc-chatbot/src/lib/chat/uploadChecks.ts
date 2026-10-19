import "server-only";
import { NextResponse } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { fileKind, isDuplicateDoc, STORAGE_UPLOAD_MAX } from "./core";

// 문서 올리기 전 확인(문서 API·업로드 주소 API·비동기 저장 API 공용)

export const MAX_DOCS = 30;
const FORMAT_ERROR = "지원하지 않는 형식입니다. TXT·MD·CSV·PDF·DOCX·PPTX·XLSX·HWP·이미지를 올려 주세요.";

/** 형식·크기 확인. 문제가 있으면 오류 응답 */
export function validateUpload(name: string, size: number): Response | null {
  if (!name || !fileKind(name)) return NextResponse.json({ error: FORMAT_ERROR }, { status: 400 });
  if (size <= 0) return NextResponse.json({ error: "빈 파일입니다." }, { status: 400 });
  if (size > STORAGE_UPLOAD_MAX) return NextResponse.json({ error: `파일은 ${STORAGE_UPLOAD_MAX / 1024 / 1024}MB까지 올릴 수 있습니다. 큰 문서는 나눠서 올려 주세요.` }, { status: 400 });
  return null;
}

/** 문서 개수 한도·같은 문서 중복(L5) 확인. 문제가 있으면 오류 응답, 없으면 null */
export async function checkDocLimits(admin: ReturnType<typeof createAdminClient>, userId: string, name: string, size: number): Promise<Response | null> {
  const { data: existing } = await admin.from("dcb_documents").select("name, size_bytes").eq("user_id", userId);
  const list = existing ?? [];
  if (list.length >= MAX_DOCS) return NextResponse.json({ error: `문서는 ${MAX_DOCS}개까지 올릴 수 있습니다. 안 쓰는 문서를 지운 뒤 다시 올려 주세요.` }, { status: 400 });
  if (isDuplicateDoc(list as { name: string; size_bytes: number }[], name, size)) {
    return NextResponse.json({ error: "같은 문서(이름·크기 동일)를 이미 올렸습니다. 다시 올리려면 기존 문서를 먼저 삭제해 주세요.", duplicate: true }, { status: 409 });
  }
  return null;
}
