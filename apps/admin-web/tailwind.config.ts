import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './modules/**/*.{ts,tsx}',
    './layouts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A7AE8',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#1A7AE8',
          600: '#1565C0',
          700: '#1054A8',
          800: '#0D3D7A',
          900: '#0A2754',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#EFF6FF',
          foreground: '#1A7AE8',
        },
        sidebar: {
          DEFAULT: '#FFFFFF',
          border: '#E2E8F0',
          foreground: '#0F172A',
          muted: '#64748B',
          accent: '#EFF6FF',
          'accent-foreground': '#1A7AE8',
          primary: '#1A7AE8',
          'primary-foreground': '#FFFFFF',
          ring: '#1A7AE8',
        },
        background: '#F8FAFC',
        foreground: '#0F172A',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A',
        },
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#1A7AE8',
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
