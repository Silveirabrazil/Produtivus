// js/modules/tasks/task-modal.js
function qs(s) { return document.querySelector(s); }
const modal = {
    overlay: () => qs('#task-modal-overlay'),
    closeBtn: () => qs('#close-task-modal'),
    form: () => qs('#task-form'),
    subtasksList: () => qs('#subtasks-list'),
    addSubtaskBtn: () => qs('#btn-add-subtask'),
};

let editingTaskId = null;
let subtasks = [];

function openTaskModal(taskId = null) {
    modal.overlay().classList.remove('hidden');
    modal.overlay().setAttribute('aria-hidden', 'false');
    modal.form().reset();
    editingTaskId = taskId;
    subtasks = [];
    modal.subtasksList().innerHTML = '';
    if (taskId) {
        window.getTasks().then(tasks => {
            const task = tasks.find(t => String(t.id) === String(taskId));
            if (task) {
                qs('#task-title').value = task.title || '';
                qs('#task-desc').value = task.description || '';
                qs('#task-color').value = task.color || '#E0B33A';
                qs('#task-start').value = task.start || '';
                qs('#task-end').value = task.end || '';
                subtasks = task.subtasks ? [...task.subtasks] : [];
                renderSubtasks();
                qs('#tm-title').textContent = 'Editar Tarefa';
            }
        });
    } else {
        qs('#tm-title').textContent = 'Nova Tarefa';
    }
}

function closeTaskModal() {
    modal.overlay().classList.add('hidden');
    modal.overlay().setAttribute('aria-hidden', 'true');
    modal.form().reset();
    editingTaskId = null;
    subtasks = [];
    modal.subtasksList().innerHTML = '';
}

function renderSubtasks() {
    modal.subtasksList().innerHTML = '';
    subtasks.forEach((sub, idx) => {
        const line = document.createElement('div');
        line.className = 'subtask-line d-flex align-items-center gap-2 mb-2';
        line.innerHTML = `
            <input type="text" value="${sub.text}" class="form-control form-control-sm subtask-input subtask-text flex-grow-1" data-idx="${idx}">
            <div class="form-check form-check-inline mb-0">
              <input class="form-check-input subtask-done" type="checkbox" ${sub.done ? 'checked' : ''} data-idx="${idx}">
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger btn-delete-subtask" data-idx="${idx}" aria-label="Remover subtarefa">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
        modal.subtasksList().appendChild(line);
    });
}

if (modal.addSubtaskBtn()) {
    modal.addSubtaskBtn().onclick = () => {
        subtasks.push({ text: '', done: false });
        renderSubtasks();
        setTimeout(()=>{
            const last = modal.subtasksList().querySelector('.subtask-input:last-of-type');
            if (last) last.focus();
        }, 10);
    };
}

modal.form().addEventListener('input', (e) => {
    if (e.target.classList.contains('subtask-input')) {
        const idx = e.target.dataset.idx;
        subtasks[idx].text = e.target.value;
    }
    if (e.target.classList.contains('subtask-done')) {
        const idx = e.target.dataset.idx;
        subtasks[idx].done = e.target.checked;
    }
});

modal.subtasksList().addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete-subtask')) {
        const idx = e.target.dataset.idx;
        subtasks.splice(idx, 1);
        renderSubtasks();
    }
});

if (modal.closeBtn()) {
    modal.closeBtn().addEventListener('click', closeTaskModal);
}

/* Submit do formulário é tratado em js/modules/tasks/tasks.js (onTaskFormSubmit)
    para evitar bindings duplicados. Removido listener aqui para prevenir
    múltiplos POSTs ao servidor quando o usuário submete o modal. */

window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
