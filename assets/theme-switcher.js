// --- Theme Switcher Logic ---
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateChartTheme();
  }

  document.addEventListener("DOMContentLoaded", function() {
    createChart(); // Cria o gráfico primeiro

    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    applyTheme(savedTheme); // Aplica o tema salvo (ou o padrão)

    themeToggle.addEventListener('click', () => {
      let newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  });