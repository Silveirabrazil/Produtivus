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

  // Modal de som (Bootstrap)
  window.openAlarmModal = function(){
    try {
      const id = 'pv-alarm-modal';
      let m = document.getElementById(id);
      if (!m) {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
<div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Alarme do Timer</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label for="alarm-file" class="form-label">Arquivo de som</label>
          <input type="file" id="alarm-file" class="form-control" accept="audio/*">
        </div>
        <div class="small text-body-secondary">O som será tocado ao finalizar cada fase quando a opção "Som ao finalizar" estiver marcada no Timer.</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Fechar</button>
        <button type="button" class="btn btn-primary" id="alarm-test">Testar</button>
      </div>
    </div>
  </div>
</div>`;
        m = wrap.firstElementChild;
        document.body.appendChild(m);
      }
      const inst = window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(m, { backdrop:'static' }) : null;
      // wire listeners on each open to ensure they exist
      const file = m.querySelector('#alarm-file');
      const testBtn = m.querySelector('#alarm-test');
      if (file && !file._bound) {
        file.addEventListener('change', ()=>{ const f = file.files && file.files[0]; if (!f) return; const url = URL.createObjectURL(f); try{ localStorage.setItem('pv_timer_sound_src', url); }catch{} });
        file._bound = true;
      }
      if (testBtn && !testBtn._bound) {
        testBtn.addEventListener('click', ()=>{ try{ (new Audio(localStorage.getItem('pv_timer_sound_src')||'')).play(); }catch{} });
        testBtn._bound = true;
      }
      if (inst) {
        m.addEventListener('hidden.bs.modal', ()=>{ /* keep modal for reuse */ }, { once:true });
        inst.show();
      } else {
        m.style.display = 'block';
      }
    } catch {}
  }

  window.pvStudyTimer = { mount, mountCompact, getState: ()=>({ ...state }), start, pause, reset, skip };
})();

// Modal simplificada do Timer para abrir via ícone do header
window.openTimerModal = function(){
  // Compat: abrir o dropdown do header e montar o timer lá
  try{
    const btn = document.getElementById('btn-timer');
    if (!btn) return;
    // garantir script do timer
    if (!window.pvStudyTimer && !document.querySelector('script[data-pv="study-timer"]')){
      const st=document.createElement('script'); st.src='js/modules/study-timer.js'; st.defer=true; st.setAttribute('data-pv','study-timer'); document.body.appendChild(st);
    }
    // abrir dropdown
    if (window.bootstrap?.Dropdown){
      const dd = window.bootstrap.Dropdown.getOrCreateInstance(btn, { autoClose:'outside' });
      dd.show();
      // evento shown será usado no header para montar o timer
    } else {
      btn.click();
    }
  }catch{}
}
