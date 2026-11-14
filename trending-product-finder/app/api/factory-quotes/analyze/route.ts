import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { analyzeQuotes, QUOTE_MODEL, type QuoteInputFile } from "@/lib/ai/factoryQuotes";
import { fileKind, MAX_FILES, MAX_NAME, MAX_PASTED, MAX_TOTAL_BYTES } from "@/lib/factoryQuotes";

// EC-W10 견적 비교 분석 — 회원이 누를 때 1번. 원본 파일은 저장하지 않고(안 A) Claude로만 보낸 뒤 버린다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (table: string) => any };

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "자료가 너무 크거나 읽을 수 없습니다. 파일 수·크기를 줄여 주세요(합계 4MB)." }, { status: 400 });
  }
  const productName = String(form.get("productName") ?? "").trim().slice(0, MAX_NAME);
  const pastedText = String(form.get("pastedText") ?? "").slice(0, MAX_PASTED);
  const note = String(form.get("note") ?? "").trim().slice(0, 300);
  const projectId = String(form.get("projectId") ?? "");
  let sheets: { name: string; text: string }[] = [];
  try {
    const raw = JSON.parse(String(form.get("sheets") ?? "[]"));
    if (Array.isArray(raw)) sheets = raw.slice(0, MAX_FILES).map((s) => ({ name: String(s?.name ?? "").slice(0, 100), text: String(s?.text ?? "").slice(0, 20000) })).filter((s) => s.text.trim());
  } catch {
    sheets = [];
  }
  if (!productName) return NextResponse.json({ error: "상품 이름을 입력해 주세요." }, { status: 400 });

  const uploads = form.getAll("files").filter((v): v is File => typeof v === "object" && v !== null && "arrayBuffer" in v);
  if (uploads.length > MAX_FILES) return NextResponse.json({ error: `파일은 ${MAX_FILES}개까지 올릴 수 있습니다.` }, { status: 400 });
  const total = uploads.reduce((sum, f) => sum + f.size, 0) + sheets.reduce((sum, s) => sum + s.text.length * 3, 0);
  if (total > MAX_TOTAL_BYTES) return NextResponse.json({ error: "자료가 합계 4MB를 넘습니다. 파일을 나눠 두 번 분석해 주세요." }, { status: 400 });

  const files: QuoteInputFile[] = [];
  for (const f of uploads) {
    const kind = fileKind(f.name, f.type);
    const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
    if (kind === "pdf") files.push({ kind: "pdf", name: f.name.slice(0, 100), base64 });
    else if (kind === "image" && IMAGE_TYPES.has(f.type)) files.push({ kind: "image", name: f.name.slice(0, 100), mediaType: f.type as "image/jpeg", base64 });
    else return NextResponse.json({ error: `「${f.name}」은 읽을 수 없는 형식입니다(PDF·JPG·PNG·엑셀·CSV·TXT).` }, { status: 400 });
  }
  if (!files.length && !sheets.length && !pastedText.trim()) {
    return NextResponse.json({ error: "견적 파일을 올리거나 대화를 붙여 넣어 주세요." }, { status: 400 });
  }

  const supabase = await createClient();
  const apiKey = await resolveApiKey(supabase, userId, "anthropic");
  if (!apiKey) {
    return NextResponse.json({ needsKey: true, error: "Claude API 키가 없습니다. 메인 사이트 API 설정에서 본인 Claude 키를 한 번 등록하면 모든 프로그램에서 함께 씁니다." }, { status: 400 });
  }

  let report;
  try {
    report = await analyzeQuotes(apiKey, { productName, pastedText, sheets, files, note });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401) return NextResponse.json({ needsKey: true, error: "Claude API 키가 올바르지 않습니다. 메인 사이트 API 설정에서 키를 확인해 주세요." }, { status: 400 });
    if (status === 429) return NextResponse.json({ error: "Claude 호출 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
    if (status === 413) return NextResponse.json({ error: "자료가 너무 큽니다. 파일 수를 줄여 주세요." }, { status: 400 });
    if (status === 400 || status === 402) return NextResponse.json({ error: "Claude 계정의 크레딧이나 자료 형식을 확인해 주세요(PDF는 100쪽 이하)." }, { status: 400 });
    const message = err instanceof Error && /[가-힣]/.test(err.message) ? err.message : "AI 분석에 실패했습니다. 잠시 뒤 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 저장: 붙여 넣은 글·파일 이름 목록·결과만(원본 파일은 저장하지 않음). 회원 세션 + 소유자 조건(RLS).
  const db = supabase as unknown as Loose;
  const fileList = [...uploads.map((f) => ({ name: f.name.slice(0, 100), size: f.size })), ...sheets.map((s) => ({ name: s.name, size: s.text.length }))];
  let id = UUID.test(projectId) ? projectId : "";
  if (id) {
    const { data: updated } = await db
      .from("factory_quote_projects")
      .update({ name: productName, pasted_text: pastedText, files: fileList, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    if (!updated?.length) id = "";
  }
  if (!id) {
    const { data: created, error } = await db
      .from("factory_quote_projects")
      .insert({ user_id: userId, name: productName, pasted_text: pastedText, files: fileList })
      .select("id")
      .single();
    if (error || !created) return NextResponse.json({ report, saved: false, error: "결과는 만들었지만 저장하지 못했습니다. 화면을 닫기 전에 복사해 두세요." }, { status: 200 });
    id = created.id;
  }
  const { data: row } = await db
    .from("factory_quote_reports")
    .insert({ project_id: id, user_id: userId, model: QUOTE_MODEL, report })
    .select("id, created_at")
    .single();
  return NextResponse.json({ report, saved: Boolean(row), projectId: id, reportId: row?.id ?? null, createdAt: row?.created_at ?? null });
}
