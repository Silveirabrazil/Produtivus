// Header dinâmico mínimo (caso include estático não seja usado)
(function () {
  function pronto(fn) {
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);
  }
  function getPaths() {
    const raw = location.pathname || "";
    const lower = raw.toLowerCase();
    const pos = lower.indexOf("/html/");
    const root =
      pos >= 0 ? raw.slice(0, pos + 1) : raw.slice(0, raw.lastIndexOf("/") + 1);
    return { root, pages: root + "html/", index: root + "index.html" };
  }
  // Utilitários de animação (efeito sanfona)
  function _slideCleanup(el){ if(!el) return; el.style.overflow=''; el.style.height=''; el.style.opacity=''; el.style.transition=''; el.style.transform=''; el.style.transformOrigin=''; el.style.willChange=''; el.dataset.sliding=''; }
  function _computeOrigin(fromEl, el){
    try{
      if(!(fromEl instanceof Element) || !(el instanceof Element)) return null;
      const ib = fromEl.getBoundingClientRect();
      const mb = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(mb.width, (ib.left + ib.width/2) - mb.left));
      const y = Math.max(0, Math.min(mb.height, (ib.top + ib.height/2) - mb.top));
      return `${x}px ${y}px`;
    }catch{ return null }
  }
  function slideDown(el, {duration=260, easing='cubic-bezier(.16,.84,.33,1)', fromEl}={}){
    if (!el) return Promise.resolve();
    if (el.dataset.sliding==='down') return Promise.resolve();
    if (el.dataset.sliding==='up') { el.dispatchEvent(new Event('transitionend')); }
    el.dataset.sliding='down';
    const curDisp = getComputedStyle(el).display;
    if (curDisp==='none') el.style.display='block';
    const target = el.scrollHeight;
  el.style.overflow='hidden'; el.style.height='0px'; el.style.opacity='0';
  el.style.willChange='height,opacity,transform';
  const origin=_computeOrigin(fromEl, el); if(origin) el.style.transformOrigin=origin; else el.style.transformOrigin='top right';
  el.style.transform='translateY(-6px) scale(.97)';
  el.style.transition=`height ${duration}ms ${easing}, opacity ${Math.min(duration,200)}ms ease, transform ${duration}ms ${easing}`;
    return new Promise(resolve=>{
  requestAnimationFrame(()=>{ el.style.height=target+'px'; el.style.opacity='1'; el.style.transform='translateY(0) scale(1)'; });
      let ended=false; const done=()=>{ if(ended) return; ended=true; _slideCleanup(el); resolve(); };
      el.addEventListener('transitionend', function te(e){ if(e.propertyName==='height'){ el.removeEventListener('transitionend', te); done(); } });
      setTimeout(done, duration+60);
    });
  }
  function slideUp(el, {duration=220, easing='cubic-bezier(.16,.84,.33,1)', fromEl}={}){
    if (!el) return Promise.resolve();
    if (el.dataset.sliding==='up') return Promise.resolve();
    if (el.dataset.sliding==='down') { el.dispatchEvent(new Event('transitionend')); }
    el.dataset.sliding='up';
    const current = el.scrollHeight;
  el.style.overflow='hidden'; el.style.height=current+'px'; el.style.opacity='1'; el.style.willChange='height,opacity,transform';
  const origin=_computeOrigin(fromEl, el); if(origin) el.style.transformOrigin=origin; else el.style.transformOrigin='top right';
  void el.offsetHeight;
  el.style.transition=`height ${duration}ms ${easing}, opacity ${Math.min(duration,180)}ms ease, transform ${duration}ms ${easing}`;
    return new Promise(resolve=>{
  requestAnimationFrame(()=>{ el.style.height='0px'; el.style.opacity='0'; el.style.transform='translateY(-6px) scale(.97)'; });
      let ended=false; const done=()=>{ if(ended) return; ended=true; _slideCleanup(el); resolve(); };
      el.addEventListener('transitionend', function te(e){ if(e.propertyName==='height'){ el.removeEventListener('transitionend', te); done(); } });
      setTimeout(done, duration+60);
    });
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("pv_user") || "null");
    } catch {
      return null;
    }
  }
  function ativo(h) {
    try {
      const u = new URL(h, location.origin).pathname.toLowerCase();
      const cur = location.pathname.toLowerCase();
      if (u.endsWith("/index.html"))
        return cur === "/" || cur.endsWith("/index.html");
      return cur === u;
    } catch {
      return false;
    }
  }
  function markup(p) {
    // Lista completa para usuário logado (index será tratado com p.index)
    const fullLinks = [
      "index.html",
      "tarefas.html",
      "calendario.html",
      "dashboard.html",
  "caderno.html",
      "mapas.html",
      "planilhas.html",
      "estudos.html",
    ];
    const nomes = {
      index: "Home",
      tarefas: "Tarefas",
      calendario: "Calendário",
      dashboard: "Dashboard",
  "caderno": "Cadernos",
      mapas: "Mapas Mentais",
      planilhas: "Planilhas",
      estudos: "Estudos",
    };
    const user = getUser();
    // Visitante: não exibe menu (apenas botão Entrar na área de ações)
    const links = user ? fullLinks : [];
    const li = links
      .map((f) => {
        const href = f === 'index.html' ? p.index : p.pages + f;
        return `<li class="menu__item"><a class="menu__link" href="${href}">${nomes[f.split('.')[0]]}</a></li>`;
      })
      .join("");
    // Removido texto redundante ao lado da logo
    return `<header class="cabecalho"><div class="cabecalho__conteudo"><a class="cabecalho__marca" href="${p.index}"><img class="cabecalho__logo" src="${p.root}img/logo.png" alt="Produtivus"></a><button class="botao-menu" id="menu-toggle" aria-label="Abrir menu" aria-expanded="false"><span class="botao-menu__barra"></span><span class="botao-menu__barra"></span><span class="botao-menu__barra"></span></button><nav class="navegacao" aria-label="Navegação principal"><div class="navegacao-colapsavel" id="nav-colapsavel"><ul class="menu">${li}</ul><div class="cabecalho__acoes" id="cabecalho-acoes"></div></div></nav></div></header>`;
  }
  function montarUsuario(acoes, user, p) {
    if (!acoes) return;
    acoes.classList.remove('cabecalho__acoes--visitante');
    if (user) {
      let extra = null; try{ extra = JSON.parse(localStorage.getItem('pv_user_extra')||'null'); }catch{}
      const hasAvatar = extra && extra.avatar;
      const ini = (user.name || user.email || "U").trim().charAt(0).toUpperCase();
      const avatarHtml = hasAvatar ? `<img src="${extra.avatar}" alt="Avatar"/>` : ini;
      acoes.insertAdjacentHTML(
        "afterbegin",
        `<div class="usuario"><button class="usuario__botao" id="btn-user" aria-haspopup="true" aria-expanded="false"><span class="usuario__avatar">${avatarHtml}</span><span>${
          user.name || "Conta"
        }</span></button><div class="usuario__menu" id="menu-user"><div class="usuario__email">${
          user.email || ""
        }</div><button class="usuario__item" data-acao="perfil">Perfil</button><button class="usuario__item" data-acao="senha">Alterar senha</button><button class="usuario__item" data-acao="excluir">Excluir conta</button><button class="usuario__item" data-acao="sair">Sair</button></div></div>`
      );
      const btn = acoes.querySelector("#btn-user");
      const menu = acoes.querySelector("#menu-user");
      if (btn && menu) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          try { window.pvCloseHeaderDropdowns && window.pvCloseHeaderDropdowns(menu); } catch {}
          const open = !menu.classList.contains('aberto');
          const openUserMenu=()=>{ if(!menu.classList.contains('aberto')){ menu.classList.add('aberto'); slideDown(menu, { fromEl: btn }); btn.setAttribute('aria-expanded','true'); } };
          const closeUserMenu=()=>{ if(menu.classList.contains('aberto')){ slideUp(menu, { fromEl: btn }).finally(()=> menu.classList.remove('aberto')); btn.setAttribute('aria-expanded','false'); } };
          if (open) openUserMenu(); else closeUserMenu();
        });
        document.addEventListener("click", () => { if(menu.classList.contains('aberto')){ slideUp(menu, { fromEl: btn }).finally(()=> menu.classList.remove('aberto')); btn.setAttribute('aria-expanded','false'); } });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            if(menu.classList.contains('aberto')){ slideUp(menu, { fromEl: btn }).finally(()=> menu.classList.remove('aberto')); btn.setAttribute('aria-expanded','false'); }
          }
        });
        acoes.addEventListener("click", async (e) => {
          const ac = e.target.closest("[data-acao]");
          if (!ac) return;
          const a = ac.getAttribute("data-acao");
          const ensureAccountModals = () => {
            if (window.pvAccountModals) return Promise.resolve();
            // single-flight: reutiliza a mesma promessa entre chamadas para evitar múltiplos 404
            if (window._pvEnsureAccountModalsPromise) return window._pvEnsureAccountModalsPromise;
            window._pvEnsureAccountModalsPromise = new Promise((res) => {
              if (document.querySelector('script[data-pv="account-modals"]')) {
                const chk = () => (window.pvAccountModals ? res() : setTimeout(chk, 50));
                chk();
                return;
              }
              const injectInline = () => {
                if (window.pvAccountModals) return;
                try {
                  // Inline fallback de account-modals (perfil/senha/excluir)
                  (function(){
                    if (window.pvAccountModals) return;
                    try{ console.info('[pv] account-modals: usando fallback inline'); }catch{}
                    function createOverlay(){ const o=document.createElement('div'); o.className='janela janela--media'; return o; }
                    function createBox(){ const b=document.createElement('div'); b.className='janela__caixa'; return b; }
                    function mountModal(title, bodyNode, actions){ const overlay=createOverlay(); const box=createBox(); box.innerHTML='<div class="janela__cabecalho"><h3 class="janela__titulo"></h3><button type="button" class="janela__fechar" aria-label="Fechar">&#x2715;</button></div><div class="janela__corpo"></div><div class="janela__acoes"></div>'; box.querySelector('.janela__titulo').textContent=title||''; const body=box.querySelector('.janela__corpo'); const acts=box.querySelector('.janela__acoes'); if(bodyNode) body.appendChild(bodyNode); (actions||[]).forEach(a=>{ const btn=document.createElement('button'); btn.className='botao'+(a.primary?' botao--primario':''); btn.textContent=a.text||'OK'; btn.addEventListener('click',()=> a.onClick && a.onClick(close)); acts.appendChild(btn); }); overlay.appendChild(box); function open(){ requestAnimationFrame(()=> overlay.classList.add('janela--aberta')); } function close(){ try{ overlay.classList.add('janela--fechando'); setTimeout(()=> overlay.remove(), 360); }catch{} } overlay.addEventListener('click',ev=>{ if(ev.target===overlay) close(); }); box.querySelector('.janela__fechar').addEventListener('click',close); document.addEventListener('keydown',function esc(e){ if(e.key==='Escape'){ document.removeEventListener('keydown',esc); close(); } }); document.body.appendChild(overlay); open(); return {close}; }
                    async function openProfile(){ let info={name:'',email:''}; let extra={}; let avatar=''; try{ const r=await fetch(p.root+'server/api/account.php',{credentials:'same-origin'}); if(r.status===401){ try{ if(window.openLoginModal) window.openLoginModal(); }catch{} return; } const j=await r.json(); if(j&&j.success){ info=j.user||info; if (j.profile && typeof j.profile==='object') { extra = j.profile; avatar = extra.avatar||''; } } }catch{} if(!extra||Object.keys(extra).length===0){ try{ extra=JSON.parse(localStorage.getItem('pv_user_extra')||'{}')||{}; avatar=extra.avatar||''; }catch{} } const body=document.createElement('div'); body.innerHTML=`<form id="acc-prof" class="formulario formulario--denso"><div class="grid-avatar"><div><div class="avatar-edit"><img id="acc-avatar-preview" src="${avatar}" alt="Avatar" class="avatar-img${avatar?'':' oculto'}"><span id="acc-avatar-initials" class="avatar-initials${avatar?' oculto':''}">${(info.name||info.email||'U').trim().charAt(0).toUpperCase()}</span><input type="file" id="acc-avatar" accept="image/*" class="avatar-input"></div><div class="avatar-hint">Clique para alterar</div></div><div><div class="campo"><label class="campo__rotulo">Nome completo</label><div class="campo__controle"><input type="text" id="acc-name" class="campo__entrada" value="${info.name||''}" required></div></div><div class="campo"><label class="campo__rotulo">E-mail</label><div class="campo__controle"><input type="email" id="acc-email" class="campo__entrada" value="${info.email||''}" required></div></div></div></div><div class="grid-2c"><div class="campo"><label class="campo__rotulo">Data de nascimento</label><div class="campo__controle"><input type="date" id="acc-birth" class="campo__entrada" value="${extra.birth||''}"></div></div><div class="campo"><label class="campo__rotulo">Gênero</label><div class="campo__controle"><select id="acc-gender" class="campo__entrada"><option value="" ${!extra.gender?'selected':''}>Selecione</option><option value="F" ${extra.gender==='F'?'selected':''}>Feminino</option><option value="M" ${extra.gender==='M'?'selected':''}>Masculino</option><option value="O" ${extra.gender==='O'?'selected':''}>Outro</option><option value="N" ${extra.gender==='N'?'selected':''}>Prefiro não dizer</option></select></div></div><div class="campo"><label class="campo__rotulo">Estado civil</label><div class="campo__controle"><select id="acc-marital" class="campo__entrada"><option value="" ${!extra.marital?'selected':''}>Selecione</option><option value="solteiro" ${extra.marital==='solteiro'?'selected':''}>Solteiro(a)</option><option value="casado" ${extra.marital==='casado'?'selected':''}>Casado(a)</option><option value="divorciado" ${extra.marital==='divorciado'?'selected':''}>Divorciado(a)</option><option value="viuvo" ${extra.marital==='viuvo'?'selected':''}>Viúvo(a)</option></select></div></div><div class="campo"><label class="campo__rotulo">Nacionalidade</label><div class="campo__controle"><input type="text" id="acc-nationality" class="campo__entrada" value="${extra.nationality||''}"></div></div><div class="campo"><label class="campo__rotulo">Naturalidade</label><div class="campo__controle"><input type="text" id="acc-birthplace" class="campo__entrada" value="${extra.birthplace||''}"></div></div><div class="campo"><label class="campo__rotulo">CPF</label><div class="campo__controle"><input type="text" id="acc-cpf" class="campo__entrada" value="${extra.cpf||''}" placeholder="000.000.000-00"></div></div></div><fieldset class="fieldset-bloco"><legend>Endereço</legend><div class="grid-addr-1"><div class="campo"><label class="campo__rotulo">Logradouro</label><div class="campo__controle"><input type="text" id="acc-street" class="campo__entrada" value="${extra.street||''}"></div></div><div class="campo"><label class="campo__rotulo">Número</label><div class="campo__controle"><input type="text" id="acc-number" class="campo__entrada" value="${extra.number||''}"></div></div></div><div class="grid-addr-2"><div class="campo"><label class="campo__rotulo">Complemento</label><div class="campo__controle"><input type="text" id="acc-complement" class="campo__entrada" value="${extra.complement||''}"></div></div><div class="campo"><label class="campo__rotulo">Bairro</label><div class="campo__controle"><input type="text" id="acc-neighborhood" class="campo__entrada" value="${extra.neighborhood||''}"></div></div><div class="campo"><label class="campo__rotulo">CEP</label><div class="campo__controle"><input type="text" id="acc-zip" class="campo__entrada" value="${extra.zip||''}"></div></div></div><div class="grid-addr-3"><div class="campo"><label class="campo__rotulo">Cidade</label><div class="campo__controle"><input type="text" id="acc-city" class="campo__entrada" value="${extra.city||''}"></div></div><div class="campo"><label class="campo__rotulo">Estado (UF)</label><div class="campo__controle"><input type="text" id="acc-state" class="campo__entrada" value="${extra.state||''}" maxlength="2"></div></div></div></fieldset><fieldset class="fieldset-bloco"><legend>Contato</legend><div class="grid-contact"><div class="campo"><label class="campo__rotulo">Telefone</label><div class="campo__controle"><input type="text" id="acc-phone" class="campo__entrada" value="${extra.phone||''}"></div></div><div class="campo"><label class="campo__rotulo">Celular</label><div class="campo__controle"><input type="text" id="acc-mobile" class="campo__entrada" value="${extra.mobile||''}"></div></div><div class="campo"><label class="campo__rotulo">Contato de emergência</label><div class="campo__controle"><input type="text" id="acc-emergency" class="campo__entrada" value="${extra.emergency||''}" placeholder="Nome e telefone"></div></div></div></fieldset><div id="acc-err" class="mensagem-erro"></div></form>`;
                    const avatarInput=body.querySelector('#acc-avatar'); const avatarPreview=body.querySelector('#acc-avatar-preview'); const avatarInitials=body.querySelector('#acc-avatar-initials'); avatarInput?.addEventListener('change', (e)=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ avatarPreview.src=rd.result; avatarPreview.classList.remove('oculto'); avatarInitials.classList.add('oculto'); }; rd.readAsDataURL(f); });
                    const modal=mountModal('Perfil', body, [ {text:'Cancelar', onClick:(close)=> close()}, {text:'Salvar', primary:true, onClick: async (close)=>{ const name=body.querySelector('#acc-name').value.trim(); const email=body.querySelector('#acc-email').value.trim(); const err=body.querySelector('#acc-err'); err.textContent=''; err.classList.remove('is-visivel'); const dataExtra={ avatar:(avatarPreview&&avatarPreview.src)||'', birth:body.querySelector('#acc-birth').value||'', gender:body.querySelector('#acc-gender').value||'', marital:body.querySelector('#acc-marital').value||'', nationality:body.querySelector('#acc-nationality').value||'', birthplace:body.querySelector('#acc-birthplace').value||'', cpf:body.querySelector('#acc-cpf').value||'', street:body.querySelector('#acc-street').value||'', number:body.querySelector('#acc-number').value||'', complement:body.querySelector('#acc-complement').value||'', neighborhood:body.querySelector('#acc-neighborhood').value||'', zip:body.querySelector('#acc-zip').value||'', city:body.querySelector('#acc-city').value||'', state:body.querySelector('#acc-state').value||'', phone:body.querySelector('#acc-phone').value||'', mobile:body.querySelector('#acc-mobile').value||'', emergency:body.querySelector('#acc-emergency').value||'' }; try{ const r=await fetch(p.root+'server/api/account.php',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({name,email, ...dataExtra})}); const j=await r.json(); if(!r.ok||!j||!j.success) throw new Error((j&&j.message)||'Erro ao salvar'); try{ localStorage.setItem('pv_user_extra', JSON.stringify(dataExtra)); }catch{} try{ const u=JSON.parse(localStorage.getItem('pv_user')||'{}'); u.name=name; u.email=email; localStorage.setItem('pv_user', JSON.stringify(u)); }catch{} try{ window.dispatchEvent(new CustomEvent('pv-auth-changed',{detail:{action:'profile-updated'}})); }catch{} close(); window.pvNotify && pvNotify({title:'Perfil atualizado', type:'success', silent:false, store:false}); }catch(e){ err.textContent=(e&&e.message)||'Falha ao salvar'; err.classList.add('is-visivel'); }} } ]); return modal; }
                    async function openChangePassword(){ const body=document.createElement('div'); body.innerHTML='<form class="formulario formulario--denso"><div class="campo"><label class="campo__rotulo">Senha atual</label><div class="campo__controle"><input type="password" id="cur" class="campo__entrada" required></div></div><div class="campo"><label class="campo__rotulo">Nova senha</label><div class="campo__controle"><input type="password" id="nw" class="campo__entrada" required></div></div><div id="acc-err" class="mensagem-erro"></div></form>'; const modal=mountModal('Alterar senha', body, [ {text:'Cancelar', onClick:(close)=> close()}, {text:'Salvar', primary:true, onClick: async (close)=>{ const cur=body.querySelector('#cur').value; const nw=body.querySelector('#nw').value; const err=body.querySelector('#acc-err'); err.textContent=''; if(!nw||nw.length<8){ err.textContent='Nova senha muito curta (mínimo 8).'; return; } try{ const r=await fetch(p.root+'server/api/account.php',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({currentPassword:cur,newPassword:nw})}); const j=await r.json(); if(!r.ok||!j||!j.success) throw new Error((j&&j.message)||'Erro ao alterar'); close(); window.pvNotify && pvNotify({title:'Senha alterada', type:'success', silent:false, store:false}); }catch(e){ err.textContent=(e&&e.message)||'Falha ao alterar senha'; }} } ]); return modal; }
                    async function openDeleteAccount(){ const body=document.createElement('div'); body.innerHTML='<div class="texto-perigo">Esta ação é permanente. Digite DELETE para confirmar.</div><div class="campo"><div class="campo__controle"><input type="text" id="del" class="campo__entrada" placeholder="DELETE"></div></div><div id="acc-err" class="mensagem-erro"></div>'; const modal=mountModal('Excluir conta', body, [ {text:'Cancelar', onClick:(close)=> close()}, {text:'Excluir', primary:true, onClick: async (close)=>{ const v=(body.querySelector('#del').value||'').trim(); const err=body.querySelector('#acc-err'); err.textContent=''; err.classList.remove('is-visivel'); if(v!=='DELETE'){ err.textContent='Digite DELETE para confirmar.'; err.classList.add('is-visivel'); return; } try{ const r=await fetch(p.root+'server/api/account.php',{method:'DELETE',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({confirm:'DELETE'})}); const j=await r.json(); if(!r.ok||!j||!j.success) throw new Error((j&&j.message)||'Erro ao excluir'); try{ localStorage.removeItem('pv_user'); sessionStorage.clear(); }catch{} window.location.href=p.index+'?logout=1'; }catch(e){ err.textContent=(e&&e.message)||'Falha ao excluir'; err.classList.add('is-visivel'); }} } ]); return modal; }
                    window.pvAccountModals = { openProfile, openChangePassword, openDeleteAccount };
                    window._pvAccountModalsSource = 'inline';
                  })();
                } catch {}
              };
              const trySrc = (srcs) => {
                if (!srcs.length) {
                  // Sem fontes válidas: injeta fallback inline e resolve
                  injectInline();
                  const chk=()=> (window.pvAccountModals?res():setTimeout(chk,50)); chk();
                  return;
                }
                const src = srcs.shift();
                const s = document.createElement('script');
                s.src = src; s.defer = true; s.setAttribute('data-pv','account-modals');
                s.onload = () => { try{ console.info('[pv] account-modals carregado de', src); }catch{} window._pvAccountModalsSource=src; const chk = () => (window.pvAccountModals ? res() : setTimeout(chk, 50)); chk(); };
                // Para reduzir 404s em produção, desistimos após a primeira falha e caímos no fallback
                s.onerror = () => { try{ console.info('[pv] falha ao carregar', src, '— usando fallback inline'); }catch{} injectInline(); const chk=()=> (window.pvAccountModals?res():setTimeout(chk,50)); chk(); };
                document.body.appendChild(s);
              };
              // Tenta caminhos: com base p.root, relativo './', e absoluto '/'
              trySrc([ p.root + 'js/modules/account-modals.js', './js/modules/account-modals.js', '/js/modules/account-modals.js', '/apps/sheets/public/js/modules/account-modals.js', '/apps/mindmaps/public/js/modules/account-modals.js' ]);
            });
          };
          if (a === "perfil") {
            // Fecha dropdown do usuário antes de abrir a modal
            try {
              if (menu.classList.contains('aberto')) {
                await slideUp(menu, { fromEl: btn });
                menu.classList.remove('aberto');
                btn.setAttribute('aria-expanded','false');
              }
            } catch {}
            await ensureAccountModals();
            setTimeout(() => { try { window.pvAccountModals.openProfile(); } catch {} }, 30);
          } else if (a === "sair") {
            try {
              await fetch(p.root + "server/api/logout.php", {
                credentials: "same-origin",
              });
            } catch {}
            localStorage.removeItem("pv_user");
            location.href = p.index;
          } else if (a === "senha") {
            try {
              if (menu.classList.contains('aberto')) {
                await slideUp(menu, { fromEl: btn });
                menu.classList.remove('aberto');
                btn.setAttribute('aria-expanded','false');
              }
            } catch {}
            await ensureAccountModals();
            setTimeout(() => { try { window.pvAccountModals.openChangePassword(); } catch {} }, 30);
          } else if (a === "excluir") {
            try {
              if (menu.classList.contains('aberto')) {
                await slideUp(menu, { fromEl: btn });
                menu.classList.remove('aberto');
                btn.setAttribute('aria-expanded','false');
              }
            } catch {}
            await ensureAccountModals();
            setTimeout(() => { try { window.pvAccountModals.openDeleteAccount(); } catch {} }, 30);
          }
        });
      }
    } else {
      acoes.classList.add('cabecalho__acoes--visitante');
      const b = document.createElement("button");
      b.type = "button";
      b.className = "botao botao--primario";
      b.textContent = "Entrar";
      b.addEventListener("click", () => {
        if (window.openLoginModal) window.openLoginModal();
        else location.href = p.index + "?login=1";
      });
      acoes.appendChild(b);
    }
  }
  function ativarLinks(h) {
    h.querySelectorAll(".menu__link").forEach((a) => {
      if (ativo(a.getAttribute("href"))) a.classList.add("ativo");
    });
  }
  function wiring(h) {
    const t = h.querySelector("#menu-toggle");
    const c = h.querySelector("#nav-colapsavel");
    if (t && c) {
      t.addEventListener("click", () => {
        const ab = c.classList.toggle("is-aberta");
        t.classList.toggle("is-aberto", ab);
        t.setAttribute("aria-expanded", ab ? "true" : "false");
      });
    }
  }
  function mountAcoes(h, p){
    const notifAnchor = h.querySelector('#pv-notif-anchor');
    const timerAnchor = h.querySelector('#pv-timer-anchor');
    // Helper global para fechar todos os dropdowns do header (usado por notificações/timer/usuário)
    if (!window.pvCloseHeaderDropdowns) {
      window.pvCloseHeaderDropdowns = function(exceptRoot){
        try {
          document.querySelectorAll('.cabecalho .dropdown-menu.show').forEach(m => {
            if (exceptRoot && exceptRoot.contains(m)) return;
            slideUp(m).finally(()=>{
              m.classList.remove('show');
              m.parentElement && m.parentElement.classList && m.parentElement.classList.remove('show');
            });
          });
          document.querySelectorAll('.cabecalho .dropdown.show').forEach(d => {
            if (exceptRoot && exceptRoot.contains(d)) return;
            d.classList.remove('show');
          });
          // Fecha menu do usuário, se aberto
          const um = document.querySelector('.cabecalho .usuario__menu.aberto');
          const ub = document.querySelector('.cabecalho #btn-user[aria-expanded="true"]');
          if (um) slideUp(um).finally(()=> um.classList.remove('aberto'));
          if (ub) ub.setAttribute('aria-expanded','false');
        } catch {}
      };
    }
    // Listener único para fechar ao clicar fora ou ESC
    if (!window._pvHeaderDropdownsBound) {
      window._pvHeaderDropdownsBound = true;
      document.addEventListener('click', (e) => {
        try {
          const tgt = e.target instanceof Element ? e.target : null;
          const cab = document.querySelector('.cabecalho');
          if (!cab) return;
          if (!tgt || !cab.contains(tgt) || !tgt.closest('.cabecalho .dropdown')) {
            window.pvCloseHeaderDropdowns();
          }
        } catch {}
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.pvCloseHeaderDropdowns();
      });
    }
    // Notificações
    if (notifAnchor) {
      const ensureNotif = ()=>{ try{ window.pvNotifications?.mount?.(notifAnchor); }catch{} };
      if (window.pvNotifications?.mount) ensureNotif();
      else if (!document.querySelector('script[data-pv="notifications"]')){
        const s=document.createElement('script');
        s.src = p.root + 'js/modules/notifications.js'; s.defer=true; s.setAttribute('data-pv','notifications'); s.onload=ensureNotif; document.body.appendChild(s);
      }
    }
    // Timer (dropdown compacto + opção abrir modal)
    if (timerAnchor) {
      if (!timerAnchor.querySelector('.pv-htimer-wrap')){
        const wrap = document.createElement('div'); wrap.className='pv-htimer-wrap dropdown';
        const btn = document.createElement('button'); btn.type='button'; btn.className='nav-icon-btn dropdown-toggle'; btn.title='Timer de estudo';
        btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4"/><path d="M12 14V8"/><circle cx="12" cy="14" r="8"/></svg>';
        wrap.appendChild(btn);
        const menu=document.createElement('div'); menu.className='dropdown-menu dropdown-menu-end p-2 shadow'; menu.style.minWidth='260px'; menu.style.maxWidth='90vw';
        wrap.appendChild(menu);

        function render(){
          const s = window.pvStudyTimer?.getState ? window.pvStudyTimer.getState() : null;
          const running = !!(s && s.running); const left = s? s.left: 0; const phase = s? s.phase: 'study';
          const fmt=(mm)=>{ mm=Math.max(0,mm|0); const m=String(Math.floor(mm/60)).padStart(2,'0'); const ss=String(mm%60).padStart(2,'0'); return m+':'+ss };
          menu.innerHTML = '';
          const box=document.createElement('div'); box.className='pv-htimer-panel';
          box.innerHTML = `
            <div class="d-flex align-items-center justify-content-between px-1 py-1">
              <div>
                <div class="fw-semibold">Timer Pomodoro</div>
                <div class="small text-muted"><span id="hphase">${phase==='study'?'Estudo':phase==='break'?'Pausa':'Longa'}</span> • <span id="hleft">${fmt(left)}</span></div>
              </div>
              <div class="d-flex gap-1">
                <button class="btn btn-sm ${running?'btn-outline-secondary':'btn-primary'}" id="hstart">${running?'Pausar':'Iniciar'}</button>
                <button class="btn btn-sm btn-outline-secondary" id="hskip">Pular</button>
              </div>
            </div>
            <div class="d-flex justify-content-end pt-1">
              <button class="btn btn-sm btn-link" id="hopen">Abrir detalhado</button>
            </div>`;
          menu.appendChild(box);
          // Wire
          box.querySelector('#hopen')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation();
            if (window.openTimerModal) { window.openTimerModal(); hide(); return; }
            ensureTimer(()=>{ try{ window.openTimerModal?.(); hide(); }catch{} });
          });
          box.querySelector('#hstart')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); ensureTimer(()=>{
            try{ const st=window.pvStudyTimer.getState(); if (st.running) window.pvStudyTimer.pause(); else window.pvStudyTimer.start(); render(); }catch{}
          }); });
          box.querySelector('#hskip')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); ensureTimer(()=>{ try{ window.pvStudyTimer.skip(); render(); }catch{} }); });
        }

        function ensureTimer(cb){
          if (window.pvStudyTimer) { cb && cb(); return; }
          if (!document.querySelector('script[data-pv="study-timer"]')){
            const s=document.createElement('script'); s.src=p.root+'js/modules/study-timer.js'; s.defer=true; s.setAttribute('data-pv','study-timer'); s.onload=()=> setTimeout(()=> cb&&cb(), 20); s.onerror=()=>{ const a=document.createElement('script'); a.src='./js/modules/study-timer.js'; a.defer=true; a.setAttribute('data-pv','study-timer'); a.onload=()=> setTimeout(()=> cb&&cb(), 20); document.body.appendChild(a); }; document.body.appendChild(s);
          }
        }
        function show(){
          if(!menu.classList.contains('show')){
            menu.classList.add('show'); wrap.classList.add('show');
            menu.style.display='block';
            slideDown(menu, { fromEl: btn }).then(()=>{ menu.style.display=''; try{ menu.focus(); }catch{} });
          }
          render();
        }
        function hide(){
          if(menu.classList.contains('show')){
            slideUp(menu, { fromEl: btn }).finally(()=>{ menu.classList.remove('show'); wrap.classList.remove('show'); });
          }
        }
        btn.addEventListener('click', (e)=>{
          e.preventDefault(); e.stopPropagation();
          const open=!menu.classList.contains('show');
          // fecha todos os dropdowns do header, exceto este
          try { window.pvCloseHeaderDropdowns && window.pvCloseHeaderDropdowns(wrap); } catch {}
          if (open){ ensureTimer(()=> show()); } else { hide(); }
        });
        // fechamento por clique fora já é coberto pelo listener global
        timerAnchor.appendChild(wrap);
      }
    }
  }
  function garantir(forceRerender) {
    let h = document.querySelector(".cabecalho");
    if (h && !forceRerender) return h;
    const p = getPaths();
    const host = document.getElementById("header-container") || document.body;
    if (h && forceRerender) {
      try {
        h.remove();
      } catch {}
    }
    const tmp = document.createElement("div");
    tmp.innerHTML = markup(p);
    h = tmp.firstElementChild;
    host.insertBefore(h, host.firstChild);
    const u = getUser();
    ativarLinks(h);
    wiring(h);
    montarUsuario(h.querySelector("#cabecalho-acoes"), u, p);
    mountAcoes(h, p);
    return h;
  }
  // evento global para re-render após login/logout sem refresh
  window.addEventListener("pv-auth-changed", () => garantir(true));
  pronto(garantir);
  // Observador global para dropdowns fora do header: animação sanfona baseada na classe .show
  pronto(function(){
    function handleMenu(menu){
      if(!(menu instanceof HTMLElement)) return;
      if (menu.dataset.pvAnimated==='1') return;
      menu.dataset.pvAnimated='1';
      if (menu.classList.contains('show')){ menu.style.display='block'; slideDown(menu); }
    }
    document.querySelectorAll('.dropdown-menu').forEach(handleMenu);
    const mo=new MutationObserver(muts=>{
      for(const m of muts){
        if (m.type==='childList'){
          m.addedNodes?.forEach(n=>{ if(n instanceof HTMLElement){ if(n.matches?.('.dropdown-menu')) handleMenu(n); n.querySelectorAll?.('.dropdown-menu').forEach(handleMenu); } });
        }
        if (m.type==='attributes' && m.target instanceof HTMLElement && m.target.matches('.dropdown-menu') && m.attributeName==='class'){
          const el=m.target; if (el.dataset.pvManualAnim==='1') continue; if (el.classList.contains('show')){ el.style.display='block'; slideDown(el);} else { slideUp(el).finally(()=>{}); }
        }
      }
    });
    mo.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  });
  try{ window.pvSlideDown = slideDown; window.pvSlideUp = slideUp; }catch{}
  window.renderHeader = garantir;
})();
