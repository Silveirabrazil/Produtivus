// app.js:1 app.js carregado

// Versão 1.1.3

// ===================================================================
// Inicialização do estado global da aplicação
// Isso garante que a variável window.state.tasks exista e seja um array.
// ===================================================================
window.state = window.state || {
  tasks: [],
  // Outros dados do estado da aplicação podem ser adicionados aqui
};

// ===================================================================
// Renderização de tarefas com layout de card e botões estilizados
// ===================================================================
function renderTasks() {
  const main = document.querySelector("#main-content");
  if (!main) return;

  let cardsHtml = "";
  // Verifica se window.state.tasks existe e tem itens
  if (
    window.state.tasks &&
    Array.isArray(window.state.tasks) &&
    window.state.tasks.length
  ) {
    window.state.tasks.forEach((t) => {
      cardsHtml += `
            <div class="card" style="--accent:${
              t.color || "#c29d67"
            };max-width:340px;margin:auto;">
                <div class="card-border"></div>
                <div class="card-content">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span class="card-title">${t.title}</span>
                        <span style="color:${
                          t.color || "#c29d67"
                        };font-weight:700;font-size:18px;">${
        t.progress || "0"
      }%</span>
                    </div>
                    <div style="margin-top:2px;">${
                      t.desc || ""
                    } <span class="card-progress">Progresso</span></div>
                    <div style="margin-top:8px;font-size:15px;">Início: ${
                      t.start || ""
                    }<br> Término: ${t.end || ""}</div>
                    <a href="#" class="card-details">Ver detalhes</a>
                    <div class="card-btns">
                        <button class="card-btn edit" data-id="${
                          t.id
                        }">Editar</button>
                        <button class="card-btn delete" data-id="${
                          t.id
                        }">Excluir</button>
                        <button class="card-btn complete" data-id="${
                          t.id
                        }">Concluir</button>
                    </div>
                </div>
            </div>
            `;
    });
  } else {
    cardsHtml = `<div class="card" style="max-width:340px;margin:auto;padding:24px 18px 18px 18px;">Nenhuma tarefa encontrada.</div>`;
  }

  // Inserir o HTML gerado no contêiner principal
  main.innerHTML = `
        <div class="tasks-wrap center">
            <h2 style="margin-bottom:32px">Tarefas</h2>
            <div class="tasks-list">
                ${cardsHtml}
            </div>
            <button class="botao botao--primario btn-add-task" style="position:absolute;right:40px;top:40px;">+ Nova tarefa</button>
        </div>
    `;

  // Chamada para adicionar os listeners após a renderização
  addEventListenersToTasks();
}

// ===================================================================
// Função para adicionar listeners aos botões das tarefas
// Isso evita que os listeners sejam adicionados a elementos que ainda não existem
// ===================================================================
function addEventListenersToTasks() {
  // Adicionar listener ao botão de adicionar tarefa
  const addTaskBtn = document.querySelector(".btn-add-task");
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => {
      console.log('Botão "Nova tarefa" clicado!');
      // Implemente aqui a lógica para abrir o modal de nova tarefa
    });
  }

  // Adicionar listeners aos botões de tarefas individuais
  document.querySelectorAll(".card-btn.edit").forEach((button) => {
    button.addEventListener("click", (e) => {
      const taskId = e.target.dataset.id;
      console.log(`Editar tarefa com ID: ${taskId}`);
      // Implemente aqui a lógica de edição
    });
  });

  document.querySelectorAll(".card-btn.delete").forEach((button) => {
    button.addEventListener("click", (e) => {
      const taskId = e.target.dataset.id;
      console.log(`Excluir tarefa com ID: ${taskId}`);
      // Implemente aqui a lógica de exclusão
    });
  });

  document.querySelectorAll(".card-btn.complete").forEach((button) => {
    button.addEventListener("click", (e) => {
      const taskId = e.target.dataset.id;
      console.log(`Concluir tarefa com ID: ${taskId}`);
      // Implemente aqui a lógica para marcar como concluída
    });
  });
}

