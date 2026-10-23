"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

interface KakaoShareButtonProps {
  affiliateUrl: string;
  affiliateCode: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Kakao?: any;
  }
}

export default function KakaoShareButton({ affiliateUrl, affiliateCode }: KakaoShareButtonProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // 이미 Kakao SDK가 로드되었는지 확인
    if (window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || "fb3a33ca82c5d1eb56ec568c8b6d7fa0";
        try {
          window.Kakao.init(kakaoAppKey);
        } catch (e) {
          console.warn("Kakao SDK init error:", e);
        }
      }
      setSdkLoaded(true);
      return;
    }

    // Kakao JS SDK 동적 로드
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.integrity = "sha384-TiGlMu2bKlgbiJhxcuqbQwConstraint/P/v3Y9r/oN3/9mN3gJ8S4x/zH/h2=";
    script.crossOrigin = "anonymous";
    script.async = true;

    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || "fb3a33ca82c5d1eb56ec568c8b6d7fa0";
        try {
          window.Kakao.init(kakaoAppKey);
        } catch (e) {
          console.warn("Kakao SDK init error:", e);
        }
      }
      setSdkLoaded(true);
    };

    document.head.appendChild(script);
  }, []);

  const handleKakaoShare = () => {
    const title = "[AI Master] AI 마케팅 자동화 솔루션 추천";
    const description = `추천 코드 [${affiliateCode}]로 가입하고 AI 마케팅 자동화 프로그램을 시작해보세요!`;
    const imageUrl = "https://buylife.xyz/og-image.png";

    if (window.Kakao && window.Kakao.isInitialized() && window.Kakao.Share) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: title,
            description: description,
            imageUrl: imageUrl,
            link: {
              mobileWebUrl: affiliateUrl,
              webUrl: affiliateUrl,
            },
          },
          buttons: [
            {
              title: "추천링크로 가입하기",
              link: {
                mobileWebUrl: affiliateUrl,
                webUrl: affiliateUrl,
              },
            },
          ],
        });
        return;
      } catch (err) {
        console.warn("Kakao Share API fallback:", err);
      }
    }

    // SDK 미동작 시 Web Sharer 딥링크 Fallback
    const sharerUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(affiliateUrl)}`;
    window.open(sharerUrl, "kakao_share_popup", "width=400,height=600,scrollbars=yes");
  };

  return (
    <button
      onClick={handleKakaoShare}
      className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] active:scale-[0.99] shadow-sm"
      title="카카오톡으로 추천 링크 공유하기"
    >
      <MessageCircle size={17} className="fill-[#191919]" />
      <span>카카오톡으로 추천링크 공유하기</span>
    </button>
  );
}
