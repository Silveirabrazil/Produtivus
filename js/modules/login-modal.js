// js/modules/login-modal.js
// Modal de login simples que reutiliza a infraestrutura atual (/server/api/login.php)
// IMPLEMENTAÇÃO NOVA (sem Bootstrap) usando .janela + .campo
(function(){
  if (window.openLoginModal) return;

  const OWNER_EMAIL = 'silveirabrazil@gmail.com';
  let googleFallbackEnabled = false;

  function buildModalHTML(){
    return `
<div class="janela janela--compacta u-hidden" id="pv-login-modal" role="dialog" aria-modal="true" aria-labelledby="pv-login-titulo">
  <div class="janela__caixa" data-pv="login-caixa">
    <div class="janela__cabecalho">
      <h2 class="janela__titulo" id="pv-login-titulo">Acesso</h2>
      <button type="button" class="janela__fechar" id="pv-login-fechar" aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
    <div class="janela__corpo">
      <div class="login-logo">
        <img src="img/logo.png" alt="Produtivus" class="login-logo__img">
      </div>
      <div class="alternador-vistas" id="pv-alt-vistas">
        <button type="button" class="alternador-vistas__botao is-ativo" data-pv-vista="login">Entrar</button>
        <button type="button" class="alternador-vistas__botao" data-pv-vista="criar">Criar conta</button>
      </div>
      <div id="pv-login-erro" class="mensagem-erro" role="alert"></div>
      <form id="pv-login-form" class="formulario formulario--denso" autocomplete="off" novalidate>
        <div class="campo">
          <label for="pv-login-email" class="campo__rotulo">E-mail</label>
          <div class="campo__controle">
            <input type="email" id="pv-login-email" class="campo__entrada" autocomplete="username" required>
          </div>
        </div>
        <div class="campo">
          <label for="pv-login-password" class="campo__rotulo">Senha</label>
          <div class="campo__controle">
            <input type="password" id="pv-login-password" class="campo__entrada" autocomplete="current-password" required>
            <button type="button" class="campo__acao" id="toggle-login-password" aria-label="Mostrar/ocultar senha">
              <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
            </button>
          </div>
        </div>
        <div class="campo u-mt-s">
          <label class="checkbox">
            <input type="checkbox" id="pv-remember-me"> <span>Permanecer conectado</span>
          </label>
          <div class="campo__ajuda">Sessão padrão de 12 horas. Marcando esta opção, o acesso permanece neste dispositivo.</div>
        </div>
      </form>
      <div class="separador-ou">OU</div>
      <div id="pv-google-login-btn"></div>
      <div id="pv-google-fallback" class="u-hidden">
        <div class="nota-proprietario"><small>Google indisponível - proprietário</small></div>
        <div class="campo u-mb-s">
          <div class="campo__controle">
            <input type="password" id="pv-fallback-code" class="campo__entrada" placeholder="Código de fallback" autocomplete="off">
            <button type="button" class="campo__acao" id="pv-fallback-submit" aria-label="Enviar código">
              <span class="material-symbols-outlined" aria-hidden="true">key</span>
            </button>
          </div>
        </div>
      </div>
      <div id="pv-signup-area" class="u-hidden">
        <div id="pv-signup-erro" class="mensagem-erro" role="alert"></div>
        <form id="pv-signup-form" class="formulario formulario--denso" autocomplete="off" novalidate>
          <div class="campo">
            <label for="pv-signup-name" class="campo__rotulo">Nome</label>
            <div class="campo__controle">
              <input type="text" id="pv-signup-name" class="campo__entrada" autocomplete="name" required>
            </div>
          </div>
          <div class="campo">
            <label for="pv-signup-email" class="campo__rotulo">E-mail</label>
            <div class="campo__controle">
              <input type="email" id="pv-signup-email" class="campo__entrada" autocomplete="email" required>
            </div>
          </div>
          <div class="campo">
            <label for="pv-signup-password" class="campo__rotulo">Senha</label>
            <div class="campo__controle">
              <input type="password" id="pv-signup-password" class="campo__entrada" minlength="6" required>
              <button type="button" class="campo__acao" id="toggle-signup-password" aria-label="Mostrar/ocultar senha"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button>
            </div>
            <div class="campo__ajuda">Min 6 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo.</div>
          </div>
          <div class="campo">
            <label for="pv-signup-password-confirm" class="campo__rotulo">Confirmar Senha</label>
            <div class="campo__controle">
              <input type="password" id="pv-signup-password-confirm" class="campo__entrada" minlength="6" required>
              <button type="button" class="campo__acao" id="toggle-signup-password-confirm" aria-label="Mostrar/ocultar confirmação"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div class="janela__acoes" data-pv="acoes">
      <button type="button" class="botao botao--secundario" id="pv-login-cancelar">Cancelar</button>
      <button type="submit" class="botao botao--primario" form="pv-login-form" id="pv-login-submit">Entrar</button>
      <button type="submit" class="botao botao--primario u-hidden" form="pv-signup-form" id="pv-signup-submit">Criar conta</button>
    </div>
  </div>
</div>`;
  }

  function ensureModal(){
    if (document.getElementById('pv-login-modal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = buildModalHTML();
    document.body.appendChild(wrap.firstElementChild);
    wireUp();
  }

  function togglePassword(btnId, inputId){
    const btn = document.getElementById(btnId); const input = document.getElementById(inputId); const icon = btn?.querySelector('.material-symbols-outlined');
    btn?.addEventListener('click', ()=>{ if(!input) return; const isPw = input.type === 'password'; input.type = isPw ? 'text':'password'; if(icon) icon.textContent = isPw ? 'visibility_off':'visibility'; });
  }

  function showError(id,msg){ const el=document.getElementById(id); if(!el)return; el.textContent=msg||''; el.classList.toggle('is-visivel', !!msg); }

  function switchView(vista){
    const alt = document.getElementById('pv-alt-vistas');
    alt?.querySelectorAll('.alternador-vistas__botao').forEach(btn=>{
      const active = btn.getAttribute('data-pv-vista') === vista; btn.classList.toggle('is-ativo', active);
    });
    const signup = document.getElementById('pv-signup-area');
    const loginForm = document.getElementById('pv-login-form');
    const signupSubmit = document.getElementById('pv-signup-submit');
    const loginSubmit = document.getElementById('pv-login-submit');
    if (vista === 'criar') { signup?.classList.remove('u-hidden'); loginForm?.classList.add('u-hidden'); signupSubmit?.classList.remove('u-hidden'); loginSubmit?.classList.add('u-hidden'); }
    else { signup?.classList.add('u-hidden'); loginForm?.classList.remove('u-hidden'); signupSubmit?.classList.add('u-hidden'); loginSubmit?.classList.remove('u-hidden'); }
  }

  function mountGoogle(){
    try {
      // Carrega script de login Google somente uma vez
      if (typeof window.handleCredentialResponse !== 'function' && !document.querySelector('script[src$="js/google-login.js"]')) {
        const gcb=document.createElement('script'); gcb.src='js/google-login.js'; gcb.defer=true; document.body.appendChild(gcb);
      }
      if (!document.getElementById('google-identity-script')) {
        const script=document.createElement('script'); script.src='https://accounts.google.com/gsi/client'; script.async=true; script.defer=true; script.id='google-identity-script'; document.body.appendChild(script);
      }
      let attempts=0; const max=25; const mount=()=>{
        const div=document.getElementById('pv-google-login-btn'); if(!div) return;
        attempts++;
        if (window.google?.accounts?.id && typeof window.handleCredentialResponse==='function') {
          if (div.getAttribute('data-rendered')==='1') return; // já renderizado
          const configUrl = window.ProdutivusAPI ? window.ProdutivusAPI.endpoints.publicConfig : '/server/api/public_config.php';
          fetch(configUrl,{credentials:'same-origin'}).then(r=> r.ok ? r.json():Promise.reject(r.status)).then(j=> j && j.googleClientId ? j.googleClientId : '177566502277-f7daeto382c02i1i7bte3gnkenvuku8h.apps.googleusercontent.com').catch(()=> '177566502277-f7daeto382c02i1i7bte3gnkenvuku8h.apps.googleusercontent.com').then(cid=>{
            try {
              if (!window.__pvGISInitialized) { window.google.accounts.id.initialize({ client_id:cid, callback:window.handleCredentialResponse }); window.__pvGISInitialized = true; }
              // Evita múltiplos botões
              if (div.getAttribute('data-rendered')!=='1'){ window.google.accounts.id.renderButton(div,{ theme:'outline', size:'large', text:'continue_with', shape:'pill'}); div.setAttribute('data-rendered','1'); }
            } catch(e){ console.error(e); showGoogleFallback(div);} });
        } else if (attempts < max) { setTimeout(mount,200); } else { showGoogleFallback(div); }
      };
      const showGoogleFallback=(div)=>{ div.innerHTML='<div class="mensagem-info is-visivel">Login Google indisponível. Use o formulário.</div>'; };
      mount();
    } catch(e){ console.error('[Auth] Google init falhou', e); }
  }

  function checkGoogleFallback(){
    const loginEmail=document.getElementById('pv-login-email')?.value?.trim(); const fb=document.getElementById('pv-google-fallback');
    if (loginEmail && loginEmail.toLowerCase()===OWNER_EMAIL.toLowerCase()) {
      setTimeout(()=>{ const googleBtn=document.querySelector('#pv-google-login-btn > div'); if(!googleBtn || googleBtn.children.length===0){ fb?.classList.remove('u-hidden'); googleFallbackEnabled=true; } },3000);
    } else { fb?.classList.add('u-hidden'); googleFallbackEnabled=false; }
  }

  async function submitLogin(e){
    e.preventDefault(); showError('pv-login-erro','');
    const email=document.getElementById('pv-login-email').value.trim();
    const password=document.getElementById('pv-login-password').value;
    const remember=!!document.getElementById('pv-remember-me')?.checked;
    try {
      const loginUrl = window.ProdutivusAPI ? window.ProdutivusAPI.endpoints.login : '/server/api/login.php';
      const r=await fetch(loginUrl,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ email, password, remember })});
      const j=await r.json().catch(()=>null); if(!r.ok||!j||!j.success) throw new Error((j&&j.message)||'E-mail ou senha inválidos.');
  const nameFromEmail=(j.user && j.user.name) || email.split('@')[0];
  localStorage.setItem('pv_user', JSON.stringify({ email:(j.user&&j.user.email)||email, name:nameFromEmail, login_time:Date.now() }));
  try { window.pvNotify?.({ title:'Bem-vindo, '+nameFromEmail+'!', message:'Login realizado com sucesso.', type:'success'});}catch{}
  fecharModal();
  try { window.dispatchEvent(new CustomEvent('pv-auth-changed',{detail:{action:'login', via:'form'}})); } catch{}
  try { typeof renderHeader==='function' && renderHeader(true); } catch{}
  // Evita prompts do Google One Tap após login por formulário
  try { if (window.google?.accounts?.id) { try{ window.google.accounts.id.cancel(); }catch{} try{ window.google.accounts.id.disableAutoSelect(); }catch{} } } catch{}
    } catch(err){ showError('pv-login-erro', (err && err.message)||'Falha no login.'); }
  }

  async function submitSignup(e){
    e.preventDefault(); showError('pv-signup-erro','');
    const name=document.getElementById('pv-signup-name').value.trim();
    const email=document.getElementById('pv-signup-email').value.trim();
    const password=document.getElementById('pv-signup-password').value;
    const passwordConfirm=document.getElementById('pv-signup-password-confirm').value;
    if (password !== passwordConfirm) { return showError('pv-signup-erro','As senhas não coincidem.'); }
    const passwordRegex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) { return showError('pv-signup-erro','Senha fraca. Requisitos: 6+ caracteres, maiúscula, minúscula, número, símbolo.'); }
    try {
      const registerUrl = window.ProdutivusAPI ? window.ProdutivusAPI.endpoints.register : '/server/api/register.php';
      const r=await fetch(registerUrl,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ name, email, password })});
      const j=await r.json().catch(()=>null); if(!r.ok||!j||!j.success) throw new Error((j&&j.message)||'Erro ao registrar.');
      // login automático
      try { const loginUrl= window.ProdutivusAPI ? window.ProdutivusAPI.endpoints.login : '/server/api/login.php'; const lr=await fetch(loginUrl,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ email, password })}); const lj=await lr.json().catch(()=>null); if(lr.ok && lj && lj.success){ localStorage.setItem('pv_user', JSON.stringify({ email:(lj.user&&lj.user.email)||email, name:name || (lj.user&&lj.user.name) || email.split('@')[0], login_time:Date.now() })); } } catch{}
  fecharModal(); try { window.dispatchEvent(new CustomEvent('pv-auth-changed',{detail:{action:'signup'}})); } catch{}; try { typeof renderHeader==='function' && renderHeader(true); } catch{}; try { window.pvNotify?.({ title:'Bem-vindo!', message:'Conta criada com sucesso.', type:'success'});}catch{}
    } catch(err){ showError('pv-signup-erro', (err && err.message) || 'Falha ao criar conta.'); }
  }

  function fecharModal(){ const m=document.getElementById('pv-login-modal'); if(!m) return; m.classList.remove('janela--aberta'); setTimeout(()=>{ m.classList.add('u-hidden'); },220); }
  function abrirModal(){ ensureModal(); const m=document.getElementById('pv-login-modal'); if(!m)return; m.classList.remove('u-hidden'); requestAnimationFrame(()=> m.classList.add('janela--aberta')); setTimeout(()=>{ document.getElementById('pv-login-email')?.focus(); },120); }

  function wireUp(){
    togglePassword('toggle-login-password','pv-login-password');
    togglePassword('toggle-signup-password','pv-signup-password');
    togglePassword('toggle-signup-password-confirm','pv-signup-password-confirm');
    document.getElementById('pv-login-form')?.addEventListener('submit', submitLogin);
    document.getElementById('pv-signup-form')?.addEventListener('submit', submitSignup);
    document.getElementById('pv-login-cancelar')?.addEventListener('click', fecharModal);
    document.getElementById('pv-login-fechar')?.addEventListener('click', fecharModal);
    document.getElementById('pv-login-email')?.addEventListener('input', checkGoogleFallback);
    document.getElementById('pv-login-email')?.addEventListener('blur', checkGoogleFallback);
    document.getElementById('pv-fallback-submit')?.addEventListener('click', async ()=>{
      const email=document.getElementById('pv-login-email')?.value?.trim(); const code=document.getElementById('pv-fallback-code')?.value?.trim(); if(!email||!code) return showError('pv-login-erro','Informe email e código'); if(email.toLowerCase()!==OWNER_EMAIL.toLowerCase()) return showError('pv-login-erro','Apenas proprietário');
      try { const fallbackUrl= window.ProdutivusAPI ? window.ProdutivusAPI.endpoints.googleFallback : '/server/api/google_fallback.php'; const resp=await fetch(fallbackUrl,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({ email, fallback_code:code })}); const data=await resp.json(); if(data.success){ localStorage.setItem('pv_user', JSON.stringify({ email:data.user.email, name:data.user.name, login_time:Date.now(), login_method:'google_fallback' })); fecharModal(); try { window.pvNotify?.({ title:'Bem-vindo!', message:'Login via fallback realizado.', type:'success'});}catch{} try { typeof renderHeader==='function' && renderHeader(); } catch{} } else { showError('pv-login-erro', data.message||'Código inválido'); } } catch{ showError('pv-login-erro','Erro de rede'); }
    });
    document.getElementById('pv-fallback-code')?.addEventListener('keypress', e=>{ if(e.key==='Enter'){ document.getElementById('pv-fallback-submit')?.click(); }});
    document.getElementById('pv-alt-vistas')?.addEventListener('click', e=>{ const btn=e.target.closest('[data-pv-vista]'); if(!btn)return; switchView(btn.getAttribute('data-pv-vista')); });
    mountGoogle();
  }

  window.openLoginModal = abrirModal;
  window.openSignupModal = function(){ abrirModal(); setTimeout(()=> switchView('criar'), 60); };

  function autoOpen(){ try { const p=new URLSearchParams(location.search); if(p.get('login')==='1'){ setTimeout(()=>{ abrirModal(); const url=new URL(location.href); url.searchParams.delete('login'); history.replaceState({},document.title,url.toString()); },50);} } catch{} }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoOpen); else autoOpen();

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
  // Bloco removido: antes havia referência a autoOpenIfRequested inexistente.
  // A lógica de auto abertura já é tratada acima pela função autoOpen.

})();
