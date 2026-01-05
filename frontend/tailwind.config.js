/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bsl-1': '#10B981',
        'bsl-2': '#F59E0B',
        'bsl-3': '#F97316',
        'bsl-4': '#EF4444',
        'primary': '#3B82F6',
        'primary-dark': '#1E40AF',
      }
    },
  },
  plugins: [],
}