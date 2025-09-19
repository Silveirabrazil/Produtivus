// js/modules/header.js
// Renderiza o header dinâmico do Produtivus
function renderHeader(container) {
    // se foi chamado como handler de evento, container será um Event
    if (container && typeof container === 'object' && !('querySelector' in container)) {
        container = null;
    }
    // accept either #header-container or #header for legacy pages
    if (!container) container = document.getElementById('header-container') || document.getElementById('header');
    if (!container) return;
    // garante CSS do novo header/footer
    try{
        // Não injeta mais Bootstrap via JS; o CSS/JS é carregado no head global (inc/head.php)
        if(!document.querySelector('link[href*="material-symbols.css"]')){ const m=document.createElement('link'); m.rel='stylesheet'; m.href='css/fonts/material-symbols.css'; document.head.appendChild(m); }
    }catch{}
    const user = JSON.parse(localStorage.getItem('pv_user') || 'null');
    const displayName = (user && (user.name && String(user.name).trim())) ? user.name : ((user && user.email) ? String(user.email).split('@')[0] : 'Usuário');
    let html = '';

    if (user) {
                html = `
<nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom shadow-sm">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
            <img src="img/logo.png" alt="Produtivus" loading="lazy" style="height:40px" />
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#pv-navbar" aria-controls="pv-navbar" aria-expanded="false" aria-label="Alternar navegação">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="pv-navbar">
            <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                <li class="nav-item"><a class="nav-link" href="tarefas.html">Tarefas</a></li>
                <li class="nav-item"><a class="nav-link" href="calendario.html">Calendário</a></li>
                <li class="nav-item"><a class="nav-link" href="dashboard.html">Dashboard</a></li>
                <li class="nav-item"><a class="nav-link" href="cadernos.html">Cadernos</a></li>
                <li class="nav-item"><a class="nav-link" href="mapas.html">Mapas Mentais</a></li>
                <li class="nav-item"><a class="nav-link" href="planilhas.html">Planilhas</a></li>
                <li class="nav-item"><a class="nav-link" href="estudos.html">Estudos</a></li>
            </ul>
        <div class="d-flex align-items-center gap-2">
                <span id="pv-notif-anchor"></span>
                <span id="welcome-msg" class="small text-muted">Bem-vindo, ${displayName}</span>
                <div class="dropdown">
            <button class="nav-icon-btn d-flex align-items-center justify-content-center rounded-circle" id="btn-user" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Conta" style="width:38px; height:38px">
                        <svg class="svg-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zM12 14c-4.418 0-8 3.582-8 8h2c0-3.309 2.691-6 6-6s6 2.691 6 6h2c0-4.418-3.582-8-8-8z" fill="currentColor"/></svg>
                    </button>
                    <ul id="user-menu" class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="btn-user">
                        <li><h6 class="dropdown-header">Conta</h6></li>
                        <li><button type="button" class="dropdown-item" id="user-profile">Perfil</button></li>
                        <li><button type="button" class="dropdown-item" id="user-password">Alterar senha</button></li>
                        <li><button type="button" class="dropdown-item" id="user-diagnostico">Diagnóstico</button></li>
                        <li><hr class="dropdown-divider" /></li>
                        <li><button type="button" class="dropdown-item text-danger" id="user-delete">Excluir conta</button></li>
                        <li><button type="button" class="dropdown-item" id="btn-logout">Sair</button></li>
                    </ul>
                </div>
                <span id="pv-timer-anchor"></span>
            </div>
        </div>
    </div>
</nav>`;
        } else {
                html = `
<nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom shadow-sm">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
            <img src="img/logo.png" alt="Produtivus" loading="lazy" style="height:40px" />
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#pv-navbar" aria-controls="pv-navbar" aria-expanded="false" aria-label="Alternar navegação">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="pv-navbar">
            <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                <li class="nav-item"><a class="nav-link" href="index.html">Início</a></li>
            </ul>
            <div class="d-flex align-items-center gap-2">
                <button type="button" id="btn-open-login" class="btn btn-primary">Entrar</button>
            </div>
        </div>
    </div>
</nav>`;
        }

    container.innerHTML = html;

    // Marcar link ativo de acordo com a URL
    try {
        const path = (location.pathname || '').split('/').pop() || 'index.html';
        container.querySelectorAll('.navbar .nav-link').forEach(a => {
            const href = (a.getAttribute('href')||'').trim();
            if (!href) return;
            if (href === path) a.classList.add('active');
        });
    } catch {}

    // Força a recarga da logo: remove e insere novamente com cache-busting
    try {
        const brand = container.querySelector('.navbar-brand img');
        if (brand) {
            const baseSrc = (brand.getAttribute('src') || '').split('?')[0] || 'img/logo.png';
            const fresh = document.createElement('img');
            fresh.alt = brand.alt || 'Produtivus';
            fresh.loading = 'lazy';
            fresh.style.height = brand.style.height || '40px';
            fresh.src = baseSrc + '?v=' + (window.pvBuildId || Date.now());
            brand.replaceWith(fresh);
        }
    } catch {}

    // Garantir que o ícone do Timer esteja no navbar (como dropdown à direita) — somente quando logado
    try {
    const topRight = container.querySelector('#pv-timer-anchor') || container.querySelector('.d-flex.align-items-center.gap-2');
    if (user && topRight && !container.querySelector('#btn-timer')) {
            // Wrapper de dropdown
            const wrap = document.createElement('div'); wrap.className = 'dropdown pv-timer-dd';
            // Botão/toggle
            const b = document.createElement('button');
            b.type = 'button'; b.id = 'btn-timer';
            b.className = 'nav-icon-btn rounded-circle dropdown-toggle'; b.title = 'Timer';
            b.setAttribute('data-bs-toggle','dropdown'); b.setAttribute('data-bs-auto-close','outside');
            b.style.width = '38px'; b.style.height = '38px'; b.style.display = 'inline-flex'; b.style.alignItems = 'center'; b.style.justifyContent = 'center';
            b.innerHTML = '<span class="material-symbols-outlined">timer</span>';
            // Menu do dropdown
            const menu = document.createElement('div');
            menu.className = 'dropdown-menu dropdown-menu-end p-2 shadow';
            menu.id = 'pv-timer-menu';
            menu.style.minWidth = '380px';
            menu.style.maxWidth = '92vw';
            menu.style.maxHeight = '80vh';
            menu.style.overflow = 'auto';
            wrap.append(b, menu);

            // Anexar no anchor dedicado do Timer (extremo direito)
            topRight.appendChild(wrap);

            function mountTimerIntoMenu(){
                let host = menu.querySelector('#pv-header-timer');
                if (!host) { host = document.createElement('div'); host.id = 'pv-header-timer'; menu.innerHTML = ''; menu.appendChild(host); }
                if (window.pvStudyTimer) {
                    if (!menu._mounted) { try{ window.pvStudyTimer.mount(host); menu._mounted = true; }catch{} }
                }
            }
            function ensureTimer(){
                if (window.pvStudyTimer) { mountTimerIntoMenu(); return; }
                if (!document.querySelector('script[data-pv="study-timer"]')){
                    const st = document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; st.setAttribute('data-pv','study-timer');
                    st.onload = ()=> mountTimerIntoMenu(); document.body.appendChild(st);
                }
            }
            // Integrar com Bootstrap, se disponível, ou fallback
            if (window.bootstrap?.Dropdown){
                const dd = window.bootstrap.Dropdown.getOrCreateInstance(b, { autoClose:'outside' });
                b.addEventListener('shown.bs.dropdown', ()=> ensureTimer());
            } else {
                b.addEventListener('click', (e)=>{
                    e.stopPropagation(); ensureTimer(); wrap.classList.toggle('show'); menu.classList.toggle('show');
                });
                document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) { wrap.classList.remove('show'); menu.classList.remove('show'); } });
            }
        }
    } catch(e) {}

    // montar ações do header
    try {
        // carregar módulo de modal de login para uso do botão "Entrar"
        if (!window.openLoginModal) {
            const lm = document.createElement('script'); lm.src='js/modules/login-modal.js'; lm.defer=true; document.body.appendChild(lm);
        }
        const loginBtn = container.querySelector('#btn-open-login');
        if (loginBtn) loginBtn.addEventListener('click', function(){ try { window.openLoginModal && window.openLoginModal(); } catch {} });

    // montar notificações e Timer SOMENTE quando logado
    if (user && getComputedStyle(document.documentElement).getPropertyValue('--pv-notif-ready') === '') {
            const s = document.createElement('script'); s.src = 'js/modules/notifications.js'; s.defer = true; s.onload = function(){
                const anchor = container.querySelector('#pv-notif-anchor');
                if (anchor && window.pvNotifications) window.pvNotifications.mount(anchor.parentElement || container);
                // após montar, carregar agendador de eventos
                const s2 = document.createElement('script'); s2.src='js/modules/notif-events.js'; s2.defer=true; s2.onload=function(){ try{ window.pvNotifEvents?.start(); }catch{} };
                document.body.appendChild(s2);
                // adicionar botão de alarme no topo
                try {
                    const timerAnchor = container.querySelector('#pv-timer-anchor');
                    const actions = timerAnchor ? null : container.querySelector('.pill-actions');
                    if (!timerAnchor && actions && !actions.querySelector('#btn-timer')) {
                        // Dropdown de timer também nas ações superiores, se existirem
                        const wrap = document.createElement('div'); wrap.className='dropdown pv-timer-dd';
                        const b = document.createElement('button'); b.type='button'; b.id='btn-timer';
                        b.className='nav-icon-btn rounded-circle dropdown-toggle'; b.title='Timer';
                        b.setAttribute('data-bs-toggle','dropdown'); b.setAttribute('data-bs-auto-close','outside');
                        b.style.width='38px'; b.style.height='38px';
                        b.innerHTML = '<span class="material-symbols-outlined">timer</span>';
                        const menu = document.createElement('div'); menu.className='dropdown-menu dropdown-menu-end p-2 shadow'; menu.style.minWidth='360px'; menu.style.maxWidth='92vw'; menu.style.maxHeight='80vh'; menu.style.overflow='auto';
                        wrap.append(b, menu);
                        actions.insertBefore(wrap, actions.firstChild);
                        function mountTimerInto(){ let host = menu.querySelector('#pv-header-timer'); if (!host){ host=document.createElement('div'); host.id='pv-header-timer'; menu.innerHTML=''; menu.appendChild(host);} if (window.pvStudyTimer && !menu._mounted){ try{ window.pvStudyTimer.mount(host); menu._mounted=true; }catch{} } }
                        function ensureTimer(){ if (window.pvStudyTimer){ mountTimerInto(); return; } if (!document.querySelector('script[data-pv="study-timer"]')){ const st=document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; st.setAttribute('data-pv','study-timer'); st.onload=()=>mountTimerInto(); document.body.appendChild(st);} }
                        if (window.bootstrap?.Dropdown){ const dd = window.bootstrap.Dropdown.getOrCreateInstance(b, { autoClose:'outside' }); b.addEventListener('shown.bs.dropdown', ()=> ensureTimer()); } else { b.addEventListener('click', (e)=>{ e.stopPropagation(); ensureTimer(); wrap.classList.toggle('show'); menu.classList.toggle('show'); }); document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) { wrap.classList.remove('show'); menu.classList.remove('show'); } }); }
                    }
                    // carregar módulo do timer para uso geral (não abre modal)
                    const st = document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; document.body.appendChild(st);
                } catch {}
            }; document.body.appendChild(s);
    } else if (user) {
            const anchor = container.querySelector('#pv-notif-anchor');
            if (anchor && window.pvNotifications) window.pvNotifications.mount(anchor.parentElement || container);
            // carregar agendador
            const s2 = document.createElement('script'); s2.src='js/modules/notif-events.js'; s2.defer=true; s2.onload=function(){ try{ window.pvNotifEvents?.start(); }catch{} };
            document.body.appendChild(s2);
            // adicionar botão de alarme no topo
            try {
                const timerAnchor = container.querySelector('#pv-timer-anchor');
                const actions = timerAnchor ? null : container.querySelector('.pill-actions');
                if (!timerAnchor && actions && !actions.querySelector('#btn-timer')) {
                    const wrap = document.createElement('div'); wrap.className='dropdown pv-timer-dd';
                    const b = document.createElement('button'); b.type='button'; b.id='btn-timer';
                    b.className='nav-icon-btn rounded-circle dropdown-toggle'; b.title='Timer';
                    b.setAttribute('data-bs-toggle','dropdown'); b.setAttribute('data-bs-auto-close','outside');
                    b.style.width='38px'; b.style.height='38px';
                    b.innerHTML = '<span class="material-symbols-outlined">timer</span>';
                    const menu = document.createElement('div'); menu.className='dropdown-menu dropdown-menu-end p-2 shadow'; menu.style.minWidth='360px'; menu.style.maxWidth='92vw'; menu.style.maxHeight='80vh'; menu.style.overflow='auto';
                    wrap.append(b, menu);
                    actions.insertBefore(wrap, actions.firstChild);
                    function mountTimerInto(){ let host = menu.querySelector('#pv-header-timer'); if (!host){ host=document.createElement('div'); host.id='pv-header-timer'; menu.innerHTML=''; menu.appendChild(host);} if (window.pvStudyTimer && !menu._mounted){ try{ window.pvStudyTimer.mount(host); menu._mounted=true; }catch{} } }
                    function ensureTimer(){ if (window.pvStudyTimer){ mountTimerInto(); return; } if (!document.querySelector('script[data-pv="study-timer"]')){ const st=document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; st.setAttribute('data-pv','study-timer'); st.onload=()=>mountTimerInto(); document.body.appendChild(st);} }
                    if (window.bootstrap?.Dropdown){ const dd = window.bootstrap.Dropdown.getOrCreateInstance(b, { autoClose:'outside' }); b.addEventListener('shown.bs.dropdown', ()=> ensureTimer()); } else { b.addEventListener('click', (e)=>{ e.stopPropagation(); ensureTimer(); wrap.classList.toggle('show'); menu.classList.toggle('show'); }); document.addEventListener('click', (e)=>{ if (!wrap.contains(e.target)) { wrap.classList.remove('show'); menu.classList.remove('show'); } }); }
                }
                // carregar módulo do timer para uso geral
                const st = document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; document.body.appendChild(st);
            } catch {}
        }
    } catch {}

    // Gating de navegação quando deslogado (home/landing): links internos abrem o login
    try {
    const gateLinksSel = 'a[href$="tarefas.html"], a[href$="calendario.html"], a[href$="dashboard.html"], a[href$="cadernos.html"], a[href$="mapas.html"], a[href$="planilhas.html"], a[href$="estudos.html"], a.feature-card';
        document.querySelectorAll(gateLinksSel).forEach(a => {
            a.addEventListener('click', (ev) => {
                const href = (a.getAttribute('href')||'').trim();
                if (!href || href.startsWith('#')) return;
                // Reavaliar estado de login no momento do clique
                let isLogged = false;
                try { isLogged = !!JSON.parse(localStorage.getItem('pv_user')||'null'); } catch {}
                if (!isLogged) {
                    ev.preventDefault();
                    try { window.openLoginModal && window.openLoginModal(); } catch {}
                }
            });
        });
    } catch {}

    // Dropdown do usuário usa Bootstrap; nenhum handler custom é necessário além dos cliques dos itens.

    // Funções dos botões do submenu
    if (container.querySelector('#user-menu')) {
        const userMenu = container.querySelector('#user-menu');
        const logoutBtn = userMenu.querySelector('#btn-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', async function () {
            try { await fetch('/server/api/logout.php', { credentials:'same-origin' }); } catch {}
            localStorage.removeItem('pv_user');
            window.location.href = 'index.html';
        });
        const deleteBtn = userMenu.querySelector('#user-delete');
        if (deleteBtn) deleteBtn.addEventListener('click', function () {
            openDeleteAccountModal();
        });
        // handlers de perfil/senha/diag
        const profileBtn = userMenu.querySelector('#user-profile');
        if (profileBtn) profileBtn.addEventListener('click', openProfileModal);
        const passBtn = userMenu.querySelector('#user-password');
        if (passBtn) passBtn.addEventListener('click', openPasswordModal);
        const diagBtn = userMenu.querySelector('#user-diagnostico');
        if (diagBtn) diagBtn.addEventListener('click', function(){ openDiagPanel(container); });
    }
}

