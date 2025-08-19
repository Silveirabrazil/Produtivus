// Versão 1.1.1
// Versão 1.1.2
// Versão 1.1.3
// Renderização de tarefas com layout de card e botões estilizados
function renderTasks() {
    const main = document.querySelector('#main-content');
    if (!main) return;

    // Renderiza todos os cards de tarefas reais
    let cardsHtml = '';
    if (window.state && Array.isArray(window.state.tasks) && window.state.tasks.length) {
        window.state.tasks.forEach(t => {
            cardsHtml += `
            <div class="card card-with-border" style="max-width:340px;margin:auto;padding:0 0 0 0;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.07);margin-bottom:24px;display:flex;overflow:hidden;">
                <div class="card-border" style="width:10px;background:${t.color||'#c29d67'};border-radius:16px 0 0 16px;"></div>
                <div style="flex:1;padding:24px 18px 18px 18px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span class="card-title">${t.title}</span>
                        <span style="color:${t.color||'#c29d67'};font-weight:700;font-size:18px;">${t.progress || '0'}%</span>
                    </div>
                    <div style="margin-top:2px;">${t.desc || ''} <span style="float:right;color:#b1a58a;font-size:15px;">Progresso</span></div>
                    <div style="margin-top:8px;font-size:15px;">Início: ${t.start || ''}<br> Término: ${t.end || ''}</div>
                    <a href="#" style="color:${t.color||'#c29d67'};font-size:15px;margin-top:4px;display:inline-block;">Ver detalhes</a>
                    <div style="display:flex;gap:10px;margin-top:14px;">
                        <button class="btn" style="background:${t.color||'#c29d67'};color:#fff;">Editar</button>
                        <button class="btn btn-danger">Excluir</button>
                        <button class="btn" style="background:#e0e0e0;color:#444;">Concluir</button>
                    </div>
                </div>
            </div>
            `;
        });
    } else {
        cardsHtml = `<div class="card" style="max-width:340px;margin:auto;padding:24px 18px 18px 18px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.07);">Nenhuma tarefa encontrada.</div>`;
    }
    main.innerHTML = `
        <div class="tasks-wrap center">
            <h2 style="margin-bottom:32px">Tarefas</h2>
            <div class="tasks-list">
                ${cardsHtml}
            </div>
            <button class="btn btn-add-task" style="position:absolute;right:40px;top:40px;">+ Nova tarefa</button>
        </div>
    `;
}
window.renderTasks = renderTasks;