"use server";
// 상품에 쇼츠(유튜브) 붙이기 — MOV-20261119-01. 부르는 화면은 송수신 계약 수정판 뒤에 붙인다(지금은 부르는 곳이 없다).
// 순서와 판정은 lib/productVideo.ts attachVideo(다시 검사 → 본인 상품 확인 → 저장). 여기서는 로그인 회원 세션의 DB만 연결한다.
// 관리자 키를 쓰지 않는다 — DB 권한 정책(본인 행·본인 상품)이 한 번 더 막는다.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { attachVideo, type AttachResult, type VideoStore } from "@/lib/productVideo";

export async function attachProductVideoAction(raw: unknown): Promise<AttachResult> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const store: VideoStore = {
    async ownProductLabel(userId, productId) {
      const { data } = await supabase.from("shop_products").select("id, product_label, name").eq("id", productId).eq("user_id", userId).maybeSingle();
      return data ? data.product_label || data.name || "상품" : null;
    },
    async insert(userId, v) {
      // 같은 상품·같은 영상이 이미 있으면 아무것도 바꾸지 않는다(on conflict do nothing) → 돌아온 줄이 없으면 중복
      const { data, error } = await supabase.from("shop_product_videos").upsert({
        user_id: userId, product_id: v.productId, video_id: v.videoId, title: v.title, privacy: v.privacy,
        publish_at: v.publishAt, uploaded_at: v.uploadedAt, source_item_id: v.sourceItemId,
      }, { onConflict: "user_id,product_id,video_id", ignoreDuplicates: true }).select("id");
      if (error) return error.code === "42501" ? "denied" : { error: error.message };
      return data && data.length ? "inserted" : "duplicate";
    },
  };
  try {
    return await attachVideo(store, user.id, raw);
  } catch {
    return { ok: false, duplicate: false, error: "저장 중 오류가 났습니다. 잠시 뒤 다시 보내 주세요." };
  }
}
