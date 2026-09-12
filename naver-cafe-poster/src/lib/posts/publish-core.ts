import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createCafeArticle } from "@/lib/naver/client";

interface PublishCafePostParams {
  supabase: SupabaseClient<Database>;
  postId: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  accessToken: string;
  clubId: string;
  menuId: string;
}

interface PublishPostOutcome {
  success: boolean;
  errorMessage?: string;
}

/**
 * 실계정 첫 게시 성공 응답(2026-09-12)으로 실제 필드명을 처음 확인했다 —
 * { message: { result: { articleId, articleUrl, cafeUrl, msg: "Success" } } } 형태.
 * 이 URL을 저장해두면 게시글 상세 화면에서 실제 카페 글로 바로 이동할 수 있다.
 */
function extractArticleUrl(rawResponse: unknown): string | null {
  if (!rawResponse || typeof rawResponse !== "object") return null;
  const message = (rawResponse as { message?: unknown }).message;
  if (!message || typeof message !== "object") return null;
  const result = (message as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const articleUrl = (result as { articleUrl?: unknown }).articleUrl;
  return typeof articleUrl === "string" ? articleUrl : null;
}

/** 카페 글쓰기 API의 content는 그대로 HTML로 저장된다(응답에서 <p>...</p>로 감싸 반환하는 것으로
 * 확인) — 우리가 보내는 일반 텍스트의 개행 문자는 HTML에서 공백으로 무시되므로 <br>로
 * 바꿔줘야 하고, 사용자가 입력한 텍스트에 우연히 <, >, & 같은 문자가 있으면 HTML 구조가
 * 깨지므로 이스케이프해야 한다. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .split("\n")
    .join("<br>");
}

export async function publishCafePost(params: PublishCafePostParams): Promise<PublishPostOutcome> {
  const { supabase, postId, userId, title, content, imageUrl, videoUrl, accessToken, clubId, menuId } = params;

  await supabase
    .from("ncafe_posts")
    .update({ status: "publishing", error_message: null })
    .eq("id", postId)
    .eq("user_id", userId);

  // 실계정 테스트 게시로 두 가지를 확인했다(2026-09-12):
  // 1) content는 HTML로 그대로 저장된다 — 일반 텍스트의 개행(\n)은 HTML에서 공백 취급되어
  //    문단 구분이 전부 사라지고 한 줄로 붙어버렸다. textToHtml()로 <br> 변환해서 해결.
  // 2) 이미지 URL을 그냥 텍스트로 붙이면 실제 이미지로 렌더링되지 않고 일반 링크(<a>)가 되며,
  //    바로 뒤에 공백 없이 본문이 이어지면 네이버의 자동 링크 인식이 뒤 텍스트까지 링크에
  //    같이 삼켜버려 링크 자체가 깨지는 것까지 확인했다 — <img>/<a> 태그로 직접 감싸서 넣으면
  //    이 문제가 없다. 영상은 HTML5 <video> 임베드 지원 여부가 불확실해 링크로만 넣는다.
  const mediaHtml = imageUrl
    ? `<img src="${imageUrl}" /><br><br>`
    : videoUrl
      ? `<a href="${videoUrl}" target="_blank">${videoUrl}</a><br><br>`
      : "";
  const bodyWithMedia = `${mediaHtml}${textToHtml(content)}`;

  // 네이버 API가 국내 리전 기준으로 서비스되어서인지, 해외 리전(Vercel 기본 리전)에서 호출할 때
  // 가끔 응답이 지연되며 "Gateway Timeout"(HTTP 표준 504 사유구문)만 그대로 떨어지는 현상을
  // 실계정 게시 시도에서 재현·확인했다(2026-09-12) — 우리 쪽 코드 오류가 아니라 네트워크
  // 구간의 일시적 지연이라, 이미지 생성 재시도(MAX_IMAGE_ATTEMPTS)와 동일한 패턴으로 한 번 더
  // 시도해본다.
  const MAX_PUBLISH_ATTEMPTS = 2;

  try {
    let result: Awaited<ReturnType<typeof createCafeArticle>> | undefined;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt += 1) {
      try {
        result = await createCafeArticle({ accessToken, clubId, menuId, subject: title, content: bodyWithMedia });
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!result) throw lastError;

    await supabase
      .from("ncafe_posts")
      .update({
        status: "published",
        raw_response: result.rawResponse as never,
        cafe_article_url: extractArticleUrl(result.rawResponse),
        error_message: null,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: true };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    // 우리 코드가 직접 던진 에러는 항상 이 접두어로 시작한다 — 그렇지 않다면 네트워크/게이트웨이
    // 단계에서 원시 에러(예: "Gateway Timeout")가 그대로 올라온 것이라, 원인을 짐작할 수 있게
    // 안내문을 붙여서 저장한다.
    const errorMessage = rawMessage.startsWith("네이버 카페 게시글 등록에 실패했습니다")
      ? rawMessage
      : `네이버 서버 응답이 지연되어 게시에 실패했습니다 (${rawMessage}). 잠시 후 다시 시도해주세요.`;

    await supabase
      .from("ncafe_posts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: false, errorMessage };
  }
}
