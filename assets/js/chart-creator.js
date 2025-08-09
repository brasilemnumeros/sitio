/**
 * Chart Creator - Responsável pela criação e configuração de gráficos
 */

class ChartCreator {
  constructor(chartManager) {
    this.chartManager = chartManager;
  }

  // Create chart with single or multiple indicators
  createChart(jsonDataArray, indicatorNames = null) {
    const isMultipleIndicators = Array.isArray(jsonDataArray);
    const dataArray = isMultipleIndicators ? jsonDataArray : [jsonDataArray];
    const namesArray = isMultipleIndicators ? indicatorNames : [indicatorNames || jsonDataArray.indicatorName];

    // Check if dark mode is active
    const isDark = document.documentElement.classList.contains('dark');

    // Define colors based on theme
    const titleColor = isDark ? '#f9fafb' : '#1f2937';
    const axisLabelColor = isDark ? '#f9fafb' : '#1f2937';
    const ticksColor = isDark ? '#d1d5db' : '#374151';
    const gridColor = isDark ? '#4b5563' : '#e5e7eb';

    // Color palette for multiple indicators
    const colorPalette = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(34, 197, 94, 0.8)',    // Green
      'rgba(168, 85, 247, 0.8)',   // Purple
      'rgba(249, 115, 22, 0.8)',   // Orange
      'rgba(236, 72, 153, 0.8)',   // Pink
    ];

    // Create datasets for each indicator
    const datasets = dataArray.map((jsonData, index) => {
      const chartData = jsonData.data;
      const indicatorName = namesArray[index] || jsonData.indicatorName;
      const color = colorPalette[index % colorPalette.length];
      
      const allDataPoints = chartData.map((item) => ({
        x: item.date || item.year,
        y: item.rate,
      }));

      return {
        label: indicatorName,
        data: allDataPoints,
        borderColor: color,
        backgroundColor: color.replace('0.8', '0.1'),
        fill: false,
        tension: 0.1,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: 'rgba(255, 255, 255, 0.8)',
        pointBorderWidth: 2,
        yAxisID: isMultipleIndicators && index > 0 ? 'y1' : 'y',
      };
    });

    // Generate chart title with granularity
    const finalTitle = this.generateChartTitle(isMultipleIndicators, namesArray, dataArray);

    // Create chart configuration
    const config = {
      type: 'line',
      data: { datasets: datasets },
      options: {
        plugins: {
          legend: {
            display: isMultipleIndicators && datasets.length > 1,
            position: 'bottom',
            labels: {
              color: titleColor,
              font: { size: 12 },
              usePointStyle: true,
            },
          },
          annotation: {
            annotations: this.createGovernmentAnnotations(isDark),
          },
          title: {
            display: true,
            text: finalTitle,
            font: { size: 18 },
            color: titleColor,
          },
          tooltip: this.createTooltipConfig(),
        },
        scales: this.createScalesConfig(isMultipleIndicators, datasets, dataArray, axisLabelColor, ticksColor, gridColor),
        maintainAspectRatio: false,
        layout: {
          padding: { top: 20, bottom: 20, left: 10, right: 40 },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        elements: {
          point: { hoverRadius: 8 },
        },
      },
    };

    // Create chart
    const ctx = document.getElementById('chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (this.chartManager.chart) {
      this.chartManager.chart.destroy();
      this.chartManager.chart = null;
    }

    this.chartManager.chart = new Chart(ctx, config);
    return this.chartManager.chart;
  }

  // Generate chart title with granularity
  generateChartTitle(isMultipleIndicators, namesArray, dataArray) {
    let finalTitle;
    if (isMultipleIndicators && namesArray.length > 1) {
      const indicatorsWithGranularity = namesArray.map((name, index) => {
        const cleanName = name.replace(/^[🏦📈]\s/, '');
        const granularity = this.chartManager.getGranularityForIndicator(name, dataArray, index);
        return granularity ? `${cleanName} (${granularity})` : cleanName;
      });
      finalTitle = `Comparação: ${indicatorsWithGranularity.join(' vs ')}`;
    } else {
      const cleanName = (namesArray[0] || 'Indicador').replace(/^[🏦📈]\s/, '');
      const granularity = this.chartManager.getGranularityForIndicator(namesArray[0], dataArray, 0);
      finalTitle = granularity ? `${cleanName} (${granularity})` : cleanName;
    }
    return finalTitle;
  }

