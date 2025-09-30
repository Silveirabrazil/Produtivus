// js/modules/studies-hub.js
// Central de Estudos: "Atividades do dia" e "Cadernos por curso" agrupados
(function(){
  const API = {
    tasks: '/server/api/tasks.php',
    notebooks: '/server/api/notebooks.php',
    subjects: '/server/api/subjects.php',
    courses: '/server/api/courses.php'
  };

  function qs(sel, root=document){ return (root||document).querySelector(sel); }
  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function todayRange(){
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);
    return { start, end };
  }
  function parseDate(s){ if(!s) return null; const d=new Date(s); return isNaN(d)?null:d; }
  function dateOnly(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function intersectsDay(t, start, end){
    const s = parseDate(t.start);
    const e = parseDate(t.end);
    // Se não tiver horário, trata como evento do dia da data não-nula
    if (!s && !e) return false;
    const sRef = s || e; const eRef = e || s || sRef;
    if (!sRef) return false;
    // comparação por dia: recorta para o dia
    const sDay = dateOnly(sRef); const eDay = dateOnly(eRef);
    return (sDay <= end && eDay >= start);
  }

  async function apiGet(url){ const r=await fetch(url, {credentials:'same-origin'}); const j=await r.json().catch(()=>null); if(!r.ok||!j) throw new Error('GET '+url); return j; }
  async function apiPut(url, body){ const r=await fetch(url,{method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(body||{})}); const j=await r.json().catch(()=>null); if(!r.ok||!j||j.success===false) throw new Error('PUT '+url); return j; }

  function fmtTime(dt){ try { return dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch { return ''; } }

  function subjectMap(subjects){ const m=new Map(); (subjects||[]).forEach(s=>m.set(String(s.id), s)); return m; }
  function courseMap(courses){ const m=new Map(); (courses||[]).forEach(c=>m.set(String(c.id), c)); return m; }

  function renderDailyCalendar(container){
    container.innerHTML = '';
    const box = el('section', 'card');
    box.innerHTML = '<h3>Agenda de estudos</h3>';
    const calWrap = el('div');
    calWrap.innerHTML = '<div id="studies-mini-calendar"></div>';
    box.appendChild(calWrap);
    container.appendChild(box);

    // Inicializa um calendário menor com Semana/Dia
    setTimeout(async ()=>{
      try {
        if (typeof FullCalendar === 'undefined') return;
        const root = calWrap.querySelector('#studies-mini-calendar');
        const calendar = new FullCalendar.Calendar(root, {
          initialView: 'timeGridWeek',
          height: 'auto',
          expandRows: true,
          headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' },
          locale: 'pt-br',
          selectable: true,
          editable: false,
          events: async (info, success, fail) => {
            try {
              const r = await fetch(API.tasks, { credentials: 'same-origin' });
              const j = await r.json().catch(()=>null);
              const tasks = (j && j.items) ? j.items : [];

              // Mesma lógica do calendário principal para expandir cronogramas [[STUDY]]
              const parseStudy = (t) => {
                try { return (window.study && window.study.parseStudyMetaFromDesc) ? window.study.parseStudyMetaFromDesc(t.desc || t.description || '') : null; } catch { return null; }
              };
              const ymdToDate = (s) => { const m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; return new Date(+m[1], +m[2]-1, +m[3], 0, 0, 0, 0); };
              const pad = (n) => String(n).padStart(2,'0');
              const buildIso = (d, hm) => { const [h,mi] = String(hm||'00:00').split(':'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(mi)}:00`; };
              const addMinutesIso = (iso, minutes) => { try { const d = new Date(iso); d.setMinutes(d.getMinutes() + (Number(minutes)||0)); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; } catch { return iso; } };
              const normalizeWeekdayList = (arr) => {
                const a = Array.isArray(arr) ? arr.map(Number) : [];
                return a.map(n => (n>=1 && n<=7) ? (n % 7) : (n>=0 && n<=6 ? n : -1)).filter(n => n>=0);
              };
              const inRangeYMD = (d, start, end) => (!start || d>=start) && (!end || d<=end);

              const evs = [];
              const rangeStart = info.start;
              const rangeEnd = info.end;

              for (const t of tasks) {
                const meta = parseStudy(t);
                const sch = meta && meta.schedule;
                if (sch && sch.time && Array.isArray(sch.weekdays) && sch.weekdays.length) {
                  // Expandir aulas dentro do range visível e do período do cronograma
                  const sY = ymdToDate(sch.startDate);
                  const eY = ymdToDate(sch.endDate);
                  const d0 = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0,0,0,0);
                  const d1 = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 0,0,0,0);
                  const dows = normalizeWeekdayList(sch.weekdays);
                  const durationMin = Number(meta?.estimatedMinutes || 0) || 60;
                  for (let d = new Date(d0); d < d1; d.setDate(d.getDate()+1)) {
                    if (!inRangeYMD(d, sY, eY)) continue;
                    const dow = d.getDay();
                    if (!dows.includes(dow)) continue;
                    const startIso = buildIso(d, sch.time);
                    const endIso = sch.endTime ? buildIso(d, sch.endTime) : addMinutesIso(startIso, durationMin);
                    const ev = {
                      id: `${t.id}:${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
                      title: t.title || 'Aula',
                      start: startIso,
                      end: endIso,
                      allDay: false,
                      extendedProps: { __task: t, __occurrenceDate: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
                    };
                    if (t.color) { ev.backgroundColor = t.color; ev.borderColor = t.color; }
                    evs.push(ev);
                  }
                } else {
                  // Tarefa simples (sem cronograma)
                  const hasTimeStart = !!String(t.start||'').match(/\d{2}:\d{2}/);
                  const hasTimeEnd = !!String(t.end||'').match(/\d{2}:\d{2}/);
                  const ev = {
                    id: String(t.id),
                    title: t.title || t.desc || 'Tarefa',
                    start: t.start || null,
                    end: t.end || null,
                    allDay: Boolean(t.allDay || ((t.start && !hasTimeStart) || (t.end && !hasTimeEnd))),
                    extendedProps: { __task: t }
                  };
                  if (t.color) { ev.backgroundColor = t.color; ev.borderColor = t.color; }
                  evs.push(ev);
                }
              }

              success(evs);
            } catch(e) { fail && fail(e); }
          },
          dateClick(info){ try { if (window.openTasksForDate) window.openTasksForDate(info.dateStr); } catch(e){} },
          eventClick(info){ try { const t = info.event.extendedProps && info.event.extendedProps.__task; if (t && window.showTaskDetails) window.showTaskDetails(t.id); } catch(e){} }
        });
        calendar.render();
      } catch(e) { /* silent */ }
    }, 0);
  }

  function renderNotebooksByCourse(container, notebooks, subjects, courses){
    container.innerHTML = '';
    const box = el('section', 'card');
    box.innerHTML = '<h3>Cadernos por curso</h3>';
    const cMap = courseMap(courses);
    const sMap = subjectMap(subjects);

    // agrupar notebooks por course_id (via subject_id)
    const groups = new Map();
    for (const nb of (notebooks||[])){
      const subj = nb.subject_id ? sMap.get(String(nb.subject_id)) : null;
      const courseId = subj && subj.course_id ? String(subj.course_id) : '';
      const key = courseId || '_none_';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(nb);
    }

    if (groups.size === 0){
      box.appendChild(el('div','small muted','Nenhum caderno encontrado.'));
      container.appendChild(box);
      return;
    }

    const wrap = el('div','course-groups');
    for (const [key, list] of groups.entries()){
      const title = key === '_none_' ? 'Sem curso' : (cMap.get(key)?.name || 'Curso');
      const sec = el('div','course-group');
      sec.innerHTML = `<h4 class="group-title">${title}</h4>`;
      const ul = el('div','nb-list-compact');
      list.sort((a,b)=> String(a.title||'').localeCompare(String(b.title||'')));
      list.forEach(nb=>{
        const item = el('button','nb-chip');
        item.type = 'button';
        item.title = `${nb.pages_count||0} páginas`;
        item.textContent = nb.title;
  item.addEventListener('click', ()=>{ window.location.href = `caderno.html?nb=${encodeURIComponent(nb.id)}`; });
        ul.appendChild(item);
      });
      sec.appendChild(ul);
      wrap.appendChild(sec);
    }
    box.appendChild(wrap);
    container.appendChild(box);
  }

  async function mount(host){
    if (!host) return;
    // contêineres
  const daily = el('div','studies-daily');
  const nbcourses = el('div','studies-nb-courses');
  host.appendChild(daily);
  host.appendChild(nbcourses);

    // carregar dados em paralelo
    let tasks=[], notebooks=[], subjects=[], courses=[];
    try {
      const [t, n, s, c] = await Promise.all([
        apiGet(API.tasks), apiGet(API.notebooks), apiGet(API.subjects), apiGet(API.courses)
      ]);
      tasks = Array.isArray(t.items)? t.items : [];
      notebooks = Array.isArray(n.items)? n.items : [];
      subjects = Array.isArray(s.items)? s.items : [];
      courses = Array.isArray(c.items)? c.items : [];
    } catch(e) {
      // fallback suave: renderiza placeholders para não parecer "vazio"
      try {
        host.appendChild(el('section','card','<h3>Agenda de estudos</h3><div class="small muted">Não foi possível carregar sua agenda agora.</div>'));
        host.appendChild(el('section','card','<h3>Cadernos por curso</h3><div class="small muted">Não foi possível carregar dados dos cadernos.</div>'));
      } catch{}
    }

    // filtrar tarefas do dia
  // substitui lista por mini-calendário
  renderDailyCalendar(daily);
  try { renderNotebooksByCourse(nbcourses, notebooks, subjects, courses); } catch{}

  // (Gestão de cursos/matérias removida a pedido — seção visível apenas via páginas dedicadas)
  }

  // estilos movidos para SCSS (_studies.scss)

  window.pvStudiesHub = { mount };
})();
