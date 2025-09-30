// js/pages/dashboard.js
(function() {
    'use strict';

    let mainChart = null;
    let currentTasks = [];

    // Função para buscar dados da API
    async function fetchTasks() {
        try {
            if (typeof window.getTasks === 'function') {
                const internalTasks = await window.getTasks();
                return Array.isArray(internalTasks) ? internalTasks : [];
            }

            const url = window.ProdutivusAPI?.endpoints?.tasks || '/server/api/tasks.php';
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) {
                throw new Error(`API retornou status ${response.status}`);
            }

            const data = await response.json();
            if (data && Array.isArray(data.items)) return data.items;
            if (Array.isArray(data)) return data;
            return [];
        } catch (error) {
            console.error('Erro ao buscar tarefas para o dashboard:', error);
            return [];
        }
    }
    // Parse de data seguro
    function parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            return new Date(dateStr);
        } catch {
            return null;
        }
    }

    // Formatar data pt-BR
    function formatDate(dateStr) {
        const date = parseDate(dateStr);
        return date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';
    }

    function toDayKey(date) {
        if (!(date instanceof Date) || isNaN(date)) return null;
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        const year = normalized.getFullYear();
        const month = String(normalized.getMonth() + 1).padStart(2, '0');
        const day = String(normalized.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getCreationDate(task) {
        if (!task) return null;
        return parseDate(task.created_at) ||
               parseDate(task.creation_date) ||
               parseDate(task.start) ||
               parseDate(task.start_date);
    }

    function getCompletionDate(task) {
        if (!task || !task.done) return null;
        return parseDate(task.completed_at) ||
               parseDate(task.completion_date) ||
               parseDate(task.updated_at) ||
               parseDate(task.end) ||
               parseDate(task.end_date);
    }

    function isWithinLastDays(date, days, reference = new Date()) {
        if (!(date instanceof Date) || isNaN(date)) return false;
        const ref = new Date(reference);
        ref.setHours(0, 0, 0, 0);
        const startWindow = new Date(ref);
        startWindow.setDate(startWindow.getDate() - (days - 1));
        return date >= startWindow && date <= reference;
    }

    // Atualiza KPIs com dados reais
    function updateKPIs(tasks) {
        const openTasks = tasks.filter(t => !t.done).length;
        const doneTasks = tasks.filter(t => t.done).length;
        const nextTask = tasks.filter(t => !t.done && t.end)
                              .sort((a, b) => new Date(a.end) - new Date(b.end))[0];

        console.log('KPIs calculados:', { openTasks, doneTasks, nextTask: nextTask?.title });

        // Atualizar elementos com verificação de existência
        const kpiOpen = document.getElementById('kpi-open');
        const kpiDone = document.getElementById('kpi-done');
        const kpiNext = document.getElementById('kpi-next');
        const kpiStudy = document.getElementById('kpi-study7');

        if (kpiOpen) kpiOpen.textContent = openTasks;
        if (kpiDone) kpiDone.textContent = doneTasks;
        if (kpiNext) kpiNext.textContent = nextTask ? formatDate(nextTask.end) : '-';

        // Estimativa de estudo com base nas tarefas concluídas nos últimos 7 dias
        const now = new Date();
        const doneLast7 = tasks.filter(task => {
            const completionDate = getCompletionDate(task);
            return completionDate && isWithinLastDays(completionDate, 7, now);
        }).length;
        const totalMinutes = doneLast7 * 72; // 1.2h por tarefa concluída
        const studyHours = Math.floor(totalMinutes / 60);
        const studyMinutes = totalMinutes % 60;
        if (kpiStudy) kpiStudy.textContent = `${studyHours}h ${studyMinutes}m`;
    }

    function renderMainChart(tasks) {
        const canvas = document.getElementById('chart-area');
        if (!canvas) {
            console.error('Canvas do gráfico não encontrado!');
            return;
        }

        if (mainChart) mainChart.destroy();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayKeys = [];
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const reference = new Date(today);
            reference.setDate(today.getDate() - i);
            dayKeys.push(toDayKey(reference));
            labels.push(reference.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }));
        }

        const createdData = dayKeys.map(() => 0);
        const completedData = dayKeys.map(() => 0);

        tasks.forEach(task => {
            const creationDate = getCreationDate(task);
            const completionDate = getCompletionDate(task);

            const creationKey = creationDate ? toDayKey(creationDate) : null;
            const completionKey = completionDate ? toDayKey(completionDate) : null;

            if (creationKey) {
                const index = dayKeys.indexOf(creationKey);
                if (index >= 0) createdData[index] += 1;
            }

            if (completionKey) {
                const index = dayKeys.indexOf(completionKey);
                if (index >= 0) completedData[index] += 1;
            }
        });

        const maxValue = Math.max(0, ...createdData, ...completedData);
        const suggestedMax = Math.max(1, Math.ceil(maxValue * 1.2));

        mainChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tarefas Criadas',
                    data: createdData,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#38bdf8',
                    pointBorderColor: '#38bdf8',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }, {
                    label: 'Tarefas Concluídas',
                    data: completedData,
                    borderColor: '#14b8a6',
                    backgroundColor: 'rgba(20, 184, 166, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#14b8a6',
                    pointBorderColor: '#14b8a6',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            color: '#64748b',
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(226, 232, 240, 0.5)' },
                        ticks: {
                            color: '#64748b',
                            font: { size: 11 },
                            stepSize: 1,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        suggestedMax
                    }
                }
            }
        });

        console.debug('Dashboard chart atualizado', { createdData, completedData });
    }

    async function loadAndRender() {
        try {
            const tasks = await fetchTasks();
            currentTasks = tasks;

            updateKPIs(tasks);
            renderMainChart(tasks);

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            // Em caso de erro, usar dados vazios
            updateKPIs([]);
            renderMainChart([]);
        }
    }

    function init() {
        loadAndRender();
        // Recarregar dados a cada 5 minutos
        setInterval(loadAndRender, 5 * 60 * 1000);
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup ao sair da página
    window.addEventListener('beforeunload', function() {
        if (mainChart) mainChart.destroy();
    });

})();