document.addEventListener('DOMContentLoaded', function(){ renderHeader(); });

// suporte a logout global, mantendo re-render do header
window.pvDoLogout = async function(){
    try { await fetch('/server/api/logout.php', { credentials:'same-origin' }); } catch {}
    localStorage.removeItem('pv_user');
    try { renderHeader(); } catch {}
    try { window.location.href = 'index.html'; } catch {}
};
// comportamento de scroll desativado: mantemos uma cor única no navbar
// (sem marcação especial no body, o header fica no fluxo normal)

// ----------------- Modais de Conta (Perfil, Senha, Exclusão) -----------------
; (function(){
        function ensureBootstrapModal(id, title, bodyHtml, footerHtml) {
                let modal = document.getElementById(id);
                if (!modal) {
                        modal = document.createElement('div');
                        modal.id = id;
                        modal.className = 'modal fade';
                        modal.tabIndex = -1;
                        modal.setAttribute('aria-hidden', 'true');
                        modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            <div class="modal-footer">${footerHtml||''}</div>
        </div>
    </div>`;
                        document.body.appendChild(modal);
                }
                return modal;
        }
    function show(ov){
        try {
            // record previously focused element so we can restore later
            ov.__pv_prevActive = document.activeElement;
        } catch(e) { ov.__pv_prevActive = null; }
        ov.classList.remove('hidden');
        ov.setAttribute('aria-hidden','false');
        // focus first focusable element inside overlay for accessibility
        try {
            const focusable = ov.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable && typeof focusable.focus === 'function') focusable.focus();
        } catch(e) {}
    }
    function hide(ov){
        try {
            // if the currently focused element is inside the overlay, move focus out
            const active = document.activeElement;
            if (active && ov.contains(active)) {
                const prev = ov.__pv_prevActive;
                if (prev && document.contains(prev) && !ov.contains(prev) && typeof prev.focus === 'function') {
                    prev.focus();
                } else if (document && document.body && typeof document.body.focus === 'function') {
                    document.body.focus();
                }
            }
        } catch(e) {}
        ov.classList.add('hidden');
        ov.setAttribute('aria-hidden','true');
        try { ov.__pv_prevActive = null; } catch(e) {}
    }

    async function fetchAccount(){
        try{
            const r = await fetch('/server/api/account.php', { credentials:'same-origin' });
            if (!r.ok) return null;
            const j = await r.json().catch(()=>null);
            return (j && j.success) ? j.user : null;
        }catch{ return null; }
    }
    async function updateAccount(patch){
        const r = await fetch('/server/api/account.php', { method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(patch||{}) });
        const j = await r.json().catch(()=>null);
        if (r.ok && j && j.success) return true; throw new Error(j?.message || ('Erro '+r.status));
    }
    async function deleteAccountApi(){
        const r = await fetch('/server/api/account.php', { method:'DELETE', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify({ confirm:'DELETE' }) });
        const j = await r.json().catch(()=>null);
        if (r.ok && j && j.success) return true; throw new Error(j?.message || ('Erro '+r.status));
    }
    function setWelcomeName(name){
        try {
            const u = JSON.parse(localStorage.getItem('pv_user')||'null') || {};
            if (name) u.name = name;
            localStorage.setItem('pv_user', JSON.stringify(u));
            const el = document.getElementById('welcome-msg');
            if (el) el.textContent = 'Bem-vindo, ' + (name || u.name || (u.email? String(u.email).split('@')[0] : 'Usuário'));
        } catch {}
    }

        window.openProfileModal = async function(){
                const bodyHtml = `
                    <form id="profile-form">
                        <div class="mb-3">
                            <label for="acc-name" class="form-label">Nome</label>
                            <input type="text" class="form-control" id="acc-name">
                        </div>
                        <div class="mb-3">
                            <label for="acc-email" class="form-label">E-mail</label>
                            <input type="email" class="form-control" id="acc-email">
                        </div>
                    </form>
                `;
                const footerHtml = `<button class="btn btn-primary" id="acc-save">Salvar</button>`;
                const modal = ensureBootstrapModal('account-profile-modal', 'Perfil', bodyHtml, footerHtml);
                const bsModal = window.bootstrap ? new window.bootstrap.Modal(modal, { backdrop:'static' }) : null;
                if (bsModal) bsModal.show();
                // preencher
                let current = await fetchAccount();
                if (current) {
                        modal.querySelector('#acc-name').value = current.name || '';
                        modal.querySelector('#acc-email').value = current.email || '';
                }
                modal.querySelector('#acc-save').addEventListener('click', async ()=>{
                        const name = modal.querySelector('#acc-name').value.trim();
                        const email = modal.querySelector('#acc-email').value.trim();
                        if (!name) { (window.pvShowToast||((m)=>alert(m)))('Informe um nome.'); return; }
                        try {
                                await updateAccount({ name, email });
                                setWelcomeName(name);
                                if (window.pvNotify) pvNotify({ title:'Perfil', message:'Dados atualizados.', type:'success' });
                                if (bsModal) bsModal.hide();
                        } catch(e) {
                                (window.pvShowToast||((m)=>alert(m)))('Falha ao salvar: ' + e.message);
                        }
                });
        };

        window.openPasswordModal = function(){
                const bodyHtml = `
                    <form id="password-form">
                        <div class="mb-3">
                            <label for="acc-cur" class="form-label">Senha atual</label>
                            <input type="password" class="form-control" id="acc-cur">
                        </div>
                        <div class="mb-3">
                            <label for="acc-new" class="form-label">Nova senha</label>
                            <input type="password" class="form-control" id="acc-new">
                        </div>
                        <div class="mb-3">
                            <label for="acc-conf" class="form-label">Confirmar nova senha</label>
                            <input type="password" class="form-control" id="acc-conf">
                        </div>
                    </form>
                `;
                const footerHtml = `<button class="btn btn-primary" id="acc-pass-save">Alterar senha</button>`;
                const modal = ensureBootstrapModal('account-password-modal', 'Alterar senha', bodyHtml, footerHtml);
                const bsModal = window.bootstrap ? new window.bootstrap.Modal(modal, { backdrop:'static' }) : null;
                if (bsModal) bsModal.show();
                const save = modal.querySelector('#acc-pass-save');
                save.addEventListener('click', async ()=>{
                        const cur = modal.querySelector('#acc-cur').value;
                        const nw = modal.querySelector('#acc-new').value;
                        const cf = modal.querySelector('#acc-conf').value;
                        if (!nw || nw.length < 8) { (window.pvShowToast||((m)=>alert(m)))('Nova senha deve ter pelo menos 8 caracteres.'); return; }
                        if (nw !== cf) { (window.pvShowToast||((m)=>alert(m)))('Confirmação não confere.'); return; }
                        try {
                                await updateAccount({ currentPassword: cur, newPassword: nw });
                                if (window.pvNotify) pvNotify({ title:'Senha', message:'Senha alterada com sucesso.', type:'success' });
                                if (bsModal) bsModal.hide();
                        } catch(e) {
                                (window.pvShowToast||((m)=>alert(m)))('Falha ao alterar senha: ' + e.message);
                        }
                });
        };

    window.openDeleteAccountModal = function(){
        const bodyHtml = `
          <h5 class="mb-3">Esta ação é permanente e apagará todas as suas tarefas, cadernos e dados.</h5>
          <div class="mb-3">
            <label for="acc-del" class="form-label">Para confirmar, digite <strong>DELETE</strong></label>
            <input type="text" class="form-control" id="acc-del">
          </div>
        `;
        const footerHtml = `<button class="btn btn-danger" id="acc-del-btn">Excluir definitivamente</button>`;
        const modal = ensureBootstrapModal('account-delete-modal', 'Excluir conta', bodyHtml, footerHtml);
        const bsModal = window.bootstrap ? new window.bootstrap.Modal(modal, { backdrop:'static' }) : null;
        if (bsModal) bsModal.show();
        const btn = modal.querySelector('#acc-del-btn');
        btn.addEventListener('click', async ()=>{
            const v = modal.querySelector('#acc-del').value.trim();
            if (v !== 'DELETE') { (window.pvShowToast||((m)=>alert(m)))('Digite DELETE para confirmar.'); return; }
            try {
                await deleteAccountApi();
                try { await fetch('/server/api/logout.php', { credentials:'same-origin' }); } catch {}
                localStorage.removeItem('pv_user');
                window.location.href = 'index.html';
                if (bsModal) bsModal.hide();
            } catch(e) {
                (window.pvShowToast||((m)=>alert(m)))('Falha ao excluir: ' + e.message);
            }
        });
    };

    window.openDiagPanel = function(container){
        let panel = document.getElementById('pv-debug-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'pv-debug-panel';
            panel.className = 'pv-debug-panel';
            panel.innerHTML = '<div class="pv-debug-header"><strong>Diagnóstico</strong><button id="pv-debug-close" class="pv-debug-close">✕</button></div><div id="pv-debug-target"></div>';
            const wrap = (container && container.querySelector) ? (container.querySelector('.user-menu-wrap') || container) : (document.querySelector('.user-menu-wrap') || document.body);
            wrap.appendChild(panel);
            const close = panel.querySelector('#pv-debug-close');
            close.addEventListener('click', function(){ panel.remove(); });
        }
        if (typeof window.pvDebugRender === 'function') {
            const target = document.getElementById('pv-debug-target');
            window.pvDebugRender(target);
        } else {
            const target = document.getElementById('pv-debug-target');
            if (target) target.textContent = 'Módulo de diagnóstico carregando...';
        }
    };
})();
