import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0d14",
        panel: "#11151f",
        panel2: "#171c28",
        panel3: "#1d2330",
        border: "#262d3d",
        border2: "#323a4d",
        accent: "#22c55e",
        accent2: "#3b82f6",
        accent3: "#8b5cf6",
        teal: "#14b8a6",
        pink: "#ec4899",
        orange: "#f97316",
        gold: "#eab308",
        cyan: "#06b6d4",
        warn: "#f59e0b",
        danger: "#ef4444",
        muted: "#8b93a7",
        muted2: "#5f6678",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        glow: "0 0 20px rgba(59,130,246,0.15)",
        "glow-green": "0 0 24px rgba(34,197,94,0.18)",
      },
      backgroundImage: {
        "hero-networth": "linear-gradient(135deg, #0f2e1d 0%, #0a0d14 60%)",
        "hero-blue": "linear-gradient(135deg, #0f1e3d 0%, #0a0d14 60%)",
        "hero-purple": "linear-gradient(135deg, #1a1340 0%, #0a0d14 60%)",
        "hero-rose": "linear-gradient(135deg, #2d0f1d 0%, #0a0d14 60%)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        fadein: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        fadein: "fadein 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
