import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f0f6fc",
        canvas: "#0d1117",
        surface: "#161b22",
        "surface-hover": "#1f2937",
        border: "#30363d",
        accent: "#f59e0b",
        "brand-gold": "#fbbf24",
        "brand-emerald": "#10b981",
        "brand-cyan": "#38bdf8",
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        neon: "0 0 20px -5px rgba(245, 158, 11, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
