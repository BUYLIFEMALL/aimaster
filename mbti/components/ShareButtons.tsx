"use client";

import { useEffect, useState } from "react";

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

  // 카카오 SDK는 <Script strategy="afterInteractive">로 비동기 로드되므로, 이 컴포넌트가
  // 먼저 마운트될 수 있다 — window.Kakao가 준비될 때까지 짧게 폴링해서 버튼을 보여준다.
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

  // 구식 execCommand 기반 복사 — 임베디드 브라우저에서도 권한 프롬프트 없이 동기적으로
  // 동작한다. 아래에서 navigator.clipboard.writeText가 멈추거나 실패할 때의 최종 폴백이다.
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
    // navigator.clipboard.writeText()가 임베디드 브라우저(카카오톡 인앱 등)에서 권한 처리
    // 단계에 멈춰 응답이 영영 안 오는 사례를 직접 확인했다(2026-09-14) — 800ms 안에 끝나지
    // 않거나 실패하면 곧바로 구식 execCommand 방식으로 넘어간다.
    let done = false;
    try {
      await Promise.race([
        navigator.clipboard.writeText(shareUrl).then(() => {
          done = true;
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {
      // navigator.clipboard 자체가 없거나 권한 거부된 경우 — 아래 레거시 폴백으로 넘어간다.
    }
    if (!done) {
      legacyCopy(shareUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    // 카카오톡/인스타그램 등 인앱 브라우저는 navigator.share가 "있다"고 보고하면서도
    // 실제로는 빈 공유 시트만 띄우는 경우가 많다(2026-09-14 실사용자가 카카오톡 인앱
    // 브라우저에서 "빈 팝업만 뜬다"고 보고해 확인함). 이 버튼은 정확히 카카오톡 안에서
    // 눌릴 일이 많아 이 문제를 그대로 노출하므로, 알려진 인앱 브라우저에서는 navigator.share
    // 자체를 시도하지 않고 클립보드 복사로 바로 넘어간다.
    const ua = navigator.userAgent;
    const isBrokenInAppBrowser = /KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(ua);

    if (navigator.share && !isBrokenInAppBrowser) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
        return;
      } catch (err) {
        // 사용자가 공유 시트를 직접 취소한 경우(AbortError)는 그대로 두고, 그 외
        // 오류(공유 시트 자체가 깨진 경우 등)는 클립보드 복사로 폴백한다.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyLink();
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
      buttons: [
        {
          title: "결과 보러가기",
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {kakaoReady && (
          <button
            type="button"
            onClick={handleKakaoShare}
            className="px-6 py-3 rounded-2xl bg-[#FEE500] text-[#191919] font-bold hover:opacity-90 transition-opacity"
          >
            💬 카카오톡 공유
          </button>
        )}
        <button
          type="button"
          onClick={handleShare}
          className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-bold hover:bg-neutral-800 transition-colors"
        >
          📤 결과 공유하기
        </button>
      </div>
      {copied && <p className="text-xs text-neutral-400">링크가 복사되었어요!</p>}
    </div>
  );
}
