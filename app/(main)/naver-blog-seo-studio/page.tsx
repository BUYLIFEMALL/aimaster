import { redirect } from "next/navigation";

/**
 * The SEO Studio runs as its own Vercel project. Keep the AIMaster catalog
 * link working by forwarding the legacy same-domain path to that deployment.
 */
export default function NaverBlogSeoStudioRedirect() {
  redirect("https://naver-blog-seo-studio.buylife.xyz"); // 2026-10-16 새 주소(옛 vercel.app 삭제 대비)
}
