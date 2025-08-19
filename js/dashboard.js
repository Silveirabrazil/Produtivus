// Renderização do dashboard dentro do contêiner correto
function renderDashboard() {
	const main = document.querySelector('#main-content');
	if (!main) return;
	main.innerHTML = `
		<div class="dashboard-wrap">
			<h2>Dashboard</h2>
			<div class="dashboard-panel">Painel do dashboard.</div>
		</div>
	`;
}
// Exporte para uso no app.js
window.renderDashboard = renderDashboard;