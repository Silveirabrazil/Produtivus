// js/modules/ui.js
// Versão sem Bootstrap: provê pvShowToast / pvShowConfirm / pvShowPrompt / pvShowSelect
// Usa o sistema de componentes custom (.janela) e acessibilidade básica.
(function(){
  if (window.pvShowToast && window.pvShowConfirm && window.pvShowPrompt && window.pvShowSelect) return;

  // ---------------- Toasts -----------------
  function ensureAvisos(){
    let c = document.getElementById('pv-avisos');
    if(!c){
      c = document.createElement('div');
      c.id = 'pv-avisos';
      c.setAttribute('role','region');
      c.setAttribute('aria-label','Notificações');
      c.style.position='fixed';
      c.style.top='0';
      c.style.right='0';
      c.style.display='flex';
      c.style.flexDirection='column';
      c.style.gap='0.5rem';
      c.style.padding='0.75rem';
      c.style.zIndex='1200';
      document.body.appendChild(c);
    }
    return c;
  }

  function pvShowToast(msg, opts){
    const c = ensureAvisos();
    const el = document.createElement('div');
    const tipo = (opts && opts.type) || '';
    const variantClass = tipo ? ' aviso--'+tipo : '';
    el.className = 'aviso'+variantClass; // classes variantes: --sucesso --erro --alerta --info
    el.setAttribute('role','alert');
    if(opts && opts.background){ el.style.setProperty('--aviso-bg', opts.background); }
    if(opts && opts.color){ el.style.setProperty('--aviso-fg', opts.color); }
    const btn = document.createElement('button');
    btn.type='button'; btn.textContent='×'; btn.className='aviso__fechar'; btn.setAttribute('aria-label','Fechar');
    btn.addEventListener('click', ()=> el.remove());
    const span = document.createElement('span'); span.className='aviso__conteudo'; span.textContent = String(msg||'');
    el.appendChild(span);
    el.appendChild(btn);
    c.appendChild(el);
    const timeout = (opts && typeof opts.timeout==='number') ? opts.timeout : 3000;
    if(timeout>0){
      el.dataset.timeout = String(timeout);
      setTimeout(()=>{ try{ el.remove(); }catch{} }, timeout);
    }
  }

  // ------------- Helpers Modais (.janela) -------------
  function criarJanela(tituloHTML, corpoHTML, botoes){
    const overlay = document.createElement('div');
    overlay.className = 'janela janela--pequena';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-hidden','true');
    overlay.dataset.pvTempModal = '1';

  const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const caixa = document.createElement('div');
    caixa.className = 'janela__caixa';
    caixa.setAttribute('tabindex','-1');

    const cabecalho = document.createElement('div');
    cabecalho.className = 'janela__cabecalho';
    const titulo = document.createElement('h2');
    titulo.className = 'janela__titulo';
    titulo.innerHTML = tituloHTML || '';
    cabecalho.appendChild(titulo);

    const corpo = document.createElement('div');
    corpo.className = 'janela__corpo';
    if (typeof corpoHTML === 'string') {
      corpo.innerHTML = corpoHTML;
    } else if (corpoHTML instanceof Node) {
      corpo.appendChild(corpoHTML);
    } else if (Array.isArray(corpoHTML)) {
      corpoHTML.forEach(n => { if (n instanceof Node) corpo.appendChild(n); });
    }

    const rodape = document.createElement('div');
    rodape.className = 'janela__acoes';
    (botoes || []).forEach(btn => { if (btn) rodape.appendChild(btn); });

    caixa.appendChild(cabecalho);
    caixa.appendChild(corpo);
    caixa.appendChild(rodape);
    overlay.appendChild(caixa);
    document.body.appendChild(overlay);

    const cleanupCallbacks = [];
    function onClose(fn){ if (typeof fn === 'function') cleanupCallbacks.push(fn); }
    function runCleanup(){
      while(cleanupCallbacks.length){ const fn = cleanupCallbacks.shift(); try { fn(); } catch {} }
      if (previousActive && typeof previousActive.focus === 'function') {
        setTimeout(() => {
          try {
            if (previousActive.isConnected) previousActive.focus();
          } catch {}
        }, 0);
      }
    }

    function fechar(){
      if (overlay.dataset.closing === '1') return;
      overlay.dataset.closing = '1';
      overlay.classList.remove('janela--aberta');
      overlay.classList.add('janela--fechando');
      overlay.setAttribute('aria-hidden','true');
      setTimeout(() => {
        try { overlay.remove(); } catch {}
        runCleanup();
      }, 240);
    }

    setTimeout(() => {
      overlay.classList.add('janela--aberta');
      overlay.setAttribute('aria-hidden','false');
      try { caixa.focus(); } catch {}
    }, 15);

    return { overlay, caixa, corpo, rodape, fechar, onClose };
  }

  function focusTrap(container){
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusables = () => Array.from(container.querySelectorAll(sel)).filter(el => el instanceof HTMLElement && !el.hasAttribute('disabled'));
    function focusFirst(){
      const focaveis = getFocusables();
      if (focaveis.length) focaveis[0].focus();
    }
    focusFirst();
    function handle(e){
      if (e.key === 'Tab'){
        const focaveis = getFocusables();
        if (!focaveis.length) return;
        const idx = focaveis.indexOf(document.activeElement);
        if (e.shiftKey){
          if (idx <= 0){ focaveis[focaveis.length - 1].focus(); e.preventDefault(); }
        } else {
          if (idx === focaveis.length - 1){ focaveis[0].focus(); e.preventDefault(); }
        }
      } else if (e.key === 'Escape'){
        const closeBtn = container.querySelector('[data-action="cancel"], [data-fechar]');
        if (closeBtn) closeBtn.click();
      }
    }
    container.addEventListener('keydown', handle);
    return () => container.removeEventListener('keydown', handle);
  }

  function pvShowConfirm(message){
    return new Promise(res=>{
      const btnCancelar = document.createElement('button');
      btnCancelar.className='botao botao--suave';
      btnCancelar.textContent='Cancelar';
      btnCancelar.setAttribute('data-action','cancel');
      const btnOk = document.createElement('button');
      btnOk.className='botao botao--primario';
      btnOk.textContent='OK';
      btnOk.setAttribute('data-action','ok');
      const ctrl = criarJanela('Confirmação', '', [btnCancelar, btnOk]);
      ctrl.overlay.classList.add('janela--compacta');
      ctrl.corpo.innerHTML = '';
      const texto = document.createElement('p');
      texto.className = 'm-0';
      texto.textContent = message || '';
      ctrl.corpo.appendChild(texto);
      let decidido = false;
      const releaseTrap = focusTrap(ctrl.caixa);
      ctrl.onClose(() => releaseTrap());
      function finalizar(v){
        if (decidido) return;
        decidido = true;
        ctrl.fechar();
        res(v);
      }
      btnCancelar.addEventListener('click', ()=> finalizar(false));
      btnOk.addEventListener('click', ()=> finalizar(true));
      ctrl.overlay.addEventListener('click', e=>{ if (e.target === ctrl.overlay) finalizar(false); });
    });
  }

  function pvShowPrompt(message, def){
    return new Promise(res=>{
      const input = document.createElement('input');
      input.className='campo';
      input.value = def || '';
      input.style.width='100%';
      const btnCancelar = document.createElement('button');
      btnCancelar.className='botao botao--suave';
      btnCancelar.textContent='Cancelar';
      btnCancelar.setAttribute('data-action','cancel');
      const btnOk = document.createElement('button');
      btnOk.className='botao botao--primario';
      btnOk.textContent='OK';
      btnOk.setAttribute('data-action','ok');
      const ctrl = criarJanela('Informação', '', [btnCancelar, btnOk]);
      ctrl.overlay.classList.add('janela--compacta');
      const bloco = document.createElement('div');
      bloco.className = 'mb-sm';
      bloco.textContent = message || '';
      ctrl.corpo.appendChild(bloco);
      ctrl.corpo.appendChild(input);
      let encerrado = false;
      const releaseTrap = focusTrap(ctrl.caixa);
      ctrl.onClose(() => releaseTrap());
      function finalizar(v){
        if (encerrado) return;
        encerrado = true;
        ctrl.fechar();
        res(v);
      }
      btnCancelar.addEventListener('click', ()=> finalizar(null));
      btnOk.addEventListener('click', ()=> finalizar(String(input.value)));
      ctrl.overlay.addEventListener('click', e=>{ if (e.target === ctrl.overlay) finalizar(null); });
      input.addEventListener('keydown', e=>{
        if (e.key==='Enter'){ finalizar(String(input.value)); }
        if (e.key==='Escape'){ finalizar(null); }
      });
      setTimeout(()=>{ try{ input.focus(); input.select(); }catch{} }, 40);
    });
  }

  function pvShowSelect(message, options, allowEmpty){
    return new Promise(res=>{
      const ops = Array.isArray(options)? options : [];
      const select = document.createElement('select');
      select.className='campo';
      select.style.width='100%';
      ops.forEach(o=>{
        const opt = document.createElement('option');
        opt.value = String(o.value);
        opt.textContent = String(o.label);
        select.appendChild(opt);
      });
      const btnCancelar = document.createElement('button');
      btnCancelar.className='botao botao--suave';
      btnCancelar.textContent= allowEmpty ? 'Pular' : 'Cancelar';
      btnCancelar.setAttribute('data-action','cancel');
      const btnOk = document.createElement('button');
      btnOk.className='botao botao--primario';
      btnOk.textContent='OK';
      btnOk.setAttribute('data-action','ok');
      const ctrl = criarJanela('Selecione', '', [btnCancelar, btnOk]);
      ctrl.overlay.classList.add('janela--compacta');
      const bloco = document.createElement('div');
      bloco.className = 'mb-sm';
      bloco.textContent = message || '';
      ctrl.corpo.appendChild(bloco);
      ctrl.corpo.appendChild(select);
      let done = false;
      const releaseTrap = focusTrap(ctrl.caixa);
      ctrl.onClose(() => releaseTrap());
      function finalizar(v){
        if (done) return;
        done = true;
        ctrl.fechar();
        res(v);
      }
      btnCancelar.addEventListener('click', ()=> finalizar(allowEmpty ? '' : null));
      btnOk.addEventListener('click', ()=> finalizar(select.value));
      ctrl.overlay.addEventListener('click', e=>{ if (e.target === ctrl.overlay) finalizar(allowEmpty ? '' : null); });
      select.addEventListener('keydown', e=>{
        if (e.key==='Enter'){ finalizar(select.value); }
        if (e.key==='Escape'){ finalizar(allowEmpty ? '' : null); }
      });
      setTimeout(()=>{ try{ select.focus(); }catch{} }, 40);
    });
  }

  window.pvShowToast = pvShowToast;
  window.pvShowConfirm = pvShowConfirm;
  window.pvShowPrompt = pvShowPrompt;
  window.pvShowSelect = pvShowSelect;
})();
