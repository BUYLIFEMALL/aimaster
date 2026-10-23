"use client";

import { useEffect, useState } from "react";

/**
 * mbti/mbti-character에서 실기기 검증까지 마친 컴포넌트를 그대로 가져왔다 —
 * navigator.share()/User-Agent 감지는 카카오톡 인앱 브라우저에서 반복적으로 실패했고,
 * "카카오 SDK 공유 버튼 + 항상 링크 복사 버튼(클립보드 API 800ms 타임아웃 후
 * execCommand('copy') 폴백)" 조합만 모든 환경에서 안정적으로 동작했다.
 *
 * 이 버튼은 로그인한 회원이 리포트 상세 화면(/reports/[id])에서만 누른다 — 실제로 눌러서
 * 카카오톡 친구/채팅방을 고르는 주체는 회원 본인이고, 공유되는 링크(shareUrl)는 로그인 없이도
 * 열리는 공개 페이지(/share/[token])를 가리킨다.
 */
export function KakaoShareButtons({
  shareUrl,
  shareText,
  shareDescription,
  imageUrl,
}: {
  shareUrl: string;
  shareText: string;
  shareDescription: string;
  imageUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  // 최초 렌더 시점에 이미 초기화돼 있는 경우를 지연 초기화(lazy initializer)로 확인해서,
  // 이펙트 본문에서 곧바로 setState를 호출하는 것(react-hooks/set-state-in-effect 경고 대상)을
  // 피한다 — 아직 초기화 전이라면 이펙트의 인터벌 콜백 안에서만 setState한다.
  const [kakaoReady, setKakaoReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.Kakao?.isInitialized()),
  );

  useEffect(() => {
    if (kakaoReady) return;
    const interval = setInterval(() => {
      if (window.Kakao?.isInitialized()) {
        setKakaoReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [kakaoReady]);

  function legacyCopy(text: string): boolean {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.top = "0";
      textarea.style.left = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  async function copyLink() {
    let done = false;
    try {
      await Promise.race([
        navigator.clipboard.writeText(shareUrl).then(() => {
          done = true;
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {}
    if (!done) legacyCopy(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKakaoShare() {
    if (!window.Kakao) return;
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: shareText,
        description: shareDescription,
        imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "전체 내용 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex gap-2">
        {kakaoReady && (
          <button
            type="button"
            onClick={handleKakaoShare}
            className="rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-semibold text-[#191919] transition-opacity hover:opacity-90"
          >
            💬 카카오톡 공유
          </button>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          🔗 링크 복사
        </button>
      </div>
      {copied && <p className="text-xs text-neutral-400">링크가 복사되었어요!</p>}
    </div>
  );
}
