<template>
  <div class="notebook-container">
    <!-- Menu Lateral Colapsável -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <button @click="toggleSidebar" class="collapse-btn" :title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
        <h3 v-show="!sidebarCollapsed">📚 Meus cadernos</h3>
        <button v-show="!sidebarCollapsed" @click="refreshNotebooks" class="refresh-btn" title="Atualizar">
          ↻
        </button>
        <button v-show="!sidebarCollapsed" @click="debugTabs" class="refresh-btn" title="Debug" style="background: red;">
          ⚙
        </button>
      </div>

      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <!-- Filtros -->
        <div class="filters-section">
          <div class="filter-group">
            <label>Curso</label>
            <select v-model="selectedCourse" @change="loadSubjects(selectedCourse || undefined); loadNotebooks()">
              <option :value="null">Todos os cursos</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Matéria</label>
            <select v-model="selectedSubject" @change="loadNotebooks()">
              <option :value="null">Todas as matérias</option>
              <option v-for="subject in subjects" :key="subject.id" :value="subject.id">
                {{ subject.name }}
              </option>
            </select>
          </div>

          <div class="search-group">
            <label>Buscar</label>
            <input
              type="text"
              v-model="searchTerm"
              placeholder="Título ou palavra-chave"
              @input="filterNotebooks"
            >
          </div>
        </div>

        <!-- Botões de ação -->
        <div class="action-buttons">
          <button @click="showCreateModal = true" class="btn btn-primary">
            ＋ Novo caderno
          </button>
        </div>

        <!-- Lista de cadernos -->
        <div class="notebooks-list">
          <h4>Cadernos do Servidor</h4>
          <div
            class="notebook-item"
            v-for="notebook in filteredNotebooks"
            :key="notebook.id"
            @click="openNotebook(notebook)"
            style="cursor: pointer;"
          >
            <div class="notebook-info">
              <div class="notebook-title">{{ notebook.title }}</div>
              <div class="notebook-subject">
                {{ subjects.find(s => s.id === notebook.subject_id)?.name || 'Sem matéria' }}
                <span v-if="notebook.pages_count > 0"> • {{ notebook.pages_count }} página{{ notebook.pages_count !== 1 ? 's' : '' }}</span>
              </div>
            </div>
            <button @click.stop="deleteNotebook(notebook)" class="delete-btn" title="Excluir">
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Área principal dos cadernos -->
    <div class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="notebook-tabs">
        <!-- Header das abas -->
    <div class="tabs-header">
      <div class="tabs-list">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: activeTab === tab.id }"
          @click="selectTab(tab.id)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <button
            v-if="tabs.length > 1"
            @click.stop="closeTab(tab.id)"
            class="tab-close"
            title="Fechar aba"
          >
            ×
          </button>
        </div>

        <button @click="addNewTab" class="add-tab-btn" title="Nova aba">
          + Nova Página
        </button>

        <button @click="manualSave" class="action-btn" title="Salvar tudo">
          ▣ Salvar
        </button>
        <div class="tab-menu-wrapper">
          <button @click="showTabMenu = !showTabMenu" class="action-btn" title="Opções">
            ⋮
          </button>
          <!-- Menu de opções das abas -->
          <div v-if="showTabMenu" class="tab-menu-dropdown" @click.stop>
            <div class="menu-item" @click="duplicateTab">
              ⎘ Duplicar aba
            </div>
            <div class="menu-item" @click="renameTab">
              ✎ Renomear aba
            </div>
            <div class="menu-item" @click="moveTabLeft" :class="{ disabled: !canMoveLeft }">
              ← Mover para esquerda
            </div>
            <div class="menu-item" @click="moveTabRight" :class="{ disabled: !canMoveRight }">
              → Mover para direita
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" @click="exportTab">
              ↗ Exportar aba
            </div>
            <div class="menu-item" @click="importTab">
              ↙ Importar aba
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item danger" @click="closeAllOtherTabs">
              × Fechar outras abas
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Área de edição -->
    <div class="editor-area" v-if="currentTab">
      <TextEditor
        :key="activeTab"
        :model-value="currentTab.content"
        @update:model-value="updateTabContent"
        @save="updateTabContent"
      />
    </div>
  </div>
