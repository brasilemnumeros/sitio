/**
 * Chart Creator - Responsável pela criação e configuração de gráficos
 */

// Registra os plugins globalmente
Chart.register(ChartDataLabels);

// Simple zoom plugin registration
setTimeout(() => {
  // Register zoom plugin if available from CDN
  if (window.zoomPlugin) {
    Chart.register(window.zoomPlugin);
    console.log("Zoom plugin registered from window.zoomPlugin");
  } else if (typeof Chart !== "undefined" && Chart.Zoom) {
    Chart.register(Chart.Zoom);
    console.log("Zoom plugin registered from Chart.Zoom");
  } else {
    console.warn(
      "Zoom plugin not found - make sure chartjs-plugin-zoom is loaded",
    );
  }
}, 100);

class ChartCreator {
  // Método para configurações responsivas de barras
  static getResponsiveBarConfig() {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024;

    if (isMobile) {
      return {
        barThickness: 12, // Barras mais finas no mobile
        categoryPercentage: 0.6,
        barPercentage: 0.7,
      };
    } else if (isTablet) {
      return {
        barThickness: 20,
        categoryPercentage: 0.7,
        barPercentage: 0.8,
      };
    } else {
      return {
        barThickness: 30,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      };
    }
  }

  // Configurações do gráfico
  static CHART_CONFIG = {
    TIME_RANGE: {
      MIN: "1995-01-01",
      MAX: "2025-12-31",
    },
    DISPLAY_FORMAT: {
      YEAR: "yyyy",
    },
    PADDING: {
      TOP: 20,
      BOTTOM: 20,
      LEFT: 10,
      RIGHT: 40,
    },
    ANIMATION: {
      HOVER_RADIUS: 8,
      POINT_RADIUS: 0,
      POINT_HOVER_RADIUS: 6,
      BORDER_WIDTH: 3,
      POINT_BORDER_WIDTH: 2,
    },
  };

  // Paleta de cores para múltiplos indicadores
  static COLOR_PALETTE = [
    "rgba(59, 130, 246, 0.8)", // Blue
    "rgba(239, 68, 68, 0.8)", // Red
    "rgba(34, 197, 94, 0.8)", // Green
    "rgba(168, 85, 247, 0.8)", // Purple
    "rgba(249, 115, 22, 0.8)", // Orange
    "rgba(236, 72, 153, 0.8)", // Pink
  ];

  // Configurações dos períodos governamentais
  static GOVERNMENT_PERIODS = [
    {
      id: "fhc",
      start: "1995-01-01",
      end: "2003-01-01",
      color: "rgba(255, 99, 132, 0.1)",
      border: "rgba(255, 99, 132, 0.3)",
      label: "FHC",
      labelPos: "1999-01-01",
    },
    {
      id: "lula1",
      start: "2003-01-01",
      end: "2011-01-01",
      color: "rgba(54, 162, 235, 0.1)",
      border: "rgba(54, 162, 235, 0.3)",
      label: "Lula",
      labelPos: "2007-01-01",
    },
    {
      id: "dilma",
      start: "2011-01-01",
      end: "2016-08-01",
      color: "rgba(255, 206, 86, 0.1)",
      border: "rgba(255, 206, 86, 0.3)",
      label: "Dilma",
      labelPos: "2013-09-01",
    },
    {
      id: "temer",
      start: "2016-08-01",
      end: "2019-01-01",
      color: "rgba(75, 192, 192, 0.1)",
      border: "rgba(75, 192, 192, 0.3)",
      label: "Temer",
      labelPos: "2017-09-01",
    },
    {
      id: "bolsonaro",
      start: "2019-01-01",
      end: "2023-01-01",
      color: "rgba(153, 102, 255, 0.1)",
      border: "rgba(153, 102, 255, 0.3)",
      label: "Bolsonaro",
      labelPos: "2021-01-01",
    },
    {
      id: "lula2",
      start: "2023-01-01",
      end: "2025-12-31",
      color: "rgba(255, 159, 64, 0.1)",
      border: "rgba(255, 159, 64, 0.3)",
      label: "Lula",
      labelPos: "2024-01-01",
    },
  ];

  constructor(chartManager) {
    this.chartManager = chartManager;

    // Store reference to this instance in chart manager for tooltip access
    if (chartManager) {
      chartManager.chartCreator = this;
    }
  }

  // Obtém configuração de unidade para um indicador
  getUnitConfig(indicatorName) {
    if (window.chartManager && window.chartManager.indicatorsConfig) {
      const indicator = window.chartManager.indicatorsConfig.indicators.find(
        (ind) => ind.name === indicatorName,
      );
      return (
        indicator?.unit || { type: "percentage", symbol: "%", decimals: 2 }
      );
    }
    return { type: "percentage", symbol: "%", decimals: 2 };
  }

  // Abrevia números grandes (milhares e milhões)
  abbreviateNumber(value) {
    if (value === null || value === undefined) return "";

    const absValue = Math.abs(value);
    const isNegative = value < 0;
    const prefix = isNegative ? "-" : "";

    if (absValue >= 1000000) {
      const millions = absValue / 1000000;
      return prefix + millions.toFixed(millions >= 10 ? 0 : 1) + "M";
    } else if (absValue >= 1000) {
      const thousands = absValue / 1000;
      return prefix + thousands.toFixed(thousands >= 10 ? 0 : 1) + "K";
    }

    return value.toString();
  }

  // Formata valor baseado na configuração de unidade
  formatValue(value, unitConfig) {
    if (value === null || value === undefined) return "";
    unitConfig = unitConfig || {};

    switch (unitConfig.type) {
      case "currency": {
        const currencyDecimals =
          typeof unitConfig.decimals === "number" ? unitConfig.decimals : 0;
        return (
          unitConfig.symbol +
          " " +
          value.toLocaleString(unitConfig.locale || "pt-BR", {
            minimumFractionDigits: currencyDecimals,
            maximumFractionDigits: currencyDecimals,
          })
        );
      }
      case "percentage":
        return value.toFixed(unitConfig.decimals || 2) + unitConfig.symbol;
      case "number": {
        const numberDecimals =
          typeof unitConfig.decimals === "number" ? unitConfig.decimals : 0;
        const num = value.toLocaleString(unitConfig.locale || "pt-BR", {
          minimumFractionDigits: numberDecimals,
          maximumFractionDigits: numberDecimals,
        });
        return (unitConfig.symbol ? unitConfig.symbol + " " : "") + num;
      }
      default:
        return (
          value.toFixed(unitConfig.decimals || 2) + (unitConfig.symbol || "")
        );
    }
  }

