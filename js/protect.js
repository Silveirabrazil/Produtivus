// js/protect.js
// Proteção de página: exige sessão PHP válida; localStorage é apenas auxiliar para UI
(function() {
  const path = (window.location && window.location.pathname) || '';
  const lower = path.toLowerCase();
  // Público apenas: raiz ("/" ou "/index.html") e "/login.html"
  const isPublic = lower === '/' || lower === '/index.html' || lower === '/login.html';
  const REDIR_KEY = 'pv_last_redirect';
  const SESSION_CACHE_KEY = 'pv_session_cache';
  const SESSION_CACHE_DURATION = 120000; // 2 minutos de cache

  // Flag de depuração: permite desativar a proteção via ?noprotect=1
  let debugNoProtect = false;
  let sessionCheckTimer = null;
  let isSessionValid = null; // null = desconhecido, true = válida, false = inválida

  try {
    const p = new URLSearchParams(window.location.search);
    debugNoProtect = p.get('noprotect') === '1' || p.get('pv_noprotect') === '1';
  } catch {}

  // Verifica cache de sessão válido
  function hasValidSessionCache() {
    try {
      const cache = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || 'null');
      if (cache && cache.valid && cache.timestamp) {
        const age = Date.now() - cache.timestamp;
        if (age < SESSION_CACHE_DURATION) {
          if (debugNoProtect || window.location.search.includes('debug=1')) {
            console.log('[Auth] Cache de sessão válido, não verificando novamente');
          }
          return true;
        }
      }
    } catch {}
    return false;
  }

  // Salva cache de sessão
  function setSessionCache(isValid) {
    try {
      const cache = {
        valid: isValid,
        timestamp: Date.now()
      };
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }

  // Limpa cache de sessão
  function clearSessionCache() {
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {}
  }

  // Função para redirecionar para login
  function redirectToLogin(reason = 'session_expired') {
    if (isPublic) return;

    console.log(`[Auth] Redirecionando para login: ${reason}`);
    clearSessionCache();

    try {
      const now = Date.now();
      const last = parseInt(sessionStorage.getItem(REDIR_KEY) || '0', 10) || 0;
      if (now - last < 3000) return; // evita loop de redirecionamento (3s)
      sessionStorage.setItem(REDIR_KEY, String(now));

      // Remove dados de usuário do localStorage
      try {
        localStorage.removeItem('pv_user');
      } catch {}

    } catch {}

    window.location.href = 'index.html?login=1&reason=' + encodeURIComponent(reason);
  }

  async function ensureSession(force = false) {
    // Se não é força e tem cache válido, não verifica
    if (!force && hasValidSessionCache()) {
      isSessionValid = true;
      return true;
    }

    try {
      const res = await fetch('/server/api/account.php', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (res.status === 401) {
        isSessionValid = false;
        clearSessionCache();
        if (!isPublic) {
          redirectToLogin('not_authenticated');
        }
        return false;
      }

      if (res.ok) {
        const j = await res.json().catch(() => null);
        if (j && j.success && j.user) {
          isSessionValid = true;
          setSessionCache(true);

          try {
            const cur = JSON.parse(localStorage.getItem('pv_user') || '{}');
            const next = { ...cur, name: j.user.name || cur.name, email: j.user.email || cur.email };
            localStorage.setItem('pv_user', JSON.stringify(next));
          } catch {}
          return true;
        } else {
          isSessionValid = false;
          clearSessionCache();
          if (!isPublic) {
            redirectToLogin('invalid_session_data');
          }
          return false;
        }
      } else {
        // Erro de servidor - não redirecionar imediatamente, manter estado atual
        console.warn('[Auth] Erro no servidor ao verificar sessão:', res.status);
        return null; // Mantém estado atual
      }
    } catch (e) {
      // Sem conectividade ou erro de rede - não bloquear
      console.warn('[Auth] Erro de conectividade ao verificar sessão:', e.message);
      return null; // Mantém estado atual
    }
  }

  // Função para verificação periódica mais conservadora (apenas se necessário)
  function startPeriodicSessionCheck() {
    if (isPublic || debugNoProtect) return;

    // Verificação mais espaçada (5 minutos)
    sessionCheckTimer = setInterval(async () => {
      // Só verifica se não há cache válido
      if (!hasValidSessionCache()) {
        if (debugNoProtect || window.location.search.includes('debug=1')) {
          console.log('[Auth] Verificação periódica de sessão');
        }
        await ensureSession(true);
      }
    }, 300000); // 5 minutos

    if (debugNoProtect || window.location.search.includes('debug=1')) {
      console.log('[Auth] Verificação periódica iniciada (5 min)');
    }
  }

  // Event listeners mais conservadores
  window.addEventListener('storage', (e) => {
    if (e.key === 'pv_user' && e.newValue === null) {
      // localStorage foi limpo, provavelmente logout
      clearSessionCache();
      isSessionValid = false;
      redirectToLogin('logout_detected');
    }
  });

  // Detecta quando a página se torna visível após muito tempo
  let lastVisibilityCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isPublic && !debugNoProtect) {
      const now = Date.now();
      // Só verifica se passou mais de 10 minutos desde a última verificação
      if (now - lastVisibilityCheck > 600000) {
        console.log('[Auth] Página visível após longo tempo - verificando sessão');
        ensureSession(true);
        lastVisibilityCheck = now;
      }
    }
  });

  // Intercepta chamadas AJAX de forma mais conservadora
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch(...args).then(response => {
      if (response.status === 401 && !isPublic) {
        clearSessionCache();
        isSessionValid = false;
        // Só redireciona se não tem cache válido recente
        if (!hasValidSessionCache()) {
          redirectToLogin('api_401');
        }
      }
      return response;
    });
  };

  // Verificação inicial apenas para páginas privadas SEM cache
  if (!isPublic && !debugNoProtect) {
    // Se já tem cache válido, não precisa verificar
    if (hasValidSessionCache()) {
      if (debugNoProtect || window.location.search.includes('debug=1')) {
        console.log('[Auth] Cache de sessão válido encontrado');
      }
      isSessionValid = true;
      startPeriodicSessionCheck();
    } else {
      if (debugNoProtect || window.location.search.includes('debug=1')) {
        console.log('[Auth] Verificando sessão inicial');
      }
      ensureSession(false).then(result => {
        if (result !== false) {
          startPeriodicSessionCheck();
        }
      });
    }
  }

  // Cleanup ao sair da página
  window.addEventListener('beforeunload', () => {
    if (sessionCheckTimer) clearInterval(sessionCheckTimer);
  });

})();
