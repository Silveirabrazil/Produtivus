// js/modules/notifications.js
// Sistema de notificações: persistente por usuário (localStorage), badge no header e dropdown
(function(){
  if (window.pvNotifications && window.pvNotify) return;

  function injectCss(){ /* estilos vivem em css/scss/_notifications.scss */ }

  function now(){ return Date.now(); }
  function fmtTime(ts){
    try{
      const d = new Date(ts);
      const pad = (n)=> String(n).padStart(2,'0');
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }catch{ return '' }
  }

  function getUser(){ try { return JSON.parse(localStorage.getItem('pv_user')||'null'); } catch { return null; } }
  function storeKey(){ const u=getUser(); return 'pv_notifications_' + (u?.email || 'anon'); }
  function loadAll(){ try { return JSON.parse(localStorage.getItem(storeKey())||'[]'); } catch { return []; } }
  function saveAll(list){ try { localStorage.setItem(storeKey(), JSON.stringify(list)); } catch {}
    document.dispatchEvent(new CustomEvent('pv:notif:changed')); }

  function addNotification(n){
    const list = loadAll();
    const id = n.id || (String(now()) + '_' + Math.random().toString(36).slice(2,7));
    const item = {
      id,
      title: n.title || 'Notificação',
      message: n.message || '',
      type: n.type || 'info', // info|success|warning|error
      link: n.link || '',
      ts: n.ts || now(),
      unread: true,
      iconBg: (n.type==='success'?'#16a34a':n.type==='warning'?'#d97706':n.type==='error'?'#b91c1c':'#365562')
    };
    list.unshift(item);
    // mantém no máximo 200
    if (list.length>200) list.length=200;
    saveAll(list);
    try { maybeSystemNotify(item); } catch {}
    return item.id;
  }

  function markRead(id){ const list = loadAll(); const it = list.find(x=>x.id===id); if (it) { it.unread=false; saveAll(list); } }
  function markAllRead(){ const list = loadAll(); list.forEach(x=>x.unread=false); saveAll(list); }
  function clearAll(){ saveAll([]); }
  function countUnread(){ return loadAll().filter(x=>x.unread).length; }

  function isSystemEnabled(){ return ('Notification' in window) && Notification.permission==='granted'; }
  function canAskSystem(){ return ('Notification' in window) && Notification.permission!=='denied'; }
  async function enableSystem(){ if (!('Notification' in window)) return false; const p = await Notification.requestPermission(); return p==='granted'; }
  function maybeSystemNotify(item){
    if (!('Notification' in window)) return;
    if (Notification.permission!=='granted') return;
    try{
      const n = new Notification(item.title || 'Notificação', { body: item.message || '', icon: '/img/image.png', tag: item.id });
      if (item.link) n.onclick = ()=> { window.focus(); window.location.href=item.link; };
    }catch{}
  }

  function renderList(container){
    const list = loadAll();
    const ul = document.createElement('div'); ul.className='pv-notif-list list-group';
    if (!list.length){ const e=document.createElement('div'); e.className='pv-notif-empty list-group-item text-muted'; e.textContent='Sem notificações.'; ul.appendChild(e); }
    list.forEach(n=>{
      const li = document.createElement('div'); li.className='pv-notif-item list-group-item d-flex justify-content-between' + (n.unread?' unread':''); li.dataset.id = n.id;
      const ic = document.createElement('div'); ic.className='pv-notif-ic me-2'; ic.style.background = n.iconBg; ic.innerHTML = svgForType(n.type);
      const ct = document.createElement('div'); ct.className='pv-notif-ct flex-grow-1';
      const ttl = document.createElement('div'); ttl.className='pv-notif-ttl fw-semibold'; ttl.textContent = n.title || 'Notificação';
      const msg = document.createElement('div'); msg.className='pv-notif-msg small text-truncate'; msg.textContent = n.message || '';
      const meta = document.createElement('div'); meta.className='pv-notif-meta small text-muted'; meta.textContent = fmtTime(n.ts);
      if (n.link){ const a=document.createElement('a'); a.href=n.link; a.className='pv-notif-link'; a.textContent='Abrir'; a.addEventListener('click',()=>{ markRead(n.id); /* dropdown fecha automaticamente ao navegar */ }); meta.append(' • ', a); }
      ct.append(ttl, msg, meta);
      li.append(ic, ct);
      li.addEventListener('click',()=>{ markRead(n.id); });
      ul.appendChild(li);
    });
    return ul;
  }

  function svgForType(t){
    const common = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    if (t==='success') return `<svg ${common}><path d="M20 6L9 17l-5-5"/></svg>`;
    if (t==='warning') return `<svg ${common}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
    if (t==='error') return `<svg ${common}><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>`;
    return `<svg ${common}><path d="M13 16h-1v-4h-1"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="10"/></svg>`;
  }

  function renderDropdownContent(root, menu){
    // Cabeçalho com ações
    const head = document.createElement('div'); head.className='pv-notif-head d-flex align-items-center justify-content-between px-3 pt-3';
    const title = document.createElement('div'); title.className='pv-notif-title fw-semibold'; title.textContent='Notificações';
    const acts = document.createElement('div'); acts.className='pv-notif-actions d-flex gap-2';
    const btnMark = document.createElement('button'); btnMark.className='btn btn-sm btn-outline-primary'; btnMark.textContent='Marcar todas como lidas'; btnMark.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); markAllRead(); refresh(root); renderDropdownContent(root, menu); });
    const btnClear = document.createElement('button'); btnClear.className='btn btn-sm btn-outline-danger'; btnClear.textContent='Limpar'; btnClear.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); clearAll(); refresh(root); renderDropdownContent(root, menu); });
    acts.append(btnMark, btnClear);
    head.append(title, acts);

    // Lista
    const list = renderList(root);
    list.classList.add('px-2');

    // Rodapé opcional
    let foot = null;
    if (canAskSystem()){
      foot = document.createElement('div'); foot.className = 'pv-notif-foot d-flex align-items-center justify-content-between gap-2 border-top px-3 py-2';
      const txt = document.createElement('div'); txt.className='pv-notif-foot-text small text-muted'; txt.textContent = 'Ativar notificações do sistema?';
      const btnEnable = document.createElement('button'); btnEnable.id='pv-notif-enable'; btnEnable.className='btn btn-sm btn-outline-secondary'; btnEnable.textContent = 'Ativar';
      btnEnable.addEventListener('click', async (e)=>{ e.preventDefault(); e.stopPropagation(); const ok = await enableSystem(); if (ok){ addNotification({title:'Notificações do sistema ativadas', type:'success'}); refresh(root); renderDropdownContent(root, menu); } });
      foot.append(txt, btnEnable);
    }

    // Monta menu
    menu.innerHTML = '';
    const cont = document.createElement('div'); cont.className='pv-notif-panel'; // reutiliza estilos existentes
    cont.append(head, list);
    if (foot) cont.append(foot);
    menu.appendChild(cont);
  }

  function refresh(root){
    // update badge
    const c = countUnread();
    const badge = root.querySelector('.pv-notif-badge');
    if (badge) badge.textContent = c>99? '99+': String(c);
    if (badge) badge.style.display = c>0 ? 'block' : 'none';
    // re-render dropdown content if open
    const menu = root._pvNotifMenu;
    if (menu && (menu.classList.contains('show') || document.activeElement === menu)){
      renderDropdownContent(root, menu);
    }
  }

  function mount(anchor){
    try{ injectCss(); }catch{}
  const root = document.createElement('div'); root.className='pv-notif-wrap dropdown';
  const btn = document.createElement('button'); btn.type='button';
  // botão estilo navbar (sem borda)
  btn.className='nav-icon-btn pv-notif-btn position-relative dropdown-toggle';
    btn.setAttribute('aria-label','Notificações');
    btn.setAttribute('data-bs-toggle','dropdown');
    btn.setAttribute('data-bs-auto-close','outside');
    btn.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
    const badge = document.createElement('span'); badge.className='pv-notif-badge badge bg-danger rounded-pill position-absolute translate-middle'; badge.style.top='6px'; badge.style.right='6px'; badge.style.display='none'; badge.textContent='0'; btn.appendChild(badge);
    root.appendChild(btn);

    // Dropdown menu
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu dropdown-menu-end p-0 shadow';
    menu.style.minWidth = '360px';
    menu.style.maxWidth = '90vw';
    menu.style.maxHeight = '70vh';
    menu.style.overflow = 'auto';
    root.appendChild(menu);
    root._pvNotifMenu = menu;

    // Inicializa conteúdo e integra com Bootstrap se presente
    renderDropdownContent(root, menu);
    if (window.bootstrap?.Dropdown){
      const dd = window.bootstrap.Dropdown.getOrCreateInstance(btn, { autoClose: 'outside' });
      btn.addEventListener('shown.bs.dropdown', ()=> renderDropdownContent(root, menu));
    } else {
      // Fallback simples sem Bootstrap JS
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        menu.classList.toggle('show');
        root.classList.toggle('show');
      });
      document.addEventListener('click', (e)=>{
        if (!root.contains(e.target)){
          menu.classList.remove('show');
          root.classList.remove('show');
        }
      });
    }

    (anchor || document.body).appendChild(root);
    refresh(root);
    document.addEventListener('pv:notif:changed', ()=> {
      refresh(root);
      // Atualiza conteúdo se aberto
      if (menu.classList.contains('show')) renderDropdownContent(root, menu);
    });
  }

  // Sistema avançado de notificações com toast e ações
  function showToastNotification(n) {
    try {
      const toast = document.createElement('div');
      toast.className = `pv-toast pv-toast-${n.type || 'info'}`;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-left: 4px solid ${n.type === 'success' ? '#16a34a' : n.type === 'warning' ? '#d97706' : n.type === 'error' ? '#b91c1c' : '#365562'};
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      `;

      const title = document.createElement('div');
      title.style.cssText = 'font-weight: 600; margin-bottom: 4px; color: #111;';
      title.textContent = n.title || 'Notificação';

      const message = document.createElement('div');
      message.style.cssText = 'color: #666; font-size: 14px; margin-bottom: 8px;';
      message.textContent = n.message || '';

      toast.appendChild(title);
      toast.appendChild(message);

      // Adicionar ações se existirem
      if (n.actions && Array.isArray(n.actions) && n.actions.length > 0) {
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 12px;';

        n.actions.forEach(action => {
          const btn = document.createElement('button');
          btn.textContent = action.text || 'OK';
          btn.style.cssText = `
            background: ${action.primary ? '#365562' : 'transparent'};
            color: ${action.primary ? 'white' : '#365562'};
            border: 1px solid #365562;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
          `;

          btn.addEventListener('click', () => {
            try {
              if (action.action && typeof action.action === 'function') {
                action.action();
              }
            } catch (error) {
              console.error('[Notification] Erro ao executar ação:', error);
            }
            removeToast();
          });

          actionsDiv.appendChild(btn);
        });

        toast.appendChild(actionsDiv);
      }

      // Botão de fechar
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '×';
      closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeBtn.addEventListener('click', removeToast);
      toast.appendChild(closeBtn);

      function removeToast() {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
          try { document.body.removeChild(toast); } catch {}
        }, 300);
      }

      document.body.appendChild(toast);

      // Animar entrada
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
      }, 10);

      // Auto-remover se não tiver ações
      if (!n.actions || n.actions.length === 0) {
        setTimeout(removeToast, n.timeout || 5000);
      }

    } catch (error) {
      console.error('[Notification] Erro ao mostrar toast:', error);
    }
  }

  function enhancedNotify(options) {
    // Adicionar à lista de notificações
    const id = addNotification(options);

    // Mostrar toast se não for uma notificação silenciosa
    if (!options.silent) {
      showToastNotification(options);
    }

    return id;
  }

  window.pvNotifications = { mount, add: addNotification, list: loadAll, markAllRead, clearAll, enableDesktop: enableSystem, isDesktopEnabled: isSystemEnabled };
  window.pvNotify = enhancedNotify;
})();
