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
          500: '#34783B', // Vert Calligraphie El-Mokhtar
          600: '#28622E',
          700: '#224E27',
          800: '#1E3F22',
          900: '#19341D',
          950: '#0B1C0E',
        },
        gold: {
          50: '#fdfaf3',
          100: '#fbf2e2',
          200: '#f5e2c0',
          300: '#eccd94',
          400: '#dfb061',
          500: '#D89F35', // Or Calligraphie El-Mokhtar
          600: '#be8127',
          700: '#986022',
          800: '#7d4e22',
          900: '#674020',
          950: '#3b210e',
        },
        obsidian: {
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
          950: '#040905',
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Plus Jakarta Sans', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'Plus Jakarta Sans', 'Tajawal', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'scroll-down': 'scrollDown 35s linear infinite',
        'scroll-up': 'scrollUp 35s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' },
        },
        scrollDown: {
          '0%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0%)' },
        },
        scrollUp: {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(-50%)' },
        },
      }
    },
  },
  plugins: [],
}
