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
        // 70. 퀀트 이커머스 인텔리전스 레이더 덱 스타일 (Quant Radar Intelligence)
        mx: {
          bg: "#070B14",
          surface: "#0F172A",
          raised: "#141E33",
          border: "#1E293B",
          borderBright: "#334155",
          text: "#F8FAFC",
          muted: "#94A3B8",
          primary: "#06B6D4",
          primaryStrong: "#0891B2",
          accent: "#10B981",
          gold: "#F59E0B",
          danger: "#EF4444",
          link: "#22D3EE",
        },
      },
    },
  },
  plugins: [],
};
export default config;
