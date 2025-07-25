---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: chart
---
<div class="chart-container">
  <canvas id="timelineChart"></canvas>
</div>

<script>
  let timelineChart;

  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      backgroundColor: style.getPropertyValue('--background-color').trim(),
      textColor: style.getPropertyValue('--text-color').trim(),
      linkColor: style.getPropertyValue('--link-color').trim(),
      gridColor: style.getPropertyValue('--chart-grid-color').trim(),
      fontColor: style.getPropertyValue('--chart-font-color').trim()
    };
  }

  function createChart() {
    const ctx = document.getElementById('timelineChart').getContext('2d');
    const colors = getThemeColors();

    const startYear = 2000;
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (startYear + i).toString());
    const sampleData = years.map(() => Math.random() * 100);

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(75, 192, 192, 0.6)');
    gradient.addColorStop(1, 'rgba(75, 192, 192, 0)');

    timelineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: 'Índice Histórico (Exemplo)',
          data: sampleData,
          borderColor: colors.linkColor,
          backgroundColor: gradient,
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: colors.backgroundColor,
          pointBorderColor: colors.linkColor,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: colors.gridColor },
            ticks: { color: colors.fontColor, font: { family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" } }
          },
          x: {
            grid: { display: false },
            ticks: { color: colors.fontColor, font: { family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" } }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: colors.fontColor,
              font: { size: 14, family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" }
            }
          },
          tooltip: {
            backgroundColor: '#333',
            titleFont: { size: 16 },
            bodyFont: { size: 14 },
            callbacks: {
              label: function(context) {
                return `Índice: ${context.parsed.y.toFixed(2)}`;
              }
            }
          },
          annotation: {
            annotations: {
              fhc: { type: 'box', xMin: '2000', xMax: '2003', backgroundColor: 'rgba(255, 99, 132, 0.15)', label: { content: 'FHC', enabled: true, position: 'start' } },
              lula1: { type: 'box', xMin: '2003', xMax: '2011', backgroundColor: 'rgba(54, 162, 235, 0.15)', label: { content: 'Lula', enabled: true, position: 'start' } },
              dilma: { type: 'box', xMin: '2011', xMax: '2016', backgroundColor: 'rgba(255, 206, 86, 0.15)', label: { content: 'Dilma', enabled: true, position: 'start' } },
              temer: { type: 'box', xMin: '2016', xMax: '2019', backgroundColor: 'rgba(75, 192, 192, 0.15)', label: { content: 'Temer', enabled: true, position: 'start' } },
              bolsonaro: { type: 'box', xMin: '2019', xMax: '2023', backgroundColor: 'rgba(153, 102, 255, 0.15)', label: { content: 'Bolsonaro', enabled: true, position: 'start' } },
              lula2: { type: 'box', xMin: '2023', xMax: currentYear.toString(), backgroundColor: 'rgba(255, 159, 64, 0.15)', label: { content: 'Lula', enabled: true, position: 'start' } }
            }
          }
        }
      }
    });
  }

  function updateChartTheme() {
    if (!timelineChart) return;
    const colors = getThemeColors();
    
    // Update colors
    timelineChart.options.scales.y.grid.color = colors.gridColor;
    timelineChart.options.scales.y.ticks.color = colors.fontColor;
    timelineChart.options.scales.x.ticks.color = colors.fontColor;
    timelineChart.options.plugins.legend.labels.color = colors.fontColor;
    timelineChart.data.datasets[0].borderColor = colors.linkColor;
    timelineChart.data.datasets[0].pointBackgroundColor = colors.backgroundColor;
    timelineChart.data.datasets[0].pointBorderColor = colors.linkColor;
    
    timelineChart.update();
  }
</script>

