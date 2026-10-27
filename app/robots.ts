import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.buylife.xyz";

  // AI 학습·수집 크롤러는 전면 차단(소스·로직·콘텐츠 무단 학습 거부, docs/SOURCE_PROTECTION_POLICY.md).
  // 네이버·구글 등 일반 검색봇은 아래 규칙으로 계속 허용(마케팅 검색 노출 유지).
  const aiCrawlers = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "anthropic-ai",
    "Google-Extended", "CCBot", "Bytespider", "Amazonbot", "Applebot-Extended",
    "PerplexityBot", "Perplexity-User", "Meta-ExternalAgent", "FacebookBot",
    "Diffbot", "Omgili", "cohere-ai", "YouBot", "ImagesiftBot", "Scrapy",
  ];

  return {
    rules: [
      ...aiCrawlers.map((userAgent) => ({ userAgent, disallow: ["/"] })),
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
