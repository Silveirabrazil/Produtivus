// js/modules/route-guard.js
// Monitor passivo de logout - complementa protect.js sem duplicar funcionalidade
(function() {
    'use strict';

    const RouteGuard = {
        config: {
            loginUrl: 'index.html?login=1',
            publicRoutes: ['/', '/index.html', '/login.html']
        },

        state: {
            isAuthenticated: null
        },

        init() {
            // Sistema passivo - apenas monitora eventos de logout
            this.bindLogoutEvents();
            console.log('[RouteGuard] Monitor passivo iniciado - sem verificações duplicadas');
        },

        bindLogoutEvents() {
            // Monitora logout em outras abas
            window.addEventListener('storage', (e) => {
                if (e.key === 'pv_user' && e.newValue === null) {
                    console.log('[RouteGuard] Logout detectado em outra aba');
                    this.handleLogout('logout_other_tab');
                }

                if (e.key === 'pv_force_logout' && e.newValue === 'true') {
                    console.log('[RouteGuard] Logout forçado detectado');
                    localStorage.removeItem('pv_force_logout');
                    this.handleLogout('force_logout');
                }
            });
        },

        isProtectedRoute() {
            const currentPath = window.location.pathname.toLowerCase();
            return !this.config.publicRoutes.some(route =>
                currentPath === route || currentPath.endsWith(route)
            );
        },

        handleLogout(reason = 'unknown') {
            console.log(`[RouteGuard] Processando logout: ${reason}`);

            this.state.isAuthenticated = false;

            // Remove dados do usuário
            try {
                localStorage.removeItem('pv_user');
            } catch {}

            // Redireciona apenas se for rota protegida
            if (this.isProtectedRoute()) {
                setTimeout(() => {
                    const redirectUrl = this.config.loginUrl + '&reason=' + encodeURIComponent(reason);
                    console.log('[RouteGuard] Redirecionando para:', redirectUrl);
                    window.location.href = redirectUrl;
                }, 100);
            }
        },

        // Função pública para forçar logout
        forceLogout(reason = 'manual') {
            localStorage.setItem('pv_force_logout', 'true');
            this.handleLogout(reason);
        }
    };

    // Inicializa de forma simples
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => RouteGuard.init());
    } else {
        RouteGuard.init();
    }

    // Expõe apenas função essencial
    window.RouteGuard = {
        forceLogout: (reason) => RouteGuard.forceLogout(reason)
    };

})();
