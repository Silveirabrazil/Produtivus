// js/modules/tasks/tasks.js

// Centraliza lógica de manipulação de tarefas
const API_TASKS = '/server/api/tasks.php';
// evita múltiplos envios simultâneos
let isSavingTask = false;

// Função para verificar autenticação com aguardo de inicialização
function getAuthState() {
	try {
		const userData = localStorage.getItem('pv_user');
		if (!userData) return { isLoggedIn: false, user: null };

		const userObj = JSON.parse(userData);
		return {
			isLoggedIn: !!(userObj && userObj.email),
			user: userObj
		};
	} catch {
		return { isLoggedIn: false, user: null };
	}
}

// Aguardar que a verificação de autenticação seja concluída
function waitForAuth(maxWait = 2000) {
	return new Promise((resolve) => {
		const start = Date.now();
		const check = () => {
			const auth = getAuthState();
			// Se encontrou dados de usuário ou passou do tempo limite, resolve
			if (auth.isLoggedIn || (Date.now() - start) > maxWait) {
				resolve(auth);
			} else {
				setTimeout(check, 50);
			}
		};
		check();
	});
}

async function getTasks() {
	return window.safeApiCall(async () => {
		const r = await fetch(API_TASKS, { credentials: 'same-origin' });
		if (!r.ok) {
			if (r.status === 401) {
				showTasksApiError('Sua sessão expirou ou não foi iniciada. Faça login novamente.');
				setTimeout(() => {
					window.safeExecute(() => window.location.href = 'index.html');
				}, 1200);
			}
			throw new Error(`API retornou status ${r.status}`);
		}

		const j = await r.json();
		if (!j || !j.success) {
			throw new Error('Resposta inválida da API');
		}

		// Garantia: deduplicar por id antes de armazenar/retornar
		const items = Array.isArray(j.items) ? j.items : [];
		const map = new Map();
		for (const it of items) {
			if (it && (it.id !== undefined && it.id !== null)) {
				map.set(String(it.id), it);
			}
		}
		const deduped = Array.from(map.values());

		// Cache para fallback
		window.safeExecute(() => {
			localStorage.setItem('pv_tasks_cache', JSON.stringify(deduped));
			localStorage.setItem('pv_tasks', JSON.stringify(deduped));
		});

		return deduped;
	}, {
		endpoint: 'tasks/get',
		maxRetries: 2,
		fallback: (async () => {
			// Fallback: verificar se a API realmente está inacessível
			try {
				const cached = JSON.parse(localStorage.getItem('pv_tasks_cache') || '[]');

				// Só prosseguir se há tarefas em cache
				if (cached.length === 0) return [];

				// Teste rápido: tentar uma verificação real da API antes de assumir que está offline
				try {
					const testResponse = await fetch('/server/api/tasks.php', {
						method: 'GET',
						credentials: 'same-origin',
						signal: AbortSignal.timeout(3000) // timeout de 3s
					});

					if (testResponse.ok) {
						// API está funcionando! Não mostrar mensagem de offline
						console.info('[Tasks] API está funcionando - não mostrando mensagem de offline');
						return cached;
					}
				} catch (testError) {
					console.warn('[Tasks] Teste de API falhou:', testError.message);
				}

				// Verificação robusta de autenticação
				const userData = localStorage.getItem('pv_user');
				let isAuthenticated = false;

				if (userData) {
					try {
						const userObj = JSON.parse(userData);
						isAuthenticated = !!(userObj && userObj.email && userObj.email.includes('@'));
					} catch {}
				}

				// Só mostrar mensagem se API realmente falhou
				const message = isAuthenticated ?
					'Problemas de conexão temporários - usando dados salvos' :
					'Exibindo tarefas salvas localmente (faça login para sincronizar)';

				showTasksApiError(message);
				return cached;
			} catch (e) {
				console.warn('[Tasks] Erro no fallback:', e);
				return [];
			}
		})()
	});
}

function showTasksApiError(message) {
    try {
        // Verificação adicional: não mostrar se usuário acabou de fazer login
        const userData = localStorage.getItem('pv_user');
        if (userData) {
            try {
                const userObj = JSON.parse(userData);
                const loginTime = userObj.login_time || 0;
                const now = Date.now();

                // Se login foi há menos de 10 segundos, não mostrar mensagem de offline
                if ((now - loginTime) < 10000 && message.includes('faça login para sincronizar')) {
                    console.info('[Tasks] Suprimindo mensagem offline - login recente detectado');
                    return;
                }
            } catch {}
        }

        var existing = document.querySelector('.tasks-api-error');
        if (existing) existing.remove();
	var el = document.createElement('div');
	el.className = 'tasks-api-error alert alert-warning d-flex align-items-center';
	el.setAttribute('role','alert');
	el.style.margin = '0.75rem 0';
	el.innerHTML = `<div class="me-2">⚠️</div><div>${message}</div>`;
        var parent = document.getElementById('main-content') || document.body;
        parent.insertBefore(el, parent.firstChild);
    } catch (e) { console.warn('[Tasks] não foi possível inserir aviso de erro no DOM', e); }
}

// small helpers to open/close overlays or Bootstrap modals
function safeShow(target) {
	const el = typeof target === 'string' ? document.getElementById(target) : target;
	if (!el) return;
	// Prefer Bootstrap modal if available
	try {
		if (window.bootstrap && window.bootstrap.Modal && el.classList.contains('modal')) {
			const inst = window.bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static' });
			inst.show();
			return;
		}
	} catch {}
	// Fallback for legacy overlays
	try { el.__pv_prevActive = document.activeElement; } catch(e) { el.__pv_prevActive = null; }
	try { el.classList.remove('hidden'); el.setAttribute('aria-hidden','false'); } catch(e) {}
	try {
		const focusable = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
		if (focusable && typeof focusable.focus === 'function') focusable.focus();
	} catch(e) {}
}
function safeHide(target) {
	const el = typeof target === 'string' ? document.getElementById(target) : target;
	if (!el) return;
	// Prefer Bootstrap modal if available
	try {
		if (window.bootstrap && window.bootstrap.Modal && el.classList.contains('modal')) {
			const inst = window.bootstrap.Modal.getOrCreateInstance(el);
			inst.hide();
			return;
		}
	} catch {}
	// Fallback legacy overlay
	try {
		const active = document.activeElement;
		if (active && el.contains(active)) {
			const prev = el.__pv_prevActive;
			if (prev && document.contains(prev) && !el.contains(prev) && typeof prev.focus === 'function') {
				prev.focus();
			} else if (document && document.body && typeof document.body.focus === 'function') {
				document.body.focus();
			}
		}
	} catch(e) {}
	try { el.classList.add('hidden'); el.setAttribute('aria-hidden','true'); } catch(e) {}
	try { el.__pv_prevActive = null; } catch(e) {}
}


// --- Módulo Tarefas v2.0 ---
// Estrutura: CRUD, renderização, eventos, modal, detalhes
// Compacto, fácil manutenção, pronto para expansão

async function deleteTask(id) {
	console.log('[deleteTask] Tentando excluir tarefa id:', id);
	const resp = await fetch(API_TASKS + '?id=' + encodeURIComponent(id), {
		method: 'DELETE',
		credentials: 'same-origin'
	});
	let result = null;
	try {
		result = await resp.clone().json();
	} catch (e) {
		result = null;
	}
	console.log('[deleteTask] Resposta da API:', resp.status, result);
	if (resp.ok && result?.success) {
		if (typeof window.renderCards === 'function') {
			window.renderCards();
		}
		// notify other modules that tasks changed
		try { window.dispatchEvent(new CustomEvent('pv:tasks-updated')); } catch (e) {}
	} else {
		if (window.pvShowToast) window.pvShowToast('Erro ao excluir tarefa: ' + (result?.message || resp.status), { background:'#b94a4a' });
	}
}

async function toggleTaskDone(id) {
	// Busca tarefa atual para inverter o status
	let tasks = await getTasks();
	const task = tasks.find(t => String(t.id) === String(id));
	if (!task) return;
	await fetch(API_TASKS + '?id=' + encodeURIComponent(id), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify({ done: !task.done })
	});
	if (typeof window.renderCards === 'function') {
		window.renderCards();
	}
	try { window.dispatchEvent(new CustomEvent('pv:tasks-updated')); } catch (e) {}
}

