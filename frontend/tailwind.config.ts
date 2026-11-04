import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI Variable"', '"Segoe UI"', 'Inter', 'Roboto', '"Noto Sans"', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI Variable"', '"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9eaff', 200: '#bcd9ff', 300: '#8ec0ff', 400: '#599cff',
          500: '#3478f6', 600: '#1f5fe0', 700: '#1a4cb5', 800: '#1b418f', 900: '#1c3a72', 950: '#142446',
        },
        ink: {
          50: '#f6f7f9', 100: '#eceef2', 200: '#d5d9e2', 300: '#b1b9c8', 400: '#8792a8', 500: '#68738b',
          600: '#535c72', 700: '#444b5d', 800: '#2b303c', 900: '#1a1d25', 950: '#0b0d12',
        },
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        glass: '0 1px 0 0 rgb(255 255 255 / 0.35) inset, 0 8px 32px -8px rgb(15 23 42 / 0.18), 0 2px 6px -2px rgb(15 23 42 / 0.08)',
        'glass-dark': '0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 12px 40px -12px rgb(0 0 0 / 0.6), 0 2px 8px -2px rgb(0 0 0 / 0.4)',
        lift: '0 18px 50px -20px rgb(15 23 42 / 0.35)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' }, '50%': { transform: 'translate3d(2%,-3%,0) scale(1.05)' } },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .25s ease-out both',
        'sheet-up': 'sheet-up .3s cubic-bezier(.2,.8,.2,1) both',
        shimmer: 'shimmer 1.4s infinite',
        float: 'float 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
