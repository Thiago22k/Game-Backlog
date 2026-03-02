/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {

      fontFamily: {
        sans: ['Radio Canada', 'Ubuntu', 'sans-serif'], // ← Agregar aquí 1a2332 121823
      },

      colors: {
        primary: {
          'navy-light': '#1b1d26',
          navy: '#0f111a',
          'navy-dark': '#12141d',
          'navy-ultra-dark': '#08090d',
          cyan: '#4dd4ac',
          blue: '#4a7cff',
          yellow: '#ffde59',
        },
        text: {
          primary: '#ffffff',
          secondary: '#9ca3af',
        }
      },
      backgroundImage: {
        'gradient-get-started': 'linear-gradient(90deg, #0cc0df 0%, #ffde59 100%)',
      }
    },
  },
  plugins: [],
}