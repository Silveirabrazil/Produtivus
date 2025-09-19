<?php
$pageTitle = 'Produtivus — Tarefas';
$bodyClass = 'no-container';
include __DIR__ . '/inc/head.php';
?>

<!-- header dinâmico -->
<div id="header-container"></div>
<!--modal de tarefa-->
<div id="task-modal-overlay" class="modal-overlay hidden" aria-hidden="true">
            <div class="modal">
                        <button type="button" id="close-task-modal" class="close-modal" title="Fechar"
                                    aria-label="Fechar">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"
                                                            stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                        </button>
                        <form id="task-form">
            <h3 id="tm-title">Nova Tarefa</h3>
            <div class="modal-row">
                <div class="field">
                    <label for="task-title">Título</label>
                    <input type="text" id="task-title" name="title" required>
                </div>
                <div class="field">
                    <label for="task-color">Cor</label>
                    <input type="color" id="task-color" name="color" value="#E0B33A" style="width:40px; height:32px;">
                </div>
            </div>
            <div class="modal-row">
                <div class="field">
                    <label for="task-start">Início</label>
                    <input type="date" id="task-start" name="start">
                </div>
                <div class="field">
                    <label for="task-end">Término</label>
                    <input type="date" id="task-end" name="end">
                </div>
            </div>
            <div class="field">
                <label for="task-desc">Descrição</label>
                <textarea id="task-desc" name="description"></textarea>
            </div>
            <div class="field">
                <label>Subtarefas</label>
                <div id="subtasks-list" class="subtasks-list"></div>
                <button type="button" id="btn-add-subtask" class="btn btn-primary" style="margin-top:8px;">+ Adicionar subtarefa</button>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
                        </form>
            </div>
</div>
<!--modal de tarefa-->


<!-- header já inserido acima -->
<main id="main-content">

            <!--pendentes-->
            <div class="main-container tasks-pendentes-container anim-fade-up">
                        <div class="tasks-info">
                                    <h2 class="tasks-title">Tarefas Pendentes</h2>
                                    <p class="tasks-desc">Estas são as tarefas que você ainda precisa concluir.</p>
                        </div>
                        <div class="tasks-header">
                                    <button type="button" class="btn btn-primary" id="btn-add-task"
                                                title="Criar nova tarefa">+ Nova
                                                tarefa</button>
                        </div>
                        <div class="cards-grid cards-pendentes" id="cards-pendentes"></div>
            </div>
            <div class="main-container-tasks-pendentes" style="margin-top:2.5rem;">
                        <div class="tasks-info">

                                    <!--tarefas finalizadas-->
                                    <h2 class="tasks-title">Tarefas Concluídas</h2>
                                    <p class="tasks-desc">Estas são as tarefas que você já finalizou.</p>
                        </div>
                        <div class="cards-grid cards-feitas" id="cards-feitas"></div>
            </div> <!-- .main-container.tasks-feitas-container -->

</main>
<div class="cta-band">
            <div class="cta-inner">
                        <div>Organize sua semana de estudos com um plano claro e objetivo.</div>
                        <button type="button" class="cta-btn" id="cta-plan">Montar plano</button>
            </div>
</div>
<footer class="app-footer" role="contentinfo">
    <div class="app-footer-inner">
        <span>© <span id="copyright-year"></span> Produtivus — Todos os direitos reservados.</span>
    </div>
</footer>
<script src="js/protect.js" nonce="<?php echo htmlspecialchars($nonce, ENT_QUOTES); ?>"></script>
<script src="js/modules/tasks/tasks.js?v=20250823T0000" nonce="<?php echo htmlspecialchars($nonce, ENT_QUOTES); ?>"></script>
<script src="js/modules/header.js" defer></script>
<script src="js/debug/session-debug.js?v=20250823T0000" nonce="<?php echo htmlspecialchars($nonce, ENT_QUOTES); ?>"></script>

</body>

</html>
