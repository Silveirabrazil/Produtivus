// js/modules/flashcards.js
// Flashcards simples com baralhos, estudo (lembro/não lembro) e repetição espaçada leve (contadores), persistência local.
(function(){
  if (window.pvFlashcards) return;
  const LS = 'pv_flashcards_v1';
  function css(){ /* estilos vivem em css/scss/_flashcards.scss */ }
  function load(){ try{ return JSON.parse(localStorage.getItem(LS)||'null')||{decks:[]}; }catch{return {decks:[]};}}
  function save(x){ try{ localStorage.setItem(LS, JSON.stringify(x||{decks:[]})); }catch{} }

  function mount(host){
    css();
    const state = load();
    if (!Array.isArray(state.decks)) state.decks = [];

      const el = document.createElement('div'); el.className = 'pv-fc card';
      el.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">Flashcards</h3>
          <div class="d-flex flex-wrap gap-2 mb-2 align-items-center">
            <button id="fc-deck-add" class="btn btn-sm btn-outline-primary">+ Novo baralho</button>
            <button id="fc-prova-new" class="btn btn-sm btn-outline-secondary" title="Criar uma prova">Nova prova</button>
            <button id="fc-prova-mini" class="btn btn-sm btn-outline-secondary" title="Criar uma mini prova">Nova mini prova</button>
            <button id="fc-quiz" class="btn btn-sm btn-primary" title="Iniciar/Finalizar prova">Iniciar prova</button>
            <span class="small text-muted ms-2">Selecione um baralho para estudar; clique com o botão direito para editar.</span>
          </div>
          <div class="fc-row mb-2"><div class="fc-list list-group" id="fc-decks"></div></div>
          <div class="fc-row small text-muted" id="fc-stats"></div>
          <div class="fc-card card mt-3" id="fc-card"><div class="card-body fc-qa" id="fc-qa">Crie um baralho e cartões para começar.</div><div class="fc-options" id="fc-options" style="display:none;"></div></div>
          <div class="fc-ctrl mt-2 d-flex gap-2">
            <button id="fc-show" class="btn btn-sm btn-outline-secondary">Mostrar/Esconder resposta</button>
            <button id="fc-wrong" class="btn btn-sm btn-danger">Não lembrei</button>
            <button id="fc-right" class="btn btn-sm btn-success">Lembrei</button>
            <button id="fc-skip" class="btn btn-sm btn-secondary">Pular</button>
            <button id="fc-add" class="btn btn-sm btn-outline-primary">+ Cartão</button>
          </div>
        </div>
      `;
    host.appendChild(el);

  let curDeck = null; let curIndex = 0; let showAnswer = false;
  // Modo prova (quiz)
  let quizMode = false; let quizOrder = []; let quizPos = 0; let quizStats = { right:0, wrong:0, skipped:0 };
  // Timer da prova
  let quizTimerSecs = 0; let quizTimerHandle = null;
  function fmtMMSS(total){ const m=Math.floor(total/60); const s=total%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function stopQuizTimer(){ if (quizTimerHandle){ try{ clearInterval(quizTimerHandle); }catch{} quizTimerHandle=null; } quizTimerSecs=0; }
  function startQuizTimer(minutes, onExpire){ stopQuizTimer(); const mins = Math.max(1, Number(minutes)||0); quizTimerSecs = mins*60; quizTimerHandle = setInterval(()=>{ quizTimerSecs = Math.max(0, quizTimerSecs-1); renderStats(); if (quizTimerSecs<=0){ stopQuizTimer(); try{ onExpire && onExpire(); }catch{} } }, 1000); renderStats(); }

    async function deckContextMenu(deck, target){
      const act = await (window.pvShowSelect ? window.pvShowSelect('Ação no baralho:', [
        {value:'rename', label:'Renomear'}, {value:'delete', label:'Apagar'}
      ], true) : Promise.resolve(''));
      if (act==='rename'){
        const name = await (window.pvShowPrompt?window.pvShowPrompt('Novo nome do baralho:', deck.name):Promise.resolve(null));
        if (name!==null){ deck.name=String(name).trim()||deck.name; save(state); renderDecks(); renderStats(); }
      } else if (act==='delete'){
        const ok = await (window.pvShowConfirm?window.pvShowConfirm('Apagar este baralho?'):Promise.resolve(false));
        if (ok){
          const i = state.decks.indexOf(deck); if (i>=0) state.decks.splice(i,1);
          if (curDeck===deck) { curDeck=null; curIndex=0; showAnswer=false; }
          save(state); renderDecks(); renderStats(); renderCard();
        }
      }
    }
    function renderDecks(){
      const holder = el.querySelector('#fc-decks'); holder.innerHTML='';
        state.decks.forEach((d,idx)=>{
          const chip = document.createElement('button');
          // usar list-group do Bootstrap para aparência de lista clicável, mantendo a classe pv-chip
          chip.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center pv-chip' + (curDeck===d ? ' active' : '');
          chip.innerHTML = `<div class="flex-grow-1 text-start">${d.name}</div><span class="badge bg-secondary rounded-pill">${d.cards.length}</span>`;
        chip.addEventListener('click', ()=>{ curDeck=d; curIndex=0; showAnswer=false; renderCard(); renderDecks(); renderStats(); });
        chip.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); deckContextMenu(d, chip); });
        holder.appendChild(chip);
      });
    }
  function renderStats(){
      const stats = el.querySelector('#fc-stats');
      if (!curDeck) { stats.textContent = 'Nenhum baralho selecionado.'; return; }
      const due = curDeck.cards.filter(c=> (c.score||0) < 2).length;
      if (quizMode) {
        const total = quizOrder.length || 0;
        const atual = Math.min(quizPos+1, total);
    const t = quizTimerSecs>0 ? ` • Tempo: ${fmtMMSS(quizTimerSecs)}` : '';
    stats.textContent = `Prova • ${atual}/${total} • Acertos: ${quizStats.right} • Erros: ${quizStats.wrong} • Pulou: ${quizStats.skipped}${t}`;
      } else {
        stats.textContent = `Baralho: ${curDeck.name} • Cartões: ${curDeck.cards.length} • Em revisão: ${due}`;
      }
    }
    function getCurrentIndex(){
      if (!curDeck || !curDeck.cards.length) return -1;
      if (quizMode) return quizOrder[quizPos] ?? 0;
      return curIndex % curDeck.cards.length;
    }
    function nextCard(){
      if (!curDeck || !curDeck.cards.length) return;
      if (quizMode) {
        quizPos++;
        if (quizPos >= quizOrder.length) {
          finalizeQuiz();
        }
      } else {
        curIndex = (curIndex+1) % curDeck.cards.length;
      }
      showAnswer = false;
      renderDecks(); renderStats(); renderCard();
    }
    function finalizeQuiz(){
      quizMode = false; stopQuizTimer();
      el.querySelector('#fc-quiz').textContent = 'Iniciar prova';
      if (window.pvShowToast) try { window.pvShowToast(`Prova finalizada. Acertos: ${quizStats.right}, Erros: ${quizStats.wrong}, Pulou: ${quizStats.skipped}`); } catch{}
    }
    function renderCard(){
      const qa = el.querySelector('#fc-qa');
      const optWrap = el.querySelector('#fc-options');
      const btnShow = el.querySelector('#fc-show');
      const btnWrong = el.querySelector('#fc-wrong');
      const btnRight = el.querySelector('#fc-right');
      const btnSkip = el.querySelector('#fc-skip');

      if (!curDeck || curDeck.cards.length===0){
        qa.textContent='Sem cartões. Clique em + Cartão para adicionar.';
        optWrap.style.display='none'; optWrap.innerHTML='';
        [btnShow,btnWrong,btnRight,btnSkip].forEach(b=> b && (b.disabled=true));
        return;
      }
      [btnShow,btnWrong,btnRight,btnSkip].forEach(b=> b && (b.disabled=false));

      const idx = getCurrentIndex();
      const c = curDeck.cards[idx];
      const hasOptions = Array.isArray(c.options) && c.options.length >= 2;

      if (hasOptions) {
        // mostrar pergunta + opções
        qa.innerHTML = `<b>P:</b> ${c.q}`;
        optWrap.innerHTML = '';
          c.options.forEach((op, i)=>{
            const btn = document.createElement('button');
            // usar estilo de botão compacto do Bootstrap para opções
            btn.className = 'fc-option btn btn-sm btn-outline-secondary me-2'; btn.type='button'; btn.textContent = op.text || ('Opção '+(i+1));
            btn.addEventListener('click', ()=>{
            // feedback e avanço
            if (op.correct){
              btn.classList.remove('wrong'); btn.classList.add('correct');
              quizStats.right += quizMode ? 1 : 0; // contam apenas em prova
              setTimeout(()=> nextCard(), 550);
            } else {
              btn.classList.add('wrong');
              quizStats.wrong += quizMode ? 1 : 0;
              // permitir tentar novamente (não avança)
            }
          });
          optWrap.appendChild(btn);
        });
  optWrap.style.display='flex';
  // esconder botões de Lembrei/Não lembrei no modo com opções
  [btnShow,btnWrong,btnRight].forEach(b=> b && (b.style.display = 'none'));
  btnSkip && (btnSkip.style.display = 'inline-block');
      } else {
        // modo QA padrão
        qa.innerHTML = showAnswer ? `<b>P:</b> ${c.q}\n\n<b>R:</b> ${c.a}` : c.q;
        optWrap.style.display='none'; optWrap.innerHTML='';
  [btnShow,btnWrong,btnRight].forEach(b=> b && (b.style.display = 'inline-block'));
  btnSkip && (btnSkip.style.display = quizMode ? 'inline-block' : 'none');
      }
    }

  el.querySelector('#fc-deck-add').addEventListener('click', async ()=>{
      const name = await (window.pvShowPrompt?window.pvShowPrompt('Nome do baralho:',''):Promise.resolve(null)); if (name===null) return;
      const nm = String(name).trim(); if (!nm) return;
      state.decks.push({ name:nm, cards: [] }); save(state);
      renderDecks(); renderStats(); renderCard();
    });

    el.querySelector('#fc-add').addEventListener('click', async ()=>{
      if (!curDeck) return; const q = await (window.pvShowPrompt?window.pvShowPrompt('Frente (pergunta):',''):Promise.resolve(null)); if (q===null) return;
      const a = await (window.pvShowPrompt?window.pvShowPrompt('Verso (resposta):',''):Promise.resolve(null)); if (a===null) return;
      const card = { q:String(q).trim(), a:String(a).trim(), score:0 };
      // Perguntar se quer adicionar opções (quiz)
      try {
        const want = await (window.pvShowConfirm ? window.pvShowConfirm('Adicionar opções (quiz) para esta pergunta?') : Promise.resolve(false));
        if (want) {
          card.options = [];
          while (true) {
            const t = await (window.pvShowPrompt ? window.pvShowPrompt('Texto da opção (deixe em branco para finalizar):','') : Promise.resolve(''));
            if (t===null) { /* cancelou ciclo -> finalizar */ break; }
            const txt = String(t).trim();
            if (!txt) break;
            const ok = await (window.pvShowConfirm ? window.pvShowConfirm('Esta opção é a correta?') : Promise.resolve(false));
            card.options.push({ text: txt, correct: !!ok });
          }
        }
      } catch {}
      curDeck.cards.push(card); save(state); renderStats(); renderCard(); renderDecks();
    });

    el.querySelector('#fc-show').addEventListener('click', ()=>{ showAnswer = !showAnswer; renderCard(); });
    el.querySelector('#fc-right').addEventListener('click', ()=>{ if (!curDeck||curDeck.cards.length===0) return; curDeck.cards[curIndex].score = Math.min(5, (curDeck.cards[curIndex].score||0)+1); curIndex=(curIndex+1)%curDeck.cards.length; showAnswer=false; save(state); renderStats(); renderCard(); });
    el.querySelector('#fc-wrong').addEventListener('click', ()=>{ if (!curDeck||curDeck.cards.length===0) return; curDeck.cards[curIndex].score = Math.max(0, (curDeck.cards[curIndex].score||0)-1); // re-exibir em breve
      // envia para frente do baralho para revisão imediata
      curIndex = (curIndex+1)%curDeck.cards.length; showAnswer=false; save(state); renderStats(); renderCard(); });
    el.querySelector('#fc-card').addEventListener('click', (ev)=>{
      // Se estiver mostrando opções, o clique no card não alterna; só alterna no modo QA
      const idx = getCurrentIndex(); if (idx<0) return;
      const c = curDeck.cards[idx]; const hasOptions = Array.isArray(c.options) && c.options.length>=2;
      if (hasOptions) return; // sem efeito
      showAnswer = !showAnswer; renderCard();
    });
    // Pular questão (apenas em prova ou para seguir no fluxo)
    el.querySelector('#fc-skip').addEventListener('click', ()=>{ if (!curDeck||curDeck.cards.length===0) return; if (quizMode) quizStats.skipped++; nextCard(); });
    // editar/apagar cartão atual por menu
    el.querySelector('#fc-card').addEventListener('contextmenu', async (ev)=>{
      ev.preventDefault(); if (!curDeck||curDeck.cards.length===0) return;
      const c = curDeck.cards[curIndex];
      const act = await (window.pvShowSelect?window.pvShowSelect('Ação no cartão:', [
        {value:'edit', label:'Editar cartão'}, {value:'opts', label:'Editar opções (quiz)'}, {value:'delete', label:'Apagar cartão'}
      ], true):Promise.resolve(''));
      if (act==='edit'){
        const nq = await (window.pvShowPrompt?window.pvShowPrompt('Nova frente (pergunta):', c.q):Promise.resolve(null)); if (nq===null) return;
        const na = await (window.pvShowPrompt?window.pvShowPrompt('Nova Verso (resposta):', c.a):Promise.resolve(null)); if (na===null) return;
        c.q=String(nq).trim(); c.a=String(na).trim(); save(state); renderCard();
      } else if (act==='opts'){
        const override = await (window.pvShowConfirm?window.pvShowConfirm('Substituir opções atuais por novas?'):Promise.resolve(false)); if (!override) return;
        c.options = [];
        while (true) {
          const t = await (window.pvShowPrompt ? window.pvShowPrompt('Texto da opção (deixe em branco para finalizar):','') : Promise.resolve(''));
          if (t===null) break; const txt = String(t).trim(); if (!txt) break;
          const ok = await (window.pvShowConfirm ? window.pvShowConfirm('Esta opção é a correta?') : Promise.resolve(false));
          c.options.push({ text: txt, correct: !!ok });
        }
        save(state); renderCard();
      } else if (act==='delete'){
        const ok = await (window.pvShowConfirm?window.pvShowConfirm('Apagar este cartão?'):Promise.resolve(false)); if (!ok) return;
        curDeck.cards.splice(curIndex,1); curIndex=0; showAnswer=false; save(state); renderStats(); renderCard();
      }
    });

    // Quiz: iniciar/finalizar
    el.querySelector('#fc-quiz').addEventListener('click', async ()=>{
      if (!curDeck || curDeck.cards.length===0) return;
      if (!quizMode) {
        // monta ordem só com cartões que têm opções válidas
        const indices = curDeck.cards.map((c,i)=>({c,i})).filter(x=>Array.isArray(x.c.options) && x.c.options.length>=2 && x.c.options.some(o=>o.correct));
        if (!indices.length){ if (window.pvShowToast) try { window.pvShowToast('Nenhuma questão com opções neste baralho. Edite um cartão e adicione opções.'); } catch{} return; }
        // embaralha
        for (let i=indices.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [indices[i],indices[j]]=[indices[j],indices[i]]; }
        quizOrder = indices.map(x=>x.i);
        quizPos = 0; quizStats = { right:0, wrong:0, skipped:0 }; quizMode = true; showAnswer = false;
        // Modal simples para configurar tempo (minutos)
        // usar modal Bootstrap
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
<div class="modal fade" id="pvq-config-modal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Configurar prova</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button></div>
      <div class="modal-body">
        <div class="mb-3"><label class="form-label">Tempo (minutos opcional)</label><input id="pvq-min" type="number" min="0" class="form-control" placeholder="0 = sem tempo" value="10" /></div>
      </div>
      <div class="modal-footer"><button id="pvq-cancel" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button><button id="pvq-start" class="btn btn-primary">Iniciar</button></div>
    </div>
  </div>
</div>`;
        const modalEl = wrapper.firstElementChild;
        document.body.appendChild(modalEl);
        const overlay = document.getElementById('pvq-config-modal');
        // mostrar via bootstrap se disponível
        let inst = null;
        try { if (window.bootstrap && window.bootstrap.Modal) { inst = new window.bootstrap.Modal(overlay, { backdrop: 'static' }); inst.show(); } } catch(e){}
        const done = (start, mins)=>{
          try{ if (inst) inst.hide(); }catch{}
          try{ overlay.remove(); }catch{}
          if (!start){ quizMode=false; return; }
          el.querySelector('#fc-quiz').textContent = 'Finalizar prova';
          if (mins>0) startQuizTimer(mins, ()=>{ finalizeQuiz(); renderDecks(); renderStats(); renderCard(); });
          renderDecks(); renderStats(); renderCard();
        };
        // listeners
        overlay.addEventListener('hidden.bs.modal', ()=> { try{ overlay.remove(); }catch{} });
        const btnCancel = overlay.querySelector('#pvq-cancel');
        const btnStart = overlay.querySelector('#pvq-start');
        const inputMin = overlay.querySelector('#pvq-min');
        if (btnCancel) btnCancel.addEventListener('click', ()=> done(false));
        if (btnStart) btnStart.addEventListener('click', ()=> { const mins = Math.max(0, Number(inputMin?.value)||0); done(true, mins); });
      } else {
        finalizeQuiz();
        renderDecks(); renderStats(); renderCard();
      }
    });

    // -------- Modal de criação de Prova/Mini Prova (tudo em uma tela) --------
    function openProvaModal({ mini=false }={}){
      // construir modal Bootstrap para criar prova
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
<div class="modal fade" id="pv-prova-modal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">${mini ? 'Nova mini prova' : 'Nova prova'}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button></div>
      <div class="modal-body">
        <div class="small mb-2">Monte suas questões e opções em uma única tela. Marque a(s) correta(s).</div>
        <div class="pv-prova-builder d-flex flex-column gap-3" style="max-height:70vh; overflow:auto;">
          <div class="pv-prova-meta d-flex flex-wrap gap-2 align-items-center">
            <label class="flex-grow-1">
              <span class="small d-block">Nome da prova</span>
              <input type="text" id="pvpb-name" class="form-control" placeholder="Ex.: Prova Banco de Dados – Lista 1" />
            </label>
            <label style="width:160px;">
              <span class="small d-block">Qtd. de questões</span>
              <input type="number" id="pvpb-qtd" class="form-control" min="1" value="${mini?5:10}" />
            </label>
          </div>
          <div id="pvpb-qs" class="d-flex flex-column gap-2"></div>
          <div><button id="pvpb-add-q" class="btn btn-outline-secondary btn-sm">+ Adicionar questão</button></div>
        </div>
      </div>
      <div class="modal-footer"><button id="pvpb-cancel" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button><button id="pvpb-save" class="btn btn-primary">Salvar prova</button></div>
    </div>
  </div>
</div>`;
      document.body.appendChild(wrapper.firstElementChild);
      const overlay = document.getElementById('pv-prova-modal');
      let inst = null; try{ if (window.bootstrap && window.bootstrap.Modal) { inst = new window.bootstrap.Modal(overlay, { backdrop:'static' }); inst.show(); } }catch{}

      const qsWrap = overlay.querySelector('#pvpb-qs');
      const addQBtn = overlay.querySelector('#pvpb-add-q');
      const qtdInput = overlay.querySelector('#pvpb-qtd');
      const nameInput = overlay.querySelector('#pvpb-name');

      function makeQ(index){
        const box = document.createElement('div');
        box.className = 'pvpb-q';
        box.style.border = '1px solid #e5e7eb'; box.style.borderRadius='10px'; box.style.padding='0.75rem';
        box.innerHTML = `
          <div class="small" style="font-weight:600; margin-bottom:.5rem">Questão ${index+1}</div>
          <div style="display:grid; gap:.5rem; grid-template-columns: 1fr;">
            <label style="display:flex; flex-direction:column; gap:.25rem;">
              <span class="small">Pergunta</span>
              <textarea class="pvpb-q-text" rows="3" placeholder="Digite a pergunta..."></textarea>
            </label>
            <label style="display:flex; flex-direction:column; gap:.25rem;">
              <span class="small">Resposta (gabarito comentado)</span>
              <textarea class="pvpb-q-ans" rows="3" placeholder="Explique a resposta correta..."></textarea>
            </label>
            <div class="small" style="margin-top:.25rem">Opções (clique no círculo para marcar como correta)</div>
            <div class="pvpb-opts" style="display:flex; flex-direction:column; gap:.35rem;"></div>
            <div style="display:flex; gap:.4rem;">
              <button class="pvpb-add-opt btn">+ Opção</button>
              <button class="pvpb-del-q btn btn-danger" title="Remover questão">Remover</button>
            </div>
          </div>
        `;
          box.innerHTML = `
            <div class="small" style="font-weight:600; margin-bottom:.5rem">Questão ${index+1}</div>
            <div style="display:grid; gap:.5rem; grid-template-columns: 1fr;">
              <label style="display:flex; flex-direction:column; gap:.25rem;">
                <span class="small">Pergunta</span>
                <textarea class="form-control pvpb-q-text" rows="3" placeholder="Digite a pergunta..."></textarea>
              </label>
              <label style="display:flex; flex-direction:column; gap:.25rem;">
                <span class="small">Resposta (gabarito comentado)</span>
                <textarea class="form-control pvpb-q-ans" rows="3" placeholder="Explique a resposta correta..."></textarea>
              </label>
              <div class="small" style="margin-top:.25rem">Opções (clique no círculo para marcar como correta)</div>
              <div class="pvpb-opts" style="display:flex; flex-direction:column; gap:.35rem;"></div>
              <div style="display:flex; gap:.4rem;">
                <button class="pvpb-add-opt btn btn-sm btn-outline-secondary">+ Opção</button>
                <button class="pvpb-del-q btn btn-sm btn-danger" title="Remover questão">Remover</button>
              </div>
            </div>
          `;
        const optsWrap = box.querySelector('.pvpb-opts');
        function addOpt(text=''){
          const row = document.createElement('div');
          row.style.display='grid'; row.style.gridTemplateColumns='24px 1fr 28px'; row.style.gap='.4rem'; row.style.alignItems='center';
          row.innerHTML = `
            <input type="checkbox" class="pvpb-opt-ok" title="Correta" />
            <input type="text" class="pvpb-opt-text" placeholder="Texto da opção" value="${String(text).replaceAll('"','&quot;')}" />
            <button class="pvpb-opt-del" title="Apagar">✕</button>
          `;
          row.querySelector('.pvpb-opt-del').addEventListener('click', ()=>{ row.remove(); });
          optsWrap.appendChild(row);
        }
        // comece com 4 opções vazias
        for (let i=0;i<4;i++) addOpt('');
        box.querySelector('.pvpb-add-opt').addEventListener('click', ()=> addOpt(''));
        box.querySelector('.pvpb-del-q').addEventListener('click', ()=>{ box.remove(); renumber(); });
        return box;
      }
      function renumber(){ Array.from(qsWrap.children).forEach((node, i)=>{ const t=node.querySelector('.small'); if (t) t.textContent = `Questão ${i+1}`; }); }

      function addQuestion(){ qsWrap.appendChild(makeQ(qsWrap.children.length)); renumber(); }
      // pré-criar conforme quantidade
      const initial = Math.max(1, Number(qtdInput.value)|| (mini?5:10));
      for (let i=0;i<initial;i++) addQuestion();
      addQBtn.addEventListener('click', addQuestion);
      modal.querySelector('.close-modal').addEventListener('click', ()=> overlay.remove());
      modal.querySelector('#pvpb-cancel').addEventListener('click', ()=> overlay.remove());

      modal.querySelector('#pvpb-save').addEventListener('click', ()=>{
        const deckName = String(nameInput.value||'Prova').trim(); if (!deckName) return;
        const cards = [];
        Array.from(qsWrap.children).forEach(q => {
          const qText = q.querySelector('.pvpb-q-text')?.value?.trim() || '';
          const qAns  = q.querySelector('.pvpb-q-ans')?.value?.trim() || '';
          const opts  = Array.from(q.querySelectorAll('.pvpb-opts .pvpb-opt-text')).map((inp,idx)=>({
            text: String(inp.value||'').trim(),
            correct: !!q.querySelectorAll('.pvpb-opts .pvpb-opt-ok')[idx]?.checked
          })).filter(o=>o.text);
          if (!qText) return; // ignora vazia
          const card = { q: qText, a: qAns, score:0 };
          if (opts.length >= 2 && opts.some(o=>o.correct)) card.options = opts;
          cards.push(card);
        });
        if (!cards.length) return;
        state.decks.push({ name: deckName, cards }); save(state);
        curDeck = state.decks[state.decks.length-1]; curIndex=0; showAnswer=false;
        overlay.remove();
        renderDecks(); renderStats(); renderCard();
      });
    }

    // Botões para abrir modal (Prova/Mini Prova)
    el.querySelector('#fc-prova-new').addEventListener('click', ()=> openProvaModal({mini:false}));
    el.querySelector('#fc-prova-mini').addEventListener('click', ()=> openProvaModal({mini:true}));

  // Estado inicial
  el.querySelector('#fc-skip').style.display = 'none';
  el.querySelector('#fc-quiz').textContent = 'Iniciar prova';
  renderDecks(); renderStats(); renderCard();
  }

  window.pvFlashcards = { mount };
})();
