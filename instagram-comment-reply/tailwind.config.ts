import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 2026-10-20 v1.24: INSTA 포스팅 자동화와 같은 「인스타 다크 스튜디오」 팔레트(주인님 지시 「auto-instagram-posting 대시보드 버전으로 템플릿을 맞춰」) — docs/DESIGN_HANDOFF.md
        ig: {
          bg: "#0d0f17",
          surface: "#161922",
          raised: "#1f2433",
          hover: "#2a3044",
          border: "#262c3d",
          text: "#f1f5f9",
          muted: "#94a3b8",
          primary: "#ec4899",
          "primary-hover": "#db2777",
          link: "#f9a8d4",
          success: "#34d399",
          warn: "#fbbf24",
          danger: "#fb7185",
        },
      },
    },
  },
  plugins: [],
};
export default config;
