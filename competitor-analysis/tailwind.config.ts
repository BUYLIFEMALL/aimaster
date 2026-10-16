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
        // 스마트 매트릭스 스타일 토큰 (값은 app/globals.css :root)
        mx: {
          bg: "var(--mx-bg)",
          surface: "var(--mx-surface)",
          raised: "var(--mx-raised)",
          border: "var(--mx-border)",
          text: "var(--mx-text)",
          muted: "var(--mx-muted)",
          primary: "var(--mx-primary)",
          accent: "var(--mx-accent)",
          success: "var(--mx-success)",
          danger: "var(--mx-danger)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
