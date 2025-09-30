// js/config/api-endpoints.js
// Configuração centralizada de endpoints de API

(function() {
  // Util: calcula a raiz do projeto (suporta subpastas)
  function getRootPath(){
    const raw = (window.location.pathname || '');
    const lower = raw.toLowerCase();
    const pos = lower.indexOf('/html/');
    // termina com '/'
    return pos >= 0 ? raw.slice(0, pos + 1) : raw.slice(0, raw.lastIndexOf('/') + 1);
  }

  // Detecta ambiente e configura base URL
  function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Desenvolvimento local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Se rodando na porta 8081 (frontend dev), backend está na 8080
      if (port === '8081') {
        return 'http://localhost:8080/';
      }
      // Caso contrário, mesmo servidor, base relativa à raiz do projeto
      return getRootPath();
    }

    // Produção - APIs no mesmo domínio, respeitando subpasta
    return getRootPath();
  }

  function join(base, path){
    if (!base) return path;
    if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1);
    if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
    return base + path;
  }

  // Configuração de endpoints (BASE sempre com barra final)
  const API_BASE = getApiBaseUrl();

  window.ProdutivusAPI = {
    base: API_BASE,
    endpoints: {
      // Auth
  publicConfig: join(API_BASE, 'server/api/public_config.php'),
  googleLogin: join(API_BASE, 'server/api/google_login.php'),
  googleFallback: join(API_BASE, 'server/api/google_fallback.php'),
  login: join(API_BASE, 'server/api/login.php'),
  register: join(API_BASE, 'server/api/register.php'),
  account: join(API_BASE, 'server/api/account.php'),

      // Tasks
  tasks: join(API_BASE, 'server/api/tasks.php'),

      // Subjects & Courses
  subjects: join(API_BASE, 'server/api/subjects.php'),
  courses: join(API_BASE, 'server/api/courses.php'),
  studyPlan: join(API_BASE, 'server/api/study_plan.php'),

      // Sheets
  sheets: join(API_BASE, 'server/api/sheets.php'),

      // Assistant
  assistant: join(API_BASE, 'server/api/assistant.php'),

      // Other
  oauthConfig: join(API_BASE, 'server/api/oauth_config.php'),
  notebooks: join(API_BASE, 'server/api/notebooks.php'),
  notebookPages: join(API_BASE, 'server/api/notebook_pages.php')
    }
  };

  try {
    const env = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'development' : 'production';
    console.log('[API Config] Base URL:', API_BASE || 'relative');
    console.log('[API Config] Environment:', env);
  } catch {}
})();
