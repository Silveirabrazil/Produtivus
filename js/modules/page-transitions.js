// js/modules/page-transitions.js
// Intercepta cliques em links internos e anima transição de página
(function(){
    function isInternalLink(a){
        if(!a || !a.href) return false;
        try{
            const url = new URL(a.href, location.href);
            return url.origin === location.origin;
        }catch(e){return false}
    }

    function onLinkClick(e){
        const a = e.target.closest('a');
        if(!a) return;
        if(!isInternalLink(a)) return; // externa -> segue normalmente
        // permitir âncoras internas que mantêm hash
        const href = a.getAttribute('href');
        if(!href || href.startsWith('#')) return;
        // Opt-out manual por atributo
        if (a.hasAttribute('data-no-transition')) return;
        e.preventDefault();
        // marca saída, aguarda animação e navega
        document.body.classList.add('page-exit');
        setTimeout(()=> {
            location.href = a.href;
        }, 240);
    }

    function init(){
        if (!document.body) return;
        document.body.classList.add('page-enter');
        // after a tick, allow CSS to transition
        requestAnimationFrame(()=>{
            document.body.classList.add('ready');
            // remove page-enter/ready after a while to keep DOM clean
            setTimeout(()=> document.body.classList.remove('page-enter','ready'), 900);
        });
        // Evitar múltiplos binds
        if (!document.body.__pvPTBound) {
            document.body.addEventListener('click', onLinkClick);
            document.body.__pvPTBound = true;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // já carregado, inicializa imediatamente
        try { init(); } catch {}
    }
})();
