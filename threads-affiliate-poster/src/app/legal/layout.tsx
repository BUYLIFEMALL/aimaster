import Link from "next/link";
import { OPERATOR } from "@/lib/deployment";

// Legal pages of a standalone copy (Meta app settings need privacy / terms / data-deletion URLs).
// In AIMaster mode each page redirects to the AIMaster site's own page.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <article className="mx-auto max-w-3xl space-y-6 rounded-lg border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-800 md:p-10 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left">
        {children}
        <footer className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
          운영자: {OPERATOR.name || "(운영자명 미설정)"} · 문의: {OPERATOR.email || "(연락처 미설정)"} ·{" "}
          <Link href="/legal/terms" className="underline">이용약관</Link> ·{" "}
          <Link href="/legal/privacy" className="underline">개인정보처리방침</Link> ·{" "}
          <Link href="/legal/data-deletion" className="underline">데이터 삭제 안내</Link>
        </footer>
      </article>
    </div>
  );
}
