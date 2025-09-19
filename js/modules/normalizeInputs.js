// Normaliza inputs para padrão Bootstrap
export function normalizeInputs(root = document) {
    const inputs = root.querySelectorAll('input, textarea, select');
    inputs.forEach(inp => {
        inp.classList.add('form-control');
    });
}
