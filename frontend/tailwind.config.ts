import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: "#8ef17d",
        skyish: "#7db2ff",
        ink: {
          900: "#0b0b0e",
          800: "#0f131d",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;