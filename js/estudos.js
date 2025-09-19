// JS extracted from estudos.html — renderers and modal handlers
(function(){
    'use strict';

    async function renderCoursesOnPage() {
        var host = document.getElementById('page-courses-accordion-host');
        if (!host) return;
        var courses = await (window.study && window.study.loadCourses ? window.study.loadCourses() : Promise.resolve([]));
        var subjects = await (window.study && window.study.loadSubjects ? window.study.loadSubjects() : Promise.resolve([]));
        host.innerHTML = '';
        if (!courses || courses.length === 0) {
            host.innerHTML = '<div class="text-muted">Nenhum curso cadastrado.</div>';
            return;
        }
        var acc = document.createElement('div'); acc.className = 'accordion';
        courses.forEach(function(c) {
            var id = 'page-course-' + String(c.id);
            var headerId = 'heading-' + id;
            var collapseId = 'collapse-' + id;
            var item = document.createElement('div'); item.className = 'accordion-item mb-2';

            var h2 = document.createElement('h2'); h2.className = 'accordion-header'; h2.id = headerId;
            var btn = document.createElement('button'); btn.className = 'accordion-button collapsed'; btn.type = 'button';
            btn.setAttribute('data-bs-toggle','collapse'); btn.setAttribute('data-bs-target','#' + collapseId); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-controls', collapseId);
            btn.textContent = c.name || '';
            h2.appendChild(btn);

            var collapse = document.createElement('div'); collapse.id = collapseId; collapse.className = 'accordion-collapse collapse'; collapse.setAttribute('aria-labelledby', headerId); collapse.setAttribute('data-bs-parent', '#page-courses-accordion-host');
            var body = document.createElement('div'); body.className = 'accordion-body';
            var ul = document.createElement('ul'); ul.className = 'list-group list-group-flush';
            var subs = subjects.filter(function(s){ return String(s.course_id) === String(c.id); });
            subs.forEach(function(s){
                var li = document.createElement('li'); li.className = 'list-group-item d-flex justify-content-between align-items-center';
                var span = document.createElement('span'); span.textContent = s.name || '';
                var divbtn = document.createElement('div');
                var open = document.createElement('button'); open.className = 'btn btn-sm btn-outline-secondary btn-open-caderno'; open.setAttribute('data-subject-id', s.id); open.textContent = 'Abrir';
                divbtn.appendChild(open);
                li.appendChild(span); li.appendChild(divbtn); ul.appendChild(li);
            });
            body.appendChild(ul); collapse.appendChild(body);
            item.appendChild(h2); item.appendChild(collapse); acc.appendChild(item);
        });
        host.appendChild(acc);

        // wire buttons
        var opens = host.querySelectorAll('.btn-open-caderno');
        opens.forEach(function(btn){ btn.addEventListener('click', function(){ var sid = btn.getAttribute('data-subject-id'); if(window.openCadernoBySubjectId) return window.openCadernoBySubjectId(sid); if(window.study && window.study.openCaderno) return window.study.openCaderno(sid); }); });
    }

    async function loadModalData() {
        var acc = document.getElementById('modal-courses-accordion'); if(!acc) return;
        var courses = await (window.study && window.study.loadCourses ? window.study.loadCourses() : Promise.resolve([]));
        var subjects = await (window.study && window.study.loadSubjects ? window.study.loadSubjects() : Promise.resolve([]));
        acc.innerHTML = '';
        courses.forEach(function(c){
            var id = 'modal-course-' + String(c.id);
            var headerId = 'heading-' + id;
            var collapseId = 'collapse-' + id;
            var item = document.createElement('div'); item.className = 'accordion-item mb-2';

            var h2 = document.createElement('h2'); h2.className = 'accordion-header'; h2.id = headerId;
            var btn = document.createElement('button'); btn.className = 'accordion-button collapsed'; btn.type = 'button';
            btn.setAttribute('data-bs-toggle','collapse'); btn.setAttribute('data-bs-target','#' + collapseId); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-controls', collapseId);
            btn.textContent = c.name || '';
            h2.appendChild(btn);

            var collapse = document.createElement('div'); collapse.id = collapseId; collapse.className = 'accordion-collapse collapse'; collapse.setAttribute('aria-labelledby', headerId); collapse.setAttribute('data-bs-parent', '#modal-courses-accordion');
            var body = document.createElement('div'); body.className = 'accordion-body';

            var topRow = document.createElement('div'); topRow.className = 'd-flex justify-content-between mb-2';
            var left = document.createElement('div'); var small = document.createElement('small'); small.className = 'text-muted'; small.textContent = 'Matérias:'; left.appendChild(small);
            var right = document.createElement('div'); var del = document.createElement('button'); del.className = 'btn btn-sm btn-outline-danger btn-delete-course'; del.setAttribute('data-course-id', c.id); del.textContent = 'Remover Curso'; right.appendChild(del);
            topRow.appendChild(left); topRow.appendChild(right);

            var ul = document.createElement('ul'); ul.className = 'list-group list-group-flush mb-2';
            var subs = subjects.filter(function(s){ return String(s.course_id) === String(c.id); });
            subs.forEach(function(s){ var li = document.createElement('li'); li.className = 'list-group-item d-flex justify-content-between align-items-center'; var span = document.createElement('span'); span.textContent = s.name || ''; var rb = document.createElement('div'); var rbtn = document.createElement('button'); rbtn.className = 'btn btn-sm btn-outline-danger btn-remove-subject'; rbtn.setAttribute('data-subject-id', s.id); rbtn.textContent = 'Remover'; rb.appendChild(rbtn); li.appendChild(span); li.appendChild(rb); ul.appendChild(li); });

            body.appendChild(topRow); body.appendChild(ul); collapse.appendChild(body); item.appendChild(h2); item.appendChild(collapse); acc.appendChild(item);
        });

        // wire delete handlers
        acc.querySelectorAll('.btn-delete-course').forEach(function(b){ b.addEventListener('click', async function(){ var id = b.getAttribute('data-course-id'); if(!id) return; var ok = window.pvShowConfirm ? await window.pvShowConfirm('Remover este curso?') : confirm('Remover este curso?'); if(!ok) return; await window.study.removeCourse(id); await loadModalData(); await renderCoursesOnPage(); }); });
        acc.querySelectorAll('.btn-remove-subject').forEach(function(b){ b.addEventListener('click', async function(){ var id = b.getAttribute('data-subject-id'); if(!id) return; var ok = window.pvShowConfirm ? await window.pvShowConfirm('Remover esta matéria?') : confirm('Remover esta matéria?'); if(!ok) return; await window.study.removeSubject(id); await loadModalData(); await renderCoursesOnPage(); }); });
    }

    // Single DOMContentLoaded handler: wire buttons, mount tools, initial render
    document.addEventListener('DOMContentLoaded', async function(){
        try{ var y = document.getElementById('copyright-year'); if(y) y.textContent = new Date().getFullYear(); }catch(e){}

        try{ var all = Array.from(document.querySelectorAll('#btn-manage-courses')); if(all.length>1) all.slice(1).forEach(function(n){ n.remove(); }); }catch(e){}

        var btn = document.getElementById('btn-manage-courses');
        if(btn) btn.addEventListener('click', function(){ var modalEl = document.getElementById('modal-manage-courses'); if(!modalEl) return; var modal = new bootstrap.Modal(modalEl); modal.show(); try{ loadModalData(); }catch(e){} });

        // modal add course handler
        var addCourseBtn = document.getElementById('modal-course-add');
        if(addCourseBtn) addCourseBtn.addEventListener('click', async function(){
            var nameEl = document.getElementById('modal-course-name');
            var colorEl = document.getElementById('modal-course-color');
            var name = nameEl ? nameEl.value.trim() : '';
            var color = colorEl ? colorEl.value : '#365562';
            if(!name) return;
            if(window.study && window.study.addCourse){
                try{ var id = await window.study.addCourse(name, color); nameEl.value = ''; await loadModalData(); await renderCoursesOnPage(); }catch(e){ /* ignore */ }
            }
        });

        // mount pv tools if available
        try{
            if(!window._pv_tools_mounted){ var host = document.getElementById('studies-tools'); if(host && (!host.children || host.children.length === 0)){ var col1 = document.createElement('div'); var col2 = document.createElement('div'); host.appendChild(col1); host.appendChild(col2); try{ await window.pvStudyTimer?.mount?.(col1); }catch(e){} try{ await window.pvFlashcards?.mount?.(col2); }catch(e){} window._pv_tools_mounted = true; } }
        }catch(e){}

        // initial render
        try{ if(window.renderCoursesOnPage) renderCoursesOnPage(); }catch(e){}
    });

    window.loadModalData = loadModalData; window.renderCoursesOnPage = renderCoursesOnPage;

})();
