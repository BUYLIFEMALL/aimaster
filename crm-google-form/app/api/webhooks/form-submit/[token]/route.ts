import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchSubmissionNotifications } from "@/lib/crm/dispatch";

// Google Apps Script(onFormSubmit)이 보내는 진짜 외부 콜백이라 로그인 세션이 없다.
// checkProgramAccessApi()를 쓸 수 없고, URL의 webhook_token이 crm_form_sources의 실제
// 레코드와 매칭되는지로만 신뢰성을 확보한다 (music의 Suno 웹훅과 동일 원칙,
// docs/ARCHITECTURE.md §1 참고).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let body: { responseId?: string; values?: Record<string, string[]> };
  try {
    body = await req.json();
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

  if (sourceError || !source || !source.is_active) {
    return NextResponse.json({ error: "등록되지 않았거나 비활성화된 폼입니다." }, { status: 404 });
  }

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

  const { data: submission, error: insertError } = await admin
    .from("crm_submissions")
    .insert({
      user_id: source.user_id,
      form_source_id: source.id,
      response_id: body.responseId ?? null,
      raw_values: flatValues,
      name,
      phone,
      email,
    })
    .select("id, user_id, name, phone, email, raw_values")
    .single();

  if (insertError || !submission) {
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
