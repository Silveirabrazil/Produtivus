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
        e.preventDefault();
        // marca saída, aguarda animação e navega
        document.body.classList.add('page-exit');
        setTimeout(()=> {
            location.href = a.href;
        }, 240);
    }

    // Ao carregar: marca entrada e remove a classe para tocar a animação
    document.addEventListener('DOMContentLoaded', ()=>{
        document.body.classList.add('page-enter');
        // after a tick, allow CSS to transition
        requestAnimationFrame(()=>{
            document.body.classList.add('ready');
            // remove page-enter/ready after a while to keep DOM clean
            setTimeout(()=> document.body.classList.remove('page-enter','ready'), 900);
        });
        document.body.addEventListener('click', onLinkClick);
    });
})();