</div>

    <!-- Modal de renomeação -->
    <div v-if="showRenameModal" class="modal-overlay" @click="showRenameModal = false">
      <div class="modal-content" @click.stop>
        <h3>Renomear Aba</h3>
        <input
          v-model="renameValue"
          @keyup.enter="confirmRename"
          @keyup.escape="showRenameModal = false"
          class="rename-input"
          placeholder="Nome da aba"
          ref="renameInput"
        />
        <div class="modal-actions">
          <button @click="confirmRename" class="btn btn-primary">Confirmar</button>
          <button @click="showRenameModal = false" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmação de exclusão -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDeleteNotebook">
      <div class="modal-content" @click.stop>
        <h3>Excluir Caderno</h3>
        <p>Tem certeza que deseja excluir o caderno <strong>"{{ deleteNotebookTitle }}"</strong>?</p>
        <p class="text-danger">Esta ação não pode ser desfeita. Todas as páginas e conteúdo serão perdidos.</p>
        <div class="modal-actions">
          <button @click="confirmDeleteNotebook" class="btn btn-danger">Excluir</button>
          <button @click="cancelDeleteNotebook" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de criação de caderno -->
    <div v-if="showCreateModal" class="modal-overlay" @click="cancelCreateNotebook">
      <div class="modal-content" @click.stop>
        <h3>Criar Novo Caderno</h3>

        <!-- Passo 1: Escolher tipo -->
        <div v-if="createModalStep === 1">
          <p>Como você deseja criar o caderno?</p>
          <div class="creation-options">
            <label class="option-card" :class="{ selected: newNotebookType === 'standalone' }">
              <input type="radio" v-model="newNotebookType" value="standalone" />
              <div class="option-content">
                <h4>⚠ Caderno Avulso</h4>
                <p>Caderno independente, não vinculado a nenhuma matéria ou curso.</p>
              </div>
            </label>

            <label class="option-card" :class="{ selected: newNotebookType === 'linked' }">
              <input type="radio" v-model="newNotebookType" value="linked" />
              <div class="option-content">
                <h4>◉ Caderno Vinculado</h4>
                <p>Caderno organizado por matéria e curso para melhor estruturação.</p>
              </div>
            </label>
          </div>

          <div class="modal-actions">
            <button @click="createModalStep = 2" class="btn btn-primary" :disabled="!newNotebookType">
              Continuar →
            </button>
            <button @click="cancelCreateNotebook" class="btn btn-secondary">Cancelar</button>
          </div>
        </div>

        <!-- Passo 2: Detalhes do caderno -->
        <div v-if="createModalStep === 2">
          <div class="form-group">
            <label for="notebook-title">Título do Caderno</label>
            <input
              id="notebook-title"
              type="text"
              v-model="newNotebookTitle"
              placeholder="Digite o título do caderno"
              class="form-control"
              @keyup.enter="createNotebook"
              ref="titleInput"
            />
          </div>

          <div v-if="newNotebookType === 'linked'" class="form-group">
            <label for="notebook-course">Curso</label>
            <select id="notebook-course" v-model="newNotebookCourse" @change="loadSubjects(newNotebookCourse || undefined)" class="form-control">
              <option :value="null">Selecione um curso</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name }}
              </option>
            </select>
          </div>

          <div v-if="newNotebookType === 'linked'" class="form-group">
            <label for="notebook-subject">Matéria</label>
            <select id="notebook-subject" v-model="newNotebookSubject" class="form-control">
              <option :value="null">Selecione uma matéria</option>
              <option v-for="subject in subjects.filter(s => !newNotebookCourse || s.course_id === newNotebookCourse)" :key="subject.id" :value="subject.id">
                {{ subject.name }}
              </option>
            </select>
          </div>

          <div class="modal-actions">
            <button @click="createNotebook" class="btn btn-primary" :disabled="!newNotebookTitle.trim()">
              Criar Caderno
            </button>
            <button @click="createModalStep = 1" class="btn btn-secondary">← Voltar</button>
            <button @click="cancelCreateNotebook" class="btn btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import TextEditor from './TextEditor.vue'
import { api, type Course, type Subject, type Notebook } from '../services/api'

