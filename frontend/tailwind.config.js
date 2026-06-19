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
        // Paleta CENTHRIX / ISTHO
        primary: {
          DEFAULT: '#1A1A2E',
          light: '#2A2A4E',
          dark: '#0F1023',
        },
        accent: {
          DEFAULT: '#E74C3C',
          light: '#FF6B5A',
          dark: '#C0392B',
          hover: '#C0392B',
        },
        success: {
          DEFAULT: '#2ECC71',
          light: '#3DDB83',
          dark: '#27AE60',
        },
        // Mantener compatibilidad con clases orange-* existentes
        orange: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#E74C3C',
          600: '#E74C3C',
          700: '#C0392B',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        // Dark mode backgrounds + identidad visual
        centhrix: {
          bg: '#0F1023',
          card: '#1A1B3A',
          surface: '#151631',
          accent: '#E74C3C',
          'accent-hover': '#C0392B',
          hover: '#C0392B',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Calibri', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}