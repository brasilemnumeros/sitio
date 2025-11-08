/**
 * Mobile Chart Handler - Handles touch events for chart zoom/pan on mobile devices
 */

class MobileChartHandler {
  constructor() {
    this.isInitialized = false;
    this.touchStartTime = 0;
    this.lastTouchDistance = 0;
    this.isZooming = false;
    this.isPanning = false;
    this.initialDistance = 0;
    this.zoomThreshold = 20; // Minimum distance change to consider it a zoom
  }

  initialize() {
    if (this.isInitialized) return;

    // Wait for chart to be available
    this.waitForChart().then(() => {
      this.setupTouchHandlers();
      this.setupChartRegister();
      this.isInitialized = true;
    });
  }

  async waitForChart() {
    return new Promise((resolve) => {
      const checkChart = () => {
        const canvas = document.getElementById('chart');
        const chart = window.chartInstance || (window.chartManager && window.chartManager.chart);
        
        if (canvas && chart) {
          resolve({ canvas, chart });
        } else {
          setTimeout(checkChart, 100);
        }
      };
      checkChart();
    });
  }

  setupChartRegister() {
    // Ensure zoom plugin is registered
    if (window.zoomPlugin && typeof Chart !== 'undefined') {
      try {
        Chart.register(window.zoomPlugin);
        console.log('Zoom plugin registered successfully');
      } catch (error) {
        console.warn('Error registering zoom plugin:', error);
      }
    }
  }

  setupTouchHandlers() {
    const canvas = document.getElementById('chart');
    if (!canvas) return;

    // Set initial touch-action for the canvas
    canvas.style.touchAction = 'pan-x pinch-zoom';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';

    // Add event listeners with proper options
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { 
      passive: false, 
      capture: true 
    });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { 
      passive: false, 
      capture: true 
    });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { 
      passive: false, 
      capture: true 
    });
    canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { 
      passive: false, 
      capture: true 
    });

    // Add gesturestart/gesturechange for iOS Safari
    canvas.addEventListener('gesturestart', this.handleGestureStart.bind(this), { 
      passive: false, 
      capture: true 
    });
    canvas.addEventListener('gesturechange', this.handleGestureChange.bind(this), { 
      passive: false, 
      capture: true 
    });
    canvas.addEventListener('gestureend', this.handleGestureEnd.bind(this), { 
      passive: false, 
      capture: true 
    });

    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    console.log('Mobile chart touch handlers initialized');
  }

  handleTouchStart(event) {
    this.touchStartTime = Date.now();
    
    if (event.touches.length === 2) {
      // Two fingers - potential pinch zoom
      this.initialDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
      this.lastTouchDistance = this.initialDistance;
      this.isZooming = true;
      this.isPanning = false;
      
      // Prevent default browser zoom behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Update touch action
      event.target.style.touchAction = 'none';
      event.target.dataset.zoomActive = 'true';
      
    } else if (event.touches.length === 1) {
      // Single finger - potential pan
      this.isPanning = true;
      this.isZooming = false;
      
      // Allow horizontal panning
      event.target.style.touchAction = 'pan-x';
    }
  }

  handleTouchMove(event) {
    if (this.isZooming && event.touches.length === 2) {
      // Handle pinch zoom
      const currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
      const distanceChange = Math.abs(currentDistance - this.initialDistance);
      
      // Only prevent default for significant zoom gestures
      if (distanceChange > this.zoomThreshold) {
        event.preventDefault();
        event.stopPropagation();
        
        // Ensure touch action is set to none during zoom
        event.target.style.touchAction = 'none';
        event.target.dataset.zoomActive = 'true';
      }
      
      this.lastTouchDistance = currentDistance;
      
    } else if (this.isPanning && event.touches.length === 1) {
      // For panning, set appropriate touch action
      event.target.style.touchAction = 'pan-x';
      event.target.dataset.panActive = 'true';
    }
  }

  handleTouchEnd(event) {
    const touchDuration = Date.now() - this.touchStartTime;
    
    // Reset states
    this.isZooming = false;
    this.isPanning = false;
    this.lastTouchDistance = 0;
    this.initialDistance = 0;
    
    // Restore default touch action
    const canvas = event.target;
    canvas.style.touchAction = 'pan-x pinch-zoom';
    canvas.dataset.zoomActive = 'false';
    canvas.dataset.panActive = 'false';
  }

  // iOS Safari gesture events
  handleGestureStart(event) {
    event.preventDefault();
    event.stopPropagation();
    this.isZooming = true;
    event.target.style.touchAction = 'none';
    event.target.dataset.zoomActive = 'true';
  }

  handleGestureChange(event) {
    if (this.isZooming) {
      event.preventDefault();
      event.stopPropagation();
      event.target.style.touchAction = 'none';
    }
  }

  handleGestureEnd(event) {
    event.preventDefault();
    event.stopPropagation();
    this.isZooming = false;
    event.target.style.touchAction = 'pan-x pinch-zoom';
    event.target.dataset.zoomActive = 'false';
  }

  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Reinitialize when chart is recreated
  reinitialize() {
    this.isInitialized = false;
    setTimeout(() => {
      this.initialize();
    }, 100);
  }
}

// Create global instance
window.mobileChartHandler = new MobileChartHandler();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mobileChartHandler.initialize();
  });
} else {
  window.mobileChartHandler.initialize();
}

// Hook into chart creation to reinitialize handler
document.addEventListener('DOMContentLoaded', () => {
  // Watch for chart updates
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        const chart = document.getElementById('chart');
        if (chart && window.mobileChartHandler) {
          window.mobileChartHandler.reinitialize();
        }
      }
    });
  });

  // Start observing the chart container
  const chartContainer = document.getElementById('chart-container');
  if (chartContainer) {
    observer.observe(chartContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
});