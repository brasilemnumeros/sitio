/**
 * Chart Manager - Gerencia criação e atualização de gráficos
 */

class ChartManager {
  // Constantes da classe
  static CHART_CONFIG = {
    MIN_HEIGHT: 400,
    MAX_HEIGHT: 800,
    FOOTER_HEIGHT: 100,
  };

  static ELEMENTS = {
    CHART_CONTAINER: "chart-container",
    CHART_CANVAS: "chart",
    LOADING_INDICATOR: "loading-indicator",
    SOURCE_NAME: "source-name",
  };

  constructor() {
    this.chart = null;
    this.indicatorsConfig = null;

    // Store global reference for color manager
    window.chartManager = this;
  }

  // Calcula e define altura otimizada do gráfico
  setChartHeight() {
    const chartContainer = document.getElementById(
      ChartManager.ELEMENTS.CHART_CONTAINER,
    );
    if (!chartContainer) return;

    const { top } = chartContainer.getBoundingClientRect();
    const availableHeight =
      window.innerHeight - top - ChartManager.CHART_CONFIG.FOOTER_HEIGHT;

    const optimalHeight = Math.max(
      ChartManager.CHART_CONFIG.MIN_HEIGHT,
      Math.min(ChartManager.CHART_CONFIG.MAX_HEIGHT, availableHeight),
    );

    chartContainer.style.height = `${optimalHeight}px`;
  }

  // Carrega configuração de indicadores
  async loadIndicatorsConfig() {
    try {
      const response = await fetch(`${window.location.origin}/indicators.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.indicatorsConfig = await response.json();
      return this.indicatorsConfig;
    } catch (error) {
      console.error("Error loading indicators config:", error);
      return {};
    }
  }

  // Limpa gráfico atual
  clearChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.clearCanvas();
    this.updateSourceDisplay("Selecione um indicador para visualizar os dados");
    this.clearTitle();
  }

  // Limpa o título HTML
  clearTitle() {
    const titleElement = document.getElementById("chart-title");
    if (titleElement) {
      titleElement.textContent = "Selecione um indicador para visualizar";
    }
  }

  // Limpa canvas
  clearCanvas() {
    const canvas = document.getElementById(ChartManager.ELEMENTS.CHART_CANVAS);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Atualiza exibição de fonte
  updateSourceDisplay(text) {
    const sourceElement = document.getElementById(
      ChartManager.ELEMENTS.SOURCE_NAME,
    );
    if (sourceElement) {
      sourceElement.textContent = text;
    }
  }

  // Controla indicadores de carregamento
  toggleLoadingState(isLoading) {
    const loadingIndicator = document.getElementById(
      ChartManager.ELEMENTS.LOADING_INDICATOR,
    );
    const chartCanvas = document.getElementById(
      ChartManager.ELEMENTS.CHART_CANVAS,
    );

    if (!loadingIndicator || !chartCanvas) return;

    if (isLoading) {
      loadingIndicator.classList.remove("hidden");
      loadingIndicator.classList.add("flex");
      chartCanvas.style.opacity = "0.3";
    } else {
      loadingIndicator.classList.add("hidden");
      loadingIndicator.classList.remove("flex");
      chartCanvas.style.opacity = "1";
    }
  }

  // Carrega dados de arquivo
  async loadData(dataFile) {
    try {
      this.toggleLoadingState(true);

      const baseUrl = dataFile.startsWith("http") ? "" : window.location.origin;
      const response = await fetch(`${baseUrl}${dataFile}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const jsonData = await response.json();
      this.toggleLoadingState(false);
      return jsonData;
    } catch (error) {
      console.error("Error loading data:", error);
      this.toggleLoadingState(false);
      return null;
    }
  }

  // Atualiza exibição de fonte dos dados
  updateDataSource(selectedFiles) {
    const filesArray = Array.isArray(selectedFiles)
      ? selectedFiles
      : [selectedFiles];
    const sources = new Set();

    filesArray.forEach((file) => {
      const source = this.getSourceForFile(file);
      if (source && source !== "Fonte não disponível") {
        sources.add(source);
      }
    });

    const sourcesText =
      sources.size > 0
        ? Array.from(sources).join(" | ")
        : "Selecione um indicador";

    this.updateSourceDisplay(sourcesText);
  }

  // Obtém fonte para arquivo específico
  getSourceForFile(file) {
    // Busca no indicators.json
    if (this.indicatorsConfig?.indicators) {
      const indicator = this.indicatorsConfig.indicators.find(
        (ind) => ind.datafile === file,
      );
      if (indicator?.source) return indicator.source;
    }

    // Fallback genérico se não encontrar
    return "Fonte não disponível";
  }

  // Obtém granularidade para indicador
  getGranularityForIndicator(indicatorName, dataArray, index) {
    // Primeiro tenta encontrar na configuração
    if (this.indicatorsConfig?.indicators) {
      const cleanName = indicatorName.replace(/^[🏦📈]\s/, "");
      const indicator = this.indicatorsConfig.indicators.find(
        (ind) => ind.name === indicatorName || ind.name.includes(cleanName),
      );
      if (indicator?.granularity) return indicator.granularity;
    }

    // Fallback para dados do arquivo
    return dataArray[index]?.granularity || null;
  }

  // Inicializa gerenciador de gráficos
  async initialize() {
    this.setChartHeight();
    this.indicatorsConfig = await this.loadIndicatorsConfig();
    this.setupEventListeners();
    return this.indicatorsConfig;
  }

  // Configura event listeners
  setupEventListeners() {
    window.addEventListener("resize", () => {
      this.setChartHeight();
      this.chart?.resize();
    });
  }
}

// Exporta instância global
window.chartManager = new ChartManager();
