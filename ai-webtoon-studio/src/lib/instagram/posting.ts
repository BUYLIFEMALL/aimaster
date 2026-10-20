import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberInstagramAccount } from "./memberAccount";
import { graphBaseFor, publishInstagramCarousel, publishInstagramPost } from "./publish";

// 인스타그램 API는 공개 이미지 주소만 받는다. INSTA 포스팅 자동화의 공개 게시용 저장소를 함께 쓰되,
// (v1.15, 기준: ai-influencer-studio v1.14 사본) 회원 폴더 아래 `webtoon-insta/`에 게시 직후까지만 두고 지운다(DB 변경 없음).
// INSTA가 이 저장소를 정리하는 기능을 만들면 이 폴더를 고려할 것.
export const INSTA_BUCKET = "insta-post-images";

export function removeImages(paths: string[]) {
  if (!paths.length) return Promise.resolve();
  return createAdminClient().storage.from(INSTA_BUCKET).remove(paths).then(() => undefined).catch(() => undefined);
}

export type PublishOutcome = { ok: true; permalink: string; username: string } | { ok: false; error: string; needConnect?: boolean };

/** 회원 본인 연결값(공용 insta_accounts)으로 사진들을 게시한다(1장=피드, 2~10장=캐러셀). 사진 삭제는 호출부가 한다. */
export async function publishPaths(userId: string, paths: string[], caption: string): Promise<PublishOutcome> {
  const account = await getMemberInstagramAccount(userId);
  if (!account) return { ok: false, error: "연결된 인스타그램 계정이 없습니다. INSTA 포스팅 자동화에서 한 번 연결하면 여기서도 바로 쓸 수 있어요.", needConnect: true };
  if (account.expired) return { ok: false, error: "인스타그램 연결이 만료되었습니다. INSTA 포스팅 자동화에서 다시 연결해 주세요.", needConnect: true };
  const storage = createAdminClient().storage.from(INSTA_BUCKET);
  const imageUrls = paths.map((p) => storage.getPublicUrl(p).data.publicUrl);
  try {
    const base = { graphBase: graphBaseFor(account.authMethod), accessToken: account.accessToken, igUserId: account.igUserId, caption };
    const result = imageUrls.length === 1
      ? await publishInstagramPost({ ...base, imageUrl: imageUrls[0] })
      : await publishInstagramCarousel({ ...base, imageUrls });
    return { ok: true, permalink: result.permalink, username: account.username };
  } catch (err) {
    const msg = String((err as Error)?.message ?? "").split(account.accessToken).join("***").slice(0, 300);
    return { ok: false, error: `인스타그램 게시에 실패했습니다. ${msg}` };
  }
}
