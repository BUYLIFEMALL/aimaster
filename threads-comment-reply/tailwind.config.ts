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
        // 스튜디오 댓글 콘솔 — 쓰레드 모노 변형 (Threads 다크 흑백) — docs/DESIGN_HANDOFF.md
        th: {
          bg: "#101010",
          surface: "#181818",
          raised: "#262626",
          hover: "#2f2f2f",
          border: "#333333",
          text: "#f3f5f7",
          muted: "#999999",
          primary: "#f3f5f7",
          link: "#0095f6",
          success: "#2ba640",
          warn: "#f9ab00",
          danger: "#ff4e45",
        },
      },
    },
  },
  plugins: [],
};
export default config;
