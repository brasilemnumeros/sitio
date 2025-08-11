/**
 * Multiselect Manager - Handles indicator selection functionality
 */

class MultiselectManager {
  static async initialize() {
    try {
      // Determine base URL based on environment
      const isDevelopment =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const baseUrl = isDevelopment
        ? "http://localhost:4000"
        : window.location.origin;
      const cleanBaseUrl = baseUrl.endsWith("/")
        ? baseUrl.slice(0, -1)
        : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/indicators.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      window.indicatorsData = await response.json();

      // Wait for Vue to be ready and multiselect scope to be available
      if (window.multiselectScope) {
        MultiselectManager.populateMultiselect();
      } else {
        // If Vue scope is not ready yet, wait for it
        const waitForScope = setInterval(() => {
          if (window.multiselectScope) {
            clearInterval(waitForScope);
            MultiselectManager.populateMultiselect();
          }
        }, 100);

        // Timeout after 5 seconds to avoid infinite waiting
        setTimeout(() => clearInterval(waitForScope), 5000);
      }
    } catch (error) {
      console.error("Error loading indicators for multiselect:", error);
    }
  }

  static populateMultiselect() {
    if (!window.indicatorsData?.indicators || !window.multiselectScope) {
      console.warn("Indicators data or multiselect scope not available");
      return;
    }

    const { indicators, defaultIndicator } = window.indicatorsData;
    
    // Check for URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const indicatorsParam = urlParams.get('indicators');
    
    let selectedIndicators = [];
    
    if (indicatorsParam) {
      // Load from URL
      try {
        const indicatorIds = decodeURIComponent(indicatorsParam).split(',').filter(Boolean);
        selectedIndicators = indicatorIds.map(id => {
          const indicator = indicators.find(ind => ind.id === id);
          return indicator ? indicator.name : null;
        }).filter(Boolean);
      } catch (error) {
        console.warn('Error parsing indicators from URL:', error);
      }
    }
    
    // Fallback to default if no valid indicators from URL
    if (selectedIndicators.length === 0) {
      const defaultInd = indicators.find((ind) => ind.id === defaultIndicator);
      selectedIndicators = defaultInd ? [defaultInd.name] : [];
    }

    // Update the Vue scope
    window.multiselectScope.indicators = indicators;
    window.multiselectScope.selectedIndicators = selectedIndicators;
    window.multiselectScope.indicatorMap = indicators.reduce((map, ind) => {
      map[ind.name] = ind.datafile;
      return map;
    }, {});

    console.log("Multiselect populated with indicators:", indicators.length);
    console.log("Selected from URL/default:", selectedIndicators);
  }

  static setupClickOutside() {
    document.addEventListener("click", (event) => {
      const container = document.getElementById(
        "indicator-multiselect-container",
      );
      const dropdown = document.getElementById("indicator-dropdown");

      if (!container || !dropdown) return;

      const isVisible = dropdown.offsetHeight > 0 && dropdown.offsetWidth > 0;
      const clickedOutside = !container.contains(event.target);

      if (clickedOutside && isVisible) {
        container.querySelector("button")?.click();
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  MultiselectManager.initialize();
  MultiselectManager.setupClickOutside();
});
