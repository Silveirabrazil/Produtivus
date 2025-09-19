// Storage do editor: autosave em localStorage e callbacks para salvar remoto
(function(global){
	'use strict';

	function keyFor(id){ return 'pv-editor:'+ (id || 'default'); }

	function load(id){
		try {
			const raw = localStorage.getItem(keyFor(id));
			if (!raw) return null;
			return JSON.parse(raw);
		} catch(e){ return null; }
	}

	function save(id, data){
		try { localStorage.setItem(keyFor(id), JSON.stringify(data)); return true; } catch(e){ return false; }
	}

	function clear(id){ try { localStorage.removeItem(keyFor(id)); } catch(e){} }

		function startAutoSave(root, opts){
		const area = root.querySelector('[data-editor-area]');
		const title = root.querySelector('[data-editor-title]');
		const status = root.querySelector('[data-editor-save-status]');
		const id = (opts && opts.docId) || 'default';
		const remoteSave = opts && opts.remoteSave;
		const shouldRestore = (opts && Object.prototype.hasOwnProperty.call(opts,'restore')) ? !!opts.restore : true;

		let timer = null; let pending = false; let lastSaved = 0;
		function schedule(){
			if (timer) clearTimeout(timer);
			timer = setTimeout(async ()=>{
				let html = area?.innerHTML || '';
				try {
					if (window.PVEditorPage && typeof window.PVEditorPage.getCompositeHtml === 'function') {
						html = window.PVEditorPage.getCompositeHtml(root);
					}
				} catch(e){}
				const payload = { title: title?.value || '', html, ts: Date.now() };
				pending = true; updateStatus('Salvando...');
				save(id, payload);
				try {
					if (typeof remoteSave === 'function') await remoteSave(payload);
					lastSaved = Date.now(); updateStatus('Salvo');
				} catch(e){ updateStatus('Erro ao salvar'); }
				finally { pending = false; }
			}, 600);
		}
		function updateStatus(text){ if(status) status.textContent = text; }

		area?.addEventListener('input', schedule);
		title?.addEventListener('input', schedule);

		// restaura se existir (sem sobrescrever conteúdo já carregado do servidor)
		const existing = load(id);
		if (shouldRestore && existing) {
			try {
				const hasContent = !!(area && area.innerHTML && area.innerHTML.trim().length);
				if (!hasContent) {
					if (window.PVEditorPage && typeof window.PVEditorPage.setCompositeHtml === 'function') {
						window.PVEditorPage.setCompositeHtml(root, existing.html || '');
					} else if (area && existing.html) {
						area.innerHTML = existing.html;
					}
					if (title && existing.title) title.value = existing.title;
					updateStatus('Rascunho recuperado');
				}
			} catch(e){}
		}

		return { stop: ()=>{ if(timer) clearTimeout(timer); }, forceSave: ()=> schedule() };
	}

	global.PVEditorStorage = { load, save, clear, startAutoSave };
})(window);

