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
        suno: {
          dark: "#09090b",
          card: "#14141b",
          border: "#272732",
          orange: "#f97316",
          orangeHover: "#ea580c",
          neon: "#fb923c",
          muted: "#71717a",
          subtext: "#a1a1aa",
        },
      },
    },
  },
  plugins: [],
};
export default config;
