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
  const [currentShareUrl, setCurrentShareUrl] = useState(shareUrl);

  useEffect(() => {
    if (typeof window !== "undefined" && shareUrl) {
      try {
        const urlObj = new URL(shareUrl, window.location.origin);
        if (urlObj.origin !== window.location.origin) {
          const updated = `${window.location.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
          setCurrentShareUrl(updated);
        } else {
          setCurrentShareUrl(shareUrl);
        }
      } catch {
        setCurrentShareUrl(shareUrl);
      }
    }
  }, [shareUrl]);

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
        navigator.clipboard.writeText(currentShareUrl).then(() => {
          done = true;
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {}
    if (!done) legacyCopy(currentShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKakaoShare() {
    if (!window.Kakao) return;
    // shareUrl(→ currentShareUrl)을 그대로 쓴다 — window.location.href를 쓰지 않는다.
    // 예전엔 window.location.href를 썼는데, 그 값은 /draw에서 처음 넘어온 cards=...
    // 쿼리스트링 그대로라(카드 이미지/AI 해석을 생성해도 브라우저 주소창은 안 바뀜) 공유
    // 링크를 열어도 완성된 결과가 아니라 빈 카드부터 다시 시작해야 했다. 지금은
    // ResultInteractive가 리딩이 tarot_readings에 저장되는 즉시 shareUrl을 그 저장된
    // 리딩 id 하나만 담은 짧은 링크(/result?rid=...)로 갱신해주므로, 이 값을 그대로 쓰면
    // 받는 사람이 완성된 이미지·해석을 바로 보게 된다.
    //
    // 과거에 여기서 encodeURI(decodeURI(targetUrl))로 한 번 더 "정규화"를 시도한 적도
    // 있었는데(fe66123), decodeURI는 예약 문자(:, , 등)의 %XX는 그대로 남겨두고 나머지만
    // 디코딩하기 때문에 cards 파라미터의 구분자를 이중 인코딩해버리는 별개의 버그가 있었다
    // (2026-09-19 발견, 제거함) — 다시 추가하지 말 것.
    const targetUrl = currentShareUrl;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: shareText,
        description: shareDescription,
        imageUrl,
        link: { mobileWebUrl: targetUrl, webUrl: targetUrl },
      },
      buttons: [{ title: "결과 보러가기", link: { mobileWebUrl: targetUrl, webUrl: targetUrl } }],
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
