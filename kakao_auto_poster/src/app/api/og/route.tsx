import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 카카오톡 공유 카드(Feed 템플릿)의 content.imageUrl은 사실상 필수라, 리포트 본문에 회원이
 * 직접 이미지를 넣지 않은 경우에도 항상 보여줄 브랜드 썸네일을 동적으로 만든다(Gemini 유료
 * 생성 없이 텍스트만으로 구성 — mbti/mbti-character의 /api/og와 동일한 패턴). ?token=
 * (kakao_reports.share_token)으로 리포트 제목만 가져와 카드에 표시하고, 토큰이 없거나
 * 못 찾으면 프로그램 이름만 보여주는 기본 카드로 대체한다.
 *
 * next/og(@vercel/og)의 기본 번들 폰트 로딩은 Windows 로컬 개발 환경에서 file:// 경로 조합이
 * 깨져 "Invalid URL"로 실패하는 알려진 문제가 있다(mbti/mbti-character에서 이미 확인) — 직접
 * 내려받은 Noto Sans KR 폰트를 명시적으로 넘겨서 우회한다. Vercel 프로덕션(Linux)에서는 영향 없다.
 */
let fontDataPromise: Promise<Buffer> | null = null;
function getFontData() {
  if (!fontDataPromise) {
    fontDataPromise = readFile(path.join(process.cwd(), "assets/fonts/NotoSansKR-Bold.ttf"));
  }
  return fontDataPromise;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const fontData = await getFontData();
  const fonts = [{ name: "Noto Sans KR", data: fontData, style: "normal" as const, weight: 700 as const }];

  let title: string | null = null;
  let topicName: string | null = null;

  if (token) {
    const admin = createAdminClient();
    const { data: report } = await admin
      .from("kakao_reports")
      .select("title, topic_id")
      .eq("share_token", token)
      .maybeSingle();
    if (report) {
      title = report.title;
      const { data: topic } = await admin
        .from("kakao_topics")
        .select("topic_name")
        .eq("id", report.topic_id)
        .maybeSingle();
      topicName = topic?.topic_name ?? null;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #422006, #111827)",
          color: "white",
          fontFamily: "Noto Sans KR",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 24 }}>📨</div>
        {topicName && (
          <div style={{ fontSize: 28, opacity: 0.75, marginBottom: 16 }}>{`#${topicName}`}</div>
        )}
        <div style={{ fontSize: title ? 52 : 64, fontWeight: 900, lineHeight: 1.3 }}>
          {title ?? "카카오톡 뉴스레터 자동화"}
        </div>
        {!title && (
          <div style={{ fontSize: 28, opacity: 0.8, marginTop: 20 }}>
            관심 주제의 최신 뉴스·정보를 AI가 정리해드려요
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
