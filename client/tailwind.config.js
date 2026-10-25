/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050507',
          secondary: '#0D0D10',
          tertiary: '#141418',
          elevated: '#1C1C22',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          default: 'rgba(255, 255, 255, 0.10)',
          highlight: 'rgba(255, 255, 255, 0.16)',
        },
        text: {
          primary: '#F4F3EF',
          secondary: '#A1A1AA',
          tertiary: '#63636B',
        },
        severity: {
          p1: '#E5C185', // Warm Champagne Gold (NO BRIGHT RED)
          p2: '#C8A97E', // Soft Bronze
          p3: '#94A3B8', // Cool Titanium Silver
          p4: '#64748B', // Muted Slate
        },
        status: {
          active: '#E5C185',
          mitigated: '#C8A97E',
          resolved: '#6EE7B7',
          closed: '#64748B',
        },
        accent: {
          primary: '#C8A97E', // Brushed Champagne Gold
          ivory: '#FAFAFA',   // Signature Alabaster Ivory
          success: '#6EE7B7', // Soft Muted Sage
          error: '#D48C96',   // Subtle Muted Rose
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.375rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
      },
      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'highlight': 'highlight 1.5s ease-out',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'highlight': {
          '0%': { backgroundColor: 'rgba(10, 132, 255, 0.15)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};