async function addOrEditTask(task, editId = null) {
	if (isSavingTask) {
		console.warn('[addOrEditTask] chamada ignorada: já existe um envio em andamento');
		return;
	}
	if (isSavingTask) {
		console.warn('[addOrEditTask] chamada ignorada: já existe um envio em andamento');
		return false;
	}
	isSavingTask = true;
	const method = editId ? 'PUT' : 'POST';
	// Garante todos os campos esperados pelo backend
	const body = {
		title: task.title || '',
		desc: task.description || '',
		start: task.start || null,
		end: task.end || null,
		color: task.color || null,
		subject_id: task.subject_id || null,
		series_id: task.series_id || null,
		done: typeof task.done === 'boolean' ? task.done : false,
		subtasks: Array.isArray(task.subtasks) ? task.subtasks : []
	};
	// Em PUT, não envie campos vazios para não sobrescrever no banco
	if (editId) {
		if (!task.start) delete body.start;
		if (!task.end) delete body.end;
		if (!task.subject_id) delete body.subject_id;
		if (!task.series_id) delete body.series_id;
	}
	let url = API_TASKS;
	if (editId && !isNaN(Number(editId))) url += '?id=' + Number(editId);
	console.log('[addOrEditTask] Enviando para API:', body, 'URL:', url);
	let resp;
	try {
		resp = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(body)
		});
	} finally {
		isSavingTask = false;
	}
	let result = null;
	try {
		result = await resp.clone().json();
	} catch (e) {
		result = null;
	}
	console.log('[addOrEditTask] Resposta da API:', resp.status, result);
	if (resp.ok && result?.success) {
		// atualiza UI no chamador; retorna sucesso para que o handler feche o modal
		try { window.dispatchEvent(new CustomEvent('pv:tasks-updated')); } catch (e) {}
		return true;
	} else {
		if (window.pvShowToast) {
			const msg = 'Erro ao salvar tarefa: ' + (result?.message || resp.status);
			window.pvShowToast(msg, { background:'#b94a4a' });
			if (resp.status === 500) {
				window.pvShowToast('Dica: rode a migração em /server/api/install_migrate.php?secret=SEU_SECRET para adicionar colunas novas (subject_id).', { background:'#b94a4a', timeout: 5000 });
			}
		}
		return false;
	}
}

window.getTasks = getTasks;
window.deleteTask = deleteTask;
window.toggleTaskDone = toggleTaskDone;
window.addOrEditTask = addOrEditTask;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.showTaskDetails = showTaskDetails;

// --- Renderização dos Cards ---
async function renderCards() {
	const pendentesEl = document.getElementById('cards-pendentes');
	const feitasEl = document.getElementById('cards-feitas');
	if (!pendentesEl || !feitasEl) return;
	// diagnóstico: confirmar execução
	console.info('[Tasks] renderCards chamado');
	pendentesEl.innerHTML = '';
	feitasEl.innerHTML = '';
	let tasks = await getTasks();
	console.info('[Tasks] renderCards: quantidade de tasks recebidas =', Array.isArray(tasks) ? tasks.length : typeof tasks, tasks);
	// dedupe por id para evitar render duplicado ao recarregar
	if (Array.isArray(tasks) && tasks.length > 1) {
		const m = new Map();
		for (const t of tasks) { if (t && (t.id !== undefined && t.id !== null)) m.set(String(t.id), t); }
		tasks = Array.from(m.values());
		console.info('[Tasks] renderCards: após dedupe count=', tasks.length);
	}
	if (!Array.isArray(tasks) || tasks.length === 0) {
		const no1 = document.createElement('div');
	no1.className = 'no-tasks text-muted p-3';
	no1.innerHTML = `<div>Nenhuma tarefa encontrada.</div><div class="mt-2"><button type="button" class="btn btn-primary" id="no-tasks-add">+ Criar primeira tarefa</button></div>`;
		pendentesEl.appendChild(no1);
		const btn = document.getElementById('no-tasks-add');
		if (btn) btn.addEventListener('click', () => openTaskModal());

		const no2 = document.createElement('div');
	no2.className = 'no-tasks-muted text-muted p-3';
		no2.textContent = 'Nenhuma tarefa concluída.';
		feitasEl.appendChild(no2);
		return;
	}

	// carregar subjects uma vez para exibir a matéria
	let subjects = [];
	try { if (window.study && window.study.loadSubjects) subjects = await window.study.loadSubjects(); } catch {}
	const subjMap = new Map();
	subjects.forEach(s => { if (s && (s.id !== undefined && s.id !== null)) subjMap.set(String(s.id), s); });
	const getTaskSubject = (task) => {
		const sid = task && (task.subject_id !== undefined && task.subject_id !== null) ? String(task.subject_id) : '';
		if (sid && subjMap.has(sid)) return subjMap.get(sid);
		try {
			const meta = (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(task.desc || task.description || '') : null;
			const mid = meta && meta.subjectId ? String(meta.subjectId) : '';
			if (mid && subjMap.has(mid)) return subjMap.get(mid);
		} catch {}
		return null;
	};
	const fmtDate = (v) => {
		try {
			if (!v) return '-';
			const s = String(v).trim();
			if (!s || s.startsWith('0000-00-00')) return '-';
			let d;
			if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) d = new Date(s);
			else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s + 'T00:00:00');
			else d = new Date(s);
			if (isNaN(d)) return '-';
			const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
			const opts = hasTime ? { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' } : { day:'2-digit', month:'2-digit' };
			return new Intl.DateTimeFormat('pt-BR', opts).format(d);
		} catch { return '-'; }
	};

	// Agrupar por série: series_id > um card por série
	const now = new Date();
	const seriesGroups = new Map();
	const singleTasks = [];
	for (const t of tasks) {
		if (t && t.series_id) {
			const key = String(t.series_id);
			if (!seriesGroups.has(key)) seriesGroups.set(key, []);
			seriesGroups.get(key).push(t);
		} else if (t) {
			singleTasks.push(t);
		}
	}

	// Funções auxiliares já definidas acima: getTaskSubject, fmtDate
	// Render série
	let idx = 0;
	for (const [sid, items] of seriesGroups.entries()) {
		const ids = items.map(it => it.id);
		const first = items[0];
		const subj = getTaskSubject(first);
		const subjHtml = subj ? `<div class="card-meta">
			<span class="pill" style="--pill-color:${subj.color||'#365562'}">Matéria: ${subj.name||'—'}</span>
		</div>` : '';
		// período
		const starts = items.map(it => new Date((it.start||'').replace(' ', 'T'))).filter(d=>!isNaN(d));
		const ends = items.map(it => new Date((it.end||'').replace(' ', 'T'))).filter(d=>!isNaN(d));
		const minStart = starts.length ? new Date(Math.min.apply(null, starts)) : null;
		const maxEnd = (ends.length? new Date(Math.max.apply(null, ends)) : (starts.length? new Date(Math.max.apply(null, starts)) : null));
		// próxima ocorrência
		const upcoming = starts.filter(d=> d >= now).sort((a,b)=> a-b)[0] || null;
		// progresso médio simples
		const percentList = items.map(it => {
			const subs = Array.isArray(it.subtasks)?it.subtasks:[];
			const totalSubs = subs.length;
			const doneSubs = totalSubs ? subs.filter(s=>s && s.done).length : 0;
			const mainDone = it.done ? 50 : 0;
			const subsDone = totalSubs ? Math.round((doneSubs/totalSubs)*50) : 0;
			return Math.min(100, mainDone + subsDone);
		});
		const percent = percentList.length ? Math.round(percentList.reduce((a,b)=>a+b,0)/percentList.length) : 0;
		const card = document.createElement('div');
		// manter classe custom e adicionar utilitários Bootstrap
		card.className = 'card card-tarefa card-series mb-2';
		card.classList.add('enter');
		card.dataset.id = first.id; // referência
		card.dataset.seriesId = sid;
		card.dataset.seriesIds = ids.join(',');
		card.style.setProperty('--card-border-color', first.color || '#c29d67');
		const periodoStr = `${minStart?fmtDate(minStart.toISOString()):'-'} — ${maxEnd?fmtDate(maxEnd.toISOString()):'-'}`;
		const proxStr = upcoming? fmtDate(upcoming.toISOString()) : '-';
		card.innerHTML = `
			<div class="card-body p-2">
			  <div class="card-row d-flex justify-content-between align-items-center mb-1">
				<div class="card-title h6 mb-0">${first.title} <span class="title-suffix small text-muted">(S rie   ${items.length})</span></div>
				<div class="card-progress small text-muted">${percent}%</div>
			  </div>
			  ${subjHtml}
			  <div class="card-desc mb-2">${(function(){ try { return (window.study && window.study.stripStudyMetaFromDesc) ? window.study.stripStudyMetaFromDesc(first.desc||first.description||'') : (first.desc||''); } catch { return first.desc||''; } })()}</div>
			  <div class="card-dates small text-muted mb-2"><span>Per odo: ${periodoStr}</span> | <span>Pr xima: ${proxStr}</span></div>
			  <div class="card-actions d-flex gap-2">
				<button type="button" class="btn btn-sm btn-primary btn-done" title="Concluir">${first.done? 'Desfazer':'Concluir'}</button>
				<button type="button" class="btn btn-sm btn-outline-secondary btn-edit" title="Editar">✎</button>
				<button type="button" class="btn btn-sm btn-outline-danger btn-delete" title="Excluir">🗑</button>
			  </div>
			</div>
		`;
		if (first.done) { feitasEl.appendChild(card); } else { pendentesEl.appendChild(card); }
		idx++;
	}

	// Render tarefas avulsas
	singleTasks.forEach((task, i) => {
		// Detecta Aula (tem schedule no meta)
		let isLesson = false, lessonInfo = null;
		try {
			const meta = window.study?.parseStudyMetaFromDesc?.(task.desc || task.description || '');
			if (meta && meta.schedule && Array.isArray(meta.schedule.weekdays)) { isLesson = true; lessonInfo = meta; }
		} catch {}
		const card = document.createElement('div');
		card.className = 'card card-tarefa' + (isLesson? ' card-lesson' : '');
		// marcar para animação de entrada
		card.classList.add('enter');
		card.dataset.id = task.id;
		// calcular percentual com base em subtasks + flag done
		const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
		const totalSubs = subtasks.length;
		const doneSubs = totalSubs ? subtasks.filter(s => s && s.done).length : 0;
		const mainDone = task.done ? 50 : 0; // regra: tarefa concluída conta 50%
		const subsDone = totalSubs ? Math.round((doneSubs / totalSubs) * 50) : 0;
		const percent = Math.min(100, mainDone + subsDone);
		card.style.setProperty('--card-border-color', task.color || '#c29d67');
		const subj = getTaskSubject(task);
		const subjHtml = subj ? `<div class="card-meta">
			<span class="pill" style="--pill-color:${subj.color||'#365562'}">Matéria: ${subj.name||'—'}</span>
		</div>` : '';
		const startStr = fmtDate(task.start);
		const endStr = fmtDate(task.end);
		const scheduleHtml = (function(){
			if (!isLesson || !lessonInfo) return '';
			const sc = lessonInfo.schedule || {};
			const dias = Array.isArray(sc.weekdays) ? sc.weekdays.slice().sort() : [];
			const map = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
			const diasStr = dias.map(d=>map[d]||d).join(', ');
			const periodo = `${(sc.startDate||'-')} — ${(sc.endDate||'-')}`;
			const horas = `${(sc.time||'--:--')}${sc.endTime? ' — '+sc.endTime : ''}`;
			return `<div class="card-lesson-schedule small">Período: ${periodo} • Dias: ${diasStr} • Horário: ${horas}</div>`;
		})();
		card.innerHTML = `
				<div class="card-body p-2">
				  <div class="card-row d-flex justify-content-between align-items-center mb-1">
					<div class="card-title h6 mb-0">${task.title}${isLesson? ' <span class="title-suffix small text-muted">(Aula)</span>' : ''}</div>
					<div class="card-progress small text-muted">${percent}%</div>
				  </div>
				  ${subjHtml}
				  ${scheduleHtml}
				  <div class="card-desc mb-2">${(function(){ try { return (window.study && window.study.stripStudyMetaFromDesc) ? window.study.stripStudyMetaFromDesc(task.desc||task.description||'') : (task.desc||''); } catch { return task.desc||''; } })()}</div>
				  <div class="card-dates small text-muted mb-2"><span>In cio: ${startStr}</span> | <span>Fim: ${endStr}</span></div>
				  <div class="card-details small mb-2">${task.details||''}</div>
				  <div class="card-actions d-flex gap-2">
					<button type="button" class="btn btn-sm btn-primary btn-done" title="Concluir">${task.done? 'Desfazer':'Concluir'}</button>
					<button type="button" class="btn btn-sm btn-outline-secondary btn-edit" title="Editar">✎</button>
					<button type="button" class="btn btn-sm btn-outline-danger btn-delete" title="Excluir">🗑</button>
				  </div>
				</div>
			`;
		if (task.done) { feitasEl.appendChild(card); console.info('[Tasks] renderCards: adicionou card feita idx=', (idx+i), 'id=', task.id); }
		else { pendentesEl.appendChild(card); console.info('[Tasks] renderCards: adicionou card pendente idx=', (idx+i), 'id=', task.id); }
	});

	// remove classe .enter após animação para não acumular classes
	setTimeout(() => {
		document.querySelectorAll('.card-tarefa.enter').forEach(c => c.classList.remove('enter'));
	}, 520);

	// aplicar sizing inicial dos cards
	syncCardFontSizing();
}

