"use client";

import Script from "next/script";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (settings: {
          objectType: "feed";
          content: {
            title: string;
            description: string;
            imageUrl: string;
            link: { mobileWebUrl: string; webUrl: string };
          };
          buttons?: {
            title: string;
            link: { mobileWebUrl: string; webUrl: string };
          }[];
        }) => void;
      };
    };
  }
}

/**
 * 2026-11-14: 운영자 앱 키(NEXT_PUBLIC_KAKAO_JS_KEY) 대신 **회원 본인 카카오 앱의 JavaScript 키**로만 연다
 * (최상위 규칙 「본인 계정·본인 키」, 기준 kakao_auto_poster/src/components/KakaoScript.tsx). 키가 없으면 아무 것도 하지 않는다.
 */
export function KakaoScript({ jsKey }: { jsKey: string | null }) {
  if (!jsKey) return null;

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(jsKey);
        }
      }}
    />
  );
}
