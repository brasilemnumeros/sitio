/**
 * Chart Manager - Gerencia criação e atualização de gráficos
 */

class ChartManager {
  constructor() {
    this.chart = null;
    this.indicatorsConfig = null;
  }

  // Function to calculate and set optimal chart height
  setChartHeight() {
    const chartContainer = document.getElementById('chart-container');
    const containerRect = chartContainer.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const footerHeight = 100; // Estimated footer height + some padding

    // Calculate available height from current position to bottom of viewport
    const availableHeight = viewportHeight - containerRect.top - footerHeight;

    // Set minimum and maximum heights
    const minHeight = 400;
    const maxHeight = 800;

    // Calculate optimal height
    const optimalHeight = Math.max(minHeight, Math.min(maxHeight, availableHeight));

    chartContainer.style.height = optimalHeight + 'px';
  }

  // Load indicators configuration
  async loadIndicatorsConfig() {
    try {
      let baseUrl = window.location.origin;
      const response = await fetch(baseUrl + '/indicators.json');
      const config = await response.json();
      this.indicatorsConfig = config;
      return config;
    } catch (error) {
      console.error('Error loading indicators config:', error);
      return {};
    }
  }

  // Clear chart
  clearChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    const canvas = document.getElementById('chart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    const sourceElement = document.getElementById('source-name');
    if (sourceElement) {
      sourceElement.textContent = 'Selecione um indicador para visualizar os dados';
    }
  }

  // Load data from file
  async loadData(dataFile) {
    try {
      const loadingIndicator = document.getElementById('loading-indicator');
      const chartCanvas = document.getElementById('chart');

      loadingIndicator.classList.remove('hidden');
      chartCanvas.style.opacity = '0.3';

      let baseUrl = '';
      if (!dataFile.startsWith('http')) {
        baseUrl = window.location.origin;
      }
      const response = await fetch(baseUrl + dataFile);
      const jsonData = await response.json();

      loadingIndicator.classList.add('hidden');
      chartCanvas.style.opacity = '1';

      return jsonData;
    } catch (error) {
      console.error('Error loading data:', error);

      const loadingIndicator = document.getElementById('loading-indicator');
      const chartCanvas = document.getElementById('chart');

      loadingIndicator.classList.add('hidden');
      chartCanvas.style.opacity = '1';

      return null;
    }
  }

  // Update data source display
  updateDataSource(selectedFiles) {
    const sourceElement = document.getElementById('source-name');
    if (!sourceElement) return;
    
    const filesArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    const sources = new Set();
    
    filesArray.forEach(selectedFile => {
      if (this.indicatorsConfig && this.indicatorsConfig.indicators) {
        const indicator = this.indicatorsConfig.indicators.find(ind => ind.datafile === selectedFile);
        if (indicator && indicator.source) {
          sources.add(indicator.source);
          return;
        }
      }
      
      const sourceMap = {
        'https://brasilemnumeros.github.io/dados/selic/selic-acum-12m.json': 'Banco Central do Brasil',
        'https://brasilemnumeros.github.io/dados/ipca/ipca-acum-12m.json': 'Instituto Brasileiro de Geografia e Estatística (IBGE)',
        '/data/selic-acum-12m.json': 'Banco Central do Brasil',
        '/data/ipca-acum-12m.json': 'Instituto Brasileiro de Geografia e Estatística (IBGE)'
      };
      
      const source = sourceMap[selectedFile] || 'Banco Central do Brasil';
      sources.add(source);
    });
    
    const sourcesArray = Array.from(sources);
    if (sourcesArray.length === 1) {
      sourceElement.textContent = sourcesArray[0];
    } else if (sourcesArray.length > 1) {
      sourceElement.textContent = sourcesArray.join(' | ');
    } else {
      sourceElement.textContent = 'Banco Central do Brasil';
    }
  }

  // Get granularity for indicator
  getGranularityForIndicator(indicatorName, dataArray, index) {
    if (this.indicatorsConfig?.indicators) {
      const indicator = this.indicatorsConfig.indicators.find(ind => 
        ind.name === indicatorName || ind.name.includes(indicatorName.replace(/^[🏦📈]\s/, ''))
      );
      if (indicator && indicator.granularity) {
        return indicator.granularity;
      }
    }
    
    if (dataArray[index] && dataArray[index].granularity) {
      return dataArray[index].granularity;
    }
    
    return null;
  }

  // Initialize chart manager
  async initialize() {
    this.setChartHeight();
    this.indicatorsConfig = await this.loadIndicatorsConfig();
    
    // Add window resize listener
    window.addEventListener('resize', () => {
      this.setChartHeight();
      if (this.chart) {
        this.chart.resize();
      }
    });

    return this.indicatorsConfig;
  }
}

// Export instance
window.chartManager = new ChartManager();
