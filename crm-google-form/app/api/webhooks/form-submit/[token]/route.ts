import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchSubmissionNotifications } from "@/lib/crm/dispatch";
import { checkWebhookBodyBytes, classifyWebhookBody } from "@/lib/crm/dedupe";

// Google Apps Script(onFormSubmit)이 보내는 진짜 외부 콜백이라 로그인 세션이 없다.
// checkProgramAccessApi()를 쓸 수 없고, URL의 webhook_token이 crm_form_sources의 실제
// 레코드와 매칭되는지로만 신뢰성을 확보한다 (music의 Suno 웹훅과 동일 원칙,
// docs/ARCHITECTURE.md §1 참고).
//
// fetchCache를 명시적으로 꺼둔다 — Next.js Data Cache가 supabase-js의 내부 fetch를 캐싱해서
// is_active 토글 등 최근 변경사항을 못 읽는 문제가 실제로 재현된 적이 있다(app/api/cron/followup
// 참고). 웹훅은 매 요청 최신 상태를 읽어야 하므로 동일하게 방어적으로 적용한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // CRM18-06 U1(2026-11-18): 본문을 다 읽은 뒤 실제 UTF-8 바이트로 64KiB를 넘으면 거절한다
  // (요청 스트림을 중간에 끊는 상한은 아님 — 다 읽은 다음의 제한). 오류 응답에는 토큰·본문·DB 원문을 넣지 않는다.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  if (!checkWebhookBodyBytes(raw).ok) {
    return NextResponse.json({ error: "요청 본문이 너무 큽니다." }, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: source, error: sourceError } = await admin
    .from("crm_form_sources")
    .select(
      "id, user_id, name, field_mapping, notify_email, notify_telegram, notify_sms, notify_alimtalk, notify_friendtalk, kakao_template_id, kakao_variables, is_active",
    )
    .eq("webhook_token", token)
    .maybeSingle();

  // 조회 실패(DB 오류)와 진짜 없음·꺼짐을 구분한다 — 실패를 404로 숨기지 않는다.
  if (sourceError) {
    return NextResponse.json({ error: "폼 연결을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
  if (!source || !source.is_active) {
    return NextResponse.json({ error: "등록되지 않았거나 비활성화된 폼입니다." }, { status: 404 });
  }

  // 회원·폼은 토큰으로 찾은 source만 믿는다(본문의 어떤 id도 쓰지 않음). v2만 중복 키, 구버전은 지금처럼(보호 없음).
  const kind = classifyWebhookBody(source.id, parsed);
  if (kind.type === "invalid") {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const body = parsed as { responseId?: unknown; values?: Record<string, string[]> };

  // Apps Script의 e.namedValues는 { "질문 제목": ["답변"] } 형태(응답 하나가 배열)라, 화면/알림에
  // 쓰기 좋게 첫 값만 꺼내서 평탄화한다.
  const flatValues: Record<string, string> = {};
  for (const [question, answers] of Object.entries(body.values ?? {})) {
    flatValues[question] = Array.isArray(answers) ? answers[0] ?? "" : String(answers ?? "");
  }

  const mapping = (source.field_mapping ?? {}) as Record<string, string>;
  const name = mapping.name ? flatValues[mapping.name] ?? null : null;
  const phone = mapping.phone ? flatValues[mapping.phone] ?? null : null;
  const email = mapping.email ? flatValues[mapping.email] ?? null : null;

  const insertValues: Record<string, unknown> = {
    user_id: source.user_id,
    form_source_id: source.id,
    response_id: typeof body.responseId === "string" ? body.responseId : null,
    raw_values: flatValues,
    name,
    phone,
    email,
  };
  // 구버전 본문은 dedupe_key 칸을 아예 보내지 않는다(DDL 적용 전 운영 스키마와 호환). v2는 DDL이 먼저 있어야 한다.
  if (kind.type === "v2") insertValues.dedupe_key = kind.dedupeKey;

  // dedupe_key는 DDL 초안(20261118120000)에서 생기는 칸이라 생성된 DB 형식(types/database.types.ts)에 아직 없다 — 형식 없는 클라이언트로 넣는다.
  const untyped = admin as unknown as SupabaseClient;
  let submission: { id: string; user_id: string; name: string | null; phone: string | null; email: string | null; raw_values: Record<string, string> } | null = null;
  let insertError: { code?: string } | null = null;
  try {
    const res = await untyped
      .from("crm_submissions")
      .insert(insertValues)
      .select("id, user_id, name, phone, email, raw_values")
      .single();
    submission = res.data;
    insertError = res.error;
  } catch {
    // 응답 유실: 실제로는 저장됐을 수 있다 — 발송하지 않는다(같은 v2 본문이 다시 오면 아래 중복 확인으로 막힘).
    return NextResponse.json({ error: "접수 저장 결과를 확인하지 못했습니다." }, { status: 500 });
  }

  if (insertError || !submission) {
    // 23505라도 무조건 중복으로 보지 않는다 — v2이고, 같은 회원·폼·키의 기존 행이 실제로 있는 것을 다시 읽어 확인한 경우만.
    if (kind.type === "v2" && insertError?.code === "23505" && (await confirmDuplicate(untyped, source.user_id, source.id, kind.dedupeKey))) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "접수 저장에 실패했습니다." }, { status: 500 });
  }

  const result = await dispatchSubmissionNotifications(
    {
      id: source.id,
      user_id: source.user_id,
      name: source.name,
      notify_email: source.notify_email,
      notify_telegram: source.notify_telegram,
      notify_sms: source.notify_sms,
      notify_alimtalk: source.notify_alimtalk,
      notify_friendtalk: source.notify_friendtalk,
      kakao_template_id: source.kakao_template_id,
      kakao_variables: source.kakao_variables as Record<string, string>,
    },
    submission,
  );

  await admin
    .from("crm_submissions")
    .update({ status: result.status, error_message: result.errorMessage ?? null })
    .eq("id", submission.id);

  return NextResponse.json({ ok: true, submissionId: submission.id, status: result.status });
}

/** 같은 회원·폼·중복 키의 기존 접수가 정확히 1행 있는지 다시 읽어 확인한다. 오류·예외·이상한 응답이면 false(중복으로 보지 않음). */
async function confirmDuplicate(
  admin: SupabaseClient,
  userId: string,
  formSourceId: string,
  dedupeKey: string,
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("crm_submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("form_source_id", formSourceId)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (error || data === null || typeof data !== "object" || Array.isArray(data)) return false;
    return typeof (data as { id?: unknown }).id === "string";
  } catch {
    return false;
  }
}
