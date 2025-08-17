(function(){
  // cria container único
  function ensureContainer(){
    let c = document.querySelector('#pv-snackbar-container');
    if(!c){
      c = document.createElement('div');
      c.id = 'pv-snackbar-container';
      c.style.position = 'fixed';
      c.style.zIndex = 99999;
      c.style.right = '18px';
      c.style.bottom = '18px';
      c.style.display = 'flex';
      c.style.flexDirection = 'column';
      c.style.gap = '8px';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, opts = {}) {
    const container = ensureContainer();
    const el = document.createElement('div');
    el.className = 'pv-snack';
    el.style.background = opts.background || 'rgba(32,52,58,0.94)';
    el.style.color = opts.color || '#fff';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    el.style.maxWidth = '360px';
    el.style.fontSize = '14px';
    el.textContent = message;
    container.appendChild(el);
    const timeout = opts.timeout === 0 ? null : (opts.timeout || 3000);
    if(timeout){
      setTimeout(()=> { el.style.opacity = '0'; setTimeout(()=> el.remove(), 240); }, timeout);
    }
    return el;
  }

  function showConfirm(message){
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'pv-confirm-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.background = 'rgba(12,16,18,0.32)';
      overlay.style.zIndex = 100000;

      const modal = document.createElement('div');
      modal.style.background = '#fff'; modal.style.padding = '14px'; modal.style.borderRadius = '10px';
      modal.style.minWidth = '320px'; modal.style.boxShadow = '0 18px 48px rgba(18,22,25,0.18)';
      modal.innerHTML = `<div style="margin-bottom:10px;font-weight:600">${message}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="pv-btn-cancel" style="padding:8px 12px;border-radius:6px">Cancelar</button>
          <button class="pv-btn-ok" style="padding:8px 12px;border-radius:6px;background:#20343a;color:#fff">OK</button>
        </div>`;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.querySelector('.pv-btn-cancel').addEventListener('click', ()=> { overlay.remove(); resolve(false); });
      overlay.querySelector('.pv-btn-ok').addEventListener('click', ()=> { overlay.remove(); resolve(true); });
    });
  }

  function showPrompt(message, defaultValue = ''){
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'pv-prompt-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.background = 'rgba(12,16,18,0.32)';
      overlay.style.zIndex = 100000;

      const modal = document.createElement('div');
      modal.style.background = '#fff'; modal.style.padding = '14px'; modal.style.borderRadius = '10px';
      modal.style.minWidth = '360px'; modal.style.boxShadow = '0 18px 48px rgba(18,22,25,0.18)';
      modal.innerHTML = `<div style="margin-bottom:8px;font-weight:600">${message}</div>
        <input id="pv-prompt-input" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(0,0,0,0.08);margin-bottom:10px" value="${String(defaultValue).replace(/"/g,'&quot;')}" />
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="pv-btn-cancel" style="padding:8px 12px;border-radius:6px">Cancelar</button>
          <button class="pv-btn-ok" style="padding:8px 12px;border-radius:6px;background:#20343a;color:#fff">OK</button>
        </div>`;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      const input = modal.querySelector('#pv-prompt-input');
      setTimeout(()=> input.focus(), 50);

      overlay.querySelector('.pv-btn-cancel').addEventListener('click', ()=> { overlay.remove(); resolve(null); });
      overlay.querySelector('.pv-btn-ok').addEventListener('click', ()=> { const v = input.value; overlay.remove(); resolve(v); });
      overlay.addEventListener('keydown', (e)=> {
        if(e.key === 'Enter'){ e.preventDefault(); const v = input.value; overlay.remove(); resolve(v); }
        if(e.key === 'Escape'){ overlay.remove(); resolve(null); }
      });
    });
  }

  // expõe globalmente
  window.pvShowToast = showToast;
  window.pvShowConfirm = showConfirm;
  window.pvShowPrompt = showPrompt;
})();