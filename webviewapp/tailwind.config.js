/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f8f3',
          100: '#e1efe3',
          200: '#c4dfc8',
          300: '#98c69f',
          400: '#66a570',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#0f3d21',
          950: '#072413',
        },
        gold: {
          50: '#fdfaf3',
          100: '#fbf2e2',
          200: '#f5e2c0',
          300: '#eccd94',
          400: '#dfb061',
          500: '#d97706',
          600: '#b45309',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'mobile-nav': '0 -4px 20px -2px rgba(0, 0, 0, 0.25)',
        'card-glow': '0 0 25px -5px rgba(22, 163, 74, 0.15)',
      }
    },
  },
  plugins: [],
}
