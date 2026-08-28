import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [require('./tailwind.preset.cjs')],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      /* Semantic color aliases → DS tokens (RGB for opacity modifiers) */
      colors: {
        border: 'rgb(var(--border-rgb))',
        input: 'rgb(var(--border-rgb))',
        ring: 'rgb(var(--foreground-rgb) / 0.2)',
        background: 'rgb(var(--background-rgb))',
        foreground: 'rgb(var(--foreground-rgb))',
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb))',
          foreground: 'rgb(var(--primary-foreground-rgb))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--muted-rgb))',
          foreground: 'rgb(var(--foreground-rgb))',
        },
        destructive: 'rgb(var(--destructive-rgb))',
        'destructive-foreground': '#ffffff',
        muted: {
          DEFAULT: 'rgb(var(--muted-rgb))',
          foreground: 'rgb(var(--muted-foreground-rgb))',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb))',
          foreground: 'rgb(var(--accent-foreground-rgb))',
        },
        popover: {
          DEFAULT: 'rgb(var(--background-rgb))',
          foreground: 'rgb(var(--foreground-rgb))',
        },
        card: {
          DEFAULT: 'rgb(var(--card-rgb))',
          foreground: 'rgb(var(--foreground-rgb))',
        },
        sidebar: {
          DEFAULT: 'rgb(var(--sidebar-rgb))',
          foreground: 'rgb(var(--sidebar-foreground-rgb))',
          border: 'rgb(var(--sidebar-border-rgb))',
        },
        teal: {
          DEFAULT: '#0d9488', // teal-600 — matches teal-600 already used in the codebase
          foreground: '#ffffff',
        },
      },
      /* Extra spacing not in DS preset (web app uses these) */
      spacing: {
        '3xl': '4rem',
        'compact-xs': '0.125rem',
        'compact-sm': '0.25rem',
        'compact-md': '0.5rem',
        'compact-lg': '0.75rem',
        'compact-xl': '1rem',
      },
      fontSize: {
        'compact-xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'compact-sm': ['0.75rem', { lineHeight: '1rem' }],
        'compact-base': ['0.8125rem', { lineHeight: '1.125rem' }],
        'display-sm': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'display-md': ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '3.5rem', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '4.25rem', fontWeight: '700' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        /** Modal enter/exit: opacity only (no slide or zoom) */
        'modal-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'ring-flash': {
          '0%, 100%': { boxShadow: '0 0 0 0 transparent' },
          '50%': {
            boxShadow: '0 0 0 2px rgb(var(--background-rgb)), 0 0 0 4px rgb(var(--primary-rgb))',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'gradient-shift': 'gradient-shift 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'modal-fade-in': 'modal-fade-in 0.2s ease-out',
        'modal-fade-out': 'modal-fade-out 0.2s ease-out',
        'ring-flash': 'ring-flash 1.2s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
