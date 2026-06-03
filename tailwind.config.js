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
      colors: {
        ink: "#1A1A1A",
        "ink-muted": "#9E9890",
        "ink-subtle": "#6B6B6B",
        canvas: "#F0F1F4",
        surface: "#FFFFFF",
        "surface-raised": "#FAFAF8",
        divider: "#E8E8E6",
        crumb: "#D4D4D2",
        "search-bg": "#E6E7EA",
        placeholder: "#B4B6BB",
        "empty-faint": "#C8C8C6",
        icon: "#ADADAB",
      },
    },
  },
  plugins: [],
};
