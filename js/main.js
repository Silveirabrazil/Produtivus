// js/main.js
// Detecção simples de recarregamentos consecutivos e oferta de bypass (?noprotect=1) na home
(function(){
    try {
        const p = (location.pathname||'').toLowerCase();
        if (p === '/' || p.endsWith('/index.html') || p.endsWith('index.html')) {
            const KEY = 'pv_loop_info';
            const now = Date.now();
            let info = null;
            try { info = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { info = null; }
            if (!info || typeof info !== 'object' || !info.start || (now - info.start) > 10000) {
                info = { start: now, count: 0 };
            }
            info.count = (info.count||0) + 1;
            sessionStorage.setItem(KEY, JSON.stringify(info));
            if (info.count >= 3) {
                // Mostrar overlay oferecendo abrir com proteção desativada
                const url = new URL(window.location.href);
                url.searchParams.set('noprotect', '1');
                const o = document.createElement('div');
                o.className = 'overlay-basico';
                o.innerHTML = '<div class="caixa-basica">\
                    <h2 class="caixa-basica__titulo">Detectamos recarregamentos consecutivos</h2>\
                    <p class="caixa-basica__texto">Se isso estiver te impedindo de usar a página, tente abrir com a proteção temporariamente desativada. Isso não faz login automático, apenas desliga a checagem até você recarregar.</p>\
                    <div class="grupo-acoes">\
                        <button id="pv-close-loop-overlay" class="botao-outline">Fechar</button>\
                        <a id="pv-open-noprotect" href="'+url.toString().replace(/"/g,'&quot;')+'" class="botao-link">Abrir sem proteção</a>\
                    </div>\
                </div>';
                document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(o); });
                document.addEventListener('click', function(ev){ if ((ev.target||{}).id === 'pv-close-loop-overlay') { try { o.remove(); } catch {} } });
            }
        }
    } catch {}
})();
// Marca o body como 'preload' o quanto antes para evitar flash
try { if (document.body && document.body.classList) document.body.classList.add('preload'); } catch {}

