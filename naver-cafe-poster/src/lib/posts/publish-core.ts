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

export async function publishCafePost(params: PublishCafePostParams): Promise<PublishPostOutcome> {
  const { supabase, postId, userId, title, content, imageUrl, videoUrl, accessToken, clubId, menuId } = params;

  await supabase
    .from("ncafe_posts")
    .update({ status: "publishing", error_message: null })
    .eq("id", postId)
    .eq("user_id", userId);

  // 네이버 카페 글쓰기 오픈API가 본문 안에서 이미지/영상 URL을 실제 미디어로 렌더링해주는지
  // 아직 확인 못 했다(공식 문서 접근 불가) — 우선 본문 맨 위에 URL 한 줄로 덧붙이는
  // 최선의 시도로 넣고, 실계정 첫 배포 후 실제로 렌더링되는지 확인해서 필요하면
  // API 파라미터(예: contentType=HTML, <img>/<video> 태그)를 다시 조정할 것.
  // 이미지/영상은 UI에서 서로 배타적으로 관리되므로 동시에 둘 다 값이 있을 일은 없다.
  const mediaUrl = imageUrl || videoUrl;
  const bodyWithMedia = mediaUrl ? `${mediaUrl}\n\n${content}` : content;

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
