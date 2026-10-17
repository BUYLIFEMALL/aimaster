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
        // 스튜디오 댓글 콘솔 — 인스타 라이트 변형 (DM 대화 화면) — docs/DESIGN_HANDOFF.md
        ig: {
          bg: "#fafafa",
          surface: "#ffffff",
          raised: "#f2f2f2",
          hover: "#e9e9e9",
          border: "#dbdbdb",
          text: "#262626",
          muted: "#737373",
          primary: "#0095f6",
          "primary-hover": "#1877f2",
          link: "#00376b",
          success: "#16a34a",
          warn: "#d97706",
          danger: "#ed4956",
        },
      },
    },
  },
  plugins: [],
};
export default config;