document.addEventListener('DOMContentLoaded', function() {
    try {
        // Sinaliza que a página está pronta para revelar (fade-in)
        document.body.classList.add('is-ready');
        // Remove preload após a transição (fallback 600ms)
        setTimeout(()=>{ try { document.body.classList.remove('preload'); } catch {} }, 600);
    } catch {}
    // Flag global para aplicar configs locais (por padrão desligado para manter Bootstrap puro)
    const PV_APLICAR_CONFIGS_LOCAIS = false;
    // Inicialização das tarefas: agora é responsabilidade de js/modules/tasks/tasks.js
    // (removida chamada direta para evitar dupla execução de renderCards)
    /* Observação: a lógica de abrir o modal e submeter o formulário de
       tarefas é gerenciada em js/modules/tasks/tasks.js. Removemos o
       binding duplicado daqui para evitar envios/POSTs múltiplos ao
       submeter o modal. */

    // (Removido) Auto-mount de Cadernos para evitar conflitos; cada página monta explicitamente

    // Simple intersection observer to add .in-view to elements with .anim-fade-up
    try {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(ent => {
                if (ent.isIntersecting) ent.target.classList.add('in-view');
                else ent.target.classList.remove('in-view');
            });
        }, { threshold: 0.12 });
        document.querySelectorAll('.anim-fade-up').forEach(el => io.observe(el));
    } catch (e) { /* no-op on unsupported */ }

    // attempt to load optional page-transitions module (non-blocking)
    try {
        const disablePT = (window.PV_DISABLE_PAGE_TRANSITIONS === true) || (document.body && document.body.dataset && document.body.dataset.disablePageTransitions === 'true');
        if (!disablePT) {
            const s = document.createElement('script');
            // Determina base correta mesmo quando página está em /html/
            const p = (location.pathname||'').toLowerCase();
            const base = p.includes('/html/') ? '../' : '';
            s.src = base + 'js/modules/page-transitions.js';
            s.defer = true;
            document.body.appendChild(s);
        }
    } catch (e) { /* ignore */ }

    // Normalização automática: aplica classes Bootstrap a botões não-menu (segura)
    // Desligado por padrão para manter Bootstrap "puro".
    if (PV_APLICAR_CONFIGS_LOCAIS) try {
        const BTN_VARIANTS = ['primary','secondary','success','danger','warning','info','light','dark','link'];
        const SELECTOR = 'button, input[type="button"], input[type="submit"], input[type="reset"], a[role="button"]';
        // anchors que parecem botões mesmo sem role
        const LINK_SELECTOR = 'a.btn, a.btn-lg, a.btn-sm, a[class*="btn-"], a[data-variant], a[data-role="button"]';
        const MENU_ANCESTOR_SEL = [
            'header', 'nav', '.navbar', '.pill-nav', '.pill-actions', '.nav-list', '.user-menu', '.banner',
            // Escopos que não devem ser tocados
            '#mm-vue-app', '.mm-toolbar', '.pill-nav-main', '.nb-actions'
        ].join(',');
        const EXCLUDE_CLASS = ['nav-btn','btn-ghost','mm-btn','map-tab','dropdown-toggle'];

    const hasAnyClass = (el, names) => names.some(n => el.classList.contains(n));
        const inMenu = (el) => !!el.closest(MENU_ANCESTOR_SEL);
        const hasBtn = (el) => el.classList.contains('btn');
        const hasVariant = (el) => BTN_VARIANTS.some(v => el.classList.contains('btn-' + v) || el.classList.contains('btn-outline-' + v));
    const isEligible = (el) => el.matches(SELECTOR) && !inMenu(el) && !hasAnyClass(el, EXCLUDE_CLASS);

        const pickVariant = (el) => {
            // data-variant tem prioridade
            const dv = (el.getAttribute('data-variant') || '').toLowerCase();
            if (BTN_VARIANTS.includes(dv)) return dv;

            const c = el.className.toLowerCase();
            const txt = (el.textContent || '').trim().toLowerCase();
            const hint = c + ' ' + txt;
            if (/delete|danger|remove|trash|excluir|apagar|remover/.test(hint)) return 'danger';
            if (/success|done|confirm|ok|salvar|save|concluir/.test(hint)) return 'success';
            if (/warn|warning|caution|aten(ç|c)ao/.test(hint)) return 'warning';
            if (/info|detalhe|details/.test(hint)) return 'info';
            if (/dark|escuro/.test(hint)) return 'dark';
            if (/light|claro/.test(hint)) return 'light';
            if (/cancel|voltar|back/.test(hint)) return 'secondary';
            if (/primary|submit|criar|create|add|novo|new|iniciar|start|come(ç|c)ar/.test(hint)) return 'primary';
            if (/explorar|explore/.test(hint)) return 'info';
            if (/edit|editar|alterar|update|mudar/.test(hint)) return 'secondary';
            return 'secondary';
        };

        const normalizeOne = (el) => {
            if (!el || !isEligible(el)) return;
            if (!hasBtn(el)) el.classList.add('btn');
            if (!hasVariant(el)) {
                const v = pickVariant(el);
                // Padrão sólido; use outline para casos específicos se necessário
                el.classList.add('btn-' + v);
            }
        };

        const runNormalize = (root = document) => {
            root.querySelectorAll(SELECTOR).forEach(normalizeOne);
            // anchors que parecem botões
            root.querySelectorAll(LINK_SELECTOR).forEach(el => {
                if (!(el instanceof HTMLElement)) return;
                if (inMenu(el) || hasAnyClass(el, EXCLUDE_CLASS)) return;
                if (!el.classList.contains('btn')) el.classList.add('btn');
                if (!hasVariant(el)) {
                    const v = pickVariant(el);
                    el.classList.add('btn-' + v);
                }
                if (!el.getAttribute('role')) el.setAttribute('role','button');
            });
        };

        // Limpeza: remover .btn/.btn-* indevidos aplicados por engano
        const cleanup = (root = document) => {
            root.querySelectorAll('.btn').forEach(el => {
                // Nunca tocar no app de Mapas Mentais
                if (el.closest('#mm-vue-app')) return;
                if (!el.matches(SELECTOR) || inMenu(el) || hasAnyClass(el, EXCLUDE_CLASS)) {
                    el.classList.remove('btn');
                    BTN_VARIANTS.forEach(v => {
                        el.classList.remove('btn-' + v);
                        el.classList.remove('btn-outline-' + v);
                    });
                }
            });
        };

    cleanup(document);
    runNormalize(document);

        // Normalização adicional: botões em cabeçalhos flex (d-flex align-items-center justify-content-between mb-2)
        const FLEX_HDR_SEL = '.d-flex.align-items-center.justify-content-between.mb-2';
        const BTN_SEL = 'button, input[type="button"], input[type="submit"], a[role="button"]';
    const enforcePrimary = (root=document)=>{
            const scopes = root.querySelectorAll ? root.querySelectorAll(FLEX_HDR_SEL) : [];
            scopes.forEach(scope => {
                scope.querySelectorAll(BTN_SEL).forEach(el => {
            // não tocar em itens explicitamente excluídos (mas permitir .nb-actions)
            if (hasAnyClass(el, EXCLUDE_CLASS)) return;
                    // remove variantes existentes para unificar
                    BTN_VARIANTS.forEach(v => { el.classList.remove('btn-' + v); el.classList.remove('btn-outline-' + v); });
                    if (!el.classList.contains('btn')) el.classList.add('btn');
                    el.classList.add('btn-sm','btn-primary');
                    if (el.tagName === 'A' && !el.getAttribute('role')) el.setAttribute('role','button');
                });
            });
        };
    try { enforcePrimary(document); } catch {}

        // Transformar input[type=file] em botão Bootstrap acessível (sem alterar funcional)
        const fileInputsToButtons = (root=document) => {
            const files = root.querySelectorAll('input[type="file"]:not([data-bootstrap-file])');
            files.forEach(inp => {
                if (!(inp instanceof HTMLInputElement)) return;
                if (inMenu(inp)) return;
                // evitar interferir em componentes custom (ex.: input dentro de .custom-file ou similar) ou no app Vue
                if (inp.closest('.custom-file, .input-group, .form-group, #mm-vue-app')) return;
                // garantir id
                if (!inp.id) inp.id = 'file-' + Math.random().toString(36).slice(2,8);
                const labelText = inp.getAttribute('data-label') || inp.getAttribute('title') || 'Selecionar arquivo';
                const wrapLabel = inp.closest('label');
                let lbl = wrapLabel instanceof HTMLLabelElement ? wrapLabel : null;
                if (lbl) {
                    // Transformar o próprio label que já envolve o input em botão Bootstrap
                    if (!lbl.htmlFor) lbl.htmlFor = inp.id;
                    if (!lbl.classList.contains('btn')) lbl.classList.add('btn');
                    // não escolher cor custom: usar .btn-secondary padrão
                    const variants = ['primary','secondary','success','danger','warning','info','light','dark','link'];
                    variants.forEach(v => { lbl.classList.remove('btn-' + v); lbl.classList.remove('btn-outline-' + v); });
                    lbl.classList.add('btn-secondary');
                    // manter o texto existente; se vazio, usar labelText
                    const hasText = (lbl.textContent||'').trim().length > 0;
                    if (!hasText) lbl.textContent = labelText;
                    // esconder input visualmente
                    inp.classList.add('d-none');
                    inp.setAttribute('data-bootstrap-file', '1');
                    // inserir span de nome após o label (irmão) para feedback
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'ms-2 text-muted small';
                    const parent = lbl.parentElement || inp.parentElement;
                    parent && parent.insertBefore(nameSpan, lbl.nextSibling);
                    inp.addEventListener('change', () => {
                        try { nameSpan.textContent = inp.files && inp.files[0] ? inp.files[0].name : ''; } catch {}
                    });
                    return;
                }
                // Caso geral: criar um label botão antes do input
                lbl = document.createElement('label');
                lbl.htmlFor = inp.id;
                lbl.className = 'btn btn-secondary';
                lbl.textContent = labelText;
                inp.parentElement && inp.parentElement.insertBefore(lbl, inp);
                inp.classList.add('d-none');
                inp.setAttribute('data-bootstrap-file', '1');
                const nameSpan = document.createElement('span');
                nameSpan.className = 'ms-2 text-muted small';
                inp.parentElement && inp.parentElement.insertBefore(nameSpan, inp.nextSibling);
                inp.addEventListener('change', () => {
                    try { nameSpan.textContent = inp.files && inp.files[0] ? inp.files[0].name : ''; } catch {}
                });
            });
        };
    try { fileInputsToButtons(document); } catch {}

        // A função standardizeDropdowns foi removida. A lógica de dropdown agora é tratada
        // em módulos específicos como js/modules/editor-toolbar.js.

        // Observar elementos adicionados dinamicamente
        try {
            const mo = new MutationObserver((muts) => {
                muts.forEach(m => {
                    m.addedNodes && m.addedNodes.forEach(node => {
                        if (!(node instanceof Element)) return;
                        cleanup(node);
                        runNormalize(node);
                        enforcePrimary(node);
                        // standardizeDropdowns(node); // Removido
                        fileInputsToButtons(node);
                    });
                });
            });
            mo.observe(document.body, { childList: true, subtree: true });
        } catch {}
    } catch (e) { /* no-op */ }
});
// Nenhuma referência ao calendário legado aqui.

