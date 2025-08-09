/**
 * Theme Switcher - Gerencia alteração entre modo claro e escuro
 */

class ThemeSwitcher {
  // Constantes da classe
  static ELEMENTS = {
    TOGGLE: "theme-toggle",
    MOON_ICON: "moon-icon",
    SUN_ICON: "sun-icon",
  };

  static THEMES = {
    LIGHT: "light",
    DARK: "dark",
  };

  static CSS_CLASSES = {
    DARK: "dark",
    HIDDEN: "hidden",
  };

  constructor() {
    this.html = document.documentElement;
    this.themeToggle = null;
    this.moonIcon = null;
    this.sunIcon = null;
  }

  // Inicializa o theme switcher
  initialize() {
    this.cacheElements();
    this.setInitialTheme();
    this.attachEventListeners();
  }

  // Armazena referências dos elementos
  cacheElements() {
    this.themeToggle = document.getElementById(ThemeSwitcher.ELEMENTS.TOGGLE);
    this.moonIcon = document.getElementById(ThemeSwitcher.ELEMENTS.MOON_ICON);
    this.sunIcon = document.getElementById(ThemeSwitcher.ELEMENTS.SUN_ICON);
  }

  // Define tema inicial baseado na preferência salva
  setInitialTheme() {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    // Padrão para modo escuro se nenhuma preferência salva
    const shouldUseDarkMode = savedTheme
      ? savedTheme === ThemeSwitcher.THEMES.DARK
      : true;

    this.applyTheme(
      shouldUseDarkMode
        ? ThemeSwitcher.THEMES.DARK
        : ThemeSwitcher.THEMES.LIGHT,
    );
  }

  // Aplica o tema especificado
  applyTheme(theme) {
    const isDark = theme === ThemeSwitcher.THEMES.DARK;

    // Atualiza classe CSS
    this.html.classList.toggle(ThemeSwitcher.CSS_CLASSES.DARK, isDark);

    // Atualiza ícones
    this.updateIcons(isDark);

    // Salva preferência
    localStorage.setItem("theme", theme);
  }

  // Atualiza visibilidade dos ícones
  updateIcons(isDark) {
    if (!this.moonIcon || !this.sunIcon) return;

    this.moonIcon.classList.toggle(ThemeSwitcher.CSS_CLASSES.HIDDEN, isDark);
    this.sunIcon.classList.toggle(ThemeSwitcher.CSS_CLASSES.HIDDEN, !isDark);
  }

  // Alterna entre temas
  toggleTheme() {
    const isDark = this.html.classList.contains(ThemeSwitcher.CSS_CLASSES.DARK);
    const newTheme = isDark
      ? ThemeSwitcher.THEMES.LIGHT
      : ThemeSwitcher.THEMES.DARK;
    const previousTheme = isDark
      ? ThemeSwitcher.THEMES.DARK
      : ThemeSwitcher.THEMES.LIGHT;

    this.applyTheme(newTheme);
    this.trackThemeChange(newTheme, previousTheme);
  }

  // Envia evento para GTM
  trackThemeChange(newTheme, previousTheme) {
    if (typeof gtag !== "undefined") {
      gtag("event", "theme_changed", {
        theme_name: newTheme,
        previous_theme: previousTheme,
      });
    }
  }

  // Anexa event listeners
  attachEventListeners() {
    if (this.themeToggle) {
      this.themeToggle.addEventListener("click", () => this.toggleTheme());
    }
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  const themeSwitcher = new ThemeSwitcher();
  themeSwitcher.initialize();
});
