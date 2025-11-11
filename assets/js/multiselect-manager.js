/**
 * Multiselect Manager - Handles indicator selection functionality
 */

class MultiselectManager {
  /**
   * Decide automatic axis assignment for a newly added indicator based on current selection.
   * Regra: se o novo indicador for de tipo diferente de TODOS os já selecionados
   * e nenhum indicador estiver usando o eixo direito ainda, atribui 'right'. Caso contrário 'left'.
   * Não força depois que há algo no eixo direito; usuário controla via modal.
   * @param {string[]} currentSelected - Lista de nomes já selecionados (antes da adição)
   * @param {string} newIndicatorName - Nome do indicador que será adicionado
   * @param {Object} yAxisConfig - Configuração atual de eixos (mutável)
   * @returns {string} 'left' ou 'right'
   */
  static decideAxisForNewIndicator(currentSelected, newIndicatorName, yAxisConfig) {
    try {
      // Se não há selecionados ou já há algo no eixo direito, vai para esquerda
      if (currentSelected.length === 0) return 'left';
      
      const indicatorsMeta = (window.chartManager && window.chartManager.indicatorsConfig && window.chartManager.indicatorsConfig.indicators)
        ? window.chartManager.indicatorsConfig.indicators
        : (window.indicatorsData && window.indicatorsData.indicators ? window.indicatorsData.indicators : []);
      
      // Verifica se já existe algum indicador no eixo direito
      const existingRight = Object.values(yAxisConfig || {}).includes('right');
      if (existingRight) return 'left';
      
      // Pega o tipo do novo indicador
      const newMeta = indicatorsMeta.find(i => i.name === newIndicatorName);
      const newType = newMeta && newMeta.chartType ? newMeta.chartType : 'line';
      
      // Pega os tipos de todos os indicadores atualmente selecionados
      const existingTypes = currentSelected.map(name => {
        const meta = indicatorsMeta.find(i => i.name === name);
        return meta && meta.chartType ? meta.chartType : 'line';
      });
      
      // Se o novo tipo é diferente de TODOS os existentes, vai para a direita
      const isDifferentFromAll = !existingTypes.includes(newType);
      if (isDifferentFromAll) {
        return 'right';
      }
      
    } catch (err) {
      console.warn('decideAxisForNewIndicator: erro ao decidir eixo', err);
    }
    return 'left';
  }
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

    const { indicators, groups, defaultIndicator } = window.indicatorsData;

    // Check for URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const indicatorsParam = urlParams.get("indicators");

    let selectedIndicators = [];

    if (indicatorsParam) {
      // Load from URL
      try {
        const indicatorIds = decodeURIComponent(indicatorsParam)
          .split(",")
          .filter(Boolean);
        selectedIndicators = indicatorIds
          .map((id) => {
            const indicator = indicators.find((ind) => ind.id === id);
            return indicator ? indicator.name : null;
          })
          .filter(Boolean);
      } catch (error) {
        console.warn("Error parsing indicators from URL:", error);
      }
    }

    // Fallback to default if no valid indicators from URL
    if (selectedIndicators.length === 0) {
      const defaultInd = indicators.find((ind) => ind.id === defaultIndicator);
      selectedIndicators = defaultInd ? [defaultInd.name] : [];
    }

    // Create grouped indicators structure
    const groupedIndicators = [];
    const processedGroups = new Set();

    indicators.forEach((indicator) => {
      if (!processedGroups.has(indicator.group)) {
        const groupIndicators = indicators.filter(
          (i) => i.group === indicator.group,
        );
        const groupInfo =
          groups && groups[indicator.group]
            ? groups[indicator.group]
            : { name: indicator.group };

        groupedIndicators.push({
          groupKey: indicator.group,
          groupName: groupInfo.name,
          groupDescription: groupInfo.description,
          indicators: groupIndicators,
        });

        processedGroups.add(indicator.group);
      }
    });

    // Initialize yAxisConfig applying diff-type auto-right rule for initial load
    const yAxisConfig = {};
    
    // Apply the same logic as decideAxisForNewIndicator for all indicators
    selectedIndicators.forEach((indicatorName, index) => {
      if (index === 0) {
        // First indicator always goes to left
        yAxisConfig[indicatorName] = 'left';
      } else {
        // For subsequent indicators, apply the decision logic
        const currentSelected = selectedIndicators.slice(0, index);
        const decidedAxis = MultiselectManager.decideAxisForNewIndicator(
          currentSelected, 
          indicatorName, 
          yAxisConfig
        );
        yAxisConfig[indicatorName] = decidedAxis;
      }
    });

    // Update the Vue scope
    window.multiselectScope.indicators = indicators;
    window.multiselectScope.groups = groups || {};
    window.multiselectScope.groupedIndicators = groupedIndicators;
    window.multiselectScope.selectedIndicators = selectedIndicators;
    window.multiselectScope.yAxisConfig = yAxisConfig;
    window.multiselectScope.indicatorMap = indicators.reduce((map, ind) => {
      map[ind.name] = ind.datafile;
      return map;
    }, {});

    // Initialize valuesDisplayConfig if not already present
    if (
      !window.multiselectScope.valuesDisplayConfig ||
      typeof window.multiselectScope.valuesDisplayConfig !== "object"
    ) {
      window.multiselectScope.valuesDisplayConfig = {};
    }

    // Trigger chart update with the configured axis assignment (if indicators are selected)
    if (selectedIndicators.length > 0 && window.updateChartsFromMultiselect) {
      // Small delay to ensure Vue scope is fully updated
      setTimeout(() => {
        window.updateChartsFromMultiselect(
          selectedIndicators,
          window.multiselectScope.indicatorMap,
          false,
          yAxisConfig,
          window.multiselectScope.valuesDisplayConfig
        );
      }, 10);
    }
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
  // Expor classe globalmente para chamadas em HTML inline
  window.MultiselectManager = MultiselectManager;
});
