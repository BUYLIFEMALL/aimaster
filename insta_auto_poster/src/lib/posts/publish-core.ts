import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { publishInstagramPost, publishInstagramCarousel } from "@/lib/instagram/client";

interface PublishPostParams {
  supabase: SupabaseClient<Database>;
  postId: string;
  userId: string;
  caption: string;
  hashtags: string[];
  igUserId: string;
  accessToken: string;
}

interface PublishPostOutcome {
  success: boolean;
  errorMessage?: string;
}

/** 캡션 본문 + 해시태그 블록을 합쳐 실제 인스타그램에 전송할 캡션 텍스트를 만든다. */
export function buildInstagramCaption(caption: string, hashtags: string[]): string {
  const tags = hashtags.filter((h) => h.trim().length > 0);
  if (tags.length === 0) return caption;
  return `${caption}\n\n${tags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`;
}

// insta_posts/insta_accounts/insta_post_slides 테이블 RLS를 우회해야 하는 예약 게시 배치와,
// 사용자 세션으로 실행되는 즉시 게시 양쪽에서 재사용하는 게시 처리 로직입니다.
// 슬라이드(insta_post_slides)를 slide_order 순으로 조회해서, 1장이면 피드(IMAGE), 2장 이상이면
// 카드뉴스(CAROUSEL)로 자동 분기합니다 (insta_auto_poster/README.md "카드뉴스 아키텍처 결정" 참고).
export async function publishPost(params: PublishPostParams): Promise<PublishPostOutcome> {
  const { supabase, postId, userId, caption, hashtags, igUserId, accessToken } = params;

  await supabase
    .from("insta_posts")
    .update({ status: "publishing", error_message: null })
    .eq("id", postId)
    .eq("user_id", userId);

  try {
    const { data: slides, error: slidesError } = await supabase
      .from("insta_post_slides")
      .select("image_url")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .order("slide_order", { ascending: true });

    if (slidesError) throw new Error(slidesError.message);

    const imageUrls = (slides ?? []).map((s) => s.image_url).filter((url): url is string => !!url);
    if (imageUrls.length === 0) {
      throw new Error("게시할 이미지가 없습니다. 슬라이드 이미지를 먼저 생성해주세요.");
    }

    const finalCaption = buildInstagramCaption(caption, hashtags);
    const { mediaId, permalink } =
      imageUrls.length === 1
        ? await publishInstagramPost({ accessToken, igUserId, imageUrl: imageUrls[0], caption: finalCaption })
        : await publishInstagramCarousel({ accessToken, igUserId, imageUrls, caption: finalCaption });

    await supabase
      .from("insta_posts")
      .update({
        status: "published",
        ig_media_id: mediaId,
        ig_permalink: permalink,
        error_message: null,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    await supabase
      .from("insta_posts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", postId)
      .eq("user_id", userId);

    return { success: false, errorMessage };
  }
}