window.renderCards = renderCards;

// Ajuste responsivo: sincroniza font-size do cartão com sua altura para que
// unidades em (usadas no SCSS interno) escalem proporcionalmente.
function syncCardFontSizing() {
	try {
		const cards = document.querySelectorAll('.card-tarefa');
		const referenceHeight = 160; // px -> altura de referência que mapeia para font-size base
		const baseRem = 1.375; // rem original usado como base no SCSS
		cards.forEach(card => {
			// Só aplica se explicitamente habilitado no DOM para evitar escrever em element.style por padrão
			const allow = card.hasAttribute('data-auto-font');
			if (!allow) return;
			// Não sobrescrever variáveis já definidas
			const hasFontVar = (card.style.getPropertyValue('--card-font') || '').trim() !== '';
			const hasHeightVar = (card.style.getPropertyValue('--card-height') || '').trim() !== '';
			const h = card.clientHeight || referenceHeight;
			const scale = Math.max(0.6, Math.min(1.6, h / referenceHeight));
			const computedFont = (baseRem * scale).toFixed(3) + 'rem';
			if (!hasFontVar) card.style.setProperty('--card-font', computedFont);
			if (!hasHeightVar) card.style.setProperty('--card-height', h + 'px');
		});
	} catch (e) {
		console.warn('[Tasks] syncCardFontSizing falhou', e);
	}
}

// observer para atualizar tamanhos dinamicamente quando o container mudar
if (typeof ResizeObserver !== 'undefined') {
	const ro = new ResizeObserver(entries => {
		// recalcula para todos - simples e seguro
		syncCardFontSizing();
	});
	// observar o wrapper das listas para reagir a mudanças de layout
	document.addEventListener('DOMContentLoaded', () => {
		const wrap1 = document.getElementById('cards-pendentes');
		const wrap2 = document.getElementById('cards-feitas');
		if (wrap1) ro.observe(wrap1);
		if (wrap2) ro.observe(wrap2);
	});
}

