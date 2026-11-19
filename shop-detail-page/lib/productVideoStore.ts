import "server-only";
// 상품에 쇼츠(유튜브) 참조 저장 — 서버 내부 함수. MOV-20261119-01.
// **공개 서버 동작("use server")이 아니다.** 브라우저가 직접 부를 수 없고, 지금은 부르는 곳도 없다.
// 영상 정보가 들어오는 길이 정해지면, 그 길의 서버 코드가 로그인·이용 권한을 확인한 뒤 회원 세션의 DB 연결과 회원 번호를 넘겨 부른다.
// 순서와 판정은 lib/productVideo.ts attachVideo(다시 검사 → 본인 상품 확인 → 저장). 관리자 키 연결을 넘기지 말 것 —
// 회원 세션이어야 DB 권한 정책(본인 행·본인 상품)이 한 번 더 막는다.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { attachVideo, type AttachResult, type VideoStore } from "@/lib/productVideo";

export async function saveProductVideo(supabase: SupabaseClient<Database>, userId: string, raw: unknown): Promise<AttachResult> {
  const store: VideoStore = {
    async ownProductLabel(uid, productId) {
      const { data } = await supabase.from("shop_products").select("id, product_label, name").eq("id", productId).eq("user_id", uid).maybeSingle();
      return data ? data.product_label || data.name || "상품" : null;
    },
    async insert(uid, v) {
      // 같은 상품·같은 영상이 이미 있으면 아무것도 바꾸지 않는다(on conflict do nothing) → 돌아온 줄이 없으면 중복
      const { data, error } = await supabase.from("shop_product_videos").upsert({
        user_id: uid, product_id: v.productId, video_id: v.videoId, title: v.title, privacy: v.privacy,
        publish_at: v.publishAt, uploaded_at: v.uploadedAt, source_item_id: v.sourceItemId,
      }, { onConflict: "user_id,product_id,video_id", ignoreDuplicates: true }).select("id");
      if (error) return error.code === "42501" ? "denied" : { error: error.message };
      return data && data.length ? "inserted" : "duplicate";
    },
  };
  try {
    return await attachVideo(store, userId, raw);
  } catch {
    return { ok: false, duplicate: false, error: "저장 중 오류가 났습니다. 잠시 뒤 다시 보내 주세요." };
  }
}