// Interfaces
interface NotebookTab {
  id: string
  title: string
  content: string
  created: Date
  modified: Date
  notebookId?: number // ID do caderno no servidor
  pageId?: number     // ID da página no servidor
}

// Estados reativos
const tabs = ref<NotebookTab[]>([])
const activeTab = ref<string>('')
const showTabMenu = ref(false)
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement>()
const deleteNotebookId = ref<number | null>(null)
const deleteNotebookTitle = ref('')

// Modal de criação de caderno
const showCreateModal = ref(false)
const newNotebookTitle = ref('')
const newNotebookType = ref<'standalone' | 'linked'>('standalone')
const newNotebookSubject = ref<number | null>(null)
const newNotebookCourse = ref<number | null>(null)
const createModalStep = ref(1) // 1 = tipo, 2 = detalhes

// Estados do sidebar
const sidebarCollapsed = ref(false)
const selectedCourse = ref<number | null>(null)
const selectedSubject = ref<number | null>(null)
const searchTerm = ref('')

// Dados do servidor
const courses = ref<Course[]>([])
const subjects = ref<Subject[]>([])
const notebooks = ref<Notebook[]>([])
const filteredNotebooks = ref<Notebook[]>([])

// Computed
const currentTab = computed(() => {
  return tabs.value.find(tab => tab.id === activeTab.value)
})

const canMoveLeft = computed(() => {
  const currentIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  return currentIndex > 0
})

const canMoveRight = computed(() => {
  const currentIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  return currentIndex < tabs.value.length - 1
})

// Utilitários
const generateId = () => {
  return 'tab-' + Math.random().toString(36).substr(2, 9)
}

const generateTitle = () => {
  const number = tabs.value.length + 1
  return `Página ${number}`
}

// Methods - API
const loadCourses = async () => {
  try {
    courses.value = await api.courses.getAll()
  } catch (error) {
    console.error('Erro ao carregar cursos:', error)
  }
}

const loadSubjects = async (courseId?: number) => {
  try {
    subjects.value = await api.subjects.getAll(courseId)
  } catch (error) {
    console.error('Erro ao carregar matérias:', error)
  }
}

const loadNotebooks = async () => {
  try {
    console.log('🔄 Carregando cadernos do servidor...')
    const filters: { course_id?: number; subject_id?: number } = {}
    if (selectedCourse.value) filters.course_id = selectedCourse.value
    if (selectedSubject.value) filters.subject_id = selectedSubject.value

    console.log('📋 Filtros aplicados:', filters)
    notebooks.value = await api.notebooks.getAll(filters)
    console.log('📚 Cadernos carregados:', notebooks.value.length, notebooks.value)
    filterNotebooks()
  } catch (error) {
    console.error('❌ Erro ao carregar cadernos:', error)
    // Se der erro, mostra lista vazia em vez de falhar
    notebooks.value = []
    filteredNotebooks.value = []
  }
}

const filterNotebooks = () => {
  let filtered = [...notebooks.value]

  // Filtro por termo de busca
  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(notebook =>
      notebook.title.toLowerCase().includes(term)
    )
  }

  filteredNotebooks.value = filtered
}

// Methods - Debug
const debugTabs = () => {
  console.log('=== DEBUG TABS ===')
  console.log('tabs.value:', tabs.value)
  console.log('activeTab.value:', activeTab.value)
  console.log('currentTab.value:', currentTab.value)
  console.log('tabs.length:', tabs.value.length)

  // Força recriação se não há abas
  if (tabs.value.length === 0) {
    console.log('Criando aba forçadamente...')
    localStorage.clear()
    addNewTab()
  }
}

// Methods - Sidebar
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString())
}

const refreshNotebooks = () => {
  // Simular refresh dos cadernos
  console.log('Atualizando lista de cadernos...')
  loadNotebooks()
}

// Criação de cadernos com modal
const cancelCreateNotebook = () => {
  showCreateModal.value = false
  newNotebookTitle.value = ''
  newNotebookType.value = 'standalone'
  newNotebookSubject.value = null
  newNotebookCourse.value = null
  createModalStep.value = 1
}

