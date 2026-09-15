import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHtmlContent, extractFirstImageUrl } from "@/lib/reportContent";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakaoautoposter.vercel.app";
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

/**
 * 로그인한 회원이 카카오톡 "공유하기"로 원하는 채팅방에 리포트를 보내면, 그 채팅방 사람들은
 * AIMaster 회원이 아니어도 이 페이지에서 로그인 없이 바로 내용을 읽을 수 있다(2026-09-15
 * 사용자 결정). report_id 대신 추측 불가능한 share_token으로만 접근하며, admin(service role)
 * 클라이언트로 정확히 그 토큰과 일치하는 리포트 한 건만 조회한다 — RLS를 anon에 열어두는
 * 대신 이 서버 라우트 자체가 유일한 공개 진입점이라 테이블 전체 노출 위험이 없다
 * (supabase/migrations/0016_report_share_token.sql 참고).
 */
async function getSharedReport(token: string) {
  const admin = createAdminClient();
  const { data: report } = await admin
    .from("kakao_reports")
    .select("id, topic_id, title, summary, content, created_at")
    .eq("share_token", token)
    .maybeSingle();
  if (!report) return null;

  const { data: topic } = await admin
    .from("kakao_topics")
    .select("topic_name")
    .eq("id", report.topic_id)
    .maybeSingle();

  return { ...report, topicName: topic?.topic_name ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await getSharedReport(token);
  if (!report) return {};

  // 리포트 본문에 이미지가 있으면 그 이미지를, 없으면 브랜드 카드(/api/og)를 링크 미리보기에
  // 쓴다 — 카카오톡 공유 버튼(reports/[id]/page.tsx)과 동일한 우선순위.
  const ogImageUrl = extractFirstImageUrl(report.content) ?? `${SITE_URL}/api/og?token=${token}`;

  return {
    title: report.title,
    description: report.summary,
    openGraph: { title: report.title, description: report.summary, images: [ogImageUrl] },
    twitter: { card: "summary_large_image", title: report.title, description: report.summary, images: [ogImageUrl] },
  };
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await getSharedReport(token);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-sm font-bold text-neutral-900">📨 카카오톡 뉴스레터 자동화</span>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="text-xs text-neutral-400 hover:text-neutral-700"
          >
            다른 프로그램 보기 →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-6 shadow-sm">
          {report.topicName && <p className="mb-2 text-xs font-medium text-yellow-700">📌 {report.topicName}</p>}
          <p className="mb-4 text-xs text-neutral-400">{new Date(report.created_at).toLocaleString("ko-KR")}</p>
          <h1 className="mb-6 text-xl font-semibold text-neutral-900">{report.title}</h1>

          {isHtmlContent(report.content) ? (
            <div className="prose-report" dangerouslySetInnerHTML={{ __html: report.content }} />
          ) : (
            <div className="whitespace-pre-line text-sm leading-relaxed text-neutral-800">{report.content}</div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          이 콘텐츠는{" "}
          <a href={MAIN_SITE_URL} className="underline hover:text-neutral-600">
            AIMaster
          </a>
          의 &ldquo;카카오톡 뉴스레터 자동화&rdquo; 회원이 관심 주제를 등록해두면 AI가 자동으로
          만들어드리는 리포트입니다.
        </p>
      </main>
    </div>
  );
}
