// app.js:1 app.js carregado

// Versão 1.1.3

// ===================================================================
// Inicialização do estado global da aplicação
// Isso garante que a variável window.state.tasks exista e seja um array.
// ===================================================================
window.state = window.state || {
    tasks: [],
    // Outros dados do estado da aplicação podem ser adicionados aqui
};

// ===================================================================
// Renderização de tarefas com layout de card e botões estilizados
// ===================================================================
function renderTasks() {
    const main = document.querySelector('#main-content');
    if (!main) return;

    let cardsHtml = '';
    // Verifica se window.state.tasks existe e tem itens
    if (window.state.tasks && Array.isArray(window.state.tasks) && window.state.tasks.length) {
        window.state.tasks.forEach(t => {
            cardsHtml += `
            <div class="card" style="--accent:${t.color||'#c29d67'};max-width:340px;margin:auto;">
                <div class="card-border"></div>
                <div class="card-content">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span class="card-title">${t.title}</span>
                        <span style="color:${t.color||'#c29d67'};font-weight:700;font-size:18px;">${t.progress || '0'}%</span>
                    </div>
                    <div style="margin-top:2px;">${t.desc || ''} <span class="card-progress">Progresso</span></div>
                    <div style="margin-top:8px;font-size:15px;">Início: ${t.start || ''}<br> Término: ${t.end || ''}</div>
                    <a href="#" class="card-details">Ver detalhes</a>
                    <div class="card-btns">
                        <button class="card-btn edit" data-id="${t.id}">Editar</button>
                        <button class="card-btn delete" data-id="${t.id}">Excluir</button>
                        <button class="card-btn complete" data-id="${t.id}">Concluir</button>
                    </div>
                </div>
            </div>
            `;
        });
    } else {
        cardsHtml = `<div class="card" style="max-width:340px;margin:auto;padding:24px 18px 18px 18px;">Nenhuma tarefa encontrada.</div>`;
    }
    
    // Inserir o HTML gerado no contêiner principal
    main.innerHTML = `
        <div class="tasks-wrap center">
            <h2 style="margin-bottom:32px">Tarefas</h2>
            <div class="tasks-list">
                ${cardsHtml}
            </div>
            <button class="btn btn-add-task" style="position:absolute;right:40px;top:40px;">+ Nova tarefa</button>
        </div>
    `;

    // Chamada para adicionar os listeners após a renderização
    addEventListenersToTasks();
}

// ===================================================================
// Função para adicionar listeners aos botões das tarefas
// Isso evita que os listeners sejam adicionados a elementos que ainda não existem
// ===================================================================
function addEventListenersToTasks() {
    // Adicionar listener ao botão de adicionar tarefa
    const addTaskBtn = document.querySelector('.btn-add-task');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            console.log('Botão "Nova tarefa" clicado!');
            // Implemente aqui a lógica para abrir o modal de nova tarefa
        });
    }

    // Adicionar listeners aos botões de tarefas individuais
    document.querySelectorAll('.card-btn.edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.target.dataset.id;
            console.log(`Editar tarefa com ID: ${taskId}`);
            // Implemente aqui a lógica de edição
        });
    });

    document.querySelectorAll('.card-btn.delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.target.dataset.id;
            console.log(`Excluir tarefa com ID: ${taskId}`);
            // Implemente aqui a lógica de exclusão
        });
    });
    
    document.querySelectorAll('.card-btn.complete').forEach(button => {
        button.addEventListener('click', (e) => {
            const taskId = e.target.dataset.id;
            console.log(`Concluir tarefa com ID: ${taskId}`);
            // Implemente aqui a lógica para marcar como concluída
        });
    });
}

// ===================================================================
// Simulação de carregamento de dados (substitua por uma chamada de API)
// ===================================================================
function loadInitialData() {
    // Simulação de tarefas iniciais para o protótipo
    window.state.tasks = [
        {
            id: 1,
            title: 'Tarefa 1: Estudar JavaScript',
            desc: 'Revisar conceitos de escopo e closures.',
            progress: 80,
            color: '#4a90e2',
            start: '2025-08-15',
            end: '2025-08-20',
        },
        {
            id: 2,
            title: 'Tarefa 2: Preparar Apresentação',
            desc: 'Criar slides para a reunião de equipe.',
            progress: 50,
            color: '#50e3c2',
            start: '2025-08-18',
            end: '2025-08-22',
        },
    ];
    // Chame a renderização depois que os dados estiverem prontos
    renderTasks();
}

// ===================================================================
// Evento principal para iniciar a aplicação quando a página carregar
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM totalmente carregado e analisado.');
    loadInitialData();
});

// Exporta a função para o escopo global (opcional, mas útil para testes)
window.renderTasks = renderTasks;