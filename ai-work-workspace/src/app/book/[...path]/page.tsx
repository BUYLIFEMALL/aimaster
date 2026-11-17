// PLAN-20261117-01 E2 7-2 예약 링크(WS-20261117-21 2B): /book/<비밀 주소> — 로그인 없이 손님이 회원의 빈 시간을 골라 예약.
// 판정은 모두 서버(src/server/booking.ts bookingSlots). 기능이 꺼져 있거나(기본) 조건이 안 맞으면 404 — 꺼져 있으면 예약 표·구글 호출 0.
// 손님 진행 상황 포털(src/app/portal)과 같은 설정: 검색엔진 비노출(noindex·nocache), 주소가 다른 사이트로 새지 않게 referrer 없음, 캐시 없음.
// 주의: 주소 경로에 토큰이 들어가므로 플랫폼(호스팅) 접속 기록까지 원문이 남지 않는다고 보장하지 않는다 —
// 앱이 직접 남기는 기록·오류·분석에는 토큰과 손님 입력을 넣지 않고, Referer를 막고, 제출 API는 토큰을 JSON 본문으로만 받는다(쿼리 0).
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { bookingSlots } from "@/server/booking";
import { BookingForm } from "./BookingForm";

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "예약하기",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function BookPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  // QA026(2026-11-17): Next가 이미 풀어 준(decoded) 경로 값을 그대로 쓴다 — 다시 풀면 `%`·잘못된 퍼센트에서 예외(URIError)가 나 404 대신 오류가 됨.
  // 발급 형식(randomBytes(32) base64url = 43자 A-Z a-z 0-9 _ -) 하나만 받고, 그 밖(빈·여러 칸·길이·문자)은 판정 함수를 부르지 않고 404.
  const token = Array.isArray(path) && path.length === 1 && typeof path[0] === "string" && TOKEN_SHAPE.test(path[0]) ? path[0] : "";
  if (!token) notFound();
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const view = await bookingSlots(token, ip);
  if (!view) notFound();
  return (
    <main style={{ minHeight: "100vh", background: "#f7f7f5", padding: "48px 16px", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#37352f" }}>
      <BookingForm token={token} view={view} />
    </main>
  );
}
