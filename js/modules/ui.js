// js/modules/ui.js
// Provedor de UI usando Bootstrap 5: toasts e modais confirm/prompt/select
(function(){
  if (window.pvShowToast && window.pvShowConfirm && window.pvShowPrompt && window.pvShowSelect) return;

  function ensureToastContainer(){
    let c = document.getElementById('pv-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'pv-toast-container';
      c.className = 'toast-container position-fixed top-0 end-0 p-3';
      c.style.zIndex = '1080'; // acima do conteúdo, abaixo do modal (z-index 1055-1050)
      document.body.appendChild(c);
    }
    return c;
  }

  function pvShowToast(msg, opts){
    try { ensureToastContainer(); } catch{}
    const c = ensureToastContainer();
    const delay = (opts && typeof opts.timeout === 'number') ? Math.max(0, opts.timeout) : 3000;
  const el = document.createElement('div');
  el.className = 'toast fade align-items-center border-0 shadow';
    el.setAttribute('role','alert');
    el.setAttribute('aria-live','assertive');
    el.setAttribute('aria-atomic','true');
    el.innerHTML = '<div class="d-flex">\n  <div class="toast-body"></div>\n  <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>\n</div>';
    el.querySelector('.toast-body').textContent = String(msg || '');
    // aplicar tema leve/escuro baseado em opções simples
    if (opts && opts.variant) {
      const map = { success: 'text-bg-success', danger:'text-bg-danger', warning:'text-bg-warning', info:'text-bg-info', primary:'text-bg-primary', secondary:'text-bg-secondary', light:'text-bg-light', dark:'text-bg-dark' };
      const cls = map[opts.variant];
      if (cls) el.classList.add(cls);
    } else {
      el.classList.add('text-bg-dark');
    }
    if (opts && opts.background) el.style.background = opts.background;
    if (opts && opts.color) el.style.color = opts.color;
    c.appendChild(el);
    try {
      const toast = window.bootstrap ? new window.bootstrap.Toast(el, { autohide: delay !== 0, delay }) : null;
      if (toast) toast.show(); else setTimeout(()=> el.remove(), delay || 0);
      el.addEventListener('hidden.bs.toast', ()=> el.remove());
    } catch {
      if (delay) setTimeout(()=> el.remove(), delay);
    }
  }

  function buildModalShell(titleHtml, bodyHtml, footerHtml){
    const wrapper = document.createElement('div');
    const id = 'pv-modal-' + Math.random().toString(36).slice(2);
  wrapper.innerHTML = `
<div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">\n  <div class="modal-dialog modal-dialog-centered">\n    <div class="modal-content">\n      <div class="modal-header">\n        <h5 class="modal-title">${titleHtml || ''}</h5>\n        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>\n      </div>\n      <div class="modal-body">${bodyHtml || ''}</div>\n      <div class="modal-footer">${footerHtml || ''}</div>\n    </div>\n  </div>\n</div>`;
    const el = wrapper.firstElementChild;
    document.body.appendChild(el);
    return el;
  }

  function pvShowConfirm(message){
    if (!window.bootstrap || !window.bootstrap.Modal) {
      return Promise.resolve(window.confirm(String(message||'')));
    }
    return new Promise(res => {
      const m = buildModalShell('Confirmação', `<p class="mb-0">${message || ''}</p>`, `
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-action="cancel">Cancelar</button>
        <button type="button" class="btn btn-primary" data-action="ok">OK</button>`);
      const inst = new window.bootstrap.Modal(m, { backdrop: 'static' });
      const ok = m.querySelector('[data-action="ok"]');
      const cancel = m.querySelector('[data-action="cancel"]');
      const done = (v)=>{ try{ inst.hide(); }catch{} res(v); };
      ok.addEventListener('click', ()=> done(true));
      cancel.addEventListener('click', ()=> done(false));
      m.addEventListener('hidden.bs.modal', ()=> m.remove());
      inst.show();
    });
  }

  function pvShowPrompt(message, def){
    if (!window.bootstrap || !window.bootstrap.Modal) {
      const v = window.prompt(String(message||''), def || '');
      return Promise.resolve(v == null ? null : String(v));
    }
    return new Promise(res => {
      const inputId = 'pv-prompt-input-' + Math.random().toString(36).slice(2);
      const body = `<div class="mb-2">${message || ''}</div><input class="form-control" id="${inputId}" />`;
      const m = buildModalShell('Informação', body, `
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-action="cancel">Cancelar</button>
        <button type="button" class="btn btn-primary" data-action="ok">OK</button>`);
      const inst = new window.bootstrap.Modal(m, { backdrop: 'static' });
      const ok = m.querySelector('[data-action="ok"]');
      const cancel = m.querySelector('[data-action="cancel"]');
      const input = m.querySelector('#'+inputId);
      const done = (v)=>{ try{ inst.hide(); }catch{} res(v); };
      ok.addEventListener('click', ()=> done(String(input.value)));
      cancel.addEventListener('click', ()=> done(null));
      m.addEventListener('shown.bs.modal', ()=>{ try{ input.value = def || ''; input.focus(); input.select(); }catch{} });
      m.addEventListener('hidden.bs.modal', ()=> m.remove());
      input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ done(String(input.value)); } if(e.key==='Escape'){ done(null); } });
      inst.show();
    });
  }

  function pvShowSelect(message, options, allowEmpty){
    if (!window.bootstrap || !window.bootstrap.Modal) {
      const fallback = window.prompt(String(message||''));
      return Promise.resolve(fallback == null ? (allowEmpty ? '' : null) : String(fallback));
    }
    return new Promise(res => {
      const ops = Array.isArray(options) ? options : [];
      const selectId = 'pv-select-input-' + Math.random().toString(36).slice(2);
      const optsHtml = ops.map(o => `<option value="${String(o.value)}">${String(o.label)}</option>`).join('');
      const body = `<div class="mb-2">${message || ''}</div><select class="form-select" id="${selectId}">${optsHtml}</select>`;
      const m = buildModalShell('Selecione', body, `
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-action="cancel">${allowEmpty ? 'Pular' : 'Cancelar'}</button>
        <button type="button" class="btn btn-primary" data-action="ok">OK</button>`);
      const inst = new window.bootstrap.Modal(m, { backdrop: 'static' });
      const ok = m.querySelector('[data-action="ok"]');
      const cancel = m.querySelector('[data-action="cancel"]');
      const select = m.querySelector('#'+selectId);
      const done = (v)=>{ try{ inst.hide(); }catch{} res(v); };
      ok.addEventListener('click', ()=> done(select.value));
      cancel.addEventListener('click', ()=> done(allowEmpty ? '' : null));
      m.addEventListener('shown.bs.modal', ()=>{ try{ select.focus(); }catch{} });
      m.addEventListener('hidden.bs.modal', ()=> m.remove());
      select.addEventListener('keydown',(e)=>{ if (e.key==='Enter'){ done(select.value); } if (e.key==='Escape'){ done(allowEmpty ? '' : null); } });
      inst.show();
    });
  }

  window.pvShowToast = pvShowToast;
  window.pvShowConfirm = pvShowConfirm;
  window.pvShowPrompt = pvShowPrompt;
  window.pvShowSelect = pvShowSelect;
})();
