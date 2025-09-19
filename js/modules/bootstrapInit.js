// Inicializa componentes JS do Bootstrap
export function bootstrapInit() {
    if (window.bootstrap) {
        // Inicializa tooltips
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });
        // Inicializa popovers
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
            new bootstrap.Popover(el);
        });
        // Inicializa modais
        document.querySelectorAll('.modal').forEach(el => {
            new bootstrap.Modal(el);
        });
        // Inicializa dropdowns
        document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
            new bootstrap.Dropdown(el);
        });
    }
}
