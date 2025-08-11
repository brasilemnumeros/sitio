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

    // Load initial chart
    await this.loadInitialChart(config);

    // Setup theme observer
    this.setupThemeObserver();

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
    const defaultIndicator = config.indicators?.find(
      (ind) => ind.id === config.defaultIndicator,
    );
    const initialFile = defaultIndicator
      ? defaultIndicator.datafile
      : "/data/selic-acum-12m.json";

    await this.updateChart(initialFile);
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
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const integration = new ChartIntegration();
  await integration.initialize();
});
