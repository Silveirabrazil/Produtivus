// JavaScript para sincronizar carrossel de fundo com conteúdo
document.addEventListener('DOMContentLoaded', function() {
  const backgroundCarousel = document.getElementById('heroBackgroundCarousel');
  const contentSlides = Array.from(document.querySelectorAll('.content-slide'));
  const indicators = Array.from(document.querySelectorAll('.hero-indicators button'));
  if(!backgroundCarousel) return;

  let idx = 0; let playing = true; let timer = null; const INTERVAL = 5000;
  const slides = Array.from(backgroundCarousel.querySelectorAll('.carousel-item, [data-hero-slide]'));

  function apply(i){
    idx = (i+slides.length) % slides.length;
    slides.forEach((s,k)=>{ s.classList.toggle('active', k===idx); });
    contentSlides.forEach((s,k)=>{ s.classList.toggle('active', k===idx); });
    indicators.forEach((b,k)=>{ if(k===idx){ b.classList.add('active'); b.setAttribute('aria-current','true'); } else { b.classList.remove('active'); b.removeAttribute('aria-current'); } });
  }
  function next(){ apply(idx+1); }
  function schedule(){ if(timer) clearTimeout(timer); if(playing){ timer = setTimeout(()=>{ next(); schedule(); }, INTERVAL); } }
  indicators.forEach((btn,i)=> btn.addEventListener('click', ()=>{ apply(i); schedule(); }));
  const heroContent = document.getElementById('heroContent');
  if(heroContent){
    heroContent.addEventListener('mouseenter', ()=>{ playing=false; schedule(); });
    heroContent.addEventListener('mouseleave', ()=>{ playing=true; schedule(); });
  }
  // swipe touch simples
  let startX=null; backgroundCarousel.addEventListener('touchstart', e=>{ startX = e.touches[0].clientX; });
  backgroundCarousel.addEventListener('touchend', e=>{ if(startX==null) return; const dx = e.changedTouches[0].clientX - startX; if(Math.abs(dx)>40){ if(dx<0) next(); else apply(idx-1); schedule(); } startX=null; });
  apply(0); schedule();
});
