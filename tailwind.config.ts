import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // app/(main)/blog/* 라우트가 blog/app/**의 컴포넌트를 직접 import해서
    // 렌더링하므로, 그 안에서 쓰는 Tailwind 클래스도 루트 빌드가 스캔해야 함.
    "./blog/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./blog/utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#d4af37",
          light: "#f5c842",
          dark: "#b8960c",
        },
        dark: {
          DEFAULT: "#0a0a0f",
          50: "#12121a",
          100: "#1a1a26",
          200: "#222232",
        },
        // 컴포넌트 여러 곳(Header/Footer/Sidebar 드롭다운·모바일 메뉴 등)이 이미
        // bg-surface/*를 쓰고 있었는데 이 토큰 자체가 theme에 등록돼 있지 않아서
        // 그 클래스들이 전부 배경 없이(투명하게) 렌더링되고 있었다 — 헤더가 스크롤 전
        // 상태(bg-transparent)일 때 그 위에 뜨는 프로필/모바일 메뉴 팝업이 배경 없이
        // 텍스트만 떠 있어 안 보인다는 신고로 발견(2026-09-08). dark.50과 동일한
        // 톤으로 등록해서 기존에 의도했던 "카드보다 한 단계 밝은 짙은 배경"을 실제로
        // 채워지게 한다.
        surface: {
          DEFAULT: "#12121a",
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #d4af37, #f5c842)",
        "dark-gradient": "linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)",
        "hero-gradient": "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%), linear-gradient(180deg, #0a0a0f 0%, #0d0d18 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,175,55,0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(212,175,55,0.3)" },
        },
      },
      boxShadow: {
        gold: "0 0 20px rgba(212,175,55,0.3)",
        "gold-lg": "0 0 40px rgba(212,175,55,0.4)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
