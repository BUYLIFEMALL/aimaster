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

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/**
 * mbti-character/mbti에서 실기기 검증까지 마친 카카오 SDK 로드 패턴을 그대로 가져왔다.
 * 앱키가 없으면(로컬 등) 아무 것도 하지 않는다.
 */
export function KakaoScript() {
  if (!KAKAO_JS_KEY) return null;

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(KAKAO_JS_KEY);
        }
      }}
    />
  );
}
