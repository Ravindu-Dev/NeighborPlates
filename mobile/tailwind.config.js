/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          light: '#FF8F60',
          dark: '#E04E1A',
        },
        secondary: {
          DEFAULT: '#2D6A4F',
          light: '#52B788',
        },
        accent: '#FBBF24',
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#F8F9FA',
        },
        textPrimary: '#1A1A2E',
        textSecondary: '#6B7280',
        textMuted: '#9CA3AF',
      }
    },
  },
  plugins: [],
}
