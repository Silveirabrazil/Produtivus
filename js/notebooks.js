(function(){
  // TODO: migrar notebooks para API servidor (notebooks.php, notebook_pages.php) similar às tarefas.
  const LS_KEY = 'pv_notebooks';

  /* helpers DOM */
  function qs(sel, root = document){ return root.querySelector(sel); }
  function qsa(sel, root = document){ return Array.from((root||document).querySelectorAll(sel)); }
  function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,10); }
  function now(){ return (new Date()).toISOString(); }

  /* lightweight pvShow wrappers (usa window.pvShow* se existir) */
  const pv = {
    toast(msg, opts){ if(window.pvShowToast) return window.pvShowToast(msg, opts); createInlineToast(msg, opts); },
    async confirm(msg){ if(window.pvShowConfirm) return window.pvShowConfirm(msg); return Promise.resolve(confirm(msg)); },
    async prompt(msg, def=''){ if(window.pvShowPrompt) return window.pvShowPrompt(msg, def); const r = prompt(msg, def); return Promise.resolve(r); }
  };

  function createInlineToast(msg, opts={}){
    const c = document.querySelector('#pv-snackbar-container') || (() => {
      const el = document.createElement('div'); el.id='pv-snackbar-container';
      el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px'; el.style.display='flex'; el.style.flexDirection='column'; el.style.gap='8px'; el.style.zIndex = 99999;
      document.body.appendChild(el); return el;
    })();
    const el = document.createElement('div'); el.className='pv-snack'; el.textContent = msg;
    el.style.cssText = `background:${opts.background||'rgba(32,52,58,0.94)'};color:${opts.color||'#fff'};padding:10px 14px;border-radius:8px;max-width:360px;`;
    c.appendChild(el);
    const t = opts.timeout === 0 ? null : (opts.timeout || 3000);
    if(t) setTimeout(()=> el.remove(), t);
  }

  /* server state & API */
  const API_BASE = `${location.origin}/server/api`;
  let notebooks = []; // [{id,title,color,created,pages_count}]
  const pagesCache = new Map(); // notebook_id -> pages[]
  let currentNotebookId = null;

  async function apiGet(path){
    const r = await fetch(`${API_BASE}/${path}`, { credentials:'same-origin' });
    if(!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  async function apiSend(path, method, body){
    const r = await fetch(`${API_BASE}/${path}`, { method, headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: body?JSON.stringify(body):undefined });
    const j = await r.json().catch(()=>null);
    if(!r.ok || !j?.success) throw new Error(j?.message||`Falha ${method} ${path}`);
    return j;
  }
  async function loadServerNotebooks(){
    const j = await apiGet('notebooks.php');
    notebooks = Array.isArray(j.items) ? j.items : [];
  }
  async function loadPages(nid){
    if(pagesCache.has(nid)) return pagesCache.get(nid);
    const j = await apiGet(`notebook_pages.php?notebook_id=${encodeURIComponent(nid)}`);
    const items = Array.isArray(j.items) ? j.items : [];
    pagesCache.set(nid, items);
    return items;
  }
  async function createServerNotebook(title, color){ const j = await apiSend('notebooks.php', 'POST', { title, color }); return j.id; }
  async function updateServerNotebook(id, fields){ await apiSend(`notebooks.php?id=${encodeURIComponent(id)}`, 'PUT', fields||{}); }
  async function deleteServerNotebook(id){ await apiSend(`notebooks.php?id=${encodeURIComponent(id)}`, 'DELETE'); }
  async function createServerPage(nid, title, color, content){ const j = await apiSend('notebook_pages.php', 'POST', { notebook_id: nid, title, color, content }); return j.id; }
  async function updateServerPage(id, fields){ await apiSend(`notebook_pages.php?id=${encodeURIComponent(id)}`, 'PUT', fields||{}); }
  async function deleteServerPage(id){ await apiSend(`notebook_pages.php?id=${encodeURIComponent(id)}`, 'DELETE'); }

  /* RENDER */
  async function render(host){
    try{
      await loadServerNotebooks();
      if(!notebooks.length){
        const nbId = await createServerNotebook('Caderno', '#F1D9B5');
        const pid = await createServerPage(nbId, 'Página 1', '#F5E7D0', '<p>Nova página</p>');
        pagesCache.set(nbId, [{ id: String(pid), title: 'Página 1', color:'#F5E7D0', content:'<p>Nova página</p>', created: now(), updated: now() }]);
        await loadServerNotebooks();
      }
    } catch(e){ pv.toast('Erro ao carregar cadernos'); }
    const html = `
  <div class="notebooks-wrap">
        <aside class="nb-sidebar">
          <div class="nb-sidebar-header">
            <div style="display:flex;gap:8px">
              <button id="nb-new" class="btn small">+ Novo</button>
            </div>
          </div>
          <div id="nb-list" class="nb-list"></div>
        </aside>

        <section class="nb-main">
          <div id="nb-empty" class="nb-empty small muted">Selecione um caderno.</div>

          <div id="nb-editor" class="nb-editor hidden">
            <div class="nb-editor-header">
              <div class="nb-head-titles">
                <div id="nb-title" class="nb-title" title="Clique duas vezes para renomear" data-nb-id=""></div>
                <div id="nb-subtitle" class="small muted"></div>
              </div>

              <nav class="nb-header-actions" aria-label="Ações do caderno">
                <div class="nb-actions-group">
                  <button id="note-new" class="btn-ghost small" title="Adicionar página">+ Página</button>
                  <button id="nb-rename" class="btn-ghost small" title="Renomear caderno">Renomear</button>
                  <button id="nb-delete" class="btn-ghost small btn-danger" title="Excluir caderno">Excluir</button>
                </div>
                <div class="nb-actions-sep" aria-hidden="true"></div>
                <div class="nb-actions-group">
                  <button id="nb-import" class="btn-ghost small" title="Importar cadernos">Importar</button>
                  <button id="nb-export" class="btn-ghost small" title="Exportar cadernos">Exportar</button>
                  <button id="nb-print" class="btn-ghost small" title="Imprimir página">Imprimir</button>
                </div>
              </nav>
            </div>

            <div id="pages-bar" class="pages-bar"></div>

            <div class="editor-wrapper">
              <div class="editor-toolbar" id="editor-toolbar">
                <select id="toolbar-font" style="border-radius:6px;padding:6px">
                  <option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Courier New">Courier New</option>
                </select>
                <select id="toolbar-size" style="border-radius:6px;padding:6px">
                  <option value="3">11px</option><option value="4">13px</option><option value="5">16px</option><option value="6">18px</option>
                </select>
                <button data-cmd="bold" class="btn-ghost small">B</button>
                <button data-cmd="italic" class="btn-ghost small">I</button>
                <button data-cmd="underline" class="btn-ghost small">U</button>
                <button data-cmd="insertUnorderedList" class="btn-ghost small">• Lista</button>
                <button data-cmd="insertOrderedList" class="btn-ghost small">1. Lista</button>
                <button data-cmd="justifyLeft" class="btn-ghost small">≡ L</button>
                <button data-cmd="justifyCenter" class="btn-ghost small">≡ C</button>
                <button data-cmd="justifyRight" class="btn-ghost small">≡ R</button>
                <input id="toolbar-forecolor" type="color" title="Cor do texto" style="width:34px;height:28px;border-radius:6px;border:0" />
                <input id="toolbar-backcolor" type="color" title="Cor de fundo" style="width:34px;height:28px;border-radius:6px;border:0" />
                <button data-cmd="formatBlock" data-value="blockquote" class="btn-ghost small">❝</button>
                <button data-cmd="removeFormat" class="btn-ghost small">Tx</button>
                <button data-cmd="createLink" class="btn-ghost small">🔗</button>
                <button data-cmd="insertImage" class="btn-ghost small">🖼</button>
                <div style="flex:1"></div>
                <button id="page-save" class="btn btn-primary small">Salvar</button>
              </div>

              <div id="editor-area" class="editor-area" contenteditable="true" spellcheck="true"></div>
              <input type="file" id="nb-image-upload" accept="image/*" style="display:none" />
            </div>

            <div class="editor-footer small muted" id="editor-footer"></div>
          </div>
        </section>
      </div>

      <!-- modal para configurar aba -->
      <div id="nb-tab-modal-overlay" class="overlay hidden" aria-hidden="true">
        <div class="modal">
          <div class="modal-header"><h3 id="nb-tab-modal-title">Configurar aba</h3><button id="nb-tab-modal-close" class="btn-ghost">✕</button></div>
          <div class="modal-body">
            <label class="small">Nome da aba</label>
            <input id="nb-tab-name" class="note-title" />
            <label class="small" style="margin-top:8px">Cor da aba</label>
            <div id="nb-tab-colors" style="display:flex;gap:8px;margin-top:6px"></div>
          </div>
          <div class="modal-footer">
            <button id="nb-tab-save" class="btn btn-primary">Salvar</button>
            <button id="nb-tab-cancel" class="btn">Cancelar</button>
          </div>
        </div>
      </div>
    `;
  host.innerHTML = html;
  renderSidebar();
  }

  /* SIDEBAR */
  function renderSidebar(){
    const list = qs('#nb-list');
    if(!list) return;
    list.innerHTML = '';
    notebooks.forEach(nb=>{
      const el = document.createElement('div');
      el.className = 'nb-item';
      el.dataset.id = nb.id;
      const count = typeof nb.pages_count === 'number' ? nb.pages_count : (Array.isArray(nb.pages)? nb.pages.length : 0);
      el.innerHTML = `<div><div class="nb-name">${nb.title}</div><div class="nb-count small muted">${count} páginas</div></div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="nb-action-rename btn-ghost" data-id="${nb.id}" title="Renomear">✎</button>
          <button class="nb-action-delete btn-ghost" data-id="${nb.id}" title="Excluir">🗑</button>
        </div>`;
      list.appendChild(el);
    });
  }

  /* PAGES BAR */
  function renderPagesBar(nb){
    const bar = qs('#pages-bar');
    if(!bar) return;
    bar.innerHTML = ''; // limpa apenas as abas/controls de paginação

    const frag = document.createDocumentFragment();

  const pages = pagesCache.get(nb.id) || [];
  pages.forEach(p => {
      const el = document.createElement('div');
      el.className = 'page-tab';
      el.dataset.pageId = p.id;
      el.style.borderLeft = `6px solid ${p.color||'#e3d8c2'}`;
      el.innerHTML = `
        <span class="page-title" title="Clique duas vezes para renomear">${p.title}</span>
        <button class="btn-ghost page-action-delete" data-page-id="${p.id}" title="Excluir página" style="margin-left:8px;opacity:.6">🗑</button>
      `;
      el.addEventListener('click', (ev)=> {
        if(ev.target.closest('.page-action-delete')) return;
        loadPage(nb.id, p.id);
      });
      el.addEventListener('dblclick', (ev)=> {
        const t = ev.target.closest('.page-title');
        if(t){
          ev.stopPropagation();
          inlineRenamePage(nb.id, p.id, t);
        } else {
          openTabModal(nb.id, p.id);
        }
      });
      frag.appendChild(el);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn small';
    addBtn.textContent = '+';
    addBtn.title = 'Adicionar página';
    addBtn.onclick = ()=> addPage(nb.id);
    frag.appendChild(addBtn);

    bar.appendChild(frag);
  }

  function inlineRenamePage(nbId, pageId, el){
    const nb = notebooks.find(x=>String(x.id)===String(nbId)); if(!nb) return;
    const pages = pagesCache.get(nbId)||[]; const p = pages.find(x=>String(x.id)===String(pageId)); if(!p) return;
    const prev = p.title;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = prev;
    input.className = 'nb-inline-input';
    input.style.minWidth = '120px';
    el.replaceWith(input);
    input.focus();
    input.select();
    const done = (commit)=>{
      const v = (commit ? input.value.trim() : prev) || prev;
  p.title = v;
  updateServerPage(pageId, { title: v }).catch(()=>{});
  renderPagesBar(nb);
  loadPage(nbId, pageId);
    };
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ done(true); } if(e.key==='Escape'){ done(false); } });
    input.addEventListener('blur', ()=> done(true));
  }

  /* OPEN / NAV */
  async function openNotebook(id){
    const nb = notebooks.find(x=>String(x.id)===String(id));
    if(!nb) return;
    currentNotebookId = nb.id;
    if(!pagesCache.has(nb.id)){
      try { await loadPages(nb.id); } catch(e){ pv.toast('Erro ao carregar páginas'); pagesCache.set(nb.id, []); }
    }
    qs('#nb-empty') && qs('#nb-empty').classList.add('hidden');
    const ed = qs('#nb-editor'); ed && ed.classList.remove('hidden');
  const t = qs('#nb-title');
  t.textContent = nb.title; t.dataset.nbId = nb.id;
  t.dataset.editable = '1';
    const pages = pagesCache.get(nb.id)||[];
    qs('#nb-subtitle').textContent = `${pages.length} páginas` + (nb.created ? ` • criado ${new Date(nb.created).toLocaleDateString()}` : '');
    renderPagesBar(nb);
    if(pages.length) loadPage(nb.id, pages[0].id);
  }

  function enableInlineRenameNotebook(){
    const t = qs('#nb-title'); if(!t) return;
    t.addEventListener('dblclick', async ()=>{
      const nbId = t.dataset.nbId; if(!nbId) return;
  const nb = notebooks.find(x=>String(x.id)===String(nbId)); if(!nb) return;
  const prev = nb.title;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = prev;
      input.className = 'nb-inline-input';
      input.style.fontWeight = '700';
      t.replaceWith(input);
      input.focus(); input.select();
      const commit = (ok)=>{
        const v = (ok ? input.value.trim() : prev) || prev;
        nb.title = v; updateServerNotebook(nbId, { title: v }).catch(()=>{});
        renderSidebar(); openNotebook(nbId);
      };
      input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ commit(true); } if(e.key==='Escape'){ commit(false); } });
      input.addEventListener('blur', ()=> commit(true));
    });
  }

  async function loadPage(nbId, pageId){
    const data = load(); const nb = data.find(x=>x.id===nbId); if(!nb) return;
    const p = (nb.pages||[]).find(x=>x.id===pageId); if(!p) return;
    const editor = qs('#editor-area');
    editor.innerHTML = p.content || '';
    editor.dataset.nbId = nbId; editor.dataset.pageId = pageId;
    editor.dataset.dirty = '';
    qs('#editor-footer').textContent = `Atualizado: ${p.updated ? new Date(p.updated).toLocaleString() : ''}`;
    // marca aba ativa
    qsa('.page-tab').forEach(t=> t.classList.toggle('active', t.dataset.pageId === pageId));
  }

  /* CRUD */
  async function createNotebook(){
    const title = await pv.prompt('Título do caderno:', 'Caderno');
    if(title === null) return;
    try{
      const nbId = await createServerNotebook((title||'Caderno').trim(), '#F1D9B5');
      await createServerPage(nbId, 'Página 1', '#F5E7D0', '<p>Nova página</p>');
      await loadServerNotebooks();
      pagesCache.delete(nbId);
      renderSidebar(); openNotebook(nbId);
      pv.toast('Caderno criado');
    } catch(e){ pv.toast('Erro ao criar caderno', { background:'#b94a4a' }); }
  }

  async function addPage(nbId){
    try{
      const pages = pagesCache.get(nbId) || [];
      const title = `Página ${pages.length+1}`;
      const pid = await createServerPage(nbId, title, '#F5E7D0', '<p>Nova página</p>');
      pagesCache.delete(nbId);
      await loadPages(nbId);
      const nb = notebooks.find(x=>String(x.id)===String(nbId));
      renderPagesBar(nb);
      loadPage(nbId, String(pid));
      pv.toast('Página adicionada');
    } catch(e){ pv.toast('Erro ao adicionar página', { background:'#b94a4a' }); }
  }

  async function deletePage(nbId, pageId){
    const ok = await pv.confirm('Excluir esta página?');
    if(!ok) return;
    try{
      await deleteServerPage(pageId);
      pagesCache.delete(nbId);
      await loadPages(nbId);
      const nb = notebooks.find(x=>String(x.id)===String(nbId));
      renderPagesBar(nb);
      renderSidebar();
      openNotebook(nbId);
      pv.toast('Página excluída');
    } catch(e){ pv.toast('Erro ao excluir página', { background:'#b94a4a' }); }
  }

  async function deleteNotebook(nbId){
    const ok = await pv.confirm('Excluir caderno e todas as páginas?');
    if(!ok) return;
    try{
      await deleteServerNotebook(nbId);
      pagesCache.delete(nbId);
      await loadServerNotebooks();
      renderSidebar();
      qs('#nb-editor') && qs('#nb-editor').classList.add('hidden');
      qs('#nb-empty') && qs('#nb-empty').classList.remove('hidden');
      pv.toast('Caderno excluído');
    } catch(e){ pv.toast('Erro ao excluir caderno', { background:'#b94a4a' }); }
  }

  /* SAVE PAGE */
  async function saveCurrentPage(){
    const editor = qs('#editor-area'); if(!editor) return;
    const nbId = editor.dataset.nbId; const pageId = editor.dataset.pageId; if(!nbId || !pageId) return;
    const pages = pagesCache.get(nbId)||[]; const p = pages.find(x=>String(x.id)===String(pageId)); if(!p) return;
    const content = editor.innerHTML;
    p.content = content; p.updated = now();
    try{ await updateServerPage(pageId, { content }); } catch(e){ /* manter cache local */ }
    editor.dataset.dirty = '';
    qs('#editor-footer').textContent = `Último salvamento: ${new Date().toLocaleTimeString()}`;
    pv.toast('Salvo', { timeout: 1200 });
  }

  /* IMPORT / EXPORT / PRINT */
  async function exportAll(){
    try{
      await loadServerNotebooks();
      const out = [];
      for(const nb of notebooks){
        const pages = await loadPages(nb.id);
        out.push({ id: nb.id, title: nb.title, color: nb.color, created: nb.created, pages: pages.map(p=> ({ id:p.id, title:p.title, color:p.color, content:p.content, created:p.created, updated:p.updated })) });
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'notebooks.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      pv.toast('Exportado');
    } catch(e){ pv.toast('Erro ao exportar', { background:'#b94a4a' }); }
  }

  function importJson(file){
    const r = new FileReader();
    r.onload = async ()=> {
      try {
        const parsed = JSON.parse(r.result);
        if(!Array.isArray(parsed)) throw new Error('Formato inválido');
        for(const nb of parsed){
          const nbId = await createServerNotebook(nb.title||'Caderno', nb.color||null);
          if(Array.isArray(nb.pages)){
            for(const p of nb.pages){ await createServerPage(nbId, p.title||'Página', p.color||null, p.content||''); }
          }
        }
        await loadServerNotebooks();
        renderSidebar();
        pv.toast('Importado com sucesso');
      } catch(e){ pv.toast('Erro ao importar: ' + e.message, { background:'#b94a4a' }); }
    };
    r.readAsText(file);
  }

  function printCurrent(){
    const editor = qs('#editor-area');
    if(!editor) { pv.toast('Nada para imprimir'); return; }
    const title = qs('#nb-title') ? qs('#nb-title').textContent : '';
    const w = window.open('', '_blank');
    if(!w){ pv.toast('Bloqueador de pop-up impediu a impressão', { background:'#b94a4a' }); return; }
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:Inter,Arial;padding:20px;color:#222} img{max-width:100%;}</style></head><body>${editor.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(()=> { w.print(); }, 300);
  }

  /* TOOLBAR */
  function toolbarAction(cmd, value){
    if(cmd === 'createLink'){
      pv.prompt('URL (inclua https://):','https://').then(url=> { if(url) document.execCommand('createLink', false, url); });
      return;
    }
    if(cmd === 'insertImage'){
      qs('#nb-image-upload').click();
      return;
    }
    if(cmd === 'formatBlock' && value){
      document.execCommand('formatBlock', false, value);
      return;
    }
    if(cmd === 'foreColor' || cmd === 'backColor'){
      document.execCommand(cmd === 'foreColor' ? 'foreColor' : 'hiliteColor', false, value);
      return;
    }
    document.execCommand(cmd, false, value || null);
  }

  /* WIRING */
  function wire(host){
    if(!host) return;
    if(host.dataset.wired) return;
    host.dataset.wired = '1';

    // top-level clicks
    host.addEventListener('click', (e)=>{
      const nbItem = e.target.closest('.nb-item');
      if(nbItem && !e.target.closest('.nb-action-delete') && !e.target.closest('.nb-action-rename')){
        openNotebook(nbItem.dataset.id); return;
      }

      if(e.target.id === 'nb-new'){ createNotebook(); return; }
      if(e.target.id === 'nb-rename'){
        const nbId = qs('#nb-title') && qs('#nb-title').dataset.nbId;
        if(!nbId) return;
        pv.prompt('Novo nome:', qs('#nb-title').textContent).then(async v=>{
          if(v===null) return;
          const nb = notebooks.find(x=>String(x.id)===String(nbId)); if(nb){
            const val = v.trim(); if(val){ nb.title = val; try{ await updateServerNotebook(nbId, { title: val }); } catch(e){} renderSidebar(); openNotebook(nbId); pv.toast('Renomeado'); }
          }
        });
        return;
      }
      if(e.target.id === 'nb-delete'){ const nbId = qs('#nb-title') && qs('#nb-title').dataset.nbId; if(nbId) deleteNotebook(nbId); return; }
      if(e.target.id === 'note-new'){ const nbId = qs('#nb-title') && qs('#nb-title').dataset.nbId; if(nbId) addPage(nbId); return; }

      if(e.target.id === 'nb-export'){ exportAll(); return; }
      if(e.target.id === 'nb-import'){ const input = document.createElement('input'); input.type='file'; input.accept='application/json'; input.onchange = ()=> { if(input.files && input.files[0]) importJson(input.files[0]); }; input.click(); return; }
      if(e.target.id === 'nb-print'){ printCurrent(); return; }

  const renameBtn = e.target.closest('.nb-action-rename');
  if(renameBtn){ const id = renameBtn.dataset.id; const el = document.querySelector(`.nb-item[data-id="${id}"] .nb-name`); if(el) { pv.prompt('Novo nome do caderno:', el.textContent).then(async v=>{ if(v!==null){ const nb = notebooks.find(x=>String(x.id)===String(id)); if(nb){ const val = v.trim(); if(val){ nb.title = val; try{ await updateServerNotebook(id, { title: val }); } catch(e){} renderSidebar(); } } }}); } return; }

      const deleteBtn = e.target.closest('.nb-action-delete');
      if(deleteBtn){ deleteNotebook(deleteBtn.dataset.id); return; }

      const pageDel = e.target.closest('.page-action-delete');
      if(pageDel){
        const pageId = pageDel.dataset.pageId;
        const nbId = qs('#nb-title') && qs('#nb-title').dataset.nbId;
        if(nbId && pageId) deletePage(nbId, pageId);
        return;
      }
    });

    // toolbar clicks / inputs
    const toolbar = qs('#editor-toolbar');
    if(toolbar){
      toolbar.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-cmd]');
        if(btn){ const cmd = btn.dataset.cmd; const val = btn.dataset.value; toolbarAction(cmd, val); }
        else{
          const b = e.target.closest('button');
          if(b && b.id === 'page-save') saveCurrentPage();
        }
      });
      const fontSel = qs('#toolbar-font'); if(fontSel) fontSel.addEventListener('change', ()=> toolbarAction('fontName', fontSel.value));
      const sizeSel = qs('#toolbar-size'); if(sizeSel) sizeSel.addEventListener('change', ()=> toolbarAction('fontSize', sizeSel.value));
      const fore = qs('#toolbar-forecolor'); if(fore) fore.addEventListener('input', ()=> toolbarAction('foreColor', fore.value));
      const back = qs('#toolbar-backcolor'); if(back) back.addEventListener('input', ()=> toolbarAction('backColor', back.value));
    }

    // image upload
    const imgInput = qs('#nb-image-upload');
    if(imgInput){
      imgInput.addEventListener('change', (ev)=>{
        const f = ev.target.files && ev.target.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = ()=> document.execCommand('insertImage', false, reader.result);
        reader.readAsDataURL(f);
      });
    }

    // editor autosave (debounce + interval)
    let autosaveTimer = null;
    const editor = qs('#editor-area');
    if(editor){
      editor.addEventListener('input', ()=> {
        editor.dataset.dirty = '1';
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(()=> { saveCurrentPage(); editor.dataset.dirty = ''; }, 800);
      });
    }

    const autoInterval = setInterval(()=>{
      const ed = qs('#editor-area');
      if(ed && ed.dataset.dirty === '1') { saveCurrentPage(); ed.dataset.dirty=''; }
    }, 2000);

    // cleanup when host removed
    const observer = new MutationObserver(()=> {
      if(!document.body.contains(host)){ clearInterval(autoInterval); observer.disconnect(); }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  /* MOUNT */
  async function mount(host){
    if(!host) return;
    if(host.dataset.mounted) return;
    host.dataset.mounted = '1';
    await render(host);
    try{ wire(host); enableInlineRenameNotebook(); } catch(e){ console.error(e); }
    if(notebooks && notebooks.length) openNotebook(notebooks[0].id);
  }

  // expose
  window.mountNotebooks = mount;

})();