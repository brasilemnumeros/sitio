/**
 * Mobile Landscape Navigation Handler
 * Esconde a barra de navegação em modo landscape no mobile para maximizar espaço do gráfico
 */

class MobileLandscapeNav {
  constructor() {
    this.nav = document.querySelector('nav');
    this.main = document.querySelector('main');
    this.isLandscape = false;
    this.isMobile = false;
    this.navHeight = 0;
    
    this.init();
  }

  init() {
    if (!this.nav || !this.main) return;
    
    // Armazena altura da navegação
    this.navHeight = this.nav.offsetHeight;
    
    // Verifica orientação inicial
    this.checkOrientation();
    
    // Escuta mudanças de orientação
    window.addEventListener('orientationchange', () => {
      // Pequeno delay para aguardar mudança de orientação completar
      setTimeout(() => {
        this.checkOrientation();
      }, 100);
    });
    
    // Escuta mudanças de tamanho da tela (fallback)
    window.addEventListener('resize', () => {
      this.checkOrientation();
    });
  }

  checkOrientation() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Considera mobile se largura for menor que 768px em qualquer orientação
    this.isMobile = Math.min(width, height) < 768;
    
    // Considera landscape se largura for maior que altura
    this.isLandscape = width > height;
    
    this.updateNavVisibility();
  }

  updateNavVisibility() {
    if (!this.nav || !this.main) return;
    
    // Só aplica em mobile landscape
    const shouldHideNav = this.isMobile && this.isLandscape;
    
    if (shouldHideNav) {
      this.hideNav();
    } else {
      this.showNav();
    }
  }

  hideNav() {
    // Adiciona classe para esconder navegação
    this.nav.classList.add('mobile-landscape-hidden');
    
    // Remove padding-top do main para o gráfico ocupar toda a tela
    this.main.classList.add('mobile-landscape-fullscreen');
    
    // Adiciona indicador visual para mostrar navegação
    this.showNavToggle();
  }

  showNav() {
    // Remove classe de esconder navegação
    this.nav.classList.remove('mobile-landscape-hidden');
    
    // Restaura padding-top do main
    this.main.classList.remove('mobile-landscape-fullscreen');
    
    // Remove indicador visual
    this.hideNavToggle();
  }

  showNavToggle() {
    // Verifica se já existe o toggle
    let toggle = document.getElementById('nav-toggle');
    
    if (!toggle) {
      // Cria botão para mostrar navegação
      toggle = document.createElement('button');
      toggle.id = 'nav-toggle';
      toggle.className = 'nav-toggle-btn';
      toggle.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      `;
      toggle.setAttribute('aria-label', 'Mostrar navegação');
      
      // Adiciona evento de clique
      toggle.addEventListener('click', () => {
        this.toggleNavTemporarily();
      });
      
      document.body.appendChild(toggle);
    }
    
    // Mostra o toggle
    toggle.style.display = 'flex';
  }

  hideNavToggle() {
    const toggle = document.getElementById('nav-toggle');
    if (toggle) {
      toggle.style.display = 'none';
    }
  }

  toggleNavTemporarily() {
    if (!this.nav) return;
    
    // Mostra a navegação temporariamente
    this.nav.classList.remove('mobile-landscape-hidden');
    this.main.classList.remove('mobile-landscape-fullscreen');
    
    // Esconde depois de 3 segundos ou quando clicar fora
    const hideTimer = setTimeout(() => {
      this.hideNav();
    }, 3000);
    
    // Esconde ao clicar em qualquer lugar
    const hideOnClick = (event) => {
      // Não esconde se clicar na própria navegação ou no botão toggle
      if (this.nav.contains(event.target) || event.target.closest('#nav-toggle')) return;
      
      clearTimeout(hideTimer);
      document.removeEventListener('click', hideOnClick);
      this.hideNav();
    };
    
    // Aguarda um frame para evitar que o clique do toggle ative o hideOnClick
    setTimeout(() => {
      document.addEventListener('click', hideOnClick);
    }, 100);
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Só ativa na página inicial (com gráficos)
  if (document.querySelector('#chart')) {
    new MobileLandscapeNav();
  }
});