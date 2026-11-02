import palette from "./src/styles/palette.cjs";
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: palette.accent,
        primary: palette.accent,
      },
    },
  },
  plugins: [({ addBase }) => addBase({ ":root": palette.variables })],
};