// --- Delegação de Eventos dos Cards e Botão Nova Tarefa ---
document.addEventListener('DOMContentLoaded', () => {
	const pendentesEl = document.getElementById('cards-pendentes');
	const feitasEl = document.getElementById('cards-feitas');
	[pendentesEl, feitasEl].forEach(container => {
		if (!container) return;
		container.addEventListener('click', e => {
			const card = e.target.closest('.card-tarefa');
			if (!card) return;
			const id = card.dataset.id;
				const isLessonCard = card.classList.contains('card-lesson');
			const seriesId = card.dataset.seriesId || '';
			if (e.target.classList.contains('btn-delete')) {
				(async ()=>{
					if (seriesId) {
						const ok = window.pvShowConfirm ? await window.pvShowConfirm('Excluir TODAS as aulas desta série?') : confirm('Excluir TODAS as aulas desta série?');
						if (!ok) return;
						// deletar todas as ids listadas no card
						const ids = (card.dataset.seriesIds||'').split(',').filter(Boolean);
						for (const tid of ids) { try { await deleteTask(tid); } catch{} }
					} else {
						const ok = window.pvShowConfirm ? await window.pvShowConfirm('Excluir esta tarefa?') : confirm('Excluir esta tarefa?'); if (ok) deleteTask(id);
					}
				})();
			} else if (e.target.classList.contains('btn-done')) {
				toggleTaskDone(id);
			} else if (e.target.classList.contains('btn-edit')) {
				if (isLessonCard) openLessonModal(id); else openTaskModal(id);
			} else if (isLessonCard && !e.target.closest('.card-actions')) {
				// Clique no corpo do card de Aula abre detalhes de visualização
				showTaskDetails(id);
			}
		});
	});
	// Botão Nova Tarefa
	const btnAdd = document.getElementById('btn-add-task');
	if (btnAdd) btnAdd.addEventListener('click', () => openTaskModal());

	// Aguardar autenticação antes de renderizar
	setTimeout(async () => {
		try {
			await waitForAuth(1500); // aguarda até 1.5s
			renderCards();
		} catch {
			renderCards(); // fallback em caso de erro
		}
	}, 200); // pequeno delay para dar tempo da autenticação se estabelecer

	// --- Modal/setup adicional (consolidado) ---
	const closeBtn = document.getElementById('close-task-modal');
	if (closeBtn) {
		closeBtn.style.fontSize = '1.2rem'; // diminuído 40% (era 2rem)
		closeBtn.style.padding = '0.3rem'; // diminuído 40% (era 0.5rem)
		closeBtn.addEventListener('click', closeTaskModal);
	}
	// Bootstrap já gerencia backdrop; não é necessário listener de overlay
	const form = document.getElementById('task-form');
	if (form) {
		// Replace form node to remove any inline handlers, then bind submit once.
		const cloned = form.cloneNode(true);
		form.replaceWith(cloned);
		const newForm = document.getElementById('task-form');
		if (newForm && !newForm._taskFormBound) {
			// Primeiro injeta bloco de Campos Avançados (estilo Outlook)
			try { injectAdvancedFields(newForm); } catch(e) { console.debug('[Tasks] advanced fields inject skipped', e); }
			// Depois injeta Curso/Matéria dentro do bloco de recorrência
			try {
				if (window.study && typeof window.study.loadCourses === 'function') {
					injectStudyFields(newForm);
				}
			} catch(e) { console.debug('[Tasks] study fields inject skipped', e); }
			newForm.addEventListener('submit', onTaskFormSubmit);
			// mark as bound to avoid duplicate bindings if script runs again
			newForm._taskFormBound = true;
			try { bindValidationLive(newForm); } catch(e) { /* no-op */ }
		}
	}
	// Subtasks: botão de adicionar linha
	const btnAddSub = document.getElementById('btn-add-subtask');
	if (btnAddSub) btnAddSub.addEventListener('click', function() { addSubtaskRow(); });

	// --- Modal de Aulas (separado) ---
	const lessonForm = document.getElementById('lesson-form');
	const btnOpenLesson = document.getElementById('btn-add-lesson');
	const btnCloseLesson = document.getElementById('close-lesson-modal');
	if (btnOpenLesson && lessonForm) {
		btnOpenLesson.addEventListener('click', async () => {
			try {
				lessonForm.reset();
				lessonForm.dataset.editId = '';
				await setupLessonStudyFields(lessonForm);
				safeShow('lessonModal');
				setTimeout(()=>{ try { document.getElementById('lesson-title')?.focus(); } catch{} }, 0);
			} catch(e) { console.warn('[Lessons] open failed', e); }
		});
	}
	if (btnCloseLesson) {
		btnCloseLesson.addEventListener('click', () => { safeHide('lessonModal'); });
	}
	if (lessonForm) {
		lessonForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const ok = await onLessonFormSubmit(lessonForm);
			if (ok) { safeHide('lessonModal'); try { window.renderCards(); } catch{} }
		});
	}
});

	// Utilitário: normaliza string para valor aceitável em <input type="datetime-local">
	function toDatetimeLocalValue(v) {
		try {
			if (!v) return '';
			if (typeof v !== 'string') v = String(v);
			v = v.trim();
			if (!v) return '';
			// valores inválidos comuns vindos do backend
			if (v === '0000-00-00' || v.startsWith('0000-00-00')) return '';
			// apenas data -> adiciona meia-noite
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v + 'T00:00';
			// formatos "YYYY-MM-DD HH:mm(:ss)?" ou "YYYY-MM-DDTHH:mm(:ss)?"
			const m = v.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/);
			if (m) return m[1] + 'T' + m[2];
			// tenta parsear data genérica
			const d = new Date(v);
			if (!isNaN(d.getTime())) {
				const yyyy = d.getFullYear();
				const mm = String(d.getMonth()+1).padStart(2,'0');
				const dd = String(d.getDate()).padStart(2,'0');
				const hh = String(d.getHours()).padStart(2,'0');
				const mi = String(d.getMinutes()).padStart(2,'0');
				return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
			}
			return '';
		} catch { return ''; }
	}

	// --- Modal de Tarefa ---
	function openTaskModal(editId = null, prefill = null) {
		const form = document.getElementById('task-form');
		if (!form) return;
		form.reset();
		form.dataset.editId = editId || '';
		// If prefill object provided, set fields after reset
		if (prefill && typeof prefill === 'object') {
			try {
				if (prefill.start) { const el = form.querySelector('#task-start'); if (el) el.value = toDatetimeLocalValue(prefill.start); }
				if (prefill.end) { const el = form.querySelector('#task-end'); if (el) el.value = toDatetimeLocalValue(prefill.end); }
				if (prefill.title) { const el = form.querySelector('#task-title'); if (el) el.value = prefill.title; }
				if (prefill.color) { const el = form.querySelector('#task-color'); if (el) el.value = prefill.color; }
			} catch (e) { /* ignore missing elements */ }
		}
		// limpar campos avançados
		try { prefillAdvancedFields(form, null); } catch{}
		if (editId) {
			getTasks().then(tasks => {
				const t = tasks.find(t => String(t.id) === String(editId));
				if (t) {
					const eTitle = form.querySelector('#task-title'); if (eTitle) eTitle.value = t.title || '';
					const eColor = form.querySelector('#task-color'); if (eColor) eColor.value = t.color || '#E0B33A';
					const eStart = form.querySelector('#task-start'); if (eStart) eStart.value = toDatetimeLocalValue(t.start || '');
					const eEnd = form.querySelector('#task-end'); if (eEnd) eEnd.value = toDatetimeLocalValue(t.end || '');
					const eDesc = form.querySelector('#task-desc'); if (eDesc) {
						try {
							const clean = (window.study && window.study.stripStudyMetaFromDesc) ? window.study.stripStudyMetaFromDesc(t.desc || t.description || '') : (t.desc || '');
							eDesc.value = clean;
						} catch { eDesc.value = t.desc || ''; }
					}
					// Subtarefas: popular lista
					renderSubtasksInModal(Array.isArray(t.subtasks) ? t.subtasks : []);
					// Campos avançados
					try { prefillAdvancedFields(form, t); } catch{}
					// Marcar recorrência e preencher período/horários/dias caso seja uma série
					try {
						const recurToggle = form.querySelector('#task-recur-enable');
						const recurFields = form.querySelector('#task-recur-fields');
						if (recurToggle && recurFields && t.series_id) {
							recurToggle.checked = true; recurFields.style.display = 'block';
							form.dataset.seriesId = String(t.series_id);
							// Derivar período e dias da série
							const same = tasks.filter(x => String(x.series_id||'') === String(t.series_id));
							const starts = same.map(it => new Date(String(it.start||'').replace(' ','T'))).filter(d=>!isNaN(d));
							const ends   = same.map(it => new Date(String(it.end||'').replace(' ','T'))).filter(d=>!isNaN(d));
							const minStart = starts.length ? new Date(Math.min.apply(null, starts)) : null;
							const maxStart = starts.length ? new Date(Math.max.apply(null, starts)) : null;
							// horário padrão do item em edição
							const editStart = t.start ? new Date(String(t.start).replace(' ','T')) : null;
							const hhmm = editStart && !isNaN(editStart) ? `${String(editStart.getHours()).padStart(2,'0')}:${String(editStart.getMinutes()).padStart(2,'0')}` : '';
							const editEnd = t.end ? new Date(String(t.end).replace(' ','T')) : null;
							const hhmm2 = (editEnd && !isNaN(editEnd)) ? `${String(editEnd.getHours()).padStart(2,'0')}:${String(editEnd.getMinutes()).padStart(2,'0')}` : '';
							// Dias da semana presentes na série
							const dows = new Set(starts.map(d=>d.getDay()));
							// Preencher campos
							const sdEl = form.querySelector('#task-recur-start-date');
							const edEl = form.querySelector('#task-recur-end-date');
							const t1El = form.querySelector('#task-recur-time');
							const t2El = form.querySelector('#task-recur-end-time');
							if (sdEl && minStart) sdEl.value = `${minStart.getFullYear()}-${String(minStart.getMonth()+1).padStart(2,'0')}-${String(minStart.getDate()).padStart(2,'0')}`;
							// usar último dia com aula como término se não houver end explícito
							const lastDate = (ends.length ? new Date(Math.max.apply(null, ends)) : (maxStart || null));
							if (edEl && lastDate) edEl.value = `${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2,'0')}-${String(lastDate.getDate()).padStart(2,'0')}`;
							if (t1El && hhmm) t1El.value = hhmm;
							if (t2El && hhmm2) t2El.value = hhmm2;
							form.querySelectorAll('#task-recur-fields [data-dow]').forEach(chk => {
								const v = Number(chk.getAttribute('data-dow'));
								chk.checked = dows.has(v);
							});
						}
					} catch{}
					// Selecionar curso/matéria se possível
					try {
						const meta = (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(t.desc || t.description || '') : null;
						const subjectId = (t.subject_id ? String(t.subject_id) : null) || (meta && meta.subjectId ? String(meta.subjectId) : null);
						if (subjectId && typeof form._setCourseAndSubject === 'function') {
							form._setCourseAndSubject('', subjectId);
						}
						if (meta && meta.estimatedMinutes) {
							const dur = form.querySelector('#task-duration');
							if (dur) dur.value = String(meta.estimatedMinutes);
						}
					} catch(e) { /* ignore */ }
				}
			});
			document.getElementById('tm-title').textContent = 'Editar Tarefa';
		} else {
			document.getElementById('tm-title').textContent = 'Nova Tarefa';
			// limpar subtasks area quando criando nova
			renderSubtasksInModal([]);
			try { prefillAdvancedFields(form, null); } catch{}
		}
		// abrir modal Bootstrap
		safeShow('taskModal');
		// focar primeiro campo para evitar que foco reste em elementos ocultos
		setTimeout(() => { try { const first = form.querySelector('#task-title'); if (first) first.focus(); } catch {} }, 0);
	}

	function closeTaskModal() {
		safeHide('taskModal');
		// opcional: retornar foco para um ponto seguro
		setTimeout(() => { try { const fallback = document.getElementById('btn-add-task') || document.body; if (fallback && fallback.focus) fallback.focus(); } catch {} }, 0);
	}

	async function onTaskFormSubmit(e) {
		e.preventDefault();
			const form = e.target;
			// defensive: prevent concurrent submits from multiple rapid clicks or duplicate listeners
			if (form.dataset.submitting === '1') return;
			form.dataset.submitting = '1';
			// validação antes de montar payload
			const v = validateTaskForm(form);
			if (!v.ok) {
				form.dataset.submitting = '';
				return;
			}
		const editId = form.dataset.editId || null;
		// coletar subtarefas do DOM
		const subtasksContainer = document.getElementById('subtasks-list');
		const subs = [];
		if (subtasksContainer) {
			const rows = subtasksContainer.querySelectorAll('.subtask-row');
			rows.forEach(r => {
				const txt = r.querySelector('input[type="text"]');
				const chk = r.querySelector('input[type="checkbox"]');
				if (txt) {
					subs.push({ id: r.dataset.id || null, text: txt.value || '', done: !!(chk && chk.checked) });
				}
			});
		}
		const getVal = (sel) => { const el = form.querySelector(sel); return el ? el.value : ''; };
		const descVal = getVal('#task-desc') || (form.elements['description'] ? form.elements['description'].value : '');
		const adv = readAdvancedFields(form);
		const task = {
			title: getVal('#task-title'),
			color: getVal('#task-color'),
			start: getVal('#task-start'),
			end: getVal('#task-end'),
			description: buildStudyDescription(form, descVal),
			subject_id: (form.querySelector('#task-subject') && form.querySelector('#task-subject').value) ? form.querySelector('#task-subject').value : null,
			series_id: form.dataset.seriesId ? Number(form.dataset.seriesId) : null,
			subtasks: subs,
			// advanced fields
			location: adv.location || null,
			reminder_minutes: adv.reminder || null,
			is_private: adv.isPrivate || false,
			meta: adv.meta || null
		};
		const submitBtn = form.querySelector('button[type="submit"]');
		if (submitBtn) submitBtn.disabled = true;
		let success = false;
		try {
			// Detectar criação recorrente (aula)
			const recurEnabled = !!form.querySelector('#task-recur-enable:checked');
			if (recurEnabled && !editId) {
				const occ = buildOccurrencesFromForm(form);
				if (occ.error) {
					if (window.pvShowToast) window.pvShowToast(occ.error, { background:'#b94a4a' });
				} else if (occ.datetimes && occ.datetimes.length) {
					// confirmação se forem muitas ocorrências
					let proceed = true;
					if (occ.datetimes.length > 60) {
						proceed = await (window.pvShowConfirm ? window.pvShowConfirm(`Isso criará ${occ.datetimes.length} aulas. Deseja continuar?`) : confirm(`Isso criará ${occ.datetimes.length} aulas. Deseja continuar?`));
					}
					if (proceed) {
						const base = { ...task };
						// limpar start/end do base; serão atribuídos por ocorrência
						delete base.start; delete base.end;
						success = await addTasksBatch(base, occ.datetimes);
					}
				}
			} else {
				// comum: criar/editar única tarefa
				success = await addOrEditTask(task, editId);
			}
		} finally {
			if (submitBtn) submitBtn.disabled = false;
			delete form.dataset.submitting;
		}
		if (success) {
			closeTaskModal();
			if (typeof window.renderCards === 'function') window.renderCards();
		} else {
			if (window.pvShowToast) window.pvShowToast('Não foi possível salvar a tarefa. Verifique os campos obrigatórios ou tente novamente.', { background:'#b94a4a' });
		}
	}

// Helpers para subtasks no modal
function addSubtaskRow(text = '', done = false, id = null) {
    const container = document.getElementById('subtasks-list');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'subtask-row';
    if (id) row.dataset.id = String(id);
    row.innerHTML = `
        <label style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
            <input type="checkbox" class="subtask-done" ${done ? 'checked' : ''} />
            <input type="text" class="subtask-text" value="${String(text).replace(/"/g,'&quot;')}" placeholder="Descrição da subtarefa" style="flex:1; padding:0.45rem; border-radius:6px; border:1px solid rgba(0,0,0,0.06);" />
            <button type="button" class="btn btn-delete subtask-remove" title="Remover">✕</button>
        </label>
    `;
    container.appendChild(row);
    const removeBtn = row.querySelector('.subtask-remove');
    if (removeBtn) removeBtn.addEventListener('click', () => row.remove());
}

// ---- Campos de Estudo (Matéria/Duração) ----
function injectStudyFields(form){
	try {
		// Agora os campos de Curso/Matéria ficam dentro do bloco Recorrência
		const recurBlock = form.querySelector('#task-recur-fields');
		if (!recurBlock) return; // se não existir, não injeta
		const row = document.createElement('div');
		row.className = 'modal-row';
		row.innerHTML = `
			<div class="field">
				<label for="task-course">Curso</label>
				<div class="course-row d-flex align-items-center gap-2">
					<select id="task-course" name="course" class="flex-grow-1" style="min-width:8rem;"><option value="">-- Selecione --</option></select>
					<button type="button" id="btn-add-course" class="btn" title="Novo curso">+</button>
				</div>
			</div>
			<div class="field">
				<label for="task-subject">Matéria</label>
				<div class="subject-row d-flex align-items-center gap-2">
					<select id="task-subject" name="subject" class="flex-grow-1" style="min-width:8rem;"><option value="">Selecione um curso primeiro…</option></select>
					<button type="button" id="btn-add-subject" class="btn" title="Nova matéria">+</button>
				</div>
			</div>
			<div class="field">
				<label for="task-duration">Duração (min)</label>
				<input type="number" id="task-duration" name="duration" min="0" step="5" placeholder="25">
			</div>
		`;
		recurBlock.insertBefore(row, recurBlock.firstChild);
		// popular matérias (assíncrono)
		const selCourse = form.querySelector('#task-course');
		const selSubject = form.querySelector('#task-subject');
		let cacheCourses = [];
		let cacheSubjects = [];
		async function loadCoursesAndSubjects(){
			try {
				const [courses, subjects] = await Promise.all([
					(window.study && window.study.loadCourses ? window.study.loadCourses() : []),
					[] // subjects serão carregadas sob demanda por curso
				]);
				cacheCourses = Array.isArray(courses) ? courses : [];
				cacheSubjects = []; // vazio até selecionar curso
				selCourse.innerHTML = `<option value="">-- Selecione --</option>` + cacheCourses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
				async function renderSubjects(courseId){
					if (!courseId) { selSubject.innerHTML = `<option value="">Selecione um curso primeiro…</option>`; return; }
					try {
						// buscar apenas matérias do curso selecionado
						const r = await fetch(`/server/api/subjects.php?course_id=${encodeURIComponent(courseId)}`, { credentials:'same-origin' });
						const j = await r.json().catch(()=>null);
						const list = (j && j.success && Array.isArray(j.items)) ? j.items : [];
						cacheSubjects = list;
						selSubject.innerHTML = `<option value="">-- Selecione --</option>` + list.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
					} catch {
						selSubject.innerHTML = `<option value="">-- Selecione --</option>`;
					}
				}
				selCourse.addEventListener('change', () => renderSubjects(selCourse.value));
				// inicia vazio até selecionar curso
				selSubject.innerHTML = `<option value="">Selecione um curso primeiro…</option>`;
				// sinaliza pronto para quem quiser selecionar valores
				try { form.dispatchEvent(new CustomEvent('pv:studyFieldsReady')); } catch {}
			} catch(e) {
				selCourse.innerHTML = `<option value="">-- Selecione --</option>`;
				selSubject.innerHTML = `<option value="">-- Selecione --</option>`;
			}
		}
		// expõe utilitários no form
		form._loadCoursesAndSubjects = loadCoursesAndSubjects;
		form._setCourseAndSubject = (courseId, subjectId) => {
			const waitForSubjectOption = async (sid) => {
				for (let i=0;i<20;i++) { // até ~2s
					await new Promise(r=>setTimeout(r,100));
					if (selSubject && selSubject.querySelector(`option[value="${String(sid)}"]`)) return true;
				}
				return false;
			};
			const apply = async () => {
				let cid = courseId;
				if (!cid && subjectId) {
					let sub = cacheSubjects.find(s => String(s.id)===String(subjectId));
					if (!sub && window.study && window.study.getSubject) { try { sub = await window.study.getSubject(subjectId); } catch {} }
					cid = sub ? (sub.course_id || '') : '';
				}
				if (cid && selCourse) {
					selCourse.value = String(cid);
					selCourse.dispatchEvent(new Event('change'));
					if (subjectId && selSubject) {
						const ok = await waitForSubjectOption(subjectId);
						if (ok) selSubject.value = String(subjectId);
					}
				}
			};
			if (!cacheSubjects.length && !cacheCourses.length) {
				form.addEventListener('pv:studyFieldsReady', () => { apply(); }, { once: true });
				try { loadCoursesAndSubjects(); } catch {}
			} else {
				apply();
			}
		};
		loadCoursesAndSubjects();
		const btnAddSubj = form.querySelector('#btn-add-subject');
		if (btnAddSubj) btnAddSubj.addEventListener('click', async () => {
			const name = window.pvShowPrompt ? await window.pvShowPrompt('Nome da matéria:', '') : prompt('Nome da matéria:');
			if (!name) return;
			let color = '#365562';
			try { color = window.pvShowPrompt ? (await window.pvShowPrompt('Cor (hex, opcional):', '#365562')) || '#365562' : (prompt('Cor (hex, opcional):', '#365562') || '#365562'); } catch{}
			try {
				if (window.study && window.study.addSubject) {
					const id = await window.study.addSubject(name, color, form.querySelector('#task-course')?.value || undefined);
					await loadCoursesAndSubjects();
					selSubject.value = id;
				}
			} catch(e) { (window.pvShowToast||((m)=>alert(m)))('Não foi possível criar a matéria.'); }
		});
		const btnAddCourse = form.querySelector('#btn-add-course');
		if (btnAddCourse) btnAddCourse.addEventListener('click', async ()=>{
			const name = window.pvShowPrompt ? await window.pvShowPrompt('Nome do curso:', '') : prompt('Nome do curso:'); if (!name) return;
			let color = '#365562'; try { color = window.pvShowPrompt ? (await window.pvShowPrompt('Cor (hex, opcional):', '#365562')) || '#365562' : (prompt('Cor (hex, opcional):', '#365562') || '#365562'); } catch{}
			try {
				if (window.study && window.study.addCourse) {
					const id = await window.study.addCourse(name, color);
					// recarrega listas
					const selC = form.querySelector('#task-course');
					if (id && selC) { await loadCoursesAndSubjects(); selC.value = id; selC.dispatchEvent(new Event('change')); }
				}
			} catch(e) { (window.pvShowToast||((m)=>alert(m)))('Não foi possível criar o curso.'); }
		});
	} catch(e){ console.warn('[Tasks] injectStudyFields failed', e); }
}

// ---- Campos Avançados (Outlook-like) ----
function injectAdvancedFields(form){
	try {
		// cria seção compacta abaixo de datas
		const anchor = form.querySelector('#task-end')?.closest('.field') || form;
		const wrap = document.createElement('div');
		wrap.className = 'modal-row';
		wrap.innerHTML = `
			<div class="field">
				<label for="task-location">Local</label>
				<input type="text" id="task-location" placeholder="Sala 101, Teams, Google Meet…" />
			</div>
			<div class="field">
				<label for="task-reminder">Lembrete (minutos antes)</label>
				<input type="number" id="task-reminder" min="0" step="5" placeholder="15" />
			</div>
			<div class="field d-flex align-items-center" style="gap:.5rem;">
				<input type="checkbox" id="task-private" />
				<label for="task-private" class="mb-0">Privado</label>
			</div>
		`;
		anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
	} catch(e) { console.debug('[Tasks] injectAdvancedFields failed', e); }
}

function readAdvancedFields(form){
	try {
		const location = form.querySelector('#task-location')?.value?.trim() || '';
		const reminderRaw = form.querySelector('#task-reminder')?.value;
		const reminder = reminderRaw === '' || reminderRaw === null || reminderRaw === undefined ? null : Number(reminderRaw);
		const isPrivate = !!form.querySelector('#task-private')?.checked;
		// espaço para metas: categorias, participantes, reunião online
		const meta = {};
		// no futuro: meta.attendees = [...]; meta.categories = [...]; meta.onlineMeeting = { provider:'teams', url:'...' };
		return { location, reminder, isPrivate, meta: Object.keys(meta).length ? meta : null };
	} catch { return { location:'', reminder:null, isPrivate:false, meta:null }; }
}

function prefillAdvancedFields(form, task){
	try {
		const loc = form.querySelector('#task-location');
		const rem = form.querySelector('#task-reminder');
		const prv = form.querySelector('#task-private');
		if (!task) { if (loc) loc.value=''; if (rem) rem.value=''; if (prv) prv.checked=false; return; }
		if (loc) loc.value = task.location || '';
		if (rem) rem.value = (task.reminder_minutes ?? '') === null ? '' : String(task.reminder_minutes ?? '');
		if (prv) prv.checked = !!task.is_private;
		// meta futura: se houver categorias/attendees/onlineMeeting, poderia popular aqui
	} catch{}
}

// ---- Validação do formulário ----
function clearAllFieldErrors(form){
	form.querySelectorAll('.field-error').forEach(n => n.remove());
	form.querySelectorAll('.has-error').forEach(n => n.classList.remove('has-error'));
	form.querySelectorAll('[aria-invalid="true"]').forEach(n => n.setAttribute('aria-invalid','false'));
}

function showFieldError(el, message){
	const field = el && el.closest ? el.closest('.field') : null;
	if (!field) return;
	field.classList.add('has-error');
	if (el.setAttribute) el.setAttribute('aria-invalid','true');
	const existing = field.querySelector('.field-error');
	if (existing) existing.remove();
	const div = document.createElement('div');
	div.className = 'field-error';
	div.style.cssText = 'margin-top:4px; background:#fff4e5; border:1px solid #f0c070; color:#3b2f0b; padding:6px 8px; border-radius:6px; font-size:0.875rem;';
	div.textContent = message;
	field.appendChild(div);
}

async function onLessonFormSubmit(form) {
	// validar
	const title = form.querySelector('#lesson-title')?.value?.trim();
	const color = form.querySelector('#lesson-color')?.value || '#E0B33A';
	const course = form.querySelector('#lesson-course')?.value;
	const subject = form.querySelector('#lesson-subject')?.value;
	const duration = form.querySelector('#lesson-duration')?.value;
	const occ = buildOccurrencesFromForm(form);
	const errs = [];
	if (!title) errs.push('Título é obrigatório.');
	if (!course) errs.push('Selecione um curso.');
	if (!subject) errs.push('Selecione uma matéria.');
	if (occ.error) errs.push(occ.error);
	if (!occ.datetimes?.length) errs.push('Selecione ao menos um dia no período.');
	if (errs.length) { window.pvShowToast?.(errs[0], { background:'#b94a4a' }); return false; }
	// Montar meta agregando o cronograma inteiro dentro de [[STUDY]]
	const schedule = {
		startDate: form.querySelector('#lesson-start-date')?.value || '',
		endDate: form.querySelector('#lesson-end-date')?.value || '',
		time: form.querySelector('#lesson-time')?.value || '',
		endTime: form.querySelector('#lesson-end-time')?.value || '',
		weekdays: Array.from(form.querySelectorAll('[data-dow]')).filter(x=>x.checked).map(x=> Number(x.getAttribute('data-dow')))
	};
	const meta = { subjectId: subject || null, estimatedMinutes: duration ? Number(duration) : null, schedule };
	const desc = window.study?.buildStudyMetaString?.(meta) || '';
	// Criar/editar UMA tarefa representando a Aula
	const payload = {
		title,
		color,
		description: desc,
		subject_id: subject || null,
		start: schedule.startDate ? schedule.startDate + 'T' + (schedule.time || '00:00') : null,
		end: schedule.endDate ? schedule.endDate + 'T' + (schedule.endTime || schedule.time || '00:00') : null
	};
	const editId = form.dataset.editId ? Number(form.dataset.editId) : null;
	const ok = await addOrEditTask(payload, editId);
	return ok;
}

function buildOccurrencesFromForm(form) {
	try {
		const sd = form.querySelector('#lesson-start-date')?.value || '';
		const ed = form.querySelector('#lesson-end-date')?.value || '';
		const t1 = form.querySelector('#lesson-time')?.value || '';
		const t2 = form.querySelector('#lesson-end-time')?.value || '';
		const checks = Array.from(form.querySelectorAll('[data-dow]')).filter(x => x.checked);
		if (!sd || !ed) return { error: 'Defina o período de início e término.' };
		const startDate = new Date(sd + 'T00:00:00');
		const endDate = new Date(ed + 'T00:00:00');
		if (!(startDate <= endDate)) return { error: 'Período inválido: início deve ser antes do término.' };
		if (checks.length === 0) return { error: 'Selecione ao menos um dia da semana.' };
		if (!t1) return { error: 'Informe o horário de início.' };
		const maxOcc = 400;
		const wanted = new Set(checks.map(c => Number(c.getAttribute('data-dow'))));
		const res = [];
		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)) {
			const dow = d.getDay(); // 0-6
			if (wanted.has(dow)) {
				const yyyy = d.getFullYear();
				const mm = String(d.getMonth()+1).padStart(2,'0');
				const dd = String(d.getDate()).padStart(2,'0');
				const sdt = `${yyyy}-${mm}-${dd}T${t1}`;
				const edt = t2 ? `${yyyy}-${mm}-${dd}T${t2}` : '';
				res.push({ start: sdt, end: edt });
				if (res.length >= maxOcc) break;
			}
		}
		return { datetimes: res };
	} catch (e) {
		return { error: 'Não foi possível gerar as ocorrências.' };
	}
}

