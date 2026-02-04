/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        stencil: ['Black Ops One', 'cursive'],
      },
      colors: {
        'bope-black': '#0a0a0a',
        'bope-gray': '#1a1a1a',
        'bope-green': '#00ff41',
        'bope-gold': '#fbbf24',
      }
    }
  },
  plugins: [],
}