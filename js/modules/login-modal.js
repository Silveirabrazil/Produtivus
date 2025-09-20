// js/modules/login-modal.js
// Modal de login simples que reutiliza a infraestrutura atual (/server/api/login.php)
(function(){
  if (window.openLoginModal) return; // já carregado

  // Função auxiliar para detectar URL do backend
  function getBackendUrl() {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // Se estamos na porta 8081 (frontend), o backend é na 8080
    if (currentPort === '8081') {
      return `http://${currentHost}:8080`;
    }
    // Caso contrário, assume que está no mesmo servidor
    return '';
  }

  function ensureStyles(){ /* estilos da modal de login agora vivem no bundle de CSS global */ }

  function ensureModal(){
    if (document.getElementById('pv-login-modal')) return;
    ensureStyles();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
<div class="modal fade" id="pv-login-modal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="pv-login-title">Acesso</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="text-center mb-3">
          <img src="img/logo.png" alt="Produtivus" style="height:48px">
        </div>
        <ul class="nav nav-tabs" id="pv-auth-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="tab-login" data-bs-toggle="tab" data-bs-target="#pane-login" type="button" role="tab" aria-controls="pane-login" aria-selected="true">Entrar</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="tab-signup" data-bs-toggle="tab" data-bs-target="#pane-signup" type="button" role="tab" aria-controls="pane-signup" aria-selected="false">Criar conta</button>
          </li>
        </ul>
        <div class="tab-content pt-3">
          <div class="tab-pane fade show active" id="pane-login" role="tabpanel" aria-labelledby="tab-login">
            <div id="pv-login-error" class="alert alert-danger d-none" role="alert"></div>
            <form id="pv-login-form" class="vstack gap-3">
              <div>
                <label for="pv-login-email" class="form-label">E-mail</label>
                <input type="email" class="form-control" id="pv-login-email" autocomplete="username" required>
              </div>
              <div>
                <label for="pv-login-password" class="form-label">Senha</label>
                <div class="input-group">
                  <input type="password" class="form-control" id="pv-login-password" autocomplete="current-password" required>
                  <button class="btn btn-outline-secondary" type="button" id="toggle-login-password">
                    <i class="material-symbols-outlined">visibility</i>
                  </button>
                </div>
              </div>
            </form>
            <div class="text-center my-2 text-body-secondary">ou</div>
            <div id="pv-google-login-btn" class="d-flex justify-content-center"></div>
            <div id="pv-google-fallback" class="d-none mt-2">
              <div class="text-center mb-2">
                <small class="text-muted">Google indisponível - Acesso especial para proprietário</small>
              </div>
              <div class="input-group input-group-sm">
                <input type="password" class="form-control" id="pv-fallback-code" placeholder="Código de fallback" autocomplete="off">
                <button class="btn btn-outline-primary" type="button" id="pv-fallback-submit">
                  <i class="material-symbols-outlined">key</i>
                </button>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="pane-signup" role="tabpanel" aria-labelledby="tab-signup">
            <div id="pv-signup-error" class="alert alert-danger d-none" role="alert"></div>
            <form id="pv-signup-form" class="vstack gap-3">
              <div>
                <label for="pv-signup-name" class="form-label">Nome</label>
                <input type="text" class="form-control" id="pv-signup-name" autocomplete="name" required>
              </div>
              <div>
                <label for="pv-signup-email" class="form-label">E-mail</label>
                <input type="email" class="form-control" id="pv-signup-email" autocomplete="email" required>
              </div>
              <div>
                <label for="pv-signup-password" class="form-label">Senha</label>
                <div class="input-group">
                  <input type="password" class="form-control" id="pv-signup-password" minlength="6" required>
                  <button class="btn btn-outline-secondary" type="button" id="toggle-signup-password">
                    <i class="material-symbols-outlined">visibility</i>
                  </button>
                </div>
                <div class="form-text">Mínimo 6 caracteres, com maiúscula, minúscula, número e símbolo.</div>
              </div>
              <div>
                <label for="pv-signup-password-confirm" class="form-label">Confirmar Senha</label>
                <div class="input-group">
                  <input type="password" class="form-control" id="pv-signup-password-confirm" minlength="6" required>
                  <button class="btn btn-outline-secondary" type="button" id="toggle-signup-password-confirm">
                    <i class="material-symbols-outlined">visibility</i>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div class="flex-grow-1 text-start">
          <button type="button" class="btn btn-link btn-sm text-decoration-none" id="pv-open-signup">Criar conta</button>
        </div>
        <button type="button" class="btn btn-outline-secondary" id="pv-login-cancel" data-bs-dismiss="modal">Cancelar</button>
        <button type="submit" class="btn btn-primary" form="pv-login-form" id="pv-login-submit">Entrar</button>
        <button type="submit" class="btn btn-primary d-none" form="pv-signup-form" id="pv-signup-submit">Criar conta</button>
      </div>
    </div>
  </div>
</div>`;
    const modal = wrap.firstElementChild;
    document.body.appendChild(modal);

    const bsModal = window.bootstrap ? new window.bootstrap.Modal(modal, { backdrop:'static' }) : null;

    // Função para alternar visibilidade de senha
    function setupPasswordToggle(toggleBtnId, passwordInputId) {
      const toggleBtn = document.getElementById(toggleBtnId);
      const passwordInput = document.getElementById(passwordInputId);
      const icon = toggleBtn?.querySelector('i');

      toggleBtn?.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        icon.textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }

    // Configurar botões de mostrar/ocultar senha
    setupPasswordToggle('toggle-login-password', 'pv-login-password');
    setupPasswordToggle('toggle-signup-password', 'pv-signup-password');
    setupPasswordToggle('toggle-signup-password-confirm', 'pv-signup-password-confirm');

    // Sistema de fallback para Google Login (apenas para proprietário)
    const OWNER_EMAIL = 'silveirabrazil@gmail.com'; // Email do proprietário
    let googleFallbackEnabled = false;

    // Detecta se Google está indisponível e habilita fallback para proprietário
    function checkGoogleFallback() {
      const loginEmail = document.getElementById('pv-login-email')?.value?.trim();
      const fallbackDiv = document.getElementById('pv-google-fallback');

      if (loginEmail && loginEmail.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        // Verifica se Google está acessível
        setTimeout(() => {
          const googleBtn = document.querySelector('#pv-google-login-btn > div');
          if (!googleBtn || googleBtn.children.length === 0) {
            // Google não carregou, mostra fallback
            fallbackDiv?.classList.remove('d-none');
            googleFallbackEnabled = true;
          }
        }, 3000); // 3 segundos para Google carregar
      } else {
        fallbackDiv?.classList.add('d-none');
        googleFallbackEnabled = false;
      }
    }

    // Monitora mudanças no email para verificar fallback
    document.getElementById('pv-login-email')?.addEventListener('input', checkGoogleFallback);
    document.getElementById('pv-login-email')?.addEventListener('blur', checkGoogleFallback);

    // Handler do botão de fallback
    document.getElementById('pv-fallback-submit')?.addEventListener('click', async () => {
      const email = document.getElementById('pv-login-email')?.value?.trim();
      const code = document.getElementById('pv-fallback-code')?.value?.trim();
      const errEl = document.getElementById('pv-login-error');

      if (!email || !code) {
        errEl.textContent = 'Informe o email e código de fallback';
        errEl.classList.remove('d-none');
        return;
      }

      if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        errEl.textContent = 'Fallback disponível apenas para conta do proprietário';
        errEl.classList.remove('d-none');
        return;
      }

      try {
        errEl.classList.add('d-none');
        
        const backendUrl = getBackendUrl();
        const fallbackUrl = backendUrl + '/api/google_fallback.php';
        
        const response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email, fallback_code: code })
        });

        const data = await response.json();
        if (data.success) {
          localStorage.setItem('pv_user', JSON.stringify({
            email: data.user.email,
            name: data.user.name,
            login_time: Date.now(),
            login_method: 'google_fallback'
          }));

          if (bsModal) bsModal.hide();
          try { typeof renderHeader === 'function' && renderHeader(); } catch {}
          try { window.pvNotify?.({ title:'Bem-vindo!', message:'Login via fallback realizado.', type:'success'}); } catch {}
        } else {
          errEl.textContent = data.message || 'Código de fallback inválido';
          errEl.classList.remove('d-none');
        }
      } catch (err) {
        errEl.textContent = 'Erro ao conectar com servidor';
        errEl.classList.remove('d-none');
      }
    });

    // Enter no campo de código executa o fallback
    document.getElementById('pv-fallback-code')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('pv-fallback-submit')?.click();
      }
    });
        // Alternância de botões conforme aba
    const tabsEl = document.getElementById('pv-auth-tabs');
    tabsEl?.addEventListener('shown.bs.tab', (ev)=>{
      const targetId = ev.target?.getAttribute('data-bs-target');
      const isSignup = targetId === '#pane-signup';
      document.getElementById('pv-login-submit')?.classList.toggle('d-none', isSignup);
      document.getElementById('pv-signup-submit')?.classList.toggle('d-none', !isSignup);
    });

    // Login submit
    document.getElementById('pv-login-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('pv-login-email').value.trim();
      const password = document.getElementById('pv-login-password').value;
      const errEl = document.getElementById('pv-login-error');
      errEl.classList.add('d-none'); errEl.textContent='';
      try {
        const backendUrl = getBackendUrl();
        const r = await fetch(backendUrl + '/api/login.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ email, password })
        });
        const j = await r.json().catch(()=>null);
        if (!r.ok || !j || !j.success) throw new Error((j&&j.message)||'E-mail ou senha inválidos.');
        const nameFromEmail = (j.user && j.user.name) || String(email).split('@')[0];
        localStorage.setItem('pv_user', JSON.stringify({
          email: (j.user && j.user.email) || email,
          name: nameFromEmail,
          login_time: Date.now()
        }));
        try { window.pvNotify?.({ title:'Bem-vindo, '+nameFromEmail+'!', message:'Login realizado com sucesso.', type:'success'}); } catch {}
        if (bsModal) bsModal.hide();
        try { typeof renderHeader === 'function' && renderHeader(); } catch {}
      } catch (err) {
        errEl.textContent = (err && err.message) || 'Falha no login.';
        errEl.classList.remove('d-none');
      }
    });

    // Signup submit
    document.getElementById('pv-signup-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = document.getElementById('pv-signup-name').value.trim();
      const email = document.getElementById('pv-signup-email').value.trim();
      const password = document.getElementById('pv-signup-password').value;
      const passwordConfirm = document.getElementById('pv-signup-password-confirm').value;
      const errEl = document.getElementById('pv-signup-error');
      errEl.classList.add('d-none'); errEl.textContent='';

      // Validação de confirmação de senha
      if (password !== passwordConfirm) {
        errEl.textContent = 'As senhas não coincidem. Verifique e tente novamente.';
        errEl.classList.remove('d-none');
        return;
      }

      // Validação de senha mais flexível (mínimo 6 caracteres)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
      if (!passwordRegex.test(password)) {
        errEl.textContent = 'A senha deve ter no mínimo 6 caracteres, com ao menos 1 maiúscula, 1 minúscula, 1 número e 1 símbolo.';
        errEl.classList.remove('d-none');
        return;
      }
      try {
        const backendUrl = getBackendUrl();
        const r = await fetch(backendUrl + '/api/register.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ name, email, password })
        });
        const j = await r.json().catch(()=>null);
        if (!r.ok || !j || !j.success) throw new Error((j&&j.message)||'Erro ao registrar.');
        // Após criar conta, já efetua login automático
        try {
          const lr = await fetch(backendUrl + '/api/login.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
            body: JSON.stringify({ email, password })
          });
          const lj = await lr.json().catch(()=>null);
          if (!lr.ok || !lj || !lj.success) throw new Error('Conta criada, mas falhou o login automático. Faça login.');
          localStorage.setItem('pv_user', JSON.stringify({
            email: (lj.user && lj.user.email) || email,
            name: name || (lj.user && lj.user.name) || email.split('@')[0],
            login_time: Date.now()
          }));
        } catch(e) {
          // fallback: apenas fecha modal
        }
        if (bsModal) bsModal.hide();
        try { typeof renderHeader === 'function' && renderHeader(); } catch {}
        try { window.pvNotify?.({ title:'Bem-vindo!', message:'Conta criada com sucesso.', type:'success'}); } catch {}
      } catch (err) {
        errEl.textContent = (err && err.message) || 'Falha ao criar conta.';
        errEl.classList.remove('d-none');
      }
    });

    // Login com Google dentro da modal
    try {
      // injeta o callback se ainda não estiver disponível
      if (typeof window.handleCredentialResponse !== 'function') {
        const gcb = document.createElement('script');
        gcb.src = 'js/google-login.js';
        gcb.defer = true;
        document.body.appendChild(gcb);
      }
      // carrega script Google Identity Services
      if (!document.getElementById('google-identity-script')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true; script.defer = true; script.id = 'google-identity-script';
        document.body.appendChild(script);
      }
  const mountGoogleBtn = () => {
        const div = document.getElementById('pv-google-login-btn');
        if (!div) return;
        if (window.google?.accounts?.id && typeof window.handleCredentialResponse === 'function') {
          // busca o client_id público do backend quando possível, senão usa fallback de config
          const useRender = (clientId) => {
            try {
              window.google.accounts.id.initialize({ client_id: clientId, callback: window.handleCredentialResponse });
              window.google.accounts.id.renderButton(div, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill' });
            } catch {}
          };
          
          const backendUrl = getBackendUrl();
          const configUrl = backendUrl + '/api/public_config.php';
          
          fetch(configUrl, { credentials: 'same-origin' })
            .then(r => r.ok ? r.json() : null)
            .then(j => {
              const cid = (j && j.googleClientId) ? j.googleClientId : '177566502277-f7daeto382c02i1i7bte3gnkenvuku8h.apps.googleusercontent.com';
              useRender(cid);
            })
            .catch(()=> useRender('177566502277-f7daeto382c02i1i7bte3gnkenvuku8h.apps.googleusercontent.com'));
        } else {
          setTimeout(mountGoogleBtn, 200);
        }
      };
      mountGoogleBtn();
    } catch {}

    // Link de atalho "Criar conta" abre a aba de cadastro
    try {
      const openSignup = () => {
        const tabBtn = document.getElementById('tab-signup');
        if (tabBtn) {
          if (window.bootstrap?.Tab) {
            const inst = window.bootstrap.Tab.getOrCreateInstance(tabBtn);
            inst.show();
          } else {
            // fallback simples de tabs
            document.getElementById('pane-login')?.classList.remove('show','active');
            document.getElementById('pane-signup')?.classList.add('show','active');
          }
        }
      };
      document.getElementById('pv-open-signup')?.addEventListener('click', (e)=>{ e.preventDefault(); openSignup(); });
      window.openSignupModal = function(){
        window.openLoginModal?.();
        setTimeout(openSignup, 50);
      };
    } catch {}
  }

  window.openLoginModal = function(){
    ensureModal();
    const modal = document.getElementById('pv-login-modal');
    try {
      const inst = window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(modal, { backdrop:'static' }) : null;
      if (inst) {
        modal.addEventListener('shown.bs.modal', ()=>{ try{ document.getElementById('pv-login-email')?.focus(); }catch{} }, { once:true });
        inst.show();
        return;
      }
    } catch {}
    // fallback simples
    modal.style.display = 'block';
    setTimeout(()=>{ document.getElementById('pv-login-email')?.focus(); }, 30);
  };

  function autoOpenIfRequested(){
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('login') === '1') {
        setTimeout(()=> {
          try { window.openLoginModal && window.openLoginModal(); } finally {
            // limpar o parâmetro para evitar reabertura em recarregamento
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('login');
              window.history.replaceState({}, document.title, url.toString());
            } catch {}
          }
        }, 50);
      }
    } catch {}
  }

  // Função para logout seguro
  async function secureLogout(reason = 'manual') {
    try {
      console.log('[Auth] Iniciando logout seguro:', reason);

      // Chama endpoint de logout
      const response = await fetch('/server/api/logout.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ reason })
      });

      // Remove dados locais independentemente da resposta
      try {
        localStorage.removeItem('pv_user');
        sessionStorage.clear();
      } catch (e) {
        console.warn('[Auth] Erro ao limpar dados locais:', e);
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.redirect) {
          window.location.href = data.redirect;
          return;
        }
      }

      // Fallback se o endpoint não funcionar
      window.location.href = 'index.html?logout=1&reason=' + encodeURIComponent(reason);

    } catch (error) {
      console.error('[Auth] Erro no logout:', error);
      // Remove dados locais mesmo em caso de erro
      try {
        localStorage.removeItem('pv_user');
        sessionStorage.clear();
      } catch {}

      // Redireciona mesmo em caso de erro
      window.location.href = 'index.html?logout=1&reason=error';
    }
  }

  // Expõe função de logout seguro globalmente
  window.secureLogout = secureLogout;

  // Auto-abrir quando a URL tiver ?login=1 (tanto no DOMContentLoaded quanto imediatamente se já carregado)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoOpenIfRequested);
  } else {
    autoOpenIfRequested();
  }

})();
