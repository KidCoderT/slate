/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Mirrors theme/colors.ts + APP_AESTHETIC §2 — keep in sync.
      // Direction C ("Stone & structure"): cool blue-grey ramp, true-black anchor,
      // visible structural hairlines. Names retained from v1; values shifted.
      colors: {
        ink: "#16181D",
        "ink-muted": "#767E8A",
        "ink-subtle": "#565D67",
        canvas: "#E9EBEE",
        surface: "#FFFFFF",
        "surface-raised": "#F4F5F7",
        divider: "#D7DAE0",
        crumb: "#C2C7CF",
        "search-bg": "#E1E4E9",
        placeholder: "#A6ACB6",
        "empty-faint": "#B4BAC3",
        icon: "#8A919C",
      },
    },
  },
  plugins: [],
};
