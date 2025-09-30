// Header inline behavior: custom toggler + dropdown normalization
(function(){
  const header = document.querySelector('.app-header');
  if(!header) return;
  const toggler = header.querySelector('.navbar-toggler');
  const collapse = header.querySelector('.app-header__collapse');
  if(toggler && collapse){
    // Inject bars if not present
    if(!toggler.querySelector('.navbar-toggler__bar')){
      toggler.innerHTML = '<span class="navbar-toggler__bar"></span><span class="navbar-toggler__bar"></span><span class="navbar-toggler__bar"></span>';
    }
    toggler.addEventListener('click', function(){
      const open = collapse.classList.toggle('is-open');
      toggler.classList.toggle('is-open', open);
      toggler.setAttribute('aria-expanded', open ? 'true':'false');
    });
  }
  // Standardize dropdown toggles (elements with data-dropdown)
  header.querySelectorAll('[data-dropdown]')
    .forEach(btn => {
      const id = btn.getAttribute('data-dropdown');
      const panel = id ? document.getElementById(id) : btn.nextElementSibling;
      if(!panel) return;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', isOpen ? 'true':'false');
      });
    });
  // Close on outside click / ESC
  document.addEventListener('click', e => {
    header.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  });
  document.addEventListener('keydown', e => {
    if(e.key==='Escape'){
      collapse && collapse.classList.remove('is-open');
      toggler && toggler.classList.remove('is-open');
    }
  });
})();
