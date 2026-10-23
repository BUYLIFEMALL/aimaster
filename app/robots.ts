import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.buylife.xyz";

  return {
    rules: [
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