  // Create government period annotations
  createGovernmentAnnotations(isDark) {
    const annotations = {};

    // Background boxes for government periods
    const governments = [
      { id: 'fhc', start: '1995-01-01', end: '2003-01-01', color: 'rgba(255, 99, 132, 0.1)', border: 'rgba(255, 99, 132, 0.3)', label: 'FHC', labelPos: '1999-01-01' },
      { id: 'lula1', start: '2003-01-01', end: '2011-01-01', color: 'rgba(54, 162, 235, 0.1)', border: 'rgba(54, 162, 235, 0.3)', label: 'Lula', labelPos: '2007-01-01' },
      { id: 'dilma', start: '2011-01-01', end: '2016-08-01', color: 'rgba(255, 206, 86, 0.1)', border: 'rgba(255, 206, 86, 0.3)', label: 'Dilma', labelPos: '2013-09-01' },
      { id: 'temer', start: '2016-08-01', end: '2019-01-01', color: 'rgba(75, 192, 192, 0.1)', border: 'rgba(75, 192, 192, 0.3)', label: 'Temer', labelPos: '2017-09-01' },
      { id: 'bolsonaro', start: '2019-01-01', end: '2023-01-01', color: 'rgba(153, 102, 255, 0.1)', border: 'rgba(153, 102, 255, 0.3)', label: 'Bolsonaro', labelPos: '2021-01-01' },
      { id: 'lula2', start: '2023-01-01', end: '2025-12-31', color: 'rgba(255, 159, 64, 0.1)', border: 'rgba(255, 159, 64, 0.3)', label: 'Lula', labelPos: '2024-01-01' }
    ];

    governments.forEach(gov => {
      // Background box
      annotations[`${gov.id}_box`] = {
        type: 'box',
        xMin: gov.start,
        xMax: gov.end,
        backgroundColor: gov.color,
        borderColor: gov.border,
        borderWidth: 1,
      };

      // Label
      annotations[`${gov.id}_label`] = {
        type: 'label',
        xValue: gov.labelPos,
        yValue: 'max',
        content: [gov.label],
        backgroundColor: gov.border,
        color: gov.id === 'dilma' ? (isDark ? '#1f2937' : '#6b7280') : 'white',
        font: { size: 12, weight: 'bold' },
        padding: 4,
        borderRadius: 4,
      };
    });

    return annotations;
  }

  // Create tooltip configuration
  createTooltipConfig() {
    return {
      position: 'nearest',
      xAlign: 'center',
      yAlign: 'top',
      caretPadding: 10,
      callbacks: {
        title: function (context) {
          const date = new Date(context[0].parsed.x);
          return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
          });
        },
        label: function(context) {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
        },
      },
      filter: function(tooltipItem) {
        return tooltipItem.datasetIndex !== undefined;
      },
      external: this.createCustomTooltip,
    };
  }

  // Create custom tooltip for mobile
  createCustomTooltip(context) {
    const tooltip = context.tooltip;
    if (!tooltip || tooltip.opacity === 0) {
      return;
    }
    
    const chart = context.chart;
    const canvas = chart.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    
    if (isMobile && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
      const tooltipEl = document.getElementById('chartjs-tooltip') || (() => {
        const div = document.createElement('div');
        div.id = 'chartjs-tooltip';
        div.className = 'absolute z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none transform -translate-x-1/2 -translate-y-full';
        document.body.appendChild(div);
        return div;
      })();
      
      if (tooltip.title && tooltip.body) {
        const title = tooltip.title[0] || '';
        const body = tooltip.body.map(b => b.lines[0]).join('<br>');
        tooltipEl.innerHTML = `<div class="font-medium">${title}</div><div>${body}</div>`;
      }
      
      const position = Chart.helpers.getRelativePosition(tooltip.dataPoints[0].element, chart);
      const left = canvasRect.left + window.pageXOffset + position.x;
      let top = canvasRect.top + window.pageYOffset + position.y - 10;
      
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const padding = 10;
      
      let adjustedLeft = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
      
      if (top < padding) {
        top = canvasRect.top + window.pageYOffset + position.y + 10;
        tooltipEl.className = tooltipEl.className.replace('-translate-y-full', 'translate-y-0');
      } else {
        tooltipEl.className = tooltipEl.className.replace('translate-y-0', '-translate-y-full');
      }
      
      tooltipEl.style.left = adjustedLeft + 'px';
      tooltipEl.style.top = top + 'px';
      tooltipEl.style.opacity = '1';
    }
  }

  // Create scales configuration
  createScalesConfig(isMultipleIndicators, datasets, dataArray, axisLabelColor, ticksColor, gridColor) {
    const yAxisTitle = dataArray[0].yAxisTitle || 'Taxa (%)';
    
    const scales = {
      x: {
        type: 'time',
        time: {
          unit: 'year',
          displayFormats: { year: 'yyyy' },
        },
        min: '1995-01-01',
        max: '2025-12-31',
        title: {
          display: true,
          text: 'Ano',
          color: axisLabelColor,
        },
        ticks: { color: ticksColor },
        grid: { color: gridColor },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: false,
        title: {
          display: true,
          text: isMultipleIndicators ? (dataArray[0].yAxisTitle || 'Taxa (%)') : yAxisTitle,
          color: axisLabelColor,
        },
        ticks: { color: ticksColor },
        grid: { color: gridColor },
      },
    };

    // Add second y-axis for multiple indicators
    if (isMultipleIndicators && datasets.length > 1) {
      scales.y1 = {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: false,
        title: {
          display: true,
          text: dataArray[1]?.yAxisTitle || 'Taxa (%)',
          color: axisLabelColor,
        },
        ticks: { color: ticksColor },
        grid: { drawOnChartArea: false },
      };
    }

    return scales;
  }
}

// Export
window.ChartCreator = ChartCreator;
