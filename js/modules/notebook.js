// UI de Cadernos: lateral com cadernos (ligados a matérias) + abas de páginas e editor na aba ativa
(function (global) {
  "use strict";

  const API = (function(){
    const hasCfg = typeof window !== 'undefined' && window.ProdutivusAPI && window.ProdutivusAPI.endpoints;
    if (hasCfg) {
      const e = window.ProdutivusAPI.endpoints;
      // Garante compatibilidade quando notebook_pages não estiver no config ainda
      const pages = e.notebookPages || (e.base ? (e.base.replace(/\/$/, '') + '/server/api/notebook_pages.php') : 'server/api/notebook_pages.php');
      return {
        notebooks: e.notebooks,
        pages,
        subjects: e.subjects,
        courses: e.courses,
      };
    }
    // Fallback relativo
    return {
      notebooks: 'server/api/notebooks.php',
      pages: 'server/api/notebook_pages.php',
      subjects: 'server/api/subjects.php',
      courses: 'server/api/courses.php',
    };
  })();

  async function jget(url) {
    const r = await fetch(url, { credentials: "same-origin" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function jpost(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function jpatch(url, body) {
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function jdel(url) {
    const r = await fetch(url, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function layout() {
    return `
    <div data-nb-layout>
      <aside data-nb-aside>
        <button class="btn btn-sm btn-outline-secondary mb-2 pv-nb-toggle" type="button" data-nb-toggle-aside title="Colapsar painel" aria-label="Colapsar painel"><i class="bi bi-chevron-double-left" aria-hidden="true"></i></button>
        <div class="pv-nb-content">
								<div class="d-flex align-items-center justify-content-between mb-2">
                  <div class="d-flex align-items-center gap-2 pv-nb-header">
                    <h2 class="h5 m-0">Meus cadernos</h2>
                    <div class="spinner-border spinner-border-sm text-secondary d-none" role="status" aria-hidden="true" data-nb-loading></div>
                  </div>
                <div class="btn-group btn-group-sm nb-actions" role="group" aria-label="Ações de cadernos">
										<button class="btn btn-sm btn-primary" data-nb-refresh title="Atualizar" aria-label="Atualizar"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></button>
										<button class="btn btn-sm btn-primary" data-nb-new title="Novo caderno" aria-label="Novo caderno"><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
										<button class="btn btn-sm btn-secondary" data-nb-new-avulso title="Criar avulso" aria-label="Criar avulso"><i class="bi bi-journal" aria-hidden="true"></i></button>
										<button class="btn btn-sm btn-primary" data-nb-multi-new title="Criar por matérias" aria-label="Criar vários"><i class="bi bi-plus-square" aria-hidden="true"></i></button>
									</div>
								</div>
				<div class="mb-2">
            <select class="form-select form-select-sm" data-nb-course>
              <option value="">— Curso —</option>
              <option value="__none__">Sem curso (avulso)</option>
            </select>
					</div>
					<div class="mb-2">
						<select class="form-select form-select-sm" data-nb-subject>
							<option value="">— Matéria —</option>
						</select>
					</div>
				<div class="input-group input-group-sm mb-2">
					<span class="input-group-text">🔎</span>
					<input type="search" class="form-control" placeholder="Buscar" data-nb-search>
				</div>
				<div class="list-group small" data-nb-list></div>
        </div>
			</aside>
      <section data-nb-main>
				<div class="card nb-card">
					<div class="card-body">
              <ul class="nav nav-tabs align-items-center" data-page-tabs role="tablist"></ul>
						<div class="mt-3" id="nb-editor-host"></div>
					</div>
				</div>
			</section>
		</div>`;
  }

  function showToast(text, type) {
    // Wrapper simplificado usando sistema unificado de avisos (.aviso)
    try {
      if (window.pvShowToast) {
        // mapeia tipos bootstrap para variantes nossas
        const map = { success: 'sucesso', danger: 'erro', warning: 'alerta', info: 'info', primary: 'info', secondary: 'info' };
        const variante = map[type] || (type ? String(type) : '');
        window.pvShowToast(text, { type: variante });
      } else {
        console.log('[notebook] toast:', text);
      }
    } catch(e) {}
  }

  // Novo openModal: reaproveita o markup original do modal e aplica overlay customizado
  function openModal(node, onHidden){
    try {
      const content = node.querySelector('.modal-content') || node;
      const parent = content.parentElement;
      if (!parent) return { hide: ()=>{}, dispose: ()=>{} };
      const placeholder = document.createComment('pv-modal-placeholder');
      parent.insertBefore(placeholder, content);
      parent.removeChild(content);

      const fundo = document.createElement('div');
      fundo.className = 'janela-fundo';
      Object.assign(fundo.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '1150', padding: '1.5rem'
      });

      const caixa = document.createElement('div');
      caixa.className = 'janela janela--dialogo';
      caixa.setAttribute('role', 'dialog');
      caixa.setAttribute('aria-modal', 'true');
      Object.assign(caixa.style, {
        position: 'relative', maxWidth: '720px', width: '100%', maxHeight: '90vh',
        overflow: 'auto', borderRadius: '12px', boxShadow: '0 18px 40px rgba(15,23,42,.35)',
        background: 'transparent', color: '#1e293b', padding: '0'
      });

      content.classList.add('pv-modal-content', 'pv-modal');
      Object.assign(content.style, {
        display: 'block', width: '100%', margin: '0'
      });

      caixa.appendChild(content);
      fundo.appendChild(caixa);
      document.body.appendChild(fundo);

      const closeHandlers = [];
      content.querySelectorAll('[data-dismiss="modal"], .btn-close, [data-cancel]').forEach(btn => {
        const handler = (ev)=>{ ev.preventDefault(); ev.stopPropagation(); fechar(); };
        btn.addEventListener('click', handler);
        closeHandlers.push({ btn, handler });
      });

      let restored = false;
  const escHandler = (e)=>{ if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); fechar(); } };
  document.addEventListener('keydown', escHandler);

      function restore(){
        if (restored) return;
        restored = true;
        closeHandlers.forEach(({ btn, handler })=> btn.removeEventListener('click', handler));
        content.classList.remove('pv-modal-content');
        content.classList.remove('pv-modal');
        content.style.removeProperty('display');
        content.style.removeProperty('margin');
        content.style.removeProperty('width');
        try {
          placeholder.replaceWith(content);
        } catch(e) {
          try { parent.appendChild(content); } catch(_) {}
        }
        document.removeEventListener('keydown', escHandler);
      }

      function fechar(){
        if (!fundo.parentNode) return;
        restore();
        try { fundo.remove(); } catch(e){}
        try { onHidden && onHidden(); } catch(e){}
      }

      fundo.addEventListener('click', (e)=>{ if (e.target === fundo) fechar(); });

      setTimeout(()=>{
        try {
          const focusTarget = caixa.querySelector('[autofocus]') || caixa.querySelector('button, input, select, textarea, [tabindex]');
          (focusTarget || caixa).focus();
        } catch(e){}
      }, 30);

      return { hide: fechar, dispose: fechar };
    } catch(e){
      console.error('[notebook] openModal fallback error', e);
      return { hide: ()=>{}, dispose: ()=>{} };
    }
  }

  function showConfirm(title, message) {
    return new Promise((resolve) => {
  const wrap = el("<div style=\"position:relative; z-index:1060;\"></div>");
      wrap.innerHTML = `
        <div class="modal fade" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${title || "Confirmar"}</h5>
                <button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button>
              </div>
              <div class="modal-body"><p class="m-0">${message || ""}</p></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal" data-cancel>Cancelar</button>
                <button type="button" class="btn btn-sm btn-primary" data-ok>Apagar</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      const node = wrap.firstElementChild;
      const ok = node.querySelector("[data-ok]");
  let decided = false;
  const ctrl = openModal(node, () => { if (!decided) { decided = true; resolve(false); } try { wrap.remove(); } catch(e){} });
  ok.addEventListener("click", () => { if (decided) return; decided = true; resolve(true); try { ctrl.hide(); } catch(e){} try { wrap.remove(); } catch(e){} });
    });
  }

  function colorDot(color) {
    const c = color || "#6c757d";
    return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:6px;border:1px solid rgba(0,0,0,.2);"></span>`;
  }

  function mountNotebooks(host) {
    if (!host || host.getAttribute("data-pv-ignore-mount") === "true") return;
    // desenha layout
    host.innerHTML = layout();

    const els = {
      nbList: host.querySelector("[data-nb-list]"),
      nbSearch: host.querySelector("[data-nb-search]"),
      nbNew: host.querySelector("[data-nb-new]"),
  nbNewAvulso: host.querySelector("[data-nb-new-avulso]"),
      nbMultiNew: host.querySelector("[data-nb-multi-new]"),
      nbRefresh: host.querySelector("[data-nb-refresh]"),
  nbEdit: host.querySelector("[data-nb-edit]"),
      nbLoading: host.querySelector("[data-nb-loading]"),
      nbCourse: host.querySelector("[data-nb-course]"),
      nbSubject: host.querySelector("[data-nb-subject]"),
      pageTabs: host.querySelector("[data-page-tabs]"),
      pageNew: host.querySelector("[data-page-new]"),
      editorHost: host.querySelector("#nb-editor-host"),
  nbCurrentTitle: host.querySelector('[data-nb-current-title]'),
  nbEditInline: host.querySelector('[data-nb-edit-inline]'),
  nbDeleteInline: host.querySelector('[data-nb-delete-inline]'),
  saveStatus: host.querySelector('[data-save-status]'),
    aside: host.querySelector('[data-nb-aside]'),
    main: host.querySelector('[data-nb-main]'),
    layout: host.querySelector('[data-nb-layout]'),
    toggleAside: host.querySelector('[data-nb-toggle-aside]'),
    };

    // Modal: criar cadernos por matérias do curso selecionado
    async function showMultiCreateDialog() {
      const courseId = els.nbCourse.value || "";
      if (!courseId) {
        showToast("Selecione um curso primeiro", "secondary");
        return;
      }
      if (!state.subjects || !state.subjects.length) {
        showToast("Sem matérias para este curso", "secondary");
        return;
      }
  const wrap = el('<div class="position-fixed" style="z-index:1060;"></div>');
      const list = state.subjects
        .map(
          (s) =>
            `<div class="form-check"><input class="form-check-input" type="checkbox" value="${s.id}" data-multi-subject id="ms-${s.id}"><label for="ms-${s.id}" class="form-check-label">${s.name}</label></div>`
        )
        .join("");
      wrap.innerHTML = `
			<div class="modal fade" tabindex="-1" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Criar cadernos por matérias</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>
						<div class="modal-body">
							<div class="mb-2" style="max-height:40vh;overflow:auto;">${list}</div>
							<div class="border-top pt-2">
								<div class="form-check"><input class="form-check-input" type="radio" name="naming" id="nm1" value="subject" checked><label class="form-check-label" for="nm1">Título = nome da matéria</label></div>
								<div class="form-check d-flex align-items-center gap-2 mt-1"><input class="form-check-input" type="radio" name="naming" id="nm2" value="prefix"><label class="form-check-label" for="nm2">Título = Prefixo + nome da matéria</label><input type="text" class="form-control form-control-sm" placeholder="Prefixo" data-multi-prefix style="max-width:200px;" disabled></div>
							</div>
						</div>
						<div class="modal-footer"><button type="button" class="btn btn-sm btn-primary" data-cancel>Cancelar</button><button type="button" class="btn btn-sm btn-primary" data-ok>Criar</button></div>
					</div>
				</div>
			</div>`;
      document.body.appendChild(wrap);
      const node = wrap.firstElementChild;
      const ok = node.querySelector("[data-ok]");
      const cancel = node.querySelector("[data-cancel]");
      const prefixInput = node.querySelector("[data-multi-prefix]");
      node.querySelectorAll('input[name="naming"]').forEach((r) =>
        r.addEventListener("change", () => {
          prefixInput.disabled = node.querySelector("#nm2:checked") === null;
        })
      );
      function getSelected() {
        return Array.from(
          node.querySelectorAll("[data-multi-subject]:checked")
        ).map((i) => parseInt(i.value, 10));
      }
  const ctrl = openModal(node, () => { try { wrap.remove(); } catch(e){} });
  cancel.addEventListener("click", () => { try { ctrl.hide(); } catch(e){} });
      ok.addEventListener("click", async () => {
        const ids = getSelected();
        if (!ids.length)
          return showToast("Selecione ao menos uma matéria", "secondary");
        ok.disabled = true;
        const usePrefix = !!node.querySelector("#nm2:checked");
        const prefix = (prefixInput.value || "").trim();
        const subs = state.subjects.filter((s) => ids.includes(s.id));
        const reqs = subs.map((s) =>
          jpost(API.notebooks, {
            title: usePrefix ? (prefix ? prefix + " " : "") + s.name : s.name,
            subject_id: String(s.id),
          })
        );
        try {
          await Promise.allSettled(reqs);
          showToast("Cadernos criados", "success");
          await loadNotebooks();
        } catch (e) {
          showToast("Falha ao criar alguns cadernos", "danger");
        } finally {
          ok.disabled = false;
          try { ctrl.hide(); } catch(e){}
        }
      });
    }

    // Estado
    const state = {
      courses: [],
      subjects: [],
      notebooks: [],
      pages: [],
      currentNotebookId: null,
      currentPageId: null,
  editorReady: false,
        sidebarCollapsed: false,
    };

    // --- Collapse Sidebar ---
    (function initCollapse(){
      try { state.sidebarCollapsed = localStorage.getItem('pv.nb.sidebarCollapsed') === '1'; } catch(e){}
      function apply(){
        if (!els.layout || !els.aside || !els.main) return;
        const collapsed = !!state.sidebarCollapsed;
        // Mantém as classes Bootstrap; apenas alterna a classe de estado para CSS atuar
        els.layout.classList.toggle('pv-nb-collapsed', collapsed);
        const btn = els.toggleAside;
        if (btn){
          const icon = btn.querySelector('i');
          if (collapsed){
            btn.title = 'Expandir painel'; btn.setAttribute('aria-label','Expandir painel'); if (icon) icon.className='bi bi-chevron-double-right';
          } else { btn.title='Colapsar painel'; btn.setAttribute('aria-label','Colapsar painel'); if (icon) icon.className='bi bi-chevron-double-left'; }
        }
      }
      if (els.toggleAside){
        els.toggleAside.addEventListener('click', ()=>{
          state.sidebarCollapsed = !state.sidebarCollapsed;
          try { localStorage.setItem('pv.nb.sidebarCollapsed', state.sidebarCollapsed ? '1':'0'); } catch(e){}
          apply();
        });
      }
      apply();
    })();

    // --- Persistência de estado (notebook/página/filtros) ---
    (function initStateRestore(){
      try {
        state._restore = {
          lastNotebook: localStorage.getItem('pv.nb.lastNotebook'),
          lastPage: localStorage.getItem('pv.nb.lastPage'),
          lastSubject: localStorage.getItem('pv.nb.lastSubject'),
          lastCourse: localStorage.getItem('pv.nb.lastCourse'),
        };
      } catch(e){}
    })();

    // Inicializa editor
    function ensureEditor() {
      if (state.editorReady) return;
      if (global.mountEditor) {
        // callback de save remoto que agrega cabeçalho/rodapé+margens quando disponível
        const doRemoteSave = async (payload) => {
          if (!state.currentPageId) return;
          const root = els.editorHost.querySelector(".pv-editor");
          let html = payload && payload.html;
          try {
            if (
              root &&
              global.PVEditorPage &&
              typeof global.PVEditorPage.getCompositeHtml === "function"
            ) {
              html = global.PVEditorPage.getCompositeHtml(root);
            }
          } catch (e) {}
          const p = state.pages.find((pg) => pg.id === state.currentPageId);
          const nb = state.notebooks.find(n=> n.id === state.currentNotebookId);
          const subjectId = nb ? nb.subject_id : null;
          // Atualiza UI: iniciando salvamento
          setSaveStatus('saving');
          let attempts = 0;
          const maxAttempts = 3;
          while (attempts < maxAttempts) {
            attempts++;
            try {
              await jpatch(
                API.pages + "?id=" + encodeURIComponent(state.currentPageId),
                {
                  title: (p && p.title) || "Página",
                  subject_id: subjectId,
                  content: html,
                }
              );
              setSaveStatus('saved');
              return;
            } catch(err) {
              if (attempts >= maxAttempts) {
                setSaveStatus('error');
                if (window && window.console) console.warn('[notebooks] Falha ao salvar página após retries', err);
                return;
              }
              // pequeno atraso exponencial
              await new Promise(r=> setTimeout(r, 400 * attempts));
            }
          }
        };

        global.mountEditor(els.editorHost, {
          docId: "nb-editor:" + (state.currentPageId || "default"),
          restore: false,
          remoteSave: doRemoteSave,
        });
        // Insere ações do caderno na toolbar do editor
        try {
          const root = els.editorHost.querySelector('.pv-editor');
          const toolbar = root && root.querySelector('[data-editor-toolbar]');
          if (toolbar && !toolbar.querySelector('[data-nb-toolbar-actions]')) {
            const group = document.createElement('div');
            group.className = 'btn-group';
            group.setAttribute('role','group');
            group.setAttribute('aria-label','Caderno');
            group.setAttribute('data-nb-toolbar-actions','');
            group.innerHTML = `
              <button class="btn btn-outline-secondary" type="button" title="Editar caderno" aria-label="Editar caderno" data-nb-toolbar-edit><i class="bi bi-pencil" aria-hidden="true"></i></button>
              <button class="btn btn-outline-danger" type="button" title="Apagar caderno" aria-label="Apagar caderno" data-nb-toolbar-delete><i class="bi bi-trash" aria-hidden="true"></i></button>
              <button class="btn btn-primary" type="button" title="Nova página" aria-label="Nova página" data-nb-toolbar-new-page><i class="bi bi-plus-lg" aria-hidden="true"></i></button>
            `;
            toolbar.insertBefore(group, toolbar.firstChild);
            // binds
            const btnEdit = group.querySelector('[data-nb-toolbar-edit]');
            const btnDelete = group.querySelector('[data-nb-toolbar-delete]');
            const btnNewPage = group.querySelector('[data-nb-toolbar-new-page]');
            if (btnEdit) btnEdit.addEventListener('click', ()=> showEditNotebookDialog());
            if (btnDelete) btnDelete.addEventListener('click', async ()=>{
              if (!state.currentNotebookId) { showToast('Selecione um caderno', 'secondary'); return; }
              if (await showConfirm('Excluir caderno', 'Tem certeza que deseja excluir este caderno?')) {
                await deleteNotebook();
              }
            });
            if (btnNewPage) btnNewPage.addEventListener('click', ()=> createPage());
          }
        } catch(e) { /* noop */ }
        // guarda referência para reiniciar autosave por página
        try {
          const root = els.editorHost.querySelector(".pv-editor");
          if (root) root._pvRemoteSave = doRemoteSave;
        } catch (e) {}
        state.editorReady = true;
        // Detectar alterações para exibir status "Alterações não salvas" antes do autosave
        try {
          const root = els.editorHost.querySelector('.pv-editor');
          if (root) {
            let unsavedTimer = null;
            root.addEventListener('input', ()=> {
              if (state.savingInProgress) return; // durante salvamento já ficará em "Salvando..."
              setSaveStatus('dirty');
              if (unsavedTimer) clearTimeout(unsavedTimer);
              // fallback: se não salvar por algum motivo em 30s, permanece dirty
              unsavedTimer = setTimeout(()=> { if (els.saveStatus && els.saveStatus.dataset.status === 'dirty') { /* noop */ } }, 30000);
            });
          }
        } catch(e) {}
      }
    }

    function setEditorContent(html) {
      ensureEditor();
      const root = els.editorHost.querySelector(".pv-editor");
      if (
        root &&
        global.PVEditorPage &&
        typeof global.PVEditorPage.setCompositeHtml === "function"
      ) {
        try {
          global.PVEditorPage.setCompositeHtml(root, html || "");
        } catch (e) {
          const area = root.querySelector("[data-editor-area]");
          if (area) area.innerHTML = html || "";
        }
      } else {
        const area = els.editorHost.querySelector("[data-editor-area]");
        if (area) area.innerHTML = html || "";
      }
      // título agora é editado via duplo clique na aba
    }

    // Subjects
    async function loadCourses() {
      try {
        const res = await jget(API.courses);
        state.courses = res.items || [];
        els.nbCourse.innerHTML = ['<option value="">— Curso —</option>','<option value="__none__">Sem curso (avulso)</option>']
          .concat(
            state.courses.map(
              (c) => `<option value="${c.id}">${c.name}</option>`
            )
          )
          .join("");
      } catch (e) {
        state.courses = [];
      }
    }

    async function loadSubjects() {
      try {
        const rawCourse = els.nbCourse.value || "";
        if (rawCourse === "__none__") {
          state.subjects = [];
          const opts = ['<option value="">— Matéria —</option>'];
          els.nbSubject.innerHTML = opts.join("");
          return;
        }
        const courseId = rawCourse;
        const res = await jget(
          API.subjects +
            (courseId ? "?course_id=" + encodeURIComponent(courseId) : "")
        );
        state.subjects = res.items || [];
        const opts = ['<option value="">— Matéria —</option>']
          .concat(
            state.subjects.map(
              (s) => `<option value="${s.id}">${s.name}</option>`
            )
          )
          .join("");
        els.nbSubject.innerHTML = opts;
      } catch (e) {
        state.subjects = [];
      }
    }

    // Notebooks
    function setLoading(flag) {
      if (els.nbLoading) els.nbLoading.classList.toggle("d-none", !flag);
    }

  async function loadNotebooks() {
      try {
        setLoading(true);
        const res = await jget(API.notebooks);
        state.notebooks = res.items || [];
    renderNotebookList();
        if (!state.notebooks.length)
          showToast("Nenhum caderno encontrado no servidor", "secondary");
      } catch (e) {
        const msg = ((e && e.message) || "").includes("HTTP 401")
          ? "Faça login para carregar seus cadernos"
          : "Falha ao carregar cadernos";
        showToast(msg, "danger");
      } finally {
        setLoading(false);
      }
    }

    function renderNotebookList() {
      const q = (els.nbSearch.value || "").toLowerCase();
      const rawCourse = els.nbCourse.value || "";
      const isAvulso = rawCourse === "__none__";
      const courseFilter = !rawCourse || isAvulso ? null : parseInt(rawCourse, 10);
      const subjectFilter = els.nbSubject.value
        ? parseInt(els.nbSubject.value, 10)
        : null;
      els.nbList.innerHTML = "";
      const hasFilter = isAvulso || !!courseFilter || !!subjectFilter;
      if (!hasFilter) {
        // Sem filtros: não mostrar nenhum caderno
        els.nbList.innerHTML = '<div class="text-muted small p-2">Selecione um curso para visualizar seus cadernos.</div>';
        // Limpa seleção/Editor
        clearSelection();
        return;
      }

      const filtered = state.notebooks.filter((n) => {
        const okTitle = !q || (n.title || "").toLowerCase().includes(q);
        if (!okTitle) return false;
        let okCourse = true;
        if (isAvulso) {
          okCourse = (n.subject_id === null || typeof n.subject_id === 'undefined');
        } else if (courseFilter) {
          const subj = state.subjects.find((s) => s.id === n.subject_id);
          okCourse = !!(subj && subj.course_id === courseFilter);
        }
        let okSubject = true;
        if (subjectFilter) {
          okSubject = n.subject_id === subjectFilter;
        }
        return okCourse && okSubject;
      });

      if (!filtered.length) {
        els.nbList.innerHTML = '<div class="text-muted small p-2">Nenhum caderno para este filtro.</div>';
        clearSelection();
        return;
      }

      const visibleIds = new Set(filtered.map(n => n.id));
      if (state.currentNotebookId && !visibleIds.has(state.currentNotebookId)) {
        clearSelection();
      }

      filtered.forEach((n) => {
          const subj = state.subjects.find((s) => s.id === n.subject_id);
          const item =
            el(`<div class="list-group-item d-flex align-items-center gap-2" data-id="${
              n.id
            }">
							<span class="flex-shrink-0">${colorDot(n.color)}</span>
							<span class="nb-title flex-grow-1 text-truncate" title="${n.title || ""}">${
              n.title || ""
            }</span>
							<small class="text-muted me-2">${subj ? subj.name : ""}</small>
							<button type="button" class="btn btn-sm btn-primary" title="Excluir caderno" data-nb-item-delete>&times;</button>
						</div>`);
          if (n.id === state.currentNotebookId) item.classList.add("active");
          item.addEventListener("click", (e) => {
            if (e.target.closest("[data-nb-item-delete]")) return;
            selectNotebook(n.id);
          });
          // excluir via x
          item
            .querySelector("[data-nb-item-delete]")
            .addEventListener("click", async (e) => {
              e.stopPropagation();
              if (
                await showConfirm(
                  "Excluir caderno",
                  "Tem certeza que deseja excluir este caderno?"
                )
              ) {
                await jdel(API.notebooks + "?id=" + encodeURIComponent(n.id));
                if (state.currentNotebookId === n.id) {
                  state.currentNotebookId = null;
                  state.pages = [];
                  state.currentPageId = null;
                  els.pageTabs.innerHTML = "";
                  setEditorContent("");
                }
                await loadNotebooks();
                showToast("Caderno excluído", "warning");
              }
            });
          // renomear por duplo clique
          const titleEl = item.querySelector(".nb-title");
          function startRenameNotebook(){
            const prev = n.title || "";
            const input = document.createElement("input");
            input.type = "text";
            input.className = "form-control form-control-sm";
            input.value = prev;
            titleEl.replaceWith(input);
            input.focus();
            input.select();
            function finish(save) {
              input.replaceWith(titleEl);
              if (save) {
                const val = input.value.trim() || "Caderno";
                titleEl.textContent = val;
                n.title = val;
                jpatch(API.notebooks + "?id=" + encodeURIComponent(n.id), { title: val });
                renderNotebookList();
              }
            }
            input.addEventListener("keydown", (ev) => {
              if (ev.key === "Enter") finish(true);
              if (ev.key === "Escape") finish(false);
            });
            input.addEventListener("blur", () => finish(true));
          }
          titleEl.addEventListener("dblclick", (e) => { e.stopPropagation(); startRenameNotebook(); });
          item.addEventListener("dblclick", (e) => {
            if (e.target.closest("[data-nb-item-delete]")) return;
            e.stopPropagation();
            startRenameNotebook();
          });
          els.nbList.appendChild(item);
        });
    }

    async function selectNotebook(id) {
      state.currentNotebookId = id;
      try { localStorage.setItem('pv.nb.lastNotebook', String(id)); } catch(e){}
      renderNotebookList();
      const nb = state.notebooks.find((n) => n.id === id);
  if (els.nbCurrentTitle) els.nbCurrentTitle.textContent = (nb && nb.title) || '-';
      // renomeio via duplo clique na lista; sem inputs no topo
      await loadPages(id);
    }

    async function showCreateNotebookDialog() {
      // Modal de criação independente dos filtros atuais
      const defaultTitle = "Caderno " + (state.notebooks.length + 1);
      const courseOptions = ['<option value="__none__">Sem curso (avulso)</option>']
        .concat(state.courses.map(c => `<option value="${c.id}">${c.name}</option>`)).join('');
      const wrap = el('<div class="position-fixed" style="z-index:1060;"></div>');
      wrap.innerHTML = `
      <div class="modal fade" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Novo caderno</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label small">Título</label><input type="text" class="form-control form-control-sm" data-new-title value="${defaultTitle}"></div>
              <div class="mb-2"><label class="form-label small">Curso</label><select class="form-select form-select-sm" data-new-course>${courseOptions}</select></div>
              <div class="mb-1"><label class="form-label small">Matéria</label><select class="form-select form-select-sm" data-new-subject disabled><option value="">— Matéria —</option></select></div>
              <div class="form-text">Escolha "Sem curso (avulso)" para criar desvinculado de curso/matéria.</div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-cancel>Cancelar</button><button type="button" class="btn btn-sm btn-primary" data-ok>Criar</button></div>
          </div>
        </div>
      </div>`;
      document.body.appendChild(wrap);
      const node = wrap.firstElementChild;
      const selCourse = node.querySelector('[data-new-course]');
      const selSubject = node.querySelector('[data-new-subject]');
      const inputTitle = node.querySelector('[data-new-title]');
      async function refreshSubjOptions() {
        const v = selCourse.value;
        if (v === '__none__') { selSubject.innerHTML = '<option value="">— Matéria —</option>'; selSubject.disabled = true; return; }
        selSubject.disabled = false;
        try {
          const res = await jget(API.subjects + '?course_id=' + encodeURIComponent(v));
          const items = (res && res.items) || [];
          selSubject.innerHTML = ['<option value="">— Matéria —</option>'].concat(items.map(s=> `<option value="${s.id}">${s.name}</option>`)).join('');
        } catch(e) { selSubject.innerHTML = '<option value="">— Matéria —</option>'; }
      }
      selCourse.addEventListener('change', refreshSubjOptions);
      // abre modal
      const ctrl = openModal(node, () => { try { wrap.remove(); } catch(e){} });
      node.querySelector('[data-cancel]').addEventListener('click', ()=> { try { ctrl.hide(); } catch(e){} });
      node.querySelector('[data-ok]').addEventListener('click', async ()=>{
        const title = (inputTitle.value||'').trim() || 'Caderno';
        const cv = selCourse.value;
        let subjectId = null;
        if (cv !== '__none__') {
          const sv = selSubject.value || '';
          if (!sv) { showToast('Selecione uma matéria', 'secondary'); return; }
          subjectId = parseInt(sv,10);
        }
        try {
          const res = await jpost(API.notebooks, { title, subject_id: subjectId });
          showToast('Caderno criado', 'success');
          await loadNotebooks();
          if (res && typeof res.id !== 'undefined') { selectNotebook(res.id); }
        } catch(e) {
          const msg = ((e && e.message) || '').includes('HTTP 401') ? 'Faça login para criar cadernos' : 'Falha ao criar caderno';
          showToast(msg, 'danger');
        }
        try { ctrl.hide(); } catch(e){}
      });
    }

    async function createNotebookAvulso() {
      const title = "Caderno " + (state.notebooks.length + 1);
      await jpost(API.notebooks, { title, subject_id: null });
      await loadNotebooks();
      showToast("Caderno avulso criado", "success");
    }

    // metadados de caderno via dblclick e botão x na lista

    async function deleteNotebook() {
      if (!state.currentNotebookId) return;
      await jdel(
        API.notebooks + "?id=" + encodeURIComponent(state.currentNotebookId)
      );
      state.currentNotebookId = null;
      state.pages = [];
      state.currentPageId = null;
      els.pageTabs.innerHTML = "";
  if (els.nbCurrentTitle) els.nbCurrentTitle.textContent = '-';
      setEditorContent("");
      await loadNotebooks();
      showToast("Caderno excluído", "warning");
    }

    // Pages
    async function loadPages(nid) {
      const res = await jget(
        API.pages + "?notebook_id=" + encodeURIComponent(nid)
      );
  state.pages = res.items || [];
      renderTabs();
      if (state.pages.length) {
        selectPage(state.pages[0].id);
      } else {
        state.currentPageId = null;
        setEditorContent("");
      }
    }

    function renderTabs() {
      els.pageTabs.innerHTML = "";
      state.pages.forEach((p) => {
    const li = el(`<li class="nav-item" role="presentation">
          <button class="nav-link nb-tab-link d-flex align-items-center gap-2" type="button">
            <span class="tab-title text-truncate">${
        p.title || "Página"
      }</span>
            <span role="button" class="nb-tab-close" title="Excluir página" data-page-close aria-label="Excluir página">&times;</span>
          </button>
        </li>`);
        const btnEl = li.querySelector('.nav-link');
        if (p.id === state.currentPageId)
          btnEl.classList.add("active");
        // Clique simples seleciona a aba; use timer para não interferir com dblclick de renomeação
        let tabClickTimer = null;
        li.addEventListener("click", (e) => {
          if (e.target.closest("[data-page-close]") || e.detail > 1) return;
          if (tabClickTimer) { clearTimeout(tabClickTimer); tabClickTimer = null; }
          tabClickTimer = setTimeout(() => { selectPage(p.id); tabClickTimer = null; }, 200);
        });
        li.querySelector("[data-page-close]").addEventListener(
          "click",
          async (e) => {
            e.stopPropagation();
            if (
              await showConfirm(
                "Excluir página",
                "Tem certeza que deseja excluir esta página?"
              )
            ) {
              await deletePage(p.id);
              showToast("Página excluída", "warning");
            }
          }
        );
        // Renomear por duplo clique (no título ou em qualquer área da aba, exceto botão fechar)
        function startRenameTab() {
          if (tabClickTimer) { clearTimeout(tabClickTimer); tabClickTimer = null; }
          const titleEl = btnEl.querySelector('.tab-title');
          if (!titleEl) return;
          const prev = p.title || "Página";
          const input = document.createElement("input");
          input.type = "text";
          input.className = "form-control form-control-sm";
          input.value = prev;
          input.style.maxWidth = "200px";
          titleEl.replaceWith(input);
          input.focus();
          input.select();
          function finish(save) {
            input.replaceWith(titleEl);
            if (save) {
              const val = input.value.trim() || "Página";
              titleEl.textContent = val;
              p.title = val;
              jpatch(API.pages + "?id=" + encodeURIComponent(p.id), { title: val });
              renderTabs();
            }
          }
          input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") finish(true);
            if (ev.key === "Escape") finish(false);
          });
          input.addEventListener("blur", () => finish(true));
        }
        btnEl.addEventListener('dblclick', (e) => {
          if (e.target.closest('[data-page-close]')) return;
          e.stopPropagation();
          if (tabClickTimer) { clearTimeout(tabClickTimer); tabClickTimer = null; }
          startRenameTab();
        });
        const titleEl = li.querySelector('.tab-title');
        if (titleEl) titleEl.addEventListener('dblclick', (e) => { e.stopPropagation(); if (tabClickTimer) { clearTimeout(tabClickTimer); tabClickTimer = null; } startRenameTab(); });
        els.pageTabs.appendChild(li);
      });
      // aba de + nova página
      const addLi = el(
        `<li class="nav-item" role="presentation"><button class="nav-link nb-tab-link" type="button" data-page-new title="Nova página" aria-label="Nova página"><i class="bi bi-plus-lg" aria-hidden="true"></i></button></li>`
      );
      addLi.addEventListener("click", createPage);
      els.pageTabs.appendChild(addLi);
    }

    function selectPage(id) {
      state.currentPageId = id;
      try { localStorage.setItem('pv.nb.lastPage', String(id)); } catch(e){}
      renderTabs();
  const p = state.pages.find((pg) => pg.id === id);
      if (!p) {
        setEditorContent("");
        return;
      }
      setEditorContent(p.content || "");
      // reinicia autosave para usar um draft por página
      try {
        const root = els.editorHost.querySelector(".pv-editor");
        if (root && global.PVEditorStorage) {
          if (root._pvStorage && typeof root._pvStorage.stop === "function")
            root._pvStorage.stop();
          root._pvStorage = global.PVEditorStorage.startAutoSave(root, {
            docId: "nb-editor:" + state.currentPageId,
            restore: false,
            remoteSave: root._pvRemoteSave,
          });
        }
      } catch (e) {}
    }

    async function createPage() {
      if (!state.currentNotebookId) return;
      const title = "Página " + (state.pages.length + 1);
      const res = await jpost(API.pages, {
        notebook_id: state.currentNotebookId,
        title,
      });
      await loadPages(state.currentNotebookId);
      selectPage(res.id);
      showToast("Página criada", "success");
    }

    async function deletePage(pageId) {
      await jdel(API.pages + "?id=" + encodeURIComponent(pageId));
      const idx = state.pages.findIndex((pg) => pg.id === pageId);
      if (idx >= 0) state.pages.splice(idx, 1);
      renderTabs();
      if (state.pages.length) {
        selectPage(state.pages[0].id);
      } else {
        state.currentPageId = null;
        setEditorContent("");
      }
    }

  // Atualiza metadados da página passou a herdar do caderno (sem seletor próprio)

    // Binds
    els.nbNew.setAttribute("role", "button");
  els.nbMultiNew && els.nbMultiNew.setAttribute("role", "button");
    els.nbRefresh.setAttribute("role", "button");
  els.nbNew.addEventListener("click", showCreateNotebookDialog);
  if (els.nbNewAvulso) els.nbNewAvulso.addEventListener("click", createNotebookAvulso);
    if (els.nbMultiNew)
      els.nbMultiNew.addEventListener("click", showMultiCreateDialog);
    els.nbSearch.addEventListener("input", renderNotebookList);
    els.nbRefresh.addEventListener("click", loadNotebooks);
    els.nbCourse.addEventListener("change", async () => {
      await loadSubjects();
      renderNotebookList();
      try { localStorage.setItem('pv.nb.lastCourse', els.nbCourse.value||''); } catch(e){}
    });
  els.nbSubject.addEventListener("change", renderNotebookList);
  els.nbSubject.addEventListener('change', ()=> { try { localStorage.setItem('pv.nb.lastSubject', els.nbSubject.value||''); } catch(e){} });
    if (els.pageNew) els.pageNew.addEventListener("click", createPage);
  if (els.nbEdit) els.nbEdit.addEventListener("click", showEditNotebookDialog);
    if (els.nbEditInline) els.nbEditInline.addEventListener('click', showEditNotebookDialog);
    if (els.nbDeleteInline) els.nbDeleteInline.addEventListener('click', async ()=>{
      if (!state.currentNotebookId) { showToast('Selecione um caderno', 'secondary'); return; }
      if (await showConfirm('Excluir caderno', 'Tem certeza que deseja excluir este caderno?')) {
        await deleteNotebook();
      }
    });

    // Boot
    (async function () {
  await loadCourses();
      await loadSubjects();
      await loadNotebooks();
      ensureEditor();
      // restaurar seleção
      try {
        const ln = state._restore && state._restore.lastNotebook ? parseInt(state._restore.lastNotebook,10) : null;
        if (state._restore && state._restore.lastCourse && els.nbCourse){
          const opt = Array.from(els.nbCourse.options).find(o=> o.value===state._restore.lastCourse);
          if (opt){ els.nbCourse.value = state._restore.lastCourse; await loadSubjects(); }
        }
        if (ln && state.notebooks.some(n=> n.id===ln)) {
          await selectNotebook(ln);
          const lp = state._restore && state._restore.lastPage ? parseInt(state._restore.lastPage,10) : null;
          if (lp && state.pages.some(p=> p.id===lp)) { selectPage(lp); }
        }
        if (state._restore && state._restore.lastSubject && els.nbSubject) {
          const opt = Array.from(els.nbSubject.options).find(o=> o.value===state._restore.lastSubject);
          if (opt) { els.nbSubject.value = state._restore.lastSubject; renderNotebookList(); }
        }
      } catch(e){}
    })();

    // --- Status de salvamento ---
    function setSaveStatus(status) {
      if (!els.saveStatus) return;
      const el = els.saveStatus;
      el.dataset.status = status;
      const now = new Date();
      const ts = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      switch(status){
        case 'saving': el.textContent = 'Salvando…'; el.className='text-warning small'; state.savingInProgress = true; break;
        case 'saved': el.textContent = 'Salvo às ' + ts; el.className='text-success small'; state.savingInProgress = false; break;
        case 'error': el.textContent = 'Erro ao salvar'; el.className='text-danger small'; state.savingInProgress = false; break;
        case 'dirty': el.textContent = 'Alterações não salvas'; el.className='text-muted small'; break;
        default: el.textContent = '—'; el.className='text-muted small'; state.savingInProgress = false; break;
      }
    }
    // Reset status ao trocar página ou caderno
    const originalSelectNotebook = selectNotebook;
    selectNotebook = async function(id){
      await originalSelectNotebook(id);
      setSaveStatus('saved');
    };
    const originalSelectPage = selectPage;
    selectPage = function(id){
      originalSelectPage(id);
      setSaveStatus('saved');
    };

    function clearSelection() {
      state.currentNotebookId = null;
      state.pages = [];
      state.currentPageId = null;
      if (els.pageTabs) els.pageTabs.innerHTML = "";
      if (els.nbCurrentTitle) els.nbCurrentTitle.textContent = '-';
      setEditorContent("");
    }

    async function showEditNotebookDialog() {
      if (!state.currentNotebookId) { showToast("Selecione um caderno", "secondary"); return; }
      const nb = state.notebooks.find(n=> n.id === state.currentNotebookId);
      const subj = nb ? state.subjects.find(s=> s.id === nb.subject_id) : null;
      // montar opções de curso (inclui Avulso) e matérias
      const courseOptions = ['<option value="__none__">Sem curso (avulso)</option>']
        .concat(state.courses.map(c=> `<option value="${c.id}">${c.name}</option>`)).join('');
  const wrap = el('<div class="position-fixed" style="z-index:1060;"></div>');
      wrap.innerHTML = `
      <div class="modal fade" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Editar caderno</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label small">Título</label><input type="text" class="form-control form-control-sm" data-ed-title value="${(nb && nb.title) || ''}"></div>
              <div class="mb-2"><label class="form-label small">Curso</label><select class="form-select form-select-sm" data-ed-course>${courseOptions}</select></div>
              <div class="mb-1"><label class="form-label small">Matéria</label><select class="form-select form-select-sm" data-ed-subject><option value="">— Matéria —</option></select></div>
              <div class="form-text">Escolha "Sem curso (avulso)" para desvincular este caderno.</div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-sm btn-secondary" data-cancel>Cancelar</button><button type="button" class="btn btn-sm btn-primary" data-ok>Salvar</button></div>
          </div>
        </div>
      </div>`;
      document.body.appendChild(wrap);
      const node = wrap.firstElementChild;
      const selCourse = node.querySelector('[data-ed-course]');
      const selSubject = node.querySelector('[data-ed-subject]');
      const inputTitle = node.querySelector('[data-ed-title]');
      // preset
      if (subj && subj.course_id) selCourse.value = String(subj.course_id);
      else selCourse.value = '__none__';
      async function refreshSubjOptions() {
        const v = selCourse.value;
        if (v === '__none__') { selSubject.innerHTML = '<option value="">— Matéria —</option>'; selSubject.disabled = true; return; }
        selSubject.disabled = false;
        // carregar matérias do curso selecionado (reusa API direta)
        try {
          const res = await jget(API.subjects + '?course_id=' + encodeURIComponent(v));
          const items = (res && res.items) || [];
          selSubject.innerHTML = ['<option value="">— Matéria —</option>'].concat(items.map(s=> `<option value="${s.id}">${s.name}</option>`)).join('');
          if (nb && nb.subject_id) selSubject.value = String(nb.subject_id);
        } catch(e) { selSubject.innerHTML = '<option value="">— Matéria —</option>'; }
      }
      selCourse.addEventListener('change', refreshSubjOptions);
      await refreshSubjOptions();
      // abrir modal
  const ctrl = openModal(node, () => { try { wrap.remove(); } catch(e){} });
      // ações
      node.querySelector('[data-cancel]').addEventListener('click', ()=> { try { ctrl.hide(); } catch(e){} });
      node.querySelector('[data-ok]').addEventListener('click', async ()=>{
        const newTitle = (inputTitle.value||'').trim() || 'Caderno';
        const cv = selCourse.value;
        let newSubjectId = null;
        if (cv !== '__none__') {
          const sv = selSubject.value || '';
          if (!sv) { showToast('Selecione uma matéria', 'secondary'); return; }
          newSubjectId = parseInt(sv,10);
        }
        try {
          await jpatch(API.notebooks + '?id=' + encodeURIComponent(nb.id), { title: newTitle, subject_id: newSubjectId });
          showToast('Caderno atualizado', 'success');
          await loadNotebooks();
          selectNotebook(nb.id);
        } catch(e) { showToast('Falha ao atualizar', 'danger'); }
        try { ctrl.hide(); } catch(e){}
      });
    }
  }

  global.mountNotebooks = mountNotebooks;
})(window);
