/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/src/**/*.{js,jsx,ts,tsx}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#F5C518',
          dark: '#d4a017',
          light: '#fde047',
          glow: 'rgba(245, 197, 24, 0.25)'
        },
        dark: {
          DEFAULT: '#0a0a0a',
          100: '#111111',
          200: '#161616',
          300: '#1a1a1a',
          400: '#222222',
          500: '#2a2a2a',
          600: '#333333',
          700: '#444444'
        },
        status: {
          ok: '#22c55e',
          update: '#f97316',
          new: '#3b82f6',
          missing: '#ef4444',
          error: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        gold: '0 0 20px rgba(245, 197, 24, 0.3), 0 0 40px rgba(245, 197, 24, 0.1)',
        'gold-sm': '0 0 10px rgba(245, 197, 24, 0.2)',
        'gold-border': 'inset 0 0 0 1px rgba(245, 197, 24, 0.4)',
        panel: '0 4px 24px rgba(0, 0, 0, 0.6)',
        'panel-hover': '0 8px 32px rgba(0, 0, 0, 0.8)'
      },
      animation: {
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite'
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5', boxShadow: '0 0 20px rgba(245, 197, 24, 0.5)' }
        },
        slideIn: {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        }
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px'
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #F5C518 0%, #d4a017 100%)',
        'dark-gradient': 'linear-gradient(135deg, #111111 0%, #0a0a0a 100%)',
        'panel-gradient': 'linear-gradient(135deg, #161616 0%, #111111 100%)'
      }
    }
  },
  plugins: []
}