  // Obtém título do eixo Y para um indicador
  getYAxisTitle(indicatorName) {
    if (window.chartManager && window.chartManager.indicatorsConfig) {
      const indicator = window.chartManager.indicatorsConfig.indicators.find(
        (ind) => ind.name === indicatorName,
      );
      return indicator?.yAxisTitle || "Taxa (%)";
    }
    return "Taxa (%)";
  }

  // Normaliza a data para garantir interpretação correta pelo Chart.js
  normalizeDate(dateString, forSynchronization = false) {
    // Para datas de final de mês, mantém como está mas garante formato correto
    return dateString;
  }

  // Obtém o valor do ponto de dados (suporta "rate" e "value")
  getDataPointValue(item) {
    return item.rate !== undefined ? item.rate : item.value;
  }

  // Verifica se o ponto de dados tem valor válido (suporta "rate" e "value")
  hasValidValue(item) {
    const value = this.getDataPointValue(item);
    return value !== null && value !== undefined;
  }

  // Filtra dados por intervalo de tempo
  filterDataByTimeRange(jsonData, startDate = null, endDate = null) {
    if (!startDate && !endDate) {
      return jsonData;
    }

    const filteredData = { ...jsonData };

    if (jsonData.data && Array.isArray(jsonData.data)) {
      filteredData.data = jsonData.data.filter((item) => {
        const itemDate = new Date(item.date);

        let include = true;

        if (startDate) {
          const start = new Date(startDate);
          include = include && itemDate >= start;
        }

        if (endDate) {
          const end = new Date(endDate);
          include = include && itemDate <= end;
        }

        return include;
      });
    }

    return filteredData;
  }

  // Obtém o intervalo de tempo ativo
  getActiveTimeRange() {
    const chart =
      window.chartInstance ||
      (window.chartManager && window.chartManager.chart);
    if (chart && chart.options.scales && chart.options.scales.x) {
      return {
        startDate: chart.options.scales.x.min || null,
        endDate: chart.options.scales.x.max || null,
      };
    }
    return { startDate: null, endDate: null };
  }

  // Cria gráfico com um ou múltiplos indicadores
  createChart(
    jsonDataArray,
    indicatorNames = null,
    yAxisConfig = null,
    timeRange = null,
    chartType = "line",
    valuesDisplayConfig = null,
  ) {
    const isMultipleIndicators = Array.isArray(jsonDataArray);
    let dataArray = isMultipleIndicators ? jsonDataArray : [jsonDataArray];
    const namesArray = isMultipleIndicators
      ? indicatorNames
      : [indicatorNames || jsonDataArray.indicatorName];

    // Apply time filtering to data if timeRange is provided
    if (timeRange && (timeRange.startDate || timeRange.endDate)) {
      dataArray = dataArray.map((data) =>
        this.filterDataByTimeRange(
          data,
          timeRange.startDate,
          timeRange.endDate,
        ),
      );
    }

    const isDark = document.documentElement.classList.contains("dark");
    const themeColors = this.getThemeColors(isDark);

    const datasets = this.createDatasets(
      dataArray,
      namesArray,
      isMultipleIndicators,
      yAxisConfig,
      valuesDisplayConfig,
    );
    const config = this.createChartConfig(
      datasets,
      dataArray,
      namesArray,
      isMultipleIndicators,
      themeColors,
      isDark,
      timeRange,
      chartType,
      valuesDisplayConfig,
    );

    return this.renderChart(config);
  }

  // Obtém cores baseadas no tema atual
  getThemeColors(isDark) {
    return {
      title: isDark ? "#f9fafb" : "#1f2937",
      axisLabel: isDark ? "#f9fafb" : "#1f2937",
      ticks: isDark ? "#d1d5db" : "#374151",
      grid: isDark ? "#4b5563" : "#e5e7eb",
    };
  }

  // Cria datasets para os indicadores
  createDatasets(
    dataArray,
    namesArray,
    isMultipleIndicators,
    yAxisConfig = null,
    valuesDisplayConfig = null,
  ) {
    // Para múltiplos indicadores, verifica se devem ser sincronizados ou não
    if (isMultipleIndicators && dataArray.length > 1) {
      // Verifica se todos os indicadores têm a mesma frequência
      const frequencies = dataArray.map((data) => this.detectFrequency(data));
      const allSameFrequency = frequencies.every(
        (freq) => freq === frequencies[0],
      );

      // Verifica se há tipos mistos (linha + barra)
      let chartTypes = [];
      if (window.chartManager && window.chartManager.indicatorsConfig) {
        chartTypes = namesArray.map((name) => {
          const ind = window.chartManager.indicatorsConfig.indicators.find(
            (i) => i.name === name,
          );
          return ind?.chartType || "line";
        });
      }
      const hasMixedTypes = new Set(chartTypes).size > 1;

      if (allSameFrequency && frequencies[0] === "monthly") {
        // Se todos são mensais, usa sincronização para permitir tooltip agrupado
        return this.createSynchronizedDatasets(
          dataArray,
          namesArray,
          yAxisConfig,
          valuesDisplayConfig,
        );
      } else if (hasMixedTypes) {
        // Se há tipos mistos (linha + barra), também usa sincronização para melhor interação
        return this.createSynchronizedDatasets(
          dataArray,
          namesArray,
          yAxisConfig,
          valuesDisplayConfig,
        );
      } else if (isMultipleIndicators) {
        // Para múltiplos indicadores, sempre tenta sincronizar para tooltip unificado
        return this.createSynchronizedDatasets(
          dataArray,
          namesArray,
          yAxisConfig,
          valuesDisplayConfig,
        );
      } else {
        // Se frequências diferentes e tipos homogêneos, mantém dados separados
        return this.createIndependentDatasets(
          dataArray,
          namesArray,
          yAxisConfig,
          valuesDisplayConfig,
        );
      }
    }

    // Busca tipos dos indicadores
    let chartTypes = [];
    if (window.chartManager && window.chartManager.indicatorsConfig) {
      chartTypes = namesArray.map((name) => {
        const ind = window.chartManager.indicatorsConfig.indicators.find(
          (i) => i.name === name,
        );
        return ind?.chartType || "line";
      });
    }

    return dataArray.map((jsonData, index) => {
      const indicatorName = namesArray[index] || jsonData.indicatorName;
      const chartType = chartTypes[index] || "line";

      // Para gráficos de barra com dados anuais, centraliza no ano para evitar problemas de tooltip
      const isAnnual = this.detectFrequency(jsonData) === "annual";

      console.log(
        `Processing ${indicatorName}: isAnnual=${isAnnual}, chartType=${chartType}`,
      );

      // Use custom color manager if available, otherwise fall back to default palette
      const color = window.getIndicatorColor
        ? window.getIndicatorColor(indicatorName, index)
        : ChartCreator.COLOR_PALETTE[index % ChartCreator.COLOR_PALETTE.length];

      // Determina se os valores devem estar sempre visíveis
      const showValuesAlways =
        valuesDisplayConfig && valuesDisplayConfig[indicatorName] === "always";

      const dataPoints = jsonData.data
        .filter((item) => this.hasValidValue(item))
        .map((item) => {
          let xValue = item.date;

          // Para dados anuais, sempre centraliza no meio do ano (julho) para evitar deslocamento
          if (isAnnual) {
            // Extrai o ano diretamente da string para evitar problemas de timezone
            const year = parseInt(item.date.split("-")[0]);
            xValue = `${year}-07-01`;
            console.log(
              `Converting: ${item.date} -> year: ${year} -> xValue: ${xValue}`,
            );
          }

          return {
            x: xValue,
            y: this.getDataPointValue(item),
          };
        });

      console.log(
        `Final dataPoints for ${indicatorName}:`,
        dataPoints.slice(0, 3),
      );

      const dataset = {
        label: indicatorName,
        data: dataPoints,
        type: chartType,
        borderColor: color,
        backgroundColor: color.replace("0.8", "0.1"),
        fill: true,
        tension: 0.1,
        borderWidth: ChartCreator.CHART_CONFIG.ANIMATION.BORDER_WIDTH,
        pointRadius: showValuesAlways
          ? 4
          : ChartCreator.CHART_CONFIG.ANIMATION.POINT_RADIUS,
        pointHoverRadius:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_HOVER_RADIUS,
        pointBackgroundColor: color,
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_BORDER_WIDTH,
        yAxisID: "y", // Single indicator always uses left axis
        spanGaps: false,
        // Plugin de data labels para exibir valores diretamente nos pontos
        datalabels: showValuesAlways
          ? {
              display: true,
              align: "top",
              anchor: "end",
              color: color.replace("0.8)", "1)"),
              font: {
                size: 10,
                weight: "bold",
              },
              formatter: (value) => {
                const unitConfig = this.getUnitConfig(indicatorName);
                return this.formatValue(value.y, unitConfig);
              },
              clip: false,
            }
          : {
              display: false,
            },
      };
      // Adiciona opções específicas para barras
      if (chartType === "bar") {
        const barConfig = ChartCreator.getResponsiveBarConfig();
        dataset.barThickness = barConfig.barThickness;
        dataset.categoryPercentage = barConfig.categoryPercentage;
        dataset.barPercentage = barConfig.barPercentage;
      }
      return dataset;
    });
  }

