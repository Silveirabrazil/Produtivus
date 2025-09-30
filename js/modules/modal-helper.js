// Utilitário simples para modais .janela (sem Bootstrap)
// API:
//   const m = createJanela({ titulo:'Título', html:'<p>Conteúdo</p>',
//                           acoes:[{ rotulo:'OK', tipo:'primario', acao(){...} }, { rotulo:'Cancelar' }] });
//   m.abrir(); m.fechar(); m.destruir();
//   Ou montar em HTML existente: wrapJanela(element)
(function(){
  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function btn(def){
    const b=el('button','botao');
    if(def.tipo==='primario') b.classList.add('botao--primario');
    else if(def.tipo==='perigo') b.classList.add('botao--perigo');
    else if(def.tipo==='fantasma') b.classList.add('botao--fantasma');
    if(def.pequeno) b.classList.add('botao--pequeno');
    b.type='button'; b.textContent=def.rotulo||'OK';
    b.addEventListener('click',()=>{ if(def.acao) def.acao(); });
    return b;
  }
  function montarEstrutura(opts){
    const overlay=el('div','janela');
    const caixa=el('div','janela__caixa');
    const cab=el('div','janela__cabecalho');
    const titulo=el('h5','janela__titulo'); titulo.textContent = opts.titulo||'';
    const fechar=el('button','janela__fechar'); fechar.setAttribute('aria-label','Fechar'); fechar.innerHTML='\n<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    fechar.addEventListener('click',()=> fecharJanela(overlay));
    cab.append(titulo, fechar);
    const corpo=el('div','janela__corpo', opts.html||'');
    const acoes=el('div','janela__acoes');
    if(Array.isArray(opts.acoes) && opts.acoes.length){ opts.acoes.forEach(a=> acoes.appendChild(btn(a))); }
    caixa.append(cab, corpo, acoes); overlay.appendChild(caixa);
    if(opts.compacta) overlay.classList.add('janela--compacta');
    if(opts.tamanho) overlay.classList.add('janela--'+opts.tamanho);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) fecharJanela(overlay); });
    document.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ if(!document.body.contains(overlay)) return; fecharJanela(overlay); document.removeEventListener('keydown',esc); } });
    return overlay;
  }
  function abrirJanela(ov){ if(!ov.parentNode) document.body.appendChild(ov); requestAnimationFrame(()=> ov.classList.add('janela--aberta')); document.documentElement.style.setProperty('--janela-scroll-lock','1'); document.body.style.overflow='hidden'; }
  function fecharJanela(ov){ ov.classList.add('janela--fechando'); setTimeout(()=>{ ov.classList.remove('janela--aberta','janela--fechando'); if(ov.parentNode) ov.parentNode.removeChild(ov); if(!document.querySelector('.janela.janela--aberta')) document.body.style.overflow=''; }, 260); }
  function createJanela(opts){ const ov=montarEstrutura(opts||{}); return { elemento:ov, abrir:()=>abrirJanela(ov), fechar:()=>fecharJanela(ov), destruir:()=>{ if(ov.parentNode) ov.parentNode.remove(); document.body.style.overflow=''; } }; }
  function wrapJanela(existing){ existing.classList.add('janela'); return { elemento:existing, abrir:()=>abrirJanela(existing), fechar:()=>fecharJanela(existing) }; }
  window.createJanela = createJanela; window.wrapJanela = wrapJanela; window.fecharJanela = fecharJanela;
})();
