import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: 'var(--color-ink-950)',
          900: 'var(--color-ink-900)',
          800: 'var(--color-ink-800)',
          700: 'var(--color-ink-700)',
          100: 'var(--color-ink-100)',
          50: 'var(--color-ink-50)',
        },
        paper: {
          50: 'var(--color-paper-50)',
          100: 'var(--color-paper-100)',
          200: 'var(--color-paper-200)',
        },
        accent: {
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
        },
        signal: {
          400: 'var(--color-signal-400)',
          500: 'var(--color-signal-500)',
        },
        warning: {
          100: 'var(--color-warning-100)',
          500: 'var(--color-warning-500)',
          700: 'var(--color-warning-700)',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        mono: ['"Cascadia Mono"', '"Cascadia Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 45px -28px rgb(15 23 42 / 0.6)',
      },
      keyframes: {
        riseIn: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBeam: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        riseIn: 'riseIn 0.55s ease-out both',
        pulseBeam: 'pulseBeam 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
