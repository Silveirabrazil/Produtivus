// Renderização de tarefas dentro do contêiner correto
function renderTasks() {
	const main = document.querySelector('#main-content');
	if (!main) return;
	main.innerHTML = `
		<div class="tasks-wrap">
			<h2>Tarefas</h2>
			<div class="tasks-list">Nenhuma tarefa encontrada.</div>
		</div>
	`;
}
// Exporte para uso no app.js
window.renderTasks = renderTasks;