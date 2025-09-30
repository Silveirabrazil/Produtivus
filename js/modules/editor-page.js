// Recursos de página: régua, margens, cabeçalho/rodapé e composição do conteúdo
(function(global){
  'use strict';

  const PX_PER_CM = 37.7952755906; // ~96dpi

  function cmToPx(cm){ return Math.max(0, (parseFloat(cm)||0) * PX_PER_CM); }
  function pxToCm(px){ return Math.max(0, (parseFloat(px)||0) / PX_PER_CM); }

  function ensureHeaderFooter(root){
    // Removemos o cabeçalho por solicitação: não criar, e se existir, remover.
    let header = root.querySelector('[data-editor-header]');
    let footer = root.querySelector('[data-editor-footer]');
    const area = root.querySelector('[data-editor-area]');
    if (header) { try { header.remove(); } catch(e){} header = null; }
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'editor-footer form-control';
      footer.setAttribute('contenteditable','true');
      footer.setAttribute('data-editor-footer','');
      footer.setAttribute('role','textbox');
      footer.setAttribute('aria-label','Rodapé');
      footer.hidden = true;
      area.parentElement.appendChild(footer);
    }
    return { header, footer, area };
  }

  function buildRuler(root){
    const { area } = ensureHeaderFooter(root);
    if (!area) return;
    let ruler = root.querySelector('.editor-ruler');
    if (!ruler) {
      ruler = document.createElement('div');
      ruler.className = 'editor-ruler';
      ruler.innerHTML = '<div class="ticks"></div><div class="handles"><span class="h-left" title="Margem esquerda" role="slider" aria-label="Margem esquerda"></span><span class="h-first" title="Recuo 1ª linha" role="slider" aria-label="Recuo da primeira linha"></span><span class="h-right" title="Margem direita" role="slider" aria-label="Margem direita"></span></div>';
      area.parentElement.insertBefore(ruler, area);
    }
    // Observer para redimensionamento do editor sem acumular listeners
    try {
      if (!root._pvRulerObserver) {
        const ro = new ResizeObserver(() => { try { drawTicks(ruler, area.clientWidth); positionHandles(root); } catch(e){} });
        ro.observe(area);
        root._pvRulerObserver = ro;
      }
    } catch(e) {
      // fallback: escuta resize global uma vez
      if (!root._pvRulerResizeBound) {
        window.addEventListener('resize', () => { try { drawTicks(ruler, area.clientWidth); positionHandles(root); } catch(err){} });
        root._pvRulerResizeBound = true;
      }
    }
    drawTicks(ruler, area.clientWidth);
    positionHandles(root);
    attachDrag(root, ruler);
  }

  function drawTicks(ruler, width){
    const ticks = ruler.querySelector('.ticks');
    if (!ticks) return;
    ticks.innerHTML='';
    const pxPerCm = PX_PER_CM;
    const majorEveryCm = 1; // marca maior a cada 1cm
    const minorDivisions = 2; // menores a cada 0,5cm
    const minorStepPx = pxPerCm / minorDivisions;
    const majorStepPx = pxPerCm * majorEveryCm;
    const max = Math.max(0, width);
    for (let x = 0; x <= max + 0.5; x += minorStepPx){
      const t = document.createElement('i');
      t.style.left = Math.round(x) + 'px';
      const isMajor = Math.abs((x % majorStepPx)) < 0.5;
      t.className = isMajor ? 't major' : 't';
      if (isMajor){
        const cm = Math.round(pxToCm(x));
        const l = document.createElement('b');
        l.textContent = String(cm);
        l.style.left = Math.round(x) + 'px';
        ticks.appendChild(l);
      }
      ticks.appendChild(t);
    }
  }

  function getSettings(root){
    const def = { marginLeftCm: 2.5, marginRightCm: 2.5, marginTopCm: 2, marginBottomCm: 2, showHeader: false, showFooter: false, firstLineCm: 0 };
    try { const s = root._pvPageSettings; return Object.assign({}, def, s||{}); } catch(e){ return def; }
  }
  function setSettings(root, s){ root._pvPageSettings = Object.assign(getSettings(root), s||{}); applySettings(root); }

  function applySettings(root){
    const { area, header, footer } = ensureHeaderFooter(root);
    const s = getSettings(root);
    area.style.paddingLeft = cmToPx(s.marginLeftCm)+'px';
    area.style.paddingRight = cmToPx(s.marginRightCm)+'px';
  // Sem cabeçalho: apenas aplica rodapé
  footer.style.marginTop = cmToPx(s.marginBottomCm)+'px';
  if (footer) footer.hidden = !s.showFooter;
    // first line: aplica em parágrafos do corpo via CSS inline no area
    area.style.textIndent = s.firstLineCm ? (cmToPx(s.firstLineCm)+'px') : '';
    positionHandles(root);
  }

  function positionHandles(root){
    const { area } = ensureHeaderFooter(root);
    const s = getSettings(root);
    const handles = root.querySelector('.editor-ruler .handles');
    if (!handles) return;
    const w = area.clientWidth;
    const ml = cmToPx(s.marginLeftCm);
    const mr = cmToPx(s.marginRightCm);
    const fl = cmToPx(s.firstLineCm);
    handles.querySelector('.h-left').style.left = ml+'px';
    handles.querySelector('.h-right').style.left = (w - mr) + 'px';
    handles.querySelector('.h-first').style.left = (ml + fl) + 'px';
  }

  function attachDrag(root, ruler){
    if (root._pvRulerDragBound) return; // evitar múltiplos binds
    const handles = ruler.querySelector('.handles');
    if (!handles) return;
    let dragging = null;
    let areaRect = null;
    function posToX(clientX){ return Math.max(0, clientX - (areaRect ? areaRect.left : 0)); }
    function onDown(e){
      const t = e.target; if (!t.classList) return;
      if (t.classList.contains('h-left')||t.classList.contains('h-right')||t.classList.contains('h-first')) {
        dragging = t; e.preventDefault();
        const { area } = ensureHeaderFooter(root); areaRect = area.getBoundingClientRect();
      }
    }
    function onMove(e){
      if (!dragging) return;
      const { area } = ensureHeaderFooter(root);
      const w = area.clientWidth;
      const s = getSettings(root);
      const minContentPx = 40; // largura mínima do conteúdo
      const x = Math.min(Math.max(0, posToX(e.clientX)), w);
      const mlPx = cmToPx(s.marginLeftCm);
      const mrPx = cmToPx(s.marginRightCm);
      if (dragging.classList.contains('h-left')) {
        const maxLeft = Math.max(0, w - minContentPx - mrPx);
        const clamped = Math.min(Math.max(0, x), maxLeft);
        setSettings(root, { marginLeftCm: pxToCm(clamped) });
      } else if (dragging.classList.contains('h-right')) {
        // x é a posição do handle a partir da esquerda; converter para margem direita
        const minX = Math.min(w, mlPx + minContentPx);
        const clampedX = Math.max(minX, Math.min(x, w));
        const newMrPx = Math.max(0, w - clampedX);
        setSettings(root, { marginRightCm: pxToCm(newMrPx) });
      } else if (dragging.classList.contains('h-first')) {
        const contentWidthPx = Math.max(0, w - mlPx - mrPx);
        const rel = Math.max(0, x - mlPx);
        const clampedRel = Math.min(rel, Math.max(0, contentWidthPx - 10));
        setSettings(root, { firstLineCm: pxToCm(clampedRel) });
      }
    }
    function onUp(){ dragging = null; areaRect = null; }
    handles.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    // Pointer Events para melhor compatibilidade (opcional)
    handles.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    root._pvRulerDragBound = true;
  }

  function getCompositeHtml(root){
  const { area, header, footer } = ensureHeaderFooter(root);
    const s = getSettings(root);
  const meta = `<!--pv:page-settings:${encodeURIComponent(JSON.stringify(s))}-->`;
  return meta + `\n<section data-editor-body>${area.innerHTML||''}</section>\n<section data-editor-footer>${footer.innerHTML||''}</section>`;
  }

  function setCompositeHtml(root, html){
  const { area, header, footer } = ensureHeaderFooter(root);
  if (!html) { area.innerHTML=''; if (footer) footer.innerHTML=''; return; }
    try {
      const metaMatch = html.match(/<!--pv:page-settings:([^>]*)-->/);
      if (metaMatch) {
        const js = JSON.parse(decodeURIComponent(metaMatch[1]));
        setSettings(root, js);
      }
    } catch(e){}
    const temp = document.createElement('div'); temp.innerHTML = html;
    const b = temp.querySelector('[data-editor-body]');
    const f = temp.querySelector('[data-editor-footer]');
    // Sem cabeçalho: ignora conteúdo de header
    area.innerHTML = b ? b.innerHTML : html; // fallback: inteiro vira corpo
    footer.innerHTML = f ? f.innerHTML : '';
  }

  function toggleHeader(root){ /* header desativado */ }
  function toggleFooter(root){ const s = getSettings(root); setSettings(root, { showFooter: !s.showFooter }); }

  function init(root){ ensureHeaderFooter(root); buildRuler(root); applySettings(root); window.addEventListener('resize', ()=> buildRuler(root)); }

  global.PVEditorPage = { init, getSettings, setSettings, toggleHeader, toggleFooter, getCompositeHtml, setCompositeHtml };
})(window);
