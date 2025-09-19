// js/modules/study-planner.js
// Planner semanal de estudos com FullCalendar (TimeGrid week), arrastar/redimensionar, API CRUD
(function(){
  function api(url, opts){
    return fetch(url, Object.assign({ credentials:'same-origin', headers:{'Content-Type':'application/json'} }, opts||{}))
      .then(r=>r.json().catch(()=>({success:false}))).catch(()=>({success:false}));
  }
  async function loadSubjects(){
    try {
      const r = await fetch('/server/api/subjects.php', { credentials:'same-origin' });
      const j = await r.json().catch(()=>null);
      return (j && j.success && Array.isArray(j.items)) ? j.items : [];
    } catch(e){ return []; }
  }
  async function loadCourses(){
    try {
      const r = await fetch('/server/api/courses.php', { credentials:'same-origin' });
      const j = await r.json().catch(()=>null);
      return (j && j.success && Array.isArray(j.items)) ? j.items : [];
    } catch(e){ return []; }
  }
  async function loadPlan(){
    const j = await api('/server/api/study_plan.php');
    return (j && j.success && Array.isArray(j.items)) ? j.items : [];
  }
  async function createSlot(payload){
    const j = await api('/server/api/study_plan.php', { method:'POST', body: JSON.stringify(payload) });
    return j && j.success ? j.id : 0;
  }
  async function createSubject(name, color, courseId){
    try {
      const body = { name: String(name||'').trim(), color: color || null, course_id: courseId ?? null };
      const r = await fetch('/server/api/subjects.php', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j = await r.json().catch(()=>null);
      return (j && j.success && j.id) ? j.id : 0;
    } catch(e){ return 0; }
  }
  async function updateSlot(id, patch){
    const j = await api('/server/api/study_plan.php?id='+encodeURIComponent(id), { method:'PUT', body: JSON.stringify(patch) });
    return !!(j && j.success);
  }
  async function deleteSlot(id){
    const j = await api('/server/api/study_plan.php?id='+encodeURIComponent(id), { method:'DELETE' });
    return !!(j && j.success);
  }

  function toEvent(item, baseStartDate){
    // Converte um item do planner (dow + time) em evento em uma semana "base". FullCalendar usa a semana atual.
    // Usar o início visível (info.start) para sempre cair na semana exibida.
    const base = baseStartDate ? new Date(baseStartDate) : new Date();
    const dow = item.day_of_week; // 0..6
    const currentDow = base.getDay();
    const delta = dow - currentDow;
    const date = new Date(base);
    date.setDate(base.getDate() + delta);
    function dateTime(dateObj, timeStr){
      // timeStr HH:MM[:SS]
      const [hh, mm, ss] = String(timeStr||'00:00:00').split(':');
      const d = new Date(dateObj);
      d.setHours(parseInt(hh||'0',10), parseInt(mm||'0',10), parseInt(ss||'0',10) || 0, 0);
      return d;
    }
    const start = dateTime(date, item.start_time);
    const end = dateTime(date, item.end_time);
    const title = item.title || item.subject_name || 'Estudo';
    const color = item.color || '#365562';
    return {
      id: String(item.id),
      title,
      start,
      end,
      backgroundColor: color,
      borderColor: color,
      extendedProps: { __sp: item }
    };
  }

  function buildFilterOptions(subjects){
    const sel = document.getElementById('planner-subject-filter');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todas as matérias</option>' + subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  }

  async function pickCourseAndSubject(courses, subjects){
    // 1) Curso
    let courseId = null;
    if (Array.isArray(courses) && courses.length > 0) {
      const opts = courses.map(c => ({ value: c.id, label: c.name }));
      const cidStr = await (window.pvShowSelect ? pvShowSelect('Escolha o curso:', opts, false) : Promise.resolve(null));
      if (cidStr === null) return { cancelled: true };
      courseId = parseInt(cidStr, 10);
      if (isNaN(courseId)) return { cancelled: true };
    }
    // 2) Matéria (filtrada por curso)
    let list = Array.isArray(subjects) ? subjects.slice() : [];
    if (courseId !== null) list = list.filter(s => (s.course_id || null) === courseId);
    let subjectId = null;
    if (list.length === 0) {
      // Oferece criar matéria
      const criar = await (window.pvShowConfirm ? pvShowConfirm('Não há matérias neste curso. Deseja criar uma agora?') : Promise.resolve(false));
      if (criar) {
        const nm = await (window.pvShowPrompt ? pvShowPrompt('Nome da matéria:', '') : Promise.resolve(''));
        if (nm && nm.trim()) {
          const newId = await createSubject(nm.trim(), null, courseId);
          if (newId) subjectId = newId;
        }
      }
    } else {
      const ops = list.map(s => ({ value: s.id, label: s.name }));
      const sidStr = await (window.pvShowSelect ? pvShowSelect('Escolha a matéria:', ops, false) : Promise.resolve(null));
      if (sidStr === null) return { cancelled: true };
      subjectId = parseInt(sidStr, 10);
      if (isNaN(subjectId)) return { cancelled: true };
    }
    return { courseId, subjectId, cancelled: false };
  }

  document.addEventListener('DOMContentLoaded', async function(){
    const el = document.getElementById('study-planner');
    if (!el) return;
      if (typeof FullCalendar === 'undefined') {
        try {
          const warn = document.createElement('div');
          warn.className = 'alert alert-warning';
          warn.role = 'alert';
          warn.textContent = 'Biblioteca FullCalendar não encontrada. Confira as tags de script nesta página (core/interaction/daygrid/timegrid/locales).';
          el.parentNode.insertBefore(warn, el);
        } catch(_) {}
        return;
      }

  let subjects = await loadSubjects();
  let courses = await loadCourses();
    buildFilterOptions(subjects);

    // Detectar plugins disponíveis
    const hasTimeGrid = !!(FullCalendar.timeGridPlugin || FullCalendar.TimeGridView);
    const hasInteraction = !!(FullCalendar.interactionPlugin || (FullCalendar.Draggable && FullCalendar.PointerDragging));
    const hasDayGrid = !!(FullCalendar.dayGridPlugin || FullCalendar.DayGridView);

    // Se timeGrid não estiver disponível, fazer fallback para dayGridWeek
    const initialView = hasTimeGrid ? 'timeGridWeek' : (hasDayGrid ? 'dayGridWeek' : 'dayGridMonth');
      if (!hasTimeGrid) {
        try {
          const warn = document.createElement('div');
          warn.className = 'alert alert-warning';
          warn.role = 'alert';
          warn.textContent = 'Plugin timeGrid não carregado. Caindo para visão semanal de grade (dayGridWeek).';
          el.parentNode.insertBefore(warn, el);
        } catch(_) {}
      }

    const calendar = new FullCalendar.Calendar(el, {
  initialView,
  slotMinTime: '06:00:00',
  slotMaxTime: '23:00:00',
      expandRows: true,
      locale: 'pt-br',
      editable: hasInteraction,
      selectable: hasInteraction,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: hasTimeGrid ? 'timeGridWeek,timeGridDay' : (hasDayGrid ? 'dayGridWeek,dayGridDay' : 'dayGridMonth')
      },
      events: async function(info, success, failure){
        const items = await loadPlan();
        const filter = document.getElementById('planner-subject-filter');
        let filtered = items;
        if (filter && filter.value) {
          const sid = parseInt(filter.value,10);
          filtered = items.filter(x => (x.subject_id||0) === sid);
        }
        success(filtered.map(it => toEvent(it, info.start)));
      },
      dateClick: async function(info){
        if (!hasInteraction) return; // sem interaction plugin, não criar via clique
        try {
          const dt = info.date; // JS Date
          const dow = dt.getDay();
          const hh = String(dt.getHours()).padStart(2,'0');
          const mm = String(dt.getMinutes()).padStart(2,'0');
          const start = `${hh}:${mm}:00`;
          // duração padrão 60min
          const endDate = new Date(dt.getTime()+60*60000);
          const eh = String(endDate.getHours()).padStart(2,'0');
          const em = String(endDate.getMinutes()).padStart(2,'0');
          const end = `${eh}:${em}:00`;
          // fluxo: curso -> matéria -> título
          const pick = await pickCourseAndSubject(courses, subjects);
          if (pick.cancelled) return;
          // refresh subjects se criamos uma nova
          if (pick.subjectId && !subjects.some(s => s.id === pick.subjectId)) {
            subjects = await loadSubjects();
          }
          const title = await (window.pvShowPrompt ? pvShowPrompt('Título do bloco de estudo:', '') : Promise.resolve(''));
          const sObj = pick.subjectId ? subjects.find(s => s.id === pick.subjectId) : null;
          const cObj = (pick.courseId !== null) ? (Array.isArray(courses) ? courses.find(c => c.id === pick.courseId) : null) : null;
          const color = (sObj && sObj.color) || (cObj && cObj.color) || null;
          const id = await createSlot({ day_of_week:dow, start_time:start, end_time:end, subject_id: pick.subjectId || null, title: title||null, color });
          if (id) { calendar.refetchEvents(); if (window.pvShowToast) pvShowToast('Bloco criado'); }
        } catch(e){ console.error('create slot failed', e); }
      },
      eventDrop: async function(info){
        if (!hasInteraction) return;
        try {
          const ev = info.event;
          const dt = ev.start; const end = ev.end || new Date(ev.start.getTime()+60*60000);
          const dow = dt.getDay();
          const start = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:00`;
          const endStr = `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}:00`;
          const ok = await updateSlot(ev.id, { day_of_week:dow, start_time:start, end_time:endStr });
          if (!ok) info.revert(); else if (window.pvShowToast) pvShowToast('Atualizado');
        } catch(e){ console.error('drop failed', e); try{info.revert();}catch{} }
      },
      eventResize: async function(info){
        if (!hasInteraction) return;
        try {
          const ev = info.event; const end = ev.end || new Date(ev.start.getTime()+60*60000);
          const endStr = `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}:00`;
          const ok = await updateSlot(ev.id, { end_time:endStr });
          if (!ok) info.revert(); else if (window.pvShowToast) pvShowToast('Duração atualizada');
        } catch(e){ console.error('resize failed', e); try{info.revert();}catch{} }
      },
      eventClick: async function(info){
        try {
          const ev = info.event; const item = (ev.extendedProps && ev.extendedProps.__sp) || { id: ev.id };
          // menu simples: renomear, trocar matéria, apagar
          const act = await (window.pvShowSelect ? pvShowSelect('O que deseja fazer?', [
            {value:'rename', label:'Renomear título'},
            {value:'subject', label:'Trocar matéria'},
            {value:'delete', label:'Excluir'}
          ], true) : Promise.resolve(''));
          if (act === 'rename') {
            const title = await (window.pvShowPrompt ? pvShowPrompt('Novo título:', ev.title||'') : Promise.resolve(''));
            if (title !== null) { const ok = await updateSlot(ev.id, { title }); if (ok) { calendar.refetchEvents(); if (window.pvShowToast) pvShowToast('Título atualizado'); } }
          } else if (act === 'subject') {
            const opts = subjects.map(s=>({ value:s.id, label:s.name }));
            const sidStr = await (window.pvShowSelect ? pvShowSelect('Selecione a matéria:', opts, true) : Promise.resolve(''));
            if (sidStr !== null) {
              const sid = sidStr ? parseInt(sidStr,10) : null;
              const color = (subjects.find(s=> sid && s.id===sid)?.color) || null;
              const ok = await updateSlot(ev.id, { subject_id: sid, color });
              if (ok) { calendar.refetchEvents(); if (window.pvShowToast) pvShowToast('Matéria atualizada'); }
            }
          } else if (act === 'delete') {
            const conf = await (window.pvShowConfirm ? pvShowConfirm('Excluir este bloco de estudo?') : Promise.resolve(true));
            if (conf) { const ok = await deleteSlot(ev.id); if (ok) { ev.remove(); if (window.pvShowToast) pvShowToast('Excluído'); } }
          }
        } catch(e){ console.error('click failed', e); }
      }
    });

    calendar.render();

    // reload on filter change
    const filter = document.getElementById('planner-subject-filter');
    if (filter) filter.addEventListener('change', ()=> calendar.refetchEvents());

    // botão rápido para criar bloco solto (08:00-09:00 na segunda)
    const quickBtn = document.getElementById('btn-add-slot');
    if (quickBtn) quickBtn.addEventListener('click', async function(){
      try {
        const pick = await pickCourseAndSubject(courses, subjects);
        if (pick.cancelled) return;
        if (pick.subjectId && !subjects.some(s => s.id === pick.subjectId)) {
          subjects = await loadSubjects();
        }
        const title = await (window.pvShowPrompt ? pvShowPrompt('Título do bloco de estudo:', '') : Promise.resolve(''));
        const sObj = pick.subjectId ? subjects.find(s => s.id === pick.subjectId) : null;
        const cObj = (pick.courseId !== null) ? (Array.isArray(courses) ? courses.find(c => c.id === pick.courseId) : null) : null;
        const color = (sObj && sObj.color) || (cObj && cObj.color) || null;
        const id = await createSlot({ day_of_week:1, start_time:'08:00:00', end_time:'09:00:00', subject_id: pick.subjectId || null, title: title||null, color });
        if (id) { calendar.refetchEvents(); if (window.pvShowToast) pvShowToast('Bloco criado'); }
      } catch(e){ console.error('quick create failed', e); }
    });
  });
})();
