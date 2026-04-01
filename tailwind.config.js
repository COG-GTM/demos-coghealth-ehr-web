/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#FF385C',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        secondary: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#ebebeb',
          300: '#dddddd',
          400: '#b0b0b0',
          500: '#717171',
          600: '#484848',
          700: '#333333',
          800: '#222222',
          900: '#111111',
          950: '#050505',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'airbnb': '16px',
        'pill': '24px',
      },
    },
  },
  plugins: [],
}
