// Carrossel JS puro (PT-BR)
// Funcionalidades: autoplay, indicadores, swipe vertical, controles prev/next, pausa, acessibilidade básica.
(function(){
  const raiz = document.getElementById('carrosselHero');
  if(!raiz) return;
  const tempo = parseInt(raiz.getAttribute('data-autoplay')||'5000',10);
  // Seletores definitivos (aliases legados removidos)
  const itens = Array.from(raiz.querySelectorAll('.hero-slide'));
  const indicadores = Array.from(raiz.querySelectorAll('.hero-dots button'));
  const btnPrev = raiz.querySelector('.hero-control--prev,[data-controle="anterior"]');
  const btnNext = raiz.querySelector('.hero-control--next,[data-controle="proximo"]');
  const btnPause = raiz.querySelector('.hero-pause,[data-controle="pausa"]');
  let indice = itens.findIndex(i=>i.classList.contains('ativo')); if(indice<0) indice = 0;
  let timer; let pausado = false; let focoInterno = false;

  // Inicializa atributos ARIA
  itens.forEach((item,i)=>{
    item.setAttribute('role','group');
    item.setAttribute('aria-roledescription','slide');
    item.setAttribute('aria-label', `Slide ${i+1} de ${itens.length}`);
  });

  function atualizarAria(){
    itens.forEach((el,i)=>{
      const ativo = i===indice;
      el.setAttribute('aria-hidden', ativo ? 'false':'true');
    });
    indicadores.forEach((b,i)=>{
      if(i===indice){ b.classList.add('ativo'); b.setAttribute('aria-current','true'); }
      else { b.classList.remove('ativo'); b.removeAttribute('aria-current'); }
    });
  }

  function ativar(n){
    if(n===indice) return;
    const atual = itens[indice];
    const prox = itens[n]; if(!prox) return;
    atual.classList.remove('ativo');
    prox.classList.add('ativo');
    indice = n;
    atualizarAria();
  }

  function proximo(){ ativar((indice + 1) % itens.length); }
  function anterior(){ ativar((indice - 1 + itens.length) % itens.length); }

  function iniciarAuto(){ if(pausado) return; pararAuto(); timer = setInterval(proximo, tempo); }
  function pararAuto(){ if(timer) clearInterval(timer); }

  function togglePausa(){
    pausado = !pausado;
  if(pausado){ pararAuto(); raiz.classList.add('carrossel--pausado'); btnPause?.setAttribute('aria-pressed','true'); if(btnPause) btnPause.textContent='▶'; btnPause?.setAttribute('aria-label','Retomar rotação automática'); }
  else { raiz.classList.remove('carrossel--pausado'); btnPause?.setAttribute('aria-pressed','false'); if(btnPause) btnPause.textContent='II'; btnPause?.setAttribute('aria-label','Pausar rotação automática'); iniciarAuto(); }
  }

  indicadores.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const n = parseInt(btn.getAttribute('data-indice'),10);
      ativar(n); iniciarAuto();
    });
  });
  btnNext?.addEventListener('click', ()=>{ proximo(); iniciarAuto(); });
  btnPrev?.addEventListener('click', ()=>{ anterior(); iniciarAuto(); });
  btnPause?.addEventListener('click', togglePausa);

  raiz.addEventListener('mouseenter', ()=>{ focoInterno=false; if(!pausado) pararAuto(); });
  raiz.addEventListener('mouseleave', ()=>{ if(!pausado) iniciarAuto(); });

  // Teclado: setas esquerda/direita, espaço para pausa
  raiz.addEventListener('keydown', e=>{
    focoInterno = true;
    if(e.key==='ArrowRight'){ e.preventDefault(); proximo(); iniciarAuto(); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); anterior(); iniciarAuto(); }
  else if(e.key===' ' || e.code==='Space'){ e.preventDefault(); togglePausa(); }
  });
  raiz.setAttribute('tabindex','0');

  // Swipe vertical
  let startY=null; raiz.addEventListener('touchstart', e=>{ if(e.touches[0]) startY=e.touches[0].clientY; }, {passive:true});
  raiz.addEventListener('touchend', e=>{
    if(startY==null) return; const endY=(e.changedTouches[0]||{}).clientY; const diff=startY-endY; startY=null; if(Math.abs(diff)<30) return;
    if(diff>0) proximo(); else anterior(); iniciarAuto();
  });

  atualizarAria();
  iniciarAuto();
})();
