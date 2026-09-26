/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Master AI Design System Semantic Tokens
        ai: {
          bg: '#050505',
          secondary: '#0A0A0A',
          surface: '#101010',
          elevated: '#151515',
          soft: '#1A1A1A',
          border: 'rgba(255, 255, 255, 0.08)',
          borderMedium: 'rgba(255, 255, 255, 0.14)',
          text: '#F5F5F5',
          textSecondary: '#A5A5A5',
          textMuted: '#707070',
          textDisabled: '#505050',
          orange: '#FF5A1F',
          orangeBright: '#FF6A2A',
          orangeSoft: '#FF8A4C',
          orangeGlow: 'rgba(255, 90, 31, 0.25)',
        },
        // Controlled Orange Accent Palette
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#FF8A4C',
          500: '#FF5A1F', // Primary Accent
          600: '#FF6A2A',
          700: '#ea580c',
          800: '#c2410c',
          900: '#9a3412',
          950: '#431407',
        },
        // Deep Near-Black Slate Palette for Cinematic Dark Mode
        slate: {
          50: '#FAFAF8',
          100: '#F4F4F0',
          200: '#E7E7E2',
          300: '#D4D4CE',
          400: '#A5A5A5',
          500: '#707070',
          600: '#505050',
          700: '#2A2A2A',
          750: '#1A1A1A',
          800: '#151515',
          850: '#101010',
          900: '#0A0A0A',
          950: '#050505',
        },
        surface: {
          DEFAULT: 'var(--color-surface, #101010)',
          muted: 'var(--color-surface-muted, #0A0A0A)',
          elevated: 'var(--color-surface-elevated, #151515)',
          dark: '#101010',
          darker: '#050505',
        },
        border: {
          subtle: 'var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
          strong: 'var(--color-border-strong, rgba(255, 255, 255, 0.14))',
          dark: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.07)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'floating': '0 20px 35px -8px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'glow-orange': '0 0 30px -5px rgba(255, 90, 31, 0.25)',
        'glow-orange-lg': '0 0 60px -10px rgba(255, 90, 31, 0.35)',
        'glow-subtle': '0 0 20px rgba(255, 255, 255, 0.03)',
      },
      borderRadius: {
        'sm': '8px',
        DEFAULT: '10px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'beam-slow': 'beamSlow 12s ease-in-out infinite',
        'glow-pulse': 'glowPulse 8s ease-in-out infinite',
        'float-gentle': 'floatGentle 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        beamSlow: {
          '0%, 100%': { opacity: '0.12', transform: 'rotate(-5deg) scale(1)' },
          '50%': { opacity: '0.28', transform: 'rotate(5deg) scale(1.08)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.06)' },
        },
        floatGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
