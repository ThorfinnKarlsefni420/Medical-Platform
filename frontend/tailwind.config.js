/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Teal / Sea Green — primary interactive colour
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Dark Plum / Deep Purple — sidebar
        plum: {
          700: '#6b21a8',
          800: '#4a1577',
          900: '#3b0764',
        },
        // Lime / Bright Green — accent badges & highlights
        lime: {
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
        },
        // Pale surfaces (used via CSS vars / inline)
        mint:  '#f0fdf9',   // page body bg
        cyan:  '#ecfeff',   // auth page bg
        charcoal: '#1c1c1e', // body text
      },
    },
  },
  plugins: [],
}
