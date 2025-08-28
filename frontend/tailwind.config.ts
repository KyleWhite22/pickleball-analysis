import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // keep existing class names like bg-mint, ring-mint, etc.
        mint: {
          DEFAULT: "#f97316", // orange-500
          light:   "#fb923c", // orange-400
          dark:    "#ea580c", // orange-600
        },
      },
    },
  },
  plugins: [],
} satisfies Config;