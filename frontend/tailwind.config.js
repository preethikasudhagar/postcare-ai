/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals & Surfaces
        bg: '#EDE6FA',
        surface: '#F6F2FF',
        'surface-muted': '#EDE6FA',
        border: '#D3C8EE',
        'border-strong': '#B8A9E0',
        text: '#0F172A',
        'text-secondary': '#55607A',
        'text-muted': '#55607A',
        placeholder: '#7C7A99',
        // Table & Banded areas
        'table-header': '#DDD0F7',
        banded: '#DDD0F7',
        divider: '#D3C8EE',
        // Brand
        primary: { DEFAULT: '#5B21B6', hover: '#6D28D9', tint: '#EDE9FE' },
        secondary: { DEFAULT: '#F59E0B', hover: '#D97706', tint: '#FEF3C7' },
        // Semantic clinical colors (patient safety - keep unchanged)
        success: { DEFAULT: '#15803D', hover: '#116932', tint: '#DCFCE7' },
        warning: { DEFAULT: '#92400E', hover: '#78350F', tint: '#FEF3C7' },
        danger: { DEFAULT: '#B91C1C', hover: '#991B1B', tint: '#FEE2E2' },
        // Charts
        'chart-low': '#15803D',
        'chart-medium': '#92400E',
        'chart-high': '#B91C1C',
        'chart-blue': '#5B21B6',
        'chart-teal': '#F59E0B',
        'chart-grid': '#D3C8EE',
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
        xs: '0 1px 2px rgba(91, 33, 182, 0.05)',
        sm: '0 2px 6px rgba(91, 33, 182, 0.08)',
        md: '0 4px 14px rgba(91, 33, 182, 0.10)',
        lg: '0 12px 32px rgba(91, 33, 182, 0.14)',
        xl: '0 20px 40px rgba(91, 33, 182, 0.18)',
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
