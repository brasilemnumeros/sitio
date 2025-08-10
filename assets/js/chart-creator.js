/**
 * Chart Creator - Responsável pela criação e configuração de gráficos
 */

class ChartCreator {
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
  }

  // Normaliza a data para o primeiro dia do mês seguinte se for o último dia do mês
  normalizeDate(dateString) {
    const date = new Date(dateString); // YYYY-MM-DD é interpretado como UTC
    const nextDay = new Date(date.getTime());
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    if (nextDay.getUTCDate() === 1) {
      return nextDay.toISOString().split("T")[0];
    }
    return dateString;
  }

  // Cria gráfico com um ou múltiplos indicadores
  createChart(jsonDataArray, indicatorNames = null) {
    const isMultipleIndicators = Array.isArray(jsonDataArray);
    const dataArray = isMultipleIndicators ? jsonDataArray : [jsonDataArray];
    const namesArray = isMultipleIndicators
      ? indicatorNames
      : [indicatorNames || jsonDataArray.indicatorName];

    const isDark = document.documentElement.classList.contains("dark");
    const themeColors = this.getThemeColors(isDark);

    const datasets = this.createDatasets(
      dataArray,
      namesArray,
      isMultipleIndicators,
    );
    const config = this.createChartConfig(
      datasets,
      dataArray,
      namesArray,
      isMultipleIndicators,
      themeColors,
      isDark,
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
  createDatasets(dataArray, namesArray, isMultipleIndicators) {
    // Para múltiplos indicadores, sincroniza as datas primeiro
    if (isMultipleIndicators && dataArray.length > 1) {
      return this.createSynchronizedDatasets(dataArray, namesArray);
    }

    return dataArray.map((jsonData, index) => {
      const indicatorName = namesArray[index] || jsonData.indicatorName;
      const color =
        ChartCreator.COLOR_PALETTE[index % ChartCreator.COLOR_PALETTE.length];

      const dataPoints = jsonData.data
        .filter((item) => item.rate !== null)
        .map((item) => ({
          x: this.normalizeDate(item.date),
          y: item.rate,
        }));

      return {
        label: indicatorName,
        data: dataPoints,
        borderColor: color,
        backgroundColor: color.replace("0.8", "0.1"),
        fill: false,
        tension: 0.1,
        borderWidth: ChartCreator.CHART_CONFIG.ANIMATION.BORDER_WIDTH,
        pointRadius: ChartCreator.CHART_CONFIG.ANIMATION.POINT_RADIUS,
        pointHoverRadius:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_HOVER_RADIUS,
        pointBackgroundColor: color,
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_BORDER_WIDTH,
        yAxisID: index > 0 ? "y1" : "y",
        spanGaps: false,
      };
    });
  }

  // Cria datasets sincronizados para múltiplos indicadores
  createSynchronizedDatasets(dataArray, namesArray) {
    // Coleta todas as datas onde qualquer indicador tem dados e ordena
    const allDatesSet = new Set();
    dataArray.forEach((jsonData) => {
      jsonData.data.forEach((item) => {
        if (item.rate !== null && item.rate !== undefined) {
          allDatesSet.add(this.normalizeDate(item.date));
        }
      });
    });

    const sortedDates = Array.from(allDatesSet).sort();

    // Para CADA dataset, cria um array com TODOS os pontos da linha temporal
    // mas só inclui valores onde o indicador realmente tem dados
    return dataArray.map((jsonData, index) => {
      const indicatorName = namesArray[index] || jsonData.indicatorName;
      const color =
        ChartCreator.COLOR_PALETTE[index % ChartCreator.COLOR_PALETTE.length];

      // Mapa dos dados originais
      const dataMap = new Map();
      jsonData.data.forEach((item) => {
        if (item.rate !== null && item.rate !== undefined) {
          dataMap.set(this.normalizeDate(item.date), item.rate);
        }
      });

      // Cria array completo seguindo a sequência temporal unificada
      // Adiciona 'null' onde não há dados para manter o alinhamento
      const dataPoints = sortedDates.map((date) => ({
        x: date,
        y: dataMap.has(date) ? dataMap.get(date) : null,
      }));

      return {
        label: indicatorName,
        data: dataPoints,
        borderColor: color,
        backgroundColor: color.replace("0.8", "0.1"),
        fill: false,
        tension: 0.1,
        borderWidth: ChartCreator.CHART_CONFIG.ANIMATION.BORDER_WIDTH,
        pointRadius: ChartCreator.CHART_CONFIG.ANIMATION.POINT_RADIUS,
        pointHoverRadius:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_HOVER_RADIUS,
        pointBackgroundColor: color,
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth:
          ChartCreator.CHART_CONFIG.ANIMATION.POINT_BORDER_WIDTH,
        yAxisID: index > 0 ? "y1" : "y",
        spanGaps: true, // Desenha linha sobre pontos nulos
      };
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
  ) {
    return {
      type: "line",
      data: { datasets },
      options: {
        plugins: {
          legend: this.createLegendConfig(
            isMultipleIndicators,
            datasets,
            themeColors,
          ),
          annotation: { annotations: this.createGovernmentAnnotations(isDark) },
          title: this.createTitleConfig(
            isMultipleIndicators,
            namesArray,
            dataArray,
            themeColors,
          ),
          tooltip: this.createTooltipConfig(),
        },
        scales: this.createScalesConfig(
          isMultipleIndicators,
          datasets,
          dataArray,
          themeColors,
        ),
        maintainAspectRatio: false,
        layout: { padding: ChartCreator.CHART_CONFIG.PADDING },
        interaction: {
          intersect: false,
          mode: "index",
        },
        hover: {
          mode: "index",
          intersect: false,
        },
        elements: {
          point: {
            hoverRadius: ChartCreator.CHART_CONFIG.ANIMATION.HOVER_RADIUS,
          },
        },
      },
    };
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

  // Configuração do título
  createTitleConfig(isMultipleIndicators, namesArray, dataArray, themeColors) {
    const title = this.generateChartTitle(
      isMultipleIndicators,
      namesArray,
      dataArray,
    );
    return {
      display: true,
      text: title,
      font: { size: 18 },
      color: themeColors.title,
    };
  }

  // Gera título do gráfico com granularidade
  generateChartTitle(isMultipleIndicators, namesArray, dataArray) {
    if (isMultipleIndicators && namesArray.length > 1) {
      const indicatorsWithGranularity = namesArray.map((name, index) => {
        const cleanName = name;
        const granularity = this.chartManager.getGranularityForIndicator(
          name,
          dataArray,
          index,
        );
        return granularity ? `${cleanName} (${granularity})` : cleanName;
      });
      return `Comparação: ${indicatorsWithGranularity.join(" vs ")}`;
    }

    const cleanName = (namesArray[0] || "Indicador");
    const granularity = this.chartManager.getGranularityForIndicator(
      namesArray[0],
      dataArray,
      0,
    );
    return granularity ? `${cleanName} (${granularity})` : cleanName;
  }

  // Cria anotações dos períodos governamentais
  createGovernmentAnnotations(isDark) {
    const annotations = {};

    ChartCreator.GOVERNMENT_PERIODS.forEach((gov) => {
      // Caixa de fundo
      annotations[`${gov.id}_box`] = {
        type: "box",
        xMin: gov.start,
        xMax: gov.end,
        backgroundColor: gov.color,
        borderColor: gov.border,
        borderWidth: 1,
      };

      // Rótulo
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
  createTooltipConfig() {
    return {
      position: "nearest",
      xAlign: "center",
      yAlign: "top",
      caretPadding: 10,
      callbacks: {
        title: (context) => {
          const date = new Date(context[0].parsed.x);
          return date.toLocaleDateString("pt-BR", {
            year: "numeric",
            month: "long",
          });
        },
        label: (context) =>
          `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`,
      },
      filter: (tooltipItem) => tooltipItem.datasetIndex !== undefined,
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

  // Configuração dos eixos
  createScalesConfig(isMultipleIndicators, datasets, dataArray, themeColors) {
    const yAxisTitle = dataArray[0].yAxisTitle || "Taxa (%)";

    const scales = {
      x: {
        type: "time",
        time: {
          unit: "year",
          displayFormats: {
            year: ChartCreator.CHART_CONFIG.DISPLAY_FORMAT.YEAR,
          },
        },
        min: ChartCreator.CHART_CONFIG.TIME_RANGE.MIN,
        max: ChartCreator.CHART_CONFIG.TIME_RANGE.MAX,
        title: { display: true, text: "Ano", color: themeColors.axisLabel },
        ticks: {
          color: themeColors.ticks,
        },
        grid: { color: themeColors.grid },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: false,
        title: {
          display: true,
          text: isMultipleIndicators
            ? dataArray[0].yAxisTitle || "Taxa (%)"
            : yAxisTitle,
          color: themeColors.axisLabel,
        },
        ticks: { color: themeColors.ticks },
        grid: { color: themeColors.grid },
      },
    };

    // Adiciona segundo eixo Y para múltiplos indicadores
    if (isMultipleIndicators && datasets.length > 1) {
      scales.y1 = {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: false,
        title: {
          display: true,
          text: dataArray[1]?.yAxisTitle || "Taxa (%)",
          color: themeColors.axisLabel,
        },
        ticks: { color: themeColors.ticks },
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
    return this.chartManager.chart;
  }
}

// Exporta classe
window.ChartCreator = ChartCreator;
