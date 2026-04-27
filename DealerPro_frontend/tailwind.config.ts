import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kia: {
          black: '#05141F',
          white: '#FFFFFF',
          red: '#BB162B',
          silver: '#C0C0C0',
          blue: '#003C71',
          accent: '#E60012',
          gray: {
            50: '#F8F9FA',
            100: '#F1F3F5',
            200: '#E9ECEF',
            300: '#DEE2E6',
            400: '#CED4DA',
            500: '#ADB5BD',
            600: '#6C757D',
            700: '#495057',
            800: '#343A40',
            900: '#212529',
          },
        },

        'kia-red': '#C8102E',
        'kia-black': '#05141F',
        'kia-dark': '#0A1929',
        'kia-darker': '#05141F',
        'kia-grey': '#1E293B',
        'kia-light-grey': '#334155',
        'kia-silver': '#94A3B8',
        'kia-white': '#F8FAFC',

        primary: '#C8102E',
        secondary: '#334155',
        dark: '#05141F',
        darker: '#000000',
        sidebar: '#0A1929',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },

      fontFamily: {
        sans: ['KiaSignature', 'Pretendard', 'Inter', 'system-ui', 'sans-serif'],
        display: ['KiaSignatureBold', 'Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      backgroundImage: {
        'kia-gradient': 'linear-gradient(135deg, #05141F 0%, #0A2440 50%, #05141F 100%)',
        'kia-card': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'red-gradient': 'linear-gradient(135deg, #BB162B 0%, #8B0E1E 100%)',

        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-kia': 'linear-gradient(135deg, #C8102E 0%, #8B0A1F 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A1929 0%, #05141F 100%)',
      },

      animation: {
        'fade-in': 'fadeIn 0.4s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      boxShadow: {
        'kia': '0 4px 24px rgba(5, 20, 31, 0.15)',
        'kia-lg': '0 8px 40px rgba(5, 20, 31, 0.25)',
        'kia-red': '0 4px 20px rgba(187, 22, 43, 0.3)',
        'dark': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 20px rgba(200, 16, 46, 0.4)',
        'glass': '0 8px 32px rgba(5, 20, 31, 0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
      },

      borderRadius: {
        'kia': '2px',
      },
    },
  },
  plugins: [],
}

export default config