// Reforço específico: ao detectar o app de Mapas Mentais (#mm-vue-app), garantir classes no dock
(function(){
    try {
    // Se configs locais estão desligadas, não forçar classes do dock
    const PV_APLICAR_CONFIGS_LOCAIS = false;
    if (!PV_APLICAR_CONFIGS_LOCAIS) return;
        const host = document.getElementById('mm-vue-app');
        if (!host) return;
    const applyDockClasses = (scope) => {
            try {
        (scope.querySelectorAll ? scope.querySelectorAll('.tool-dock button') : []).forEach(btn => {
                    if (!(btn instanceof HTMLElement)) return;
                    if (!btn.classList.contains('btn')) btn.classList.add('btn');
                    const variants = ['primary','secondary','success','danger','warning','info','light','dark','link'];
                    variants.forEach(v => { btn.classList.remove('btn-' + v); btn.classList.remove('btn-outline-' + v); });
                    btn.classList.add('btn-outline-secondary');
                });
            } catch {}
        };
        applyDockClasses(host);
        try {
            let tries = 0; const maxTries = 30; const iv = setInterval(() => { applyDockClasses(host); tries++; if (tries >= maxTries) clearInterval(iv); }, 200);
            const mo = new MutationObserver(muts => { muts.forEach(m => m.addedNodes && m.addedNodes.forEach(n => { if (n.nodeType === 1) applyDockClasses(n); })); });
            mo.observe(host, { childList: true, subtree: true });
        } catch {}
    } catch {}
})();

