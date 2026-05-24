/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050816",
        panel: "#0b1020",
        cyanline: "#28d7ff",
        violetline: "#8b5cf6",
      },
      boxShadow: {
        glow: "0 0 28px rgba(40, 215, 255, 0.18)",
        violet: "0 0 28px rgba(139, 92, 246, 0.18)",
      },
    },
  },
  plugins: [],
};