async function postTaskRaw(task) {
	// POST direto para não conflitar com flag de isSavingTask
	const body = {
		title: task.title || '',
		desc: task.description || '',
		start: task.start || null,
		end: task.end || null,
		color: task.color || null,
		subject_id: task.subject_id || null,
		series_id: task.series_id || null,
		done: !!task.done,
		subtasks: Array.isArray(task.subtasks) ? task.subtasks : []
	};
	const resp = await fetch(API_TASKS, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	if (!resp.ok) return false;
	const j = await resp.json().catch(()=>null);
	return !!(j && j.success);
}

async function addTasksBatch(baseTask, occurrences) {
	if (!Array.isArray(occurrences) || occurrences.length === 0) return false;
	// gerar um identificador de série para agrupar as ocorrências
	const seriesId = Date.now();
	// Tenta endpoint em lote do backend
	try {
		const body = {
			title: baseTask.title || '',
			desc: baseTask.description || '',
			color: baseTask.color || null,
			subject_id: baseTask.subject_id || null,
			series_id: seriesId,
			occurrences: occurrences.map(o => ({ start: o.start, end: o.end || null }))
		};
		const resp = await fetch(API_TASKS, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(body)
		});
		if (resp.ok) {
			const j = await resp.json().catch(()=>null);
			if (j && j.success) {
				try { const tasks = await getTasks(); localStorage.setItem('pv_tasks', JSON.stringify(tasks)); } catch {}
				if (window.pvShowToast) window.pvShowToast(`Criadas ${j.count||occurrences.length} aulas.`, { background:'#365562' });
				try { window.dispatchEvent(new CustomEvent('pv:tasks-updated')); } catch (e) {}
				return true;
			}
		}
	} catch (e) {
		console.warn('[Tasks] batch endpoint falhou, caindo para criação individual', e);
	}
	// Fallback: criar uma a uma
	let okCount = 0;
	for (const oc of occurrences) {
		const t = { ...baseTask, start: oc.start, end: oc.end || null, series_id: seriesId };
		const ok = await postTaskRaw(t);
		if (!ok) {
			if (window.pvShowToast) window.pvShowToast('Falha ao criar uma das aulas. Processo interrompido.', { background:'#b94a4a' });
			break;
		}
		okCount++;
	}
	try { const tasks = await getTasks(); localStorage.setItem('pv_tasks', JSON.stringify(tasks)); } catch {}
	if (window.pvShowToast) window.pvShowToast(`Criadas ${okCount}/${occurrences.length} aulas.`, { background:'#365562' });
	try { window.dispatchEvent(new CustomEvent('pv:tasks-updated')); } catch (e) {}
	return okCount > 0;
}

