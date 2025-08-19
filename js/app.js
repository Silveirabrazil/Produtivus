console.log('app.js carregado');
// Protótipo com modal de criar tarefa funcional
(function(){
  function qs(s){return document.querySelector(s)}
  function qsa(s){return Array.from(document.querySelectorAll(s))}
  const ROOT = { header:'#header-container', main:'#main-content' };
  const COLORS = ['#c29d67','#f8867c','#77c1b4','#b8deb7','#8fbbd8','#ffe39f','#365562','#cfdecb','#ffefd2'];

  // state & persistence
  const state = { user: null, tasks: [] };
  // ---- Guia (Tour) helpers por usuário ----
  function _tourUserKey(){ try { return state.user?.email ? String(state.user.email).toLowerCase() : null; } catch(_){ return null; } }
  function _tourSeen(){ const k=_tourUserKey(); return k ? localStorage.getItem('pv.tour.seen.'+k)==='1' : true; }
  function _tourMarkSeen(){ const k=_tourUserKey(); if(k) localStorage.setItem('pv.tour.seen.'+k,'1'); }
  function _tourMaybeStart(){ if(state.user && !_tourSeen() && window.PVTour){ setTimeout(()=> window.PVTour.start(0, _tourMarkSeen), 600); } }
  let isSaving = false; // evita múltiplos salvamentos por clique duplo
  // --- user-aware storage helpers ---
  function loadUser(){ try { state.user = JSON.parse(localStorage.getItem('pv_user')||'null'); } catch(e){ state.user = null; } }
  function saveUser(){ try { localStorage.setItem('pv_user', JSON.stringify(state.user)); } catch(e){} }
  function getTasksKey(){ const email = state.user?.email ? String(state.user.email).toLowerCase() : null; return email ? `pv_tasks_${email}` : 'pv_tasks'; }
  function loadTasksForCurrentUser(){ try { state.tasks = JSON.parse(localStorage.getItem(getTasksKey())||'[]'); } catch(e){ state.tasks = []; } }
  function saveTasks(){ try { localStorage.setItem(getTasksKey(), JSON.stringify(state.tasks||[])); } catch(e){} }
  // ===== Persistência no servidor (tarefas) =====
  async function syncTasksFromServer(){
    if(!state.user) { loadTasksForCurrentUser(); return false; }
    try {
      const r = await fetch(`${API_BASE}/tasks.php`, { credentials: 'same-origin' });
      if(!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      if(j && j.success && Array.isArray(j.items)){
        state.tasks = j.items.map(t=> ({ id: String(t.id), title: t.title, desc: t.desc||'', start: t.start||null, end: t.end||null, color: t.color||'#c29d67', subtasks: Array.isArray(t.subtasks)? t.subtasks.map(s=> ({ id:String(s.id), text:String(s.text||''), done: !!s.done })) : [], done: !!t.done }));
        // também guarda em localStorage como cache/offline
        saveTasks();
        return true;
      }
    } catch(_) { loadTasksForCurrentUser(); }
    return false;
  }
  async function serverCreateTask(task){
    const payload = { title: task.title, desc: task.desc||'', start: task.start||null, end: task.end||null, color: task.color||'#c29d67', done: !!task.done, subtasks: (task.subtasks||[]).map(s=> ({ text: s.text, done: !!s.done })) };
    const r = await fetch(`${API_BASE}/tasks.php`, { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify(payload) });
    const j = await r.json().catch(()=>null);
    if(!r.ok || !j?.success) throw new Error(j?.message||'Falha ao criar');
    return j.id;
  }
  async function serverUpdateTask(id, fields){
    const r = await fetch(`${API_BASE}/tasks.php?id=${encodeURIComponent(id)}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify(fields||{}) });
    if(!r.ok){ const j = await r.json().catch(()=>null); throw new Error(j?.message||'Falha ao atualizar'); }
    return true;
  }
  async function serverDeleteTask(id){
    const r = await fetch(`${API_BASE}/tasks.php?id=${encodeURIComponent(id)}`, { method:'DELETE', credentials:'same-origin' });
    if(!r.ok){ const j = await r.json().catch(()=>null); throw new Error(j?.message||'Falha ao excluir'); }
    return true;
  }
  // --- users db & validation ---
  const USERS_KEY = 'pv_users';
  const API_BASE = `${location.origin}/server/api`;
  function loadUsers(){ try { return JSON.parse(localStorage.getItem(USERS_KEY)||'{}'); } catch(e){ return {}; } }
  function saveUsers(db){ localStorage.setItem(USERS_KEY, JSON.stringify(db||{})); }
  function isValidEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').toLowerCase()); }
  function isStrongPassword(pw){ const s = String(pw||''); return s.length>=8 && /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s); }
  async function hashPassword(pw){ const enc=new TextEncoder(); const data=enc.encode(String(pw||'')); const buf= await crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }

  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

  // util: escapar HTML (ajuda contra XSS em campos de usuário)
  function escapeHTML(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // header (sem menu quando não logado)
  function renderHeader(){
    let html = `
      <header class="app-hero">
        <div class="hero-inner">
          <div class="hero-left">
            <div class="brand">
              <img src="img/logo.png" alt="Logo" class="brand-logo" onerror="this.style.display='none'">
              <div class="brand-text">
                <h1>Produtivus</h1>
                <p class="tagline">Organize suas tarefas, calendário e cadernos com leveza.</p>
              </div>
            </div>
            <div class="hero-cta">
              <button id="btn-tour" class="btn btn-primary">Fazer tour</button>
              ${state.user ? '' : '<button class="btn" id="btn-to-register">Criar conta</button>'}
            </div>
          </div>
          <div class="hero-art">
            <img class="hero-blob" src="img/hero-blob.svg" alt="" aria-hidden="true"/>
            <img class="hero-person" src="img/image.png" alt=""/>
          </div>
        </div>`;
    if(state.user){
      html += `
        <div class="pill-nav">
          <button id="btn-menu" class="btn-ghost nav-menu-btn" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-menu">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <nav class="pill-nav-main">
            <button class="nav-btn" data-view="tasks">Tarefas</button>
            <button class="nav-btn" data-view="calendar">Calendário</button>
            <button class="nav-btn" data-view="dashboard">Dashboard</button>
            <button class="nav-btn" data-view="notebooks">Cadernos</button>
          </nav>
          <div class="pill-actions">
            <span id="welcome-msg" class="welcome small welcome-hide"></span>
            <button id="btn-notif" class="btn-ghost notif-bell" aria-label="Notificações" aria-haspopup="menu" aria-expanded="false" aria-controls="notif-panel">
              <span class="material-symbols-outlined">notifications</span>
              <span id="notif-badge" class="notif-badge hidden">0</span>
            </button>
            <div class="user-menu-wrap">
              <button id="btn-user" class="btn-ghost avatar" aria-haspopup="menu" aria-expanded="false" aria-controls="user-menu" title="Conta">
                <span class="material-symbols-outlined">account_circle</span>
              </button>
              <div id="user-menu" class="user-menu hidden" role="menu">
                <div class="user-menu-head small">Conta</div>
                <button class="user-menu-item" id="user-profile">Perfil</button>
                <button class="user-menu-item" id="user-password">Alterar senha</button>
                <hr/>
                <button class="user-menu-item danger" id="user-delete">Excluir conta</button>
                <button class="user-menu-item" id="btn-logout">Sair</button>
              </div>
            </div>
          </div>
          <div id="notif-panel" class="notif-panel hidden" role="menu" aria-labelledby="btn-notif">
            <div class="notif-head">Notificações</div>
            <div id="notif-list" class="notif-list small"></div>
            <div class="notif-footer"><button id="notif-close" class="btn-ghost small">Fechar</button></div>
          </div>
        </div>
        <div id="mobile-menu" class="mobile-menu hidden" aria-hidden="true">
          <nav class="mobile-menu-inner">
            <button class="nav-btn" data-view="tasks">Tarefas</button>
            <button class="nav-btn" data-view="calendar">Calendário</button>
            <button class="nav-btn" data-view="dashboard">Dashboard</button>
            <button class="nav-btn" data-view="notebooks">Cadernos</button>
            <div class="mobile-actions">
              <button id="btn-notif-m" class="btn-ghost notif-bell" aria-label="Notificações" aria-haspopup="menu" aria-expanded="false" aria-controls="notif-panel">
                <span class="material-symbols-outlined">notifications</span>
                <span id="notif-badge-m" class="notif-badge hidden">0</span>
              </button>
              <button id="btn-tour-m" class="btn-ghost">Tour</button>
              <button id="btn-logout-m" class="btnlogout">Sair</button>
            </div>
          </nav>
        </div>`;
    }
    html += `</header>`;
    document.querySelector('#header-container').innerHTML = html;
    updateWelcomeUI && updateWelcomeUI();
  }

  function viewLogin(){ return `
    <section class="auth-card">
      <h2>Entrar</h2>
  <label class="small">Email<input id="login-email" type="email" class="input-full input-pad input-margin"></label>
  <label class="small">Senha<input id="login-pass" type="password" class="input-full input-pad input-margin"></label>
  <div class="flex-gap flex-margin-top">
        <button id="btn-login" class="btn btn-primary">Entrar</button>
        <button id="btn-to-register" class="btn">Cadastrar</button>
      </div>
  <div class="small google-sep google-sep-style">ou</div>
  <div id="google-btn" class="google-btn-flex"></div>
    </section>` }

  function viewRegister(){ return `
    <section class="auth-card">
      <h2>Criar Conta</h2>
  <label class="small">Nome<input id="reg-name" type="text" class="input-full input-pad input-margin"></label>
  <label class="small">Email<input id="reg-email" type="email" class="input-full input-pad input-margin"></label>
  <label class="small">Senha<input id="reg-pass" type="password" class="input-full input-pad input-margin"></label>
  <label class="small">Confirmar Senha<input id="reg-pass2" type="password" class="input-full input-pad input-margin"></label>
  <div class="flex-gap flex-margin-top">
        <button id="btn-register" class="btn btn-primary">Cadastrar</button>
        <button id="btn-to-login" class="btn">Voltar</button>
      </div>
    </section>` }

  function viewTasks(){
    return `
      <section class="tasks-section">
        <div class="tasks-container">
          <div class="tasks-header-flex">
            <div><h2 class=\"view-title\">Tarefas</h2></div>
            <div><button id="btn-add-task" class="btn-add-task">+ Nova tarefa</button></div>
          </div>
          <div class="cards-grid" id="cards-grid" class="cards-grid-margin"></div>
        </div>
      </section>`;
  }
  function viewCalendar(){ return `<section><h2>Calendário</h2><div class="placeholder small">[Calendário — placeholder]</div></section>` }
  function viewDashboard(){ return `<section><h2>Dashboard</h2><div class="placeholder small">[Dashboard — placeholder]</div></section>` }
  function viewNotebooks(){ 
    // container usado pelo módulo externo (public/js/notebooks.js)
    return `<section><h2 class="view-title">Cadernos</h2><div id="notebooks-host"></div></section>` 
  }

  // modal elements
  // mapeia elementos reais do modal presente em public/index.html
  const modal = {
    overlay: () => qs('#task-modal-overlay'),
    titleInp: () => qs('#task-title'),
    desc: () => qs('#task-desc'),
  start: () => qs('#task-start'),
  end: () => qs('#task-end'),
    palette: () => qs('#task-color-palette'),
  subtasks: () => qs('#task-subtasks'),
  addSubBtn: () => qs('#task-add-sub'),
    saveBtn: () => qs('#task-form .btn.btn-primary'),
    cancelBtn: () => null,
    closeBtn: () => qs('#close-task-modal'),
    headerTitle: () => qs('#tm-title')
  };

  // render palette inside modal
  function renderPalette(selected){
    const container = modal.palette();
    if(!container) return;
    container.innerHTML = '';
    COLORS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button'; // evita submit do formulário
      b.style.background = c;
      b.dataset.color = c;
      if(c === selected) b.classList.add('active');
      b.addEventListener('click', (ev)=> {
        ev.preventDefault();
        ev.stopPropagation();
  Array.from(container.querySelectorAll('button')).forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        const hidden = document.querySelector('#task-color');
        if(hidden) hidden.value = c;
      });
      container.appendChild(b);
    });
  }

  function addSubtaskLine(sub = { text:'', done:false }){
    if(typeof sub === 'string') sub = { text: sub, done:false };
    const list = modal.subtasks(); if(!list) return;
    const line = document.createElement('div');
    line.className = 'subtask-line';
    const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = !!sub.done; chk.title = 'Concluir subtarefa';
    const input = document.createElement('input'); input.type='text'; input.value = sub.text || ''; input.placeholder='Subtarefa...';
    const btn = document.createElement('button'); btn.type='button'; btn.className='btn-ghost small'; btn.textContent = 'Remover';
    btn.addEventListener('click', ()=> line.remove());
    line.appendChild(chk); line.appendChild(input); line.appendChild(btn);
    list.appendChild(line);
  }

  function openTaskModal(editId){
    const ov = modal.overlay();
    ov.classList.remove('hidden');
    ov.setAttribute('aria-hidden','false');
    renderPalette('#c29d67');
  const form = document.getElementById('task-form');
  if(form) form.reset();
  // reabilita o botão salvar ao abrir a modal
  if(form){ const submitBtn = form.querySelector('button[type="submit"]'); if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Salvar Tarefa'; } }
  const hidden = document.querySelector('#task-color');
  if(hidden) hidden.value = '#c29d67';
  if(modal.subtasks()) modal.subtasks().innerHTML = '';
  if(modal.titleInp()) modal.titleInp().value = '';
  if(modal.desc()) modal.desc().value = '';
  if(modal.start()) modal.start().value = '';
  if(modal.end()) modal.end().value = '';
    modal.headerTitle().textContent = editId ? 'Editar tarefa' : 'Nova tarefa';
    // store editing id on overlay
    ov.dataset.editId = editId || '';
  }

  function closeTaskModal(){
    const ov = modal.overlay();
    ov.classList.add('hidden');
    ov.setAttribute('aria-hidden','true');
    delete ov.dataset.editId;
    // evita aria-hidden em elemento com foco — move foco para botão visível
    const fallback = document.querySelector('#btn-new') || document.querySelector('#btn-add-task') || document.querySelector('.nav-btn[data-view="tasks"]');
    if(fallback && typeof fallback.focus === 'function') fallback.focus();
  }

  async function saveTaskFromModal(){
    if(isSaving) return; // já salvando
    isSaving = true;
    try {
      const editId = modal.overlay().dataset.editId;
      const title = modal.titleInp() ? modal.titleInp().value.trim() : '';
      if(!title){
        if(window.pvShowToast){ pvShowToast('Título obrigatório', { background: '#F84449' }); }
        else { console.warn('Título obrigatório'); }
        return;
      }
      const desc = modal.desc() ? modal.desc().value.trim() : '';
      const start = modal.start() ? (modal.start().value || null) : null;
      const end = modal.end() ? (modal.end().value || null) : null;
      const colorBtn = modal.palette() ? modal.palette().querySelector('.active') : null;
      const hidden = document.querySelector('#task-color');
      const color = hidden && hidden.value ? hidden.value : (colorBtn ? colorBtn.dataset.color : COLORS[0]);
      const subt = modal.subtasks() ? Array.from(modal.subtasks().querySelectorAll('.subtask-line'))
        .map(line => {
          const textInp = line.querySelector('input[type="text"]');
          const chk = line.querySelector('input[type="checkbox"]');
          return { id: Date.now().toString(36), text: (textInp?.value || '').trim(), done: !!(chk?.checked) };
        })
        .filter(s => s.text) : [];
      if(editId){
        const t = state.tasks.find(x=>x.id==editId);
        if(t){ Object.assign(t,{ title, desc, start, end, color, subtasks:subt }); try { await serverUpdateTask(editId, { title, desc, start, end, color, subtasks:subt }); } catch(_){} renderCards(); updateNotificationsUI(); closeTaskModal(); if(window.pvShowToast) pvShowToast('Tarefa atualizada'); return; }
      }
      const newTask = { id: Date.now().toString(36), title, desc, start, end, color, subtasks: subt, done:false };
      try { const id = await serverCreateTask(newTask); newTask.id = String(id||newTask.id); } catch(_){ }
      state.tasks.unshift(newTask);
      renderCards(); updateNotificationsUI(); closeTaskModal(); if(window.pvShowToast) pvShowToast('Tarefa criada');
    } finally { isSaving = false;
    }
  }

  // helper: formata ISO 'yyyy-mm-dd' para 'dd/mm/aaaa'
  function formatDateBR(iso){
    if(!iso) return '';
    // já está no formato YYYY-MM-DD esperado
    const parts = String(iso).split('-');
    if(parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // render cards
  function renderCards(){
    const grid = qs('#cards-grid'); if(!grid) return; grid.innerHTML = '';
    state.tasks.forEach(t => {
      const pct = calcPercent(t);
      const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = t.id;
  card.style.setProperty('--card-border-color', t.color||COLORS[0]);
  card.classList.add('card-border');

  // datas formatadas — sempre mostrar as duas linhas para manter altura
  const startStr = t.start ? formatDateBR(t.start) : '';
  const endStr = t.end ? formatDateBR(t.end) : '';
  const datesText = `Início: ${startStr}\nTérmino: ${endStr}`;

      const head = document.createElement('div'); head.className = 'card-head';
      const titleWrap = document.createElement('div'); titleWrap.className = 'card-title-wrap';
      const titleEl = document.createElement('div'); titleEl.className = 'card-title'; titleEl.title = t.title; titleEl.textContent = t.title;
      const descEl = document.createElement('div'); descEl.className = 'card-desc small'; descEl.title = t.desc||''; descEl.textContent = t.desc||'';
  const datesEl = document.createElement('div'); datesEl.className = 'card-dates small card-dates-margin'; datesEl.innerHTML = datesText.split('\n').join('<br/>');
  const detailsBtn = document.createElement('button'); detailsBtn.type='button'; detailsBtn.className = 'link-view-details'; detailsBtn.dataset.id = t.id; detailsBtn.textContent = 'Ver detalhes';
  titleWrap.appendChild(titleEl); titleWrap.appendChild(descEl); titleWrap.appendChild(datesEl); titleWrap.appendChild(detailsBtn);

      const kpi = document.createElement('div'); kpi.className = 'card-kpi';
      const kpiVal = document.createElement('div'); kpiVal.className = 'kpi-value'; kpiVal.textContent = `${pct}%`;
      const kpiLbl = document.createElement('div'); kpiLbl.className = 'small'; kpiLbl.textContent = 'Progresso';
      kpi.appendChild(kpiVal); kpi.appendChild(kpiLbl);

      head.appendChild(titleWrap); head.appendChild(kpi);
      card.appendChild(head);

      const actions = document.createElement('div'); actions.className = 'card-actions';
      const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-primary btn-edit'; btnEdit.dataset.id = t.id; btnEdit.textContent = 'Editar';
      const btnDel = document.createElement('button'); btnDel.className = 'btn'; btnDel.dataset.del = t.id; btnDel.textContent = 'Excluir';
      const btnDone = document.createElement('button'); btnDone.className = 'btn'; btnDone.dataset.done = t.id; btnDone.textContent = t.done ? 'Desfazer' : 'Concluir';
      actions.appendChild(btnEdit); actions.appendChild(btnDel); actions.appendChild(btnDone);
      card.appendChild(actions);

      grid.appendChild(card);
    });
  }

  // ====== Modal de Visualização (somente leitura) ======
  function openViewModal(task){
    const ov = document.getElementById('task-view-overlay'); if(!ov) return;
    const set = (id, html)=> { const el = document.getElementById(id); if(el) el.innerHTML = html||''; };
  set('tv-field-title', escapeHTML(task.title||''));
  set('tv-field-desc', escapeHTML(task.desc||''));
    set('tv-field-start', task.start? formatDateBR(task.start): '');
    set('tv-field-end', task.end? formatDateBR(task.end): '');
  const colorEl = document.getElementById('tv-field-color'); if(colorEl) colorEl.style.setProperty('--tv-field-color', task.color||COLORS[0]);
  if(colorEl) colorEl.classList.add('tv-field-color-bg');
    const prog = document.getElementById('tv-field-progress'); if(prog) prog.textContent = `${calcPercent(task)}%`;
    const ul = document.getElementById('tv-subtasks'); if(ul){
      ul.innerHTML = '';
      (task.subtasks||[]).forEach(s=>{
        const li = document.createElement('li');
  li.innerHTML = `<span class="subtask-dot" style="background:${s.done?'#4caf50':'#ccc'}"></span>${escapeHTML(s.text)}`;
        ul.appendChild(li);
      });
      if((task.subtasks||[]).length===0){ ul.innerHTML = '<li class="small">Sem subtarefas</li>'; }
    }
    ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false');
  }
  function closeViewModal(){ const ov = document.getElementById('task-view-overlay'); if(!ov) return; ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true'); }
  function calcPercent(t){
    const subs = (t.subtasks||[]);
    const subsTotal = subs.length;
    if(subsTotal === 0) return t.done ? 100 : 0;
    const subsDone = subs.filter(s=>s.done).length;
    // 50% peso para tarefa principal + 50% distribuído entre subtarefas
    const mainWeight = t.done ? 50 : 0;
    const subsWeight = subsTotal ? Math.round((subsDone/subsTotal)*50) : 0;
    return Math.min(100, mainWeight + subsWeight);
  }

  // ===== Calendário =====
  function renderCalendar(){
    const main = qs('#main-content');
    main.innerHTML = '';
    const container = document.createElement('section');
    container.className = 'cal-section';
    container.innerHTML = `
      <h2 class="view-title">Calendário</h2>
      <div class="calendar">
        <div class="cal-header">
          <div class="month-title" id="cal-month"></div>
          <div class="cal-controls">
            <button id="cal-prev">◀</button>
            <button id="cal-next">▶</button>
          </div>
        </div>
        <div class="cal-weekdays">
          <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>
        <div class="cal-grid" id="cal-grid"></div>
      </div>`;
    main.appendChild(container);

    const monthEl = container.querySelector('#cal-month');
    const grid = container.querySelector('#cal-grid');
    const ref = new Date();
    const pad2 = (n)=> String(n).padStart(2,'0');
    const iso = (y,m,d)=> `${y}-${pad2(m+1)}-${pad2(d)}`;
    const tasksOn = (dateStr)=> state.tasks.filter(t=>{
      const s = t.start || t.end; // se uma data faltar, usa a outra
      const e = t.end || t.start;
      if(!s && !e) return false;
      // comparação lexicográfica funciona com ISO YYYY-MM-DD
      return (dateStr >= (s||dateStr)) && (dateStr <= (e||dateStr));
    });

    // helpers do modal do dia
    const dayModal = {
      overlay: ()=> document.getElementById('day-modal-overlay'),
      title: ()=> document.getElementById('day-modal-title'),
      list: ()=> document.getElementById('day-modal-list'),
      summary: ()=> document.getElementById('day-modal-summary'),
      addBtn: ()=> document.getElementById('day-add-task'),
      closeBtn: ()=> document.getElementById('close-day-modal')
    };
    function openDayModal(dateStr){
      const items = tasksOn(dateStr);
      if(dayModal.title()) dayModal.title().textContent = new Date(dateStr).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
      if(dayModal.summary()) dayModal.summary().textContent = items.length ? `${items.length} tarefa(s) neste dia` : 'Sem tarefas neste dia';
      if(dayModal.list()){
        dayModal.list().innerHTML = items.map(t=>{
          const d1 = t.start ? `Início: ${formatDateBR(t.start)}` : '';
          const d2 = t.end ? `Término: ${formatDateBR(t.end)}` : '';
     return `<div class="task-row" data-id="${t.id}">`+
       `<div class="task-row-flex">`+
       `<span class="task-row-dot" style="background:${t.color||'#c29d67'}"></span>`+
       `<div class="task-row-title-wrap"><div class="title" title="${t.title}">${t.title}</div>`+
       `<div class="meta small">${d1}${d1 && d2 ? ' • ' : ''}${d2}</div></div></div>`+
       `<div class="task-row-actions">`+
       `<button class="btn btn-primary" data-view-task="${t.id}">Ver</button>`+
       `<button class="btn" data-edit-task="${t.id}">Editar</button>`+
       `</div>`+
       `</div>`;
        }).join('');
      }
      const ov = dayModal.overlay(); if(ov){ ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); ov.dataset.date = dateStr; }
    }
    function closeDayModal(){ const ov = dayModal.overlay(); if(!ov) return; ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true'); delete ov.dataset.date; }
    // wire do modal do dia
    if(dayModal.closeBtn()) dayModal.closeBtn().onclick = closeDayModal;
    if(dayModal.overlay()) dayModal.overlay().addEventListener('click', (e)=>{ if(e.target === dayModal.overlay()) closeDayModal(); });
    if(dayModal.addBtn()) dayModal.addBtn().onclick = ()=>{
      const ov = dayModal.overlay(); const dateStr = ov?.dataset?.date;
      closeDayModal();
      openTaskModal();
      if(dateStr && modal.start()) modal.start().value = dateStr;
    };
    // delegação dentro do overlay para ver/editar
    if(dayModal.overlay()){
      dayModal.overlay().addEventListener('click', (e)=>{
        const viewBtn = e.target.closest('[data-view-task]');
  if(viewBtn){ const t = state.tasks.find(x=> x.id == viewBtn.dataset.viewTask); if(t){ closeDayModal(); openViewModal(t); } return; }
        const editBtn = e.target.closest('[data-edit-task]');
  if(editBtn){ const t = state.tasks.find(x=> x.id == editBtn.dataset.editTask); if(t){ closeDayModal(); openTaskModal(t.id);
            if(modal.titleInp()) modal.titleInp().value = t.title || '';
            if(modal.desc()) modal.desc().value = t.desc || '';
            if(modal.start()) modal.start().value = t.start || '';
            if(modal.end()) modal.end().value = t.end || '';
            const hidden = document.querySelector('#task-color'); if(hidden) hidden.value = t.color || COLORS[0];
            renderPalette(t.color || COLORS[0]); if(modal.subtasks()) { modal.subtasks().innerHTML = ''; (t.subtasks||[]).forEach(s=> addSubtaskLine({ text:s.text, done:!!s.done })); }
          } return; }
      });
    }

    function draw(){
      grid.innerHTML='';
      const y = ref.getFullYear();
      const m = ref.getMonth();
      monthEl.textContent = ref.toLocaleDateString('pt-BR',{ month:'long', year:'numeric' });
      const firstDay = new Date(y,m,1);
      const startWeekday = firstDay.getDay();
      const daysInMonth = new Date(y,m+1,0).getDate();
      const prevDays = new Date(y,m,0).getDate();

      for(let i=0;i<startWeekday;i++){
        const dayNum = prevDays - startWeekday + 1 + i;
        const cell = document.createElement('div');
        cell.className = 'cal-cell outside';
        cell.innerHTML = `<div class="day-num">${dayNum}</div>`;
        grid.appendChild(cell);
      }

      for(let d=1; d<=daysInMonth; d++){
        const dateStr = iso(y,m,d);
        const items = tasksOn(dateStr);
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        const today = new Date();
        if(today.getFullYear()===y && today.getMonth()===m && today.getDate()===d) cell.classList.add('today');
        cell.innerHTML = `
          <div class="day-num">${d}</div>
          <div class="markers">${items.slice(0,4).map(t=>`<span class="marker marker-bg" title="${escapeHTML(t.title)}" style="--marker-bg:${t.color||'#c29d67'}"></span>`).join('')}${items.length>4?`<span class="marker count">+${items.length-4}</span>`:''}</div>
        `;
        cell.addEventListener('click', ()=> openDayModal(dateStr));
        grid.appendChild(cell);
      }
    }

    draw();
    container.querySelector('#cal-prev').onclick = ()=> { ref.setMonth(ref.getMonth()-1); draw(); };
    container.querySelector('#cal-next').onclick = ()=> { ref.setMonth(ref.getMonth()+1); draw(); };

  // (removido listener global para evitar múltiplas inscrições)
  }

  // ===== Dashboard =====
  function renderDashboard(){
    const main = qs('#main-content');
    const total = state.tasks.length;
    const done = state.tasks.filter(t=>t.done || (t.subtasks||[]).every(s=>s.done && (t.subtasks||[]).length>0)).length;
    const pending = total - done;
    const recent = state.tasks.slice(0,5);
    const html = `
      <section class="dashboard">
        <div class="panel">
          <h2 class="view-title">Dashboard</h2>
          <div class="chart-wrap">
            <canvas id="dash-chart" height="260"></canvas>
          </div>
          <div class="summary-grid summary-grid-margin">
            <div class="summary-item"><div>Pendentes</div><div class="kpi-value">${pending}</div></div>
            <div class="summary-item"><div>Concluídas</div><div class="kpi-value">${done}</div></div>
            <div class="summary-item"><div>Total</div><div class="kpi-value">${total}</div></div>
          </div>
          <div class="progress-bar"><i class="progress-bar-fill" style="width:${total?Math.round(done/total*100):0}%"></i></div>
        </div>
        <aside class="panel">
          <h3 class="small recent-title">Recentes</h3>
          <div class="recent-cards recent-cards-flex">
            ${recent.map(t=> {
              const pct = calcPercent(t);
              const startStr = t.start ? formatDateBR(t.start) : '';
              const endStr = t.end ? formatDateBR(t.end) : '';
              const datesText = `Início: ${startStr}\nTérmino: ${endStr}`;
              return `
                <div class="card card-border" data-id="${t.id}" style="--card-border-color:${t.color||'#c29d67'};padding:12px">
                  <div class="card-head">
                    <div class="card-title-wrap">
                      <div class="card-title" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</div>
                      <div class="card-desc small" title="${escapeHTML(t.desc||'')}">${escapeHTML(t.desc||'')}</div>
                      <div class="card-dates small card-dates-margin">${datesText.split('\n').join('<br/>')}</div>
                      <button class="link-view-details" data-id="${t.id}">Ver detalhes</button>
                    </div>
                    <div class="card-kpi">
                      <div class="kpi-value">${pct}%</div>
                      <div class="small">Progresso</div>
                    </div>
                  </div>
                </div>`;
            }).join('') || '<div class="small muted">Sem tarefas</div>'}
          </div>
        </aside>
      </section>`;
    main.innerHTML = html;

    // ==== Gráfico de barras simples (últimos 7 dias, tarefas no dia) ====
    const today = new Date();
    const pad2 = (n)=> String(n).padStart(2,'0');
    const toISO = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    function tasksOn(dateStr){
      return state.tasks.filter(t=>{
        const s = t.start || t.end; const e = t.end || t.start;
        if(!s && !e) return false;
        return (dateStr >= (s||dateStr)) && (dateStr <= (e||dateStr));
      });
    }
    const labels = [];
    const values = [];
    for(let i=6;i>=0;i--){
      const d = new Date(today); d.setDate(today.getDate()-i);
      const iso = toISO(d);
      labels.push(d.toLocaleDateString('pt-BR', { weekday:'short' }));
      values.push(tasksOn(iso).length);
    }
    const canvas = document.getElementById('dash-chart');
    if(canvas){
      drawBarChart(canvas, labels, values, { color: '#365562' });
    }
  }

  // Gráfico de barras minimalista (Canvas 2D)
  function drawBarChart(canvas, labels, values, opts={}){
    const DPR = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(canvas);
    const cssWidth = canvas.clientWidth || parseInt(style.width||'600',10);
    const cssHeight = canvas.clientHeight || parseInt(style.height||'260',10);
    canvas.width = Math.max(600, cssWidth) * DPR;
    canvas.height = Math.max(220, cssHeight) * DPR;
    ctx.scale(DPR, DPR);

    const w = canvas.width / DPR;
    const h = canvas.height / DPR;
    const padding = { top: 20, right: 20, bottom: 30, left: 34 };
    const gw = w - padding.left - padding.right;
    const gh = h - padding.top - padding.bottom;

    // fundo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,w,h);

    // grid horizontal
    const maxVal = Math.max(5, ...values);
    const steps = Math.min(5, maxVal);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for(let i=0;i<=steps;i++){
      const y = padding.top + gh - (i/steps)*gh;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left+gw, y); ctx.stroke();
      // labels eixo Y
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = '12px Poppins, Arial';
      const val = Math.round((i/steps)*maxVal);
      ctx.fillText(String(val), 4, y+4);
    }

    // barras
    const barCount = values.length;
    const gap = 10;
    const barW = Math.max(14, (gw - (gap*(barCount+1))) / barCount);
    const color = opts.color || '#365562';
    for(let i=0;i<barCount;i++){
      const v = values[i];
      const bh = maxVal ? (v/maxVal)*gh : 0;
      const x = padding.left + gap + i*(barW+gap);
      const y = padding.top + gh - bh;
      // sombra leve
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(x, y-2, barW, bh+2);
      // barra
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, bh);
    }

    // labels eixo X
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = '12px Poppins, Arial';
    for(let i=0;i<labels.length;i++){
      const x = padding.left + gap + i*(barW+gap) + barW/2;
      const y = h - padding.bottom + 18;
      const txt = labels[i];
      ctx.textAlign = 'center';
      ctx.fillText(txt, x, y);
    }
  }

  // navigation & events
  // transição suave do conteúdo principal
  function transitionMain(setter){
    const main = qs(ROOT.main);
    if(!main){ setter(); return; }
    // anima saída
    main.classList.remove('page-in');
    main.classList.add('page-out');
    const doSet = ()=>{
      try { setter(); } catch(_) {}
      // anima entrada
      main.classList.remove('page-out');
      main.classList.add('page-in');
      // limpa classe após animar
      setTimeout(()=> main.classList.remove('page-in'), 260);
    };
    // usa timeout curto para não depender de animationend
    setTimeout(doSet, 180);
  }

  // Google Sign-In (GIS)
  let publicConfigCache = null; let gisLoaded = false;
  async function fetchPublicConfig(){
    if(publicConfigCache) return publicConfigCache;
    try {
      const resp = await fetch(`${API_BASE}/public_config.php`, { credentials:'same-origin' });
      if(resp.ok){
        const data = await resp.json();
        if(data && data.googleClientId){ publicConfigCache = data; return publicConfigCache; }
      }
    } catch(_) {}
    // fallback: tentar ler diretamente o arquivo público
    try {
      const r2 = await fetch('/server/config/oauth.json', { credentials:'same-origin' });
      if(r2.ok){
        const j2 = await r2.json();
        if(j2 && j2.googleClientId){ publicConfigCache = { googleClientId: j2.googleClientId }; return publicConfigCache; }
      }
    } catch(_) {}
    return { googleClientId: null };
  }
  function loadGoogleScript(){
    return new Promise((resolve, reject)=>{
      if(gisLoaded || window.google?.accounts?.id){ gisLoaded = true; resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = ()=> { gisLoaded = true; resolve(); };
      s.onerror = ()=> reject(new Error('Falha ao carregar Google Identity Services'));
      document.head.appendChild(s);
    });
  }
  async function initGoogleSignIn(){
    const cfg = await fetchPublicConfig();
    const clientId = cfg?.googleClientId;
    const mount = document.getElementById('google-btn');
    if(!mount){ console.warn('[Produtivus][Google] Container #google-btn não encontrado'); return; }
    if(!clientId){
      console.warn('[Produtivus][Google] googleClientId ausente. Preencha public/server/config/oauth.json');
      // feedback visual leve
      const sep = document.querySelector('.google-sep'); if(sep) sep.style.display = 'none';
      mount.innerHTML = '<div class="small" style="color:#888">Configure o login Google para mostrar o botão</div>';
      return;
    }
    try {
      await loadGoogleScript();
      if(!window.google?.accounts?.id) return;
      console.log('[Produtivus][Google] GIS carregado, inicializando botão');
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp)=>{
          const token = resp?.credential;
          if(!token) return;
          try {
            const r = await fetch(`${API_BASE}/google_login.php`, { method:'POST', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify({ id_token: token }) });
            const data = await r.json().catch(()=>({ success:false }));
            if(!r.ok || !data.success){ window.pvShowToast && pvShowToast(data.message||'Falha no login Google', { background:'#F84449' }); return; }
            state.user = { name: data.user?.name||'', email: data.user?.email||'' };
            saveUser();
            // substitui carregamento local por sincronização com servidor
            try { await syncTasksFromServer(); } catch(_) { loadTasksForCurrentUser(); }
            // re-renderiza o header e badges imediatamente após login
            renderHeader();
            updateWelcomeUI && updateWelcomeUI();
            updateNotificationsUI();
            showView('tasks');
            _tourMaybeStart();
          } catch(err){ console.error(err); window.pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' }); }
        },
        auto_select: false,
        ux_mode: 'popup'
      });
      window.google.accounts.id.renderButton(mount, { theme:'filled_blue', size:'large', text:'continue_with', width: 280 });
    } catch(err){ console.warn(err); }
  }

  // helper de debug no console
  window._pvDebugGoogle = initGoogleSignIn;

  function showView(name){
    const main = qs(ROOT.main);
    const isAuthView = (v)=> v==='login' || v==='register';
    if(!state.user && !isAuthView(name)) name = 'login';
    // sempre fechar modais ao trocar de view
    try {
      const tm = document.getElementById('task-modal-overlay'); if(tm){ tm.classList.add('hidden'); tm.setAttribute('aria-hidden','true'); }
      const tv = document.getElementById('task-view-overlay'); if(tv){ tv.classList.add('hidden'); tv.setAttribute('aria-hidden','true'); }
      const dm = document.getElementById('day-modal-overlay'); if(dm){ dm.classList.add('hidden'); dm.setAttribute('aria-hidden','true'); }
    } catch(e){}

    const setActive = ()=> qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view===name));
    const persistView = ()=>{
      try {
        const email = state.user?.email ? String(state.user.email).toLowerCase() : null;
        if(email) localStorage.setItem('pv_view_'+email, name); else localStorage.setItem('pv_view', name);
      } catch(e){}
    };

    switch(name){
      case 'login':
        transitionMain(()=>{ main.innerHTML = viewLogin(); });
        setActive(); persistView();
        // inicializa Google SSO sem bloquear transição
        setTimeout(()=> initGoogleSignIn(), 60);
        // preenche e-mail se houver arquivo de prefill
        setTimeout(async ()=>{
          try {
            const r = await fetch('/server/config/login.prefill.json', { credentials:'same-origin' });
            if(r.ok){
              const j = await r.json();
              const v = j?.loginEmail || j?.email || '';
              if(v){ const inp = document.getElementById('login-email'); if(inp) inp.value = v; }
            }
          } catch(_){}
        }, 80);
        break;
      case 'register':
        transitionMain(()=>{ main.innerHTML = viewRegister(); });
        setActive(); persistView();
        break;
      case 'tasks':
        if(!state.user){ transitionMain(()=>{ main.innerHTML = viewLogin(); }); setActive(); persistView(); setTimeout(()=> initGoogleSignIn(), 60); break; }
        transitionMain(()=>{ main.innerHTML = viewTasks(); renderCards(); });
        setActive(); persistView();
        break;
      case 'calendar':
        if(!state.user){ transitionMain(()=>{ main.innerHTML = viewLogin(); }); setActive(); persistView(); setTimeout(()=> initGoogleSignIn(), 60); break; }
        transitionMain(()=>{ /* placeholder antes de montar */ main.innerHTML = '<section></section>'; renderCalendar(); });
        setActive(); persistView();
        break;
      case 'dashboard':
        if(!state.user){ transitionMain(()=>{ main.innerHTML = viewLogin(); }); setActive(); persistView(); setTimeout(()=> initGoogleSignIn(), 60); break; }
        transitionMain(()=>{ renderDashboard(); });
        setActive(); persistView();
        break;
      case 'notebooks':
        if(!state.user){ transitionMain(()=>{ main.innerHTML = viewLogin(); }); setActive(); persistView(); setTimeout(()=> initGoogleSignIn(), 60); break; }
        transitionMain(()=>{ main.innerHTML = viewNotebooks(); try { if(window.mountNotebooks){ const host = document.getElementById('notebooks-host'); window.mountNotebooks(host); } } catch(e){ console.error(e); } });
        setActive(); persistView();
        break;
      default:
        transitionMain(()=>{ main.innerHTML = '<div>Not found</div>'; });
        setActive(); persistView();
    }
    // atualiza badge ao trocar de view
    try { updateNotificationsUI(); } catch(e){}
  }

  function wire(){
    document.addEventListener('click', e=>{
      // toggle menu mobile
      const menuBtn = e.target.closest('#btn-menu');
      if(menuBtn){
        const mm = document.getElementById('mobile-menu');
        if(mm){ const hidden = mm.classList.toggle('hidden'); mm.setAttribute('aria-hidden', String(hidden)); menuBtn.setAttribute('aria-expanded', String(!hidden)); }
        return;
      }
      // fechar menu mobile ao clicar fora
      const mm = document.getElementById('mobile-menu');
      if(mm && !mm.classList.contains('hidden')){
        const inside = e.target.closest('#mobile-menu');
        const overBtn = e.target.closest('#btn-menu');
        if(!inside && !overBtn){ mm.classList.add('hidden'); mm.setAttribute('aria-hidden','true'); const mb=document.getElementById('btn-menu'); if(mb) mb.setAttribute('aria-expanded','false'); }
      }
      // toggle user menu
      const userBtn = e.target.closest('#btn-user');
      if(userBtn){ const um = document.getElementById('user-menu'); if(um){ const hidden = um.classList.toggle('hidden'); userBtn.setAttribute('aria-expanded', String(!hidden)); } return; }
      const umPanel = document.getElementById('user-menu');
      if(umPanel && !umPanel.classList.contains('hidden')){
        const inside = e.target.closest('#user-menu');
        const onBtn = e.target.closest('#btn-user');
        if(!inside && !onBtn){ umPanel.classList.add('hidden'); const b=document.getElementById('btn-user'); if(b) b.setAttribute('aria-expanded','false'); }
      }
  const viewBtn = e.target.closest('.link-view-details');
  if(viewBtn){ const t = state.tasks.find(x=> x.id == viewBtn.dataset.id); if(t){ e.stopPropagation(); openViewModal(t); return; } }
      const navBtn = e.target.closest('.nav-btn');
      if(navBtn){
        if(!state.user){ showView('login'); return; }
        // fechar mobile menu se aberto
        const mm2 = document.getElementById('mobile-menu');
        if(mm2){ mm2.classList.add('hidden'); mm2.setAttribute('aria-hidden','true'); const mb=document.getElementById('btn-menu'); if(mb) mb.setAttribute('aria-expanded','false'); }
        showView(navBtn.dataset.view);
      }
      if(e.target.id==='btn-tour' || e.target.id==='btn-tour-m'){
        if(window.PVTour){ window.PVTour.start(0); }
        return;
      }
      if(e.target.id==='btn-to-register') showView('register');
      if(e.target.id==='btn-to-login') showView('login');
      if(e.target.id==='btn-login'){
        (async ()=>{
          const email = (document.getElementById('login-email')?.value||'').trim();
          const pass = (document.getElementById('login-pass')?.value||'');
          if(!isValidEmail(email)){ window.pvShowToast && pvShowToast('Email inválido', { background:'#F84449' }); return; }
          try {
            const resp = await fetch(`${API_BASE}/login.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ email, password: pass })
            });
            const ct = resp.headers.get('content-type')||'';
            let data = null;
            if(ct.includes('application/json')){
              try { data = await resp.json(); } catch(_){ data = null; }
            }
            if(!resp.ok){
              const msg = (data && data.message) ? data.message : ('Falha na API de login (HTTP '+resp.status+').');
              window.pvShowToast && pvShowToast(msg, { background:'#F84449' });
              return;
            }
            if(!data || !data.success){ window.pvShowToast && pvShowToast((data && data.message) || 'Falha no login', { background:'#F84449' }); return; }
            state.user = { name: data.user?.name||'', email: data.user?.email||email };
            saveUser();
            // sincroniza tarefas do servidor; se vazio, cria uma tarefa exemplo no servidor
            await syncTasksFromServer();
            if(!(state.tasks||[]).length){
              const today = getTodayISO();
              try {
                const example = { title:'Bem-vindo ao Produtivus', desc:'Tarefa de exemplo para começar.', start: today, end: today, color:'#c29d67', subtasks:[], done:false };
                const newId = await serverCreateTask(example);
                state.tasks.unshift({ id: String(newId||Date.now().toString(36)), ...example });
              } catch(_){}
            }
            // re-renderiza o header e badges imediatamente após login
            renderHeader();
            updateWelcomeUI && updateWelcomeUI();
            updateNotificationsUI();
            const last = localStorage.getItem('pv_view_'+state.user.email.toLowerCase()) || 'tasks';
            showView(last);
            _tourMaybeStart();
            // fecha menus abertos
            const um = document.getElementById('user-menu'); if(um) um.classList.add('hidden');
          } catch(err){
            console.error(err);
            window.pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' });
          }
        })();
      }
      if(e.target.id==='btn-register'){
        (async ()=>{
          const name = (document.getElementById('reg-name')?.value||'').trim();
          const email = (document.getElementById('reg-email')?.value||'').trim();
          const pw = (document.getElementById('reg-pass')?.value||'');
          const pw2 = (document.getElementById('reg-pass2')?.value||'');
          if(!name){ window.pvShowToast && pvShowToast('Nome obrigatório', { background:'#F84449' }); return; }
          if(!isValidEmail(email)){ window.pvShowToast && pvShowToast('Email inválido', { background:'#F84449' }); return; }
          if(pw !== pw2){ window.pvShowToast && pvShowToast('Senhas não conferem', { background:'#F84449' }); return; }
          if(!isStrongPassword(pw)){
            window.pvShowToast && pvShowToast('Senha fraca: mínimo 8, maiúscula, minúscula, número e caractere especial', { background:'#F84449' });
            return;
          }
          try {
            const resp = await fetch(`${API_BASE}/register.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ name, email, password: pw })
            });
            const ct = resp.headers.get('content-type')||'';
            if(!resp.ok || !ct.includes('application/json')){
              throw new Error('Falha na API de cadastro (HTTP '+resp.status+').');
            }
            const data = await resp.json();
            if(!data.success){ window.pvShowToast && pvShowToast(data.message||'Falha no cadastro', { background:'#F84449' }); return; }
            window.pvShowToast && pvShowToast('Cadastro realizado. Você já pode fazer login.', { background:'#365562' });
            showView('login');
          } catch(err){
            console.error(err);
            window.pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' });
          }
        })();
      }
      // Perfil / alterar senha / excluir conta
      if(e.target.id==='user-profile'){
        (async ()=>{
          try{
            const r = await fetch(`${API_BASE}/account.php`, { credentials:'same-origin' });
            const j = await r.json().catch(()=>null);
            if(!r.ok || !j?.success){ pvShowToast && pvShowToast(j?.message||'Falha ao carregar perfil', { background:'#F84449' }); return; }
            const u = j.user || {};
            const ov = document.getElementById('account-modal-overlay');
            if(!ov) return;
            ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false');
            const name = document.getElementById('acc-name'); const email = document.getElementById('acc-email');
            if(name) name.value = u.name || '';
            if(email) email.value = u.email || '';
          }catch(err){ pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' }); }
        })();
        return;
      }
      if(e.target.id==='user-password'){
        const ov = document.getElementById('password-modal-overlay'); if(ov){ ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); }
        return;
      }
      if(e.target.id==='user-delete'){
        const ov = document.getElementById('delete-modal-overlay'); if(ov){ ov.classList.remove('hidden'); ov.setAttribute('aria-hidden','false'); }
        return;
      }
  if(e.target.id==='btn-logout' || e.target.id==='btn-logout-m'){
        (async ()=>{
          try { await fetch(`${API_BASE}/logout.php`, { method:'POST', credentials:'same-origin' }); } catch(_) {}
          state.user = null;
          localStorage.removeItem('pv_user');
          // re-renderiza header e limpa badges imediatamente após logout
          renderHeader();
          updateWelcomeUI && updateWelcomeUI();
          updateNotificationsUI();
          showView('login');
        })();
      }
      if(e.target.id==='btn-add-task' || e.target.id==='btn-new'){ openTaskModal(); }

      // notificações
  const notifBtn = e.target.closest('#btn-notif') || e.target.closest('#btn-notif-m');
  if(notifBtn){
        const panel = document.getElementById('notif-panel');
        if(panel){
          const isHidden = panel.classList.toggle('hidden');
          notifBtn.setAttribute('aria-expanded', String(!isHidden));
          // se abrir via mobile, fecha o menu móvel para não sobrepor
          const mmNow = document.getElementById('mobile-menu');
          if(mmNow && !mmNow.classList.contains('hidden')){
            mmNow.classList.add('hidden');
            mmNow.setAttribute('aria-hidden','true');
            const mb=document.getElementById('btn-menu'); if(mb) mb.setAttribute('aria-expanded','false');
          }
        }
        return;
      }
      // fechar painel ao clicar fora
      const panelEl = document.getElementById('notif-panel');
      if(panelEl && !panelEl.classList.contains('hidden')){
        const clickedInsidePanel = e.target.closest('#notif-panel');
        const clickedBell = e.target.closest('#btn-notif') || e.target.closest('#btn-notif-m');
        if(!clickedInsidePanel && !clickedBell){ panelEl.classList.add('hidden'); const btn = document.getElementById('btn-notif'); if(btn) btn.setAttribute('aria-expanded','false'); }
      }
      if(e.target.id==='notif-close'){ const panel = document.getElementById('notif-panel'); const btn = document.getElementById('btn-notif'); if(panel){ panel.classList.add('hidden'); if(btn) btn.setAttribute('aria-expanded','false'); } return; }
      const notifItem = e.target.closest('[data-notif-view]');
      if(notifItem){ const id = notifItem.getAttribute('data-notif-view'); const t = state.tasks.find(x=>x.id==id); if(t){ const panel = document.getElementById('notif-panel'); if(panel) panel.classList.add('hidden'); openViewModal(t); } return; }

    const delBtn = e.target.closest('[data-del]');
    if(delBtn){
      const id = delBtn.dataset.del;
      const ask = window.pvShowConfirm ? window.pvShowConfirm('Remover tarefa?') : Promise.resolve(confirm('Remover tarefa?'));
      ask.then(async ok=>{ if(ok){ try { await serverDeleteTask(id); } catch(_){} state.tasks = state.tasks.filter(t=>t.id!=id); renderCards(); updateNotificationsUI(); if(window.pvShowToast) pvShowToast('Tarefa removida'); }});
    }

    const doneBtn = e.target.closest('[data-done]');
    if(doneBtn){ const id = doneBtn.dataset.done; const t = state.tasks.find(x=>x.id==id); if(t){ t.done = !t.done; try { serverUpdateTask(id, { done: t.done }).catch(()=>{}); } catch(_){} renderCards(); updateNotificationsUI(); } }

      const editBtn = e.target.closest('.btn-edit');
      if(editBtn){ const id = editBtn.dataset.id; const t = state.tasks.find(x=>x.id==id); if(t){ openTaskModal(id);
          if(modal.titleInp()) modal.titleInp().value = t.title || '';
          if(modal.desc()) modal.desc().value = t.desc || '';
          if(modal.start()) modal.start().value = t.start || '';
          if(modal.end()) modal.end().value = t.end || '';
          const hidden = document.querySelector('#task-color'); if(hidden) hidden.value = t.color || COLORS[0];
          renderPalette(t.color || COLORS[0]); if(modal.subtasks()) { modal.subtasks().innerHTML = ''; (t.subtasks||[]).forEach(s=> addSubtaskLine({ text:s.text, done:!!s.done })); }
        } }
    });

  // modal internal events
  // submit do formulário
  const form = document.getElementById('task-form');
  if(form){ form.addEventListener('submit', (e)=> { e.preventDefault(); const submitBtn = form.querySelector('button[type="submit"]'); if(submitBtn){ submitBtn.disabled = true; } saveTaskFromModal(); }); }
  if(modal.addSubBtn()) modal.addSubBtn().addEventListener('click', (e)=> { e.preventDefault(); addSubtaskLine(); });
  // evita handler duplo no botão salvar; submissão é tratada no evento do formulário
    if(modal.cancelBtn()) modal.cancelBtn().addEventListener('click', ()=> closeTaskModal());
    if(modal.closeBtn()) modal.closeBtn().addEventListener('click', ()=> closeTaskModal());
    // close when click overlay background
  if(modal.overlay()) modal.overlay().addEventListener('click', (e)=> { if(e.target === modal.overlay()) closeTaskModal(); });
  // eventos da modal de visualização
  const viewOv = document.getElementById('task-view-overlay');
  const viewCloseX = document.getElementById('close-task-view');
  const viewCloseBtn = document.getElementById('tv-close-btn');
  if(viewCloseX) viewCloseX.addEventListener('click', closeViewModal);
  if(viewCloseBtn) viewCloseBtn.addEventListener('click', closeViewModal);
  if(viewOv) viewOv.addEventListener('click', (e)=>{ if(e.target === viewOv) closeViewModal(); });

  // ===== Modais de Conta =====
  // Perfil
  const accOv = document.getElementById('account-modal-overlay');
  const accClose = document.getElementById('close-account-modal');
  const accForm = document.getElementById('account-form');
  const accCancel = document.getElementById('acc-cancel');
  function closeAcc(){ if(accOv){ accOv.classList.add('hidden'); accOv.setAttribute('aria-hidden','true'); } }
  if(accClose) accClose.onclick = closeAcc;
  if(accCancel) accCancel.onclick = closeAcc;
  if(accForm){ accForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('acc-name')?.value?.trim()||'';
    const email = document.getElementById('acc-email')?.value?.trim()||'';
    try{
      const r = await fetch(`${API_BASE}/account.php`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify({ name, email }) });
      const j = await r.json().catch(()=>null);
      if(!r.ok || !j?.success){ pvShowToast && pvShowToast(j?.message||'Falha ao salvar', { background:'#F84449' }); return; }
      if(state.user){ state.user.name = name; state.user.email = email; saveUser(); renderHeader(); updateWelcomeUI && updateWelcomeUI(); }
      pvShowToast && pvShowToast('Dados atualizados');
      closeAcc();
    }catch(err){ pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' }); }
  }); }
  if(accOv){ accOv.addEventListener('click', (e)=>{ if(e.target===accOv) closeAcc(); }); }

  // Alterar senha
  const pwdOv = document.getElementById('password-modal-overlay');
  const pwdClose = document.getElementById('close-password-modal');
  const pwdCancel = document.getElementById('pwd-cancel');
  const pwdForm = document.getElementById('password-form');
  function closePwd(){ if(pwdOv){ pwdOv.classList.add('hidden'); pwdOv.setAttribute('aria-hidden','true'); } }
  if(pwdClose) pwdClose.onclick = closePwd;
  if(pwdCancel) pwdCancel.onclick = closePwd;
  if(pwdForm){ pwdForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const current = document.getElementById('pwd-current')?.value||'';
    const next = document.getElementById('pwd-new')?.value||'';
    try{
      const r = await fetch(`${API_BASE}/account.php`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const j = await r.json().catch(()=>null);
      if(!r.ok || !j?.success){ pvShowToast && pvShowToast(j?.message||'Falha ao alterar senha', { background:'#F84449' }); return; }
      pvShowToast && pvShowToast('Senha alterada');
      closePwd();
    }catch(err){ pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' }); }
  }); }
  if(pwdOv){ pwdOv.addEventListener('click', (e)=>{ if(e.target===pwdOv) closePwd(); }); }

  // Excluir conta
  const delOv = document.getElementById('delete-modal-overlay');
  const delClose = document.getElementById('close-delete-modal');
  const delCancel = document.getElementById('delete-cancel');
  const delForm = document.getElementById('delete-form');
  function closeDel(){ if(delOv){ delOv.classList.add('hidden'); delOv.setAttribute('aria-hidden','true'); } }
  if(delClose) delClose.onclick = closeDel;
  if(delCancel) delCancel.onclick = closeDel;
  if(delForm){ delForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const conf = document.getElementById('delete-confirm')?.value?.trim();
    if(conf !== 'DELETE'){ pvShowToast && pvShowToast('Digite DELETE para confirmar', { background:'#F84449' }); return; }
    try{
      const r = await fetch(`${API_BASE}/account.php`, { method:'DELETE', headers:{ 'Content-Type':'application/json' }, credentials:'same-origin', body: JSON.stringify({ confirm: 'DELETE' }) });
      const j = await r.json().catch(()=>null);
      if(!r.ok || !j?.success){ pvShowToast && pvShowToast(j?.message||'Falha ao excluir conta', { background:'#F84449' }); return; }
      pvShowToast && pvShowToast('Conta excluída');
      closeDel();
      state.user = null; localStorage.removeItem('pv_user'); renderHeader(); updateWelcomeUI && updateWelcomeUI(); updateNotificationsUI(); showView('login');
    }catch(err){ pvShowToast && pvShowToast('Erro de conexão', { background:'#F84449' }); }
  }); }
  if(delOv){ delOv.addEventListener('click', (e)=>{ if(e.target===delOv) closeDel(); }); }
  }

  // ===== Notificações =====
  function getTodayISO(){ const d = new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
  function addDaysISO(iso, days){ const [y,m,d] = iso.split('-').map(Number); const dt = new Date(y, m-1, d); dt.setDate(dt.getDate()+days); const p=n=>String(n).padStart(2,'0'); return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}`; }
  function computeNotifications(){
    const today = getTodayISO();
    const soonLimit = addDaysISO(today, 3);
    const list = [];
    state.tasks.forEach(t=>{
      const start = t.start || null;
      const end = t.end || null;
      if(!t.done){
        if(end && end < today){ list.push({ id:t.id, title:t.title, kind:'overdue', date:end, label:'Atrasada', color:t.color }); }
        if(start && start === today){ list.push({ id:t.id, title:t.title, kind:'start-today', date:start, label:'Inicia hoje', color:t.color }); }
        if(end && end === today){ list.push({ id:t.id, title:t.title, kind:'due-today', date:end, label:'Vence hoje', color:t.color }); }
        if(end && end>today && end<=soonLimit){ list.push({ id:t.id, title:t.title, kind:'due-soon', date:end, label:'Vence em breve', color:t.color }); }
        if(start && start>today && start<=soonLimit){ list.push({ id:t.id, title:t.title, kind:'start-soon', date:start, label:'Inicia em breve', color:t.color }); }
      }
    });
    // limitar para 10 mais relevantes: overdue > due-today > start-today > due-soon > start-soon
    const prio = { overdue:5, 'due-today':4, 'start-today':3, 'due-soon':2, 'start-soon':1 };
    return list.sort((a,b)=> (prio[b.kind]-prio[a.kind]) || (a.date.localeCompare(b.date))).slice(0,10);
  }
  function updateNotificationsUI(){
    const items = computeNotifications();
    const badge = document.getElementById('notif-badge');
    const badgeM = document.getElementById('notif-badge-m');
    const listEl = document.getElementById('notif-list');
    if(badge){
      if(items.length>0){ badge.textContent = String(items.length); badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }
    }
    if(badgeM){
      if(items.length>0){ badgeM.textContent = String(items.length); badgeM.classList.remove('hidden'); }
      else { badgeM.classList.add('hidden'); }
    }
  // handler de fechar painel é tratado no listener global de clicks
    if(listEl){
      listEl.innerHTML = items.length ? items.map(n=>{
        const dateStr = formatDateBR(n.date);
        const label = n.label;
        return `<div class="notif-item" data-notif-view="${n.id}">
          <span class="dot notif-dot-bg" style="--notif-dot-bg:${n.color||'#c29d67'}"></span>
          <div class="body"><div class="title">${escapeHTML(n.title)}</div><div class="meta small">${label} • ${dateStr}</div></div>
          <button class="link-view-details" data-id="${n.id}" type="button">Ver detalhes</button>
        </div>`;
      }).join('') : '<div class="small notif-empty">Sem notificações</div>';
    }
  }

  // Welcome message between menu and logout
  function updateWelcomeUI(){
    const el = document.getElementById('welcome-msg');
    if(!el) return;
  if(state.user && state.user.name){ el.textContent = `Bem-vindo, ${state.user.name}`; el.classList.remove('welcome-hide'); el.classList.add('welcome-show'); }
  else { el.classList.remove('welcome-show'); el.classList.add('welcome-hide'); }
  }

  // demo seeding removido em favor do seed por usuário no login

  // startup
  document.addEventListener('DOMContentLoaded', async ()=>{
    loadUser();
    if(state.user){ try { await syncTasksFromServer(); } catch(_) { loadTasksForCurrentUser(); } }
    renderHeader();
    let initial = 'login';
    if(state.user && state.user.email){
      const key = 'pv_view_'+state.user.email.toLowerCase();
      initial = localStorage.getItem(key) || 'tasks';
    } else {
      initial = localStorage.getItem('pv_view') || 'login';
    }
    showView(initial);
  // se já estava logado e nunca viu o tour, inicia
  _tourMaybeStart();
    wire();
    updateNotificationsUI();
    console.log('Protótipo carregado com modal');
  });
})();
