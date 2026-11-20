/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <--- ADD THIS LINE
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '475px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '2xs': '0 1px 1px 0 rgb(0 0 0 / 0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '0.2': '0.05rem',
        '4.5': '1.125rem',
      },
      borderWidth: {
        '3': '3px',
      },
      scale: {
        '98': '.98',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-up': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scroll-left': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fadeIn': 'fade-in 0.2s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.25s ease-out forwards',
        'scale-up': 'scale-up 0.2s ease-out forwards',
        'scaleUp': 'scale-up 0.2s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.5s ease-out forwards',
        'scroll-left': 'scroll-left 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}