  // Detecta a frequência dos dados (mensal, anual, etc)
  detectFrequency(jsonData) {
    if (!jsonData.data || jsonData.data.length < 2) return "unknown";

    // Remove duplicatas e filtra dados válidos
    const uniqueData = [];
    const seenDates = new Set();

    jsonData.data.forEach((item) => {
      if (item.date && this.hasValidValue(item) && !seenDates.has(item.date)) {
        uniqueData.push(item);
        seenDates.add(item.date);
      }
    });

    if (uniqueData.length < 2) return "unknown";

    // Verifica se todas as datas têm o mesmo formato (todas em janeiro ou todas em julho)
    const months = new Set();
    uniqueData.forEach((item) => {
      const date = new Date(item.date);
      months.add(date.getMonth());
    });

    // Se todos os pontos estão no mesmo mês (janeiro ou julho), provavelmente são dados anuais
    if (months.size === 1 && (months.has(0) || months.has(6))) {
      console.log(
        `Detected annual data for ${jsonData.indicatorName}: all ${uniqueData.length} unique dates in month ${Array.from(months)[0]} (January=0, July=6)`,
      );
      return "annual";
    }

    // Calcula diferenças entre datas consecutivas usando dados únicos ordenados
    uniqueData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const intervals = [];
    for (let i = 1; i < Math.min(uniqueData.length, 10); i++) {
      const date1 = new Date(uniqueData[i - 1].date);
      const date2 = new Date(uniqueData[i].date);
      const diffMonths =
        (date2.getFullYear() - date1.getFullYear()) * 12 +
        (date2.getMonth() - date1.getMonth());
      intervals.push(diffMonths);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    console.log(
      `Average interval for ${jsonData.indicatorName}: ${avgInterval} months (from ${intervals.length} intervals)`,
    );

    if (avgInterval >= 11 && avgInterval <= 13) {
      console.log(
        `Detected annual data for ${jsonData.indicatorName}: average interval ${avgInterval} months`,
      );
      return "annual";
    }
    if (avgInterval >= 0.8 && avgInterval <= 1.5) return "monthly";
    return "other";
  }

  // Cria datasets independentes (sem sincronização) para indicadores de frequências diferentes
  createIndependentDatasets(
    dataArray,
    namesArray,
    yAxisConfig = null,
    valuesDisplayConfig = null,
  ) {
    console.log("=== createIndependentDatasets called ===");
    return dataArray.map((jsonData, index) => {
      const indicatorName = namesArray[index] || jsonData.indicatorName;

      // Use custom color manager if available, otherwise fall back to default palette
      const color = window.getIndicatorColor
        ? window.getIndicatorColor(indicatorName, index)
        : ChartCreator.COLOR_PALETTE[index % ChartCreator.COLOR_PALETTE.length];

      // Determina qual eixo Y usar baseado na configuração
      let yAxisID = "y"; // Default to left axis
      if (yAxisConfig && yAxisConfig[indicatorName]) {
        // Se a configuração explícita existir, respeita-a
        yAxisID = yAxisConfig[indicatorName] === "right" ? "y1" : "y";
      } else if (
        Array.isArray(namesArray) &&
        namesArray.length > 1 &&
        index === 1
      ) {
        // Regra padrão: quando há mais de um indicador, coloca o segundo no eixo direito
        yAxisID = "y1";
      }

      // Determina se os valores devem estar sempre visíveis
      const showValuesAlways =
        valuesDisplayConfig && valuesDisplayConfig[indicatorName] === "always";

      // Busca tipo do indicador
      let chartType = "line";
      if (window.chartManager && window.chartManager.indicatorsConfig) {
        const ind = window.chartManager.indicatorsConfig.indicators.find(
          (i) => i.name === indicatorName,
        );
        chartType = ind?.chartType || "line";
      }

      // Verifica se os dados são anuais
      const isAnnual = this.detectFrequency(jsonData) === "annual";

      // Determina se os valores devem estar sempre visíveis
      const showValuesAlwaysIndependent =
        valuesDisplayConfig && valuesDisplayConfig[indicatorName] === "always";

      // Cria array de dados ajustando as datas para garantir alinhamento correto
      const dataPoints = jsonData.data
        .filter((item) => this.hasValidValue(item))
        .map((item) => {
          let xValue = item.date;

          // Para dados anuais, sempre centraliza no meio do ano (julho) para evitar deslocamento
          if (isAnnual) {
            const date = new Date(item.date);
            const year = date.getFullYear();
            xValue = `${year}-07-01`;

            // Debug: mostra a conversão
            console.log(
              `Converting annual data (independent): ${item.date} (${this.getDataPointValue(item)}) -> ${xValue}`,
            );
          }

          return {
            x: xValue,
            y: this.getDataPointValue(item),
          };
        });

      const dataset = {
        label: indicatorName,
        data: dataPoints,
        type: chartType,
        borderColor: color,
        backgroundColor: color.replace("0.8", "0.1"),
        fill: false,
        tension: 0.1,
        borderWidth: ChartCreator.CHART_CONFIG.ANIMATION.BORDER_WIDTH,
        pointRadius: showValuesAlwaysIndependent
          ? 4
          : ChartCreator.CHART_CONFIG.ANIMATION.POINT_RADIUS,
        pointHoverRadius:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_HOVER_RADIUS,
        pointBackgroundColor: color,
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_BORDER_WIDTH,
        yAxisID: yAxisID,
        spanGaps: false,
        // Plugin de data labels para exibir valores diretamente nos pontos
        datalabels: showValuesAlwaysIndependent
          ? {
              display: true,
              align: "top",
              anchor: "end",
              color: color.replace("0.8)", "1)"),
              font: {
                size: 10,
                weight: "bold",
              },
              formatter: (value) => {
                const unitConfig = this.getUnitConfig(indicatorName);
                return this.formatValue(value.y, unitConfig);
              },
              clip: false,
            }
          : {
              display: false,
            },
      };

      // Adiciona opções específicas para barras
      if (chartType === "bar") {
        const barConfig = ChartCreator.getResponsiveBarConfig();
        dataset.barThickness = barConfig.barThickness;
        dataset.categoryPercentage = barConfig.categoryPercentage;
        dataset.barPercentage = barConfig.barPercentage;
      }
      return dataset;
    });
  }

  // Cria datasets sincronizados para múltiplos indicadores da mesma frequência
  createSynchronizedDatasets(
    dataArray,
    namesArray,
    yAxisConfig = null,
    valuesDisplayConfig = null,
  ) {
    console.log("=== createSynchronizedDatasets called ===");
    // Coleta todas as datas onde qualquer indicador tem dados
    const allDatesSet = new Set();

    // Detecta a frequência de cada dataset individualmente
    const dataFrequencies = dataArray.map((data) => this.detectFrequency(data));
    console.log("Data frequencies:", dataFrequencies);

    // Primeiro identifique todos os tipos de gráficos presentes
    let chartTypes = [];
    if (window.chartManager && window.chartManager.indicatorsConfig) {
      chartTypes = namesArray.map((name) => {
        const ind = window.chartManager.indicatorsConfig.indicators.find(
          (i) => i.name === name,
        );
        return ind?.chartType || "line";
      });
    }
    const hasBarCharts = chartTypes.some((type) => type === "bar");

    dataArray.forEach((jsonData, idx) => {
      const chartType = chartTypes[idx] || "line";
      const isThisDataAnnual = dataFrequencies[idx] === "annual";
      console.log(
        `Processing dataset ${idx} (${namesArray[idx]}): isAnnual=${isThisDataAnnual}, chartType=${chartType}`,
      );

      jsonData.data.forEach((item) => {
        if (this.hasValidValue(item)) {
          if (isThisDataAnnual) {
            // Para dados anuais, sempre centraliza no meio do ano
            const year = parseInt(item.date.split("-")[0]);
            const centeredDate = `${year}-07-01`;
            allDatesSet.add(centeredDate);
            console.log(`Annual data: ${item.date} -> ${centeredDate}`);
          } else {
            // Para dados mensais, normaliza para primeiro dia do mês
            const date = new Date(item.date);
            const normalizedDate = new Date(
              date.getFullYear(),
              date.getMonth(),
              1,
            );
            allDatesSet.add(normalizedDate.toISOString().split("T")[0]);
          }
        }
      });
    });

    const sortedDates = Array.from(allDatesSet).sort();

    // Para CADA dataset, cria um array com TODOS os pontos da linha temporal
    return dataArray.map((jsonData, index) => {
      const indicatorName = namesArray[index] || jsonData.indicatorName;

      // Use custom color manager if available, otherwise fall back to default palette
      const color = window.getIndicatorColor
        ? window.getIndicatorColor(indicatorName, index)
        : ChartCreator.COLOR_PALETTE[index % ChartCreator.COLOR_PALETTE.length];

      // Determina qual eixo Y usar baseado na configuração
      let yAxisID = "y"; // Default to left axis
      if (yAxisConfig && yAxisConfig[indicatorName]) {
        // Respeita configuração explícita quando fornecida
        yAxisID = yAxisConfig[indicatorName] === "right" ? "y1" : "y";
      } else if (
        Array.isArray(namesArray) &&
        namesArray.length > 1 &&
        index === 1
      ) {
        // Regra padrão: quando há mais de um indicador, coloca o segundo no eixo direito
        yAxisID = "y1";
      }

      // Determina se os valores devem estar sempre visíveis
      const showValuesSynchronized =
        valuesDisplayConfig && valuesDisplayConfig[indicatorName] === "always";

      // Mapa dos dados originais
      const dataMap = new Map();
      const isThisDatasetAnnual = dataFrequencies[index] === "annual";
      console.log(
        `Creating data map for ${indicatorName}: isAnnual=${isThisDatasetAnnual}`,
      );

      jsonData.data.forEach((item) => {
        if (this.hasValidValue(item)) {
          // Busca tipo do indicador para este dataset
          let chartType = "line";
          if (window.chartManager && window.chartManager.indicatorsConfig) {
            const ind = window.chartManager.indicatorsConfig.indicators.find(
              (i) => i.name === indicatorName,
            );
            chartType = ind?.chartType || "line";
          }

          if (isThisDatasetAnnual) {
            // Para dados anuais, sempre centraliza no meio do ano (julho) para evitar deslocamento
            const year = parseInt(item.date.split("-")[0]);
            const normalizedDate = `${year}-07-01`;
            dataMap.set(normalizedDate, this.getDataPointValue(item));
            console.log(
              `Annual data (synchronized): ${item.date} (${this.getDataPointValue(item)}) -> ${normalizedDate}`,
            );
          } else {
            // Para dados mensais, normaliza para primeiro dia do mês
            const date = new Date(item.date);
            const normalizedDate = new Date(
              date.getFullYear(),
              date.getMonth(),
              1,
            );
            const normalizedDateStr = normalizedDate
              .toISOString()
              .split("T")[0];
            dataMap.set(normalizedDateStr, this.getDataPointValue(item));
          }
        }
      });

      // Cria array completo seguindo a sequência temporal unificada
      // Adiciona 'null' onde não há dados para manter o alinhamento
      const dataPoints = sortedDates.map((date) => ({
        x: date,
        y: dataMap.has(date) ? dataMap.get(date) : null,
      }));

      // Busca tipo do indicador
      let chartType = "line";
      if (window.chartManager && window.chartManager.indicatorsConfig) {
        const ind = window.chartManager.indicatorsConfig.indicators.find(
          (i) => i.name === indicatorName,
        );
        chartType = ind?.chartType || "line";
      }

      const dataset = {
        label: indicatorName,
        data: dataPoints,
        type: chartType,
        borderColor: color,
        backgroundColor: color.replace("0.8", "0.1"),
        fill: false,
        tension: 0.1,
        borderWidth: ChartCreator.CHART_CONFIG.ANIMATION.BORDER_WIDTH,
        pointRadius: showValuesSynchronized
          ? 4
          : ChartCreator.CHART_CONFIG.ANIMATION.POINT_RADIUS,
        pointHoverRadius:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_HOVER_RADIUS,
        pointBackgroundColor: color,
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_BORDER_WIDTH,
        yAxisID: yAxisID,
        spanGaps: true, // Desenha linha sobre pontos nulos para dados sincronizados
        // Plugin de data labels para exibir valores diretamente nos pontos
        datalabels: showValuesSynchronized
          ? {
              display: true,
              align: "top",
              anchor: "end",
              color: color.replace("0.8)", "1)"),
              font: {
                size: 10,
                weight: "bold",
              },
              formatter: (value) => {
                if (value.y === null) return "";
                const unitConfig = this.getUnitConfig(indicatorName);
                return this.formatValue(value.y, unitConfig);
              },
              clip: false,
            }
          : {
              display: false,
            },
      };

      // Adiciona opções específicas para barras
      if (chartType === "bar") {
        const barConfig = ChartCreator.getResponsiveBarConfig();
        dataset.barThickness = barConfig.barThickness;
        dataset.categoryPercentage = barConfig.categoryPercentage;
        dataset.barPercentage = barConfig.barPercentage;
      }
      return dataset;
    });
  }

  // Cria configuração completa do gráfico
  createChartConfig(
    datasets,
    dataArray,
    namesArray,
    isMultipleIndicators,
    themeColors,
    isDark,
    timeRange = null,
    chartType = "line",
    valuesDisplayConfig = null,
  ) {
    // Calculate Y-axis ranges from all data to prevent auto-scaling during pan
    const yAxisRanges = this.calculateYAxisRanges(datasets, dataArray);

    // Detecta se os datasets foram sincronizados (mesma frequência) ou não
    const areSynchronized = this.detectIfSynchronized(datasets, dataArray);

    // Se todos os tipos forem iguais, define type global, senão omite
    let globalType = chartType;
    if (Array.isArray(datasets) && datasets.length > 1) {
      const allTypes = datasets.map((ds) => ds.type);
      globalType = allTypes.every((t) => t === allTypes[0])
        ? allTypes[0]
        : undefined;
    }
    // Detecta se há pelo menos um dataset do tipo 'bar'
    const hasBar =
      Array.isArray(datasets) && datasets.some((ds) => ds.type === "bar");

    // Detecta se TODOS os dados são anuais (importante para a formatação do tooltip)
    const allAnnualData =
      dataArray.length > 0 &&
      dataArray.every((data) => this.detectFrequency(data) === "annual");

    // Armazena essa informação no chartManager para ser acessada pelo tooltip
    if (window.chartManager) {
      // Garante que seja um valor booleano explícito para evitar problemas de tipo
      window.chartManager.isAnnualData = Boolean(allAnnualData);
    }
    return {
      ...(globalType ? { type: globalType } : {}),
      data: { datasets },
      options: {
        plugins: {
          legend: this.createLegendConfig(
            isMultipleIndicators,
            datasets,
            themeColors,
          ),
          annotation: {
            annotations: this.createGovernmentAnnotations(
              isDark,
              hasBar ? "bar" : chartType,
            ),
          },
          title: this.createTitleConfig(
            isMultipleIndicators,
            namesArray,
            dataArray,
            themeColors,
          ),
          tooltip: this.createTooltipConfig(areSynchronized),
          datalabels: {
            display: false, // Controle individual por dataset
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
                speed: 0.05,
              },
              pinch: {
                enabled: true,
                threshold: 2,
              },
              mode: "x", // Only zoom on X-axis (time) to prevent Y-axis scaling issues
            },
            pan: {
              enabled: true,
              mode: "xy", // Allow panning on both axes since Y-axis is now fixed
              threshold: 5,
            },
            limits: {
              x: {
                min: Date.parse("1995-01-01"),
                max: Date.parse("2025-01-01"),
              },
              y: {
                min: yAxisRanges.y.min,
                max: yAxisRanges.y.max,
              },
            },
          },
        },
        scales: this.createScalesConfig(
          isMultipleIndicators,
          datasets,
          dataArray,
          themeColors,
          timeRange,
          yAxisRanges,
        ),
        maintainAspectRatio: false,
        layout: { padding: ChartCreator.CHART_CONFIG.PADDING },
        interaction: {
          intersect: false,
          mode: areSynchronized ? "index" : "point",
          // Para gráficos mistos, aumenta a área de detecção
          axis: areSynchronized ? "x" : "xy",
        },
        hover: {
          mode: areSynchronized ? "index" : "point",
          intersect: false,
          // Aumenta a área de detecção para linhas quando há barras
          axis: areSynchronized ? "x" : "xy",
        },
        elements: {
          point: {
            hoverRadius: ChartCreator.CHART_CONFIG.ANIMATION.HOVER_RADIUS,
          },
        },
      },
    };
  }

  // Detecta se os datasets foram sincronizados verificando se têm o mesmo número de pontos
  detectIfSynchronized(datasets, dataArray) {
    if (!Array.isArray(datasets) || datasets.length <= 1) return false;

    // Verifica se há tipos mistos (linha + barra)
    const types = datasets.map((ds) => ds.type);
    const hasMixedTypes = new Set(types).size > 1;

    // Para tipos mistos, sempre usar modo index para facilitar interação
    if (hasMixedTypes) return true;

    // Para múltiplos indicadores, sempre sincronizar para tooltip unificado
    if (datasets.length > 1) return true;

    return false;
  }

  // Configuração da legenda
  createLegendConfig(isMultipleIndicators, datasets, themeColors) {
    return {
      display: isMultipleIndicators && datasets.length > 1,
      position: "bottom",
      labels: {
        color: themeColors.title,
        font: { size: 12 },
        usePointStyle: true,
      },
    };
  }

  // Configuração do título (desabilitado - usando título HTML)
  createTitleConfig(isMultipleIndicators, namesArray, dataArray, themeColors) {
    // Atualiza o título HTML em vez do título do Chart.js
    this.updateHTMLTitle(isMultipleIndicators, namesArray, dataArray);

    return {
      display: false, // Desabilita o título do Chart.js
    };
  }

  // Gera título do gráfico com granularidade
  generateChartTitle(isMultipleIndicators, namesArray, dataArray) {
    if (isMultipleIndicators && namesArray.length > 1) {
      // Remove granularidade, usa apenas os nomes limpos
      const cleanNames = namesArray.map((name) => name);
      return `Comparação: ${cleanNames.join(" vs ")}`;
    }

    // Para indicador único, usa apenas o nome limpo
    const cleanName = namesArray[0] || "Indicador";
    return cleanName;
  }

  // Atualiza o título HTML customizado
  updateHTMLTitle(isMultipleIndicators, namesArray, dataArray) {
    const titleElement = document.getElementById("chart-title");
    if (!titleElement) return;

    const title = this.generateChartTitle(
      isMultipleIndicators,
      namesArray,
      dataArray,
    );

    if (isMultipleIndicators && namesArray.length > 1) {
      // Para múltiplos indicadores, quebra no "vs" para melhor responsividade
      const parts = title.split(" vs ");
      if (parts.length > 1) {
        const prefix = "Comparação: ";
        const cleanTitle = title.replace(prefix, "");
        const indicators = cleanTitle.split(" vs ");

        let htmlContent = `<span class="block sm:inline">${prefix}${indicators[0]}</span>`;
        for (let i = 1; i < indicators.length; i++) {
          htmlContent += ` <span class="block sm:inline">vs ${indicators[i]}</span>`;
        }
        titleElement.innerHTML = htmlContent;
      } else {
        titleElement.textContent = title;
      }
    } else {
      titleElement.textContent = title;
    }
  }

  // Cria anotações dos períodos governamentais
  createGovernmentAnnotations(isDark, chartType = "line") {
    const annotations = {};
    ChartCreator.GOVERNMENT_PERIODS.forEach((gov) => {
      annotations[`${gov.id}_box`] = {
        type: "box",
        xMin: gov.start,
        xMax: gov.end,
        backgroundColor: gov.color,
        borderColor: gov.border,
        borderWidth: 1,
      };
      annotations[`${gov.id}_label`] = {
        type: "label",
        xValue: gov.labelPos,
        yValue: "max",
        content: [gov.label],
        backgroundColor: gov.border,
        color: gov.id === "dilma" ? (isDark ? "#1f2937" : "#6b7280") : "white",
        font: { size: 12, weight: "bold" },
        padding: 4,
        borderRadius: 4,
      };
    });
    return annotations;
  }

  // Configuração do tooltip
  createTooltipConfig(areSynchronized = false) {
    return {
      position: "nearest",
      xAlign: "center",
      yAlign: "top",
      caretPadding: 10,
      mode: areSynchronized ? "index" : "nearest", // Mudando de "point" para "nearest"
      intersect: false,
      // Para múltiplos indicadores, agrupa por mês/ano
      axis: areSynchronized ? "x" : "x", // Mudando de "xy" para "x" sempre
      // Para gráficos mistos, aumenta a área de detecção
      callbacks: {
        title: (context) => {
          if (context.length === 0) return "";
          const date = new Date(context[0].parsed.x);

          // Verifica explicitamente se todos os dados são anuais através do chartManager
          const isAllAnnualData =
            window.chartManager && window.chartManager.isAnnualData === true;

          // Se TODOS os dados são anuais, sempre mostra apenas o ano
          if (isAllAnnualData) {
            return date.getFullYear().toString();
          }

          // Para dados mensais, mostra mês e ano
          return date.toLocaleDateString("pt-BR", {
            year: "numeric",
            month: "long",
          });
        },
        label: (context) => {
          // Garante que o valor mostrado seja exatamente o valor do ponto
          const value = context.parsed.y;
          if (value === null || value === undefined) return "";

          // Obtém configuração de unidade para este indicador
          const chartCreator =
            window.chartManager?.chartCreator ||
            new ChartCreator(window.chartManager);
          const unitConfig = chartCreator.getUnitConfig(context.dataset.label);
          const formattedValue = chartCreator.formatValue(value, unitConfig);

          return `${context.dataset.label}: ${formattedValue}`;
        },
      },
      filter: (tooltipItem) => {
        // Só mostra itens que têm valores válidos
        return (
          tooltipItem.parsed.y !== null && tooltipItem.parsed.y !== undefined
        );
      },
      external: this.createCustomTooltip,
    };
  }

  // Tooltip personalizado para mobile
  createCustomTooltip(context) {
    const { tooltip } = context;
    if (!tooltip || tooltip.opacity === 0) return;

    const { chart } = context;
    const { canvas } = chart;
    const canvasRect = canvas.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;

    if (!isMobile || !tooltip.dataPoints?.length) return;

    const tooltipEl = ChartCreator.getOrCreateTooltipElement();
    ChartCreator.updateTooltipContent(tooltipEl, tooltip);
    ChartCreator.positionTooltip(tooltipEl, tooltip, chart, canvasRect);
  }

  // Obtém ou cria elemento do tooltip
  static getOrCreateTooltipElement() {
    let tooltipEl = document.getElementById("chartjs-tooltip");
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "chartjs-tooltip";
      tooltipEl.className =
        "absolute z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none transform -translate-x-1/2 -translate-y-full";
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // Atualiza conteúdo do tooltip
  static updateTooltipContent(tooltipEl, tooltip) {
    if (!tooltip.title || !tooltip.body) return;

    const title = tooltip.title[0] || "";
    const body = tooltip.body.map((b) => b.lines[0]).join("<br>");
    tooltipEl.innerHTML = `<div class="font-medium">${title}</div><div>${body}</div>`;
  }

  // Posiciona tooltip
  static positionTooltip(tooltipEl, tooltip, chart, canvasRect) {
    const position = Chart.helpers.getRelativePosition(
      tooltip.dataPoints[0].element,
      chart,
    );
    const left = canvasRect.left + window.pageXOffset + position.x;
    let top = canvasRect.top + window.pageYOffset + position.y - 10;

    const padding = 10;
    const adjustedLeft = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltipEl.offsetWidth - padding),
    );

    if (top < padding) {
      top = canvasRect.top + window.pageYOffset + position.y + 10;
      tooltipEl.className = tooltipEl.className.replace(
        "-translate-y-full",
        "translate-y-0",
      );
    } else {
      tooltipEl.className = tooltipEl.className.replace(
        "translate-y-0",
        "-translate-y-full",
      );
    }

    Object.assign(tooltipEl.style, {
      left: `${adjustedLeft}px`,
      top: `${top}px`,
      opacity: "1",
    });
  }

  // Round numbers to cleaner values for Y-axis display
  roundToCleanNumber(value, roundDown = false, dataRange = null) {
    if (value === 0) return 0;

    const abs = Math.abs(value);
    const sign = value < 0 ? -1 : 1;

    // Special handling for percentage-like data (small ranges, typically 0-100)
    if (dataRange && dataRange <= 100 && abs <= 100) {
      // For percentage data, use more appropriate rounding
      if (abs < 0.1) {
        // Very small percentages: round to nearest 0.01
        const rounded = roundDown
          ? Math.floor(abs * 100) / 100
          : Math.ceil(abs * 100) / 100;
        return sign * rounded;
      } else if (abs < 1) {
        // Small percentages: round to nearest 0.1
        const rounded = roundDown
          ? Math.floor(abs * 10) / 10
          : Math.ceil(abs * 10) / 10;
        return sign * rounded;
      } else if (abs < 10) {
        // Medium percentages: round to nearest 0.5
        const rounded = roundDown
          ? Math.floor(abs * 2) / 2
          : Math.ceil(abs * 2) / 2;
        return sign * rounded;
      } else {
        // Larger percentages: round to nearest 1
        const rounded = roundDown ? Math.floor(abs) : Math.ceil(abs);
        return sign * rounded;
      }
    }

    // Original logic for non-percentage data
    const magnitude = Math.floor(Math.log10(abs));
    const powerOf10 = Math.pow(10, magnitude);

    // Normalize to 1-10 range
    const normalized = abs / powerOf10;

    let rounded;
    if (normalized < 2) {
      // Round to nearest 0.1 (e.g., 1.2, 1.5, 1.8)
      rounded = roundDown
        ? Math.floor(normalized * 10) / 10
        : Math.ceil(normalized * 10) / 10;
    } else if (normalized < 5) {
      // Round to nearest 0.5 (e.g., 2.0, 2.5, 3.0)
      rounded = roundDown
        ? Math.floor(normalized * 2) / 2
        : Math.ceil(normalized * 2) / 2;
    } else {
      // Round to nearest 1 (e.g., 5, 6, 7, 8, 9, 10)
      rounded = roundDown ? Math.floor(normalized) : Math.ceil(normalized);
    }

    return sign * rounded * powerOf10;
  }

  // Calculate appropriate step size for Y-axis ticks
  calculateStepSize(min, max) {
    if (min === null || max === null || min === max) return undefined;

    const range = Math.abs(max - min);
    const magnitude = Math.floor(Math.log10(range));
    const powerOf10 = Math.pow(10, magnitude);

    // Normalize range to 1-10
    const normalizedRange = range / powerOf10;

    let step;
    if (normalizedRange <= 1) {
      step = 0.2 * powerOf10; // 5 steps
    } else if (normalizedRange <= 2) {
      step = 0.5 * powerOf10; // 4 steps
    } else if (normalizedRange <= 5) {
      step = 1 * powerOf10; // 5 steps
    } else {
      step = 2 * powerOf10; // 5 steps
    }

    return step;
  }

  // Calculate Y-axis ranges from all data to prevent auto-scaling during pan
  calculateYAxisRanges(datasets, dataArray) {
    const ranges = {
      y: { min: null, max: null },
      y1: { min: null, max: null },
    };

    datasets.forEach((dataset, index) => {
      const yAxisId = dataset.yAxisID || "y";
      const dataPoints = dataset.data;

      if (!dataPoints || dataPoints.length === 0) return;

      // Extract Y values, handling both object {x, y} and direct values
      const yValues = dataPoints
        .map((point) => {
          if (point && typeof point === "object" && "y" in point) {
            return point.y;
          }
          return point;
        })
        .filter((val) => val !== null && val !== undefined && !isNaN(val));

      if (yValues.length === 0) return;

      const min = Math.min(...yValues);
      const max = Math.max(...yValues);
      const dataRange = max - min;

      // Add 5% padding to min/max for better visualization
      const range = max - min;
      const padding = range * 0.05;
      let paddedMin = min - padding;
      let paddedMax = max + padding;

      // Round to cleaner numbers to avoid very long decimals, pass data range for percentage detection
      paddedMin = this.roundToCleanNumber(paddedMin, true, dataRange); // true = round down
      paddedMax = this.roundToCleanNumber(paddedMax, false, dataRange); // false = round up

      // Update range for this axis
      if (ranges[yAxisId].min === null || paddedMin < ranges[yAxisId].min) {
        ranges[yAxisId].min = paddedMin;
      }
      if (ranges[yAxisId].max === null || paddedMax > ranges[yAxisId].max) {
        ranges[yAxisId].max = paddedMax;
      }
    });

    return ranges;
  }

  // Configuração dos eixos
  createScalesConfig(
    isMultipleIndicators,
    datasets,
    dataArray,
    themeColors,
    timeRange = null,
    yAxisRanges = null,
  ) {
    // Use provided Y-axis ranges or calculate them if not provided
    const ranges =
      yAxisRanges || this.calculateYAxisRanges(datasets, dataArray);

    // Get Y-axis title from indicator configuration
    const firstIndicatorName = datasets[0]?.label || "Indicador";
    const yAxisTitle = this.getYAxisTitle(firstIndicatorName);
    const hasBar =
      Array.isArray(datasets) && datasets.some((ds) => ds.type === "bar");

    // Detecta se há dados anuais
    const hasAnnualData = dataArray.some(
      (data) => this.detectFrequency(data) === "annual",
    );

    // Detecta se TODOS os dados são anuais
    const allAnnualData =
      dataArray.length > 0 &&
      dataArray.every((data) => this.detectFrequency(data) === "annual");

    // Get unit configuration for the first indicator to check if we need number abbreviation
    const firstUnitConfig = this.getUnitConfig(firstIndicatorName);
    const shouldAbbreviateYAxis =
      firstUnitConfig.type === "number" || firstUnitConfig.type === "currency";

    // Store reference to this instance for callbacks
    const chartCreator = this;

    const scales = {
      x: {
        type: "time",
        time: {
          unit: "year",
          stepSize: 1,
          displayFormats: {
            year: "yyyy",
            month: "MMM yyyy",
          },
          // Removendo tooltipFormat para depender exclusivamente do callback
          minUnit: "year",
          // Para dados puramente anuais, não faz arredondamento para evitar gaps
          round: allAnnualData
            ? false
            : hasAnnualData && hasBar
              ? false
              : "month",
          // Força o parsing de datas para sempre começar no início do ano
          parser: false,
        },
        // Para dados anuais puros, não usa offset para evitar gaps
        offset: false, // Sempre false para manter linhas de grade alinhadas com labels
        title: { display: true, text: "Ano", color: themeColors.axisLabel },
        ticks: {
          color: themeColors.ticks,
          maxTicksLimit: 50,
          autoSkip: false,
          source: "auto",
          // Para garantir que os ticks fiquem nos anos exatos
          major: {
            enabled: true,
          },
          callback: function (value, index, values) {
            const date = new Date(value);
            const year = date.getFullYear();
            return year;
          },
        },
        grid: {
          color: themeColors.grid,
          display: true,
          drawBorder: true,
          drawOnChartArea: true,
          drawTicks: true,
          // Força as linhas de grade a ficarem alinhadas com os ticks
          offset: false,
          // Para garantir que as linhas fiquem nos anos exatos
          tickMarkLength: 0,
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: false,
        // Fix Y-axis range to prevent auto-scaling during pan
        min: ranges.y.min,
        max: ranges.y.max,
        title: {
          display: true,
          text: isMultipleIndicators ? yAxisTitle : yAxisTitle,
          color: themeColors.axisLabel,
        },
        ticks: {
          color: themeColors.ticks,
          maxTicksLimit: 8, // Limit number of ticks for cleaner appearance
          stepSize:
            ranges.y.min !== null && ranges.y.max !== null
              ? this.calculateStepSize(ranges.y.min, ranges.y.max)
              : undefined,
          callback: shouldAbbreviateYAxis
            ? (value) => chartCreator.abbreviateNumber(value)
            : undefined,
        },
        grid: { color: themeColors.grid },
      },
    };

    // Apply time range if provided, otherwise use default range
    if (timeRange && (timeRange.startDate || timeRange.endDate)) {
      if (timeRange.startDate) {
        scales.x.min = timeRange.startDate;
      }
      if (timeRange.endDate) {
        scales.x.max = timeRange.endDate;
      }
    } else {
      // Para dados anuais puros, ajusta os limites para evitar gaps
      if (allAnnualData) {
        // Encontra a primeira e última data dos dados
        const allDates = [];
        dataArray.forEach((data) => {
          data.data.forEach((item) => {
            if (item.date && this.hasValidValue(item)) {
              allDates.push(item.date);
            }
          });
        });

        if (allDates.length > 0) {
          // Remove duplicatas e ordena
          const uniqueDates = [...new Set(allDates)].sort();

          // Extrai anos diretamente das strings para evitar problemas de timezone
          const firstYear = parseInt(uniqueDates[0].split("-")[0]);
          const lastYear = parseInt(
            uniqueDates[uniqueDates.length - 1].split("-")[0],
          );

          console.log("Annual data date range:", {
            firstDate: uniqueDates[0],
            lastDate: uniqueDates[uniqueDates.length - 1],
            firstYear,
            lastYear,
          });

          // Para dados anuais, usa o início do primeiro ano e fim do último ano
          // para dar espaço aos dados centralizados em julho
          scales.x.min = `${firstYear}-01-01`; // Início do primeiro ano
          scales.x.max = `${lastYear}-12-31`; // Fim do último ano
        } else {
          // Fallback para range padrão
          scales.x.min = ChartCreator.CHART_CONFIG.TIME_RANGE.MIN;
          scales.x.max = ChartCreator.CHART_CONFIG.TIME_RANGE.MAX;
        }
      } else {
        // Use default range para dados mistos/mensais
        scales.x.min = ChartCreator.CHART_CONFIG.TIME_RANGE.MIN;
        scales.x.max = ChartCreator.CHART_CONFIG.TIME_RANGE.MAX;
      }
    }

    // Adiciona segundo eixo Y apenas se algum dataset realmente usar o eixo direito
    const hasRightAxisDataset = datasets.some(
      (dataset) => dataset.yAxisID === "y1",
    );
    if (isMultipleIndicators && hasRightAxisDataset) {
      // Find the first dataset that uses the right axis to get its title
      const rightAxisDataset = datasets.find(
        (dataset) => dataset.yAxisID === "y1",
      );
      const rightAxisTitle = rightAxisDataset
        ? this.getYAxisTitle(rightAxisDataset.label)
        : "Taxa (%)";

      // Get unit configuration for the right axis indicator
      const rightUnitConfig = this.getUnitConfig(rightAxisDataset.label);
      const shouldAbbreviateRightAxis =
        rightUnitConfig.type === "number" ||
        rightUnitConfig.type === "currency";

      scales.y1 = {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: false,
        // Fix Y1-axis range to prevent auto-scaling during pan
        min: ranges.y1.min,
        max: ranges.y1.max,
        title: {
          display: true,
          text: rightAxisTitle,
          color: themeColors.axisLabel,
        },
        ticks: {
          color: themeColors.ticks,
          maxTicksLimit: 8, // Limit number of ticks for cleaner appearance
          stepSize:
            ranges.y1.min !== null && ranges.y1.max !== null
              ? this.calculateStepSize(ranges.y1.min, ranges.y1.max)
              : undefined,
          callback: shouldAbbreviateRightAxis
            ? (value) => chartCreator.abbreviateNumber(value)
            : undefined,
        },
        grid: { drawOnChartArea: false },
      };
    }

    return scales;
  }

  // Renderiza o gráfico
  renderChart(config) {
    const ctx = document.getElementById("chart").getContext("2d");

    // Destrói gráfico existente se necessário
    if (this.chartManager.chart) {
      this.chartManager.chart.destroy();
      this.chartManager.chart = null;
    }

    this.chartManager.chart = new Chart(ctx, config);

    // Expose chart instance globally for time filters
    window.chartInstance = this.chartManager.chart;

    return this.chartManager.chart;
  }
}

// Exporta classe
window.ChartCreator = ChartCreator;
