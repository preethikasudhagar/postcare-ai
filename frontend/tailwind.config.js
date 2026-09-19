/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals
        bg: '#F7F9FC',
        surface: '#FFFFFF',
        'surface-muted': '#F1F5F9',
        border: '#E2E8F0',
        'border-strong': '#CBD5E1',
        text: '#0F1B2D',
        'text-secondary': '#475569',
        'text-muted': '#64748B',
        // Brand
        primary: { DEFAULT: '#1D5FD1', hover: '#174EAE', tint: '#EAF1FD' },
        secondary: { DEFAULT: '#0E8F9C', hover: '#0B7681', tint: '#E3F5F6' },
        success: { DEFAULT: '#15803D', hover: '#116932', tint: '#E7F6EC' },
        warning: { DEFAULT: '#B45309', hover: '#92400E', tint: '#FEF3C7' },
        danger: { DEFAULT: '#C62828', hover: '#A82020', tint: '#FDECEC' },
        // Charts
        'chart-low': '#22A05A',
        'chart-medium': '#F2A311',
        'chart-high': '#DC3B3B',
        'chart-blue': '#2F6FE0',
        'chart-teal': '#18A7B5',
        'chart-grid': '#E8EDF4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '16px'],
        sm: ['14px', '22px'],
        base: ['14px', '22px'],
        md: ['15px', '22px'],
        lg: ['18px', '28px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['28px', '36px'],
        '4xl': ['30px', '36px'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15,27,45,0.04)',
        sm: '0 2px 6px rgba(15,27,45,0.06)',
        lg: '0 12px 32px rgba(15,27,45,0.12)',
      },
      spacing: {
        sidebar: '248px',
        'sidebar-collapsed': '72px',
        topbar: '64px',
      },
      maxWidth: {
        content: '1440px',
        form: '720px',
        document: '820px',
        login: '420px',
      },
    },
  },
  plugins: [],
}
