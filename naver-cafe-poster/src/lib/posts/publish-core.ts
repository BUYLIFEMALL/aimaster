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

/** 카페 글쓰기 API는 content를 그대로 HTML로 저장한다(<p>...</p>로 감싸서 반환하는 것으로
 * 확인) — 일반 텍스트의 개행(\n)은 HTML에서 공백으로 무시되어 문단 구분이 전부 사라지고
 * 한 줄로 붙어버리는 것을 실계정 게시로 확인했다(2026-09-13). <br>로 변환해서 넣는다.
 * (2026-09-12에 <img>+<br> 조합을 한 번 시도했다가 403 오류가 났었는데, 그건 이미지 URL을
 * 본문에 텍스트로 넣던 옛 방식과 겹쳐서 난 문제였다 — 이제 이미지는 별도 파일 파트로 분리돼
 * 있어 <br>만 단독으로 쓰는 건 문제 없다는 것을 재확인했다.) */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return escapeHtml(text).split("\n").join("<br>");
}

// cafeGenerator.ts의 appendCtaIfNeeded()가 본문 끝에 "\n\n📢 {문구}\n{URL}" 형태로 순수
// 텍스트를 붙여둔다. 처음엔 이 부분을 직접 <a href> 태그로 바꿔서 보내봤는데, 실계정
// 게시에서 403(내부 오류코드 999)으로 거부당하는 것을 확인했다(2026-09-13) — <img> 태그
// 때와 마찬가지로, 이 API는 <br> 외의 임의 HTML 태그(속성이 있는 <a> 등)가 섞이면 거부하는
// 것으로 보인다. 대신 네이버 카페 자체가 본문에 있는 "http(s)://"로 시작하는 URL을 자동으로
// 링크로 바꿔주는 것을 다른 이미지 URL 사례에서 이미 확인했으므로, URL에 프로토콜만
// 보장해서 순수 텍스트로 남겨두면 네이버가 알아서 클릭 가능한 링크로 바꿔준다.
const CTA_SUFFIX_PATTERN = /\n\n📢 (.+)\n(\S+)$/;

function splitCta(content: string): { body: string; ctaText: string; ctaUrl: string } | null {
  const match = content.match(CTA_SUFFIX_PATTERN);
  if (!match) return null;
  const [full, ctaText, rawCtaUrl] = match;
  const ctaUrl = /^https?:\/\//i.test(rawCtaUrl) ? rawCtaUrl : `https://${rawCtaUrl}`;
  return { body: content.slice(0, content.length - full.length), ctaText, ctaUrl };
}

export async function publishCafePost(params: PublishCafePostParams): Promise<PublishPostOutcome> {
  const { supabase, postId, userId, title, content, imageUrl, videoUrl, accessToken, clubId, menuId } = params;

  await supabase
    .from("ncafe_posts")
    .update({ status: "publishing", error_message: null })
    .eq("id", postId)
    .eq("user_id", userId);

  // 이미지는 createCafeArticle()이 실제 파일(image[0])로 첨부한다(2026-09-12, 커뮤니티에
  // 공개된 구현 사례로 이 API가 multipart/form-data + image[0] 파일 첨부를 지원한다는 것을
  // 확인) — 더 이상 본문에 URL을 텍스트로 붙이지 않는다. 영상은 이 방식으로 첨부 가능한지
  // 아직 미확인이라, 기존처럼 링크로만 넣는다(뒤에 본문이 바로 붙으면 네이버의 자동 링크
  // 인식이 본문 앞부분까지 삼켜버리는 것을 확인했으므로 공백으로 경계를 준다).
  // CTA는 <a> 태그로 만들지 않고, 프로토콜을 보장한 순수 텍스트 URL로 남겨둔다 — 네이버
  // 카페가 본문 안의 "http(s)://"로 시작하는 URL을 자동으로 클릭 가능한 링크로 바꿔주는
  // 것을 다른 이미지 URL 사례에서 이미 확인했다. 문구와 URL을 같은 줄에 공백으로 이어
  // 붙여서 "우측에 URL이 보이고" 요건도 함께 만족시킨다.
  const cta = splitCta(content);
  const bodyText = cta ? `${cta.body}\n\n📢 ${cta.ctaText} ${cta.ctaUrl}` : content;
  const htmlContent = textToHtml(bodyText);
  const bodyWithMedia = videoUrl ? `${videoUrl} ${htmlContent}` : htmlContent;

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
        result = await createCafeArticle({
          accessToken,
          clubId,
          menuId,
          subject: title,
          content: bodyWithMedia,
          imageUrl,
        });
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
