// js/pages/dashboard.js
// Inicialização dedicada da página Dashboard (conteúdo de js/dashboard-sb.js)
(function(){
	let lastTasks = [];
	let refreshTimer = null;

	// --- helpers de tema/cores e datas ---
	function cssVar(name, fallback){
		try {
			const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
			return v || fallback;
		}catch{ return fallback; }
	}
	function toRgba(color, alpha){
		if (!color) return `rgba(0,0,0,${alpha||1})`;
		const c = color.trim();
		// rgb/rgba
		const m = c.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/i);
		if (m){ return `rgba(${m[1]},${m[2]},${m[3]},${alpha ?? (m[4]||1)})`; }
		// hex #rrggbb
		const mh = c.match(/^#([0-9a-f]{6})$/i);
		if (mh){ const r=parseInt(mh[1].slice(0,2),16), g=parseInt(mh[1].slice(2,4),16), b=parseInt(mh[1].slice(4,6),16); return `rgba(${r},${g},${b},${alpha??1})`; }
		// named or anything else -> rely on browser paint + alpha by wrapping in rgba is not possible; fallback
		return `rgba(0,0,0,${alpha||.1})`;
	}
	function getTheme(){
		const body = cssVar('--bs-body-color', '#212529');
		const muted = cssVar('--bs-secondary-color', cssVar('--bs-secondary', '#6c757d'));
		const primary = cssVar('--bs-primary', '#0d6efd');
		const success = cssVar('--bs-success', '#198754');
		const warning = cssVar('--bs-warning', '#ffc107');
		const info = cssVar('--bs-info', '#0dcaf0');
		return {
			text: body,
			muted,
			primary, success, warning, info,
			grid: toRgba(body, .08),
			area: (c)=> toRgba(c, .15)
		};
	}

	function isLesson(task){
		try{
			const meta = window.study?.parseStudyMetaFromDesc?.(task?.desc || task?.description || '');
			return !!(meta && meta.schedule && Array.isArray(meta.schedule.weekdays) && meta.schedule.weekdays.length);
		}catch{ return false; }
	}

	function occursLessonOnDay(task, day){
		try{
			const meta = window.study?.parseStudyMetaFromDesc?.(task?.desc || task?.description || '');
			if (!meta || !meta.schedule) return false;
			const sc = meta.schedule;
			const wd = day.getDay();
			if (!Array.isArray(sc.weekdays) || sc.weekdays.indexOf(wd)===-1) return false;
			const sd = parseDateOnly(sc.startDate || sc.start || sc.from);
			const ed = parseDateOnly(sc.endDate || sc.end || sc.to);
			if (sd && day < sd) return false;
			if (ed && day > ed) return false;
			return true;
		}catch{ return false; }
	}

	async function loadTasks(){
		try { if (typeof window.getTasks==='function'){ const it=await window.getTasks(); if(Array.isArray(it)) return it; } } catch{}
		try { const cache=JSON.parse(localStorage.getItem('pv_tasks_cache')||'[]'); if(Array.isArray(cache)&&cache.length) return cache; } catch{}
		try { const legacy=JSON.parse(localStorage.getItem('tasks')||'[]'); if(Array.isArray(legacy)) return legacy; } catch{}
		return [];
	}

	function parseDateOnly(s){ try{ if(!s) return null; const str=(''+s).slice(0,10); const [y,m,d]=str.split('-').map(Number); if(y&&m&&d) return new Date(y,m-1,d); const dt=new Date(s); if(!isNaN(dt)) return new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); }catch{} return null; }
	function fmtDate(s){ const d=parseDateOnly(s); if(!d) return '-'; try{ return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});}catch{return '-';} }
	function isDone(t){ const v=t&&t.done; if(v===true) return true; if(v===false) return false; if(typeof v==='number') return v===1; if(typeof v==='string'){ const vs=v.trim().toLowerCase(); return vs==='1'||vs==='true'||vs==='yes'||vs==='y'; } return false; }
	function endDate(t){ return parseDateOnly(t&&t.end); }
	function safeTitle(t){ return (t&&(t.title||t.name||t.text||'Sem título')); }

	function updateKPIs(tasks){
		const total = tasks.length;
		const done = tasks.filter(isDone).length;
		const open = tasks.filter(t=>!isDone(t)).length;
		const next = tasks.filter(t=>!isDone(t)&&endDate(t)).sort((a,b)=> endDate(a)-endDate(b))[0];

		const elOpen = document.getElementById('kpi-open'); if (elOpen) elOpen.textContent = String(open);
		const elDone = document.getElementById('kpi-done'); if (elDone) elDone.textContent = String(done);
		const elNext = document.getElementById('kpi-next'); if (elNext) elNext.textContent = next ? fmtDate(next.end) : '-';

		// estudo 7 dias: texto + barra de progresso (0-100 com base em meta simples 300 min)
		const elStudy = document.getElementById('kpi-study7');
		const elBar = document.getElementById('kpi-study7-bar');
		(async ()=>{
			let minutesStr = '-'; let pct=0;
			try {
				if (window.pvDashboard && typeof window.pvDashboard.computeStudy7==='function'){
					const v = await window.pvDashboard.computeStudy7(tasks);
					if (v) { minutesStr = v; const m=parseInt(String(v).replace(/\D/g,''))||0; pct = Math.max(0, Math.min(100, Math.round((m/300)*100))); }
				}
			} catch{}
			if (elStudy) elStudy.textContent = minutesStr;
			if (elBar) elBar.style.width = pct+"%";
		})();
	}

	function renderListUpcoming(tasks){
		const ul = document.getElementById('list-upcoming'); if(!ul) return; ul.innerHTML='';
		const upcoming = tasks.filter(t=>!isDone(t)&&endDate(t)).sort((a,b)=> endDate(a)-endDate(b)).slice(0,8);
		if(!upcoming.length){ ul.innerHTML='<li class="text-muted">Nenhuma tarefa próxima.</li>'; return; }
		for(const t of upcoming){
			const li=document.createElement('li');
			li.innerHTML = '<span class="dot" style="--sj-color:'+(t.color||'var(--sb-primary)')+'"></span>'+
										 '<span class="title">'+safeTitle(t)+'</span>'+
										 '<span class="meta">'+fmtDate(t.end)+'</span>';
			ul.appendChild(li);
		}
	}

	function renderListRecentDone(tasks){
		const ul = document.getElementById('list-recent-done'); if(!ul) return; ul.innerHTML='';
		const now=new Date(); const sevenAgo=new Date(now); sevenAgo.setDate(now.getDate()-7);
		const recents=tasks.filter(t=>isDone(t)&&endDate(t)&&endDate(t)>=sevenAgo).sort((a,b)=> endDate(b)-endDate(a)).slice(0,8);
		if(!recents.length){ ul.innerHTML='<li class="text-muted">Nada concluído nos últimos dias.</li>'; return; }
		for(const t of recents){
			const li=document.createElement('li');
			li.innerHTML = '<span class="dot" style="--sj-color:'+(t.color||'var(--sb-success)')+'"></span>'+
										 '<span class="title">'+safeTitle(t)+'</span>'+
										 '<span class="meta">'+fmtDate(t.end)+'</span>';
			ul.appendChild(li);
		}
	}

	// plugin para mostrar "Sem dados" quando total = 0
	function buildEmptyDatasetPlugin(text, color){
		return {
			id: 'pvEmptyState',
			afterDraw(chart){
				try{
					const hasData = (chart.data && chart.data.datasets || []).some(ds=>{
						const arr = Array.isArray(ds.data) ? ds.data : [];
						return arr.some(v=> (typeof v==='number' ? v : Number(v||0)) > 0);
					});
					if (hasData) return;
					const {ctx, chartArea:{left,right,top,bottom}} = chart;
					ctx.save();
					ctx.textAlign='center'; ctx.textBaseline='middle';
					ctx.fillStyle = color || '#6c757d';
					ctx.font = '500 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
					ctx.fillText(text||'Sem dados', (left+right)/2, (top+bottom)/2);
					ctx.restore();
				}catch{}
			}
		};
	}

	// charts
	function renderCharts(tasks){
		const areaEl = document.getElementById('chart-area');
		if (!window.Chart || !areaEl) return;

		const theme = getTheme();

		// Area chart: separar Tarefas x Aulas (abertas e concluídas) nos últimos 7 dias
		const labels=[];
		const openTasksData=[]; const doneTasksData=[];
		const openLessonsData=[]; const doneLessonsData=[];
		const today=new Date();
		for(let i=6;i>=0;i--){
			const d=new Date(today); d.setDate(today.getDate()-i);
			const label=d.toLocaleDateString('pt-BR',{day:'2-digit'}); labels.push(label);
			const dayCut = new Date(d.getFullYear(),d.getMonth(),d.getDate());
			let ot=0, dt=0, ol=0, dl=0;
			for (const t of (Array.isArray(tasks)?tasks:[])){
				if (isLesson(t)){
					// Aula: conta se ocorre neste dia pelo schedule
					const occurs = occursLessonOnDay(t, dayCut);
					if (!occurs) continue;
					if (isDone(t)) dl++; else ol++;
				} else {
					// Tarefa comum: usa endDate (<= dia)
					const edv = endDate(t);
					if (!edv || edv > dayCut) continue;
					if (isDone(t)) dt++; else ot++;
				}
			}
			openTasksData.push(ot); doneTasksData.push(dt);
			openLessonsData.push(ol); doneLessonsData.push(dl);
		}
		if (areaEl){
			const ctx=areaEl.getContext('2d');
			if (window._areaChart) window._areaChart.destroy();
			window._areaChart=new Chart(ctx,{ type:'line', data:{ labels,
				datasets:[
					{ label:'Tarefas abertas', data:openTasksData, borderColor: theme.warning, backgroundColor: theme.area(theme.warning), tension:.3, fill:true, pointRadius:2 },
					{ label:'Tarefas concluídas', data:doneTasksData, borderColor: theme.success, backgroundColor: theme.area(theme.success), tension:.3, fill:true, pointRadius:2 },
					{ label:'Aulas abertas', data:openLessonsData, borderColor: theme.info, backgroundColor: theme.area(theme.info), tension:.3, fill:true, pointRadius:2 },
					{ label:'Aulas concluídas', data:doneLessonsData, borderColor: theme.primary, backgroundColor: theme.area(theme.primary), tension:.3, fill:true, pointRadius:2 }
				]}, options:{
					responsive:true, maintainAspectRatio:false,
					layout:{ padding:{ top:8, right:12, bottom:6, left:8 } },
					plugins:{
						legend:{display:true, labels:{ color: theme.muted, usePointStyle:true, boxWidth:10 }},
						tooltip:{
							mode:'index', intersect:false,
							callbacks:{ label(ctx){ const v=Number(ctx.parsed.y||0); return `${ctx.dataset.label}: ${v.toLocaleString('pt-BR')}`; } }
						}
					},
					scales:{
						x:{ grid:{display:false}, ticks:{ color: theme.muted } },
						y:{ beginAtZero:true, grid:{ color: theme.grid, lineWidth:1 }, ticks:{ color: theme.muted, maxTicksLimit: 12 } }
					}
				}, plugins:[ buildEmptyDatasetPlugin('Sem dados', theme.muted) ] });
		}

		// (removido) Gráfico de distribuição por matéria
	}

	async function refresh(){
		const tasks = await loadTasks();
		lastTasks = Array.isArray(tasks) ? tasks : [];
		updateKPIs(lastTasks);
		renderListUpcoming(lastTasks);
		renderListRecentDone(lastTasks);
		renderCharts(lastTasks);
	}

	document.addEventListener('DOMContentLoaded', ()=>{
		refresh();
		try{ if (refreshTimer) clearInterval(refreshTimer); refreshTimer = setInterval(refresh, 60_000); }catch{}
	});
	window.addEventListener('pv:tasks-updated', refresh);
	window.addEventListener('beforeunload', ()=>{ try{ if (refreshTimer) clearInterval(refreshTimer); }catch{} try{ if(window._areaChart) window._areaChart.destroy(); }catch{} try{ if(window._donutChart) window._donutChart.destroy(); }catch{} });
})();