// --- Suporte ao modal de Aulas ---
async function setupLessonStudyFields(form) {
	const selCourse = form.querySelector('#lesson-course');
	const selSubject = form.querySelector('#lesson-subject');
	// carrega cursos
	let courses = [];
	try { courses = await (window.study?.loadCourses?.() || []); } catch{}
	selCourse.innerHTML = `<option value="">-- Selecione --</option>` + courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
	const renderSubjects = async (cid) => {
		if (!cid) { selSubject.innerHTML = `<option value="">Selecione um curso…</option>`; return; }
		try {
			const r = await fetch(`/server/api/subjects.php?course_id=${encodeURIComponent(cid)}`, { credentials:'same-origin' });
			const j = await r.json().catch(()=>null);
			const list = (j && j.success && Array.isArray(j.items)) ? j.items : [];
			selSubject.innerHTML = `<option value="">-- Selecione --</option>` + list.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
		} catch { selSubject.innerHTML = `<option value="">-- Selecione --</option>`; }
	};
	selCourse.addEventListener('change', () => renderSubjects(selCourse.value));
	// botões de adicionar curso/matéria rápidos
	form.querySelector('#btn-lesson-add-course')?.addEventListener('click', async ()=>{
		const name = window.pvShowPrompt ? await window.pvShowPrompt('Nome do curso:', '') : prompt('Nome do curso:'); if (!name) return;
		let color = '#365562'; try { color = window.pvShowPrompt ? (await window.pvShowPrompt('Cor (hex, opcional):', '#365562')) || '#365562' : (prompt('Cor (hex, opcional):', '#365562') || '#365562'); } catch{ }
		try { const id = await window.study?.addCourse?.(name, color); if (id) { await setupLessonStudyFields(form); selCourse.value = id; selCourse.dispatchEvent(new Event('change')); } } catch{ (window.pvShowToast||((m)=>alert(m)))('Não foi possível criar o curso.'); }
	});
	form.querySelector('#btn-lesson-add-subject')?.addEventListener('click', async ()=>{
		const name = window.pvShowPrompt ? await window.pvShowPrompt('Nome da matéria:', '') : prompt('Nome da matéria:'); if (!name) return;
		let color = '#365562'; try { color = window.pvShowPrompt ? (await window.pvShowPrompt('Cor (hex, opcional):', '#365562')) || '#365562' : (prompt('Cor (hex, opcional):', '#365562') || '#365562'); } catch{ }
		const cid = selCourse.value || undefined;
		try { const id = await window.study?.addSubject?.(name, color, cid); await renderSubjects(selCourse.value); selSubject.value = id; } catch{ (window.pvShowToast||((m)=>alert(m)))('Não foi possível criar a matéria.'); }
	});
}

