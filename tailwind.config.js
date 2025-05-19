/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html", // For Vite (if your main HTML is in the root)
    "./public/index.html", // For Create React App (if main HTML is in public)
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      fontFamily: { 
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}