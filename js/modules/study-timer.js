// js/modules/study-timer.js
// Pomodoro avançado: estudo/pausa cíclicos, sessões, som opcional, persistência local.
(function(){
  if (window.pvStudyTimer) return;
  const LS_KEY = 'pv_study_timer_v2';
  function inject(){ /* estilos vivem em css/scss/_timer.scss */ }
  // som padrão (bipe) e opção de arquivo custom via localStorage
  function playBeep(){
    try { const src = localStorage.getItem('pv_timer_sound_src'); const audio = new Audio(src || 'data:audio/mp3;base64,//uQZAAAA...'); audio.volume = 0.9; audio.play().catch(()=>{}); } catch{}
  }
  function load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'null')||{}; }catch{return {};}}
  function save(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s||{})); }catch{} }
  function fmt(mm){ mm=Math.max(0,mm|0); const m=String(Math.floor(mm/60)).padStart(2,'0'); const s=String(mm%60).padStart(2,'0'); return `${m}:${s}`; }

  const bc = (typeof BroadcastChannel!=='undefined') ? new BroadcastChannel('pv_study_timer') : null;
  function bcast(type, payload){ try{ bc && bc.postMessage({ type, payload }); }catch{} }
  function onMsg(ev){ try{ const {type, payload} = ev.data||{}; if (!type) return; handlers[type]?.(payload); }catch{} }
  if (bc) bc.addEventListener('message', onMsg);

  const state = Object.assign({
    studyMin:25, breakMin:5, longBreakMin:15, cycles:4, autoNext:true, sound:false,
    phase:'study', running:false, leftStart:25*60, startEpoch:0, left:25*60, done:0
  }, load());

  function persist(){ save(state); }
  function recomputeLeft(){
    if (!state.running || !state.startEpoch) return;
    const elapsed = Math.floor((Date.now() - state.startEpoch)/1000);
    state.left = Math.max(0, state.leftStart - elapsed);
  }
  function setPhase(p, seconds){ state.phase = p; state.leftStart = seconds; state.startEpoch = Date.now(); state.left = seconds; persist(); }

  function phaseSeconds(phase){ return phase==='study' ? state.studyMin*60 : (phase==='break' ? state.breakMin*60 : state.longBreakMin*60); }
  function nextPhase(){
    if (state.phase==='study'){ state.done++; if (state.done % state.cycles === 0) setPhase('long', phaseSeconds('long')); else setPhase('break', phaseSeconds('break')); }
    else { setPhase('study', phaseSeconds('study')); }
    if (state.sound) playBeep();
    if (!state.autoNext) pause();
  }

  function start(){ if (state.running) return; state.running=true; state.startEpoch = Date.now(); state.leftStart = state.left>0? state.left : phaseSeconds(state.phase); persist(); bcast('sync', state); }
  function pause(){ if (!state.running) return; recomputeLeft(); state.running=false; state.startEpoch=0; persist(); bcast('sync', state); }
  function reset(){ state.running=false; state.done=0; setPhase('study', phaseSeconds('study')); bcast('sync', state); }
  function skip(){ // termina fase atual
    state.left = 0; persist(); nextPhase(); bcast('sync', state); }

  const handlers = {
    sync: (s)=>{ Object.assign(state, s||{}); updateAllUIs(); },
    start: ()=> start(), pause: ()=> pause(), reset: ()=> reset(), skip: ()=> skip(),
    config: (patch)=>{ Object.assign(state, patch||{}); persist(); updateAllUIs(); }
  };

  // UIs registradas
  const UIs = new Set();
  function registerUI(upd){ UIs.add(upd); upd(); return ()=> UIs.delete(upd); }
  function updateAllUIs(){ UIs.forEach(fn=>{ try{ fn(); }catch{} }); }

  // loop de atualização por segundo (somente UI; o tempo é por relógio)
  setInterval(()=>{ if (state.running){ recomputeLeft(); if (state.left<=0){ nextPhase(); } updateAllUIs(); } }, 1000);

  function mount(host){
    inject();
    // se estava em execução ao carregar, ajustar tempo decorrido
    recomputeLeft(); if (state.running && state.left<=0) { nextPhase(); }
    const el = document.createElement('div'); el.className = 'pv-timer';
    el.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h3 class="h5 mb-2">Timer Pomodoro</h3>
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div>
              <span class="fs-4 fw-semibold me-3" id="tm-left">${fmt(state.left)}</span>
              <span class="badge bg-secondary" id="tm-phase">Estudo</span>
            </div>
            <div class="text-end small text-muted" id="tm-done">Ciclos: 0/${state.cycles}</div>
          </div>
          <div class="mb-2">
            <button id="tm-toggle" class="btn btn-sm btn-primary me-1">Iniciar</button>
            <button id="tm-skip" class="btn btn-sm btn-outline-secondary me-1">Pular</button>
            <button id="tm-reset" class="btn btn-sm btn-outline-secondary me-1">Resetar</button>
            <button id="tm-test" class="btn btn-sm btn-outline-secondary">Testar alarme</button>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6 col-md-3"><label class="form-label small">Estudo (min)</label><input id="tm-study" type="number" min="1" value="${state.studyMin}" class="form-control form-control-sm"></div>
            <div class="col-6 col-md-3"><label class="form-label small">Pausa curta (min)</label><input id="tm-break" type="number" min="1" value="${state.breakMin}" class="form-control form-control-sm"></div>
            <div class="col-6 col-md-3"><label class="form-label small">Pausa longa (min)</label><input id="tm-long" type="number" min="1" value="${state.longBreakMin}" class="form-control form-control-sm"></div>
            <div class="col-6 col-md-3"><label class="form-label small">Ciclos</label><input id="tm-cycles" type="number" min="1" value="${state.cycles}" class="form-control form-control-sm"></div>
          </div>
          <div class="d-flex gap-2 align-items-center mb-2">
            <div class="form-check"><input class="form-check-input" type="checkbox" id="tm-auto" ${state.autoNext?'checked':''}><label class="form-check-label small" for="tm-auto">Auto-próxima fase</label></div>
            <div class="form-check"><input class="form-check-input" type="checkbox" id="tm-sound" ${state.sound?'checked':''}><label class="form-check-label small" for="tm-sound">Som ao finalizar</label></div>
            <div class="ms-auto small"><input type="file" id="tm-sel-sound" accept="audio/*" class="form-control form-control-sm"></div>
          </div>
          <div class="small text-muted">Dica: estude focado durante o período de estudo; nas pausas, levante-se e hidrate-se.</div>
        </div>
      </div>
    `;
    host.appendChild(el);
    const refs = {
      left: el.querySelector('#tm-left'), phase: el.querySelector('#tm-phase'), done: el.querySelector('#tm-done'),
      toggle: el.querySelector('#tm-toggle'), skip: el.querySelector('#tm-skip'), reset: el.querySelector('#tm-reset'),
      study: el.querySelector('#tm-study'), brk: el.querySelector('#tm-break'), long: el.querySelector('#tm-long'), cycles: el.querySelector('#tm-cycles'),
      auto: el.querySelector('#tm-auto'), sound: el.querySelector('#tm-sound')
    };
    function update(){ refs.left.textContent = fmt(state.left); refs.phase.textContent = (state.phase==='study'?'Estudo':(state.phase==='break'?'Pausa':'Pausa longa')); refs.done.textContent = `Ciclos: ${state.done}/${state.cycles}`; refs.toggle.textContent = state.running? 'Pausar':'Iniciar'; }
    const unregister = registerUI(update);
    refs.toggle.addEventListener('click', ()=> state.running? (pause(), bcast('pause')) : (start(), bcast('start')));
    refs.skip.addEventListener('click', ()=> { skip(); });
    refs.reset.addEventListener('click', ()=> { reset(); });
    el.querySelector('#tm-test').addEventListener('click', ()=> playBeep());
  const fileInp = el.querySelector('#tm-sel-sound');
  if (fileInp) fileInp.addEventListener('change', ()=>{ const f = fileInp.files && fileInp.files[0]; if (!f) return; const url = URL.createObjectURL(f); try{ localStorage.setItem('pv_timer_sound_src', url); }catch{} });
    ['study','brk','long','cycles','auto','sound'].forEach(k=>{
      refs[k].addEventListener(k==='auto'||k==='sound'?'change':'input', ()=>{
        state.studyMin = parseInt(refs.study.value)||state.studyMin;
        state.breakMin = parseInt(refs.brk.value)||state.breakMin;
        state.longBreakMin = parseInt(refs.long.value)||state.longBreakMin;
        state.cycles = Math.max(1, parseInt(refs.cycles.value)||state.cycles);
        state.autoNext = !!refs.auto.checked; state.sound = !!refs.sound.checked; persist(); bcast('config', state);
        // realinha minutos restantes pela fase atual
        const cur = phaseSeconds(state.phase); state.left = Math.min(state.left, cur); state.leftStart = state.left; state.startEpoch = Date.now();
      });
    });
    // cleanup quando o host sai do DOM
    const obs = new MutationObserver(()=>{ if (!document.body.contains(el)) { try{ unregister(); }catch{} obs.disconnect(); } });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  function mountCompact(host){
    inject();
    recomputeLeft(); if (state.running && state.left<=0) { nextPhase(); }
    const el = document.createElement('div'); el.className = 'pv-htimer';
    el.innerHTML = '<span class="t" id="h-left">00:00</span><span class="p" id="h-phase">Estudo</span>\
<button id="h-toggle" title="Iniciar/Pausar">▶</button><button id="h-skip" title="Pular">⏭</button>';
    host.appendChild(el);
    const refs = { left: el.querySelector('#h-left'), phase: el.querySelector('#h-phase'), toggle: el.querySelector('#h-toggle'), skip: el.querySelector('#h-skip') };
    function update(){ refs.left.textContent = fmt(state.left); refs.phase.textContent = (state.phase==='study'?'Estudo':(state.phase==='break'?'Pausa':'Longa')); refs.toggle.textContent = state.running? '⏸':'▶'; }
    const unregister = registerUI(update);
    refs.toggle.addEventListener('click', ()=> state.running? (pause(), bcast('pause')) : (start(), bcast('start')));
    refs.skip.addEventListener('click', ()=> { skip(); });
    // cleanup
    const obs = new MutationObserver(()=>{ if (!document.body.contains(el)) { try{ unregister(); }catch{} obs.disconnect(); } });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  // Modal de som (sem Bootstrap)
  window.openAlarmModal = function(){
    try {
      const fundo = document.createElement('div');
      fundo.className='janela-fundo';
      Object.assign(fundo.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'1180'});
      const caixa = document.createElement('div');
      caixa.className='janela janela--dialogo'; caixa.setAttribute('role','dialog'); caixa.setAttribute('aria-modal','true');
      Object.assign(caixa.style,{background:'#fff',color:'#222',minWidth:'280px',maxWidth:'520px',padding:'1rem 1rem .75rem',borderRadius:'10px',boxShadow:'0 10px 30px rgba(0,0,0,.35)'});
      caixa.innerHTML = `<div class="janela__cabecalho"><h2 class="janela__titulo" style="margin:0;font-size:1.1rem;">Alarme do Timer</h2></div>
      <div class="janela__corpo" style="margin-top:.5rem;">
        <div style="margin-bottom:.75rem;">
          <label for="alarm-file" class="small" style="display:block;margin-bottom:.25rem;">Arquivo de som</label>
          <input type="file" id="alarm-file" accept="audio/*" class="campo" style="width:100%;">
        </div>
        <div class="small" style="color:#555;">O som será tocado ao finalizar cada fase quando a opção "Som ao finalizar" estiver marcada no Timer.</div>
      </div>`;
      const rodape = document.createElement('div'); rodape.className='janela__acoes'; Object.assign(rodape.style,{display:'flex',justifyContent:'flex-end',gap:'.5rem',marginTop:'1rem'});
      const btnFechar = document.createElement('button'); btnFechar.className='botao botao--suave'; btnFechar.textContent='Fechar';
      const btnTest = document.createElement('button'); btnTest.className='botao botao--primario'; btnTest.id='alarm-test'; btnTest.textContent='Testar';
      rodape.appendChild(btnFechar); rodape.appendChild(btnTest); caixa.appendChild(rodape); fundo.appendChild(caixa); document.body.appendChild(fundo);
      function fechar(){ try{ fundo.remove(); }catch{} }
      fundo.addEventListener('click', e=>{ if(e.target===fundo) fechar(); });
      btnFechar.addEventListener('click', fechar);
      document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ document.removeEventListener('keydown', esc); fechar(); } });
      const file = caixa.querySelector('#alarm-file'); const testBtn = caixa.querySelector('#alarm-test');
      if(file){ file.addEventListener('change', ()=>{ const f = file.files && file.files[0]; if(!f) return; const url = URL.createObjectURL(f); try{ localStorage.setItem('pv_timer_sound_src', url); }catch{} }); }
      if(testBtn){ testBtn.addEventListener('click', ()=>{ try{ (new Audio(localStorage.getItem('pv_timer_sound_src')||'')).play(); }catch{} }); }
      setTimeout(()=>{ try{ (file||btnTest).focus(); }catch{} }, 30);
    } catch(e){}
  }

  window.pvStudyTimer = { mount, mountCompact, getState: ()=>({ ...state }), start, pause, reset, skip };
})();

// Modal simplificada do Timer para abrir via ícone do header
window.openTimerModal = function(){
  // Abre uma pequena janela flutuante com o timer (sem Bootstrap)
  try {
    if (!window.pvStudyTimer && !document.querySelector('script[data-pv="study-timer"]')){
      const st=document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; st.setAttribute('data-pv','study-timer'); document.body.appendChild(st);
    }
    const fundo = document.createElement('div');
    fundo.className='janela-fundo'; Object.assign(fundo.style,{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'1190'});
    const caixa = document.createElement('div'); caixa.className='janela janela--timer'; Object.assign(caixa.style,{background:'#fff',minWidth:'300px',maxWidth:'480px',padding:'1rem',borderRadius:'10px',boxShadow:'0 10px 25px rgba(0,0,0,.35)'});
    caixa.innerHTML = '<div class="janela__cabecalho" style="display:flex;align-items:center;justify-content:space-between;"><h2 class="janela__titulo" style="margin:0;font-size:1.1rem;">Timer</h2><button type="button" class="botao botao--suave" data-fechar>×</button></div><div class="janela__corpo" data-timer-host style="margin-top:.5rem;"></div>';
    fundo.appendChild(caixa); document.body.appendChild(fundo);
    function fechar(){ try{ fundo.remove(); }catch{} }
    fundo.addEventListener('click', e=>{ if(e.target===fundo) fechar(); });
    caixa.querySelector('[data-fechar]').addEventListener('click', fechar);
    document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ document.removeEventListener('keydown', esc); fechar(); } });
    // montar timer completo dentro
    const host = caixa.querySelector('[data-timer-host]');
    try { window.pvStudyTimer.mount(host); } catch{}
  } catch{}
}
