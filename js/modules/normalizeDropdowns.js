// Normaliza dropdowns para padrão Bootstrap
export function normalizeDropdowns(root = document) {
    const togglers = root.querySelectorAll('[data-bs-toggle="dropdown"], [data-toggle="dropdown"], .dropdown > .dropdown-toggle');
    togglers.forEach(tg => {
        if (tg.getAttribute('data-toggle') === 'dropdown') {
            tg.setAttribute('data-bs-toggle', 'dropdown');
        }
        tg.classList.add('btn', 'btn-secondary', 'dropdown-toggle');
    });
}
