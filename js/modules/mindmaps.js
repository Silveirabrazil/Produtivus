// js/modules/mindmaps.js
// Aplicação isolada de Mapas Mentais (grupos \u2192 mapas/folhas), integrando Cursos/Matérias via study.js
// Mantém UX semelhante aos Cadernos, mas com editor de nós/arestas leve (canvas + DOM), sem dependências externas.
(function(){
  const API_BASE = `${location.origin}/server/api`;

  // State
  let groups = []; // {id,title,course_id,subject_id,created,maps_count}
  const mapsCache = new Map(); // Map<groupId, [maps]>
  let currentGroupId = null;

  // Utils
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const keyG = id => String(id);
  const now = () => new Date().toISOString();

  // Small pv wrapper to use the project's modal/toast provider when available
  const pv = {
  async confirm(msg){ try{ if (window.pvShowConfirm){ console.debug('[pv][mindmaps] using window.pvShowConfirm'); return window.pvShowConfirm(msg); } }catch(e){console.debug('[pv][mindmaps] pvShowConfirm threw', e);} console.debug('[pv][mindmaps] fallback to native confirm'); return Promise.resolve(confirm(msg)); },
  async prompt(msg, def=''){ try{ if (window.pvShowPrompt){ console.debug('[pv][mindmaps] using window.pvShowPrompt'); return window.pvShowPrompt(msg, def); } }catch(e){console.debug('[pv][mindmaps] pvShowPrompt threw', e);} console.debug('[pv][mindmaps] fallback to native prompt'); return Promise.resolve(prompt(msg, def)); },
  toast(msg, opts){ try { if (window.pvShowToast){ console.debug('[pv][mindmaps] using window.pvShowToast'); return window.pvShowToast(msg, opts); } if (typeof pvShowToast === 'function'){ console.debug('[pv][mindmaps] using global pvShowToast'); return pvShowToast(msg, opts); } } catch(e){console.debug('[pv][mindmaps] pvShowToast threw', e);} console.debug('[pv][mindmaps] fallback to alert'); try { alert(msg); } catch{} },
  async select(message, options, allowEmpty){ try{ if (window.pvShowSelect){ console.debug('[pv][mindmaps] using window.pvShowSelect'); return window.pvShowSelect(message, options, allowEmpty); } }catch(e){console.debug('[pv][mindmaps] pvShowSelect threw', e);} console.debug('[pv][mindmaps] select fallback -> null'); return Promise.resolve(null); }
  };

  // API helpers (espelham notebooks.php/notebook_pages.php, mas dedicados: mindmap_groups.php / mindmaps.php)
  async function apiGet(path){ const r=await fetch(`${API_BASE}/${path}`, { credentials:'same-origin' }); if(!r.ok) throw new Error(String(r.status)); return r.json(); }
  async function apiSend(path, method, body){ const r=await fetch(`${API_BASE}/${path}`, { method, headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: body?JSON.stringify(body):undefined}); const j=await r.json().catch(()=>null); if(!r.ok||!j?.success) throw new Error(j?.message||`Falha ${method} ${path}`); return j; }

  // Fallback LocalStorage
  const LS_G = 'pv_mm_groups'; // array de grupos
  const LS_M_PREFIX = 'pv_mm_maps_'; // por grupo
  function lsRead(key, fallback){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v): (fallback===undefined? null: fallback); }catch{ return (fallback===undefined? null: fallback); }}
  function lsWrite(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }

  // Server models
  async function loadGroups(){
    try{ const j=await apiGet('mindmap_groups.php'); groups = Array.isArray(j.items)? j.items: []; lsWrite(LS_G, groups); }
    catch{ groups = lsRead(LS_G, []) || []; }
  }
  async function createGroup(title, course_id, subject_id){
    try{ const j = await apiSend('mindmap_groups.php','POST',{ title, course_id, subject_id }); return j.id; }
    catch{
      const list = lsRead(LS_G, []) || [];
      const id = Date.now().toString(36);
      list.push({ id, title: title||'Grupo', course_id: course_id||null, subject_id: subject_id||null, created: now(), maps_count: 0 });
      lsWrite(LS_G, list); groups = list; return id;
    }
  }
  async function updateGroup(id, patch){
    try { await apiSend(`mindmap_groups.php?id=${encodeURIComponent(id)}`,'PUT', patch||{}); }
    catch{ const list = lsRead(LS_G, []) || []; const g = list.find(x=> String(x.id)===String(id)); if (g) Object.assign(g, patch||{}); lsWrite(LS_G, list); groups = list; }
  }
  function render(host){
    host.innerHTML = `
      <div class="mm-wrap row g-0">
        <aside class="mm-sidebar col-auto p-3 border-end bg-light">
          <div class="mm-sidebar-header mb-2 d-flex align-items-center justify-content-between">
            <strong class="mm-title">Grupos de Mapas</strong>
            <div class="mm-controls d-flex gap-2 align-items-center">
              <input id="mm-search" class="form-control form-control-sm mm-search" placeholder="Pesquisar grupos..." />
              <button id="mm-new" class="btn btn-sm btn-primary">+ Grupo</button>
            </div>
          </div>
          <div id="mm-list" class="mm-list list-group"></div>
        </aside>
        <section class="mm-main col">
          <div id="mm-empty" class="mm-empty small text-muted p-3">Selecione um grupo.</div>
          <div id="mm-editor" class="mm-editor d-none">
            <div class="mm-editor-header d-flex align-items-center justify-content-between mb-2">
              <div class="mm-head-titles">
                <div id="mm-title" class="mm-title-current h5 mb-0" data-mm-id=""></div>
                <div id="mm-subtitle" class="small text-muted"></div>
              </div>
              <nav class="mm-header-actions d-flex align-items-center gap-2">
                <button id="map-new" class="btn btn-sm btn-outline-primary">+ Mapa</button>
                <div class="mm-actions-right">
                  <button id="mm-more" class="btn btn-sm btn-outline-secondary" aria-haspopup="true" aria-expanded="false" title="Mais opções">⋮</button>
                  <div id="mm-more-menu" class="mm-menu dropdown-menu" role="menu" aria-labelledby="mm-more">
                    <button class="dropdown-item" data-action="rename" role="menuitem">Renomear grupo</button>
                    <button class="dropdown-item text-danger" data-action="delete" role="menuitem">Excluir grupo</button>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item" data-action="export" role="menuitem">Exportar</button>
                    <button class="dropdown-item" data-action="import" role="menuitem">Importar</button>
                  </div>
                </div>
              </nav>
            </div>
            <div id="maps-bar" class="maps-bar mb-2"></div>
            <div class="mm-toolbar mb-2">
              <div class="mm-toolbar-row mm-toolbar-main btn-toolbar" role="toolbar">
                <div class="btn-group me-2" role="group"><button data-tool="select" class="btn btn-sm btn-outline-secondary" title="Selecionar">Selecionar</button><button data-tool="node" class="btn btn-sm btn-outline-secondary" title="Criar nó">+ Nó</button><button data-tool="edge" class="btn btn-sm btn-outline-secondary" title="Conectar nós">+ Ligação</button></div>
                <div class="toolbar-flex"></div>
                <label class="small mb-0 me-2">Matéria:</label>
                <select id="map-subject" class="form-select form-select-sm me-2"></select>
                <button id="map-delete" class="btn btn-sm btn-outline-danger me-1" title="Excluir selecionado">Excluir</button>
                <button id="map-save" class="btn btn-sm btn-primary">Salvar</button>
              </div>
              <div id="mm-adv-row" class="mm-toolbar-row mm-toolbar-advanced collapse" aria-hidden="true">
                <div class="mm-palette d-flex gap-2" role="list" aria-label="Paleta de nós (arraste para o canvas)">
                  <div class="mm-chip btn btn-sm btn-light" role="listitem" draggable="true" data-shape="round" data-fill="#ffffff" data-icon="💡" title="Ideia (arraste)">💡 Arred.</div>
                  <div class="mm-chip btn btn-sm btn-light" role="listitem" draggable="true" data-shape="rect" data-fill="#e0f2fe" data-icon="📝" title="Nota (arraste)">📝 Retâng.</div>
                  <div class="mm-chip btn btn-sm btn-light" role="listitem" draggable="true" data-shape="circle" data-fill="#dcfce7" data-icon="✅" title="Tópico (arraste)">✅ Círculo</div>
                </div>
                <div class="mt-2 d-flex gap-2 align-items-center flex-wrap">
                  <label class="small mb-0">Forma:</label>
                  <select id="mm-node-shape" class="form-select form-select-sm w-auto"><option value="round">Arred.</option><option value="rect">Retâng.</option><option value="circle">Círculo</option><option value="diamond">Losango</option></select>
                  <label class="small mb-0">Cor nó:</label>
                  <input id="mm-node-fill" type="color" value="#ffffff" />
                  <label class="small mb-0">Ícone:</label>
                  <input id="mm-node-icon" type="text" class="form-control form-control-sm w-auto" placeholder="ex: 💡"/>
                </div>
                <div class="mt-2 d-flex gap-2 align-items-center flex-wrap">
                  <label class="small mb-0">Linha:</label>
                  <select id="mm-edge-type" class="form-select form-select-sm w-auto"><option value="straight">Reta</option><option value="curved">Curva</option></select>
                  <label class="small mb-0">Estilo:</label>
                  <select id="mm-edge-dash" class="form-select form-select-sm w-auto"><option value="solid">Sólida</option><option value="dashed">Tracejada</option></select>
                  <label class="small mb-0">Cor:</label>
                  <input id="mm-edge-color" type="color" value="#475569" />
                  <label class="small mb-0">Esp.:</label>
                  <input id="mm-edge-width" type="number" min="1" max="8" value="2" class="form-control form-control-sm w-auto"/>
                  <label class="small mb-0"><input id="mm-edge-arrow" type="checkbox" checked/> Seta</label>
                </div>
              </div>
            </div>
            <div class="mindmap-shell position-relative">
              <canvas id="mm-canvas" width="1600" height="900" class="w-100 border"></canvas>
              <div id="mm-nodes-layer" class="mm-nodes-layer position-absolute top-0 start-0"></div>
              <div id="mm-props" class="mm-props d-none" aria-live="polite"></div>
              <button id="mm-add-node" class="btn btn-primary rounded-circle position-absolute" style="right:1rem;bottom:1rem; width:3rem; height:3rem;">+</button>
            </div>
          </div>
        </section>
      </div>
  `;

  renderSidebar();
  // estado inicial do botão de ferramenta
  try{ qsa('.mm-toolbar [data-tool]').forEach(b=> b.classList.toggle('active', b.getAttribute('data-tool')===toolState.active)); }catch{}
  }

  function renderSidebar(filter){
    const list = qs('#mm-list'); if(!list) return;
    let items = groups.slice();
    const q = (filter||'').trim().toLowerCase();
    if (q) items = items.filter(g => String(g.title||'').toLowerCase().includes(q));
    list.innerHTML = '';
    if (!items.length){
      const empty = document.createElement('div'); empty.className='mm-list-empty small text-muted p-2'; empty.textContent='Nenhum grupo'; list.appendChild(empty);
    }
    items.forEach(g => {
      const el = document.createElement('button'); el.className='list-group-item list-group-item-action mm-item d-flex justify-content-between align-items-center'; el.dataset.id=g.id;
      if (String(g.id)===String(currentGroupId)) el.classList.add('active');
      const count = typeof g.maps_count==='number'? g.maps_count: (Array.isArray(g.maps)? g.maps.length: 0);
      el.innerHTML = `<div><div class="mm-name fw-semibold">${g.title||'Grupo'}</div><div class="mm-count small text-muted">${count} mapas</div></div>
        <div class="mm-item-actions btn-group btn-group-sm" role="group"><button class="mm-action-rename btn btn-outline-secondary" data-id="${g.id}" title="Renomear">✎</button><button class="mm-action-delete btn btn-outline-danger" data-id="${g.id}" title="Excluir">🗑</button></div>`;
      list.appendChild(el);
    });
  }

  async function openGroup(id){
    const g = groups.find(x => String(x.id)===String(id)); if(!g) return; currentGroupId = g.id;
    if (!mapsCache.has(keyG(g.id))) { try { await loadMaps(g.id); } catch { mapsCache.set(keyG(g.id), []); } }
    qs('#mm-empty')?.classList.add('hidden');
    qs('#mm-editor')?.classList.remove('hidden');
    const title = qs('#mm-title'); if (title){ title.textContent = g.title; title.dataset.mmId = g.id; }
    const maps = mapsCache.get(keyG(g.id)) || [];
    qs('#mm-subtitle').textContent = `${maps.length} mapas` + (g.created ? ` • criado ${new Date(g.created).toLocaleDateString()}` : '');
    renderMapsBar(g);
    if (maps.length) loadMap(g.id, maps[0].id);
  }

  function renderMapsBar(group){
    const bar = qs('#maps-bar'); if(!bar) return; bar.innerHTML = '';
    const maps = mapsCache.get(keyG(group.id)) || [];
    const frag = document.createDocumentFragment();
    maps.forEach(m => {
      const el = document.createElement('div'); el.className='map-tab'; el.dataset.mapId=m.id;
      el.innerHTML = `<span class="map-title" title="Clique duas vezes para renomear">${m.title}</span><button class="btn-ghost map-action-delete" data-map-id="${m.id}" title="Excluir">🗑</button>`;
      el.addEventListener('click', (ev)=>{ if (ev.target.closest('.map-action-delete')) return; loadMap(group.id, m.id); qsa('.map-tab').forEach(t=>t.classList.toggle('active', t.dataset.mapId===String(m.id))); });
      el.addEventListener('dblclick', ()=> inlineRenameMap(group.id, m.id, el.querySelector('.map-title')));
      frag.appendChild(el);
    });
    const addBtn = document.createElement('button'); addBtn.className='mm-btn mm-btn--primary map-add'; addBtn.textContent = '+'; addBtn.title='Adicionar mapa'; addBtn.onclick = ()=> addMap(group.id); frag.appendChild(addBtn);
    bar.appendChild(frag);
  }

  async function addMap(groupId){
    try {
      const maps = mapsCache.get(keyG(groupId)) || [];
      const title = `Mapa ${maps.length + 1}`;
      // default subject from group
      let subId = '';
      try { const g = groups.find(x=> String(x.id)===String(groupId)); if (g && g.subject_id) subId = String(g.subject_id); } catch {}
      const id = await createMap(groupId, title, subId||null);
      mapsCache.delete(keyG(groupId)); await loadMaps(groupId);
      const g = groups.find(x=> String(x.id)===String(groupId)); renderMapsBar(g); loadMap(groupId, id);
    } catch {}
  }

  function inlineRenameMap(groupId, mapId, el){
    const maps = mapsCache.get(keyG(groupId)) || []; const m = maps.find(x=> String(x.id)===String(mapId)); if(!m) return;
    const prev = m.title; const input = document.createElement('input'); input.type='text'; input.value=prev; input.className='mm-inline-input';
    el.replaceWith(input); input.focus(); input.select();
    const done = (commit)=>{ const v = (commit? input.value.trim(): prev)||prev; m.title = v; updateMap(mapId,{ title:v }).catch(()=>{}); const g = groups.find(x=> String(x.id)===String(groupId)); renderMapsBar(g); loadMap(groupId, mapId); };
    input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') done(true); if (e.key==='Escape') done(false); });
    input.addEventListener('blur', ()=> done(true));
  }

  async function loadMap(groupId, mapId){
    await loadMaps(groupId);
    const maps = mapsCache.get(keyG(groupId)) || []; const m = maps.find(x=> String(x.id)===String(mapId)); if(!m) return;
    const data = m.data || defaultMapData(m.title);
    currentMapId = m.id;
    drawMap(data);
    // subjects
    try {
      const sel = qs('#map-subject'); if (sel){ const subs = (window.study && window.study.loadSubjects)? await window.study.loadSubjects(): []; sel.innerHTML = '<option value="">— Matéria (opcional) —</option>' + subs.map(s=>`<option value="${s.id}">${s.name}</option>`).join(''); sel.value = m.subject_id ? String(m.subject_id) : ''; sel.onchange = async ()=> { const val = sel.value || null; try { await updateMap(mapId,{ subject_id: val }); } catch {} } }
    } catch {}
  }

  // Mini editor de mapa (com ferramentas):
  let currentMapId = null;
  let currentData = null;
  // Tool/state
  const toolState = {
    active: 'select',
    node: { shape:'round', fill:'#ffffff', icon:'' },
    edge: { type:'straight', dashed:false, color:'#475569', width:2, arrow:true }
  };
  let selected = { type:null, id:null, edgeIndex:-1 };
  let edgePreview = null; // { from, tx, ty }
  let currentPainter = null; // função de repintura atual

  function drawMap(data){
    currentData = JSON.parse(JSON.stringify(data||defaultMapData('Mapa')));
    const canvas = qs('#mm-canvas'); const layer = qs('#mm-nodes-layer'); if(!canvas||!layer) return; layer.innerHTML='';
    const ctx = canvas.getContext('2d');
  function paint(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const edges = currentData.edges||[];
      for (let i=0;i<edges.length;i++){ const e=edges[i]; const a = currentData.nodes.find(n=>n.id===e.a); const b = currentData.nodes.find(n=>n.id===e.b); if (!a||!b) continue; if (selected.type==='edge' && selected.edgeIndex===i){ // draw others first
          continue;
        }
        drawEdge(ctx, a, b, normalizeEdgeStyle(e.style));
      }
      if (selected.type==='edge' && selected.edgeIndex>-1){ const e=edges[selected.edgeIndex]; if(e){ const a=currentData.nodes.find(n=>n.id===e.a); const b=currentData.nodes.find(n=>n.id===e.b); if(a&&b){ const st=normalizeEdgeStyle(e.style); const hi={...st, width:(st.width||2)+2, color:'#f59e0b'}; drawEdge(ctx,a,b,hi); } } }
      if (edgePreview && edgePreview.from){ const a = currentData.nodes.find(n=>n.id===edgePreview.from); if (a) drawEdge(ctx, a, {x:edgePreview.tx,y:edgePreview.ty}, normalizeEdgeStyle(toolState.edge), true); }
    }
  currentPainter = paint;
    function mountNodes(){
      for (const n of currentData.nodes){
  const el = document.createElement('div'); el.className='mm-node'; el.dataset.id=n.id; el.style.left = (n.x) + 'px'; el.style.top = (n.y) + 'px';
        el.dataset.shape = n.shape || 'round'; el.style.setProperty('--mm-node-fill', n.fill || '#ffffff');
        el.innerHTML = `<span class="mm-node-icon">${n.icon||''}</span><span class="mm-node-text" contenteditable="true"></span>`;
        el.querySelector('.mm-node-text').textContent = n.text||'Nó';
        el.addEventListener('input', ()=> { n.text = el.querySelector('.mm-node-text').textContent; });
        el.addEventListener('mousedown', (ev)=>{ if (toolState.active==='edge'){ startEdgeDrag(n.id, ev); } else { selectNode(n.id, el); } });
  makeDraggable(el, (dx,dy)=>{ n.x += dx; n.y += dy; el.style.left = (n.x) + 'px'; el.style.top = (n.y) + 'px'; if (typeof currentPainter==='function') currentPainter(); });
        layer.appendChild(el);
      }
    }
  paint(); mountNodes(); setupCanvasInteractions(canvas);
  }
  function makeDraggable(el, onDrag){
    let lastX=0, lastY=0, dragging=false;
  el.addEventListener('mousedown', (e)=>{ if (e.target.closest('.mm-node-text')) return; if (toolState.active!=='select') return; dragging=true; lastX=e.clientX; lastY=e.clientY; e.preventDefault(); });
    document.addEventListener('mousemove', (e)=>{ if(!dragging) return; const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; onDrag(dx,dy); });
    document.addEventListener('mouseup', ()=> dragging=false);
  }

  // Edge & selection helpers
  function normalizeEdgeStyle(s){ const d=s||{}; return { type:(d.type==='curved'?'curved':'straight'), dashed: !!(d.dashed || d.dash==='dashed' || d.type==='dashed'), color: d.color||'#475569', width: Math.max(1,Math.min(8, Number(d.width)||2)), arrow: d.arrow!==false }; }
  function drawEdge(ctx, a, b, st, preview){ ctx.save(); ctx.strokeStyle=st.color; ctx.lineWidth=st.width; ctx.setLineDash(st.dashed?[10,6]:[]); ctx.beginPath(); if (st.type==='curved' && b.x!==undefined){ const mx=(a.x+b.x)/2, my=(a.y+b.y)/2; const dx=b.x-a.x, dy=b.y-a.y; const len=Math.hypot(dx,dy)||1; const nx=-dy/len, ny=dx/len; const k=60; const cx=mx+nx*k, cy=my+ny*k; ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(cx,cy,b.x,b.y); ctx.stroke(); if (st.arrow && !preview) drawArrowheadQuadratic(ctx, a, {x:cx,y:cy}, b, st); } else { ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); if (st.arrow && !preview) drawArrowhead(ctx, a, b, st); } ctx.restore(); }
  function drawArrowhead(ctx, a, b, st){ const ang=Math.atan2(b.y-a.y,b.x-a.x); const size=8+(st.width||2); ctx.save(); ctx.fillStyle=st.color; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x - size*Math.cos(ang-Math.PI/6), b.y - size*Math.sin(ang-Math.PI/6)); ctx.lineTo(b.x - size*Math.cos(ang+Math.PI/6), b.y - size*Math.sin(ang+Math.PI/6)); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function drawArrowheadQuadratic(ctx, p0,p1,p2, st){ const t=0.98; const dx=2*(1-t)*(p1.x-p0.x)+2*t*(p2.x-p1.x); const dy=2*(1-t)*(p1.y-p0.y)+2*t*(p2.y-p1.y); drawArrowhead(ctx, {x:p2.x-dx,y:p2.y-dy}, p2, st); }
  let docListenersWired = false;
  function setupCanvasInteractions(canvas){
    if (!canvas.dataset.wired){
          canvas.addEventListener('mousedown', (e)=>{ const {x,y}=canvasCoords(canvas,e); const hit=hitTestEdge(x,y,8); if (hit.index!==-1){ selectEdge(hit.index); } else if (toolState.active==='node'){ addNodeAt(x,y); } else { clearSelection(); } });
          canvas.addEventListener('dblclick', (e)=>{ const {x,y}=canvasCoords(canvas,e); addNodeAt(x,y); });
      // Drag & drop de chips da paleta
      canvas.addEventListener('dragover', (e)=>{ e.preventDefault(); });
      canvas.addEventListener('drop', (e)=>{ e.preventDefault(); const dt=e.dataTransfer; if(!dt) return; const shape=dt.getData('mm/shape')||''; const fill=dt.getData('mm/fill')||''; const icon=dt.getData('mm/icon')||''; const {x,y}=canvasCoords(canvas,e); addNodeAt(x,y,{ shape, fill, icon }); });
      canvas.dataset.wired = '1';
    }
    if (!docListenersWired){
      document.addEventListener('mousemove', (e)=>{ if (edgePreview){ const p=canvasCoords(canvas,e); edgePreview.tx=p.x; edgePreview.ty=p.y; if (typeof currentPainter==='function') currentPainter(); } });
      document.addEventListener('mouseup', (e)=>{ if (edgePreview){ const target=findNodeAt(canvas,e); if (target && target.id!==edgePreview.from){ currentData.edges.push({ a: edgePreview.from, b: target.id, style: { ...toolState.edge } }); edgePreview=null; if (typeof currentPainter==='function') currentPainter(); saveDirty(); } else { edgePreview=null; if (typeof currentPainter==='function') currentPainter(); } } });
      docListenersWired = true;
    }
  }
  function canvasCoords(canvas, ev){ const r=canvas.getBoundingClientRect(); return { x: (ev.clientX-r.left)*(canvas.width/r.width), y: (ev.clientY-r.top)*(canvas.height/r.height) }; }
  function findNodeAt(canvas, ev){ const el=document.elementFromPoint(ev.clientX, ev.clientY); const node=el && el.closest('.mm-node'); if (!node) return null; const id=node.dataset.id; return currentData.nodes.find(n=> n.id===id)||null; }
  function hitTestEdge(x,y,tol){ const edges=currentData.edges||[]; for(let i=0;i<edges.length;i++){ const e=edges[i]; const a=currentData.nodes.find(n=>n.id===e.a); const b=currentData.nodes.find(n=>n.id===e.b); if(!a||!b) continue; const st=normalizeEdgeStyle(e.style); if (st.type==='curved'){ const mx=(a.x+b.x)/2,my=(a.y+b.y)/2; const dx=b.x-a.x, dy=b.y-a.y; const len=Math.hypot(dx,dy)||1; const nx=-dy/len, ny=dx/len; const k=60; const cx=mx+nx*k, cy=my+ny*k; for(let t=0;t<=1;t+=0.05){ const px=(1-t)*(1-t)*a.x + 2*(1-t)*t*cx + t*t*b.x; const py=(1-t)*(1-t)*a.y + 2*(1-t)*t*cy + t*t*b.y; if (Math.hypot(px-x, py-y) <= tol) return { index:i }; } } else { if (pointToSegmentDist(x,y,a.x,a.y,b.x,b.y) <= tol) return { index:i }; } } return { index:-1 }; }
  function pointToSegmentDist(px,py,x1,y1,x2,y2){ const dx=x2-x1, dy=y2-y1; if (dx===0&&dy===0) return Math.hypot(px-x1, py-y1); const t=Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy))); const x=x1+t*dx, y=y1+t*dy; return Math.hypot(px-x, py-y); }
  function startEdgeDrag(fromId, ev){ edgePreview = { from: fromId, tx: 0, ty: 0 }; }
  function selectNode(id, el){ selected={ type:'node', id, edgeIndex:-1 }; qsa('.mm-node').forEach(n=> n.classList.toggle('selected', n===el)); updatePropsPanel(); }
  function selectEdge(index){ selected={ type:'edge', id:null, edgeIndex:index }; qsa('.mm-node').forEach(n=> n.classList.remove('selected')); updatePropsPanel(); }
  function clearSelection(){ selected={ type:null, id:null, edgeIndex:-1 }; qsa('.mm-node').forEach(n=> n.classList.remove('selected')); updatePropsPanel(); }

  function addNodeAt(x,y,style){ if (!currentData) return; const id='n'+Math.random().toString(36).slice(2,7); const base={ shape: toolState.node.shape, fill: toolState.node.fill, icon: toolState.node.icon }; const st={ ...base, ...(style||{}) }; const n={ id, text:'Novo nó', x, y, shape: st.shape||base.shape, fill: st.fill||base.fill, icon: st.icon||base.icon, size:'md' }; currentData.nodes.push(n); drawMap(currentData); const el=document.querySelector(`.mm-node[data-id="${id}"]`); if (el) selectNode(id, el); saveDirty(); }

  async function saveCurrent(){
    if (!currentMapId || !currentData) return;
    try { await updateMap(currentMapId, { data: currentData }); } catch {}
  }

  function saveDirty(){ /* placeholder para futuras otimizações */ }

  function updatePropsPanel(){
    const p = qs('#mm-props'); if (!p) return;
    if (!selected.type){ p.classList.add('hidden'); p.innerHTML=''; return; }
    p.classList.remove('hidden');
    if (selected.type==='node'){
      const n = currentData.nodes.find(x=> x.id===selected.id); if (!n){ p.classList.add('hidden'); return; }
      p.innerHTML = `<div class="mm-props-inner"><strong>Nó</strong><label>Título<input id="mm-prop-text" type="text" value="${(n.text||'').replaceAll('"','&quot;')}"/></label><label>Forma<select id="mm-prop-shape"><option value="round">Arred.</option><option value="rect">Retâng.</option><option value="circle">Círculo</option><option value="diamond">Losango</option></select></label><label>Cor<input id="mm-prop-fill" type="color" value="${n.fill||'#ffffff'}"/></label><label>Ícone<input id="mm-prop-icon" type="text" value="${(n.icon||'').replaceAll('"','&quot;')}"/></label></div>`;
      const s = qs('#mm-prop-shape'); const f=qs('#mm-prop-fill'); const t=qs('#mm-prop-text'); const ic=qs('#mm-prop-icon');
      if (s) { s.value = n.shape||'round'; s.onchange = ()=>{ n.shape=s.value; const el=document.querySelector(`.mm-node[data-id="${n.id}"]`); if(el){ el.dataset.shape=n.shape; } saveDirty(); }; }
      if (f) { f.oninput = ()=>{ n.fill=f.value; const el=document.querySelector(`.mm-node[data-id="${n.id}"]`); if(el){ el.style.setProperty('--mm-node-fill', n.fill); } saveDirty(); }; }
      if (t) { t.oninput = ()=>{ n.text=t.value; const el=document.querySelector(`.mm-node[data-id="${n.id}"] .mm-node-text`); if(el){ el.textContent = n.text; } saveDirty(); }; }
      if (ic){ ic.oninput = ()=>{ n.icon=ic.value; const el=document.querySelector(`.mm-node[data-id="${n.id}"] .mm-node-icon`); if(el){ el.textContent = n.icon||''; } saveDirty(); }; }
    } else if (selected.type==='edge'){
      const e = currentData.edges[selected.edgeIndex]; if (!e){ p.classList.add('hidden'); return; }
      const st = normalizeEdgeStyle(e.style);
      p.innerHTML = `<div class="mm-props-inner"><strong>Linha</strong><label>Tipo<select id="mm-prop-edge-type"><option value="straight">Reta</option><option value="curved">Curva</option></select></label><label>Estilo<select id="mm-prop-edge-dash"><option value="solid">Sólida</option><option value="dashed">Tracejada</option></select></label><label>Cor<input id="mm-prop-edge-color" type="color" value="${st.color}"/></label><label>Espessura<input id="mm-prop-edge-width" type="number" min="1" max="8" value="${st.width}"/></label><label class="check"><input id="mm-prop-edge-arrow" type="checkbox" ${st.arrow?'checked':''}/> Seta</label></div>`;
      const type=qs('#mm-prop-edge-type'), dash=qs('#mm-prop-edge-dash'), col=qs('#mm-prop-edge-color'), w=qs('#mm-prop-edge-width'), ar=qs('#mm-prop-edge-arrow');
      if (type){ type.value=st.type; type.onchange=()=>{ e.style = { ...(e.style||{}), type: type.value }; drawMap(currentData); saveDirty(); }; }
      if (dash){ dash.value=st.dashed?'dashed':'solid'; dash.onchange=()=>{ const dashed = dash.value==='dashed'; e.style = { ...(e.style||{}), dashed }; drawMap(currentData); saveDirty(); }; }
      if (col){ col.oninput=()=>{ e.style = { ...(e.style||{}), color: col.value }; drawMap(currentData); saveDirty(); }; }
      if (w){ w.oninput=()=>{ const val=Math.max(1,Math.min(8,Number(w.value)||2)); e.style = { ...(e.style||{}), width: val }; drawMap(currentData); saveDirty(); }; }
      if (ar){ ar.onchange=()=>{ e.style = { ...(e.style||{}), arrow: !!ar.checked }; drawMap(currentData); saveDirty(); }; }
    }
  }

  function wire(host){
    if (!host || host.dataset.wired) return; host.dataset.wired='1';
    host.addEventListener('click', async (e)=>{
      const item = e.target.closest('.mm-item'); if (item && !e.target.closest('.mm-action-delete') && !e.target.closest('.mm-action-rename')) { openGroup(item.dataset.id); return; }
      if (e.target.id==='mm-new'){ const t = await pv.prompt('Título do grupo:', 'Meus Mapas'); if (t===null) return; let subId=''; try{ const gsubs=(window.study&&window.study.loadSubjects)? await window.study.loadSubjects():[]; if(gsubs.length){ const sel = await pv.select('Matéria do grupo (opcional):', gsubs.map(s=>({value:s.id,label:s.name})), true); if (sel!==null) subId=String(sel||''); } }catch{}
        try{ const gid=await createGroup(t.trim()||'Meus Mapas', null, subId||null); await createMap(gid,'Mapa 1', subId||null); await loadGroups(); renderSidebar(); openGroup(gid);}catch{}
        return; }
  if (e.target.classList.contains('mm-action-rename')){ const id=e.target.dataset.id; const el=document.querySelector(`.mm-item[data-id="${id}"] .mm-name`); const v=await pv.prompt('Novo nome do grupo:', el? el.textContent: 'Grupo'); if (v!==null){ try{ await updateGroup(id,{ title: v.trim()||'Grupo' }); await loadGroups(); renderSidebar(); openGroup(id);}catch{} } return; }
  if (e.target.classList.contains('mm-action-delete')){ const id=e.target.dataset.id; const ok=await pv.confirm('Excluir grupo e todos os mapas?'); if (ok){ try{ await deleteGroup(id); mapsCache.delete(keyG(id)); await loadGroups(); renderSidebar(); qs('#mm-editor')?.classList.add('hidden'); qs('#mm-empty')?.classList.remove('hidden'); }catch{} } return; }
      if (e.target.id==='map-new'){ const gid = qs('#mm-title')?.dataset.mmId; if (gid) addMap(gid); return; }
      // menu Mais
      const moreBtn = e.target.closest('#mm-more'); if (moreBtn){ const menu=qs('#mm-more-menu'); if(menu){ const open=!menu.classList.contains('show'); menu.classList.toggle('show', open); menu.classList.toggle('hidden', !open); moreBtn.setAttribute('aria-expanded', open? 'true':'false'); } return; }
  const itemMenu = e.target.closest('#mm-more-menu [role="menuitem"]'); if(itemMenu){ const action=itemMenu.getAttribute('data-action'); const gid = qs('#mm-title')?.dataset.mmId; const menu=qs('#mm-more-menu'); if(menu){ menu.classList.remove('show'); menu.classList.add('hidden'); }
  const map = { rename: async ()=>{ if(!gid) return; const g=groups.find(x=> String(x.id)===String(gid)); if(!g) return; const v=await pv.prompt('Novo nome:', g.title); if (v!==null){ try{ await updateGroup(gid,{ title: v.trim()||g.title }); await loadGroups(); renderSidebar(); openGroup(gid);}catch{} } }, delete: async ()=>{ if(!gid) return; const ok=await pv.confirm('Excluir grupo?'); if (ok){ try{ await deleteGroup(gid); mapsCache.delete(keyG(gid)); await loadGroups(); renderSidebar(); qs('#mm-editor')?.classList.add('hidden'); qs('#mm-empty')?.classList.remove('hidden'); }catch{} } }, export: async ()=>{ try{ await loadGroups(); const out=[]; for(const g of groups){ const maps=await loadMaps(g.id); out.push({ ...g, maps: maps.map(m=>({ id:m.id, title:m.title, subject_id:m.subject_id||null, data:m.data||defaultMapData(m.title) })) }); } const blob=new Blob([JSON.stringify(out,null,2)],{ type:'application/json' }); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='mindmaps.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);}catch{} }, import: ()=>{ const input=document.createElement('input'); input.type='file'; input.accept='application/json'; input.onchange=()=>{ if(input.files&&input.files[0]) importJson(input.files[0]); }; input.click(); } };
  if (map[action]) map[action](); return; }
  const del = e.target.closest('.map-action-delete'); if (del){ const mapId=del.dataset.mapId; const gid = qs('#mm-title')?.dataset.mmId; if (gid && mapId){ const ok = await pv.confirm('Excluir este mapa?'); if (ok){ try{ await deleteMap(mapId); mapsCache.delete(keyG(gid)); await loadMaps(gid); const g = groups.find(x=> String(x.id)===String(gid)); renderMapsBar(g); openGroup(gid);}catch{} } } return; }
  const saveBtn = e.target.closest('#map-save'); if (saveBtn){ saveCurrent(); return; }
  const delBtn = e.target.closest('#map-delete'); if (delBtn){ if (selected.type==='node'){ const i=currentData.nodes.findIndex(n=> n.id===selected.id); if(i!==-1){ currentData.edges=(currentData.edges||[]).filter(e=> e.a!==selected.id && e.b!==selected.id); currentData.nodes.splice(i,1); drawMap(currentData); clearSelection(); saveDirty(); } } else if (selected.type==='edge'){ if(selected.edgeIndex>-1){ currentData.edges.splice(selected.edgeIndex,1); drawMap(currentData); clearSelection(); saveDirty(); } } return; }
  const advTgl = e.target.closest('#mm-adv-toggle'); if (advTgl){ const row = qs('#mm-adv-row'); if(row){ const open = row.classList.contains('hidden'); row.classList.toggle('hidden', !open); row.setAttribute('aria-hidden', open? 'false':'true'); advTgl.textContent = open? 'Estilo ▴':'Estilo ▾'; } return; }
  const toolBtn = e.target.closest('.mm-toolbar [data-tool]'); if (toolBtn){ const newTool = toolBtn.getAttribute('data-tool'); const same = newTool===toolState.active; toolState.active = newTool; qsa('.mm-toolbar [data-tool]').forEach(b=> b.classList.toggle('active', b===toolBtn)); if (newTool==='node' && same){ addNodeAtCenter(); } return; }
    });
  function addNodeAtCenter(){ const canvas=qs('#mm-canvas'); if(!canvas) return; const x=canvas.width/2, y=canvas.height/2; addNodeAt(x,y); }
    // inputs da toolbar (estado default)
    const ns = qs('#mm-node-shape'), nf = qs('#mm-node-fill'), ni = qs('#mm-node-icon');
  if (ns) ns.onchange = ()=> { toolState.node.shape = ns.value; if (selected.type==='node'){ const n=currentData.nodes.find(x=> x.id===selected.id); if(n){ n.shape=ns.value; const el=document.querySelector(`.mm-node[data-id="${n.id}"]`); if(el){ el.dataset.shape=n.shape; } } } };
  if (nf) nf.oninput = ()=> { toolState.node.fill = nf.value || '#ffffff'; if (selected.type==='node'){ const n=currentData.nodes.find(x=> x.id===selected.id); if(n){ n.fill = toolState.node.fill; const el=document.querySelector(`.mm-node[data-id="${n.id}"]`); if(el){ el.style.setProperty('--mm-node-fill', n.fill); } } } };
  if (ni) ni.oninput = ()=> { toolState.node.icon = ni.value || ''; if (selected.type==='node'){ const n=currentData.nodes.find(x=> x.id===selected.id); if(n){ n.icon = toolState.node.icon; const el=document.querySelector(`.mm-node[data-id="${n.id}"] .mm-node-icon`); if(el){ el.textContent = n.icon||''; } } } };
    const et = qs('#mm-edge-type'), ed = qs('#mm-edge-dash'), ec = qs('#mm-edge-color'), ew = qs('#mm-edge-width'), ea = qs('#mm-edge-arrow');
  if (et) et.onchange = ()=> { toolState.edge.type = et.value; if (selected.type==='edge'){ const e=currentData.edges[selected.edgeIndex]; if(e){ e.style = { ...(e.style||{}), type: et.value }; drawMap(currentData); } } };
  if (ed) ed.onchange = ()=> { toolState.edge.dashed = (ed.value==='dashed'); if (selected.type==='edge'){ const e=currentData.edges[selected.edgeIndex]; if(e){ e.style = { ...(e.style||{}), dashed: toolState.edge.dashed }; drawMap(currentData); } } };
  if (ec) ec.oninput = ()=> { toolState.edge.color = ec.value || '#475569'; if (selected.type==='edge'){ const e=currentData.edges[selected.edgeIndex]; if(e){ e.style = { ...(e.style||{}), color: toolState.edge.color }; drawMap(currentData); } } };
  if (ew) ew.oninput = ()=> { toolState.edge.width = Math.max(1, Math.min(8, Number(ew.value)||2)); if (selected.type==='edge'){ const e=currentData.edges[selected.edgeIndex]; if(e){ e.style = { ...(e.style||{}), width: toolState.edge.width }; drawMap(currentData); } } };
  if (ea) ea.onchange = ()=> { toolState.edge.arrow = !!ea.checked; if (selected.type==='edge'){ const e=currentData.edges[selected.edgeIndex]; if(e){ e.style = { ...(e.style||{}), arrow: toolState.edge.arrow }; drawMap(currentData); } } };
    // chips de paleta
    qsa('.mm-chip').forEach(ch=>{
      ch.addEventListener('dragstart', (ev)=>{ const dt=ev.dataTransfer; if(!dt) return; dt.setData('mm/shape', ch.dataset.shape||''); dt.setData('mm/fill', ch.dataset.fill||''); dt.setData('mm/icon', ch.dataset.icon||''); });
    });
    // botão flutuante add
    const addBtn = qs('#mm-add-node'); if (addBtn){ addBtn.onclick = ()=>{ const canvas=qs('#mm-canvas'); if(!canvas) return; // adiciona perto do centro visível
        const rect=canvas.getBoundingClientRect(); const x=canvas.width*(0.5); const y=canvas.height*(0.4); addNodeAt(x,y); }; }
    // tecla Delete para excluir seleção
    document.addEventListener('keydown', (ev)=>{ if ((ev.key==='Delete' || ev.key==='Backspace') && selected.type){ const delBtn = qs('#map-delete'); if(delBtn){ ev.preventDefault(); delBtn.click(); } } });
    // fechar menu mm-more ao clicar fora
    document.addEventListener('click', (ev)=>{ const menu=qs('#mm-more-menu'); const btn=qs('#mm-more'); if(!menu||!btn) return; if(menu.classList.contains('show')){ const inside = ev.target.closest('#mm-more') || ev.target.closest('#mm-more-menu'); if(!inside){ menu.classList.remove('show'); menu.classList.add('hidden'); btn.setAttribute('aria-expanded','false'); } } });
  }

  function addNode(){
  if (!currentData) return; const id = 'n'+Math.random().toString(36).slice(2,7);
  currentData.nodes.push({ id, text:'Novo nó', x: 200 + Math.random()*400, y: 120 + Math.random()*300, shape: toolState.node.shape, fill: toolState.node.fill, icon: toolState.node.icon, size:'md' });
  drawMap(currentData); const el=document.querySelector(`.mm-node[data-id="${id}"]`); if (el) selectNode(id, el);
  }
  async function startEdge(){
  if (!currentData) return; const nodes=currentData.nodes; if(nodes.length<2) { pv.toast('Crie ao menos dois nós.'); return; }
  const a = await pv.prompt('Id do nó A (ex: root):', nodes[0].id); if (!a) return; const b = await pv.prompt('Id do nó B:', nodes[1]?.id||''); if(!b) return; if (a===b){ pv.toast('Nó A e B não podem ser iguais.'); return; }
  currentData.edges.push({ a, b, style: { ...toolState.edge } }); drawMap(currentData);
  }

  function importJson(file){ const r=new FileReader(); r.onload = async ()=>{ try{ const parsed=JSON.parse(r.result); if (!Array.isArray(parsed)) throw new Error('Formato inválido'); for(const g of parsed){ const gid = await createGroup(g.title||'Grupo', g.course_id||null, g.subject_id||null); if (Array.isArray(g.maps)){ for(const m of g.maps){ await apiSend('mindmaps.php','POST',{ group_id: gid, title: m.title||'Mapa', subject_id: m.subject_id||null, data: m.data||defaultMapData(m.title) }); } } } await loadGroups(); renderSidebar(); }catch{} } ; r.readAsText(file); }

  async function mount(host){ try { if(!host) return; if (host.dataset.mounted) return; host.dataset.mounted='1'; host.innerHTML = '<div class="mount-mindmaps-msg">Carregando Mapas Mentais...</div>'; await render(host); wire(host); if (groups && groups.length){ await loadGroups(); try { const params=new URLSearchParams(location.search); const gParam=params.get('g'); if (gParam && groups.some(g=> String(g.id)===String(gParam))) openGroup(gParam); else openGroup(groups[0].id); } catch { openGroup(groups[0].id); } } } catch (e) { try{ host.innerHTML = '<div class="mount-mindmaps-err">Erro ao carregar mapas. Verifique o console.</div>'; }catch{} }
  }

  window.mountMindMaps = mount;
})();
