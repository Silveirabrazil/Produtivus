// js/pages/estudos.js
// Inicialização dedicada da página Estudos

// Parte 1: normalização e montagem das ferramentas (de js/studies-init.js)
(function(){
	function ready(fn){ if (document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
	ready(function(){
		const host = document.getElementById('studies-tools');
		if (!host) return;

	// criar slots (empilhados verticalmente)
	const col1 = document.createElement('div');
	const col2 = document.createElement('div');
		host.appendChild(col1); host.appendChild(col2);

		try { window.pvStudyTimer?.mount(col1); } catch{}
		try { window.pvFlashcards?.mount(col2); } catch{}

		// montar Central de Estudos (Atividades do dia + Cadernos por curso)
		try {
			const hubHost = document.getElementById('studies-hub');
			if (hubHost && window.pvStudiesHub?.mount) window.pvStudiesHub.mount(hubHost);
		} catch{}

		// (Removido) normalização de botões bootstrap — o design system próprio já provê estilos
	});
})();

// Parte 2: lógicas específicas da página (de js/estudos.js)
(function(){
		'use strict';

		async function renderCoursesOnPage() {
			const host = document.getElementById('page-courses-accordion-host');
			if(!host) return;
			const courses = await (window.study?.loadCourses ? window.study.loadCourses() : Promise.resolve([]));
			const subjects = await (window.study?.loadSubjects ? window.study.loadSubjects() : Promise.resolve([]));
			host.innerHTML = '';
			if(!courses?.length){ host.innerHTML = '<div class="texto-suave pequeno">Nenhum curso cadastrado.</div>'; return; }
			const wrap = document.createElement('div'); wrap.className = 'acordeao acordeao--lista';
			courses.forEach(c=>{
				const item = document.createElement('div'); item.className = 'acordeao__item'; item.setAttribute('data-curso-id', c.id);
				const cab = document.createElement('button'); cab.type = 'button'; cab.className = 'acordeao__cabeca'; cab.setAttribute('aria-expanded','false'); cab.textContent = c.name || '';
				const conteudo = document.createElement('div'); conteudo.className = 'acordeao__conteudo'; conteudo.hidden = true;
				const ul = document.createElement('ul'); ul.className = 'lista-simples';
				const subs = subjects.filter(s=> String(s.course_id) === String(c.id));
				subs.forEach(s=>{
					const li = document.createElement('li'); li.className = 'acordeao__linha';
					const nome = document.createElement('span'); nome.textContent = s.name || '';
					const ac = document.createElement('div'); ac.className = 'linha-acoes';
					const open = document.createElement('button'); open.className = 'botao botao--suave botao--micro btn-open-caderno'; open.setAttribute('data-subject-id', s.id); open.textContent = 'Abrir';
					ac.appendChild(open); li.appendChild(nome); li.appendChild(ac); ul.appendChild(li);
				});
				conteudo.appendChild(ul);
				item.appendChild(cab); item.appendChild(conteudo); wrap.appendChild(item);
			});
			host.appendChild(wrap);
			// interação acordeão
			host.querySelectorAll('.acordeao__cabeca').forEach(btn=>{
				btn.addEventListener('click', ()=>{
					const expanded = btn.getAttribute('aria-expanded') === 'true';
					btn.setAttribute('aria-expanded', String(!expanded));
					const content = btn.nextElementSibling; if(content){ content.hidden = expanded; }
				});
			});
			// abrir caderno
			host.querySelectorAll('.btn-open-caderno').forEach(b=>{
				b.addEventListener('click', ()=>{ const sid = b.getAttribute('data-subject-id'); if(window.openCadernoBySubjectId) return window.openCadernoBySubjectId(sid); if(window.study?.openCaderno) return window.study.openCaderno(sid); });
			});
		}

		async function loadModalData(){
			const acc = document.getElementById('modal-courses-accordion'); if(!acc) return;
			const courses = await (window.study?.loadCourses ? window.study.loadCourses() : Promise.resolve([]));
			const subjects = await (window.study?.loadSubjects ? window.study.loadSubjects() : Promise.resolve([]));
			acc.innerHTML='';
			courses.forEach(c=>{
				const item = document.createElement('div'); item.className = 'acordeao__item'; item.setAttribute('data-curso-id', c.id);
				const cab = document.createElement('button'); cab.type='button'; cab.className='acordeao__cabeca'; cab.setAttribute('aria-expanded','false'); cab.textContent = c.name || '';
				const conteudo = document.createElement('div'); conteudo.className='acordeao__conteudo'; conteudo.hidden = true;
				// linha topo
				const topo = document.createElement('div'); topo.className='linha-topo';
				const info = document.createElement('div'); info.className='info'; info.innerHTML = '<small class="texto-suave">Matérias:</small>';
				const acoes = document.createElement('div'); acoes.className='acoes';
				const del = document.createElement('button'); del.className='botao botao--perigo botao--micro btn-delete-course'; del.setAttribute('data-course-id', c.id); del.textContent='Remover Curso'; acoes.appendChild(del);
				topo.appendChild(info); topo.appendChild(acoes);
				// form add subject
				const form = document.createElement('div'); form.className='linha-form';
				const inputName = document.createElement('input'); inputName.type='text'; inputName.placeholder='Nova matéria'; inputName.className='campo campo--texto campo--micro'; inputName.id='modal-subject-name-' + c.id; inputName.setAttribute('data-course-id', c.id);
				const inputColor = document.createElement('input'); inputColor.type='color'; inputColor.className='campo campo--cor campo--micro input-color-sm'; inputColor.value = c.color || '#365562'; inputColor.id='modal-subject-color-' + c.id;
				const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='botao botao--primario botao--micro btn-add-subject'; addBtn.textContent='Adicionar Matéria'; addBtn.setAttribute('data-course-id', c.id);
				form.appendChild(inputName); form.appendChild(inputColor); form.appendChild(addBtn);
				// lista matérias
				const ul = document.createElement('ul'); ul.className='lista-simples lista-materias';
				const subs = subjects.filter(s=> String(s.course_id) === String(c.id));
				subs.forEach(s=>{ const li=document.createElement('li'); li.className='acordeao__linha'; const nome=document.createElement('span'); nome.textContent=s.name || ''; const rb=document.createElement('div'); rb.className='linha-acoes'; const rbtn=document.createElement('button'); rbtn.className='botao botao--perigo-suave botao--micro btn-remove-subject'; rbtn.setAttribute('data-subject-id', s.id); rbtn.textContent='Remover'; rb.appendChild(rbtn); li.appendChild(nome); li.appendChild(rb); ul.appendChild(li); });
				conteudo.appendChild(topo); conteudo.appendChild(form); conteudo.appendChild(ul);
				item.appendChild(cab); item.appendChild(conteudo); acc.appendChild(item);
			});
			// interações
			acc.querySelectorAll('.acordeao__cabeca').forEach(btn=>{
				btn.addEventListener('click', ()=>{ const expanded = btn.getAttribute('aria-expanded')==='true'; btn.setAttribute('aria-expanded', String(!expanded)); const c = btn.nextElementSibling; if(c) c.hidden = expanded; });
			});
			// handlers de curso/matéria
			acc.querySelectorAll('.btn-delete-course').forEach(b=>{
				b.addEventListener('click', async()=>{ const id = b.getAttribute('data-course-id'); if(!id) return; const ok = window.pvShowConfirm ? await window.pvShowConfirm('Remover este curso?') : confirm('Remover este curso?'); if(!ok) return; await window.study.removeCourse(id); await loadModalData(); await renderCoursesOnPage(); });
			});
			acc.querySelectorAll('.btn-remove-subject').forEach(b=>{
				b.addEventListener('click', async()=>{ const id = b.getAttribute('data-subject-id'); if(!id) return; const ok = window.pvShowConfirm ? await window.pvShowConfirm('Remover esta matéria?') : confirm('Remover esta matéria?'); if(!ok) return; await window.study.removeSubject(id); await loadModalData(); await renderCoursesOnPage(); });
			});
			acc.querySelectorAll('.btn-add-subject').forEach(b=>{
				b.addEventListener('click', async()=>{ const courseId = b.getAttribute('data-course-id'); if(!courseId) return; const nameEl = document.getElementById('modal-subject-name-'+courseId); const colorEl = document.getElementById('modal-subject-color-'+courseId); const name = nameEl ? nameEl.value.trim() : ''; const color = colorEl ? colorEl.value : '#365562'; if(!name) return; try { await window.study.addSubject(name, color, courseId); if(nameEl) nameEl.value=''; await loadModalData(); await renderCoursesOnPage(); }catch(e){} });
			});
		}

		// Single DOMContentLoaded handler: wire buttons, mount tools, initial render
		document.addEventListener('DOMContentLoaded', async function(){
				try{ var y = document.getElementById('copyright-year'); if(y) y.textContent = new Date().getFullYear(); }catch(e){}

				try{ var all = Array.from(document.querySelectorAll('#btn-manage-courses')); if(all.length>1) all.slice(1).forEach(function(n){ n.remove(); }); }catch(e){}

								const btn = document.getElementById('btn-manage-courses');
								if(btn){
									const modalEl = document.getElementById('modal-manage-courses');
									const focusSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
									function abrirJanela(){ if(!modalEl) return; modalEl.classList.add('janela--aberta'); modalEl.removeAttribute('aria-hidden'); try{ loadModalData(); }catch(e){} trapFocus(); }
									function fecharJanela(){ if(!modalEl) return; modalEl.classList.remove('janela--aberta'); modalEl.setAttribute('aria-hidden','true'); document.activeElement && typeof document.activeElement.blur === 'function' && document.activeElement.blur(); }
									function trapFocus(){ if(!modalEl) return; const focables = Array.from(modalEl.querySelectorAll(focusSelectors)).filter(el=>!el.hasAttribute('disabled')); if(!focables.length) return; const first=focables[0], last=focables[focables.length-1]; first.focus(); function keyHandler(e){ if(e.key==='Escape'){ fecharJanela(); document.removeEventListener('keydown', keyHandler); } else if(e.key==='Tab'){ if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } } document.addEventListener('keydown', keyHandler); }
									btn.addEventListener('click', abrirJanela);
									modalEl?.querySelectorAll('[data-fechar-janela]').forEach(f=> f.addEventListener('click', fecharJanela));
									modalEl?.addEventListener('mousedown', e=>{ if(e.target === modalEl) fecharJanela(); });
								}

				// modal add course handler
				var addCourseBtn = document.getElementById('modal-course-add');
				if(addCourseBtn) addCourseBtn.addEventListener('click', async function(){
						var nameEl = document.getElementById('modal-course-name');
						var colorEl = document.getElementById('modal-course-color');
						var name = nameEl ? nameEl.value.trim() : '';
						var color = colorEl ? colorEl.value : '#365562';
						if(!name) return;
						if(window.study && window.study.addCourse){
								try{ var id = await window.study.addCourse(name, color); nameEl.value = ''; await loadModalData(); await renderCoursesOnPage(); }catch(e){ /* ignore */ }
						}
				});

				// mount pv tools if available
				try{
						if(!window._pv_tools_mounted){ var host = document.getElementById('studies-tools'); if(host && (!host.children || host.children.length === 0)){ var col1 = document.createElement('div'); var col2 = document.createElement('div'); host.appendChild(col1); host.appendChild(col2); try{ await window.pvStudyTimer?.mount?.(col1); }catch(e){} try{ await window.pvFlashcards?.mount?.(col2); }catch(e){} window._pv_tools_mounted = true; } }
				}catch(e){}

				// initial render
				try{ if(window.renderCoursesOnPage) renderCoursesOnPage(); }catch(e){}
		});

		window.loadModalData = loadModalData; window.renderCoursesOnPage = renderCoursesOnPage;

})();

