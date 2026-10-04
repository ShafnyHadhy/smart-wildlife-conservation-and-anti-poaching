/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        safari: {
          50: '#f4f7f4',
          100: '#e5ece4',
          200: '#cedccd',
          300: '#abc2a9',
          400: '#81a37f',
          500: '#5f845d',
          600: '#4a6948',
          700: '#3c543a',
          800: '#324431',
          900: '#2b392a',
          950: '#151f15',
        },
      },
    },
  },
  plugins: [],
};
