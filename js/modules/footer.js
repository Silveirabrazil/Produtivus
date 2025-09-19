// js/modules/footer.js
// Renderiza um footer unificado (padrão Bootstrap) em todas as páginas
(function(){
  function renderFooter(container){
    // aceitar #footer-container ou um <footer.app-footer> existente
    if (container && typeof container === 'object' && !('querySelector' in container)) {
      container = null;
    }
    if (!container) container = document.getElementById('footer-container') || document.querySelector('footer.app-footer');
    if (!container) return;

    // Se o alvo for um footer existente, usamos ele; caso contrário, criamos
    const isFooterTag = container.tagName && container.tagName.toLowerCase() === 'footer';
    const host = isFooterTag ? container : document.createElement('footer');
    host.className = 'bg-body-tertiary border-top mt-auto';
    host.setAttribute('role','contentinfo');

    const year = new Date().getFullYear();
    const html = `
<div class="container py-4">
  <div class="row g-4">
    <div class="col-12 col-lg-4">
      <h6 class="text-uppercase small fw-semibold mb-2">Produtivus</h6>
      <p class="text-body-secondary small mb-0">Organize tarefas, estudos e calendário em um só lugar.</p>
    </div>
    <div class="col-6 col-lg-2">
      <h6 class="text-uppercase small fw-semibold mb-2">Navegação</h6>
      <ul class="list-unstyled small mb-0">
        <li><a class="link-body-emphasis text-decoration-none" href="tarefas.html">Tarefas</a></li>
        <li><a class="link-body-emphasis text-decoration-none" href="calendario.html">Calendário</a></li>
        <li><a class="link-body-emphasis text-decoration-none" href="dashboard.html">Dashboard</a></li>
        <li><a class="link-body-emphasis text-decoration-none" href="estudos.html">Estudos</a></li>
      </ul>
    </div>
    <div class="col-6 col-lg-2">
      <h6 class="text-uppercase small fw-semibold mb-2">Conteúdo</h6>
      <ul class="list-unstyled small mb-0">
        <li><a class="link-body-emphasis text-decoration-none" href="cadernos.html">Cadernos</a></li>
        <li><a class="link-body-emphasis text-decoration-none" href="mapas.html">Mapas mentais</a></li>
        <li><a class="link-body-emphasis text-decoration-none" href="subjects.html">Matérias</a></li>
      </ul>
    </div>
    <div class="col-12 col-lg-4">
        <div class="d-flex flex-column align-items-start align-items-lg-end gap-2">
        <div class="text-body-secondary small">Cadastre-se gratuitamente</div>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="pv-footer-signup">Criar conta</button>
      </div>
    </div>
  </div>

  <hr class="my-4"/>

  <div class="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
    <div class="d-flex gap-2">
      ${socialBtn('github','M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.77.6-3.36-1.34-3.36-1.34-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.37 1.09 2.95.84.09-.66.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.84c.85 0 1.7.11 2.5.33 1.9-1.3 2.74-1.02 2.74-1.02.56 1.38.21 2.4.11 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z')}
      ${socialBtn('twitter','M22.46 6c-.77.35-1.6.58-2.46.69a4.27 4.27 0 0 0 1.88-2.36 8.49 8.49 0 0 1-2.7 1.03 4.24 4.24 0 0 0-7.22 3.87A12 12 0 0 1 3.15 4.57a4.23 4.23 0 0 0 1.31 5.66 4.2 4.2 0 0 1-1.92-.53v.05a4.24 4.24 0 0 0 3.4 4.15 4.26 4.26 0 0 1-1.91.07 4.24 4.24 0 0 0 3.96 2.95A8.5 8.5 0 0 1 2 19.54 12 12 0 0 0 8.29 21.5c7.55 0 11.68-6.26 11.68-11.68 0-.18 0-.36-.01-.54A8.34 8.34 0 0 0 22.46 6Z')}
      ${socialBtn('youtube','M10 15l5.19-3L10 9v6Zm12-3c0 0 0-3-.38-4.44a3 3 0 0 0-2.12-2.12C18.06 5 12 5 12 5s-6.06 0-7.5.44a3 3 0 0 0-2.12 2.12C2 9 2 12 2 12s0 3 .38 4.44a3 3 0 0 0 2.12 2.12C6 19 12 19 12 19s6.06 0 7.5-.44a3 3 0 0 0 2.12-2.12C22 15 22 12 22 12Z')}
      ${socialBtn('instagram','M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.1a1.1 1.1 0 1 0-2.2 0 1.1 1.1 0 0 0 2.2 0Z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z')}
    </div>
    <div class="small text-body-secondary text-center text-md-end flex-grow-1">
      © <span id="copyright-year">${year}</span> Produtivus
    </div>
  </div>
</div>`;

    host.innerHTML = html;
    if (!isFooterTag) {
      container.innerHTML = '';
      container.appendChild(host);
    }

    // Wire: abrir modal de cadastro
    try {
      const btn = host.querySelector('#pv-footer-signup');
      if (btn) btn.addEventListener('click', function(){
        try {
          if (!window.openSignupModal) {
            // garantir que a modal de login esteja carregada
            const lm = document.createElement('script'); lm.src='js/modules/login-modal.js'; lm.defer=true; lm.onload=function(){ try{ window.openSignupModal && window.openSignupModal(); }catch{} };
            document.body.appendChild(lm);
          } else {
            window.openSignupModal();
          }
        } catch {}
      });
    } catch {}
  }

  function socialBtn(name, path){
    // botão circular com ícone SVG inline (sem dependências externas)
    return `<button type="button" class="btn btn-outline-secondary rounded-circle p-0 d-inline-flex align-items-center justify-content-center" aria-label="${name}" style="width:38px;height:38px">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"></path></svg>
    </button>`;
  }

  document.addEventListener('DOMContentLoaded', function(){ renderFooter(); });
  // expor para reuso se necessário
  window.renderFooter = renderFooter;
})();
