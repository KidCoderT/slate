/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      // Tokens resolve to CSS variables set by the root vars() wrapper in
      // theme/ThemeProvider.tsx. Values live in theme/colors.ts (light = Direction C,
      // dark = Direction B) and switch with the active scheme. Keep names in sync with §2.
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-ink-muted) / <alpha-value>)",
        "ink-subtle": "rgb(var(--color-ink-subtle) / <alpha-value>)",
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--color-surface-raised) / <alpha-value>)",
        divider: "rgb(var(--color-divider) / <alpha-value>)",
        crumb: "rgb(var(--color-crumb) / <alpha-value>)",
        "search-bg": "rgb(var(--color-search-bg) / <alpha-value>)",
        placeholder: "rgb(var(--color-placeholder) / <alpha-value>)",
        "empty-faint": "rgb(var(--color-empty-faint) / <alpha-value>)",
        icon: "rgb(var(--color-icon) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
