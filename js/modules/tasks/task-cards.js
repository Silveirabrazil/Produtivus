// v1.0.0 - Última alteração por GitHub Copilot em 22/08/2025
// v1.0.1 - Delegação de eventos para evitar listeners duplicados
// js/modules/tasks/task-cards.js
// Protege campos de texto contra XSS
function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

// Renderiza os cards de tarefas nos containers pendentes/feitas
async function renderCards() {
    const pendentesGrid = document.getElementById('cards-pendentes');
    const feitasGrid = document.getElementById('cards-feitas');
    if (!pendentesGrid || !feitasGrid) return;
    pendentesGrid.innerHTML = '';
    feitasGrid.innerHTML = '';
    let tasks = await window.getTasks();
    if (!Array.isArray(tasks)) tasks = [];
    const pendentes = tasks.filter(t => t && t.done === false);
    const feitas = tasks.filter(t => t && t.done === true);
    pendentes.forEach(task => {
        pendentesGrid.appendChild(createTaskCard(task, false));
    });
    feitas.forEach(task => {
        feitasGrid.appendChild(createTaskCard(task, true));
    });
    addCardListeners();
}
function createTaskCard(task) {
    const card = document.createElement('div');
        // mantém classe custom e adiciona utilitários Bootstrap
        card.className = 'card card-tarefa mb-2';
        card.dataset.id = task.id;
        card.style.setProperty('--card-border-color', task.color || '#c29d67');
    const subtasks = task.subtasks || [];
    const totalSubs = subtasks.length;
    const doneSubs = subtasks.filter(s => s.done).length;
    const mainDone = task.done ? 50 : 0;
    const subsDone = totalSubs ? Math.round((doneSubs/totalSubs)*50) : 0;
    const percent = Math.min(100, mainDone + subsDone);
    const startStr = task.start ? formatDateBR(task.start) : '';
    const endStr = task.end ? formatDateBR(task.end) : '';
                card.innerHTML = `
                        <div class="card-body p-2">
                            <div class="card-row d-flex justify-content-between align-items-center mb-1">
                                <div class="card-title h6 mb-0">${escapeHTML(task.title)}</div>
                                <div class="card-progress small text-muted">${percent}%</div>
                            </div>
                            <div class="card-desc card-text mb-2">${escapeHTML(task.description || task.desc || '')} <span class="card-progresso small text-muted">Progresso</span></div>
                            <div class="card-dates small text-muted mb-2">Inio: <span>${startStr}</span> &nbsp;|&nbsp; Trmino: <span>${endStr}</span></div>
                            <a href="#" class="card-details small">Ver detalhes</a>
                            <div class="card-actions mt-2 d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-outline-secondary btn-edit">Editar</button>
                                <button type="button" class="btn btn-sm btn-outline-danger btn-delete">Excluir</button>
                                <button type="button" class="btn btn-sm btn-primary btn-done">${task.done ? 'Desfazer' : 'Concluir'}</button>
                            </div>
                        </div>
                `;
    return card;
}
function formatDateBR(iso){
    if(!iso) return '';
    const parts = String(iso).split('-');
    if(parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function addCardListeners() {
    const pendentesGrid = document.getElementById('cards-pendentes');
    const feitasGrid = document.getElementById('cards-feitas');
    [pendentesGrid, feitasGrid].forEach(grid => {
        if (!grid) return;
        grid.onclick = async function(e) {
            const btn = e.target.closest('button, a');
            if (!btn) return;
            const card = btn.closest('.card');
            if (!card) return;
            const taskId = card.dataset.id;
            if (btn.classList.contains('btn-edit')) {
                console.log('[btn-edit] Clique em editar, id:', taskId);
                window.openTaskModal(taskId);
            } else if (btn.classList.contains('btn-delete')) {
                console.log('[btn-delete] Clique em excluir, id:', taskId);
                await window.deleteTask(Number(taskId));
            } else if (btn.classList.contains('btn-done')) {
                console.log('[btn-done] Clique em concluir/desfazer, id:', taskId);
                await window.toggleTaskDone(Number(taskId));
            } else if (btn.classList.contains('card-details')) {
                e.preventDefault();
                console.log('[card-details] Clique em ver detalhes, id:', taskId);
                // Aqui pode abrir modal de detalhes ou implementar ação
            }
        };
    });
}
function toggleTaskDone(taskId) {
    // Removido: agora usa API
}
function deleteTask(id) {
    // Removido: agora usa API
}
window.renderCards = renderCards;
