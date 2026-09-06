"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveApiKey, PROVIDER_LABELS } from "@/lib/apiKeys";
import { getAiModelProvider } from "@/lib/ai/models";
import { jobFormSchema, parseTargetFields } from "@/lib/validation";
import type { ApiKeyProvider } from "@/types/database.types";

export interface CreateJobState {
  error?: string;
}

function parseJobForm(formData: FormData) {
  return jobFormSchema.safeParse({
    url: formData.get("url"),
    targetFields: formData.get("targetFields"),
    aiModel: formData.get("aiModel"),
    maxRows: formData.get("maxRows"),
  });
}

/** 크롤링 서비스 호출 자체가 실패했을 때(네트워크 오류 등) 작업을 failed로 확정한다.
 * web_crawler_jobs의 RLS는 select/insert만 사용자 본인에게 허용하고(update 정책 없음)
 * 상태 갱신은 원래 Python 서비스가 service role로 하도록 설계돼 있는데, 이 경우는 그
 * 서비스를 아예 못 부른 예외 상황이라 여기서만 admin client(service role)로 직접
 * 갱신한다 — user_id로 필터링해 다른 사용자 행은 건드리지 않는다. */
async function markDispatchFailed(jobId: string, userId: string, message: string) {
  const admin = createAdminClient();
  await admin
    .from("web_crawler_jobs")
    .update({ status: "failed", error_message: message })
    .eq("id", jobId)
    .eq("user_id", userId);
}

export async function createJobAction(
  _prevState: CreateJobState,
  formData: FormData,
): Promise<CreateJobState> {
  const parsed = parseJobForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const targetFields = parseTargetFields(parsed.data.targetFields);
  if (targetFields.length === 0) {
    return { error: "수집할 항목을 1개 이상 입력해주세요." };
  }

  const user = await requireProgramAccess();
  const supabase = await createClient();

  const aiModel = parsed.data.aiModel;
  const aiProvider = getAiModelProvider(aiModel);
  const apiKey = await resolveApiKey(supabase, user.id, aiProvider);
  if (!apiKey) {
    return {
      error: `${PROVIDER_LABELS[aiProvider]} API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요.`,
    };
  }

  const { data: job, error: insertError } = await supabase
    .from("web_crawler_jobs")
    .insert({
      user_id: user.id,
      url: parsed.data.url,
      target_fields: targetFields,
      status: "pending",
      ai_provider: aiProvider,
      ai_model: aiModel,
      max_rows: parsed.data.maxRows,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    return { error: insertError?.message ?? "작업 생성에 실패했습니다." };
  }

  const serviceUrl = process.env.WEB_CRAWLER_SERVICE_URL;
  const serviceSecret = process.env.WEB_CRAWLER_SERVICE_SECRET;

  try {
    if (!serviceUrl || !serviceSecret) {
      throw new Error("크롤링 서비스 환경변수가 설정되지 않았습니다.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(`${serviceUrl}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceSecret}`,
        },
        body: JSON.stringify({
          job_id: job.id,
          user_id: user.id,
          url: parsed.data.url,
          target_fields: targetFields,
          ai_provider: aiProvider,
          ai_model: aiModel,
          ai_api_key: apiKey,
          max_rows: parsed.data.maxRows,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`크롤링 서비스 응답 오류(${response.status})`);
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    await markDispatchFailed(job.id, user.id, "크롤링 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    await logProgramUsage({ userId: user.id, action: "create_job_dispatch_failed" });
    redirect("/jobs");
  }

  await logProgramUsage({ userId: user.id, action: "create_job" });
  redirect("/jobs");
}

/** status='blocked'(CAPTCHA/WAF 감지) 작업을 사다리 B(curl_cffi 그리드 → StealthyFetcher)로
 * 다시 시도한다. API 키는 저장해두지 않으므로 여기서 다시 resolveApiKey()로 조회한다. */
export async function resumeJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("web_crawler_jobs")
    .select("id, url, target_fields, ai_provider, ai_model, max_rows, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job || job.status !== "blocked" || !job.ai_provider || !job.ai_model || !job.max_rows) {
    return;
  }

  const aiProvider = job.ai_provider as ApiKeyProvider;
  const apiKey = await resolveApiKey(supabase, user.id, aiProvider);
  if (!apiKey) {
    await markDispatchFailed(
      job.id,
      user.id,
      `${PROVIDER_LABELS[aiProvider]} API 키를 찾을 수 없습니다. 설정 페이지에서 다시 등록해주세요.`,
    );
    revalidatePath("/jobs");
    return;
  }

  const serviceUrl = process.env.WEB_CRAWLER_SERVICE_URL;
  const serviceSecret = process.env.WEB_CRAWLER_SERVICE_SECRET;

  try {
    if (!serviceUrl || !serviceSecret) {
      throw new Error("크롤링 서비스 환경변수가 설정되지 않았습니다.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(`${serviceUrl}/jobs/${job.id}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceSecret}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          url: job.url,
          target_fields: job.target_fields,
          ai_provider: aiProvider,
          ai_model: job.ai_model,
          ai_api_key: apiKey,
          max_rows: job.max_rows,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`크롤링 서비스 응답 오류(${response.status})`);
      }
    } finally {
      clearTimeout(timeout);
    }

    // 낙관적 갱신 — 실제 최종 상태(성공/실패)는 Python 서비스가 다시 service role로 기록한다.
    const admin = createAdminClient();
    await admin
      .from("web_crawler_jobs")
      .update({ status: "running", error_message: null })
      .eq("id", job.id)
      .eq("user_id", user.id);
  } catch {
    await markDispatchFailed(job.id, user.id, "크롤링 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/jobs");
}

/** status='blocked' 작업을 사용자가 우회 없이 그대로 중단한다. */
export async function cancelJobAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const user = await requireProgramAccess();
  await markDispatchFailed(jobId, user.id, "사용자가 수집을 중단했습니다.");
  revalidatePath("/jobs");
}
