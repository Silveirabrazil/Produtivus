// Versão de teste do tasks.js para debug - v202509280530
const API_TASKS_TEST = '/server/api/test-tasks.php';

console.log('[TEST] 🧪 Versão de teste do tasks.js carregada v202509280530');

// Mock da função onLessonFormSubmit para testes
window.onLessonFormSubmit = async function(form) {
	console.log('[AULA] 🎯 Iniciando submissão do formulário de aula (TESTE)');

	// Validar
	const title = form.querySelector('#lesson-title')?.value?.trim();
	const color = form.querySelector('#lesson-color')?.value || '#E0B33A';
	const course = form.querySelector('#lesson-course')?.value;
	const subject = form.querySelector('#lesson-subject')?.value;
	const duration = form.querySelector('#lesson-duration')?.value;

	console.log('[AULA] Dados coletados:', { title, color, course, subject, duration });

	if (!title) {
		console.error('[AULA] ❌ Título é obrigatório');
		return false;
	}

	// Montar schedule
	const schedule = {
		startDate: form.querySelector('#lesson-start-date')?.value || '',
		endDate: form.querySelector('#lesson-end-date')?.value || '',
		time: form.querySelector('#lesson-time')?.value || '',
		endTime: form.querySelector('#lesson-end-time')?.value || '',
		weekdays: Array.from(form.querySelectorAll('[data-dow]')).filter(x=>x.checked).map(x=> Number(x.getAttribute('data-dow')))
	};

	const meta = {
		type: 'lesson',
		schedule: schedule,
		estimatedMinutes: duration ? Number(duration) : null,
		course_id: course || null
	};

	console.log('[AULA] Schedule criado:', schedule);
	console.log('[AULA] Meta criado:', meta);

	// Criar payload da aula
	const payload = {
		title,
		color,
		description: `Aula de ${title}`,
		subject_id: subject || null,
		start: schedule.startDate ? schedule.startDate + 'T' + (schedule.time || '00:00') : null,
		end: schedule.endDate ? schedule.endDate + 'T' + (schedule.endTime || schedule.time || '00:00') : null,
		meta: JSON.stringify(meta),
		is_private: false,
		reminder_minutes: 15,
		location: null,
		subtasks: []
	};

	console.log('[AULA] Payload final para API de teste:', payload);

	try {
		const response = await fetch(API_TASKS_TEST, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload)
		});

		console.log('[AULA] Status da resposta:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('[AULA] ❌ Erro na API:', errorText);
			return false;
		}

		const result = await response.json();
		console.log('[AULA] ✅ Resposta da API:', result);

		if (result.success) {
			console.log('[AULA] 🎉 Aula criada com sucesso! ID:', result.id);
			return true;
		} else {
			console.error('[AULA] ❌ API retornou erro:', result.message);
			return false;
		}

	} catch (error) {
		console.error('[AULA] 💥 Exceção:', error);
		return false;
	}
};

// Mock da função addOrEditTask para testes
window.addOrEditTask = async function(taskData, editId = null) {
	console.log('[API] 📝 Iniciando addOrEditTask (TESTE) com:', { taskData, editId });

	try {
		const payload = {
			title: taskData.title || '',
			description: taskData.description || '',
			start: taskData.start || null,
			end: taskData.end || null,
			color: taskData.color || '#6A9BD1',
			subject_id: taskData.subject_id || null,
			meta: taskData.meta || null,
			is_private: taskData.is_private || false,
			reminder_minutes: taskData.reminder_minutes || null,
			location: taskData.location || null,
			subtasks: taskData.subtasks || []
		};

		console.log('[API] Payload preparado:', payload);

		const method = editId ? 'PUT' : 'POST';
		const url = API_TASKS_TEST;

		console.log('[API] Fazendo requisição:', { method, url });

		const response = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload)
		});

		console.log('[API] Status da resposta:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('[API] ❌ Erro na resposta:', errorText);
			return false;
		}

		const result = await response.json();
		console.log('[API] ✅ Resultado da API:', result);

		const itemType = (payload.meta && payload.meta.includes('"type":"lesson"')) ? 'Aula' : 'Tarefa';
		const actionText = editId ? 'atualizada' : 'criada';

		console.log(`[API] 🎉 ${itemType} ${actionText} com sucesso! ID: ${result.id}`);

		return true;

	} catch (error) {
		console.error('[API] 💥 Erro no addOrEditTask:', error);
		return false;
	}
};

// Mock da função getTasks para testes
window.getTasks = async function() {
	console.log('[API] 📋 Carregando tarefas (TESTE)');

	try {
		const response = await fetch(API_TASKS_TEST, {
			method: 'GET',
			credentials: 'include'
		});

		if (!response.ok) {
			console.error('[API] ❌ Erro ao carregar tarefas:', response.status);
			return [];
		}

		const result = await response.json();
		console.log('[API] ✅ Tarefas carregadas:', result);

		return result.tasks || [];

	} catch (error) {
		console.error('[API] 💥 Erro ao carregar tarefas:', error);
		return [];
	}
};

console.log('[TEST] 🚀 Funções de teste registradas no window');
