// Inicialização do Editor Produtivus
(function(global){
	'use strict';

	function countStats(area){
		const text = area.textContent || '';
		const words = (text.trim().match(/\S+/g) || []).length;
		const chars = text.length;
		return { words, chars };
	}

	function bindCounters(root){
		const area = root.querySelector('[data-editor-area]');
		const wordsEl = root.querySelector('[data-editor-words]');
		const charsEl = root.querySelector('[data-editor-chars]');
		function update(){ const s = countStats(area); if(wordsEl) wordsEl.textContent = String(s.words); if(charsEl) charsEl.textContent = String(s.chars); }
		area?.addEventListener('input', update);
		update();
	}

	function bindUndoRedo(root){
		const area = root.querySelector('[data-editor-area]');
		const undoBtn = root.querySelector('[data-editor-action="undo"]');
		const redoBtn = root.querySelector('[data-editor-action="redo"]');
		function restoreSel(){ try { if (window.PVEditorToolbar && typeof window.PVEditorToolbar.restoreSelection==='function'){ window.PVEditorToolbar.restoreSelection(); } } catch(e){} }
		undoBtn?.addEventListener('mousedown', (e)=>{ e.preventDefault(); });
		redoBtn?.addEventListener('mousedown', (e)=>{ e.preventDefault(); });
		undoBtn?.addEventListener('click', ()=>{ restoreSel(); document.execCommand('undo'); area.focus(); });
		redoBtn?.addEventListener('click', ()=>{ restoreSel(); document.execCommand('redo'); area.focus(); });
	}

	function bindShortcuts(root){
		const area = root.querySelector('[data-editor-area]');
		root.addEventListener('keydown', (e)=>{
			if(!(e.ctrlKey||e.metaKey)) return;
			const k = e.key.toLowerCase();
			const restoreSel = ()=>{ try { if (window.PVEditorToolbar && typeof window.PVEditorToolbar.restoreSelection==='function'){ window.PVEditorToolbar.restoreSelection(); } } catch(e){} };
			if (k==='b'){ e.preventDefault(); restoreSel(); document.execCommand('bold'); area.focus(); }
			if (k==='i'){ e.preventDefault(); restoreSel(); document.execCommand('italic'); area.focus(); }
			if (k==='u'){ e.preventDefault(); restoreSel(); document.execCommand('underline'); area.focus(); }
			if (k==='z'){ /* deixar default para desfazer */ }
			if (k==='y'){ /* deixar default para refazer */ }
		});
	}

	function getEditorHtml(){
		// Trecho essencial do markup do editor (antes era carregado de modules/editor.html)
		// Inclui: título, toolbar com controles, área editável, status e modais (link, imagem, tabela, bordas).
		return (
			'<section class="pv-editor" data-editor="pv" aria-label="Editor de texto rico">\n'
			+ '<div class="pv-editor-wrap">\n'
			+ '  <div class="row g-3">\n'
			+ '    <div class="col-12">\n'
			+ '      <div class="btn-toolbar gap-2" role="toolbar" aria-label="Ferramentas do editor" data-editor-toolbar>\n'
			+ '        <div class="btn-group" role="group" aria-label="Histórico">\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-action="undo" title="Desfazer (Ctrl+Z)">⟲</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-action="redo" title="Refazer (Ctrl+Y)">⟳</button>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Estilo">\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="bold" title="Negrito (Ctrl+B)"><strong>B</strong></button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="italic" title="Itálico (Ctrl+I)"><em>I</em></button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="underline" title="Sublinhado (Ctrl+U)"><u>U</u></button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="strikeThrough" title="Tachado"><s>S</s></button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="superscript" title="Sobrescrito">x<sup>2</sup></button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="subscript" title="Subscrito">x<sub>2</sub></button>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Fontes">\n'
			+ '          <div class="dropdown">\n'
			+ '            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Fonte</button>\n'
			+ '            <ul class="dropdown-menu p-1 max-h-280 overflow-auto" data-editor-fonts></ul>\n'
			+ '          </div>\n'
			+ '          <div class="dropdown">\n'
			+ '            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Tamanho</button>\n'
			+ '            <ul class="dropdown-menu p-1" data-editor-sizes></ul>\n'
			+ '          </div>\n'
			+ '          <input type="number" min="8" max="96" step="1" value="16" class="form-control form-control-sm size-input" title="Tamanho (px)" data-editor-size-input>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Cores">\n'
			+ '          <div class="dropdown">\n'
			+ '            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Cor</button>\n'
			+ '            <div class="dropdown-menu p-2 w-260">\n'
			+ '              <div class="color-grid" data-editor-fore-colors></div>\n'
			+ '              <div class="mt-2 d-flex align-items-center gap-2">\n'
			+ '                <label class="form-label m-0 small">Personalizada:</label>\n'
			+ '                <input type="color" class="form-control form-control-color" value="#333333" data-editor-fore-custom aria-label="Cor do texto">\n'
			+ '              </div>\n'
			+ '            </div>\n'
			+ '          </div>\n'
			+ '          <div class="dropdown">\n'
			+ '            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Fundo</button>\n'
			+ '            <div class="dropdown-menu p-2 w-260" data-menu-back>\n'
			+ '              <div class="color-grid" data-editor-back-colors></div>\n'
			+ '              <div class="mt-2 d-flex align-items-center gap-2">\n'
			+ '                <label class="form-label m-0 small">Personalizada:</label>\n'
			+ '                <input type="color" class="form-control form-control-color" value="#ffff00" data-editor-back-custom aria-label="Cor de fundo">\n'
			+ '              </div>\n'
			+ '            </div>\n'
			+ '          </div>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Parágrafo">\n'
			+ '          <div class="dropdown">\n'
			+ '            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Bloco</button>\n'
			+ '            <ul class="dropdown-menu" data-editor-blocks>\n'
			+ '              <li><button class="dropdown-item" type="button" data-format-block="p">Parágrafo</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-format-block="h1">Título 1</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-format-block="h2">Título 2</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-format-block="h3">Título 3</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-format-block="blockquote">Citação</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-format-block="pre">Código</button></li>\n'
			+ '            </ul>\n'
			+ '          </div>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="justifyLeft" title="Alinhar à esquerda">⇤</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="justifyCenter" title="Centralizar">≡</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="justifyRight" title="Alinhar à direita">⇥</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="justifyFull" title="Justificar">≣</button>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Listas e recuo">\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="insertUnorderedList" title="Lista pontuada">Lista</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="insertOrderedList" title="Lista numerada">Lista 1.</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="outdent" title="Diminuir recuo">Recuo −</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-command="indent" title="Aumentar recuo">Recuo +</button>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Inserir">\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-insert="link">Link</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-insert="image">Imagem</button>\n'
			+ '          <button class="btn btn-outline-secondary" type="button" data-editor-insert="table">Tabela</button>\n'
			+ '        </div>\n'
			+ '        <div class="btn-group" role="group" aria-label="Tabela">\n'
			+ '          <div class="dropdown">\n'
			+ '            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Bordas</button>\n'
			+ '            <ul class="dropdown-menu p-2" data-editor-table-borders>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="bottom">Borda Inferior</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="top">Borda Superior</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="left">Borda Esquerda</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="right">Borda Direita</button></li>\n'
			+ '              <li><hr class="dropdown-divider"></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="none">Sem Borda</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="all">Todas as Bordas</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="outer">Bordas Externas</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="inner">Bordas Internas</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="inside-horizontal">Borda Horizontal Interna</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="inside-vertical">Borda Vertical Interna</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="diag-down">Borda Diagonal Inferior</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="diag-up">Borda Diagonal Superior</button></li>\n'
			+ '              <li><hr class="dropdown-divider"></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="hr">Linha Horizontal</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="draw">Desenhar Tabela (pincel)</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="gridlines">Exibir Linhas de Grade</button></li>\n'
			+ '              <li><button class="dropdown-item" type="button" data-table-border="dialog">Bordas e Sombreamento…</button></li>\n'
			+ '              <li>\n'
			+ '                <div class="row g-2 px-1 pb-2 border-bottom mb-2">\n'
			+ '                  <div class="col-4">\n'
			+ '                    <label class="form-label small">Esp.</label>\n'
			+ '                    <input type="number" class="form-control form-control-sm" min="0" max="12" value="1" data-table-ui-width>\n'
			+ '                  </div>\n'
			+ '                  <div class="col-4">\n'
			+ '                    <label class="form-label small">Estilo</label>\n'
			+ '                    <select class="form-select form-select-sm" data-table-ui-style>\n'
			+ '                      <option value="solid" selected>Sólida</option>\n'
			+ '                      <option value="dashed">Tracejada</option>\n'
			+ '                      <option value="dotted">Pontilhada</option>\n'
			+ '                    </select>\n'
			+ '                  </div>\n'
			+ '                  <div class="col-4">\n'
			+ '                    <label class="form-label small">Cor</label>\n'
			+ '                    <input type="color" class="form-control form-control-color" value="#000000" data-table-ui-color>\n'
			+ '                  </div>\n'
			+ '                </div>\n'
			+ '              </li>\n'
			+ '            </ul>\n'
			+ '          </div>\n'
			+ '        </div>\n'
			+ '      </div>\n'
			+ '    </div>\n'
			+ '    <div class="col-12">\n'
			+ '      <div class="editor-area form-control" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-editor-area style="min-height:60vh;max-height:60vh;overflow:auto;"></div>\n'
			+ '    </div>\n'
			+ '    <div class="col-12">\n'
			+ '      <div class="editor-status d-flex flex-wrap align-items-center justify-content-between small text-muted">\n'
			+ '        <div><span data-editor-words>0</span> palavras · <span data-editor-chars>0</span> caracteres</div>\n'
			+ '        <div><span data-editor-save-status>Não salvo</span></div>\n'
			+ '      </div>\n'
			+ '    </div>\n'
			+ '  </div>\n'
			+ '</div>\n'
			+ '\n\n<!-- Modais (link, imagem, tabela, bordas) -->\n'
			+ '<div class="modal fade" id="editorLinkModal" tabindex="-1" aria-hidden="true">\n'
			+ '  <div class="modal-dialog modal-dialog-centered">\n'
			+ '    <div class="modal-content">\n'
			+ '      <div class="modal-header"><h5 class="modal-title">Inserir link</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>\n'
			+ '      <div class="modal-body"><input type="text" class="form-control" placeholder="URL do link" data-editor-link-url><input type="text" class="form-control mt-2" placeholder="Texto a exibir (opcional)" data-editor-link-text></div>\n'
			+ '      <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button><button type="button" class="btn btn-primary" data-editor-confirm-link>Inserir</button></div>\n'
			+ '    </div>\n'
			+ '  </div>\n'
			+ '</div>\n'
			+ '<div class="modal fade" id="editorImageModal" tabindex="-1" aria-hidden="true">\n'
			+ '  <div class="modal-dialog modal-dialog-centered">\n'
			+ '    <div class="modal-content">\n'
			+ '      <div class="modal-header"><h5 class="modal-title">Inserir imagem</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>\n'
			+ '      <div class="modal-body"><input type="text" class="form-control" placeholder="URL da imagem" data-editor-image-url></div>\n'
			+ '      <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button><button type="button" class="btn btn-primary" data-editor-confirm-image>Inserir</button></div>\n'
			+ '    </div>\n'
			+ '  </div>\n'
			+ '</div>\n'
			+ '<div class="modal fade" id="editorTableModal" tabindex="-1" aria-hidden="true">\n'
			+ '  <div class="modal-dialog modal-dialog-centered">\n'
			+ '    <div class="modal-content">\n'
			+ '      <div class="modal-header"><h5 class="modal-title">Inserir tabela</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>\n'
			+ '      <div class="modal-body"><div class="row"><div class="col"><input type="number" class="form-control" placeholder="Linhas" value="2" data-editor-table-rows></div><div class="col"><input type="number" class="form-control" placeholder="Colunas" value="2" data-editor-table-cols></div></div></div>\n'
			+ '      <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button><button type="button" class="btn btn-primary" data-editor-confirm-table>Inserir</button></div>\n'
			+ '    </div>\n'
			+ '  </div>\n'
			+ '</div>\n'
			+ '<div class="modal fade" id="editorTableBorderModal" tabindex="-1" aria-hidden="true">\n'
			+ '  <div class="modal-dialog modal-dialog-centered">\n'
			+ '    <div class="modal-content">\n'
			+ '      <div class="modal-header"><h5 class="modal-title">Bordas e sombreamento</h5><button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar"></button></div>\n'
			+ '      <div class="modal-body">\n'
			+ '        <div class="row g-2">\n'
			+ '          <div class="col-4"><label class="form-label small">Largura</label><input type="number" class="form-control" min="0" max="12" value="1" data-table-border-width></div>\n'
			+ '          <div class="col-4"><label class="form-label small">Estilo</label><select class="form-select" data-table-border-style><option value="solid" selected>Sólida</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option></select></div>\n'
			+ '          <div class="col-4"><label class="form-label small">Cor</label><input type="color" class="form-control form-control-color" value="#000000" data-table-border-color></div>\n'
			+ '        </div>\n'
			+ '      </div>\n'
			+ '      <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button><button type="button" class="btn btn-primary" data-table-border-apply>Aplicar</button></div>\n'
			+ '    </div>\n'
			+ '  </div>\n'
			+ '</div>\n'
			+ '</section>'
		);
	}

	function mountEditor(container, opts){
		// insere o fragmento se ainda não existir
		let root = container.querySelector('.pv-editor');
		if (!root) {
			// arquitetura unificada: injetar template inline (sem dependência de HTML externo)
			try {
				container.insertAdjacentHTML('beforeend', getEditorHtml());
				init(container.querySelector('.pv-editor'), opts);
			} catch(e) {
				// fallback mínimo
				container.insertAdjacentHTML('beforeend', '<section class="pv-editor"><div class="editor-area" contenteditable="true" data-editor-area></div></section>');
				init(container.querySelector('.pv-editor'), opts);
			}
			return;
		}
		init(root, opts);
	}

	function init(root, opts){
		// ativa recursos de edição
		try { document.execCommand('styleWithCSS', false, true); } catch(e){}

		// vincula toolbar e contadores
		if (global.PVEditorToolbar) global.PVEditorToolbar.bindToolbar(root);
		bindCounters(root);
		bindUndoRedo(root);
		bindShortcuts(root);

		// autosave local + callback remoto opcional
		if (global.PVEditorStorage) {
			const storage = global.PVEditorStorage.startAutoSave(root, { docId: (opts&&opts.docId)||'default', remoteSave: opts&&opts.remoteSave });
			root._pvStorage = storage;
		}

			// página: régua, cabeçalho/rodapé e margens
			if (global.PVEditorPage) {
				global.PVEditorPage.init(root);
			}

		// redimensionamento de imagens com handles simples
		(function enableImageResize(){
			const area = root.querySelector('[data-editor-area]');
			let active = null; let startX = 0; let startW = 0; let maxW = Infinity;
			function addHandles(img){
				if (img.parentElement && img.parentElement.classList.contains('pv-img-wrap')) return;
				const wrap = document.createElement('span');
				wrap.className = 'pv-img-wrap';
				wrap.style.display = 'inline-block';
				wrap.style.position = 'relative';
				img.replaceWith(wrap); wrap.appendChild(img);
				const handle = document.createElement('i');
				handle.className = 'pv-img-handle';
				handle.style.position = 'absolute'; handle.style.right = '-6px'; handle.style.bottom = '-6px';
				handle.style.width = '12px'; handle.style.height = '12px'; handle.style.background = '#0d6efd'; handle.style.cursor = 'nwse-resize'; handle.style.borderRadius = '2px';
				wrap.appendChild(handle);
				handle.addEventListener('mousedown', (e)=>{
					e.preventDefault();
					active = { img, wrap };
					startX = e.clientX;
					startW = img.getBoundingClientRect().width;
					const containerRect = area.getBoundingClientRect();
					const imgRect = img.getBoundingClientRect();
					maxW = Math.min(containerRect.width - 8, containerRect.right - imgRect.left - 8);
				});
			}
			area.addEventListener('click', (e)=>{ const t = e.target; if (t && t.tagName==='IMG') addHandles(t); });
			window.addEventListener('mousemove', (e)=>{
				if (!active) return; const dx = e.clientX - startX; const newW = Math.max(24, Math.min(startW + dx, maxW));
				active.img.style.width = newW + 'px'; active.img.style.height = 'auto';
			});
			window.addEventListener('mouseup', ()=>{ active = null; });
			// remove handles quando clicar fora da imagem
			area.addEventListener('blur', ()=>{ area.querySelectorAll('.pv-img-wrap').forEach(w=>{ const i=w.querySelector('img'); w.replaceWith(i); }); }, true);
		})();

		// redimensionamento de colunas de tabela (grade) por arrasto no header (ou primeira linha)
		(function enableTableColumnResize(){
			const area = root.querySelector('[data-editor-area]');
			let resizing = null; let startX = 0; let startW = 0;
			function makeResizable(table){
				const rows = table.rows; if (!rows || !rows[0]) return; const first = rows[0];
				for (let c=0;c<first.cells.length;c++){
					const cell = first.cells[c];
					cell.style.position = 'relative';
					const grip = document.createElement('span');
					grip.className = 'pv-col-grip';
					grip.style.position='absolute'; grip.style.top='0'; grip.style.right='-3px'; grip.style.width='6px'; grip.style.cursor='col-resize'; grip.style.userSelect='none'; grip.style.height='100%';
					cell.appendChild(grip);
					grip.addEventListener('mousedown', (e)=>{
						e.preventDefault(); resizing = { cell }; startX = e.clientX; startW = cell.getBoundingClientRect().width;
					});
				}
			}
			area.addEventListener('click', (e)=>{ const t = e.target; const tbl = t && (t.closest && t.closest('table')); if (tbl) makeResizable(tbl); });
			window.addEventListener('mousemove', (e)=>{
				if (!resizing) return; const dx = e.clientX - startX; const w = Math.max(24, startW + dx); resizing.cell.style.width = w + 'px';
			});
			window.addEventListener('mouseup', ()=>{ resizing = null; });
		})();
	}

	global.mountEditor = mountEditor;
})(window);

