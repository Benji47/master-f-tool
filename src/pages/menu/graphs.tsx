import { Context } from "hono";
import { PlayerEloHistory, PlayerXPHistory, PlayerVyrazeckaHistory, PlayerGamesHistory } from "../../logic/graphs";

export function GraphsPage({ 
  c, 
  eloHistories, 
  xpHistories = [], 
  vyrazeckaHistories = [], 
  gamesHistories = [] 
}: { 
  c: Context; 
  eloHistories: PlayerEloHistory[];
  xpHistories?: PlayerXPHistory[];
  vyrazeckaHistories?: PlayerVyrazeckaHistory[];
  gamesHistories?: PlayerGamesHistory[];
}) {
  // Prepare data for Chart.js as JSON
  const eloData = JSON.stringify(eloHistories);
  const xpData = JSON.stringify(xpHistories);
  const vyrazeckaData = JSON.stringify(vyrazeckaHistories);
  const gamesData = JSON.stringify(gamesHistories);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-green-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-[Orbitron]">📊 Player Performance Graphs</h1>
            <p className="text-neutral-400 text-sm mt-2">Track player statistics over time</p>
          </div>
          <a href="/v1/lobby" className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md text-sm font-bold">
            ← Back to Lobby
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button data-graph-tab="elo" className="graph-tab active px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 cursor-pointer text-white rounded-md font-semibold transition-colors">ELO Over Time</button>
          <button data-graph-tab="xp" className="graph-tab px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">XP Over Time</button>
          <button data-graph-tab="vyrazecka" className="graph-tab px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Vyrážečka Over Time</button>
          <button data-graph-tab="games" className="graph-tab px-4 py-2 bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-white rounded-md font-semibold transition-colors">Total Games Over Time</button>
        </div>

        <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 font-[Orbitron]">Select Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" id="player-checkboxes">
            {eloHistories.map((history, idx) => {
              const color = getPlayerColor(idx);
              return (
                <label className="flex items-center gap-2 p-3 bg-neutral-800/60 rounded-md hover:bg-neutral-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-purple-500"
                    data-player-id={history.playerId}
                    data-color={color}
                    checked={idx < 5} // Show first 5 by default
                  />
                  <span className="w-4 h-4 rounded-full" style={`background-color: ${color}`}></span>
                  <span className="text-white text-sm font-medium">{history.username}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-neutral-900/50 rounded-lg border border-neutral-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 font-[Orbitron]">Date Range</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-neutral-400 mb-2">From Date</label>
              <input
                type="date"
                id="date-from"
                className="w-full px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-md focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-neutral-400 mb-2">To Date</label>
              <input
                type="date"
                id="date-to"
                className="w-full px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-md focus:border-purple-500 focus:outline-none"
              />
            </div>
            <button
              id="reset-dates"
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md font-bold text-sm transition-colors"
            >
              Reset Dates
            </button>
          </div>
        </div>

        {/* Chart Containers */}
        <div id="elo-chart" className="graph-chart active bg-neutral-900/50 rounded-lg border border-neutral-800 p-6">
          <canvas id="eloChart" width="400" height="200"></canvas>
        </div>
        <div id="xp-chart" className="graph-chart hidden bg-neutral-900/50 rounded-lg border border-neutral-800 p-6">
          <canvas id="xpChart" width="400" height="200"></canvas>
        </div>
        <div id="vyrazecka-chart" className="graph-chart hidden bg-neutral-900/50 rounded-lg border border-neutral-800 p-6">
          <canvas id="vyrazeckaChart" width="400" height="200"></canvas>
        </div>
        <div id="games-chart" className="graph-chart hidden bg-neutral-900/50 rounded-lg border border-neutral-800 p-6">
          <canvas id="gamesChart" width="400" height="200"></canvas>
        </div>
      </div>

      {/* Chart.js Library */}
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

      {/* Chart Initialization Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          const eloHistories = ${eloData};
          const xpHistories = ${xpData};
          const vyrazeckaHistories = ${vyrazeckaData};
          const gamesHistories = ${gamesData};
          
          let charts = {};
          let currentTab = 'elo';

          // Color palette for players
          const playerColors = [
            'rgb(34, 197, 94)',   // green-500
            'rgb(59, 130, 246)',  // blue-500
            'rgb(239, 68, 68)',   // red-500
            'rgb(245, 158, 11)',  // amber-500
            'rgb(168, 85, 247)',  // purple-500
            'rgb(236, 72, 153)',  // pink-500
            'rgb(20, 184, 166)',  // teal-500
            'rgb(251, 146, 60)',  // orange-500
            'rgb(163, 230, 53)',  // lime-500
            'rgb(14, 165, 233)',  // sky-500
          ];

          function getPlayerColor(index) {
            return playerColors[index % playerColors.length];
          }

          function createChart(canvasId, type, title, yAxisLabel) {
            if (charts[type]) {
              charts[type].destroy();
            }
            return null;
          }

          function updateCharts() {
            const checkboxes = document.querySelectorAll('#player-checkboxes input[type="checkbox"]:checked');
            const selectedPlayerIds = Array.from(checkboxes).map(cb => cb.dataset.playerId);

            const dateFromInput = document.getElementById('date-from');
            const dateToInput = document.getElementById('date-to');
            const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
            const dateTo = dateToInput.value ? new Date(dateToInput.value + 'T23:59:59') : null;

            // Update ELO Chart
            {
              const datasets = [];
              eloHistories.forEach((history, idx) => {
                if (!selectedPlayerIds.includes(history.playerId)) return;
                const color = getPlayerColor(idx);
                let filteredPoints = history.dataPoints;
                if (dateFrom || dateTo) {
                  filteredPoints = history.dataPoints.filter(point => {
                    const pointDate = new Date(point.date);
                    if (dateFrom && pointDate < dateFrom) return false;
                    if (dateTo && pointDate > dateTo) return false;
                    return true;
                  });
                }
                datasets.push({
                  label: history.username,
                  data: filteredPoints.map(point => ({
                    x: new Date(point.date),
                    y: point.elo
                  })),
                  borderColor: color,
                  backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  tension: 0.3,
                  fill: false
                });
              });
              if (charts['elo']) charts['elo'].destroy();
              const ctx = document.getElementById('eloChart').getContext('2d');
              charts['elo'] = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: createChartOptions('Elo Rating Over Time', 'Elo Rating')
              });
            }

            // Update XP Chart
            {
              const datasets = [];
              xpHistories.forEach((history, idx) => {
                if (!selectedPlayerIds.includes(history.playerId)) return;
                const color = getPlayerColor(idx);
                let filteredPoints = history.dataPoints;
                if (dateFrom || dateTo) {
                  filteredPoints = history.dataPoints.filter(point => {
                    const pointDate = new Date(point.date);
                    if (dateFrom && pointDate < dateFrom) return false;
                    if (dateTo && pointDate > dateTo) return false;
                    return true;
                  });
                }
                datasets.push({
                  label: history.username,
                  data: filteredPoints.map(point => ({
                    x: new Date(point.date),
                    y: point.xp
                  })),
                  borderColor: color,
                  backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  tension: 0.3,
                  fill: false
                });
              });
              if (charts['xp']) charts['xp'].destroy();
              const ctx = document.getElementById('xpChart').getContext('2d');
              charts['xp'] = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: createChartOptions('XP Over Time', 'Total XP')
              });
            }

            // Update Vyrážečka Chart
            {
              const datasets = [];
              vyrazeckaHistories.forEach((history, idx) => {
                if (!selectedPlayerIds.includes(history.playerId)) return;
                const color = getPlayerColor(idx);
                let filteredPoints = history.dataPoints;
                if (dateFrom || dateTo) {
                  filteredPoints = history.dataPoints.filter(point => {
                    const pointDate = new Date(point.date);
                    if (dateFrom && pointDate < dateFrom) return false;
                    if (dateTo && pointDate > dateTo) return false;
                    return true;
                  });
                }
                datasets.push({
                  label: history.username,
                  data: filteredPoints.map(point => ({
                    x: new Date(point.date),
                    y: point.vyrazecka
                  })),
                  borderColor: color,
                  backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  tension: 0.3,
                  fill: false
                });
              });
              if (charts['vyrazecka']) charts['vyrazecka'].destroy();
              const ctx = document.getElementById('vyrazeckaChart').getContext('2d');
              charts['vyrazecka'] = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: createChartOptions('Vyrážečka Over Time', 'Vyrážečka Count')
              });
            }

            // Update Games Chart
            {
              const datasets = [];
              gamesHistories.forEach((history, idx) => {
                if (!selectedPlayerIds.includes(history.playerId)) return;
                const color = getPlayerColor(idx);
                let filteredPoints = history.dataPoints;
                if (dateFrom || dateTo) {
                  filteredPoints = history.dataPoints.filter(point => {
                    const pointDate = new Date(point.date);
                    if (dateFrom && pointDate < dateFrom) return false;
                    if (dateTo && pointDate > dateTo) return false;
                    return true;
                  });
                }
                datasets.push({
                  label: history.username,
                  data: filteredPoints.map(point => ({
                    x: new Date(point.date),
                    y: point.games
                  })),
                  borderColor: color,
                  backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  tension: 0.3,
                  fill: false
                });
              });
              if (charts['games']) charts['games'].destroy();
              const ctx = document.getElementById('gamesChart').getContext('2d');
              charts['games'] = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: createChartOptions('Total Games Over Time', 'Games Played')
              });
            }
          }

          function createChartOptions(title, yLabel) {
            return {
              responsive: true,
              maintainAspectRatio: true,
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              },
              plugins: {
                title: {
                  display: true,
                  text: title,
                  color: '#ffffff',
                  font: {
                    size: 18,
                    weight: 'bold',
                    family: 'Orbitron'
                  }
                },
                legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    color: '#ffffff',
                    padding: 15,
                    font: {
                      size: 12
                    }
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(23, 23, 23, 0.9)',
                  titleColor: '#ffffff',
                  bodyColor: '#d4d4d4',
                  borderColor: '#525252',
                  borderWidth: 1,
                  padding: 12,
                  displayColors: true,
                  callbacks: {
                    title: function(context) {
                      return new Date(context[0].parsed.x).toLocaleString();
                    },
                    label: function(context) {
                      return context.dataset.label + ': ' + Math.round(context.parsed.y);
                    }
                  }
                }
              },
              scales: {
                x: {
                  type: 'time',
                  time: {
                    unit: 'day',
                    displayFormats: {
                      day: 'MMM d'
                    }
                  },
                  title: {
                    display: true,
                    text: 'Date',
                    color: '#d4d4d4',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  ticks: {
                    color: '#a3a3a3'
                  },
                  grid: {
                    color: 'rgba(163, 163, 163, 0.1)'
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: yLabel,
                    color: '#d4d4d4',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  ticks: {
                    color: '#a3a3a3'
                  },
                  grid: {
                    color: 'rgba(163, 163, 163, 0.1)'
                  }
                }
              }
            };
          }

          document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const baseDate = new Date('2025-12-01');
            
            document.getElementById('date-to').value = today.toISOString().split('T')[0];
            document.getElementById('date-from').value = baseDate.toISOString().split('T')[0];
            
            updateCharts();

            // Tab switching
            document.querySelectorAll('.graph-tab').forEach(tab => {
              tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-graph-tab');
                
                // Hide all charts and tabs
                document.querySelectorAll('.graph-chart').forEach(chart => {
                  chart.classList.remove('active');
                  chart.classList.add('hidden');
                });
                document.querySelectorAll('.graph-tab').forEach(t => {
                  t.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-blue-700', 'hover:from-blue-700', 'hover:to-blue-800');
                  t.classList.add('bg-neutral-700', 'hover:bg-neutral-600');
                });
                
                // Show selected chart and tab
                document.getElementById(tabName + '-chart').classList.remove('hidden');
                document.getElementById(tabName + '-chart').classList.add('active');
                tab.classList.remove('bg-neutral-700', 'hover:bg-neutral-600');
                tab.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-blue-700', 'hover:from-blue-700', 'hover:to-blue-800');
                
                currentTab = tabName;
              });
            });

            document.querySelectorAll('#player-checkboxes input[type="checkbox"]').forEach(checkbox => {
              checkbox.addEventListener('change', updateCharts);
            });
            
            document.getElementById('date-from').addEventListener('change', updateCharts);
            document.getElementById('date-to').addEventListener('change', updateCharts);
            
            document.getElementById('reset-dates').addEventListener('click', () => {
              document.getElementById('date-from').value = '';
              document.getElementById('date-to').value = '';
              updateCharts();
            });
          });
        `
      }} />
    </div>
  );
}

// Helper function to get consistent colors for players
function getPlayerColor(index: number): string {
  const colors = [
    'rgb(34, 197, 94)',   // green-500
    'rgb(59, 130, 246)',  // blue-500
    'rgb(239, 68, 68)',   // red-500
    'rgb(245, 158, 11)',  // amber-500
    'rgb(168, 85, 247)',  // purple-500
    'rgb(236, 72, 153)',  // pink-500
    'rgb(20, 184, 166)',  // teal-500
    'rgb(251, 146, 60)',  // orange-500
    'rgb(163, 230, 53)',  // lime-500
    'rgb(14, 165, 233)',  // sky-500
  ];
  return colors[index % colors.length];
}
