// footer.js simplificado: injeta footer .rodape apenas se não existir um estático (inc/footer.html)
(function(){
  function pronto(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}
  function getPaths(){
    const raw=location.pathname||'';const lower=raw.toLowerCase();const pos=lower.indexOf('/html/');
    const root= pos>=0 ? raw.slice(0,pos+1) : raw.slice(0, raw.lastIndexOf('/')+1);
    return {root,pages:root+'html/'};
  }
  function markup(p){
    return `<footer class="rodape"><div class="rodape__fundo"><div class="rodape__conteudo"><div class="rodape__grade">
      <div class="rodape__coluna rodape__coluna--sobre"><h6 class="rodape__titulo">Sobre</h6><p class="rodape__texto">Produtivus — foco em estudos, organização e evolução acadêmica.</p></div>
      <div class="rodape__coluna rodape__coluna--links"><h6 class="rodape__titulo">Links</h6><ul class="rodape__links">
        <li><a class="rodape__link" href="${p.pages}dashboard.html">Dashboard</a></li>
        <li><a class="rodape__link" href="${p.pages}tarefas.html">Tarefas</a></li>
        <li><a class="rodape__link" href="${p.pages}estudos.html">Estudos</a></li>
        <li><a class="rodape__link" href="${p.pages}calendario.html">Calendário</a></li>
  <li><a class="rodape__link" href="${p.pages}caderno.html">Cadernos</a></li>
        <li><a class="rodape__link" href="${p.pages}planilhas.html">Planilhas</a></li>
        <li><a class="rodape__link" href="${p.pages}mapas.html">Mapas Mentais</a></li>
      </ul></div>
      <div class="rodape__coluna rodape__coluna--acoes"><h6 class="rodape__titulo">Ações</h6><button type="button" class="rodape__botao" id="rodape-entrar">Entrar</button><div class="rodape__social"><button type="button" class="rodape__social-btn" aria-label="GitHub"><svg class="rodape__social-ic" width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33C4.73 14.4 4.14 13 4.14 13c-.36-.93-.88-1.18-.88-1.18-.72-.5.05-.49.05-.49.8.06 1.22.83 1.22.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82a7.62 7.62 0 0 1 2-.27 7.6 7.6 0 0 1 2 .27c1.53-1.03 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.45.55.38A8 8 0 0 0 8 .2Z"/></svg></button></div></div>
    </div><div class="rodape__linha-final"><div class="rodape__copy">© <span id="rodape-ano"></span> Produtivus</div></div></div></div></footer>`;
  }
  function injetar(){
    if(document.querySelector('.rodape')) return;
    const p=getPaths();
    const cont=document.getElementById('footer-container')||document.body;
    const wrap=document.createElement('div'); wrap.innerHTML=markup(p);
    const footer=wrap.firstElementChild; cont.appendChild(footer);
    const ano=footer.querySelector('#rodape-ano'); if(ano) ano.textContent=new Date().getFullYear();
    const btn=footer.querySelector('#rodape-entrar'); if(btn){ btn.addEventListener('click',()=>{ if(window.openLoginModal) window.openLoginModal(); else location.href=p.index+'?login=1'; }); }
  }
  pronto(injetar); window.renderFooter=injetar;
})();
