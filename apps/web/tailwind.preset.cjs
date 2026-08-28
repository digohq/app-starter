/**
 * Tailwind preset for @app-starter/ds tokens (CommonJS for Tailwind config require).
 * Use in your tailwind.config: presets: [require('@app-starter/ds/tailwind.preset.cjs')]
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        forest: '#111827',
        growth: '#1f2937',
        leaf: '#6b7280',
        spring: '#f3f4f6',
        soil: '#0f172a',
        stem: '#4b5563',
        mist: '#e5e7eb',
        dew: '#f9fafb',
        bloom: '#111827',
        rain: '#374151',
        autumn: '#111827',
        destructive: '#b91c1c',
        'destructive-muted': '#fef2f2',
      },
      fontFamily: {
        primary: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      boxShadow: {
        'garden-sm': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'garden-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'garden-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'grow-in': 'growIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        bloom: 'bloom 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        growIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        bloom: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
};
