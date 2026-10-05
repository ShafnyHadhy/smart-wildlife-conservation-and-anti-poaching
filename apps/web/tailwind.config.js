/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        theme: {
          green: '#3E8E41',
          brown: '#A76D40',
          sand: '#D1B370',
          beige: '#F5F5DC',
        },
      },
    },
  },
  plugins: [],
};
