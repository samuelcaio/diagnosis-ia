/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F9FC", // Fundo principal da tela
        surface: "#FFFFFF", // Fundo de cards/sidebar
        border: "#E9EDF2", // Bordas e divisores
        textMain: "#1A2C3E", // Texto principal
        textSec: "#5B6E8C", // Texto secundário
        textPlaceholder: "#9AAEBF", // Texto terciário (placeholders)
        
        primary: {
          DEFAULT: "#2C6E9C", // Cor de destaque principal (botões, links)
          hover: "#245E86" // Hover do botão
        },
        secondary: "#4A8BB7", // Cor de destaque secundária (ícones, badges)
        success: "#2C7A4D", // Cor de sucesso (ex: "ativo")
        warning: "#C26E38", // Cor de alerta (ex: pendência)
        danger: "#EF4444", // Alerta geral
        
        // Mapeamento cirúrgico da escala slate para retrocompatibilidade e conversão instantânea
        slate: {
          50: "#F7F9FC",
          100: "#1A2C3E",
          200: "#1A2C3E",
          300: "#5B6E8C",
          400: "#5B6E8C",
          450: "#5B6E8C",
          500: "#9AAEBF",
          550: "#9AAEBF",
          600: "#9AAEBF",
          650: "#9AAEBF",
          700: "#E9EDF2",
          750: "#E9EDF2",
          800: "#FFFFFF",
          850: "#FFFFFF",
          900: "#F7F9FC",
          950: "#F7F9FC",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