const createNotebook = async () => {
  if (!newNotebookTitle.value.trim()) return

  try {
    // Cria apenas o caderno (container)
    const notebookData: { title: string; subject_id?: number } = {
      title: newNotebookTitle.value.trim()
    }

    if (newNotebookType.value === 'linked' && newNotebookSubject.value) {
      notebookData.subject_id = newNotebookSubject.value
    }

    const notebookId = await api.notebooks.create(notebookData)

    if (notebookId) {
      console.log(`✅ Caderno "${notebookData.title}" criado com ID: ${notebookId}`)

      // Recarrega a lista de cadernos
      await loadNotebooks()

      // Fecha o modal
      cancelCreateNotebook()
    }
  } catch (error) {
    console.error('Erro ao criar caderno:', error)
    alert('Erro ao criar caderno. Tente novamente.')
  }
}

// Método para abrir um caderno (carrega suas páginas)
const openNotebook = async (notebook: Notebook) => {
  try {
    console.log(`📖 Abrindo caderno: ${notebook.title} (ID: ${notebook.id})`)

    // Busca todas as páginas do caderno
    const pages = await api.pages.getAll(notebook.id)
    console.log(`📄 Encontradas ${pages.length} páginas no caderno`)

    if (pages.length === 0) {
      // Se não há páginas, apenas exibe mensagem - NÃO cria página automaticamente
      console.log(`📝 Caderno "${notebook.title}" está vazio. Use "Nova Página" para adicionar conteúdo.`)
      alert(`Caderno "${notebook.title}" está vazio.\nClique em "Nova Página" para adicionar conteúdo.`)
      return
    } else {
      // Se há páginas, abre APENAS A PRIMEIRA página
      const firstPage = pages[0]

      // Verifica se já existe aba para esta página
      const existingTab = tabs.value.find(tab => tab.pageId === firstPage.id)

      if (existingTab) {
        // Se já existe, apenas seleciona
        selectTab(existingTab.id)
        return
      }

      // Cria aba apenas para a primeira página
      const newTab: NotebookTab = {
        id: generateId(),
        title: firstPage.title,
        content: firstPage.content,
        created: new Date(firstPage.created || Date.now()),
        modified: new Date(firstPage.updated || Date.now()),
        notebookId: notebook.id,
        pageId: firstPage.id
      }

      tabs.value.push(newTab)
      selectTab(newTab.id)
      saveTabs()
    }
  } catch (error) {
    console.error('Erro ao abrir caderno:', error)
    alert('Erro ao abrir caderno. Tente novamente.')
  }
}

const deleteNotebook = async (notebook: Notebook) => {
  deleteNotebookId.value = notebook.id
  deleteNotebookTitle.value = notebook.title
  showDeleteModal.value = true
}

const confirmDeleteNotebook = async () => {
  if (!deleteNotebookId.value) return

  try {
    await api.notebooks.delete(deleteNotebookId.value)

    // Remove abas relacionadas ao caderno deletado
    tabs.value = tabs.value.filter(tab => tab.notebookId !== deleteNotebookId.value)

    // Se a aba ativa foi removida, seleciona outra
    if (!tabs.value.find(tab => tab.id === activeTab.value)) {
      if (tabs.value.length > 0) {
        activeTab.value = tabs.value[0].id
      } else {
        addNewTab()
      }
    }

    saveTabs()
    loadNotebooks() // Recarrega lista
    showDeleteModal.value = false
    deleteNotebookId.value = null
    deleteNotebookTitle.value = ''
  } catch (error) {
    console.error('Erro ao excluir caderno:', error)
    alert('Erro ao excluir caderno. Tente novamente.')
  }
}

const cancelDeleteNotebook = () => {
  showDeleteModal.value = false
  deleteNotebookId.value = null
  deleteNotebookTitle.value = ''
}

