(function(){
  function qs(s){return document.querySelector(s)}
  function rect(el){const r=el.getBoundingClientRect();return {x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height}}
  const overlay = document.createElement('div'); overlay.id='pv-tour-overlay'; document.body.appendChild(overlay);
  const highlight = document.createElement('div'); highlight.className='pv-tour-highlight'; overlay.appendChild(highlight);
  const pop = document.createElement('div'); pop.className='pv-tour-pop'; overlay.appendChild(pop);
  // seta SVG em estilo "desenhado"
  const svgNS = 'http://www.w3.org/2000/svg';
  const arrow = document.createElementNS(svgNS, 'svg');
  arrow.classList.add('pv-tour-arrow');
  arrow.setAttribute('viewBox', '0 0 100 100');
  arrow.setAttribute('preserveAspectRatio', 'none');
  const path1 = document.createElementNS(svgNS, 'path');
  const path2 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('class', 'stroke-1');
  path2.setAttribute('class', 'stroke-2');
  arrow.appendChild(path1); arrow.appendChild(path2);
  overlay.appendChild(arrow);
  const skip = document.createElement('button'); skip.className='pv-tour-btn pv-tour-skip'; skip.textContent='Pular guia'; overlay.appendChild(skip);

  const steps = [
    { sel: '.nav-btn[data-view="tasks"]', title: 'Tarefas', body: 'Aqui você acessa sua lista de tarefas. Crie, edite, conclua e acompanhe o progresso.' },
    { sel: '.nav-btn[data-view="calendar"]', title: 'Calendário', body: 'Visualize suas tarefas distribuídas ao longo dos dias.' },
    { sel: '.nav-btn[data-view="dashboard"]', title: 'Dashboard', body: 'Resumo com indicadores e gráfico simples da sua atividade.' },
    { sel: '.nav-btn[data-view="notebooks"]', title: 'Cadernos', body: 'Crie cadernos e páginas de anotações organizadas.' },
    { sel: '#btn-add-task, #btn-new', title: 'Nova tarefa', body: 'Adicione uma nova tarefa rapidamente.' },
    { sel: '#btn-logout, #btn-logout-m', title: 'Sair', body: 'Encerre sua sessão com segurança quando terminar.' }
  ];

  let i = 0; let onEnd = null;
  function place(){
    const target = document.querySelector(steps[i].sel);
    if(!target || !overlay.classList.contains('active')) return;
    const r = rect(target);
    // buraco no overlay (remove blur na área do alvo)
    const pad = 8; // margem
    overlay.style.setProperty('--hole-x', (r.x - pad) + 'px');
    overlay.style.setProperty('--hole-y', (r.y - pad) + 'px');
    overlay.style.setProperty('--hole-w', (r.w + pad*2) + 'px');
    overlay.style.setProperty('--hole-h', (r.h + pad*2) + 'px');

    // destaque luminoso ao redor do alvo
    highlight.style.left = (r.x-6)+'px';
    highlight.style.top = (r.y-6)+'px';
    highlight.style.width = (r.w+12)+'px';
    highlight.style.height = (r.h+12)+'px';

    // posiciona o balão preferindo à direita/abaixo
    pop.innerHTML = '';
    const h4 = document.createElement('h4'); h4.textContent = steps[i].title; pop.appendChild(h4);
    const body = document.createElement('div'); body.className='pv-tour-body'; body.textContent = steps[i].body; pop.appendChild(body);
    const act = document.createElement('div'); act.className='pv-tour-actions';
    const prev = document.createElement('button'); prev.className='pv-tour-btn'; prev.textContent='Voltar'; prev.disabled = i===0; prev.onclick=()=>{ i=Math.max(0,i-1); place(); };
    const next = document.createElement('button'); next.className='pv-tour-btn primary'; next.textContent= i===steps.length-1 ? 'Concluir' : 'Próximo'; next.onclick=()=>{ if(i<steps.length-1){ i++; place(); } else { end(); } };
    act.appendChild(prev); act.appendChild(next); pop.appendChild(act);

    const margin = 12;
    let px = r.x + r.w + margin; let py = r.y;
    // se estourar lateral, posiciona abaixo
    if(px + pop.offsetWidth > window.scrollX + window.innerWidth){ px = r.x; py = r.y + r.h + margin; }
    // se estourar embaixo, posiciona acima
    if(py + pop.offsetHeight > window.scrollY + window.innerHeight){ py = Math.max(8, r.y - pop.offsetHeight - margin); }
    pop.style.left = px+'px'; pop.style.top = py+'px';

    // posiciona a seta entre o balão e o alvo (curva bezier)
    const start = { x: px + Math.min(pop.offsetWidth, 200)*0.2, y: py + 10 };
    // ponta aponta para o centro do alvo
    const end = { x: r.x + r.w/2, y: r.y + r.h/2 };
    // controle para curva com leve "desenho" orgânico
    const ctrl1 = { x: start.x + (end.x - start.x)*0.2, y: start.y - 30 };
    const ctrl2 = { x: start.x + (end.x - start.x)*0.8, y: end.y - 30 };

    // ajusta SVG para cobrir toda a viewport
    arrow.setAttribute('width', String(window.innerWidth));
    arrow.setAttribute('height', String(window.innerHeight));
    arrow.style.left = 0; arrow.style.top = 0; arrow.style.position = 'fixed';
    const d = `M ${start.x},${start.y} C ${ctrl1.x},${ctrl1.y} ${ctrl2.x},${ctrl2.y} ${end.x},${end.y}`;
    path1.setAttribute('d', d);
    path2.setAttribute('d', d);

    // rola para o elemento se estiver fora da viewport
    const vb = { top: window.scrollY, bottom: window.scrollY + window.innerHeight };
    const tb = { top: r.y, bottom: r.y + r.h };
    if(tb.top < vb.top || tb.bottom > vb.bottom){ window.scrollTo({ top: Math.max(0, r.y - 80), behavior: 'smooth' }); }
  }

  function start(idx=0, cb){ i = idx||0; onEnd = cb||null; overlay.classList.add('active'); place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, { passive:true }); }
  function end(){ overlay.classList.remove('active'); window.removeEventListener('resize', place); window.removeEventListener('scroll', place); if(onEnd) try{ onEnd(); }catch(_){} }

  skip.onclick = end;
  document.addEventListener('keydown', (e)=>{ if(!overlay.classList.contains('active')) return; if(e.key==='Escape') end(); if(e.key==='ArrowRight') { if(i<steps.length-1){ i++; place(); } } if(e.key==='ArrowLeft'){ if(i>0){ i--; place(); } } });

  // API pública
  window.PVTour = { start, end };
})();
