// js/modules/account-modals.js
// Modais de Perfil, Alterar Senha e Excluir Conta (sem Bootstrap)
(function(){
  if (window.pvAccountModals) return;
  function mountModal(title, bodyNode, actions){
    const overlay=document.createElement('div'); overlay.className='janela janela--media';
    const box=document.createElement('div'); box.className='janela__caixa';
    box.innerHTML='<div class="janela__cabecalho"><h3 class="janela__titulo"></h3><button type="button" class="janela__fechar" aria-label="Fechar">&#x2715;</button></div><div class="janela__corpo"></div><div class="janela__acoes"></div>';
    box.querySelector('.janela__titulo').textContent=title||'';
    const corpo=box.querySelector('.janela__corpo'); const acoes=box.querySelector('.janela__acoes');
    if (bodyNode) corpo.appendChild(bodyNode);
    (actions||[]).forEach(a=>{ const b=document.createElement('button'); b.className='botao'+(a.primary?' botao--primario':''); b.textContent=a.text||'OK'; b.addEventListener('click',()=> a.onClick && a.onClick(close)); acoes.appendChild(b); });
    overlay.appendChild(box);
    function open(){ requestAnimationFrame(()=> overlay.classList.add('janela--aberta')); }
    function close(){ try{ overlay.classList.add('janela--fechando'); setTimeout(()=> overlay.remove(), 360); }catch{} }
    overlay.addEventListener('click',ev=>{ if(ev.target===overlay) close(); });
    box.querySelector('.janela__fechar').addEventListener('click',close);
    document.addEventListener('keydown',function esc(e){ if(e.key==='Escape'){ document.removeEventListener('keydown',esc); close(); } });
    document.body.appendChild(overlay); open();
    return {close};
  }

  async function openProfile(){
    // Carrega dados da conta (servidor)
    let info={name:'',email:''}; try { const r=await fetch('/server/api/account.php',{credentials:'same-origin'}); const j=await r.json(); if(j&&j.success){ info=j.user||info; } } catch{}
    // Carrega campos extras locais (opcionais)
    let extra={}; try{ extra = JSON.parse(localStorage.getItem('pv_user_extra')||'{}')||{}; }catch{}
    const avatar = extra.avatar||'';
    const body=document.createElement('div');
    body.innerHTML = `
      <form id="acc-prof" class="formulario formulario--denso">
        <div class="grid-avatar">
          <div>
            <div class="avatar-edit">
              <img id="acc-avatar-preview" src="${avatar}" alt="Avatar" class="avatar-img${avatar?'':' oculto'}"/>
              <span id="acc-avatar-initials" class="avatar-initials${avatar?' oculto':''}">${(info.name||info.email||'U').trim().charAt(0).toUpperCase()}</span>
              <input type="file" id="acc-avatar" accept="image/*" class="avatar-input" title="Alterar foto">
            </div>
            <div class="avatar-hint">Clique para alterar</div>
          </div>
          <div>
            <div class="campo"><label class="campo__rotulo">Nome completo</label><div class="campo__controle"><input type="text" id="acc-name" class="campo__entrada" value="${info.name||''}" required></div></div>
            <div class="campo"><label class="campo__rotulo">E-mail</label><div class="campo__controle"><input type="email" id="acc-email" class="campo__entrada" value="${info.email||''}" required></div></div>
          </div>
        </div>

        <div class="grid-2c">
          <div class="campo"><label class="campo__rotulo">Data de nascimento</label><div class="campo__controle"><input type="date" id="acc-birth" class="campo__entrada" value="${extra.birth||''}"></div></div>
          <div class="campo"><label class="campo__rotulo">Gênero</label><div class="campo__controle"><select id="acc-gender" class="campo__entrada"><option value="" ${!extra.gender?'selected':''}>Selecione</option><option value="F" ${extra.gender==='F'?'selected':''}>Feminino</option><option value="M" ${extra.gender==='M'?'selected':''}>Masculino</option><option value="O" ${extra.gender==='O'?'selected':''}>Outro</option><option value="N" ${extra.gender==='N'?'selected':''}>Prefiro não dizer</option></select></div></div>
          <div class="campo"><label class="campo__rotulo">Estado civil</label><div class="campo__controle"><select id="acc-marital" class="campo__entrada"><option value="" ${!extra.marital?'selected':''}>Selecione</option><option value="solteiro" ${extra.marital==='solteiro'?'selected':''}>Solteiro(a)</option><option value="casado" ${extra.marital==='casado'?'selected':''}>Casado(a)</option><option value="divorciado" ${extra.marital==='divorciado'?'selected':''}>Divorciado(a)</option><option value="viuvo" ${extra.marital==='viuvo'?'selected':''}>Viúvo(a)</option></select></div></div>
          <div class="campo"><label class="campo__rotulo">Nacionalidade</label><div class="campo__controle"><input type="text" id="acc-nationality" class="campo__entrada" value="${extra.nationality||''}"></div></div>
          <div class="campo"><label class="campo__rotulo">Naturalidade</label><div class="campo__controle"><input type="text" id="acc-birthplace" class="campo__entrada" value="${extra.birthplace||''}"></div></div>
          <div class="campo"><label class="campo__rotulo">CPF</label><div class="campo__controle"><input type="text" id="acc-cpf" class="campo__entrada" value="${extra.cpf||''}" placeholder="000.000.000-00"></div></div>
        </div>

        <fieldset class="fieldset-bloco">
          <legend>Endereço</legend>
          <div class="grid-addr-1">
            <div class="campo"><label class="campo__rotulo">Logradouro</label><div class="campo__controle"><input type="text" id="acc-street" class="campo__entrada" value="${extra.street||''}"></div></div>
            <div class="campo"><label class="campo__rotulo">Número</label><div class="campo__controle"><input type="text" id="acc-number" class="campo__entrada" value="${extra.number||''}"></div></div>
          </div>
          <div class="grid-addr-2">
            <div class="campo"><label class="campo__rotulo">Complemento</label><div class="campo__controle"><input type="text" id="acc-complement" class="campo__entrada" value="${extra.complement||''}"></div></div>
            <div class="campo"><label class="campo__rotulo">Bairro</label><div class="campo__controle"><input type="text" id="acc-neighborhood" class="campo__entrada" value="${extra.neighborhood||''}"></div></div>
            <div class="campo"><label class="campo__rotulo">CEP</label><div class="campo__controle"><input type="text" id="acc-zip" class="campo__entrada" value="${extra.zip||''}"></div></div>
          </div>
          <div class="grid-addr-3">
            <div class="campo"><label class="campo__rotulo">Cidade</label><div class="campo__controle"><input type="text" id="acc-city" class="campo__entrada" value="${extra.city||''}"></div></div>
            <div class="campo"><label class="campo__rotulo">Estado (UF)</label><div class="campo__controle"><input type="text" id="acc-state" class="campo__entrada" value="${extra.state||''}" maxlength="2"></div></div>
          </div>
        </fieldset>

        <fieldset class="fieldset-bloco">
          <legend>Contato</legend>
          <div class="grid-contact">
            <div class="campo"><label class="campo__rotulo">Telefone</label><div class="campo__controle"><input type="text" id="acc-phone" class="campo__entrada" value="${extra.phone||''}"></div></div>
            <div class="campo"><label class="campo__rotulo">Celular</label><div class="campo__controle"><input type="text" id="acc-mobile" class="campo__entrada" value="${extra.mobile||''}"></div></div>
            <div class="campo"><label class="campo__rotulo">Contato de emergência</label><div class="campo__controle"><input type="text" id="acc-emergency" class="campo__entrada" value="${extra.emergency||''}" placeholder="Nome e telefone"></div></div>
          </div>
        </fieldset>

        <div id="acc-err" class="mensagem-erro"></div>
      </form>
    `;

    // Preview do avatar
    const avatarInput = body.querySelector('#acc-avatar');
    const avatarPreview = body.querySelector('#acc-avatar-preview');
    const avatarInitials = body.querySelector('#acc-avatar-initials');
    avatarInput?.addEventListener('change', (e)=>{
      const file = e.target.files && e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = () => { avatarPreview.src = reader.result; avatarPreview.classList.remove('oculto'); avatarInitials.classList.add('oculto'); };
      reader.readAsDataURL(file);
    });

    const modal=mountModal('Perfil', body, [
      { text:'Cancelar', onClick:(close)=> close() },
      { text:'Salvar', primary:true, onClick: async (close)=>{
  const name=body.querySelector('#acc-name').value.trim();
        const email=body.querySelector('#acc-email').value.trim();
  const err=body.querySelector('#acc-err'); err.textContent=''; err.classList.remove('is-visivel');
        try{
          // Atualiza dados básicos no servidor
          const r=await fetch('/server/api/account.php',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({name,email})});
          const j=await r.json(); if(!r.ok||!j||!j.success) throw new Error(j&&j.message||'Erro ao salvar');
          // Coleta extras e salva localmente
          const dataExtra={
            avatar: avatarPreview && avatarPreview.src ? avatarPreview.src : (extra.avatar||''),
            birth: body.querySelector('#acc-birth').value || '',
            gender: body.querySelector('#acc-gender').value || '',
            marital: body.querySelector('#acc-marital').value || '',
            nationality: body.querySelector('#acc-nationality').value || '',
            birthplace: body.querySelector('#acc-birthplace').value || '',
            cpf: body.querySelector('#acc-cpf').value || '',
            street: body.querySelector('#acc-street').value || '',
            number: body.querySelector('#acc-number').value || '',
            complement: body.querySelector('#acc-complement').value || '',
            neighborhood: body.querySelector('#acc-neighborhood').value || '',
            zip: body.querySelector('#acc-zip').value || '',
            city: body.querySelector('#acc-city').value || '',
            state: body.querySelector('#acc-state').value || '',
            phone: body.querySelector('#acc-phone').value || '',
            mobile: body.querySelector('#acc-mobile').value || '',
            emergency: body.querySelector('#acc-emergency').value || '',
          };
          try{ localStorage.setItem('pv_user_extra', JSON.stringify(dataExtra)); }catch{}
          try{ const u=JSON.parse(localStorage.getItem('pv_user')||'{}'); u.name=name; u.email=email; localStorage.setItem('pv_user', JSON.stringify(u)); }catch{}
          try{ window.dispatchEvent(new CustomEvent('pv-auth-changed',{detail:{action:'profile-updated'}})); }catch{}
          close(); window.pvNotify && pvNotify({title:'Perfil atualizado', type:'success', silent:false});
        }catch(e){ err.textContent=(e&&e.message)||'Falha ao salvar'; err.classList.add('is-visivel'); }
      } }
    ]);
    return modal;
  }

  async function openChangePassword(){
    const body=document.createElement('div'); body.innerHTML='<form id="acc-pass" class="formulario formulario--denso"><div class="campo"><label class="campo__rotulo">Senha atual</label><div class="campo__controle"><input type="password" id="cur" class="campo__entrada" required></div></div><div class="campo"><label class="campo__rotulo">Nova senha</label><div class="campo__controle"><input type="password" id="nw" class="campo__entrada" required></div></div><div id="acc-err" class="mensagem-erro"></div></form>';
    const modal=mountModal('Alterar senha', body, [
      { text:'Cancelar', onClick:(close)=> close() },
      { text:'Salvar', primary:true, onClick: async (close)=>{ const cur=body.querySelector('#cur').value; const nw=body.querySelector('#nw').value; const err=body.querySelector('#acc-err'); err.textContent=''; err.classList.remove('is-visivel'); if(!nw||nw.length<8){ err.textContent='Nova senha muito curta (mínimo 8).'; err.classList.add('is-visivel'); return; } try{ const r=await fetch('/server/api/account.php',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({currentPassword:cur,newPassword:nw})}); const j=await r.json(); if(!r.ok||!j||!j.success) throw new Error(j&&j.message||'Erro ao alterar'); close(); window.pvNotify && pvNotify({title:'Senha alterada', type:'success', silent:false}); }catch(e){ err.textContent=(e&&e.message)||'Falha ao alterar senha'; err.classList.add('is-visivel'); }} }
    ]);
    return modal;
  }

  async function openDeleteAccount(){
    const body=document.createElement('div'); body.innerHTML='<div class="texto-perigo">Esta ação é permanente. Digite DELETE para confirmar.</div><div class="campo"><div class="campo__controle"><input type="text" id="del" class="campo__entrada" placeholder="DELETE"></div></div><div id="acc-err" class="mensagem-erro"></div>';
    const modal=mountModal('Excluir conta', body, [
      { text:'Cancelar', onClick:(close)=> close() },
      { text:'Excluir', primary:true, onClick: async (close)=>{ const v=(body.querySelector('#del').value||'').trim(); const err=body.querySelector('#acc-err'); err.textContent=''; err.classList.remove('is-visivel'); if(v!=='DELETE'){ err.textContent='Digite DELETE para confirmar.'; err.classList.add('is-visivel'); return; } try{ const r=await fetch('/server/api/account.php',{method:'DELETE',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({confirm:'DELETE'})}); const j=await r.json(); if(!r.ok||!j||!j.success) throw new Error(j&&j.message||'Erro ao excluir'); try{ localStorage.removeItem('pv_user'); sessionStorage.clear(); }catch{} window.location.href='index.html?logout=1'; }catch(e){ err.textContent=(e&&e.message)||'Falha ao excluir'; err.classList.add('is-visivel'); }} }
    ]);
    return modal;
  }

  window.pvAccountModals = { openProfile, openChangePassword, openDeleteAccount };
})();
