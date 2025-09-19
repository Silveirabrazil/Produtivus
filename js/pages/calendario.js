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

	// Sistema automatizado de Google Calendar
	function setupAutoGoogleCalendar() {
		try {
			// Verificar se usuário tem acesso ao calendário
			const user = JSON.parse(localStorage.getItem('pv_user') || '{}');
			const accessToken = localStorage.getItem('pv_google_calendar_token');

			if (user.calendar_access && accessToken) {
				console.info('[FullCalendar] Usuário autenticado com acesso ao Google Calendar');

				// Configurar automaticamente usando o token OAuth
				calendar.setOption('googleCalendarApiKey', ''); // Não precisamos de API Key

				// Usar diretamente a API OAuth para listar calendários
				fetchUserCalendars(accessToken).then(calendars => {
					if (calendars && calendars.length > 0) {
						console.info('[FullCalendar] Encontrados', calendars.length, 'calendários do usuário');

						// Adicionar calendário principal automaticamente
						const primaryCalendar = calendars.find(cal => cal.primary) || calendars[0];
						if (primaryCalendar) {
							// Usar token OAuth em vez de API Key
							calendar.addEventSource({
								googleCalendarId: primaryCalendar.id,
								className: 'gcal-source-auto',
								extraParams: {
									access_token: accessToken
								}
							});

							// Salvar configuração automática
							const autoConfig = {
								auto: true,
								accessToken: accessToken,
								calendars: calendars,
								primaryId: primaryCalendar.id
							};
							localStorage.setItem('pv_gcal_auto_cfg', JSON.stringify(autoConfig));

							// Sem notificações: manter silencioso
						}
					}
				}).catch(error => {
					console.warn('[FullCalendar] Erro ao buscar calendários do usuário:', error);
					// Fallback para configuração manual
					showCalendarSetupPrompt();
				});
			}
		} catch (error) {
			console.warn('[FullCalendar] Erro na configuração automática:', error);
		}
	}

	// Buscar calendários do usuário via OAuth
	async function fetchUserCalendars(accessToken) {
		try {
			const response = await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList?access_token=${accessToken}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const data = await response.json();
			return data.items || [];
		} catch (error) {
			console.error('[GoogleCalendar] Erro ao buscar calendários:', error);
			return null;
		}
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

	// Removido: prompt/configuração manual do Google Calendar

	// Aplicar configuração inicial automatizada
	setTimeout(setupAutoGoogleCalendar, 100);

	// --- Google Calendar: UI de configuração ---
	// Removido: modal de configuração manual do Google Calendar
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
		googleCalendarApiKey: (function(){ try{ return (readGCalConfig().apiKey||'').trim(); }catch{return ''} })(),
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

	// Botão para conectar Google Agenda (apenas OAuth)
	try {
		setTimeout(()=>{
			const tb = calendarEl.querySelector('.fc-header-toolbar .fc-toolbar-chunk:last-child');
			if (!tb) return;
			const btn = document.createElement('button');
			btn.type='button'; btn.className='btn btn-sm btn-outline-secondary ms-2'; btn.textContent='Google';
			btn.addEventListener('click', function(){
				try {
					const user = JSON.parse(localStorage.getItem('pv_user') || '{}');
					if (user.calendar_access) {
						// Reconectar
						setupAutoGoogleCalendar();
					} else if (window.googleAuth && window.googleAuth.signInWithCalendar) {
						// Login com permissões de calendário (OAuth) para todos
						window.googleAuth.signInWithCalendar();
					} else {
						// Serviço de login não carregou ainda
						try { window.pvNotify?.({ title:'Conectar Google', message:'Clique novamente em alguns segundos; o serviço de login ainda está carregando.', type:'info' }); } catch{}
					}
				} catch {
					// ignora
				}
			});
			tb.appendChild(btn);

			// Atualizar texto do botão baseado no status
			function updateGoogleButton() {
				try {
					const user = JSON.parse(localStorage.getItem('pv_user') || '{}');
					const autoConfig = JSON.parse(localStorage.getItem('pv_gcal_auto_cfg') || '{}');

					if (user.calendar_access && autoConfig.auto) {
						btn.textContent = 'Google ✓';
						btn.className = 'btn btn-sm btn-success ms-2';
						btn.title = 'Google Calendar conectado automaticamente';
					} else {
						btn.textContent = 'Google';
						btn.className = 'btn btn-sm btn-outline-secondary ms-2';
						btn.title = 'Conectar Google Calendar';
					}
				} catch {}
			}

			updateGoogleButton();

			// Atualizar quando configuração mudar
			window.addEventListener('pv:gcal:updated', updateGoogleButton);
			document.addEventListener('pv:user:changed', updateGoogleButton);
		}, 0);
	} catch {}

	// Botão "Outlook" (placeholder) para futura integração Microsoft Graph
	try {
		setTimeout(()=>{
			const tb = calendarEl.querySelector('.fc-header-toolbar .fc-toolbar-chunk:last-child');
			if (!tb || tb.querySelector('.btn-outlook')) return;
			const btn = document.createElement('button');
			btn.type='button'; btn.className='btn btn-sm btn-outline-secondary ms-2 btn-outlook'; btn.textContent='Outlook';
			btn.addEventListener('click', function(){
				try { alert('Conectar ao Outlook (em breve): adicionaremos login Microsoft e sincronização.'); } catch{}
			});
			tb.appendChild(btn);
		}, 0);
	} catch {}

	// Ao atualizar config, refazer fontes do Google
	window.addEventListener('pv:gcal:updated', function(){
		try {
			const cfg = readGCalConfig();
			calendar.setOption('googleCalendarApiKey', (cfg.apiKey||'').trim());
			// Remove fontes anteriores do Google
			calendar.getEventSources().forEach(src=>{ try { if (src.internal && src.internal.source && src.internal.source.meta && src.internal.source.meta.googleCalendarId) src.remove(); } catch{} });
			// Adiciona novas
			if (Array.isArray(cfg.ids)) {
				cfg.ids.forEach(id=>{ if (!id) return; calendar.addEventSource({ googleCalendarId: id, className: 'gcal-source' }); });
			}
			calendar.refetchEvents();
		} catch (e) { console.warn('Falha ao aplicar config Google Calendar', e); }
	});

	// Aplicar config existente ao carregar
	(function applyInitialGCal(){
		try {
			const cfg = readGCalConfig();
			if (cfg.apiKey && Array.isArray(cfg.ids) && cfg.ids.length) {
				cfg.ids.forEach(id=>{ if (!id) return; calendar.addEventSource({ googleCalendarId: id, className: 'gcal-source' }); });
				if (cfg.timeZone) { try { calendar.setOption('timeZone', cfg.timeZone); } catch {} }
			}
		} catch {}
	})();
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
	// Quando o usuário clica em um dia, abrir dropdown com tarefas do dia (em vez de modal)
	calendar.on('dateClick', function(info) {
		try {
			const dateStr = info.dateStr; // YYYY-MM-DD or date-time
			const anchorEl = info.dayEl || info.jsEvent?.target || calendarEl;
			openTasksForDate(dateStr, calendar, anchorEl);
		} catch (e) { console.error('dateClick handler failed', e); }
	});

	// Clique em evento: abrir dropdown ancorado ao próprio evento (sem modal)
	calendar.on('eventClick', function(evt) {
		try {
			if (evt.jsEvent) { evt.jsEvent.preventDefault(); evt.jsEvent.stopPropagation(); }
			const startStr = evt.event && typeof evt.event.startStr === 'string' ? evt.event.startStr : '';
			const dateStr = startStr ? startStr.slice(0, 10) : (evt.event.start ? evt.event.start.toISOString().slice(0,10) : '');
			const anchorEl = evt.el || (evt.jsEvent && evt.jsEvent.target) || calendarEl;
			if (dateStr) openTasksForDate(dateStr, calendar, anchorEl);
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

	// Helper: abrir dropdown com tarefas do dia ancorado ao elemento clicado
	window.openTasksForDate = async function(dateStr, calendarRef, anchorEl) {
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
			// Helpers para cronogramas (aulas) extraídos da descrição
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
						if (!inRangeYMD(dRef, sY, eY)) { /* fora do período */ }
						else {
							const dows = normalizeWeekdayList(sch.weekdays);
							if (dows.includes(dRef.getDay())) {
								// ocorre neste dia: compute start/end do dia
								const startIso = buildIso(dRef, sch.time);
								const durationMin = Number(meta?.estimatedMinutes || 0) || 60;
								const endIso = sch.endTime ? buildIso(dRef, sch.endTime) : addMinutesIso(startIso, durationMin);
								dayTasks.push(Object.assign({}, t, { __computedStart: startIso, __computedEnd: endIso }));
							}
						}
						continue;
					}
					// Não é cronograma: filtrar por inclusão de dia
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

			// Dropdown container (reutilizável)
			let drop = document.getElementById('calendar-day-tasks-dropdown');
			if (!drop) {
				drop = document.createElement('div');
				drop.id = 'calendar-day-tasks-dropdown';
				drop.className = 'dropdown-menu show shadow calendar-day-dropdown p-2';
				drop.setAttribute('role', 'menu');
				drop.style.position = 'absolute';
				drop.style.minWidth = '260px';
				drop.style.maxWidth = '360px';
				drop.style.maxHeight = '320px';
				drop.style.overflow = 'auto';
				drop.style.zIndex = '1060';
				document.body.appendChild(drop);
			}

			// Conteúdo
			drop.innerHTML = '';
			const head = document.createElement('div');
			head.className = 'dropdown-header';
			head.textContent = `Tarefas em ${dateStr}`;
			drop.appendChild(head);

			const body = document.createElement('div');
			body.id = 'cdt-body';
			drop.appendChild(body);
			if (!dayTasks.length) {
				body.innerHTML = '<div class="small muted">Nenhuma tarefa neste dia.</div>';
			} else {
				const fmtTime = (dt) => { try { return dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch { return ''; } };
				dayTasks.forEach(t => {
					const sRaw = t.__computedStart || t.start;
					const eRaw = t.__computedEnd || t.end;
					const start = sRaw ? new Date(sRaw) : null;
					const end = eRaw ? new Date(eRaw) : null;
					const hasTimeStart = typeof t.start === 'string' && /\d{2}:\d{2}/.test(t.start);
					const hasTimeEnd = typeof t.end === 'string' && /\d{2}:\d{2}/.test(t.end);
					const sameDay = (start && end) ? (start.getFullYear()===end.getFullYear() && start.getMonth()===end.getMonth() && start.getDate()===end.getDate()) : false;
					const isAllDay = Boolean(t.allDay || ((t.start || t.end) && !hasTimeStart && !hasTimeEnd));
					let timeStr = '';
					if (hasTimeStart && hasTimeEnd && sameDay) timeStr = `${fmtTime(start)}–${fmtTime(end)}`;
					else if (hasTimeStart) timeStr = fmtTime(start);
					else if (hasTimeEnd) timeStr = fmtTime(end);
					else if (isAllDay) timeStr = 'Dia todo';
					const item = document.createElement('button');
					item.type = 'button';
					item.className = 'dropdown-item d-flex align-items-center justify-content-between gap-2 cdt-item-btn';
					item.innerHTML = `<span class="cdt-title" data-id="${t.id}">${t.title}</span><span class="cdt-time small text-secondary">${timeStr}</span>`;
					item.addEventListener('click', () => {
						closeDropdown();
						if (typeof window.openTaskModal === 'function') window.openTaskModal(t.id);
					});
					body.appendChild(item);
				});
			}

			// Ações
			const divider = document.createElement('div');
			divider.className = 'dropdown-divider';
			drop.appendChild(divider);

			const addBtn = document.createElement('button');
			addBtn.id = 'cdt-add';
			addBtn.className = 'btn btn-sm btn-primary w-100';
			addBtn.textContent = '+ Nova tarefa neste dia';
			addBtn.addEventListener('click', () => {
				closeDropdown();
				if (typeof window.openTaskModal === 'function') window.openTaskModal(null, { start: dateStr });
			});
			drop.appendChild(addBtn);

			// Posicionamento
			positionDropdown(drop, anchorEl || calendarRef?.el || calendarEl);

			// Fechamento
			setupDropdownClose(drop);
		} catch (err) {
			console.error('[openTasksForDate] falha', err);
		}
	};

	function positionDropdown(menuEl, anchor) {
		try {
			const a = anchor && anchor.nodeType === 1 ? anchor : calendarEl;
			const rect = a.getBoundingClientRect();
			menuEl.style.visibility = 'hidden';
			menuEl.style.left = '0px';
			menuEl.style.top = '0px';
			// anexar para medir
			if (!document.body.contains(menuEl)) document.body.appendChild(menuEl);
			// medir após anexar
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const menuW = Math.min(menuEl.offsetWidth || 320, 380);
			const menuH = Math.min(menuEl.offsetHeight || 240, 380);
			let left = rect.left + window.scrollX;
			let top = rect.bottom + 8 + window.scrollY;
			// ajustar se transbordar à direita
			if (left + menuW > vw + window.scrollX - 8) left = Math.max(8 + window.scrollX, vw + window.scrollX - menuW - 8);
			// se transbordar abaixo, abrir para cima
			if (top + menuH > vh + window.scrollY - 8) top = Math.max(8 + window.scrollY, rect.top - menuH - 8 + window.scrollY);
			menuEl.style.left = left + 'px';
			menuEl.style.top = top + 'px';
			menuEl.style.visibility = 'visible';
		} catch (e) { /* noop */ }
	}

	function setupDropdownClose(menuEl){
		// Fechar dropdown anterior
		try { closeDropdown(); } catch(_) {}
		window.__pv_calendar_dropdown_open = menuEl;
		const onDoc = function(e){
			const el = window.__pv_calendar_dropdown_open;
			if (!el) return;
			if (el.contains(e.target)) return; // inside
			closeDropdown();
		};
		const onEsc = function(e){ if (e.key === 'Escape') { closeDropdown(); } };
		const onResize = function(){ try { closeDropdown(); } catch(_){} };
		document.addEventListener('mousedown', onDoc, { capture: true });
		document.addEventListener('keydown', onEsc);
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onResize, true);
		menuEl.__cleanup = () => {
			document.removeEventListener('mousedown', onDoc, { capture: true });
			document.removeEventListener('keydown', onEsc);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onResize, true);
		};
	}

	function closeDropdown(){
		const el = window.__pv_calendar_dropdown_open;
		if (el && el.parentNode) {
			try { if (typeof el.__cleanup === 'function') el.__cleanup(); } catch(_){}
			el.parentNode.removeChild(el);
		}
		window.__pv_calendar_dropdown_open = null;
	}
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

