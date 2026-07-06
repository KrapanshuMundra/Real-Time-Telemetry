/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#05070C',
          900: '#0B0F19',
          800: '#151C2C',
          700: '#1F293D',
          600: '#2E3C56',
          500: '#475569'
        },
        brand: {
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1'
        },
        status: {
          online: '#10B981',
          offline: '#64748B',
          maintenance: '#F59E0B',
          alert: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif']
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-glow': '0 8px 32px 0 rgba(14, 165, 233, 0.15)'
      }
    }
  },
  plugins: []
}