async function openLessonModal(editId) {
	const form = document.getElementById('lesson-form');
	if (!form) return;
	form.reset();
	form.dataset.editId = String(editId||'');
	await setupLessonStudyFields(form);
	try {
		const tasks = await getTasks();
		const t = tasks.find(x => String(x.id) === String(editId));
		if (t) {
			form.querySelector('#lesson-title').value = t.title || '';
			form.querySelector('#lesson-color').value = t.color || '#E0B33A';
			// meta
			const meta = window.study?.parseStudyMetaFromDesc?.(t.desc || t.description || '') || {};
			const sid = (t.subject_id ? String(t.subject_id) : '') || (meta.subjectId ? String(meta.subjectId) : '');
			if (sid) {
				try {
					const subj = await window.study?.getSubject?.(sid);
					const cid = subj?.course_id ? String(subj.course_id) : '';
					const selCourse = form.querySelector('#lesson-course');
					const selSubject = form.querySelector('#lesson-subject');
					if (cid) {
						selCourse.value = cid; selCourse.dispatchEvent(new Event('change'));
						// aguardar opções das matérias
						for (let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if (selSubject.querySelector(`option[value="${sid}"]`)) break; }
					}
					selSubject.value = sid;
				} catch {}
			}
			if (meta && meta.estimatedMinutes) {
				const dur = form.querySelector('#lesson-duration'); if (dur) dur.value = String(meta.estimatedMinutes);
			}
			const sc = meta && meta.schedule ? meta.schedule : null;
			if (sc) {
				if (sc.startDate) form.querySelector('#lesson-start-date').value = sc.startDate;
				if (sc.endDate) form.querySelector('#lesson-end-date').value = sc.endDate;
				if (sc.time) form.querySelector('#lesson-time').value = sc.time;
				if (sc.endTime) form.querySelector('#lesson-end-time').value = sc.endTime;
				const dows = new Set(Array.isArray(sc.weekdays) ? sc.weekdays : []);
				form.querySelectorAll('[data-dow]').forEach(chk => { const v = Number(chk.getAttribute('data-dow')); chk.checked = dows.has(v); });
			}
		}
	} catch (e) { console.warn('[Lessons] prefill failed', e); }
	// abrir modal Bootstrap
	safeShow('lessonModal');
	setTimeout(()=>{ try { document.getElementById('lesson-title')?.focus(); } catch{} }, 0);
}

// Expor APIs no escopo global utilizadas por outros módulos/HTML
window.openLessonModal = openLessonModal;

function buildStudyDescription(form, baseDesc){
	try {
		const subj = form.querySelector('#task-subject');
		const dur = form.querySelector('#task-duration');
		const subjectId = subj && subj.value ? subj.value : null;
		const estimatedMinutes = dur && dur.value ? Number(dur.value) : null;
		// sempre remover meta anterior da descrição para evitar reaparecimento
		let desc = baseDesc || '';
		try { if (window.study && window.study.stripStudyMetaFromDesc) desc = window.study.stripStudyMetaFromDesc(desc); } catch {}
		if (subjectId || estimatedMinutes) {
			const meta = { subjectId, estimatedMinutes };
			const tag = (window.study && window.study.buildStudyMetaString) ? window.study.buildStudyMetaString(meta) : '';
			return desc + tag;
		}
		return desc;
	} catch(e){ /* ignore */ }
	return (baseDesc || '');
}

