"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { generateEmailDraft } from "@/lib/ai/emailPrompts";
import { generateEmailImagePrompt, generateEmailImage } from "@/lib/ai/emailImage";
import { persistEmailImage } from "@/lib/storage";

export interface GenerateDraftState {
  error?: string;
  needsApiKey?: string; // "openai"
  draftId?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** blog의 AI 글쓰기 폼과 동일한 흐름: 주제/키워드/참고링크/추천링크/추가지시사항을 받아 AI가
 * 제목+본문을 만들고, 바로 stepmail_email_drafts에 저장한다(이후 /drafts/[id]에서 검토/수정). */
export async function generateDraftAction(formData: FormData): Promise<GenerateDraftState> {
  const user = await requireProgramAccess();

  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) return { error: "이메일 주제를 입력해주세요." };

  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const referenceUrls = [
    String(formData.get("referenceUrl1") ?? "").trim(),
    String(formData.get("referenceUrl2") ?? "").trim(),
    String(formData.get("referenceUrl3") ?? "").trim(),
  ].filter(Boolean);
  const ctaText = String(formData.get("ctaText") ?? "").trim() || undefined;
  const ctaUrl = String(formData.get("ctaUrl") ?? "").trim() || undefined;
  const customPrompt = String(formData.get("customPrompt") ?? "").trim() || undefined;

  const supabase = await createClient();
  const openaiKey = await resolveApiKey(supabase, user.id, "openai");
  if (!openaiKey) return { needsApiKey: "openai" };

  try {
    const result = await generateEmailDraft({ topic, keywords, referenceUrls, ctaText, ctaUrl, customPrompt }, openaiKey);

    // 이메일 핵심 주제를 반영한 이미지도 함께 만든다(blog의 이미지 생성 패턴 참고, Gemini
    // 본인 키 필요). 이미지는 있으면 좋은 부가 기능이라, 키가 없거나 생성에 실패해도 이메일
    // 초안 저장 자체는 막지 않고 이미지 없이 계속 진행한다.
    let imageUrl: string | null = null;
    let bodyHtml = result.bodyHtml;
    const geminiKey = await resolveApiKey(supabase, user.id, "gemini");
    if (geminiKey) {
      try {
        const imagePrompt = await generateEmailImagePrompt(
          { topic, keywords, subject: result.subject, bodyText: stripHtml(result.bodyHtml) },
          openaiKey,
        );
        const image = await generateEmailImage(imagePrompt, geminiKey);
        imageUrl = await persistEmailImage(supabase, user.id, image.base64, image.mimeType);
        bodyHtml = `<img src="${imageUrl}" alt="${result.subject}" style="width:100%;max-width:600px;border-radius:12px;margin-bottom:16px;display:block;" />\n${bodyHtml}`;
      } catch {
        // 이미지 생성 실패 — 텍스트 초안은 그대로 저장 진행
      }
    }

    const { data: draft, error } = await supabase
      .from("stepmail_email_drafts")
      .insert({
        user_id: user.id,
        topic,
        keywords,
        reference_urls: referenceUrls,
        cta_text: ctaText ?? null,
        cta_url: ctaUrl ?? null,
        custom_prompt: customPrompt ?? null,
        subject: result.subject,
        body_html: bodyHtml,
        image_url: imageUrl,
      })
      .select("id")
      .single();

    if (error || !draft) return { error: error?.message ?? "초안 저장에 실패했습니다." };

    await logProgramUsage({ userId: user.id, action: "generate_email_draft", metadata: { draftId: draft.id } });
    revalidatePath("/drafts");
    return { draftId: draft.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "이메일 초안 생성 중 오류가 발생했습니다." };
  }
}

export interface UpdateDraftState {
  error?: string;
}

/** 사용자가 AI 초안을 검토/수정한 뒤 최종 저장한다. */
export async function updateDraftAction(draftId: string, subject: string, bodyHtml: string): Promise<UpdateDraftState> {
  const user = await requireProgramAccess();
  if (!subject.trim()) return { error: "제목을 입력해주세요." };
  if (!bodyHtml.trim()) return { error: "본문을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("stepmail_email_drafts")
    .update({ subject: subject.trim(), body_html: bodyHtml })
    .eq("id", draftId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/drafts");
  revalidatePath(`/drafts/${draftId}`);
  return {};
}

export async function deleteDraftAction(draftId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("stepmail_email_drafts").delete().eq("id", draftId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/drafts");
  return {};
}
