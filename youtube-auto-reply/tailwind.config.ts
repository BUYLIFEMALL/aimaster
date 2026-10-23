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
        // 유튜브 스튜디오 댓글 콘솔 스타일 (유튜브 공식 다크 테마 값) — docs/DESIGN_HANDOFF.md
        yt: {
          bg: "#0f0f0f",
          surface: "#181818",
          raised: "#212121",
          hover: "#2a2a2a",
          border: "#303030",
          text: "#f1f1f1",
          muted: "#aaaaaa",
          red: "#ff0000",
          "red-hover": "#cc0000",
          link: "#3ea6ff",
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
