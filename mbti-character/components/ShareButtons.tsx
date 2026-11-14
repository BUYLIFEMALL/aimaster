"use client";

import { useEffect, useState } from "react";
import { KakaoScript } from "@/components/KakaoScript";

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
  // 2026-11-14: 카카오 공유는 로그인한 회원 본인 카카오 JavaScript 키로만(메인 사이트 「API 설정」에서 등록).
  // undefined = 확인 중, null = 키 없음(공유 버튼 대신 등록 안내, 링크 복사는 그대로).
  const [kakaoKey, setKakaoKey] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch("/api/kakao-js-key", { cache: "no-store" })
      // 로그인하지 않은 사람(공유 링크로 들어온 사람)에게는 등록 안내를 띄우지 않는다(undefined 유지).
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { key?: string | null } | null) => {
        if (alive && d) setKakaoKey(d.key ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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
      <KakaoScript jsKey={kakaoKey ?? null} />
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
          className="px-6 py-3 rounded-2xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 transition-colors"
        >
          🔗 링크 복사
        </button>
      </div>
      {kakaoKey === null && (
        <p className="max-w-xs text-center text-[11px] leading-relaxed opacity-70">
          💬 카카오톡 공유는 본인 카카오 앱의 JavaScript 키를 등록하면 쓸 수 있어요.{" "}
          <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer" className="underline">
            API 설정에서 등록하기
          </a>
        </p>
      )}
      {copied && <p className="text-xs text-slate-500">링크가 복사되었어요!</p>}
    </div>
  );
}
