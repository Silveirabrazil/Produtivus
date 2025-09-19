// js/modules/assistant.js — Assistente de Estudos (chat) minimalista
// Monta um botão no header e um popover com campo de prompt que chama /server/api/assistant.php
(function(){
  if (window.pvAssistant) return; // evitar múltiplas cargas

  const CSS = `
  :root { --pv-assist-ready: 1; }
  .pv-assist-btn { background: transparent; border: none; cursor: pointer; color: #fff; padding: 6px; border-radius: 6px; }
  .pv-assist-btn:hover { background: rgba(255,255,255,0.08); }
  .pv-assist-pop { position: absolute; right: 0; top: 100%; margin-top: .5rem; width: min(92vw, 420px); max-height: 70vh; overflow: hidden; background: #fff; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 12px 28px rgba(10,10,10,0.12); border-radius: 10px; z-index: 20000; display: flex; flex-direction: column; }
  .pv-assist-head { display:flex; align-items:center; justify-content: space-between; padding: .6rem .8rem; border-bottom: 1px solid rgba(0,0,0,.06); }
  .pv-assist-head strong { font-size: .95rem; }
  .pv-assist-close { background: transparent; border: none; cursor: pointer; font-size: 1rem; }
  .pv-assist-log { padding: .6rem .8rem; overflow: auto; flex: 1; }
  .pv-msg { margin: .35rem 0; line-height: 1.35; }
  .pv-msg.user { color: #234; }
  .pv-msg.assistant { background: #f7f9fb; border: 1px solid #e6edf3; padding: .5rem .6rem; border-radius: 8px; }
  .pv-assist-form { display:flex; gap: .4rem; padding: .6rem; border-top: 1px solid rgba(0,0,0,.06); }
  .pv-assist-input { flex:1; min-height: 40px; max-height: 120px; resize: vertical; padding: .5rem .6rem; border: 1px solid #d0d7de; border-radius: 8px; }
  .pv-assist-send { background: #365562; color: #fff; border: none; border-radius: 8px; padding: .5rem .8rem; cursor: pointer; }
  .pv-assist-send[disabled] { opacity: .7; cursor: default; }
  .pv-assist-hint { font-size: .75rem; color: #6b7785; margin-top: .2rem; }
  /* tema claro para embutir na barra do caderno */
  .pv-assist-inline .pv-assist-btn { color: #365562; }
  .pv-assist-inline .pv-assist-btn:hover { background: rgba(54,85,98,0.08); }
  /* chip visível com texto */
  .pv-assist-chip { display:inline-flex; align-items:center; gap:.35rem; padding:.35rem .55rem; border-radius: 999px; border:1px solid rgba(255,255,255,0.4); color:#fff; background: rgba(255,255,255,0.08); cursor:pointer; }
  .pv-assist-chip:hover { background: rgba(255,255,255,0.16); }
  .pv-assist-chip-light { border-color:#cbd5e1; color:#365562; background:#f1f5f9; }
  .pv-assist-chip-light:hover { background:#e2e8f0; }
  .pv-assist-chip .pv-ico { display:inline-flex; }
  .pv-assist-chip .pv-label { font-size:.85rem; font-weight:500; }
  /* FAB flutuante no editor */
  .pv-assist-fab { position:absolute; right: 12px; bottom: 12px; z-index: 100; }
  .pv-assist-fab > button { display:inline-flex; align-items:center; gap:.4rem; background:#365562; color:#fff; border:none; border-radius:999px; padding:.55rem .8rem; box-shadow: 0 8px 16px rgba(10,10,10,0.15); cursor:pointer; }
  .pv-assist-fab > button:hover { filter: brightness(1.05); }
  .pv-assist-fab .pv-label { font-size:.9rem; font-weight:500; }
  `;

  function injectStyles(){
    // Prefer compiled stylesheet (styles.css) from SASS workflow. If present, don't inject inline styles.
    try {
      if (document.querySelector('link[href*="styles.css"]')) return;
    } catch(e) {}
    if (document.getElementById('pv-assist-style')) return;
    const st = document.createElement('style'); st.id = 'pv-assist-style'; st.textContent = CSS; document.head.appendChild(st);
  }

  function aiIcon(size){
    const w = size||20;
    return `<svg class="pv-ico" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3c-1.657 0-3 1.343-3 3 0 .232.026.458.076.676C8.79 6.232 8.4 6 8 6 6.343 6 5 7.343 5 9c0 .4.232.79.676 1.076C5.458 10.026 5.232 10 5 10c-1.657 0-3 1.343-3 3s1.343 3 3 3c.232 0 .458-.026.676-.076C5.232 16.79 5 17.18 5 17.58 5 19.237 6.343 20.58 8 20.58c.4 0 .79-.232 1.076-.676.218.05.444.076.676.076 1.657 0 3-1.343 3-3 0-.232-.026-.458-.076-.676.344.286.734.676 1.134.676 1.657 0 3-1.343 3-3 0-.4-.232-.79-.676-1.076.218-.05.444-.076.676-.076 1.657 0 3-1.343 3-3s-1.343-3-3-3c-.232 0-.458.026-.676.076C18.768 6.21 18.378 6 17.978 6 16.321 6 14.978 7.343 14.978 9c0 .4.232.79.676 1.076-.218.05-.444.076-.676.076-1.657 0-3-1.343-3-3 0-.232.026-.458.076-.676C11.21 6.232 10.82 6 10.42 6 8.763 6 7.42 7.343 7.42 9c0 .4.232.79.676 1.076C7.878 10.026 7.652 10 7.42 10 5.763 10 4.42 11.343 4.42 13s1.343 3 3 3c.232 0 .458-.026.676-.076C8.79 16.768 9.18 17 9.58 17c1.657 0 3-1.343 3-3 0-.4-.232-.79-.676-1.076.218-.05.444-.076.676-.076 1.657 0 3 1.343 3 3 0 .232-.026.458-.076.676.344-.286.734-.676 1.134-.676 1.657 0 3 1.343 3 3 0 1.657-1.343 3-3 3-.4 0-.79-.232-1.076-.676-.218.05-.444.076-.676.076-1.657 0-3-1.343-3-3z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function createControl(mode, label){
    if (mode === 'chip') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pv-assist-chip';
      btn.innerHTML = aiIcon(18) + `<span class="pv-label">${label || 'Pergunte com IA'}</span>`;
      return btn;
    }
    // default icon
    const btn = document.createElement('button');
    btn.className = 'pv-assist-btn';
    btn.type = 'button';
    btn.title = label || 'Assistente de Estudos';
    btn.innerHTML = aiIcon(22);
    return btn;
  }

  function createPopover(){
    const pop = document.createElement('div');
      pop.className = 'pv-assist-pop card shadow-sm';
      pop.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center pv-assist-head">
          <strong>Assistente de Estudos</strong>
          <button type="button" class="btn-close pv-assist-close" aria-label="Fechar"></button>
        </div>
        <div class="card-body pv-assist-log p-2" id="pv-assist-log" style="overflow:auto; max-height:48vh;"></div>
        <div class="card-footer pv-assist-form p-2 d-flex gap-2 align-items-start">
          <textarea class="form-control form-control-sm pv-assist-input" id="pv-assist-input" placeholder="Pergunte algo sobre seus estudos..." rows="2"></textarea>
          <button class="btn btn-sm btn-primary pv-assist-send" id="pv-assist-send">Enviar</button>
        </div>`;
    return pop;
  }

  function defaultSystemPrompt(){
    return 'Você é um assistente de estudos curto e objetivo para alunos brasileiros. Dê respostas práticas, em poucas frases e listas com passos claros. Quando útil, sugira técnicas de memorização (pomodoro, flashcards, active recall) e pequenas metas temporizadas. Evite respostas longas.';
  }

  async function callAssistant(messages){
    const body = { messages: messages };
    const r = await fetch('/server/api/assistant.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(()=>null);
    if (!r.ok || !j || !j.success) throw new Error(j?.message || ('Erro '+r.status));
    return j.reply || '';
  }

  let last = { holder:null, getPrefill:null };

  function mount(container, opts){
    injectStyles();
    const wrap = container || document.querySelector('.pill-actions') || document.body;
    const holder = document.createElement('span');
    holder.id = 'pv-assist-anchor-' + Math.random().toString(36).slice(2,7);
    holder.style.position = 'relative';
    if (!opts || opts.display !== 'fab') holder.style.marginRight = '.25rem';
    const display = (opts && opts.display) || 'icon';
    const label = (opts && opts.label) || undefined;
    const btn = createControl(display === 'chip' ? 'chip' : 'icon', label);
    holder.appendChild(btn);
    // posicionamento
    if (display === 'fab') {
      holder.className = 'pv-assist-fab';
      // tenta anexar no container passado; se não, no body
      (wrap || document.body).appendChild(holder);
    } else {
      wrap.insertBefore(holder, wrap.firstChild);
    }
    if (opts && opts.theme === 'light') {
      if (display === 'chip') btn.classList.add('pv-assist-chip-light'); else holder.classList.add('pv-assist-inline');
    }
    last.holder = holder;
    last.getPrefill = (opts && typeof opts.getPrefill === 'function') ? opts.getPrefill : null;

    let pop = null;
    function open(prefill){
      if (pop) return;
      pop = createPopover();
      holder.appendChild(pop);
      const log = pop.querySelector('#pv-assist-log');
      const input = pop.querySelector('#pv-assist-input');
      const send = pop.querySelector('#pv-assist-send');
      pop.querySelector('.pv-assist-close').addEventListener('click', close);
      function push(role, text){
        const div = document.createElement('div');
        div.className = 'pv-msg '+role;
        div.textContent = text;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
      }
      async function onSend(){
        const q = input.value.trim(); if (!q) return;
        input.value='';
        push('user', q);
        send.disabled = true; send.textContent = '...';
        try {
          const msgs = [ { role:'system', content: defaultSystemPrompt() }, { role:'user', content: q } ];
          const reply = await callAssistant(msgs);
          push('assistant', reply);
        } catch(e){
          push('assistant', 'Falha: '+ e.message);
        } finally {
          send.disabled = false; send.textContent = 'Enviar';
          input.focus();
        }
      }
      send.addEventListener('click', onSend);
      input.addEventListener('keydown', function(ev){ if (ev.key==='Enter' && !ev.shiftKey){ ev.preventDefault(); onSend(); }});
      // prefill
      let initial = (typeof prefill === 'string' && prefill) ? prefill : (last.getPrefill ? (last.getPrefill()||'') : '');
      if (initial) {
        input.value = initial;
      }
      setTimeout(()=> input.focus(), 50);
    }
    function close(){ if (!pop) return; pop.remove(); pop=null; }
  btn.addEventListener('click', function(e){ e.stopPropagation(); if (pop) close(); else open(); });
    document.addEventListener('click', function onDoc(e){ if (pop && !holder.contains(e.target)) close(); }, { passive:true });

    // expor open/close para esta montagem
    window.pvAssistant.__open = open;
    window.pvAssistant.__close = close;
  }

  function open(text){
    if (!last.holder) {
      // tentar montar no header por padrão
      mount(document.querySelector('.pill-actions'));
    }
    if (typeof window.pvAssistant.__open === 'function') window.pvAssistant.__open(text||'');
  }

  window.pvAssistant = { mount, open };
})();
