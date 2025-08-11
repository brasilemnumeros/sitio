document.addEventListener("DOMContentLoaded", function () {
  // Modal management functions will be available globally
});

function populateYearSelectors() {
  const fromYearSelect = document.getElementById("start-year");
  const toYearSelect = document.getElementById("end-year");
  const currentYear = new Date().getFullYear();
  const startYear = 1995; // Início do Plano Real

  // Verificar se os elementos existem antes de popular
  if (!fromYearSelect || !toYearSelect) {
    console.warn("Year selectors not found in DOM");
    return;
  }

  // Limpar opções existentes (exceto a primeira que é "Ano")
  fromYearSelect.innerHTML = '<option value="">Ano</option>';
  toYearSelect.innerHTML = '<option value="">Ano</option>';

  // Popular seletores com anos de 1994 até ano atual
  for (let year = startYear; year <= currentYear; year++) {
    const option1 = new Option(year, year);
    const option2 = new Option(year, year);
    fromYearSelect.appendChild(option1);
    toYearSelect.appendChild(option2);
  }

  // Definir valores padrão
  fromYearSelect.value = startYear;
  toYearSelect.value = currentYear;
}

// Função para popular seletores quando a modal abre
function onConfigModalOpen() {
  // Popular seletores de ano
  populateYearSelectors();
}

function resetDateFilter() {
  // Reset time filter by recreating chart with all data
  if (window.chartIntegration) {
    window.chartIntegration.applyTimeFilter(null, null);
    window.chartIntegration.updateTimeRangeURL(null, null, "all");
  } else {
    console.warn("chartIntegration não disponível");
  }
}

function applyRelativePeriod(years) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - years);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  applyDateRange(startDateStr, endDateStr);

  // Update URL with period info
  if (window.chartIntegration) {
    window.chartIntegration.updateTimeRangeURL(null, null, `last${years}years`);
  }
}

function applyDateRange(startDate, endDate) {
  // Apply time filter by recreating chart with filtered data
  if (window.chartIntegration) {
    window.chartIntegration.applyTimeFilter(startDate, endDate);
    window.chartIntegration.updateTimeRangeURL(startDate, endDate);
  } else {
    console.warn("chartIntegration não disponível");
  }
}

// Expose functions globally
window.applyDateRange = applyDateRange;
window.resetDateFilter = resetDateFilter;
window.applyRelativePeriod = applyRelativePeriod;

function updateChart() {
  const chart =
    window.chartInstance || (window.chartManager && window.chartManager.chart);

  if (chart) {
    chart.update("none");
  }
}