// ===================================================================
// Simulação de carregamento de dados (substitua por uma chamada de API)
// ===================================================================
function loadInitialData() {
  // Simulação de tarefas iniciais para o protótipo
  window.state.tasks = [
    {
      id: 1,
      title: "Tarefa 1: Estudar JavaScript",
      desc: "Revisar conceitos de escopo e closures.",
      progress: 80,
      color: "#4a90e2",
      start: "2025-08-15",
      end: "2025-08-20",
    },
    {
      id: 2,
      title: "Tarefa 2: Preparar Apresentação",
      desc: "Criar slides para a reunião de equipe.",
      progress: 50,
      color: "#50e3c2",
      start: "2025-08-18",
      end: "2025-08-22",
    },
  ];
  // Chame a renderização depois que os dados estiverem prontos
  renderTasks();
}

// ===================================================================
// Evento principal para iniciar a aplicação quando a página carregar
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM totalmente carregado e analisado.");
  loadInitialData();
});

// Exporta a função para o escopo global (opcional, mas útil para testes)
window.renderTasks = renderTasks;

// === Controle Modal Nova Tarefa (padrão .janela) ===
(function () {
  const modal = document.getElementById("taskModal");
  if (!modal) return;
  let ultimaAtiva = null;
  function abrir() {
    if (modal.classList.contains("janela--aberta")) return;
    ultimaAtiva = document.activeElement;
    modal.classList.add("janela--aberta");
    modal.removeAttribute("aria-hidden");
    // foco inicial
    const foco =
      modal.querySelector("#task-title") ||
      modal.querySelector("input,textarea,button");
    if (foco) setTimeout(() => foco.focus(), 10);
    document.addEventListener("keydown", escListener);
  }
  function fechar() {
    if (!modal.classList.contains("janela--aberta")) return;
    modal.classList.add("janela--fechando");
    setTimeout(() => {
      modal.classList.remove("janela--aberta", "janela--fechando");
      modal.setAttribute("aria-hidden", "true");
      if (ultimaAtiva && typeof ultimaAtiva.focus === "function")
        ultimaAtiva.focus();
    }, 280);
    document.removeEventListener("keydown", escListener);
  }
  function escListener(e) {
    if (e.key === "Escape") fechar();
  }
  // clique fora fecha
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) fechar();
  });
  // botão fechar
  const btnClose = modal.querySelector("[data-fechar]");
  if (btnClose) btnClose.addEventListener("click", fechar);
  // gatilhos existentes
  const gatilho = document.getElementById("btn-add-task");
  if (gatilho)
    gatilho.addEventListener("click", (e) => {
      e.preventDefault();
      abrir();
    });
  // expõe API mínima
  window.openTaskModal = abrir;
  window.closeTaskModal = fechar;
})();

// === Controle Modal Lesson e Detalhes da Tarefa (padrão .janela) ===
(function () {
  function setupJanela(id, triggerIds) {
    const modal = document.getElementById(id);
    if (!modal) return;
    let ultima = null;
    function abrir() {
      if (modal.classList.contains("janela--aberta")) return;
      ultima = document.activeElement;
      modal.classList.add("janela--aberta");
      modal.removeAttribute("aria-hidden");
      const f = modal.querySelector("input,select,textarea,button");
      if (f) setTimeout(() => f.focus(), 15);
      document.addEventListener("keydown", esc);
    }
    function fechar() {
      if (!modal.classList.contains("janela--aberta")) return;
      modal.classList.add("janela--fechando");
      setTimeout(() => {
        modal.classList.remove("janela--aberta", "janela--fechando");
        modal.setAttribute("aria-hidden", "true");
        if (ultima && typeof ultima.focus === "function") ultima.focus();
      }, 280);
      document.removeEventListener("keydown", esc);
    }
    function esc(e) {
      if (e.key === "Escape") fechar();
    }
    modal.addEventListener("mousedown", (e) => {
      if (e.target === modal) fechar();
    });
    modal
      .querySelectorAll("[data-fechar]")
      .forEach((b) => b.addEventListener("click", fechar));
    (triggerIds || []).forEach((tid) => {
      const el = document.getElementById(tid);
      if (el)
        el.addEventListener("click", (e) => {
          e.preventDefault();
          abrir();
        });
    });
    return { abrir, fechar };
  }
  const lesson = setupJanela("lessonModal", ["btn-add-lesson"]);
  const details = setupJanela("taskDetailsModal", []);
  if (lesson) {
    window.openLessonModal = lesson.abrir;
    window.closeLessonModal = lesson.fechar;
  }
  if (details) {
    window.openTaskDetails = details.abrir;
    window.closeTaskDetails = details.fechar;
  }
})();
