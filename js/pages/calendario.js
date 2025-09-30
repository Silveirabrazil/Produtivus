// js/pages/calendario.js
// Inicialização dedicada da página Calendário (conteúdo de js/calendar-init.js)

// js/calendar-init.js
// Inicializa o calendário FullCalendar

document.addEventListener('DOMContentLoaded', function () {
	var calendarEl = document.getElementById('fullcalendar');
	if (!calendarEl) {
		console.warn('[FullCalendar] elemento #fullcalendar não encontrado no DOM.');
		return;
	}


	// Helpers de permissão
	function isAdminUser() {
		try {
			const u = JSON.parse(localStorage.getItem('pv_user')||'{}');
			return Boolean(u && (u.isAdmin === true || u.role === 'admin' || u.roles?.includes('admin')));
		} catch { return false; }
	}
	function isDevMode() {
		try{ const p=new URLSearchParams(location.search); return p.get('dev')==='1'; }catch{return false}
	}

	// Removido: integração e configuração do Google Calendar
	// Detect possible legacy calendar renderer (legacy calendar.js uses #cal-grid and exposes window.renderCalendar)
	try {
		var legacyDetected = Boolean(window.renderCalendar || document.getElementById('cal-grid'));
		if (legacyDetected) {
			console.warn('[FullCalendar] detectado um calendário legado (js/calendar.js) nesta página. Ele pode exibir tarefas em cache/local e conflitar com o calendário do FullCalendar.');
			console.info('[FullCalendar] para desativar o renderer legado manualmente execute: window.__pv_disable_legacy_calendar() no console.');
			// expose a helper to allow disabling the legacy renderer and clearing the local cache
			window.__pv_disable_legacy_calendar = function() {
				try {
					if (window.renderCalendar && typeof window.renderCalendar === 'function') {
						window.renderCalendar = function() { /* disabled by calendar-init */ };
						console.info('[FullCalendar] função window.renderCalendar sobrescrita para evitar re-render do calendário legado.');
					}
				} catch(e) { console.warn('Falha ao tentar sobrescrever window.renderCalendar', e); }
				try {
					if (localStorage && localStorage.getItem('pv_tasks')) {
						localStorage.removeItem('pv_tasks');
						console.info('[FullCalendar] chave localStorage "pv_tasks" removida (cache local de tarefas).');
					}
				} catch(e) { /* ignore */ }
			};
		}
	} catch (e) { /* non-fatal */ }
	if (typeof FullCalendar === 'undefined') {
		console.error('[FullCalendar] biblioteca FullCalendar não está carregada. Verifique se js/fullcalendar/core.global.min.js foi incluído.');
		try {
			var wrap = document.createElement('div');
			wrap.className = 'fc-csp-notice';
			wrap.setAttribute('role', 'alert');
			wrap.style.background = '#fff4e5';
			wrap.style.border = '1px solid #f0c070';
			wrap.style.color = '#3b2f0b';
			wrap.style.padding = '0.8rem';
			wrap.style.margin = '0.75rem 0';
			wrap.style.borderRadius = '6px';
			wrap.style.fontSize = '0.95rem';
			wrap.textContent = 'Biblioteca FullCalendar não encontrada. Verifique se os scripts em js/fullcalendar/ foram carregados corretamente.';
			if (calendarEl && calendarEl.parentNode) calendarEl.parentNode.insertBefore(wrap, calendarEl);
			else document.body.insertBefore(wrap, document.body.firstChild);
		} catch (err) { console.warn('[FullCalendar] não foi possível inserir aviso no DOM:', err); }
		return;
	}
	// garantir que os plugins estejam disponíveis (interaction/timeGrid)
	var plugins = [];
	if (FullCalendar.interactionPlugin || (FullCalendar.Draggable && FullCalendar.PointerDragging)) {
		// global builds expõem via interação; a API plugins é mais usada no bundle ES, mas manter referência
		plugins.push('interaction');
	}
	if (FullCalendar.timeGridPlugin || FullCalendar.TimeGridView) {
		plugins.push('timeGrid');
	}

	var calendar = new FullCalendar.Calendar(calendarEl, {
		initialView: 'dayGridMonth',
		locale: 'pt-br',
	selectable: true,
	editable: true,
		// a chave plugins não é obrigatória nos global builds; mantida para compat
		plugins: plugins,
		headerToolbar: {
			left: 'prev,next today',
			center: 'title',
			right: 'dayGridMonth,timeGridWeek,timeGridDay'
		},
		// events will be loaded dynamically from the tasks API
		events: async function(info, successCallback, failureCallback) {
			try {
				// load tasks directly from server API
				const api = location.origin + '/server/api/tasks.php';
				const r = await fetch(api, { credentials: 'same-origin' });
				if (!r.ok) { successCallback([]); return; }
				const j = await r.json().catch(() => null);
				const tasks = (j && j.success && Array.isArray(j.items)) ? j.items : [];
				try { console.debug('[FullCalendar] carregou', Array.isArray(tasks) ? tasks.length : 0, 'tarefas da API', '/server/api/tasks.php'); } catch(e) {}

				// Helpers para Aulas (cronograma [[STUDY]])
				const parseStudy = (t) => {
					try { return (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(t.desc || t.description || '') : null; } catch { return null; }
				};
				const ymdToDate = (s) => { const m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; return new Date(+m[1], +m[2]-1, +m[3], 0, 0, 0, 0); };
				const pad = (n) => String(n).padStart(2,'0');
				const buildIso = (d, hm) => { const [h,mi] = String(hm||'00:00').split(':'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(mi)}:00`; };
				const addMinutesIso = (iso, minutes) => { try { const d = new Date(iso); d.setMinutes(d.getMinutes() + (Number(minutes)||0)); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; } catch { return iso; } };
				const normalizeWeekdayList = (arr) => {
					const a = Array.isArray(arr) ? arr.map(Number) : [];
					// aceitar 0..6 (Dom..Sáb) e 1..7 (Seg..Dom). Mapear todos para 0..6
					return a.map(n => (n>=1 && n<=7) ? (n % 7) : (n>=0 && n<=6 ? n : -1)).filter(n => n>=0);
				};
				const inRangeYMD = (d, start, end) => (!start || d>=start) && (!end || d<=end);

				const evs = [];
				const rangeStart = info.start; // Date
				const rangeEnd = info.end;     // Date

				for (const t of tasks) {
					const meta = parseStudy(t);
					const sch = meta && meta.schedule;
					if (sch && sch.time && Array.isArray(sch.weekdays) && sch.weekdays.length) {
						// Expandir aulas dentro do range visível e do período do cronograma
						const sY = ymdToDate(sch.startDate);
						const eY = ymdToDate(sch.endDate);
						const d0 = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0,0,0,0);
						const d1 = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 0,0,0,0);
						const dows = normalizeWeekdayList(sch.weekdays);
						const durationMin = Number(meta?.estimatedMinutes || 0) || 60; // fallback 60min se não houver endTime
						for (let d = new Date(d0); d < d1; d.setDate(d.getDate()+1)) {
							if (!inRangeYMD(d, sY, eY)) continue;
							const dow = d.getDay();
							if (!dows.includes(dow)) continue;
							const startIso = buildIso(d, sch.time);
							const endIso = sch.endTime ? buildIso(d, sch.endTime) : addMinutesIso(startIso, durationMin);
							const ev = {
								id: `${t.id}:${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
								title: t.title || 'Aula',
								start: startIso,
								end: endIso,
								allDay: false,
								extendedProps: { __task: t, __occurrenceDate: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
							};
							if (t.color) { ev.backgroundColor = t.color; ev.borderColor = t.color; }
							evs.push(ev);
						}
					} else {
						// Tarefa simples (sem cronograma)
						const hasTimeStart = !!String(t.start||'').includes('T');
						const hasTimeEnd = !!String(t.end||'').includes('T');
						const ev = {
							id: String(t.id),
							title: t.title || t.desc || 'Tarefa',
							start: t.start || null,
							end: t.end || null,
							allDay: Boolean(t.allDay || ((t.start && !hasTimeStart) || (t.end && !hasTimeEnd))),
							extendedProps: { __task: t }
						};
						if (t.color) { ev.backgroundColor = t.color; ev.borderColor = t.color; }
						evs.push(ev);
					}
				}

				successCallback(evs);
			} catch (err) {
				console.error('[FullCalendar] erro ao carregar eventos a partir da API', err);
				failureCallback(err);
			}
		},
	// Use Bootstrap primary as event color
	eventColor: getComputedStyle(document.documentElement).getPropertyValue('--bs-primary')?.trim() || '#0d6efd',
	eventBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bs-primary')?.trim() || '#0d6efd',
	eventBorderColor: getComputedStyle(document.documentElement).getPropertyValue('--bs-primary')?.trim() || '#0d6efd',
		// Altura responsiva maior para aproximar células quadradas no mês
		height: Math.min(Math.max(Math.round(window.innerHeight * 0.78), 600), 980)
	});
	calendar.render();

	// Duplo clique: abrir modal de nova tarefa pré-preenchida
	try {
		// 1) Dblclick em célula do mês (dayGrid)
		calendar.setOption('dayCellDidMount', function(arg) {
			try {
				arg.el.addEventListener('dblclick', function(e){
					e.preventDefault(); e.stopPropagation();
					const dateStr = arg.date && typeof arg.date.toISOString === 'function'
						? arg.date.toISOString().slice(0,10)
						: (arg.dateStr || '');
					if (typeof window.openTaskModal === 'function' && dateStr) {
						window.openTaskModal(null, { start: dateStr });
					}
				});
			} catch {}
		});
		// 2) Dblclick em slot/timeGrid (sem arg.date direto)
		calendar.on('dateClick', function(info){
			try {
				let clicks = info.jsEvent && (info.jsEvent.__pvClicks = (info.jsEvent.__pvClicks||0)+1);
				if (clicks === 2) {
					// normaliza para data YYYY-MM-DD
					const iso = info.dateStr || '';
					const dateOnly = iso ? iso.slice(0,10) : '';
					if (typeof window.openTaskModal === 'function' && dateOnly) {
						window.openTaskModal(null, { start: dateOnly });
					}
					info.jsEvent.__pvClicks = 0;
					return;
				}
				setTimeout(()=>{ if(info.jsEvent) info.jsEvent.__pvClicks = 0; }, 280);
			} catch {}
		});
	} catch {}

	// Removido: botões e fontes relacionados ao Google Calendar/Outlook
	// Ajuste fino: tentar deixar as células da visão mês o mais quadradas possível
	function adjustSquareHeight(){
		try {
			var root = calendarEl;
			if (!root) return;
			// Largura do grid para calcular ~largura de uma célula (7 colunas)
			var grid = root.querySelector('.fc-daygrid-body table');
			var colHeader = root.querySelector('.fc-col-header');
			var toolbar = root.querySelector('.fc-header-toolbar');
			var rows = root.querySelectorAll('.fc-daygrid-body .fc-daygrid-row').length || 6;
			var gridWidth = (grid && grid.getBoundingClientRect().width) || (root.getBoundingClientRect().width - 4);
			var cellW = Math.max(0, Math.floor(gridWidth / 7));
			var targetRowH = cellW; // queremos células ~quadradas
			var headerH = (toolbar ? toolbar.getBoundingClientRect().height : 0) + (colHeader ? colHeader.getBoundingClientRect().height : 0);
			var total = Math.round(headerH + (rows * targetRowH) + 8); // margem/bordas
			// Limites razoáveis
			total = Math.min(Math.max(total, 520), 1100);
			calendar.setOption('height', total);
		} catch(e) { /* noop */ }
	}
	// Executar após render e em mudanças de datas/resize
	try { adjustSquareHeight(); } catch(e) {}
	try { window.addEventListener('resize', function(){ adjustSquareHeight(); }); } catch(e) {}
	try { calendar.on('datesSet', function(){ setTimeout(adjustSquareHeight, 0); }); } catch(e) {}
	// Try to refetch events shortly after render in case tasks module loads after calendar-init
	setTimeout(() => { try { calendar.refetchEvents(); } catch (e) { console.debug('[FullCalendar] refetchEvents failed', e); } }, 600);
	// Expose a helper to refresh events from other modules
	window.refreshCalendarEvents = function() { try { calendar.refetchEvents(); } catch (e) { console.debug('[FullCalendar] refreshCalendarEvents failed', e); } };
	// Quando o usuário clica em um dia, abrir modal com agenda do dia
	calendar.on('dateClick', function(info) {
		try {
			const dateStr = info.dateStr; // YYYY-MM-DD or date-time
			if (dateStr) openTasksForDate(dateStr, calendar);
		} catch (e) { console.error('dateClick handler failed', e); }
	});

	// Clique em evento: abrir modal ancorado na data do evento
	calendar.on('eventClick', function(evt) {
		try {
			if (evt.jsEvent) { evt.jsEvent.preventDefault(); evt.jsEvent.stopPropagation(); }
			const startStr = evt.event && typeof evt.event.startStr === 'string' ? evt.event.startStr : '';
			const dateStr = startStr ? startStr.slice(0, 10) : (evt.event.start ? evt.event.start.toISOString().slice(0,10) : '');
			if (dateStr) openTasksForDate(dateStr, calendar);
		} catch (e) { console.error('eventClick handler failed', e); }
	});

	// Ao arrastar/soltar um evento, atualizar datas da tarefa via API
	function fmtLocal(dt) {
		if (!dt) return null;
		const y = dt.getFullYear();
		const m = String(dt.getMonth()+1).padStart(2,'0');
		const d = String(dt.getDate()).padStart(2,'0');
		const hh = String(dt.getHours()).padStart(2,'0');
		const mm = String(dt.getMinutes()).padStart(2,'0');
		const ss = String(dt.getSeconds()).padStart(2,'0');
		return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
	}

	calendar.on('eventDrop', async function(info){
		try {
			const ev = info.event;
			const t = (ev.extendedProps && ev.extendedProps.__task) || { id: ev.id, title: ev.title, color: ev.backgroundColor };
			if (typeof window.addOrEditTask !== 'function') return; // sem módulo de tarefas
	const start = ev.start ? fmtLocal(ev.start) : null; // YYYY-MM-DDTHH:mm:ss
	const end = ev.end ? fmtLocal(ev.end) : start;
			const ok = await window.addOrEditTask({
				title: t.title || ev.title || 'Tarefa',
				color: t.color || ev.backgroundColor || '#E0B33A',
				start: start,
				end: end,
				description: t.desc || t.description || '' ,
				done: !!(t.done)
			}, ev.id);
			if (!ok) info.revert();
		} catch (e) {
			console.error('[calendar] eventDrop update failed', e);
			try { info.revert(); } catch(_) {}
		}
	});

	// Ao redimensionar (alterar duração), atualizar end
	calendar.on('eventResize', async function(info){
		try {
			const ev = info.event;
			const t = (ev.extendedProps && ev.extendedProps.__task) || { id: ev.id, title: ev.title, color: ev.backgroundColor };
			if (typeof window.addOrEditTask !== 'function') return;
	const start = ev.start ? fmtLocal(ev.start) : null;
	const end = ev.end ? fmtLocal(ev.end) : start;
			const ok = await window.addOrEditTask({
				title: t.title || ev.title || 'Tarefa',
				color: t.color || ev.backgroundColor || '#E0B33A',
				start: start,
				end: end,
				description: t.desc || t.description || '' ,
				done: !!(t.done)
			}, ev.id);
			if (!ok) info.revert();
		} catch (e) {
			console.error('[calendar] eventResize update failed', e);
			try { info.revert(); } catch(_) {}
		}
	});

	// allow other modules to request a refresh when tasks change
	try {
		window.addEventListener('pv:tasks-updated', function() {
			try { calendar.refetchEvents(); } catch (e) { console.warn('calendar.refetchEvents failed', e); }
		});
	} catch (e) {}

	// CSP sanity-check: FullCalendar cria um <style data-fullcalendar> internamente.
	// Se a política CSP do site bloquear inline styles, esse <style> pode ser impedido
	// ou ter acesso ao stylesheet restrito. Detectamos isso e mostramos uma mensagem
	// com instruções para o servidor injetar um nonce em <meta name="csp-nonce">.
	try {
		var fcStyle = document.querySelector('style[data-fullcalendar]');
		var nonceMeta = document.querySelector('meta[name="csp-nonce"]');
		// se encontrarmos um meta nonce com valor, aplique-o ao elemento style existente
		try {
			var applyNonceToStyle = function(el) {
				try {
					if (!el || el.getAttribute('nonce')) return; // já tem nonce
					var nonceVal = nonceMeta && nonceMeta.getAttribute('content') && nonceMeta.getAttribute('content').trim();
					if (nonceVal) el.setAttribute('nonce', nonceVal);
				} catch (e) { /* swallow */ }
			};

			if (!fcStyle) {
				console.warn('[FullCalendar] style[data-fullcalendar] não encontrado — confira sua política CSP.');
				showCspNotice(calendarEl, 'O calendário pode não estar estilizado devido à política de segurança (CSP). Verifique se o servidor injeta <meta name="csp-nonce"> com um nonce válido.');
			} else {
				// tentar acessar sheet para detectar se foi bloqueado
				try {
					// algumas engines lançam ao acessar .sheet se CSP impedir a criação
					var s = fcStyle.sheet;
					applyNonceToStyle(fcStyle);
					if (nonceMeta && (!nonceMeta.getAttribute('content') || nonceMeta.getAttribute('content').trim() === '')) {
						console.info('[FullCalendar] meta[name="csp-nonce"] presente mas sem valor. Configure o servidor para preencher o nonce.');
					}
				} catch (err) {
					console.error('[FullCalendar] possível bloqueio de CSP ao criar style[data-fullcalendar]:', err);
					showCspNotice(calendarEl, 'O navegador bloqueou a injeção de estilos do calendário por restrição CSP. Configure um nonce (meta[name="csp-nonce"]) no servidor ou permita o estilo necessário. Veja console para detalhes.');
				}
			}

			// Observe adições futuras ao DOM (em particular style[data-fullcalendar]) e aplique o nonce caso o servidor o tenha fornecido.
			try {
				var observer = new MutationObserver(function(mutations) {
					mutations.forEach(function(m) {
						m.addedNodes && m.addedNodes.forEach(function(node) {
							if (node && node.nodeType === 1 && node.tagName === 'STYLE' && node.hasAttribute('data-fullcalendar')) {
								applyNonceToStyle(node);
							}
						});
					});
				});
				observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
				// desconecta depois de 5s para evitar observação contínua em produção
				setTimeout(function() { try { observer.disconnect(); } catch (e) {} }, 5000);
			} catch (obsErr) {
				// não crítico
			}
		} catch (outerErr) {
			console.debug('[FullCalendar] verificação CSP falhou:', outerErr);
		}
	} catch (outer) {
		// não crítico — apenas log
		console.debug('[FullCalendar] verificação CSP falhou:', outer);
	}

	function showCspNotice(containerEl, message) {
		try {
			var wrap = document.createElement('div');
			wrap.className = 'fc-csp-notice';
			wrap.setAttribute('role', 'alert');
			wrap.style.background = '#fff4e5';
			wrap.style.border = '1px solid #f0c070';
			wrap.style.color = '#3b2f0b';
			wrap.style.padding = '0.8rem';
			wrap.style.margin = '0.75rem 0';
			wrap.style.borderRadius = '6px';
			wrap.style.fontSize = '0.95rem';
			wrap.textContent = message;
			if (containerEl && containerEl.parentNode) containerEl.parentNode.insertBefore(wrap, containerEl);
		} catch (err) {
			console.warn('Não foi possível inserir aviso CSP no DOM:', err);
		}
	}

	// Helpers: modal de agenda diária
	const dayModalId = 'calendar-day-modal';
	let dayModalBound = false;
	let dayModalKeyHandler = null;

	const formatDayTitle = (iso) => {
		try {
			const dt = new Date(`${iso}T00:00:00`);
			return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
		} catch { return iso; }
	};

	const escapeHtml = (value) => String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	function ensureDayModalBindings() {
		if (dayModalBound) return;
		const modal = document.getElementById(dayModalId);
		if (!modal) return;
		const closeBtn = modal.querySelector('[data-cal-day-close]');
		if (closeBtn) closeBtn.addEventListener('click', closeCalendarDayModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal) closeCalendarDayModal();
		});
		dayModalBound = true;
	}

	function openCalendarDayModal(modal) {
		if (!modal) return;
		const otherOpen = document.querySelector('.janela.janela--aberta');
		if (!otherOpen) {
			modal.dataset.prevOverflow = document.body.style.overflow || '';
			document.body.style.overflow = 'hidden';
		}
		ensureDayModalBindings();
		requestAnimationFrame(() => modal.classList.add('janela--aberta'));
		modal.setAttribute('aria-hidden', 'false');
		const focusTarget = modal.querySelector('[data-day-add]') || modal.querySelector('[data-cal-day-close]');
		setTimeout(() => { try { focusTarget && focusTarget.focus(); } catch { } }, 140);
		dayModalKeyHandler = function (ev) { if (ev.key === 'Escape') closeCalendarDayModal(); };
		document.addEventListener('keydown', dayModalKeyHandler);
	}

	function closeCalendarDayModal() {
		const modal = document.getElementById(dayModalId);
		if (!modal) return;
		if (!modal.classList.contains('janela--aberta')) return;
		modal.classList.remove('janela--aberta');
		modal.setAttribute('aria-hidden', 'true');
		if (dayModalKeyHandler) {
			document.removeEventListener('keydown', dayModalKeyHandler);
			dayModalKeyHandler = null;
		}
		if (!document.querySelector('.janela.janela--aberta')) {
			document.body.style.overflow = modal.dataset.prevOverflow || '';
		}
	}

	window.closeCalendarDayModal = closeCalendarDayModal;

	// Helper: abrir modal com tarefas do dia
	window.openTasksForDate = async function(dateStr, calendarRef) {
		try {
			let tasks = [];
			const tasksLoader = window.getTasks || (typeof getTasks === 'function' ? getTasks : null);
			if (tasksLoader) {
				tasks = await tasksLoader();
			} else {
				try {
					const api = location.origin + '/server/api/tasks.php';
					const r = await fetch(api, { credentials: 'same-origin' });
					const j = await r.json().catch(() => null);
					tasks = (j && j.success && Array.isArray(j.items)) ? j.items : [];
				} catch (e) { tasks = []; }
			}

			const parseStudy = (t) => {
				try { return (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(t.desc || t.description || '') : null; } catch { return null; }
			};
			const ymdToDate = (s) => { const m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; return new Date(+m[1], +m[2]-1, +m[3], 0, 0, 0, 0); };
			const pad = (n) => String(n).padStart(2,'0');
			const buildIso = (d, hm) => { const [h,mi] = String(hm||'00:00').split(':'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(mi)}:00`; };
			const addMinutesIso = (iso, minutes) => { try { const d = new Date(iso); d.setMinutes(d.getMinutes() + (Number(minutes)||0)); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; } catch { return iso; } };
			const normalizeWeekdayList = (arr) => { const a = Array.isArray(arr) ? arr.map(Number) : []; return a.map(n => (n>=1 && n<=7) ? (n % 7) : (n>=0 && n<=6 ? n : -1)).filter(n => n>=0); };
			const inRangeYMD = (d, start, end) => (!start || d>=start) && (!end || d<=end);
			const hasTimePart = (s) => typeof s === 'string' && /\d{2}:\d{2}/.test(s);
			const isDateOnly = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
			const isMidnight = (s) => typeof s === 'string' && /T00:00(:00)?$/.test(s);
			const fmtTime = (dt) => { try { return dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch { return ''; } };

			const dRef = new Date(dateStr + 'T00:00:00');
			const dayTasks = [];
			for (const t of (Array.isArray(tasks) ? tasks : [])) {
				if (!t) continue;
				try {
					const meta = parseStudy(t);
					const sch = meta && meta.schedule;
					if (sch && Array.isArray(sch.weekdays) && sch.weekdays.length) {
						const sY = ymdToDate(sch.startDate);
						const eY = ymdToDate(sch.endDate);
						if (inRangeYMD(dRef, sY, eY)) {
							const dows = normalizeWeekdayList(sch.weekdays);
							if (dows.includes(dRef.getDay())) {
								const startIso = buildIso(dRef, sch.time);
								const durationMin = Number(meta?.estimatedMinutes || 0) || 60;
								const endIso = sch.endTime ? buildIso(dRef, sch.endTime) : addMinutesIso(startIso, durationMin);
								dayTasks.push(Object.assign({}, t, { __computedStart: startIso, __computedEnd: endIso }));
							}
						}
						continue;
					}
					const ds = String(dateStr);
					if (t.start && String(t.start).startsWith(ds)) { dayTasks.push(t); continue; }
					if (t.end && String(t.end).startsWith(ds)) { dayTasks.push(t); continue; }
					if (t.start && t.end) {
						const d = dRef;
						if (isNaN(d)) continue;
						const allDayExclusive = (!hasTimePart(t.start) && !hasTimePart(t.end)) || (isDateOnly(t.start) && isMidnight(t.end));
						if (allDayExclusive) {
							const s0 = isDateOnly(t.start) ? new Date(t.start + 'T00:00:00') : new Date(t.start);
							const e0 = isDateOnly(t.end) ? new Date(t.end + 'T00:00:00') : new Date(t.end);
							if (d >= s0 && d < e0) { dayTasks.push(t); continue; }
						} else {
							const s1 = new Date(t.start);
							const e1 = new Date(t.end);
							const sDay = new Date(s1.getFullYear(), s1.getMonth(), s1.getDate());
							const eDay = new Date(e1.getFullYear(), e1.getMonth(), e1.getDate());
							if (d >= sDay && d <= eDay) { dayTasks.push(t); continue; }
						}
					}
				} catch(_) { /* ignore */ }
			}

			const modal = document.getElementById(dayModalId);
			if (!modal) {
				if (typeof window.openTaskModal === 'function') window.openTaskModal(null, { start: dateStr });
				return dayTasks;
			}

			const titleEl = modal.querySelector('#calendar-day-title');
			if (titleEl) titleEl.textContent = formatDayTitle(dateStr);
			const summaryEl = modal.querySelector('[data-day-summary]');
			if (summaryEl) summaryEl.textContent = dayTasks.length ? `${dayTasks.length} tarefa${dayTasks.length === 1 ? '' : 's'} agendada${dayTasks.length === 1 ? '' : 's'}` : 'Nenhuma tarefa cadastrada para este dia.';

			const listEl = modal.querySelector('[data-day-list]');
			const emptyEl = modal.querySelector('[data-day-empty]');
			if (listEl) listEl.innerHTML = '';
			if (dayTasks.length && listEl) {
				dayTasks.sort((a, b) => {
					const sa = a.__computedStart || a.start || '';
					const sb = b.__computedStart || b.start || '';
					return sa.localeCompare(sb);
				});
				dayTasks.forEach(t => {
					const sRaw = t.__computedStart || t.start;
					const eRaw = t.__computedEnd || t.end;
					const start = sRaw ? new Date(sRaw) : null;
					const end = eRaw ? new Date(eRaw) : null;
					const hasTimeStart = Boolean(sRaw && /\d{2}:\d{2}/.test(String(sRaw)));
					const hasTimeEnd = Boolean(eRaw && /\d{2}:\d{2}/.test(String(eRaw)));
					const sameDay = (start && end) ? (start.toDateString() === end.toDateString()) : false;
					const isAllDay = Boolean(t.allDay || (!hasTimeStart && !hasTimeEnd));
					let timeStr = '';
					if (hasTimeStart && hasTimeEnd && sameDay) timeStr = `${fmtTime(start)} – ${fmtTime(end)}`;
					else if (hasTimeStart) timeStr = fmtTime(start);
					else if (hasTimeEnd) timeStr = fmtTime(end);
					else if (isAllDay) timeStr = 'Dia todo';
					const item = document.createElement('button');
					item.type = 'button';
					item.className = 'calendar-day-modal__item';
					item.innerHTML = `
						<div class="calendar-day-modal__item-info">
							<div class="calendar-day-modal__item-title">${escapeHtml(t.title || t.desc || 'Tarefa')}</div>
							${t.course ? `<div class="calendar-day-modal__item-meta">${escapeHtml(t.course)}</div>` : ''}
						</div>
						<div class="calendar-day-modal__item-meta">${escapeHtml(timeStr)}</div>
					`;
					item.addEventListener('click', () => {
						closeCalendarDayModal();
						if (typeof window.openTaskModal === 'function') window.openTaskModal(t.id);
					});
					listEl.appendChild(item);
				});
			}
			if (emptyEl) emptyEl.style.display = dayTasks.length ? 'none' : '';
			if (listEl) listEl.style.display = dayTasks.length ? 'flex' : 'none';

			const addBtn = modal.querySelector('[data-day-add]');
			if (addBtn) {
				addBtn.onclick = () => {
					closeCalendarDayModal();
					if (typeof window.openTaskModal === 'function') window.openTaskModal(null, { start: dateStr });
				};
			}

			openCalendarDayModal(modal);
			return dayTasks;
		} catch (err) {
			console.error('[openTasksForDate] falha', err);
			return [];
		}
	};
});

/*
 Notes on CSP compatibility:
 - FullCalendar dynamically injects a <style data-fullcalendar> element. If your CSP disallows
	 inline styles ('style-src' without 'unsafe-inline') the browser will block that insertion unless
	 a nonce is applied to the created <style> element.
 - The FullCalendar core looks for a meta[name="csp-nonce"] or script[nonce] to grab a nonce value
	 and use it for the style element it inserts. Ensure your server injects the nonce into the
	Nota: arquitetura unificada não usa mais modules/layout.html.
 - Alternative: allow the specific origin for style-src (e.g., a trusted CDN) or use a CSP hash of
	 the injected styles (less practical). The recommended approach is server-injected nonce.
*/

