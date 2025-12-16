/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa"
        },
        border: "#27272a",
        primary: {
          DEFAULT: "#fafafa",
          foreground: "#0a0a0a"
        }
      }
    }
  },
  plugins: []
}
