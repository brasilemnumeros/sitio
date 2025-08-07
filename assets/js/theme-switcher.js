// Theme toggle functionality
document.addEventListener("DOMContentLoaded", function () {
  const themeToggle = document.getElementById("theme-toggle");
  const moonIcon = document.getElementById("moon-icon");
  const sunIcon = document.getElementById("sun-icon");
  const html = document.documentElement;

  // Check for saved theme preference or default to dark mode
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  // Default to dark mode if no preference is saved
  if (savedTheme === "light") {
    html.classList.remove("dark");
    if (moonIcon) moonIcon.classList.remove("hidden");
    if (sunIcon) sunIcon.classList.add("hidden");
  } else {
    // Default case: dark mode
    html.classList.add("dark");
    if (moonIcon) moonIcon.classList.add("hidden");
    if (sunIcon) sunIcon.classList.remove("hidden");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      if (html.classList.contains("dark")) {
        // Switch to light mode
        html.classList.remove("dark");
        localStorage.setItem("theme", "light");
        if (moonIcon) moonIcon.classList.remove("hidden");
        if (sunIcon) sunIcon.classList.add("hidden");

        // Send GTM event for theme change
        if (typeof gtag !== "undefined") {
          gtag("event", "theme_changed", {
            theme_name: "light",
            previous_theme: "dark",
          });
        }
      } else {
        // Switch to dark mode
        html.classList.add("dark");
        localStorage.setItem("theme", "dark");
        if (moonIcon) moonIcon.classList.add("hidden");
        if (sunIcon) sunIcon.classList.remove("hidden");

        // Send GTM event for theme change
        if (typeof gtag !== "undefined") {
          gtag("event", "theme_changed", {
            theme_name: "dark",
            previous_theme: "light",
          });
        }
      }
    });
  }
});
