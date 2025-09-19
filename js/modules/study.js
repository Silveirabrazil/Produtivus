// js/modules/study.js
// Suporte a matérias (subjects) e metadados de estudo embutidos em tarefas

(function(){
  const LS_SUBJECTS = 'pv_subjects';
  const STUDY_MARK = '[[STUDY]]';
  const API_SUBJECTS = '/server/api/subjects.php';
  const API_COURSES = '/server/api/courses.php';

  // --- Subjects persistence (server + fallback local) ---
  async function fetchSubjects(){
    try {
      const r = await fetch(API_SUBJECTS, { credentials: 'same-origin' });
      if (r.ok) {
        const j = await r.json();
        if (j && j.success && Array.isArray(j.items)) {
          try { localStorage.setItem(LS_SUBJECTS, JSON.stringify(j.items)); } catch{}
          return j.items;
        }
      }
    } catch {}
    // fallback local
    try { return JSON.parse(localStorage.getItem(LS_SUBJECTS) || '[]'); } catch { return []; }
  }
  async function addSubject(name, color, courseId){
  const body = { name: name||'Sem nome', color: color||'#365562' };
    if (courseId) body.course_id = courseId;
    try {
      const r = await fetch(API_SUBJECTS, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(body) });
      const j = await r.json().catch(()=>null);
      if (r.ok && j && j.success && j.id) {
        const cur = await fetchSubjects();
        return String(j.id);
      }
    } catch {}
    // fallback local
    try {
      const list = await fetchSubjects();
      const id = String(Date.now());
      list.push({ id, name: body.name, color: body.color, course_id: body.course_id || null });
      localStorage.setItem(LS_SUBJECTS, JSON.stringify(list));
      return id;
    } catch { return String(Date.now()); }
  }
  async function updateSubject(id, patch){
    try {
      const r = await fetch(API_SUBJECTS+'?id='+encodeURIComponent(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(patch || {})
      });
      const j = await r.json().catch(()=>null);
      if (r.ok && j && j.success) {
        // refresh cache
        await fetchSubjects();
        return true;
      }
    } catch {}
    return false;
  }
  // Courses API
  async function loadCourses(){
    try {
      const r = await fetch(API_COURSES, { credentials: 'same-origin' });
      if (r.ok) {
        const j = await r.json();
        if (j && j.success && Array.isArray(j.items)) return j.items;
      }
    } catch {}
    return [];
  }
  async function addCourse(name, color){
    const body = { name: name||'Curso', color: color||'#365562' };
    const r = await fetch(API_COURSES, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify(body) });
    const j = await r.json().catch(()=>null);
    if (r.ok && j && j.success && j.id) return String(j.id);
    return null;
  }
  async function updateCourse(id, patch){
    try {
      const r = await fetch(API_COURSES+'?id='+encodeURIComponent(id), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(patch||{})
      });
      const j = await r.json().catch(()=>null);
      return !!(r.ok && j && j.success);
    } catch { return false; }
  }
  async function removeCourse(id){
    try { const r = await fetch(API_COURSES+'?id='+encodeURIComponent(id), { method:'DELETE', credentials:'same-origin' }); return r.ok; } catch { return false; }
  }
  async function removeSubject(id){
    try { await fetch(API_SUBJECTS+'?id='+encodeURIComponent(id), { method:'DELETE', credentials:'same-origin' }); } catch {}
    try {
      const list = (await fetchSubjects()).filter(s => String(s.id) !== String(id));
      localStorage.setItem(LS_SUBJECTS, JSON.stringify(list));
    } catch {}
  }
  async function getSubject(id){
    const list = await fetchSubjects();
    return list.find(s => String(s.id) === String(id)) || null;
  }
  async function loadSubjects(){
    return await fetchSubjects();
  }
  function saveSubjects(list){
    try { localStorage.setItem(LS_SUBJECTS, JSON.stringify(Array.isArray(list)?list:[])); } catch{}
  }

  // Meta: serializa em uma linha ao final da descrição
  function buildStudyMetaString(meta){
    try {
      const json = JSON.stringify(meta || {});
      return `\n\n${STUDY_MARK}${json}`;
    } catch { return ''; }
  }
  function parseStudyMetaFromDesc(desc){
    if (!desc) return null;
    const idx = desc.lastIndexOf(STUDY_MARK);
    if (idx === -1) return null;
    try {
      const jsonStr = desc.slice(idx + STUDY_MARK.length).trim();
      const obj = JSON.parse(jsonStr);
      return obj && typeof obj === 'object' ? obj : null;
    } catch { return null; }
  }
  function stripStudyMetaFromDesc(desc){
    if (!desc) return '';
    const idx = desc.lastIndexOf(STUDY_MARK);
    if (idx === -1) return desc;
    return desc.slice(0, idx).trimEnd();
  }

  // Agrega minutos por matéria nos últimos N dias
  async function sumMinutesBySubject(tasks, days){
    const map = new Map();
    const now = new Date();
    const since = new Date(now); since.setDate(now.getDate() - (days||7));
    const subjects = await loadSubjects();
    for (const t of (Array.isArray(tasks)?tasks:[])){
      if (!t) continue;
      const meta = parseStudyMetaFromDesc(t.desc || t.description || '');
      if (!meta || !meta.subjectId) continue;
      // Data de referência: end/start/updated/created
      const d = normalizeAnyDate(t.end) || normalizeAnyDate(t.start) || normalizeAnyDate(t.updatedAt||t.updated_at) || normalizeAnyDate(t.createdAt||t.created_at);
      if (!d || d < since) continue;
      const min = Number(meta.actualMinutes || meta.estimatedMinutes || 0) || 0;
      if (!min) continue;
      const key = String(meta.subjectId);
      const cur = map.get(key) || { minutes:0, subjectId: key };
      cur.minutes += min;
      map.set(key, cur);
    }
    // materializar com nomes/cores
    return Array.from(map.values()).map(r => {
      const s = subjects.find(su => String(su.id)===String(r.subjectId)) || { name: 'Matéria', color: '#365562' };
      return { ...r, name: s.name, color: s.color };
    }).sort((a,b)=> b.minutes - a.minutes);
  }

  function normalizeAnyDate(v){
    if (!v) return null;
    try {
      const s = String(v).trim();
      let d;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) d = new Date(s.slice(0,10));
      else {
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
        else d = new Date(s);
      }
      return isNaN(d) ? null : d;
    } catch { return null; }
  }

  // Expose
  window.study = {
  loadSubjects, saveSubjects, addSubject, updateSubject, removeSubject, getSubject,
  loadCourses, addCourse, updateCourse, removeCourse,
  buildStudyMetaString, parseStudyMetaFromDesc, stripStudyMetaFromDesc, sumMinutesBySubject
  };
})();
