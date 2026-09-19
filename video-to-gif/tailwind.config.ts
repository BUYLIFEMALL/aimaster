import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        canvas: "#f6f7fb",
        accent: "#f5b942",
      },
      boxShadow: { card: "0 18px 50px rgba(15, 23, 42, .08)" },
    },
  },
  plugins: [],
};

export default config;
