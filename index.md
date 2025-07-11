---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
---
<div class="chart-container">
  <canvas id="timelineChart"></canvas>
</div>

<script>
  document.addEventListener("DOMContentLoaded", function() {
    const ctx = document.getElementById('timelineChart').getContext('2d');

    // Gera dinamicamente os anos de 2000 até o ano atual
    const startYear = 2000;
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = startYear; year <= currentYear; year++) {
      years.push(year.toString());
    }

    // Gera dados de exemplo para o gráfico (sinta-se à vontade para substituir por dados reais)
    const sampleData = years.map(() => Math.random() * 100);

    const timelineChart = new Chart(ctx, {
      type: 'line', // Tipo de gráfico
      data: {
        labels: years, // Eixo X com os anos
        datasets: [{
          label: 'Valor Aleatório por Ano',
          data: sampleData, // Eixo Y com dados de exemplo
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Essencial para o gráfico preencher o container
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          annotation: {
            annotations: {
              fhc: {
                type: 'box',
                xMin: '2000',
                xMax: '2003',
                backgroundColor: 'rgba(255, 99, 132, 0.25)',
                label: {
                  content: 'FHC',
                  enabled: true
                }
              },
              lula1: {
                type: 'box',
                xMin: '2003',
                xMax: '2011',
                backgroundColor: 'rgba(54, 162, 235, 0.25)',
                label: {
                  content: 'Lula',
                  enabled: true
                }
              },
              dilma: {
                type: 'box',
                xMin: '2011',
                xMax: '2016',
                backgroundColor: 'rgba(255, 206, 86, 0.25)',
                label: {
                  content: 'Dilma',
                  enabled: true
                }
              },
              temer: {
                type: 'box',
                xMin: '2016',
                xMax: '2019',
                backgroundColor: 'rgba(75, 192, 192, 0.25)',
                label: {
                  content: 'Temer',
                  enabled: true
                }
              },
              bolsonaro: {
                type: 'box',
                xMin: '2019',
                xMax: '2023',
                backgroundColor: 'rgba(153, 102, 255, 0.25)',
                label: {
                  content: 'Bolsonaro',
                  enabled: true
                }
              },
              lula2: {
                type: 'box',
                xMin: '2023',
                xMax: new Date().getFullYear().toString(),
                backgroundColor: 'rgba(255, 159, 64, 0.25)',
                label: {
                  content: 'Lula',
                  enabled: true
                }
              }
            }
          }
        }
      }
    });
  });
</script>

