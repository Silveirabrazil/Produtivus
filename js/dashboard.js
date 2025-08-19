// Renderização do dashboard dentro do contêiner correto
// Versão 1.1.1
function renderDashboard() {
	const main = document.querySelector('#main-content');
	if (!main) return;
	main.innerHTML = `
		<div class="dashboard-wrap center">
			<h2 style="margin-bottom:32px">Dashboard</h2>
			<div class="dashboard-panel">
				<div class="card" style="max-width:340px;margin:auto;padding:24px 18px 18px 18px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.07);">
					<div style="display:flex;align-items:center;justify-content:space-between;">
						<span class="card-title">Dashboard Card</span>
						<span style="color:#c29d67;font-weight:700;font-size:18px;">0%</span>
					</div>
					<div style="margin-top:2px;">Resumo <span style="float:right;color:#b1a58a;font-size:15px;">Progresso</span></div>
					<div style="margin-top:8px;font-size:15px;">Início:<br> Término:</div>
					<a href="#" style="color:#c29d67;font-size:15px;margin-top:4px;display:inline-block;">Ver detalhes</a>
					<div style="display:flex;gap:10px;margin-top:14px;">
						<button class="btn" style="background:#c29d67;color:#fff;">Editar</button>
						<button class="btn btn-danger">Excluir</button>
						<button class="btn" style="background:#e0e0e0;color:#444;">Concluir</button>
					</div>
				</div>
			</div>
		</div>
	`;
}
// Exporte para uso no app.js
window.renderDashboard = renderDashboard;