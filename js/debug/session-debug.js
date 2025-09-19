// js/debug/session-debug.js
(function(){
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  // Expor uma função que renderiza o painel de diagnóstico dentro de um elemento fornecido
  async function pvDebugRender(targetEl) {
    try {
      if (!targetEl) return;
      // limpar conteúdo antigo
      targetEl.innerHTML = '';
      const pvUserRaw = localStorage.getItem('pv_user');
      const pvUserText = pvUserRaw ? pvUserRaw : 'null';
      const header = document.createElement('div');
      header.style.cssText = 'background:#fffaf0;border:1px solid #f0c070;color:#2b2b1b;padding:0.45rem 0.6rem;border-radius:6px;margin-bottom:0.5rem;font-size:0.95rem;';
      header.innerHTML = '<strong>DEBUG</strong> • pv_user: <code style="background:transparent;border-radius:2px;padding:0 0.2rem;">' + escapeHtml(pvUserText) + '</code>' +
        '<button id="pv-debug-force" style="margin-left:0.6rem;padding:0.2rem 0.5rem;border-radius:4px;background:#111;color:#fff;border:none;cursor:pointer;font-size:0.85rem;">Forçar pv_user</button>';
      targetEl.appendChild(header);
      const details = document.createElement('div');
      details.id = 'pv-debug-details';
      details.style.color = '#333';
      targetEl.appendChild(details);

      // If this looks like tarefas page, try the tasks API
      if (document.getElementById('cards-pendentes') || location.pathname.includes('tarefas')) {
        details.innerHTML += '<div>Verificando API de tarefas...</div>';
        try {
          const r = await fetch('/server/api/tasks.php', { credentials: 'same-origin' });
          details.innerHTML += '<div>API /server/api/tasks.php status: ' + r.status + '</div>';
          let j = null;
          try { j = await r.json(); } catch(e){ j = null; }
          details.innerHTML += '<pre style="white-space:pre-wrap;margin:0.45rem 0">' + escapeHtml(JSON.stringify(j)) + '</pre>';
          if (r.status === 401) details.innerHTML += '<div style="color:#b94a4a">Resposta 401: sessão backend ausente. Faça login no servidor.</div>';
        } catch (err) {
          details.innerHTML += '<div style="color:#b94a4a">Erro ao conectar API: ' + escapeHtml(String(err)) + '</div>';
        }
      }

      // If this looks like calendar page, check FullCalendar and styles
      if (document.getElementById('fullcalendar') || location.pathname.includes('calendario')) {
        details.innerHTML += '<div style="margin-top:0.4rem">Verificando FullCalendar...</div>';
        const fcPresent = typeof FullCalendar !== 'undefined';
        details.innerHTML += '<div>FullCalendar presente: ' + (fcPresent ? 'sim' : 'não') + '</div>';
        if (fcPresent) {
          const styleEl = document.querySelector('style[data-fullcalendar]');
          details.innerHTML += '<div>style[data-fullcalendar] encontrado: ' + (styleEl ? 'sim' : 'não') + '</div>';
        } else {
          const scripts = Array.from(document.scripts).filter(s=>s.src && s.src.includes('fullcalendar')).map(s=>s.src);
          details.innerHTML += '<div>Scripts FullCalendar detectados:<pre style="white-space:pre-wrap;margin:0.25rem 0">' + escapeHtml(scripts.join('\n') || 'nenhum') + '</pre></div>';
        }
      }

        // DOM counts and helpers for tasks/calendar to help debug why UI não aparece
        try {
          const pendentes = document.getElementById('cards-pendentes');
          const feitas = document.getElementById('cards-feitas');
          const localTasksRaw = localStorage.getItem('pv_tasks');
          const localTasks = (() => { try { return JSON.parse(localTasksRaw||'[]'); } catch(e){ return null; } })();
          details.innerHTML += '<div style="margin-top:0.45rem"><strong>DOM</strong> • cards-pendentes: ' + (pendentes ? pendentes.children.length : 'n/a') + ', cards-feitas: ' + (feitas ? feitas.children.length : 'n/a') + '</div>';
          details.innerHTML += '<div><strong>localStorage</strong> • pv_tasks: ' + (Array.isArray(localTasks) ? localTasks.length : (localTasks === null ? 'inválido' : 'n/a')) + '</div>';
          // provide quick highlight buttons
          const controls = document.createElement('div');
          controls.style.marginTop = '0.4rem';
          controls.innerHTML = '<button id="pv-debug-hl-tasks" style="margin-right:0.35rem;padding:0.25rem 0.45rem;border-radius:4px;background:#ffb84d;border:none;cursor:pointer;">Destacar tarefas</button>' +
                               '<button id="pv-debug-hl-cal" style="padding:0.25rem 0.45rem;border-radius:4px;background:#7cc6ff;border:none;cursor:pointer;">Destacar calendário</button>';
          details.appendChild(controls);
          document.getElementById('pv-debug-hl-tasks').addEventListener('click', function(){
            const el = document.querySelector('.cards-pendentes-container') || document.querySelector('.cards-pendentes') || document.getElementById('cards-pendentes');
            if (!el) return (window.pvShowToast||((m)=>alert(m)))('Container de tarefas não encontrado');
            const old = el.style.boxShadow; el.style.boxShadow = '0 0 0 4px rgba(255,90,54,0.35)'; setTimeout(()=>el.style.boxShadow=old,5000);
          });
          document.getElementById('pv-debug-hl-cal').addEventListener('click', function(){
            const el = document.getElementById('fullcalendar') || document.querySelector('.central-calendar') || document.querySelector('.fc');
            if (!el) return (window.pvShowToast||((m)=>alert(m)))('Container de calendário não encontrado');
            const old = el.style.boxShadow; el.style.boxShadow = '0 0 0 4px rgba(0,122,204,0.35)'; setTimeout(()=>el.style.boxShadow=old,5000);
          });
        } catch (e) { /* ignore */ }

      // attach force button handler (dev only)
          try {
            var forceBtn = document.getElementById('pv-debug-force');
            if (forceBtn) {
              forceBtn.addEventListener('click', function(){
                try {
                  var devUser = { id: 1, email: 'dev@local', name: 'Dev' };
                  localStorage.setItem('pv_user', JSON.stringify(devUser));
                  (window.pvShowToast||((m)=>alert(m)))('pv_user definido para: ' + JSON.stringify(devUser));
                  location.reload();
                } catch (e) { console.warn('pv-debug: não foi possível definir pv_user', e); }
              });
            }
          } catch (e) {}
    } catch (e) {
      console.warn('pv-debug failed', e);
    }
  }

  // tornar a função pública para que outros módulos possam renderizar o painel de diagnóstico
  window.pvDebugRender = pvDebugRender;
})();
