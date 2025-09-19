// Normaliza botões para padrão Bootstrap
export function normalizeButtons(root = document) {
    const EXCLUDE_CLASS = ['nav-btn','btn-ghost','mm-btn','map-tab','dropdown-toggle'];
    const btns = root.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn, .btn');
    btns.forEach(el => {
        if (EXCLUDE_CLASS.some(cls => el.classList.contains(cls))) return;
        el.classList.add('btn', 'btn-primary');
    });
}
