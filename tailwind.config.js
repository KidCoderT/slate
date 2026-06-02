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
        "ink-subtle": "#6B6B62",
        "ink-muted": "#9E9890",
        canvas: "#ECECEA",     // near-white cool-gray background (V1 mockup)
        surface: "#FFFFFF",    // card surface
        "search-bg": "#E3E3E1",
        paper: "#F9F9F7",
        "slate-100": "#F2F2F0",
        "slate-200": "#E0E0DC",
        "slate-400": "#A0A09A",
        "slate-600": "#6B6B66",
      },
    },
  },
  plugins: [],
};
