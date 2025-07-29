/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_layouts/**/*.html",
    "./_includes/**/*.html",
    "./*.html",
    "./*.md",
    "./assets/**/*.js",
  ],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {},
  },
};
