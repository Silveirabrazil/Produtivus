// Dashboard logic for SB Admin-like layout
(function(){
  let lastTasks = [];

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
      li.innerHTML = '<span class="dot" style="background:'+(t.color||'var(--sb-primary)')+'"></span>'+
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
      li.innerHTML = '<span class="dot" style="background:'+(t.color||'var(--sb-success)')+'"></span>'+
                     '<span class="title">'+safeTitle(t)+'</span>'+
                     '<span class="meta">'+fmtDate(t.end)+'</span>';
      ul.appendChild(li);
    }
  }

  // charts
  function renderCharts(tasks){
    const areaEl = document.getElementById('chart-area');
    const donutEl = document.getElementById('chart-donut');
    if (!window.Chart || (!areaEl && !donutEl)) return;

    // Area chart: tarefas abertas vs concluídas nos últimos 7 dias
    const labels=[]; const openData=[]; const doneData=[];
    const today=new Date();
    for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); const label=d.toLocaleDateString('pt-BR',{day:'2-digit'}); labels.push(label);
      const key=d.toISOString().slice(0,10);
      const opens=tasks.filter(t=>!isDone(t)&&endDate(t)&&endDate(t).toISOString().slice(0,10)<=key).length;
      const dones=tasks.filter(t=>isDone(t)&&endDate(t)&&endDate(t).toISOString().slice(0,10)<=key).length;
      openData.push(opens); doneData.push(dones);
    }
    if (areaEl){
      const ctx=areaEl.getContext('2d');
      if (window._areaChart) window._areaChart.destroy();
      window._areaChart=new Chart(ctx,{ type:'line', data:{ labels,
        datasets:[
          { label:'Abertas', data:openData, borderColor:'#f6c23e', backgroundColor:'rgba(246,194,62,.15)', tension:.3, fill:true, pointRadius:2 },
          { label:'Concluídas', data:doneData, borderColor:'#1cc88a', backgroundColor:'rgba(28,200,138,.15)', tension:.3, fill:true, pointRadius:2 }
        ]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true} }, scales:{ x:{ grid:{display:false} }, y:{ beginAtZero:true, grid:{ color:'rgba(0,0,0,.05)'}} } } });
    }

    // Donut: minutos por matéria (7 dias)
    if (donutEl){
      const ctx=donutEl.getContext('2d'); if (window._donutChart) window._donutChart.destroy();
      (async ()=>{
        try{
          if (!(window.study && window.study.sumMinutesBySubject)) return;
          const agg = await window.study.sumMinutesBySubject(tasks,7);
          const labels=agg.map(a=>a.name); const data=agg.map(a=>Math.round(a.minutes)); const colors=agg.map(a=>a.color||'#4e73df');
          window._donutChart=new Chart(ctx,{ type:'doughnut', data:{ labels, datasets:[{ data, backgroundColor:colors, hoverOffset:4 }] }, options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } } });
        }catch{}
      })();
    }
  }

  async function refresh(){
    const tasks = await loadTasks();
    lastTasks = Array.isArray(tasks) ? tasks : [];
    updateKPIs(lastTasks);
    renderListUpcoming(lastTasks);
    renderListRecentDone(lastTasks);
    renderCharts(lastTasks);
  }

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('pv:tasks-updated', refresh);
})();
