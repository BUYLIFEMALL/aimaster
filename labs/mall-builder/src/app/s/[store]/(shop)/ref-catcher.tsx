"use client";

// D33 리셀러 링크(?ref=코드)로 들어오면 30일 쿠키에 코드를 남긴다 — 그 안에 가입하면 그 리셀러와 연결(DB 트리거가 코드 확인)
import { useEffect } from "react";
import { REF_COOKIE_DAYS, codeError, normalizeCode, refCookieName } from "@/lib/reseller";

export default function RefCatcher({ slug }: { slug: string }) {
  useEffect(() => {
    const code = normalizeCode(new URLSearchParams(window.location.search).get("ref"));
    if (!code || codeError(code)) return;
    document.cookie = `${refCookieName(slug)}=${code}; max-age=${REF_COOKIE_DAYS * 86400}; path=/; samesite=lax`;
  }, [slug]);
  return null;
}
