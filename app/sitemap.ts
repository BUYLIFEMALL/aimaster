import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.buylife.xyz";
  const now = new Date();

  // 1. 기본 정적 페이지 목록
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/programs`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/packages`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/revenue-share`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/custom`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/support/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/support/notice`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/refund`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/data-deletion`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const supabase = createServiceClient();

    // 2. 활성화된 모든 프로그램 상세 페이지 (/programs/[slug])
    const { data: programs } = await supabase
      .from("programs")
      .select("slug, updated_at")
      .eq("is_active", true);

    const programPages: MetadataRoute.Sitemap = (programs ?? []).map((p) => ({
      url: `${baseUrl}/programs/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 3. 활성화된 모든 이용 가이드 상세 페이지 (/guides/[id])
    const { data: guides } = await supabase
      .from("platform_guides")
      .select("id, updated_at")
      .eq("is_active", true);

    const guidePages: MetadataRoute.Sitemap = (guides ?? []).map((g) => ({
      url: `${baseUrl}/guides/${g.id}`,
      lastModified: g.updated_at ? new Date(g.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

    return [...staticPages, ...programPages, ...guidePages];
  } catch (err) {
    console.error("sitemap generation fallback error:", err);
    return staticPages;
  }
}
