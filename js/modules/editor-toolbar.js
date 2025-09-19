// Toolbar do editor: popula fontes, tamanhos, cores e faz o binding dos botões
(function(global){
	'use strict';
	const C = global.PVEditorCommands;

	const webSafeFonts = [
		'Arial','Arial Black','Verdana','Tahoma','Trebuchet MS','Impact','Times New Roman','Georgia','Garamond','Courier New','Brush Script MT',
		'Dosis','Segoe UI','Roboto','Inter','Monaco','Menlo','Consolas'
	];
	const sizes = [1,2,3,4,5,6,7]; // mapeado pelo execCommand fontSize
	// Paleta agora centralizada em PVColorPalette (mesmo padrão das planilhas)
	const paletteBase = (global.PVColorPalette && global.PVColorPalette.base) ? global.PVColorPalette.base : [
		'#000000','#404040','#7f7f7f','#bfbfbf','#d9d9d9','#efefef','#ffffff'
	];
	const paletteStandard = (global.PVColorPalette && global.PVColorPalette.standard) ? global.PVColorPalette.standard : ['#000000','#7f7f7f','#ffffff'];

	function buildFonts(ul, onPick){
		ul.innerHTML = '';
		webSafeFonts.forEach(f => {
			const li = document.createElement('li');
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'dropdown-item';
			btn.style.fontFamily = f + ', system-ui, sans-serif';
			btn.textContent = f;
			btn.addEventListener('click', () => onPick(f));
			li.appendChild(btn);
			ul.appendChild(li);
		});
	}

	function buildSizes(ul, onPick){
		ul.innerHTML = '';
		sizes.forEach(s => {
			const li = document.createElement('li');
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'dropdown-item';
			btn.textContent = 'Tamanho ' + s;
			btn.addEventListener('click', () => onPick(s));
			li.appendChild(btn);
			ul.appendChild(li);
		});
	}

	function buildColorMenu(container, onPick, kind){
		container.innerHTML = '';
		const wrap = document.createElement('div');
		wrap.className = 'pv-color-menu';
		// Base grid
		const grid = document.createElement('div');
		grid.className = 'pv-color-grid';
		paletteBase.forEach(c=>{
			const b = document.createElement('button'); b.type='button'; b.className='pv-swatch'; b.style.background=c; b.title=c; b.addEventListener('click', ()=> onPick(c)); grid.appendChild(b);
		});
		wrap.appendChild(grid);
		// Standard row
		const rowTitle = document.createElement('div'); rowTitle.className='pv-color-subtitle'; rowTitle.textContent='Padrão'; wrap.appendChild(rowTitle);
		const row = document.createElement('div'); row.className='pv-color-row';
		paletteStandard.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.className='pv-swatch'; b.style.background=c; b.title=c; b.addEventListener('click', ()=> onPick(c)); row.appendChild(b); });
		wrap.appendChild(row);
		// Custom picker
		const customTitle = document.createElement('div'); customTitle.className='pv-color-subtitle'; customTitle.textContent='Personalizada'; wrap.appendChild(customTitle);
		const customWrap = document.createElement('div'); customWrap.className='pv-color-custom';
		const input = document.createElement('input'); input.type='color'; input.className='form-control form-control-color form-control-sm'; input.value = '#333333'; input.addEventListener('input', ()=> onPick(input.value)); customWrap.appendChild(input);
		const resetBtn = document.createElement('button'); resetBtn.type='button'; resetBtn.className='btn btn-link btn-sm p-0 ms-2'; resetBtn.textContent='Redefinir'; resetBtn.addEventListener('click', ()=> onPick(kind==='back'? '#ffff00': '#000000'));
		customWrap.appendChild(resetBtn);
		wrap.appendChild(customWrap);
		container.appendChild(wrap);
	}

	function bindToolbar(root){
		const area = root.querySelector('[data-editor-area]');
		const toolbar = root.querySelector('[data-editor-toolbar]');
		if(!area || !toolbar) return;

		// Botões simples com execCommand
		toolbar.querySelectorAll('[data-editor-command]').forEach(btn => {
			btn.addEventListener('click', () => {
				const cmd = btn.getAttribute('data-editor-command');
				C.apply(cmd);
				area.focus();
			});
		});

		// Dropdowns
		const fontsUl = toolbar.querySelector('[data-editor-fonts]');
		if (fontsUl) buildFonts(fontsUl, (f)=>{ C.setFontName(f); area.focus(); });
		const sizesUl = toolbar.querySelector('[data-editor-sizes]');
		if (sizesUl) buildSizes(sizesUl, (s)=>{ C.setFontSize(s); area.focus(); });

		const foreGrid = toolbar.querySelector('[data-editor-fore-colors]');
		if (foreGrid) buildColorMenu(foreGrid, (c)=>{ C.setForeColor(c); area.focus(); }, 'fore');
		const backGrid = toolbar.querySelector('[data-editor-back-colors]');
		if (backGrid) buildColorMenu(backGrid, (c)=>{ C.setBackColor(c); area.focus(); }, 'back');

		const foreCustom = toolbar.querySelector('[data-editor-fore-custom]');
		if (foreCustom) foreCustom.addEventListener('input', ()=>{ C.setForeColor(foreCustom.value); area.focus(); });
		const backCustom = toolbar.querySelector('[data-editor-back-custom]');
		if (backCustom) backCustom.addEventListener('input', ()=>{ C.setBackColor(backCustom.value); area.focus(); });

		const blocks = toolbar.querySelector('[data-editor-blocks]');
		if (blocks) blocks.querySelectorAll('[data-format-block]').forEach(b=>{
			b.addEventListener('click', ()=>{ C.formatBlock(b.getAttribute('data-format-block')); area.focus(); });
		});

		// Inserções via modais
		toolbar.querySelectorAll('[data-editor-insert]')?.forEach(btn => {
			btn.addEventListener('click', () => {
				const type = btn.getAttribute('data-editor-insert');
				if (type === 'link') showLinkModal(root, area);
				if (type === 'image') showImageModal(root, area);
				if (type === 'table') showTableModal(root, area);
			});
		});

		// Tabela - Bordas
		const bordersMenu = toolbar.querySelector('[data-editor-table-borders]');
		if (bordersMenu) {
			bordersMenu.querySelectorAll('[data-table-border]')?.forEach(item=>{
				item.addEventListener('click', ()=>{
					const action = item.getAttribute('data-table-border');
					if (action === 'dialog') return showBordersDialog(root, area);
					if (action === 'gridlines') return toggleGridlines(root);
					if (action === 'draw') return enableDrawTable(area);
					if (action === 'hr') return document.execCommand('insertHorizontalRule');
					const ui = getBorderUI(bordersMenu);
					applyBorderAction(area, action, ui);
				});
			});
		}
	}

		function ensureInBody(el){
			if (!el) return el;
			if (el.parentElement !== document.body) {
				document.body.appendChild(el);
			}
			return el;
		}

	function showLinkModal(root, area){
			let el = document.getElementById('editorLinkModal') || root.querySelector('#editorLinkModal');
			el = ensureInBody(el);
			if (!el) return;
			const hasJQ = !!(window.jQuery && jQuery.fn && jQuery.fn.modal);
		const prevFocus = document.activeElement;
		const url = el.querySelector('[data-editor-link-url]');
		const blank = el.querySelector('[data-editor-link-blank]');
		const confirmBtn = el.querySelector('[data-editor-confirm-link]');
		url.value = '';
		blank.checked = true;
			const onConfirm = ()=>{ area.focus(); PVEditorCommands.insertLink(url.value.trim(), blank.checked); if (hasJQ) { jQuery(el).modal('hide'); } else { hideFallback(el); } cleanup(); };
		function restoreFocus(){ if (prevFocus && typeof prevFocus.focus === 'function') { prevFocus.focus(); } else { area?.focus(); } }
		function cleanup(){ confirmBtn.removeEventListener('click', onConfirm); el.removeEventListener('hidden.bs.modal', onHidden); restoreFocus(); }
		function onHidden(){ cleanup(); }
		confirmBtn.addEventListener('click', onConfirm);
		el.addEventListener('hidden.bs.modal', onHidden);
		if (hasJQ) { el.removeAttribute('inert'); jQuery(el).modal('show'); }
			else {
				// Fallback básico sem Bootstrap (sem backdrop real)
				showFallback(el);
			}
		setTimeout(()=>url.focus(), 100);
	}

	function showImageModal(root, area){
			let el = document.getElementById('editorImageModal') || root.querySelector('#editorImageModal');
			el = ensureInBody(el);
			if (!el) return;
			const hasJQ = !!(window.jQuery && jQuery.fn && jQuery.fn.modal);
		const prevFocus = document.activeElement;
		const url = el.querySelector('[data-editor-image-url]');
		const alt = el.querySelector('[data-editor-image-alt]');
		const file = el.querySelector('[data-editor-image-file]');
		const confirmBtn = el.querySelector('[data-editor-confirm-image]');
		url.value = '';
		alt.value = '';
		if (file) try { file.value = ''; } catch(e){}
			const onConfirm = ()=>{
				if (confirmBtn) confirmBtn.disabled = true;
				const doInsert = (src)=>{ area.focus(); PVEditorCommands.insertImage(src, alt.value.trim()); if (hasJQ) jQuery(el).modal('hide'); cleanup(); };
				const urlVal = (url.value||'').trim();
				if (file && file.files && file.files[0]) {
					const reader = new FileReader();
					reader.onload = ()=> doInsert(reader.result);
					reader.readAsDataURL(file.files[0]);
				} else if (urlVal) {
					doInsert(urlVal);
				}
			};
		function restoreFocus(){ if (prevFocus && typeof prevFocus.focus === 'function') { prevFocus.focus(); } else { area?.focus(); } }
		function cleanup(){ if (confirmBtn) confirmBtn.disabled = false; confirmBtn.removeEventListener('click', onConfirm); el.removeEventListener('hidden.bs.modal', onHidden); restoreFocus(); }
		function onHidden(){ cleanup(); }
		confirmBtn.addEventListener('click', onConfirm);
		el.addEventListener('hidden.bs.modal', onHidden);
		if (hasJQ) { el.removeAttribute('inert'); jQuery(el).modal('show'); }
			else {
				showFallback(el);
			}
		setTimeout(()=>url.focus(), 100);
	}

	// Suporte a arrastar/soltar imagem direto na área
	(function enableImageDrop(){
		const onDrop = (e)=>{
			const area = document.querySelector('.pv-editor [data-editor-area]');
			if (!area) return;
			if (!area.contains(e.target)) return; // só intercepta se o drop for na área do editor
			e.preventDefault();
			const files = e.dataTransfer?.files;
			if (files && files[0] && files[0].type.startsWith('image/')){
				const reader = new FileReader();
				reader.onload = ()=>{ PVEditorCommands.insertImage(reader.result, ''); area.focus(); };
				reader.readAsDataURL(files[0]);
			}
		};
		document.addEventListener('dragover', (e)=>{
			const area = document.querySelector('.pv-editor [data-editor-area]');
			if (area && area.contains(e.target)) e.preventDefault();
		});
		document.addEventListener('drop', onDrop);
	})();

	function showTableModal(root, area){
			let el = document.getElementById('editorTableModal') || root.querySelector('#editorTableModal');
			el = ensureInBody(el);
			if (!el) return;
			const hasJQ = !!(window.jQuery && jQuery.fn && jQuery.fn.modal);
		const prevFocus = document.activeElement;
		const rows = el.querySelector('[data-editor-table-rows]');
		const cols = el.querySelector('[data-editor-table-cols]');
		const confirmBtn = el.querySelector('[data-editor-confirm-table]');
		rows.value = '3'; cols.value = '3';
			const onConfirm = ()=>{ area.focus(); PVEditorCommands.insertTable(rows.value, cols.value); if (hasJQ) { jQuery(el).modal('hide'); } else { hideFallback(el); } cleanup(); };
		function restoreFocus(){ if (prevFocus && typeof prevFocus.focus === 'function') { prevFocus.focus(); } else { area?.focus(); } }
		function cleanup(){ confirmBtn.removeEventListener('click', onConfirm); el.removeEventListener('hidden.bs.modal', onHidden); restoreFocus(); }
		function onHidden(){ cleanup(); }
		confirmBtn.addEventListener('click', onConfirm);
		el.addEventListener('hidden.bs.modal', onHidden);
		if (hasJQ) { el.removeAttribute('inert'); jQuery(el).modal('show'); }
			else {
				showFallback(el);
			}
		setTimeout(()=>rows.focus(), 100);
	}

	function cellRangeOrTable(area){
		const sel = window.getSelection();
		if (!sel || !sel.anchorNode) return {};
		const table = sel.anchorNode.parentElement?.closest('table');
		const cell = sel.anchorNode.parentElement?.closest('td,th');
		return { table, cell };
	}

	function getBorderUI(menu){
		const w = Math.max(0, parseInt(menu.querySelector('[data-table-ui-width]')?.value||1));
		const s = menu.querySelector('[data-table-ui-style]')?.value || 'solid';
		const c = menu.querySelector('[data-table-ui-color]')?.value || '#000';
		return { width:w, style:s, color:c, toCss(){ return `${w}px ${s} ${c}`; } };
	}

	function applyBorderAction(area, action, ui){
		const { table, cell } = cellRangeOrTable(area);
		if (!table) return;
		const cells = Array.from(table.querySelectorAll('td,th'));
		const border = (ui && ui.toCss) ? ui.toCss() : '1px solid #000';
		const clear = (el, sides)=>{
			sides.forEach(s=> el.style['border'+s] = '');
		};
		const set = (el, sides)=>{
			sides.forEach(s=> el.style['border'+s] = border);
		};
		if (action === 'none') cells.forEach(td=> clear(td, ['Top','Right','Bottom','Left']));
		if (action === 'all') cells.forEach(td=> set(td, ['Top','Right','Bottom','Left']));
		if (action === 'outer') {
			const rows = table.rows; const R = rows.length; const C = rows[0]?.cells.length||0;
			for(let r=0;r<R;r++) for(let c=0;c<C;c++){
				const td = rows[r].cells[c]; clear(td, ['Top','Right','Bottom','Left']);
				if (r===0) td.style.borderTop = border; if (r===R-1) td.style.borderBottom = border;
				if (c===0) td.style.borderLeft = border; if (c===C-1) td.style.borderRight = border;
			}
		}
		if (action === 'inner') {
			const rows = table.rows; const R = rows.length; const C = rows[0]?.cells.length||0;
			for(let r=0;r<R;r++) for(let c=0;c<C;c++){
				const td = rows[r].cells[c]; clear(td, ['Top','Right','Bottom','Left']);
				if (r>0) td.style.borderTop = border; if (r<R-1) td.style.borderBottom = border;
				if (c>0) td.style.borderLeft = border; if (c<C-1) td.style.borderRight = border;
			}
		}
		if (action === 'inside-horizontal') {
			const rows = table.rows; for(let r=1;r<rows.length;r++) for(let c=0;c<rows[r].cells.length;c++){ rows[r].cells[c].style.borderTop = border; }
		}
		if (action === 'inside-vertical') {
			const rows = table.rows; const C = rows[0]?.cells.length||0; for(let r=0;r<rows.length;r++) for(let c=1;c<C;c++){ rows[r].cells[c].style.borderLeft = border; }
		}
		if (action === 'bottom' && cell) cell.style.borderBottom = border;
		if (action === 'top' && cell) cell.style.borderTop = border;
		if (action === 'left' && cell) cell.style.borderLeft = border;
		if (action === 'right' && cell) cell.style.borderRight = border;
		if (action === 'diag-down' && cell) cell.style.backgroundImage = `linear-gradient(135deg, ${ui?.color||'#000'} 0, ${ui?.color||'#000'} 1px, transparent 1px)`;
		if (action === 'diag-up' && cell) cell.style.backgroundImage = `linear-gradient(45deg, ${ui?.color||'#000'} 0, ${ui?.color||'#000'} 1px, transparent 1px)`;
	}

	function showBordersDialog(root, area){
		let el = document.getElementById('editorTableBorderModal') || root.querySelector('#editorTableBorderModal');
		el = ensureInBody(el); if (!el) return;
		const hasJQ = !!(window.jQuery && jQuery.fn && jQuery.fn.modal);
		const prevFocus = document.activeElement;
		const width = el.querySelector('[data-table-border-width]');
		const style = el.querySelector('[data-table-border-style]');
		const color = el.querySelector('[data-table-border-color]');
		const applyBtn = el.querySelector('[data-table-border-apply]');
		const { table } = cellRangeOrTable(area); if (!table) return;
		const onApply = ()=>{
			const border = `${Math.max(0, parseInt(width.value||1))}px ${style.value||'solid'} ${color.value||'#000'}`;
			Array.from(table.querySelectorAll('td,th')).forEach(td=>{ td.style.border = border; td.style.backgroundImage=''; });
			if (hasJQ) { jQuery(el).modal('hide'); } else { hideFallback(el); }
			cleanup();
		};
		function restoreFocus(){ if (prevFocus && typeof prevFocus.focus === 'function') { prevFocus.focus(); } else { area?.focus(); } }
		function cleanup(){ applyBtn.removeEventListener('click', onApply); el.removeEventListener('hidden.bs.modal', onHidden); restoreFocus(); }
		function onHidden(){ cleanup(); }
		applyBtn.addEventListener('click', onApply);
		el.addEventListener('hidden.bs.modal', onHidden);
		if (hasJQ) { el.removeAttribute('inert'); jQuery(el).modal('show'); }
		else { showFallback(el); }
	}

	// Helpers para fallback sem Bootstrap
	function showFallback(el){
		el.classList.add('show');
		el.style.display='block';
		el.removeAttribute('aria-hidden');
		el.removeAttribute('inert');
		// Fechadores
	el.querySelectorAll('[data-bs-dismiss="modal"], [data-dismiss="modal"], .close, .btn-close')?.forEach(btn=> btn.addEventListener('click', ()=> hideFallback(el), { once:true }));
	}
	function hideFallback(el){
		// Evitar foco ficar dentro de um container aria-hidden
		if (el.contains(document.activeElement)) {
			try { document.activeElement.blur(); } catch(e){}
		}
		el.classList.remove('show');
		el.style.display='none';
		el.setAttribute('aria-hidden','true');
		el.setAttribute('inert','');
	}

	function toggleGridlines(root){
		const ed = root.querySelector('.pv-editor');
		ed?.classList.toggle('pv-gridlines');
	}

	global.PVEditorToolbar = { bindToolbar };
})(window);