// Methods - Gerenciamento de abas
const addNewTab = async () => {
  // Verifica se há um caderno ativo na aba atual
  const currentTabData = currentTab.value
  let notebookId: number | undefined

  if (currentTabData?.notebookId) {
    // Se há uma aba ativa com caderno, adiciona página ao mesmo caderno
    notebookId = currentTabData.notebookId
  } else {
    // Se não há caderno ativo, cria um caderno temporário
    console.log('⚠ Nenhum caderno ativo. Criando caderno temporário...')
    try {
      notebookId = await api.notebooks.create({
        title: 'Caderno Temporário',
      })

      if (notebookId) {
        await loadNotebooks() // Atualiza lista
      }
    } catch (error) {
      console.error('Erro ao criar caderno temporário:', error)
      // Fallback: cria aba local sem vínculo com servidor
      const newTab: NotebookTab = {
        id: generateId(),
        title: generateTitle(),
        content: '',
        created: new Date(),
        modified: new Date()
      }

      tabs.value.push(newTab)
      selectTab(newTab.id)
      saveTabs()
      return
    }
  }

  if (notebookId) {
    try {
      // Conta quantas páginas já existem no caderno para gerar título adequado
      const existingPages = await api.pages.getAll(notebookId)
      const pageNumber = existingPages.length + 1
      const pageTitle = `Página ${pageNumber}`

      // Cria nova página no servidor
      const pageId = await api.pages.create({
        notebook_id: notebookId,
        title: pageTitle,
        content: ''
      })

      if (pageId) {
        // Cria aba para a nova página
        const newTab: NotebookTab = {
          id: generateId(),
          title: pageTitle,
          content: '',
          created: new Date(),
          modified: new Date(),
          notebookId: notebookId,
          pageId: pageId
        }

        tabs.value.push(newTab)
        selectTab(newTab.id)
        saveTabs()

        console.log(`✅ Nova página "${pageTitle}" criada no caderno ID: ${notebookId}`)
      }
    } catch (error) {
      console.error('Erro ao criar nova página:', error)
      alert('Erro ao criar nova página. Tente novamente.')
    }
  }
}

const selectTab = (tabId: string) => {
  activeTab.value = tabId
  showTabMenu.value = false
}

const closeTab = (tabId: string) => {
  if (tabs.value.length <= 1) return

  const tabIndex = tabs.value.findIndex(tab => tab.id === tabId)
  tabs.value.splice(tabIndex, 1)

  // Se fechou a aba ativa, seleciona outra
  if (activeTab.value === tabId) {
    const newActiveIndex = Math.min(tabIndex, tabs.value.length - 1)
    activeTab.value = tabs.value[newActiveIndex].id
  }

  saveTabs()
}

const duplicateTab = () => {
  const current = currentTab.value
  if (!current) return

  const newTab: NotebookTab = {
    id: generateId(),
    title: `${current.title} (Cópia)`,
    content: current.content,
    created: new Date(),
    modified: new Date()
  }

  tabs.value.push(newTab)
  selectTab(newTab.id)
  saveTabs()
}

