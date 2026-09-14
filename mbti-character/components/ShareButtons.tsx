"use client";

import { useEffect, useState } from "react";

/**
 * mbti(성격코드) 프로젝트에서 실기기 테스트 3라운드 끝에 도달한 최종 형태를 그대로
 * 가져왔다 — navigator.share()와 UA 감지는 카카오톡 인앱 브라우저 환경에서 반복적으로
 * 실패했고, "항상 링크 복사" 방식만이 모든 환경에서 안정적으로 동작했다. 자세한 배경은
 * mbti/README.md 참고.
 */
export function ShareButtons({
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
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    if (window.Kakao?.isInitialized()) {
      setKakaoReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.Kakao?.isInitialized()) {
        setKakaoReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

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
      buttons: [{ title: "결과 보러가기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {kakaoReady && (
          <button
            onClick={handleKakaoShare}
            className="px-6 py-3 rounded-2xl bg-[#FEE500] text-[#191919] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            💬 카카오톡 공유
          </button>
        )}
        <button
          onClick={copyLink}
          className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-colors"
        >
          🔗 링크 복사
        </button>
      </div>
      {copied && <p className="text-xs text-neutral-400">링크가 복사되었어요!</p>}
    </div>
  );
}
