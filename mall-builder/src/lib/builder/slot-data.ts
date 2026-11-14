import { getCategoryRows, getNotices, getShowcaseProducts, getStoreRecentReviews } from "@/lib/store";
import type { Block, NoticeSettings, ReviewsSettings, ShowcaseSettings, TabsSettings, TimesaleSettings } from "@/lib/blocks";
import type { SlotData } from "@/app/s/[store]/home-slots";

// 디자인 빌더 D2-5 — 서버 데이터가 필요한 첫 화면 블록의 데이터 가져오기(손님 첫 화면과 편집기 미리보기 공용)
// 상품 가격은 보는 사람 기준(운영자가 미리보기하면 운영자 기준) — 기존 getShowcaseProducts 그대로

/** 카테고리 이름 목록(보이는 것만) — 카테고리 바로가기 블록이 있을 때 한 번만 읽는다 */
export async function visibleCategoryNames(storeId: string): Promise<{ id: string; name: string }[]> {
  return (await getCategoryRows(storeId)).filter((c) => c.is_visible).map((c) => ({ id: c.id, name: c.name }));
}

export async function loadSlotData(storeId: string, b: Block, categories?: { id: string; name: string }[]): Promise<SlotData> {
  switch (b.type) {
    case "showcase":
      return { products: await getShowcaseProducts(storeId, b.settings as ShowcaseSettings) };
    case "tabs": {
      const s = b.settings as TabsSettings;
      return { lists: await Promise.all(s.tabs.map((t) => getShowcaseProducts(storeId, { ...t, title: "", columns: s.columns, limit: s.limit }))) };
    }
    case "timesale":
      return { products: await getShowcaseProducts(storeId, { ...(b.settings as TimesaleSettings), title: "" }) };
    case "reviews": {
      const s = b.settings as ReviewsSettings;
      return { reviews: await getStoreRecentReviews(storeId, s.count, s.min_rating) };
    }
    case "category_icons":
      return { categories: categories ?? (await visibleCategoryNames(storeId)) };
    case "notice":
      return { notices: await getNotices(storeId, (b.settings as NoticeSettings).count) };
    default:
      return {};
  }
}