const renameTab = () => {
  const current = currentTab.value
  if (!current) return

  renameValue.value = current.title
  showRenameModal.value = true

  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

const confirmRename = () => {
  const current = currentTab.value
  if (!current || !renameValue.value.trim()) return

  current.title = renameValue.value.trim()
  current.modified = new Date()
  showRenameModal.value = false
  saveTabs()
}

const moveTabLeft = () => {
  if (!canMoveLeft.value) return

  const currentIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  const tab = tabs.value.splice(currentIndex, 1)[0]
  tabs.value.splice(currentIndex - 1, 0, tab)
  saveTabs()
}

const moveTabRight = () => {
  if (!canMoveRight.value) return

  const currentIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  const tab = tabs.value.splice(currentIndex, 1)[0]
  tabs.value.splice(currentIndex + 1, 0, tab)
  saveTabs()
}

const closeAllOtherTabs = () => {
  const current = currentTab.value
  if (!current) return

  tabs.value = [current]
  saveTabs()
}

// Methods - Persistência
const saveTabs = () => {
  try {
    localStorage.setItem('caderno-tabs', JSON.stringify(tabs.value))
    localStorage.setItem('caderno-active-tab', activeTab.value)
  } catch (e) {
    console.error('Erro ao salvar abas:', e)
  }
}

// const saveTab = (tabId: string) => {
//   const tab = tabs.value.find(t => t.id === tabId)
//   if (tab) {
//     tab.modified = new Date()
//     saveTabs()
//   }
// }

const saveAllTabs = async () => {
  let savedCount = 0
  let errorCount = 0

  for (const tab of tabs.value) {
    tab.modified = new Date()

    // Salva no servidor se tiver pageId
    if (tab.pageId) {
      try {
        await api.pages.update(tab.pageId, {
          title: tab.title,
          content: tab.content
        })
        savedCount++
        console.log(`✅ Aba "${tab.title}" salva no servidor`)
      } catch (error) {
        errorCount++
        console.error(`❌ Erro ao salvar aba "${tab.title}":`, error)
      }
    }
  }

  // Salva localmente também (backup)
  saveTabs()

  // SÓ mostra mensagem se houver erro de verdade ou se o usuário pedir
  if (errorCount > 0) {
    console.error(`❌ ${errorCount} abas falharam ao salvar no servidor`)
  } else if (savedCount > 0) {
    console.log(`✅ ${savedCount} abas salvas com sucesso`)
  }

  return { savedCount, errorCount }
}

// Save manual - mostra mensagem para o usuário
const manualSave = async () => {
  const { savedCount, errorCount } = await saveAllTabs()

  if (errorCount > 0) {
    alert(`❌ ${savedCount} abas salvas. ${errorCount} falharam. Verifique a conexão.`)
  } else if (savedCount > 0) {
    alert(`✅ ${savedCount} abas salvas com sucesso!`)
  } else {
    alert('ℹ️ Nenhuma aba modificada para salvar.')
  }
}

const loadTabs = () => {
  try {
    const savedTabs = localStorage.getItem('caderno-tabs')
    const savedActiveTab = localStorage.getItem('caderno-active-tab')

    if (savedTabs) {
      const parsedTabs = JSON.parse(savedTabs)
      // Converte datas de string para Date
      tabs.value = parsedTabs.map((tab: any) => ({
        ...tab,
        created: new Date(tab.created),
        modified: new Date(tab.modified)
      }))

      if (savedActiveTab && tabs.value.find(t => t.id === savedActiveTab)) {
        activeTab.value = savedActiveTab
      } else if (tabs.value.length > 0) {
        activeTab.value = tabs.value[0].id
      }
    }

    // Sempre garante que há pelo menos uma aba
    if (tabs.value.length === 0) {
      addNewTab()
    }
  } catch (e) {
    console.error('Erro ao carregar abas:', e)
    // Fallback: cria primeira aba
    addNewTab()
  }

  // Carregar estado do sidebar
  const savedSidebarState = localStorage.getItem('sidebarCollapsed')
  if (savedSidebarState) {
    sidebarCollapsed.value = savedSidebarState === 'true'
  }
}

// Methods - Import/Export
const exportTab = () => {
  const current = currentTab.value
  if (!current) return

  const data = {
    title: current.title,
    content: current.content,
    created: current.created,
    modified: current.modified
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${current.title}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importTab = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const newTab: NotebookTab = {
          id: generateId(),
          title: data.title || 'Aba Importada',
          content: data.content || '',
          created: new Date(data.created) || new Date(),
          modified: new Date()
        }

        tabs.value.push(newTab)
        selectTab(newTab.id)
        saveTabs()
      } catch (error) {
        alert('Erro ao importar arquivo. Verifique se é um arquivo válido.')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// Event listeners
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.tabs-actions')) {
    showTabMenu.value = false
  }
}

// Methods - Editor Integration
const updateTabContent = async (content: string) => {
  const tab = currentTab.value
  if (!tab) return

  tab.content = content
  tab.modified = new Date()

  // Salva no servidor se tiver pageId
  if (tab.pageId) {
    try {
      await api.pages.update(tab.pageId, { content })
    } catch (error) {
      console.error('Erro ao salvar no servidor:', error)
    }
  }

  // Salva localmente também
  saveTabs()
}

// const updateTabTitle = async (title: string) => {
//   const tab = currentTab.value
//   if (!tab) return

//   tab.title = title
//   tab.modified = new Date()

//   // Atualiza título no servidor se tiver pageId
//   if (tab.pageId) {
//     try {
//       await api.pages.update(tab.pageId, { title })
//     } catch (error) {
//       console.error('Erro ao atualizar título no servidor:', error)
//     }
//   }

//   saveTabs()
// }

// Lifecycle
onMounted(async () => {
  // Carrega dados da API
  await loadCourses()
  await loadSubjects()
  await loadNotebooks()

  // Carrega abas salvas localmente (para manter compatibilidade)
  loadTabs()

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* CSS Variables baseadas no design system do Produtivus */
:root {
  /* Cores principais do site */
  --color-bg: #ffffff;
  --color-surface: #f7f8f9;
  --color-border: #d9dde1;
  --color-text: #2d2d2d;
  --color-text-muted: #6b7175;
  --color-brand: #3A9FA9;
  --color-brand-accent: #318a92;
  --color-deep: #365562;
  --color-danger: #dc3545;
  --color-warn: #e0b33a;
  --color-success: #198754;

  /* Aliases para compatibilidade com o editor */
  --bg-primary: var(--color-bg);
  --bg-secondary: var(--color-surface);
  --bg-tertiary: #f1f3f5;
  --text-primary: var(--color-text);
  --text-secondary: var(--color-text-muted);
  --text-muted: var(--color-text-muted);
  --border-color: var(--color-border);
  --border-hover: var(--color-brand);
  --primary-color: var(--color-brand);
  --primary-hover: var(--color-brand-accent);
  --danger-color: var(--color-danger);

  /* Sombras e bordas */
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
.notebook-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
}

.tabs-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 120px;
  position: relative;
}

.tab-item:hover {
  background: var(--bg-tertiary);
}

.tab-item.active {
  background: var(--bg-primary);
  border-color: var(--primary-color);
  transform: translateY(1px);
  z-index: 10;
}

.tab-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.tab-close {
  background: none;
  border: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tab-close:hover {
  background: var(--danger-color);
  color: white;
}

.add-tab-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.add-tab-btn:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.tabs-actions {
  display: flex;
  gap: 0.5rem;
  position: relative;
}

.tab-menu-wrapper {
  position: relative;
  display: inline-block;
}

.tab-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.5rem;
  min-width: 200px;
  z-index: 1000;
}

.action-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.menu-item {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-item:hover:not(.disabled) {
  background: var(--bg-secondary);
}

.menu-item.disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: var(--radius-lg);
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.rename-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.rename-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.text-danger {
  color: var(--danger-color);
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

/* Responsivo */
@media (max-width: 768px) {
  .tabs-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .tabs-list {
    justify-content: flex-start;
  }

  .tab-item {
    min-width: 100px;
  }
}

/* Estilos do Sidebar */
.notebook-container {
  display: flex;
  height: 100vh;
  background: var(--bg-secondary);
}

.sidebar {
  width: 350px;
  background: white;
  border-right: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  overflow: hidden;
  z-index: 100;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.collapse-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: var(--primary-hover);
  transform: scale(1.05);
}

.refresh-btn {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: var(--bg-secondary);
}

.sidebar-content {
  padding: 1rem;
  height: calc(100vh - 80px);
  overflow-y: auto;
}

.filters-section {
  margin-bottom: 1.5rem;
}

.filter-group, .search-group {
  margin-bottom: 1rem;
}

.filter-group label, .search-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.filter-group select, .search-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
}

.filter-group select:focus, .search-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.action-buttons {
  margin-bottom: 1.5rem;
}

.action-buttons .btn {
  width: 100%;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  padding: 0.75rem;
  text-align: left;
  justify-content: flex-start;
}

.notebooks-list h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.notebook-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
  background: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.notebook-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.notebook-info {
  flex: 1;
}

.notebook-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.notebook-subject {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--danger-color);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: scale(1.1);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  overflow: hidden;
  background: white;
}

.main-content.sidebar-collapsed {
  margin-left: 0;
}

/* Área do editor */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
  margin: 0;
  padding: 0;
}

/* Correção para dropdowns */
.tab-menu-dropdown {
  z-index: 10000 !important;
}

.dropdown-menu {
  z-index: 10000 !important;
}

.color-picker {
  z-index: 10000 !important;
}

.table-menu {
  z-index: 10000 !important;
}

/* Estilos do modal de criação */
.creation-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
}

.option-card {
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;
}

.option-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.option-card.selected {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.option-card input[type="radio"] {
  display: none;
}

.option-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.option-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-content {
  max-width: 500px;
}
</style>
