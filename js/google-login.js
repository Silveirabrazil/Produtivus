// js/google-login.js

// Sistema expandido de autenticação Google com suporte a Calendar API
class GoogleAuth {
  constructor() {
    this.gapi = null;
    this.authInstance = null;
    this.isInitialized = false;
    this.calendarAttachInProgress = false;
  }

  // Inicialização para One Tap (login básico)
  async initOneTap() {
    // Manter compatibilidade com sistema atual
    return true;
  }

  // Inicialização para OAuth com scopes (Calendar API)
  async initOAuth() {
    try {
      // Carregar Google API JavaScript client
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      await new Promise((resolve) => {
        // carrega auth2; alguns ambientes requerem 'client:auth2'
        try { window.gapi.load('auth2', resolve); }
        catch { try { window.gapi.load('client:auth2', resolve); } catch { resolve(); } }
      });

      // Configurar OAuth com scopes do Calendar
      const clientId = await this.getClientId();
      if (!clientId) {
        throw new Error('Client ID ausente');
      }
      this.authInstance = await window.gapi.auth2.init({
        client_id: clientId,
        scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
      });

      this.isInitialized = true;
      console.info('[GoogleAuth] OAuth inicializado com scopes de Calendar');
      return true;
    } catch (error) {
      console.warn('[GoogleAuth] Erro ao inicializar OAuth:', error && (error.message || error));
      return false;
    }
  }

  // Carregar Google API dinamicamente
  async loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Carregar Google Identity Services (GIS) dinamicamente
  async ensureIdentityScript() {
    return new Promise((resolve, reject) => {
      try {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          resolve();
          return;
        }
        if (document.getElementById('google-identity-script')) {
          const check = () => (window.google && window.google.accounts && window.google.accounts.oauth2) ? resolve() : setTimeout(check, 100);
          check();
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true; s.defer = true; s.id = 'google-identity-script';
        s.onload = () => {
          const check = () => (window.google && window.google.accounts && window.google.accounts.oauth2) ? resolve() : setTimeout(check, 100);
          check();
        };
        s.onerror = reject;
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  }

  // Obter Client ID do servidor
  async getClientId() {
    try {
      const response = await fetch('/server/api/oauth_config.php');
      const data = await response.json();
      return data.googleClientId || '';
    } catch (error) {
      console.error('[GoogleAuth] Erro ao obter Client ID:', error);
      return '';
    }
  }

  // Login com permissões de Calendar
  async signInWithCalendar() {
    try {
      if (this.calendarAttachInProgress) return false;
      this.calendarAttachInProgress = true;
      // Tentar primeiro via Google Identity Services (token client)
      try {
        await this.ensureIdentityScript();
        const clientId = await this.getClientId();
        if (!clientId) throw new Error('Client ID ausente');

        const tokenResp = await new Promise((resolve, reject) => {
          try {
            const tc = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'https://www.googleapis.com/auth/calendar.readonly',
              callback: (resp) => {
                if (resp && resp.access_token) resolve(resp);
                else reject(new Error(resp && resp.error ? resp.error : 'sem access_token'));
              }
            });
            // Forçar consentimento na primeira vez
            tc.requestAccessToken({ prompt: 'consent' });
          } catch (e) { reject(e); }
        });

        const accessToken = tokenResp.access_token;
        if (!accessToken) throw new Error('Token vazio');

        // Atualiza estado local do usuário
        try {
          const cur = JSON.parse(localStorage.getItem('pv_user') || '{}');
          const user = { ...cur, calendar_access: true };
          localStorage.setItem('pv_user', JSON.stringify(user));
        } catch {}
        localStorage.setItem('pv_google_calendar_token', accessToken);

            // Redirecionar sem notificações
        window.location.href = 'index.html';
        return true;
      } catch (gisErr) {
        console.warn('[GoogleAuth] GIS token client falhou, tentando fallback gapi.auth2:', gisErr && (gisErr.message || gisErr));
      }

      // Fallback: gapi.auth2 (legado)
      if (!this.isInitialized) {
        const initialized = await this.initOAuth();
        if (!initialized) {
          throw new Error('Falha ao inicializar OAuth');
        }
      }

      const authResult = await this.authInstance.signIn();
      const profile = authResult.getBasicProfile();
      const accessToken = authResult.getAuthResponse().access_token;

      // Persistência local
      try {
        const cur = JSON.parse(localStorage.getItem('pv_user') || '{}');
        const user = { ...cur, name: cur.name || profile.getName(), email: cur.email || profile.getEmail(), calendar_access: true };
        localStorage.setItem('pv_user', JSON.stringify(user));
      } catch {}
      localStorage.setItem('pv_google_calendar_token', accessToken);

          // Redirecionar sem notificações
      window.location.href = 'index.html';
      return true;
    } catch (error) {
      console.warn('[GoogleAuth] Erro no login com Calendar:', error && (error.message || error));
      // Propaga para o chamador decidir seguir sem calendário
      throw error;
    }
    finally {
      this.calendarAttachInProgress = false;
    }
  }
}

// Instância global
window.googleAuth = new GoogleAuth();

// Função legacy para compatibilidade (One Tap)
let __pvLoginInProgress = false;
function handleCredentialResponse(response) {
  // Evita reentrâncias e duplos disparos
  if (__pvLoginInProgress) return;
  __pvLoginInProgress = true;

  // Token JWT do Google
  const idToken = response.credential;

  // Detecta URL do backend automaticamente
  const getBackendUrl = () => {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;

    // *** CONFIGURAÇÃO DE PRODUÇÃO ***
    // Em produção, as APIs estão no mesmo domínio (URLs relativas)
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return ''; // URL relativa - mesmo domínio
    }    // Se estamos na porta 8081 (frontend), o backend é na 8080
    if (currentPort === '8081') {
      return `http://${currentHost}:8080`;
    }
    // Caso contrário, assume que está no mesmo servidor
    return '';
  };

