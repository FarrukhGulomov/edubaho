import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-hover': '0 8px 24px -4px rgba(2,132,199,.12), 0 2px 6px -2px rgba(0,0,0,.06)',
        'glow':    '0 0 0 4px rgba(2,132,199,.15)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #0ea5e9 100%)',
        'card-gradient': 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
      },
      animation: {
        'fade-in':    'fadeIn .25s ease',
        'slide-up':   'slideUp .3s cubic-bezier(.4,0,.2,1)',
        'slide-down': 'slideDown .25s cubic-bezier(.4,0,.2,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                     to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
