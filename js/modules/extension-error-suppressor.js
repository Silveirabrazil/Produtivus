/**
 * Supressor de erros de extensões do navegador
 * Previne que erros de extensões apareçam no console da aplicação
 */

(function() {
    'use strict';

    // Lista de padrões de erro a serem suprimidos
    const SUPPRESSED_ERROR_PATTERNS = [
        /message port closed/i,
        /runtime\.lastError/i,
        /extension:\/\//i,
        /chrome-extension:\/\//i,
        /moz-extension:\/\//i,
        /Non-Error promise rejection captured/i,
        /ResizeObserver loop limit exceeded/i
    ];

    // Função para verificar se um erro deve ser suprimido
    function shouldSuppressError(message, filename, stack) {
        if (!message && !filename && !stack) return false;

        const combinedText = `${message || ''} ${filename || ''} ${stack || ''}`;
        return SUPPRESSED_ERROR_PATTERNS.some(pattern => pattern.test(combinedText));
    }

    // Interceptar e filtrar erros globais
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, filename, lineno, colno, error) {
        if (shouldSuppressError(message, filename, error?.stack)) {
            return true; // Suprimir erro
        }

        // Chamar handler original se existir
        if (originalErrorHandler) {
            return originalErrorHandler.call(this, message, filename, lineno, colno, error);
        }

        return false; // Permitir comportamento padrão
    };

    // Interceptar promises rejeitadas
    const originalUnhandledRejection = window.onunhandledrejection;
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        const message = reason?.message || reason?.toString() || '';
        const stack = reason?.stack || '';

        if (shouldSuppressError(message, '', stack)) {
            event.preventDefault();
            return;
        }

        // Chamar handler original se existir
        if (originalUnhandledRejection) {
            originalUnhandledRejection.call(this, event);
        }
    });

    // Console warning para modo debug
    if (window.APP_CONFIG?.DEBUG_MODE) {
        console.info('[ExtensionErrorSuppressor] Filtro de erros de extensões ativado');
    }

})();
