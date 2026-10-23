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
        surface: "#120d24",
        "surface-hover": "#1c1536",
        border: "#2a1f4e",
        brand: "#a855f7",
        "brand-purple": "#c084fc",
        "brand-gold": "#f59e0b",
        "brand-cyan": "#38bdf8",
      },
    },
  },
  plugins: [],
};
export default config;
