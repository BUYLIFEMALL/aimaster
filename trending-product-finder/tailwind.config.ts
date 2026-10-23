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
        // 스마트 매트릭스 스타일 토큰(롱테일과 같은 값). 투명도 표기(bg-mx-success/10)를 쓰려고 색상값을 직접 적는다.
        mx: {
          bg: "#0f1115",
          surface: "#171a21",
          raised: "#1f2430",
          border: "#2a3040",
          text: "#e6e9ef",
          muted: "#8b93a7",
          primary: "#2563eb",
          accent: "#f59e0b",
          success: "#10b981",
          danger: "#f43f5e",
          link: "#93c5fd",
        },
      },
    },
  },
  plugins: [],
};
export default config;
