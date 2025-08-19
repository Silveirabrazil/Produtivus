(function(){
  // cria container único
  function ensureContainer(){
    let c = document.querySelector('#pv-snackbar-container');
    if(!c){
      c = document.createElement('div');
      c.id = 'pv-snackbar-container';
      c.classList.add('pv-snackbar-container');
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, opts = {}) {
    const container = ensureContainer();
    const el = document.createElement('div');
    el.className = 'pv-snack';
  if (opts.background) el.classList.add('pv-snack-bg');
  if (opts.color) el.classList.add('pv-snack-color');
    el.textContent = message;
    container.appendChild(el);
    const timeout = opts.timeout === 0 ? null : (opts.timeout || 3000);
    if(timeout){
      setTimeout(()=> {
        el.classList.remove('pv-snack-show');
        el.classList.add('pv-snack-hide');
        setTimeout(()=> el.remove(), 240);
      }, timeout);
    }
    return el;
  }

  function showConfirm(message){
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'pv-confirm-overlay';
      document.body.appendChild(overlay);

      const modal = document.createElement('div');
      modal.className = 'pv-modal pv-modal-confirm';
      modal.innerHTML = `<div class="pv-modal-title">${message}</div>
        <div class="pv-modal-actions">
          <button class="pv-btn-cancel">Cancelar</button>
          <button class="pv-btn-ok">OK</button>
        </div>`;
      overlay.appendChild(modal);

      overlay.querySelector('.pv-btn-cancel').addEventListener('click', ()=> { overlay.remove(); resolve(false); });
      overlay.querySelector('.pv-btn-ok').addEventListener('click', ()=> { overlay.remove(); resolve(true); });
    });
  }

  function showPrompt(message, defaultValue = ''){
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'pv-prompt-overlay';
      document.body.appendChild(overlay);

      const modal = document.createElement('div');
      modal.className = 'pv-modal pv-modal-prompt';
      modal.innerHTML = `<div class="pv-modal-title">${message}</div>
        <input id="pv-prompt-input" class="pv-modal-input" value="${String(defaultValue).replace(/"/g,'&quot;')}" />
        <div class="pv-modal-actions">
          <button class="pv-btn-cancel">Cancelar</button>
          <button class="pv-btn-ok">OK</button>
        </div>`;
      overlay.appendChild(modal);
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