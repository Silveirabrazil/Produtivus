/**
 * Sistema de tratamento de erros global para Produtivus
 * Previne quebras da aplicação e fornece feedback útil
 */

class ErrorHandler {
  constructor() {
    this.setupGlobalHandlers();
    this.apiErrorCount = 0;
    this.maxApiErrors = 5;
  }

  setupGlobalHandlers() {
    // Captura erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      // Suprimir erros de extensões do Chrome que não afetam a funcionalidade
      if (event.message?.includes('message port closed') ||
          event.message?.includes('runtime.lastError') ||
          event.filename?.includes('extension://')) {
        event.preventDefault();
        return;
      }

      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });

    // Captura promises rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      // Suprimir erros de extensões e APIs externas
      if (event.reason?.message?.includes('message port closed') ||
          event.reason?.message?.includes('runtime.lastError') ||
          event.reason?.stack?.includes('extension://')) {
        event.preventDefault();
        return;
      }

      this.handleError({
        type: 'promise',
        message: event.reason?.message || 'Promise rejeitada',
        stack: event.reason?.stack
      });
      event.preventDefault(); // Evita log no console
    });
  }

  handleError(errorInfo) {
    console.error('🚨 Erro capturado:', errorInfo);

    // Log para servidor (opcional)
    this.logToServer(errorInfo);

    // Mostrar notificação amigável ao usuário
    this.showUserNotification(errorInfo);
  }

  async logToServer(errorInfo) {
    try {
      await fetch('/server/api/log_error.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorInfo,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
        credentials: 'same-origin'
      });
    } catch (e) {
      // Falha silenciosa no log - não queremos erro no error handler
    }
  }

  showUserNotification(errorInfo) {
    // Usar sistema de toast se disponível
    if (window.pvShowToast) {
      let message = 'Ops! Algo deu errado.';

      if (errorInfo.type === 'network') {
        message = 'Problema de conexão. Tente novamente.';
      } else if (errorInfo.type === 'api') {
        message = 'Erro no servidor. Tente novamente em alguns segundos.';
      }

      window.pvShowToast(message, {
        background: '#F84449',
        duration: 5000
      });
    }
  }

  // Wrapper para chamadas de API com retry automático
  async safeApiCall(apiCall, options = {}) {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      fallback = null,
      endpoint = 'unknown'
    } = options;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        const result = await apiCall();
        const duration = performance.now() - startTime;

        // Log sucesso
        this.logApiMetrics(endpoint, duration, true);

        // Reset contador de erros em sucesso
        this.apiErrorCount = 0;

        return result;
      } catch (error) {
        this.apiErrorCount++;
        const duration = performance.now() - (performance.now() - 1000);

        // Log erro
        this.logApiMetrics(endpoint, duration, false);

        this.handleError({
          type: 'api',
          message: error.message,
          endpoint,
          attempt: attempt + 1,
          stack: error.stack
        });

        // Se é a última tentativa ou muitos erros consecutivos
        if (attempt === maxRetries || this.apiErrorCount >= this.maxApiErrors) {
          if (fallback !== null) {
            return fallback;
          }
          throw error;
        }

        // Esperar antes do retry
        await this.delay(retryDelay * (attempt + 1));
      }
    }
  }

  logApiMetrics(endpoint, duration, success) {
    // Enviar métricas se endpoint disponível
    if (typeof window.Analytics !== 'undefined') {
      window.Analytics.trackApiCall(endpoint, duration, success);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Wrapper para operações críticas
  async safeExecute(operation, fallbackAction = null) {
    try {
      return await operation();
    } catch (error) {
      this.handleError({
        type: 'operation',
        message: error.message,
        stack: error.stack
      });

      if (fallbackAction) {
        try {
          return await fallbackAction();
        } catch (fallbackError) {
          this.handleError({
            type: 'fallback',
            message: fallbackError.message,
            stack: fallbackError.stack
          });
        }
      }

      return null;
    }
  }
}

// Inicializar globalmente
window.ErrorHandler = new ErrorHandler();

// Exportar funções helper
window.safeApiCall = (apiCall, options) => window.ErrorHandler.safeApiCall(apiCall, options);
window.safeExecute = (operation, fallback) => window.ErrorHandler.safeExecute(operation, fallback);

// Log apenas em modo debug
if (window.location.search.includes('debug=1')) {
    console.log('✅ Error Handler inicializado');
}