  const loginUrl = window.ProdutivusAPI ? window.ProdutivusAPI.endpoints.googleLogin : '/server/api/google_login.php';

  // Envia para o backend validar e autenticar
  fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id_token: idToken })
  })
    .then(r => {
      if (!r.ok) {
        throw new Error(`Login API returned ${r.status}: ${r.statusText}`);
      }
      return r.json();
    })
    .then(async (data) => {
      if (data.success) {
        // Salva usuário no localStorage antes de redirecionar (com nome se disponível)
        const user = data.user || { email: data.email || '' };
        if (!user.name && user.email) { user.name = String(user.email).split('@')[0]; }
        try {
          localStorage.setItem('pv_user', JSON.stringify({
            email: user.email,
            name: user.name,
            login_time: Date.now(),
            login_method: 'google'
          }));
        } catch {}

        // Fecha a modal custom se estiver aberta
        try {
          const modal = document.getElementById('pv-login-modal');
          if (modal) { modal.classList.remove('janela--aberta'); setTimeout(()=>{ modal.style.display='none'; }, 200); }
        } catch {}

        // Atualiza o header para mostrar usuário logado
        try { window.dispatchEvent(new CustomEvent('pv-auth-changed', { detail:{ action:'login', via:'google' } })); } catch {}
        try { typeof renderHeader==='function' && renderHeader(true); } catch {}

        // Notificação de sucesso
        try {
          window.pvNotify?.({
            title: 'Bem-vindo, ' + user.name + '!',
            message: 'Login com Google realizado com sucesso.',
            type: 'success'
          });
        } catch {}

        // Não anexar Google Calendar automaticamente para evitar segundo fluxo de login.
        // O usuário poderá conectar depois nas configurações/calendário.
        try { window.pvNotify?.({ title:'Login feito', message:'Você pode conectar o Google Calendar depois nas configurações.', type:'info', silent:true }); } catch {}

        // Evita prompts residuais do One Tap e auto seleção após login
        try {
          if (window.google?.accounts?.id) {
            try { window.google.accounts.id.cancel(); } catch {}
            try { window.google.accounts.id.disableAutoSelect(); } catch {}
          }
        } catch {}

        // Para garantir que a sessão do servidor seja reconhecida em todas as páginas,
        // faça um redirecionamento único para a home.
        window.location.href = 'index.html';
      } else {
        // Mostra erro se houver
        console.error('[GoogleAuth] Login falhou:', data.message || 'Erro desconhecido');
        try {
          const errEl = document.getElementById('pv-login-error');
          if (errEl) {
            errEl.textContent = data.message || 'Falha no login com Google';
            errEl.classList.remove('d-none');
          }
        } catch {}
    __pvLoginInProgress = false;
      }
    })
    .catch(error => {
      console.error('[GoogleAuth] Erro na requisição:', error);

      // Mostra erro mais específico para o usuário
      try {
        const errEl = document.getElementById('pv-login-error');
        if (errEl) {
          let errorMessage = 'Erro de conexão com o servidor';

          if (error.message.includes('404')) {
            errorMessage = 'Serviço de login não configurado no servidor';
          } else if (error.message.includes('500')) {
            errorMessage = 'Erro interno do servidor';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Problema de conectividade';
          }

          errEl.textContent = errorMessage;
          errEl.classList.remove('d-none');
        }
      } catch {}

      __pvLoginInProgress = false;
    });
}
