// Comandos do editor: abstrações sobre document.execCommand e helpers estáveis
(function(global){
	'use strict';

	function apply(cmd, value){
		try {
			document.execCommand(cmd, false, value);
			return true;
		} catch(e) { return false; }
	}

	function setFontName(name){ return apply('fontName', name); }
	function setFontSize(size){ return apply('fontSize', size); }
	function setForeColor(color){ return apply('foreColor', color); }
	function setBackColor(color){ return apply('hiliteColor', color); }
	function formatBlock(tag){ return apply('formatBlock', tag); }

	function insertLink(url, blank){
		if(!url) return false;
		apply('createLink', url);
		if(blank){
			// adiciona target _blank ao link selecionado
			const sel = window.getSelection();
			if (sel && sel.anchorNode) {
				const a = sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('a');
				if (a) a.target = '_blank';
			}
		}
		return true;
	}

	function insertImage(url, alt){
		if(!url) return false;
		apply('insertImage', url);
		const sel = window.getSelection();
		if (sel && sel.anchorNode) {
			let img = null;
			try { img = sel.anchorNode.parentElement?.closest('.pv-editor')?.querySelector('img[src="'+CSS.escape(url)+'"]'); } catch(e){}
			if (img && alt) img.alt = alt;
		}
		return true;
	}

	function insertTable(rows, cols){
		rows = Math.max(1, Math.min(50, parseInt(rows||3)));
		cols = Math.max(1, Math.min(20, parseInt(cols||3)));
		let html = '<table class="table table-bordered w-auto" style="table-layout:fixed;min-width:200px;">';
		for(let r=0;r<rows;r++){
			html += '<tr>';
			for(let c=0;c<cols;c++) html += '<td style="min-width:60px;">&nbsp;</td>';
			html += '</tr>';
		}
		html += '</table>';
		apply('insertHTML', html);
	}

	global.PVEditorCommands = {
		apply,
		setFontName,
		setFontSize,
		setForeColor,
		setBackColor,
		formatBlock,
		insertLink,
		insertImage,
		insertTable
	};
})(window);

