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

    // Setup reset zoom button
    this.setupResetZoomButton();

    return config;
  }

  setupMultiselect(config) {
    // Setup global function for multiselect communication
    window.updateChartsFromMultiselect = (
      selectedIndicators,
      indicatorMap,
      forceClear = false,
      yAxisConfig = null,
      valuesDisplayConfig = null,
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

      // Get current time range to preserve it
      const currentTimeRange = this.getCurrentTimeRange();
      const timeRange =
        currentTimeRange.startDate || currentTimeRange.endDate
          ? currentTimeRange
          : null;

      if (dataFiles.length === 1) {
        this.updateChartWithTimeFilter(
          dataFiles[0],
          indicatorNames[0],
          yAxisConfig,
          timeRange,
          valuesDisplayConfig,
        );
      } else {
        this.updateChartWithTimeFilter(
          dataFiles,
          indicatorNames,
          yAxisConfig,
          timeRange,
          valuesDisplayConfig,
        );
      }
    };

    // Store config globally for other functions to use
    window.indicatorsConfig = config;

    // Store integration instance globally for time filter access
    window.chartIntegration = this;
  }

  async loadInitialChart(config) {
    // Check URL parameters first
    const indicatorsFromURL = this.getIndicatorsFromURL();
    const timeRangeFromURL = this.getTimeRangeFromURL();

    if (indicatorsFromURL.length > 0) {
      // Load indicators from URL
      await this.loadIndicatorsFromNames(indicatorsFromURL, config);
    } else {
      // Load random indicator instead of default
      const availableIndicators = config.indicators || [];

      if (availableIndicators.length > 0) {
        // Choose a random indicator
        const randomIndex = Math.floor(
          Math.random() * availableIndicators.length,
        );
        const randomIndicator = availableIndicators[randomIndex];
        // Update multiselect to show selected indicator
        if (window.multiselectScope) {
          window.multiselectScope.selectedIndicators = [randomIndicator.name];

          // Set up indicator map
          if (!window.multiselectScope.indicatorMap) {
            window.multiselectScope.indicatorMap = {};
          }
          window.multiselectScope.indicatorMap[randomIndicator.name] =
            randomIndicator.datafile;
        }

        await this.updateChart(
          randomIndicator.datafile, 
          randomIndicator.name,
          window.multiselectScope?.yAxisConfig || null,
          window.multiselectScope?.valuesDisplayConfig || null
        );
      } else {
        // Fallback to hardcoded default if no indicators available
        await this.updateChart("/data/selic-acum-12m.json");
      }
    }

    // Apply time range from URL if present
    if (timeRangeFromURL.startDate && timeRangeFromURL.endDate) {
      this.waitForChartAndApplyTimeRange(
        timeRangeFromURL.startDate,
        timeRangeFromURL.endDate,
      );
    } else if (timeRangeFromURL.period) {
      this.waitForChartAndApplyPeriod(timeRangeFromURL.period);
    }
  }

  async waitForChartAndApplyTimeRange(startDate, endDate) {
    // Wait for chart to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const waitForChart = () => {
      return new Promise((resolve) => {
        const checkChart = () => {
          const chart =
            window.chartInstance ||
            (window.chartManager && window.chartManager.chart);
          if (chart && chart.options && chart.options.scales) {
            resolve(chart);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkChart, 100);
          } else {
            console.warn("Timeout waiting for chart to be ready");
            resolve(null);
          }
        };
        checkChart();
      });
    };

    const chart = await waitForChart();
    if (chart) {
      this.applyTimeRangeFromURL(startDate, endDate);
    }
  }

  async waitForChartAndApplyPeriod(period) {
    // Wait for chart to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const waitForChart = () => {
      return new Promise((resolve) => {
        const checkChart = () => {
          const chart =
            window.chartInstance ||
            (window.chartManager && window.chartManager.chart);
          if (chart && chart.options && chart.options.scales) {
            resolve(chart);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkChart, 100);
          } else {
            console.warn("Timeout waiting for chart to be ready");
            resolve(null);
          }
        };
        checkChart();
      });
    };

    const chart = await waitForChart();
    if (chart) {
      this.applyPeriodFromURL(period);
    }
  }

  applyTimeRangeFromURL(startDate, endDate) {
    // Apply time filter using the new method
    this.applyTimeFilter(startDate, endDate);

    // Update UI to reflect the applied time range
    this.updateTimePeriodUI(startDate, endDate);
  }

  applyPeriodFromURL(period) {
    console.log("Applying period from URL:", period);

    // Handle different period formats
    if (period === "FHC" && window.applyDateRange) {
      window.applyDateRange("1995-01-01", "2003-01-01");
    } else if (period === "Lula" && window.applyDateRange) {
      window.applyDateRange("2003-01-01", "2011-01-01");
    } else if (period === "Dilma" && window.applyDateRange) {
      window.applyDateRange("2011-01-01", "2016-08-31");
    } else if (period === "Temer" && window.applyDateRange) {
      window.applyDateRange("2016-08-31", "2019-01-01");
    } else if (period === "Bolsonaro" && window.applyDateRange) {
      window.applyDateRange("2019-01-01", "2023-01-01");
    } else if (period === "Lula 3" && window.applyDateRange) {
      window.applyDateRange(
        "2023-01-01",
        new Date().toISOString().split("T")[0],
      );
    } else if (period === "last5years" && window.applyRelativePeriod) {
      window.applyRelativePeriod(5);
    } else if (period === "last3years" && window.applyRelativePeriod) {
      window.applyRelativePeriod(3);
    } else if (period.includes("-") && window.applyDateRange) {
      // Custom period format like "2000-2025"
      const [startYear, endYear] = period.split("-");
      window.applyDateRange(`${startYear}-01-01`, `${endYear}-12-31`);
    } else if (period === "all" && window.resetDateFilter) {
      window.resetDateFilter();
    } else {
      console.warn("Unknown period format:", period);
    }
  }

  updateTimePeriodUI(startDate, endDate) {
    // Update custom year selectors
    const fromYear = new Date(startDate).getFullYear();
    const toYear = new Date(endDate).getFullYear();

    const fromYearSelect = document.getElementById("start-year");
    const toYearSelect = document.getElementById("end-year");

    if (fromYearSelect) fromYearSelect.value = fromYear;
    if (toYearSelect) toYearSelect.value = toYear;
  }

  async updateChart(
    dataFiles,
    indicatorNames = null,
    yAxisConfig = null,
    valuesDisplayConfig = null,
  ) {
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

          // Descobre o tipo de gráfico do(s) indicador(es)
          let chartType = "line";
          if (validData.length === 1) {
            const indicatorObj =
              this.chartManager.indicatorsConfig?.indicators?.find(
                (ind) => ind.name === finalNames[0],
              );
            chartType = indicatorObj?.chartType || "line";
            this.chartCreator.createChart(
              validData[0],
              finalNames[0],
              yAxisConfig,
              undefined,
              chartType,
              valuesDisplayConfig,
            );
          } else {
            // Se múltiplos, usa o tipo do primeiro (padrão linha)
            const indicatorObj =
              this.chartManager.indicatorsConfig?.indicators?.find(
                (ind) => ind.name === finalNames[0],
              );
            chartType = indicatorObj?.chartType || "line";
            this.chartCreator.createChart(
              validData,
              finalNames,
              yAxisConfig,
              undefined,
              chartType,
              valuesDisplayConfig,
            );
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
    window.addEventListener("popstate", (event) => {
      if (event.state && event.state.indicators) {
        try {
          const indicators =
            typeof event.state.indicators === "string"
              ? JSON.parse(event.state.indicators)
              : event.state.indicators;
          this.loadIndicatorsFromState(indicators);
        } catch (error) {
          console.warn("Error parsing indicators from state:", error);
          // Fallback to URL parameters
          const indicatorsFromURL = this.getIndicatorsFromURL();
          if (indicatorsFromURL.length > 0) {
            this.loadIndicatorsFromNames(
              indicatorsFromURL,
              window.indicatorsConfig,
            );
          }
        }
      } else {
        // Reload from URL parameters
        const indicatorsFromURL = this.getIndicatorsFromURL();
        if (indicatorsFromURL.length > 0) {
          this.loadIndicatorsFromNames(
            indicatorsFromURL,
            window.indicatorsConfig,
          );
        }
      }
    });
  }

  getIndicatorsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const indicatorsParam = urlParams.get("indicators");

    if (!indicatorsParam) return [];

    // Decode and split indicator IDs
    try {
      return decodeURIComponent(indicatorsParam).split(",").filter(Boolean);
    } catch (error) {
      console.warn("Error parsing indicators from URL:", error);
      return [];
    }
  }

  getTimeRangeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const startDate = urlParams.get("start");
    const endDate = urlParams.get("end");
    const period = urlParams.get("period");

    return { startDate, endDate, period };
  }

  updateURL(selectedIndicators, config = null) {
    if (!config) config = window.indicatorsConfig;

    const url = new URL(window.location);

    if (!selectedIndicators || selectedIndicators.length === 0) {
      // Clear indicator parameters
      url.searchParams.delete("indicators");
    } else {
      // Convert indicator names to IDs
      const indicatorIds = selectedIndicators
        .map((name) => {
          const indicator = config.indicators.find((ind) => ind.name === name);
          return indicator ? indicator.id : null;
        })
        .filter(Boolean);

      if (indicatorIds.length > 0) {
        url.searchParams.set(
          "indicators",
          encodeURIComponent(indicatorIds.join(",")),
        );
      }
    }

    // Update URL without reloading page
    window.history.replaceState(
      {
        indicators: JSON.stringify(selectedIndicators || []),
        timeRange: this.getCurrentTimeRange(),
      },
      "",
      url.toString(),
    );
  }

  updateTimeRangeURL(startDate = null, endDate = null, period = null) {
    const url = new URL(window.location);

    // Clear previous time parameters
    url.searchParams.delete("start");
    url.searchParams.delete("end");
    url.searchParams.delete("period");

    if (period) {
      url.searchParams.set("period", period);
    } else if (startDate && endDate) {
      url.searchParams.set("start", startDate);
      url.searchParams.set("end", endDate);
    }

    // Update URL without reloading page
    window.history.replaceState(
      {
        indicators: JSON.stringify(this.getCurrentIndicators() || []),
        timeRange: { startDate, endDate, period },
      },
      "",
      url.toString(),
    );
  }

  getCurrentTimeRange() {
    // First try to get from current chart
    const chart =
      window.chartInstance ||
      (window.chartManager && window.chartManager.chart);
    if (chart && chart.options.scales && chart.options.scales.x) {
      const xScale = chart.options.scales.x;
      const hasTimeFilter = xScale.min || xScale.max;

      if (hasTimeFilter) {
        return {
          startDate: xScale.min || null,
          endDate: xScale.max || null,
        };
      }
    }

    // Fallback: try to get from current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const startDate = urlParams.get("start");
    const endDate = urlParams.get("end");
    const period = urlParams.get("period");

    if (startDate && endDate) {
      return { startDate, endDate };
    }

    if (period) {
      // Check if there's an active period button
      const activeButton = document.querySelector(".period-btn.active");
      if (
        activeButton &&
        activeButton.dataset.start &&
        activeButton.dataset.end
      ) {
        return {
          startDate: activeButton.dataset.start,
          endDate: activeButton.dataset.end,
        };
      }
    }

    return { startDate: null, endDate: null };
  }

  getCurrentIndicators() {
    return window.multiselectScope?.selectedIndicators || [];
  }

  // Apply time filter by recreating chart with filtered data
  async applyTimeFilter(startDate = null, endDate = null) {
    const currentIndicators = this.getCurrentIndicators();
    const config = window.indicatorsConfig;
    if (!currentIndicators.length || !config) {
      return;
    }
    // Get current Y-axis configuration
    const yAxisConfig = window.multiselectScope?.yAxisConfig || null;
    // Preserve valuesDisplayConfig
    const valuesDisplayConfig =
      window.multiselectScope?.valuesDisplayConfig || {};
    // Store the time range for chart creation
    const timeRange = { startDate, endDate };
    // Get data files for current indicators
    const dataFiles = currentIndicators
      .map((name) => {
        const indicator = config.indicators.find((ind) => ind.name === name);
        return indicator ? indicator.datafile : null;
      })
      .filter(Boolean);
    if (dataFiles.length === 0) {
      return;
    }
    // Load and recreate chart with time filtering, always passing valuesDisplayConfig
    if (dataFiles.length === 1) {
      await this.updateChartWithTimeFilter(
        dataFiles[0],
        currentIndicators[0],
        yAxisConfig,
        timeRange,
        valuesDisplayConfig,
      );
    } else {
      await this.updateChartWithTimeFilter(
        dataFiles,
        currentIndicators,
        yAxisConfig,
        timeRange,
        valuesDisplayConfig,
      );
    }
  }

  async updateChartWithTimeFilter(
    dataFiles,
    indicatorNames = null,
    yAxisConfig = null,
    timeRange = null,
    valuesDisplayConfig = null,
  ) {
    const isMultipleFiles = Array.isArray(dataFiles);
    const filesArray = isMultipleFiles ? dataFiles : [dataFiles];
    const namesArray = isMultipleFiles ? indicatorNames : [indicatorNames];

    try {
      // Load all data files in parallel
      const jsonDataPromises = filesArray.map((file) =>
        this.chartManager.loadData(file),
      );
      const jsonDataArray = await Promise.all(jsonDataPromises);

      // Filter out null responses (failed loads)
      const validData = jsonDataArray.filter((data) => data !== null);

      if (validData.length > 0) {
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

        // Create chart with time filtering
        if (validData.length === 1) {
          this.chartCreator.createChart(
            validData[0],
            finalNames[0],
            yAxisConfig,
            timeRange,
            "line",
            valuesDisplayConfig,
          );
        } else {
          this.chartCreator.createChart(
            validData,
            finalNames,
            yAxisConfig,
            timeRange,
            "line",
            valuesDisplayConfig,
          );
        }

        // Update data source
        this.chartManager.updateDataSource(filesArray);
      }
    } catch (error) {
      console.error("Error updating chart with time filter:", error);
    }
  }

  async loadIndicatorsFromNames(indicatorNames, config) {
    if (!config || !config.indicators) return;

    // Convert indicator IDs to names and data files
    const indicators = indicatorNames
      .map((id) => {
        return config.indicators.find((ind) => ind.id === id);
      })
      .filter(Boolean);

    if (indicators.length === 0) return;

    const dataFiles = indicators.map((ind) => ind.datafile);
    const names = indicators.map((ind) => ind.name);

    // Ensure yAxisConfig is properly initialized
    let yAxisConfig = window.multiselectScope?.yAxisConfig || {};
    
    // If yAxisConfig is empty or doesn't have all current indicators, generate it using the same logic
    const hasAllIndicators = names.every(name => yAxisConfig.hasOwnProperty(name));
    if (Object.keys(yAxisConfig).length === 0 || !hasAllIndicators) {
      yAxisConfig = {};
      // Apply the same logic as decideAxisForNewIndicator for all indicators
      names.forEach((indicatorName, index) => {
        if (index === 0) {
          // First indicator always goes to left
          yAxisConfig[indicatorName] = 'left';
        } else {
          // For subsequent indicators, apply the decision logic
          const currentSelected = names.slice(0, index);
          // Check if MultiselectManager is available before using it
          if (window.MultiselectManager && window.MultiselectManager.decideAxisForNewIndicator) {
            const decidedAxis = window.MultiselectManager.decideAxisForNewIndicator(
              currentSelected, 
              indicatorName, 
              yAxisConfig
            );
            yAxisConfig[indicatorName] = decidedAxis;
          } else {
            // Fallback: simple logic for different chart types
            const indicatorsMeta = config.indicators || [];
            const newMeta = indicatorsMeta.find(i => i.name === indicatorName);
            const newType = newMeta && newMeta.chartType ? newMeta.chartType : 'line';
            
            const existingTypes = currentSelected.map(name => {
              const meta = indicatorsMeta.find(i => i.name === name);
              return meta && meta.chartType ? meta.chartType : 'line';
            });
            
            const existingRight = Object.values(yAxisConfig).includes('right');
            const isDifferentFromAll = !existingTypes.includes(newType);
            
            yAxisConfig[indicatorName] = (!existingRight && isDifferentFromAll) ? 'right' : 'left';
          }
        }
      });
      
      // Update multiselect scope with the generated config
      if (window.multiselectScope) {
        window.multiselectScope.yAxisConfig = yAxisConfig;
      }
    }

    // Update multiselect to reflect URL state
    if (window.multiselectScope) {
      window.multiselectScope.selectedIndicators = names;
    }

    // Load the charts
    if (dataFiles.length === 1) {
      await this.updateChart(
        dataFiles[0], 
        names[0],
        yAxisConfig,
        window.multiselectScope?.valuesDisplayConfig || null
      );
    } else {
      await this.updateChart(
        dataFiles, 
        names,
        yAxisConfig,
        window.multiselectScope?.valuesDisplayConfig || null
      );
    }
  }

  async loadIndicatorsFromState(indicatorIds) {
    const config = window.indicatorsConfig;
    if (!config) return;

    await this.loadIndicatorsFromNames(indicatorIds, config);
  }

  setupShareButton() {
    const shareBtn = document.getElementById("share-url-btn");
    if (!shareBtn) return;

    shareBtn.addEventListener("click", async () => {
      try {
        // Build URL with current indicators instead of just using current URL
        const shareUrl = this.buildShareUrl();

        // Try to use the modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          // Fallback for older browsers or non-HTTPS
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
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
        shareBtn.classList.add(
          "text-green-600",
          "bg-green-100",
          "border-green-300",
        );
        shareBtn.classList.remove(
          "text-gray-600",
          "bg-gray-100",
          "border-gray-300",
        );

        setTimeout(() => {
          shareBtn.innerHTML = originalText;
          shareBtn.classList.remove(
            "text-green-600",
            "bg-green-100",
            "border-green-300",
          );
          shareBtn.classList.add(
            "text-gray-600",
            "bg-gray-100",
            "border-gray-300",
          );
        }, 2000);
      } catch (error) {
        console.error("Erro ao copiar URL:", error);

        // Error feedback
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = `
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Erro
        `;
        shareBtn.classList.add("text-red-600", "bg-red-100", "border-red-300");

        setTimeout(() => {
          shareBtn.innerHTML = originalText;
          shareBtn.classList.remove(
            "text-red-600",
            "bg-red-100",
            "border-red-300",
          );
          shareBtn.classList.add(
            "text-gray-600",
            "bg-gray-100",
            "border-gray-300",
          );
        }, 2000);
      }
    });
  }

  setupResetZoomButton() {
    const resetBtn = document.getElementById("reset-zoom-btn");
    if (!resetBtn) return;

    resetBtn.addEventListener("click", () => {
      try {
        const chart =
          window.chartInstance ||
          (window.chartManager && window.chartManager.chart);
        if (chart && chart.resetZoom) {
          chart.resetZoom();

          // Visual feedback
          const originalText = resetBtn.innerHTML;
          resetBtn.innerHTML = `
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Resetado!
          `;
          resetBtn.classList.add(
            "text-green-600",
            "bg-green-100",
            "border-green-300",
          );
          resetBtn.classList.remove(
            "text-gray-600",
            "bg-gray-100",
            "border-gray-300",
          );

          setTimeout(() => {
            resetBtn.innerHTML = originalText;
            resetBtn.classList.remove(
              "text-green-600",
              "bg-green-100",
              "border-green-300",
            );
            resetBtn.classList.add(
              "text-gray-600",
              "bg-gray-100",
              "border-gray-300",
            );
          }, 1500);
        } else {
          console.warn("Chart instance not found or resetZoom not available");
        }
      } catch (error) {
        console.error("Erro ao resetar zoom:", error);

        // Error feedback
        const originalText = resetBtn.innerHTML;
        resetBtn.innerHTML = `
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Erro
        `;
        resetBtn.classList.add("text-red-600", "bg-red-100", "border-red-300");

        setTimeout(() => {
          resetBtn.innerHTML = originalText;
          resetBtn.classList.remove(
            "text-red-600",
            "bg-red-100",
            "border-red-300",
          );
          resetBtn.classList.add(
            "text-gray-600",
            "bg-gray-100",
            "border-gray-300",
          );
        }, 1500);
      }
    });
  }

  buildShareUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    // Get current selected indicators from the multiselect scope
    if (
      window.multiselectScope &&
      window.multiselectScope.selectedIndicators &&
      window.indicatorsData
    ) {
      // Convert indicator names back to IDs for the URL
      const selectedIds = window.multiselectScope.selectedIndicators
        .map((name) => {
          const indicator = window.indicatorsData.indicators.find(
            (ind) => ind.name === name,
          );
          return indicator ? indicator.id : null;
        })
        .filter(Boolean);

      if (selectedIds.length > 0) {
        urlParams.set("indicators", selectedIds.join(","));
      }
    }

    return baseUrl + (urlParams.toString() ? "?" + urlParams.toString() : "");
  }
}

// Initialize when DOM is ready and dependencies are available
document.addEventListener("DOMContentLoaded", async () => {
  // Wait for dependencies to be available
  const waitForDependencies = () => {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (
          window.chartManager &&
          window.ChartCreator &&
          typeof Chart !== "undefined"
        ) {
          resolve();
        } else {
          setTimeout(checkDependencies, 50);
        }
      };
      checkDependencies();
    });
  };

  await waitForDependencies();

  const integration = new ChartIntegration();
  await integration.initialize();
});
