// js/modules/notif-events.js
// Varre eventos (tarefas/aulas) e cria notificações para próximas 24h e lembretes 30min antes
(function(){
  if (window.pvNotifEvents?.start) return;

  const API_TASKS = '/server/api/tasks.php';
  const SCAN_INTERVAL_MS = 10 * 60 * 1000; // re-scan a cada 10 min
  const AHEAD_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
  const REMINDER_BEFORE_MS = 30 * 60 * 1000; // 30min

  function getUser(){ try { return JSON.parse(localStorage.getItem('pv_user')||'null'); } catch { return null; } }
  function schedKey(){ const u=getUser(); return 'pv_notif_sched_' + (u?.email || 'anon'); }
  function loadSched(){ try { return JSON.parse(localStorage.getItem(schedKey())||'{}'); } catch { return {}; } }
  function saveSched(m){ try { localStorage.setItem(schedKey(), JSON.stringify(m)); } catch {}
    document.dispatchEvent(new CustomEvent('pv:notif:scheduled')); }

  async function fetchTasksDirect(){
    try{
      const r = await fetch(API_TASKS, { credentials:'same-origin' });
      if (!r.ok) return [];
      const j = await r.json().catch(()=>null);
      const items = (j && j.items && Array.isArray(j.items)) ? j.items : [];
      // dedupe por id
      const map = new Map();
      for (const it of items) { if (it && (it.id!==undefined && it.id!==null)) map.set(String(it.id), it); }
      return Array.from(map.values());
    }catch{ return []; }
  }

  function toLocalDate(dt){ try { return new Date(dt); } catch { return null; } }
  function ymdToDate(ymd){ // 'YYYY-MM-DD'
    try{ const [y,m,d] = String(ymd).split('-').map(Number); return new Date(y, (m||1)-1, d||1); } catch { return null; }
  }
  function hmToDate(baseDate, hm){ // 'HH:MM'
    try{ const [h,mi] = String(hm).split(':').map(Number); const d = new Date(baseDate); d.setHours(h||0, mi||0, 0, 0); return d; } catch { return null; }
  }
  function inWindow(ts, now, until){ return ts>=now && ts<=until; }
  function weekdayIndex(d){ return d.getDay(); } // 0=Dom..6=Sab
  function parseStudyMeta(desc){ try { return window.study?.parseStudyMetaFromDesc ? window.study.parseStudyMetaFromDesc(desc||'') : null; } catch { return null; } }

  function enumerateOccurrencesNext24h(task){
    // Dedupe por tarefa+timestamp em minutos para evitar duplicidades (ex.: start explícito + cronograma [[STUDY]])
    const seen = new Set();
    const out = [];
    const now = Date.now();
    const until = now + AHEAD_WINDOW_MS;
    const pushUnique = (when, extra) => {
      if (!(when instanceof Date)) return;
      const k = `${task.id||'x'}@${Math.floor(when.getTime()/60000)}`; // chave por minuto
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ when, task, ...extra });
    };

    // aulas com meta [[STUDY]] em desc (prioritário para evitar duplicidade com start)
    const meta = parseStudyMeta(task.desc || task.description || '');
    const sch = meta && meta.schedule;
    if (sch && sch.time && Array.isArray(sch.weekdays) && sch.weekdays.length) {
      const dStart = sch.startDate ? ymdToDate(sch.startDate) : null;
      const dEnd = sch.endDate ? ymdToDate(sch.endDate) : null;
      // iterar hoje e amanhã
      for (let i=0;i<=1;i++){
        const base = new Date(); base.setHours(0,0,0,0); base.setDate(base.getDate()+i);
        if (dStart && base < dStart) continue;
        if (dEnd && base > dEnd) continue;
        const wd = weekdayIndex(base); // 0..6
        // weekdays no meta provavelmente 1..7 (seg=1..dom=7) ou 0..6; tentar suportar ambos
        const has = sch.weekdays.some(w => {
          const n = Number(w);
          return n===wd || (n>=1 && n<=7 && ((n%7)===wd));
        });
        if (!has) continue;
        const occ = hmToDate(base, sch.time);
        if (!occ) continue;
        if (inWindow(occ.getTime(), now, until)) pushUnique(occ, { study: meta });
      }
    }

    // tarefas com start explícito (apenas se não coberto acima)
    if (task.start) {
      const dt = toLocalDate(task.start);
      if (dt && inWindow(dt.getTime(), now, until)) pushUnique(dt, {});
    }

    return out;
  }

  function notifId(occ){
    const tid = occ?.task?.id != null ? String(occ.task.id) : 'x';
    const tstr = occ.when.toISOString();
    return `occ:${tid}:${tstr}`;
  }

  function ensureNotificationsFor(occ){
    const id = notifId(occ);
    const list = (window.pvNotifications?.list?.() || []);
    const exists = list.some(n => n.id === id);
    if (!exists) {
      const t = occ.task;
      const title = t.title || 'Evento';
      const when = occ.when;
      const hh = String(when.getHours()).padStart(2,'0');
      const mm = String(when.getMinutes()).padStart(2,'0');
      const today = new Date(); today.setHours(0,0,0,0);
      const that = new Date(when); that.setHours(0,0,0,0);
      const diffDays = Math.round((that.getTime() - today.getTime()) / (24*60*60*1000));
      const prefix = diffDays === 0 ? 'Hoje' : (diffDays === 1 ? 'Amanhã' : 'Em breve');
      const msg = `${prefix} às ${hh}:${mm}`;
      window.pvNotify?.({ id, title, message: msg, type:'info', link:'tarefas.html' });
    }
  }

  function scheduleReminders(occ){
    const id = notifId(occ) + ':rem30';
    const sched = loadSched();
    if (sched[id]) return; // já agendado
    const now = Date.now();
    const fireAt = occ.when.getTime() - REMINDER_BEFORE_MS;
    const delay = fireAt - now;
    if (delay <= 0) {
      // se já está no intervalo, notificar imediatamente uma vez
      try { window.pvNotify?.({ id, title:'Lembrete', message:`Evento em 30 minutos: ${occ.task.title||'Evento'}`, type:'warning', link:'tarefas.html' }); } catch {}
      sched[id] = true; saveSched(sched);
      return;
    }
    if (delay > AHEAD_WINDOW_MS) return; // não agendar além de 24h
    try {
      setTimeout(()=>{
        window.pvNotify?.({ id, title:'Lembrete', message:`Evento em 30 minutos: ${occ.task.title||'Evento'}`, type:'warning', link:'tarefas.html' });
        const s = loadSched(); s[id] = true; saveSched(s);
      }, delay);
      sched[id] = true; saveSched(sched);
    } catch {}
  }

  async function scan(){
    // garantir módulos mínimos
    if (!window.pvNotify) return; // notifications.js ainda não
    let tasks = [];
    if (window.getTasks) {
      try { tasks = await window.getTasks(); } catch { tasks = []; }
    } else {
      tasks = await fetchTasksDirect();
    }
    if (!Array.isArray(tasks) || tasks.length===0) return;
    const occs = [];
    tasks.forEach(t => { enumerateOccurrencesNext24h(t).forEach(o => occs.push(o)); });
    // criar itens de notificação e agendar lembretes
    occs.forEach(o => { ensureNotificationsFor(o); scheduleReminders(o); });
  }

  function start(){
    scan();
    try { window.addEventListener('pv:tasks-updated', scan); } catch{}
    try { setInterval(scan, SCAN_INTERVAL_MS); } catch{}
  }

  window.pvNotifEvents = { start };
})();