function renderSubtasksInModal(list) {
    const container = document.getElementById('subtasks-list');
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) return;
    list.forEach(s => addSubtaskRow(s.text || '', !!s.done, s.id || null));
}

	// --- Detalhes da Tarefa (modal somente leitura) ---
	function showTaskDetails(id) {
		Promise.resolve(getTasks()).then(async tasks => {
			const t = tasks.find(x => String(x.id) === String(id));
			if (!t) return;
			const modalEl = document.getElementById('taskDetailsModal');
			if (!modalEl) return;
			const titleEl = document.getElementById('td-title');
			const datesEl = document.getElementById('td-dates');
			const nextEl = document.getElementById('td-next');
			const subjEl = document.getElementById('td-subject');
			const courseEl = document.getElementById('td-course');
			const durEl = document.getElementById('td-duration');
			const descEl = document.getElementById('td-desc');
			const subsEl = document.getElementById('td-subtasks');
			const seriesEl = document.getElementById('td-series');
			const schedRow = document.getElementById('td-schedule-row');
			const schedEl = document.getElementById('td-schedule');
			const rowDesc = descEl ? descEl.closest('.modal-row') : null;
			const rowSubs = subsEl ? subsEl.closest('.modal-row') : null;
			const rowSeries = seriesEl ? seriesEl.closest('.modal-row') : null;
			if (titleEl) titleEl.textContent = t.title || 'Detalhes da Tarefa';
			// Série (valor só aparece para tarefas comuns; aulas esconderemos abaixo)
			if (seriesEl) seriesEl.textContent = t.series_id ? String(t.series_id) : '-';
			// Datas (fallback genérico)
			const fmt = (v)=>{ try { if (!v) return '-'; let d = new Date(String(v).replace(' ','T')); if (isNaN(d)) d = new Date(String(v)); if (isNaN(d)) return '-'; const hasTime = d.getHours()||d.getMinutes(); const opts = hasTime? { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' } : { day:'2-digit', month:'2-digit' }; return new Intl.DateTimeFormat('pt-BR', opts).format(d);} catch{return '-';} };
			if (datesEl) datesEl.textContent = `${fmt(t.start)} — ${fmt(t.end)}`;
			if (nextEl) nextEl.textContent = fmt(t.start);
			// Matéria e duração
			try {
				const meta = (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(t.desc || t.description || '') : null;
				const sid = (t.subject_id ? String(t.subject_id) : null) || (meta && meta.subjectId ? String(meta.subjectId) : null);
				let sName = '-';
				let courseName = '-';
				if (sid && window.study && window.study.getSubject) {
					const s = await window.study.getSubject(sid);
					sName = s && s.name ? s.name : sName;
					if (s && s.course_id && window.study.getCourse) {
						try { const c = await window.study.getCourse(String(s.course_id)); courseName = c?.name || courseName; } catch {}
					}
				}
				if (subjEl) subjEl.textContent = sName;
				if (courseEl) courseEl.textContent = courseName;
				if (durEl) durEl.textContent = meta && meta.estimatedMinutes ? `${meta.estimatedMinutes} min` : '-';
				// Cronograma (se existir em meta)
				const sc = meta && meta.schedule ? meta.schedule : null;
				const isLesson = !!(sc && Array.isArray(sc.weekdays) && sc.weekdays.length);
				if (schedRow && schedEl) {
					if (isLesson) {
						const map = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
						const dias = sc.weekdays.slice().sort().map(d => map[d]||d).join(', ');
						const periodo = `${sc.startDate||'-'} — ${sc.endDate||'-'}`;
						const horas = `${sc.time||'--:--'}${sc.endTime? ' — '+sc.endTime : ''}`;
						schedEl.textContent = `Período: ${periodo} • Dias: ${dias} • Horário: ${horas}`;
						schedRow.style.display = '';
						// Ajustar Período/Próxima com base no cronograma
						const pad = n => String(n).padStart(2,'0');
						const fmtDDMMHHMM = (yyyy,mm,dd,hh,mi) => `${pad(dd)}/${pad(mm)}, ${pad(hh)}:${pad(mi)}`;
						const parseYMD = (s) => { const m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; return { y: +m[1], m: +m[2], d: +m[3] }; };
						const sYMD = parseYMD(sc.startDate);
						const eYMD = parseYMD(sc.endDate);
						const [sh, sm] = (sc.time||'00:00').split(':').map(x=>+x);
						const [eh, em] = (sc.endTime||sc.time||'00:00').split(':').map(x=>+x);
						if (datesEl && sYMD && eYMD) {
							datesEl.textContent = `${fmtDDMMHHMM(sYMD.y,sYMD.m,sYMD.d,sh,sm)} — ${fmtDDMMHHMM(eYMD.y,eYMD.m,eYMD.d,eh,em)}`;
						}
						if (nextEl && sYMD && eYMD) {
							const now = new Date();
							const startBoundary = new Date(sYMD.y, sYMD.m-1, sYMD.d, 0, 0, 0, 0);
							const endBoundary = new Date(eYMD.y, eYMD.m-1, eYMD.d, 23, 59, 59, 999);
							let probe = new Date(Math.max(now.getTime(), startBoundary.getTime()));
							for (let i=0;i<370;i++) {
								const dow = probe.getDay();
								if (sc.weekdays.includes(dow)) {
									const occ = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate(), sh, sm, 0, 0);
									if (occ >= now && occ <= endBoundary) { nextEl.textContent = fmtDDMMHHMM(occ.getFullYear(), occ.getMonth()+1, occ.getDate(), occ.getHours(), occ.getMinutes()); break; }
								}
								probe.setDate(probe.getDate()+1);
							}
						}
						// Esconder campos de tarefa comum
						if (rowDesc) { rowDesc.style.display = 'none'; if (descEl) descEl.textContent = ''; }
						if (rowSubs) { rowSubs.style.display = 'none'; if (subsEl) subsEl.innerHTML = ''; }
						if (rowSeries) { rowSeries.style.display = 'none'; if (seriesEl) seriesEl.textContent = ''; }
					} else {
						schedEl.textContent = '-';
						schedRow.style.display = 'none';
						// Mostrar campos comuns de tarefa
						if (rowDesc) rowDesc.style.display = '';
						if (rowSubs) rowSubs.style.display = '';
						if (rowSeries) rowSeries.style.display = '';
					}
				}
			} catch { if (subjEl) subjEl.textContent = '-'; if (durEl) durEl.textContent = '-'; }
			// Descrição limpa
			if (descEl) {
				try { descEl.textContent = (window.study && window.study.stripStudyMetaFromDesc) ? window.study.stripStudyMetaFromDesc(t.desc || t.description || '') : (t.desc || ''); }
				catch { descEl.textContent = t.desc || ''; }
			}
			// Subtarefas
				if (subsEl) {
					subsEl.innerHTML = '';
					(Array.isArray(t.subtasks) ? t.subtasks : []).forEach(s => {
						const li = document.createElement('li');
						li.textContent = `${s.done? '✓ ' : ''}${s.text || ''}`;
						subsEl.appendChild(li);
					});
				}
			// abrir modal Bootstrap
			safeShow('taskDetailsModal');
			setTimeout(()=>{ try { const btn = document.getElementById('close-task-details'); if (btn) btn.focus(); } catch{} }, 0);
			// wire Editar: se for aula (tem schedule), abrir modal de Aulas; senão, modal de tarefa
			try {
				const meta = (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(t.desc || t.description || '') : null;
				const isLesson = !!(meta && meta.schedule && Array.isArray(meta.schedule.weekdays) && meta.schedule.weekdays.length);
				const btnEdit = document.getElementById('td-edit');
				if (btnEdit) {
					btnEdit.onclick = function(){
						try {
							// fecha detalhes antes de abrir edição
							try { safeHide('taskDetailsModal'); } catch {}
							if (isLesson && typeof window.openLessonModal === 'function') window.openLessonModal(id);
							else if (typeof window.openTaskModal === 'function') window.openTaskModal(id);
						} catch(e) {}
					};
				}
			} catch{}
		});
	}

	// Fechar modal de detalhes
	document.addEventListener('DOMContentLoaded', () => {
		const modalEl = document.getElementById('taskDetailsModal');
		const btn = document.getElementById('close-task-details');
		function hideDetails() {
			// use safeHide to restore focus and hide overlay
			try { safeHide('taskDetailsModal'); } catch{}
			setTimeout(()=>{ try { (document.getElementById('btn-add-task') || document.body).focus?.(); } catch{} }, 0);
		}
		if (btn) btn.addEventListener('click', hideDetails);
		// backdrop é gerenciado pelo Bootstrap; sem listener manual
	});

	// Eventos do modal
