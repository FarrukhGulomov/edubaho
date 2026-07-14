import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantik ranglar — globals.css dagi CSS o'zgaruvchilardan olinadi.
        // Dark mode'da avtomatik almashadi (class strategiyasi).
        canvas:      'rgb(var(--canvas) / <alpha-value>)',
        surface:     'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        line:        'rgb(var(--line) / <alpha-value>)',
        'line-2':    'rgb(var(--line-2) / <alpha-value>)',
        ink:         'rgb(var(--ink) / <alpha-value>)',
        mute:        'rgb(var(--mute) / <alpha-value>)',
        faint:       'rgb(var(--faint) / <alpha-value>)',
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
          950: '#082f49',
        },
        // Brend aksenti — logotipdagi yashil (EDU + checkmark)
        accent: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Nozik, qatlamli soyalar — premium minimal uslub
        'card':  '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 1px -1px rgb(0 0 0 / 0.03)',
        'card-hover': '0 4px 16px -4px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'pop':   '0 8px 30px -6px rgb(0 0 0 / 0.14), 0 2px 8px -2px rgb(0 0 0 / 0.06)',
        'glow':  '0 0 0 4px rgb(2 132 199 / 0.14)',
      },
      animation: {
        'fade-in':    'fadeIn .25s ease',
        'slide-up':   'slideUp .3s cubic-bezier(.16,1,.3,1)',
        'slide-down': 'slideDown .2s cubic-bezier(.16,1,.3,1)',
        'scale-in':   'scaleIn .18s cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                     to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(.97)' },       to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}

export default config
