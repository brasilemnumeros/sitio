/**
 * Main Chart Integration - Conecta multiselect com chart management
 */

class ChartIntegration {
  constructor() {
    this.chartManager = window.chartManager;
    this.chartCreator = null;
  }

  async initialize() {
    // Initialize chart manager
    const config = await this.chartManager.initialize();

    // Initialize chart creator
    this.chartCreator = new ChartCreator(this.chartManager);

    // Setup multiselect functionality
    this.setupMultiselect(config);

    // Setup URL management
    this.setupURLManagement();

    // Load initial chart (from URL or default)
    await this.loadInitialChart(config);

    // Setup theme observer
    this.setupThemeObserver();

    // Setup share button
    this.setupShareButton();

    return config;
  }

  setupMultiselect(config) {
    // Setup global function for multiselect communication
    window.updateChartsFromMultiselect = (
      selectedIndicators,
      indicatorMap,
      forceClear = false,
    ) => {
      if (selectedIndicators.length === 0 || forceClear) {
        this.chartManager.clearChart();
        this.updateURL([]);
        return;
      }

      const dataFiles = selectedIndicators
        .map((indicator) => indicatorMap[indicator])
        .filter(Boolean);
      const indicatorNames = selectedIndicators.slice();

      if (dataFiles.length === 0) {
        console.error("No valid data files found for selected indicators");
        return;
      }

      // Update URL with selected indicators
      this.updateURL(selectedIndicators, config);

      if (dataFiles.length === 1) {
        this.updateChart(dataFiles[0], indicatorNames[0]);
      } else {
        this.updateChart(dataFiles, indicatorNames);
      }
    };

    // Store config globally for other functions to use
    window.indicatorsConfig = config;
  }

  async loadInitialChart(config) {
    // Check URL parameters first
    const indicatorsFromURL = this.getIndicatorsFromURL();
    
    if (indicatorsFromURL.length > 0) {
      // Load indicators from URL
      await this.loadIndicatorsFromNames(indicatorsFromURL, config);
    } else {
      // Load default indicator
      const defaultIndicator = config.indicators?.find(
        (ind) => ind.id === config.defaultIndicator,
      );
      const initialFile = defaultIndicator
        ? defaultIndicator.datafile
        : "/data/selic-acum-12m.json";

      await this.updateChart(initialFile);
    }
  }

  async updateChart(dataFiles, indicatorNames = null) {
    const isMultipleFiles = Array.isArray(dataFiles);
    const filesArray = isMultipleFiles ? dataFiles : [dataFiles];
    const namesArray = isMultipleFiles ? indicatorNames : [indicatorNames];

    // Add visual feedback during chart update
    const canvas = document.getElementById("chart");
    if (canvas) {
      canvas.style.transition = "opacity 0.3s ease-in-out";
      canvas.style.opacity = "0.3";
    }

    try {
      // Load all data files in parallel
      const jsonDataPromises = filesArray.map((file) =>
        this.chartManager.loadData(file),
      );
      const jsonDataArray = await Promise.all(jsonDataPromises);

      // Filter out null responses (failed loads)
      const validData = jsonDataArray.filter((data) => data !== null);

      if (validData.length > 0) {
        // Small delay to let the fade-out complete
        setTimeout(() => {
          // Prepare indicator names
          const finalNames = validData.map((jsonData, index) => {
            if (namesArray && namesArray[index]) {
              return namesArray[index];
            }

            // Try to find name from config
            const dataFile = filesArray[index];
            const indicator =
              this.chartManager.indicatorsConfig?.indicators?.find(
                (ind) => ind.datafile === dataFile,
              );
            return indicator ? indicator.name : jsonData.indicatorName;
          });

          // Create chart with multiple datasets or single dataset
          if (validData.length === 1) {
            this.chartCreator.createChart(validData[0], finalNames[0]);
          } else {
            this.chartCreator.createChart(validData, finalNames);
          }

          // Update data source
          this.chartManager.updateDataSource(filesArray);

          // Restore canvas opacity
          if (canvas) {
            canvas.style.opacity = "1";
          }
        }, 150);
      } else {
        console.error("No valid data loaded");
        if (canvas) {
          canvas.style.opacity = "1";
        }
      }
    } catch (error) {
      console.error("Error updating chart:", error);
      if (canvas) {
        canvas.style.opacity = "1";
      }
    }
  }

  setupThemeObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          if (this.chartManager.chart) {
            const isDark = document.documentElement.classList.contains("dark");

            // Update title color
            this.chartManager.chart.options.plugins.title.color = isDark
              ? "#f9fafb"
              : "#1f2937";

            // Update axes colors
            this.chartManager.chart.options.scales.x.title.color = isDark
              ? "#f9fafb"
              : "#1f2937";
            this.chartManager.chart.options.scales.x.ticks.color = isDark
              ? "#d1d5db"
              : "#374151";
            this.chartManager.chart.options.scales.x.grid.color = isDark
              ? "#4b5563"
              : "#e5e7eb";

            this.chartManager.chart.options.scales.y.title.color = isDark
              ? "#f9fafb"
              : "#1f2937";
            this.chartManager.chart.options.scales.y.ticks.color = isDark
              ? "#d1d5db"
              : "#374151";
            this.chartManager.chart.options.scales.y.grid.color = isDark
              ? "#4b5563"
              : "#e5e7eb";

            // Update y1 axis colors if it exists
            if (this.chartManager.chart.options.scales.y1) {
              this.chartManager.chart.options.scales.y1.title.color = isDark
                ? "#f9fafb"
                : "#1f2937";
              this.chartManager.chart.options.scales.y1.ticks.color = isDark
                ? "#d1d5db"
                : "#374151";
            }

            // Update Dilma label color based on theme
            if (
              this.chartManager.chart.options.plugins.annotation.annotations
                .dilma_label
            ) {
              this.chartManager.chart.options.plugins.annotation.annotations.dilma_label.color =
                isDark ? "#1f2937" : "#6b7280";
            }

            // Update the chart
            this.chartManager.chart.update("none");
          }
        }
      });
    });

    // Start observing theme changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  // URL Management Methods
  setupURLManagement() {
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.indicators) {
        this.loadIndicatorsFromState(event.state.indicators);
      } else {
        // Reload from URL parameters
        const indicatorsFromURL = this.getIndicatorsFromURL();
        if (indicatorsFromURL.length > 0) {
          this.loadIndicatorsFromNames(indicatorsFromURL, window.indicatorsConfig);
        }
      }
    });
  }

  getIndicatorsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const indicatorsParam = urlParams.get('indicators');
    
    if (!indicatorsParam) return [];
    
    // Decode and split indicator IDs
    try {
      return decodeURIComponent(indicatorsParam).split(',').filter(Boolean);
    } catch (error) {
      console.warn('Error parsing indicators from URL:', error);
      return [];
    }
  }

  updateURL(selectedIndicators, config = null) {
    if (!config) config = window.indicatorsConfig;
    if (!config || !selectedIndicators || selectedIndicators.length === 0) {
      // Clear URL parameters
      const url = new URL(window.location);
      url.searchParams.delete('indicators');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    // Convert indicator names to IDs
    const indicatorIds = selectedIndicators.map(name => {
      const indicator = config.indicators.find(ind => ind.name === name);
      return indicator ? indicator.id : null;
    }).filter(Boolean);

    if (indicatorIds.length > 0) {
      const url = new URL(window.location);
      url.searchParams.set('indicators', encodeURIComponent(indicatorIds.join(',')));
      
      // Update URL without reloading page
      window.history.replaceState(
        { indicators: indicatorIds }, 
        '', 
        url.toString()
      );
    }
  }

  async loadIndicatorsFromNames(indicatorNames, config) {
    if (!config || !config.indicators) return;

    // Convert indicator IDs to names and data files
    const indicators = indicatorNames.map(id => {
      return config.indicators.find(ind => ind.id === id);
    }).filter(Boolean);

    if (indicators.length === 0) return;

    const dataFiles = indicators.map(ind => ind.datafile);
    const names = indicators.map(ind => ind.name);

    // Update multiselect to reflect URL state
    if (window.multiselectScope) {
      window.multiselectScope.selectedIndicators = names;
    }

    // Load the charts
    if (dataFiles.length === 1) {
      await this.updateChart(dataFiles[0], names[0]);
    } else {
      await this.updateChart(dataFiles, names);
    }
  }

  async loadIndicatorsFromState(indicatorIds) {
    const config = window.indicatorsConfig;
    if (!config) return;

    await this.loadIndicatorsFromNames(indicatorIds, config);
  }

  setupShareButton() {
    const shareBtn = document.getElementById('share-url-btn');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', async () => {
      try {
        const currentUrl = window.location.href;
        
        // Try to use the modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(currentUrl);
        } else {
          // Fallback for older browsers or non-HTTPS
          const textArea = document.createElement('textarea');
          textArea.value = currentUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        
        // Visual feedback
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = `
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Copiado!
        `;
        shareBtn.classList.add('text-green-600', 'bg-green-100', 'border-green-300');
        shareBtn.classList.remove('text-gray-600', 'bg-gray-100', 'border-gray-300');
        
        setTimeout(() => {
          shareBtn.innerHTML = originalText;
          shareBtn.classList.remove('text-green-600', 'bg-green-100', 'border-green-300');
          shareBtn.classList.add('text-gray-600', 'bg-gray-100', 'border-gray-300');
        }, 2000);
        
      } catch (error) {
        console.error('Erro ao copiar URL:', error);
        
        // Error feedback
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = `
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Erro
        `;
        shareBtn.classList.add('text-red-600', 'bg-red-100', 'border-red-300');
        
        setTimeout(() => {
          shareBtn.innerHTML = originalText;
          shareBtn.classList.remove('text-red-600', 'bg-red-100', 'border-red-300');
          shareBtn.classList.add('text-gray-600', 'bg-gray-100', 'border-gray-300');
        }, 2000);
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const integration = new ChartIntegration();
  await integration.initialize();
});
