import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.buylife.xyz";

  // 검색엔진 노출·구글 애드센스·사용자 접속·AI 검색 인용은 모두 허용한다(마케팅·광고 수익 우선).
  // 오직 "AI 학습(모델 훈련)용 수집" 크롤러만 차단해 소스·콘텐츠 무단 학습·퍼가기를 막는다
  // (docs/SOURCE_PROTECTION_POLICY.md). 검색/인용 봇(OAI-SearchBot·PerplexityBot 등)은 차단하지 않는다.
  const aiTrainingCrawlers = [
    "GPTBot", "ClaudeBot", "Claude-Web", "anthropic-ai",
    "Google-Extended", "CCBot", "Bytespider", "Amazonbot", "Applebot-Extended",
    "Meta-ExternalAgent", "Diffbot", "Omgili", "cohere-ai", "ImagesiftBot", "Scrapy",
  ];
  const publicPaths = ["/", "/programs", "/programs/*", "/guides", "/guides/*", "/packages", "/revenue-share", "/custom", "/support", "/support/*", "/terms", "/privacy", "/refund", "/data-deletion"];
  const adminPaths = ["/admin", "/admin/*", "/api", "/api/*"];

  return {
    rules: [
      ...aiTrainingCrawlers.map((userAgent) => ({ userAgent, disallow: ["/"] })),
      // 구글 애드센스 심사·광고 봇 명시 허용(광고 수익).
      { userAgent: "AdsBot-Google", allow: publicPaths, disallow: adminPaths },
      { userAgent: "AdsBot-Google-Mobile", allow: publicPaths, disallow: adminPaths },
      {
        userAgent: "*",
        allow: ["/", "/programs", "/programs/*", "/guides", "/guides/*", "/packages", "/revenue-share", "/custom", "/support", "/support/*", "/terms", "/privacy", "/refund", "/data-deletion"],
        disallow: ["/admin", "/admin/*", "/api", "/api/*", "/login", "/signup", "/dashboard", "/dashboard/*"],
      },
      {
        userAgent: "Mediapartners-Google",
        allow: ["/", "/programs", "/programs/*", "/guides", "/guides/*", "/packages", "/revenue-share", "/custom", "/support", "/support/*", "/terms", "/privacy", "/refund"],
        disallow: ["/admin", "/admin/*", "/api", "/api/*"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/programs", "/programs/*", "/guides", "/guides/*", "/packages", "/revenue-share", "/custom", "/support", "/support/*", "/terms", "/privacy", "/refund", "/data-deletion"],
        disallow: ["/admin", "/admin/*", "/api", "/api/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
