import type { Database } from "@/types/database.types";

type Product = Database["public"]["Tables"]["shop_products"]["Row"];

/**
 * 템플릿의 {{변수명}}을 상품 필드로 치환한다.
 * n8n #1(이미지생성) 워크플로우의 Code|프롬프트생성 노드와 동일한 변수 매핑.
 */
export function applyProductVariables(template: string, product: Product): string {
  const features = (product.key_features ?? "").split("\n").filter(Boolean);

  const variables: Record<string, string> = {
    product_name: product.name ?? "",
    sale_price: product.sale_price != null ? `${product.sale_price.toLocaleString()}${product.currency}` : "",
    original_price: product.price != null ? `${product.price.toLocaleString()}${product.currency}` : "",
    main_color: product.main_color ?? "",
    sub_color: product.sub_color ?? "",
    background: product.background_style ?? "",
    mood: (product.mood_keywords ?? []).join(", "),
    font_style: product.font_style ?? "",
    layout_density: product.layout_density ?? "",
    category: product.category ?? "",
    key_features: product.key_features ?? "",
    specs: product.specs ?? "",
    how_to_use: product.how_to_use ?? "",
    target_customer: product.target_customer ?? "",
    feature_1: features[0]?.replace(/^\d+[.\s]*/, "") ?? "",
    feature_2: features[1]?.replace(/^\d+[.\s]*/, "") ?? "",
    feature_3: features[2]?.replace(/^\d+[.\s]*/, "") ?? "",
  };

  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
