import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        panel: "#12161f",
        panel2: "#171c27",
        border: "#232a38",
        accent: "#22c55e",
        accent2: "#3b82f6",
        warn: "#f59e0b",
        danger: "#ef4444",
        muted: "#8b93a7",
      },
    },
  },
  plugins: [],
};
export default config;
