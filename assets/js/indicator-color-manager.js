// Indicator Color Manager - Manages custom colors for chart indicators

class IndicatorColorManager {
  constructor() {
    this.customColors = new Map();
    this.defaultColors = [
      "rgba(59, 130, 246, 0.8)", // Blue
      "rgba(239, 68, 68, 0.8)", // Red
      "rgba(34, 197, 94, 0.8)", // Green
      "rgba(168, 85, 247, 0.8)", // Purple
      "rgba(249, 115, 22, 0.8)", // Orange
      "rgba(236, 72, 153, 0.8)", // Pink
    ];
  }

  // Convert hex color to rgba format
  hexToRgba(hex, alpha = 0.8) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Convert rgba to hex color
  rgbaToHex(rgba) {
    const matches = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!matches) return "#000000";

    const r = parseInt(matches[1]);
    const g = parseInt(matches[2]);
    const b = parseInt(matches[3]);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Set custom color for an indicator
  setIndicatorColor(indicatorName, hexColor) {
    const rgbaColor = this.hexToRgba(hexColor);
    this.customColors.set(indicatorName, rgbaColor);

    // Update chart if it exists
    this.updateChartColors();
  }

  // Get color for an indicator (custom or default)
  getIndicatorColor(indicatorName, index = 0) {
    if (this.customColors.has(indicatorName)) {
      return this.customColors.get(indicatorName);
    }
    return this.defaultColors[index % this.defaultColors.length];
  }

  // Get hex color for color picker display
  getIndicatorHexColor(indicatorName, index = 0) {
    const rgbaColor = this.getIndicatorColor(indicatorName, index);
    return this.rgbaToHex(rgbaColor);
  }

  // Update chart colors when custom colors change
  updateChartColors() {
    if (window.chartManager && window.chartManager.chart) {
      const chart = window.chartManager.chart;

      // Update dataset colors
      chart.data.datasets.forEach((dataset, index) => {
        const indicatorName = dataset.label;
        const color = this.getIndicatorColor(indicatorName, index);

        dataset.borderColor = color;
        dataset.backgroundColor = color.replace("0.8", "0.1");
        dataset.pointBackgroundColor = color;
      });

      // Update the chart
      chart.update("none");
    }
  }

  // Clear custom color for an indicator
  clearIndicatorColor(indicatorName) {
    this.customColors.delete(indicatorName);
    this.updateChartColors();
  }

  // Clear all custom colors
  clearAllColors() {
    this.customColors.clear();
    this.updateChartColors();
  }

  // Get all custom colors (for persistence)
  getCustomColors() {
    return Object.fromEntries(this.customColors);
  }

  // Load custom colors (for persistence)
  loadCustomColors(colorsObj) {
    this.customColors = new Map(Object.entries(colorsObj));
    this.updateChartColors();
  }
}

// Global instance
window.indicatorColorManager = new IndicatorColorManager();

// Global functions for easy access
window.setIndicatorColor = (indicatorName, hexColor) => {
  window.indicatorColorManager.setIndicatorColor(indicatorName, hexColor);
};

window.getIndicatorColor = (indicatorName, index = 0) => {
  return window.indicatorColorManager.getIndicatorColor(indicatorName, index);
};

window.getIndicatorHexColor = (indicatorName, index = 0) => {
  return window.indicatorColorManager.getIndicatorHexColor(
    indicatorName,
    index,
  );
};

// Store colors globally for template access
window.indicatorColors = new Proxy(
  {},
  {
    get: (target, prop) => {
      return window.indicatorColorManager.getIndicatorHexColor(prop);
    },
  },
);
