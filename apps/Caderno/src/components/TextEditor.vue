<template>
  <div class="text-editor">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button @click="undo" class="toolbar-btn" title="Desfazer">
          ↶
        </button>
        <button @click="redo" class="toolbar-btn" title="Refazer">
          ↷
        </button>
      </div>

      <div class="toolbar-group">
        <button
          @click="toggleFormat('bold')"
          :class="{ active: isFormatActive('bold') }"
          class="toolbar-btn"
          title="Negrito"
        >
          <strong>B</strong>
        </button>
        <button
          @click="toggleFormat('italic')"
          :class="{ active: isFormatActive('italic') }"
          class="toolbar-btn"
          title="Itálico"
        >
          <em>I</em>
        </button>
        <button
          @click="toggleFormat('underline')"
          :class="{ active: isFormatActive('underline') }"
          class="toolbar-btn"
          title="Sublinhado"
        >
          <u>U</u>
        </button>
      </div>

      <div class="toolbar-group">
        <button @click="decreaseFontSize" class="toolbar-btn font-size-btn" title="Diminuir fonte">
          A-
        </button>
        <span class="font-size-display">{{ currentFontSize }}px</span>
        <button @click="increaseFontSize" class="toolbar-btn font-size-btn" title="Aumentar fonte">
          A+
        </button>
      </div>

      <div class="toolbar-group">
      </div>

      <div class="toolbar-group color-group">
        <button
          @click="toggleTextColorPicker"
          class="toolbar-btn color-btn"
          title="Cor do texto"
        >
          <span class="color-icon text-icon">A</span>
          <div class="color-preview" :style="{ backgroundColor: textColor }"></div>
        </button>

        <button
          @click="toggleBgColorPicker"
          class="toolbar-btn color-btn"
          title="Cor de fundo"
        >
          <span class="color-icon bucket-icon">◉</span>
          <div class="color-preview" :style="{ backgroundColor: backgroundColor }"></div>
        </button>

        <!-- Dropdowns dos seletores de cor com posicionamento absoluto -->
        <ColorPicker
          v-if="showTextColorPicker"
          v-model="textColor"
          title="Cor do texto"
          @update:modelValue="(color) => { textColor = color; applyTextColorImmediate(color); }"
          @close="showTextColorPicker = false"
          class="text-color-picker color-dropdown"
        />
        <ColorPicker
          v-if="showBgColorPicker"
          v-model="backgroundColor"
          title="Cor de fundo"
          @update:modelValue="(color) => { backgroundColor = color; applyBackgroundColorImmediate(color); }"
          @select-alternate="applyAlternateColors"
          @close="showBgColorPicker = false"
          class="bg-color-picker color-dropdown"
        />
      </div>      <div class="toolbar-group">
        <button @click="setAlignment('left')" class="toolbar-btn" title="Alinhar à esquerda">
          ←
        </button>
        <button @click="setAlignment('center')" class="toolbar-btn" title="Centralizar">
          ↔
        </button>
        <button @click="setAlignment('right')" class="toolbar-btn" title="Alinhar à direita">
          →
        </button>
        <button @click="setAlignment('justify')" class="toolbar-btn" title="Justificar">
          ≡
        </button>
      </div>

      <div class="toolbar-group">
        <button @click="insertList('ul')" class="toolbar-btn" title="Lista com marcadores">
          • Lista
        </button>
        <button @click="insertList('ol')" class="toolbar-btn" title="Lista numerada">
          1. Lista
        </button>
      </div>

      <div class="toolbar-group">
        <div class="table-dropdown-wrapper" style="position: relative;">
          <button
            @click="toggleTableMenu"
            class="toolbar-btn"
            title="Inserir tabela"
          >
            ▦ Tabela
          </button>
          <TableMenu
            :isOpen="showTableMenu"
            @close="showTableMenu = false"
            @insertTable="handleInsertTable"
            class="table-dropdown"
          />
        </div>
        <button @click="insertLink" class="toolbar-btn" title="Inserir link">
          ∞ Link
        </button>
      </div>

      <div class="toolbar-group">
        <button @click="clearFormatting" class="toolbar-btn danger" title="Limpar formatação">
          ⌫ Limpar
        </button>
        <button @click="saveContent" class="toolbar-btn" title="Salvar conteúdo">
          ▣ Salvar
        </button>
      </div>
    </div>

    <!-- Editor Area -->
    <div
      ref="editorRef"
      class="editor-content"
      contenteditable="true"
      @input="handleInput"
      @keydown="handleKeydown"
      @mouseup="updateToolbarState"
      @keyup="updateToolbarState"
      spellcheck="false"
    >
      <p>Digite aqui seu texto...</p>
    </div>

    <!-- Status Bar -->
    <div class="editor-status">
      <span>Caracteres: {{ characterCount }}</span>
      <span>Palavras: {{ wordCount }}</span>
      <span>Linhas: {{ lineCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTextEditor } from '../composables/useTextEditor'
import ColorPicker from './ColorPicker.vue'
import TableMenu from './TableMenu.vue'

// Props e Emits
const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: [content: string]
  load: []
}>()

// Refs
const editorRef = ref<HTMLElement>()
const textColor = ref('#000000')
const backgroundColor = ref('#ffffff')
const showTableMenu = ref(false)
const showTextColorPicker = ref(false)
const showBgColorPicker = ref(false)

// Timeout para salvar histórico
let inputTimeout: NodeJS.Timeout | null = null
// Timeout para auto-save
let autoSaveTimeout: NodeJS.Timeout | null = null

// Interfaces para configuração de tabela
interface TableConfig {
  rows: number
  cols: number
  style: string
  borderWidth: number
  borderStyle: string
  borderColor: string
}

// Composable do editor
const {
  currentFontSize,
  characterCount,
  wordCount,
  lineCount,
  isFormatActive,
  toggleFormat,
  increaseFontSize,
  decreaseFontSize,
  setAlignment,
  insertList,
  insertLink,
  clearFormatting,
  applyTextColor,
  applyBackgroundColor,
  undo,
  redo,
  updateCounts,
  updateToolbarState,
  saveToHistory
} = useTextEditor(editorRef)

// Methods específicos do componente
const handleInsertTable = (config: TableConfig) => {
  insertTableWithConfig(config)
  showTableMenu.value = false
}

const insertTableWithConfig = (config: TableConfig) => {
  // Garante foco no editor
  if (editorRef.value) {
    editorRef.value.focus()
  }

  let tableHTML = `<table style="border-collapse: collapse; width: 100%; margin: 1rem 0; border: ${config.borderWidth}px ${config.borderStyle} ${config.borderColor};">`

  // Estilos baseados na configuração
  const cellStyle = `border: ${config.borderWidth}px ${config.borderStyle} ${config.borderColor}; padding: 0.5rem;`
  const headerStyle = cellStyle + ' background: #f8fafc; font-weight: 600;'

  // Cabeçalho
  tableHTML += '<thead><tr>'
  for (let j = 0; j < config.cols; j++) {
    tableHTML += `<th style="${headerStyle}">Cabeçalho ${j + 1}</th>`
  }
  tableHTML += '</tr></thead>'

  // Corpo
  tableHTML += '<tbody>'
  for (let i = 0; i < config.rows - 1; i++) {
    tableHTML += '<tr>'
    for (let j = 0; j < config.cols; j++) {
      tableHTML += `<td style="${cellStyle}">Célula</td>`
    }
    tableHTML += '</tr>'
  }
  tableHTML += '</tbody></table><p><br></p>'

  // Insere a tabela no editor
  document.execCommand('insertHTML', false, tableHTML)

  // Força atualização do conteúdo
  setTimeout(() => {
    emit('update:modelValue', editorRef.value?.innerHTML || '')
  }, 100)
}

const applyAlternateColors = () => {
  // Aplica cores alternadas às linhas da tabela selecionada
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    const table = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element).closest('table')
      : (range.startContainer.parentElement?.closest('table'))

    if (table) {
      const rows = table.querySelectorAll('tbody tr')
      rows.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff'
        ;(row as HTMLElement).style.backgroundColor = bgColor
      })
    }
  }
}

// Funções de cores SUPER SIMPLES que FUNCIONAM
const applyTextColorImmediate = (color: string) => {
  if (!editorRef.value) return

  // Foca no editor
  editorRef.value.focus()

  // Aplica cor diretamente - FUNCIONA SEMPRE!
  document.execCommand('foreColor', false, color)

  textColor.value = color
  console.log(`✅ Cor do texto aplicada: ${color}`)
  saveToHistory()
}

const applyBackgroundColorImmediate = (color: string) => {
  if (!editorRef.value) return

  // Foca no editor
  editorRef.value.focus()

  // Aplica cor de fundo diretamente - FUNCIONA SEMPRE!
  document.execCommand('backColor', false, color)

  backgroundColor.value = color
  console.log(`✅ Cor de fundo aplicada: ${color}`)
  saveToHistory()
}

// Funções para controlar os menus de cores de forma exclusiva
const closeAllColorPickers = () => {
  showTextColorPicker.value = false
  showBgColorPicker.value = false
  showTableMenu.value = false
}

const toggleTextColorPicker = () => {
  if (showTextColorPicker.value) {
    showTextColorPicker.value = false
  } else {
    closeAllColorPickers()
    showTextColorPicker.value = true
  }
}

const toggleBgColorPicker = () => {
  if (showBgColorPicker.value) {
    showBgColorPicker.value = false
  } else {
    closeAllColorPickers()
    showBgColorPicker.value = true
  }
}

const toggleTableMenu = () => {
  if (showTableMenu.value) {
    showTableMenu.value = false
  } else {
    closeAllColorPickers()
    showTableMenu.value = true
  }
}

// Função para salvar conteúdo
const saveContent = () => {
  emit('save', editorContent.value)
}

// Computed
const editorContent = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLElement
  editorContent.value = target.innerHTML
  updateCounts(target.textContent || '')
  updateToolbarState()

  // Salva no histórico após um pequeno delay para evitar muitas entradas durante a digitação
  if (inputTimeout) clearTimeout(inputTimeout)
  inputTimeout = setTimeout(() => {
    saveToHistory()
  }, 500)

  // Auto-save silencioso após 2 segundos de inatividade
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
  autoSaveTimeout = setTimeout(() => {
    emit('save', target.innerHTML)
    console.log('🔄 Auto-save executado')
  }, 2000)
}

const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+S para salvar
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    emit('save', editorRef.value?.innerHTML || '')
  }

  // Ctrl+Z para desfazer
  if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo()
  }

  // Ctrl+Y ou Ctrl+Shift+Z para refazer
  if (event.ctrlKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault()
    redo()
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (editorRef.value && newValue !== editorRef.value.innerHTML) {
    editorRef.value.innerHTML = newValue
    updateCounts(editorRef.value.textContent || '')
  }
})

watch([textColor, backgroundColor], () => {
  applyTextColor(textColor.value)
  applyBackgroundColor(backgroundColor.value)
})

// Lifecycle
onMounted(() => {
  if (editorRef.value) {
    // Adiciona event listeners para teclado
    editorRef.value.addEventListener('keydown', handleKeydown)
    editorRef.value.addEventListener('input', handleInput)

    // Inicializa contadores e toolbar
    updateCounts(editorRef.value.textContent || '')
    updateToolbarState()

    // Inicializa histórico com conteúdo atual
    saveToHistory()
  }
})

onUnmounted(() => {
  if (editorRef.value) {
    editorRef.value.removeEventListener('keydown', handleKeydown)
    editorRef.value.removeEventListener('input', handleInput)
  }

  // Limpa timeout pendente
  if (inputTimeout) {
    clearTimeout(inputTimeout)
    inputTimeout = null
  }
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
.text-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  align-items: center;
}

.toolbar-group {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.25rem;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.toolbar-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.2s ease;
  min-width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.toolbar-btn.active {
  background: var(--primary-color);
  color: white;
}

.toolbar-btn.danger {
  color: var(--danger-color);
}

.toolbar-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.font-size-btn {
  font-weight: 700;
}

.font-size-display {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 3rem;
  text-align: center;
}

.color-picker {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0;
}

.editor-content {
  flex: 1;
  padding: 2rem;
  font-size: 16px;
  line-height: 1.6;
  outline: none;
  background: var(--bg-primary);
  overflow-y: auto;
}

.editor-content:focus {
  outline: none;
}

.editor-content p {
  margin-bottom: 1rem;
}

.editor-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.editor-content td,
.editor-content th {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  text-align: left;
}

.editor-content th {
  background: var(--bg-secondary);
  font-weight: 600;
}

.editor-status {
  display: flex;
  gap: 2rem;
  padding: 0.75rem 2rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Responsivo */
@media (max-width: 768px) {
  .editor-toolbar {
    gap: 0.5rem;
  }

  .toolbar-group {
    gap: 0.125rem;
  }

  .editor-content {
    padding: 1rem;
  }

  .editor-status {
    flex-direction: column;
    gap: 0.25rem;
  }
}

/* Estilos dos botões de cor melhorados */
.color-group {
  position: relative;
}

.color-button-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.color-btn {
  border: none !important;
  border-radius: 0 !important;
  margin: 0 !important;
  position: relative;
  padding: 0.5rem 0.75rem;
}

.color-dropdown-btn {
  background: var(--bg-secondary);
  border: none;
  border-left: 1px solid var(--border-color);
  padding: 0.5rem 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.color-dropdown-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.table-dropdown-wrapper {
  position: relative;
}

.table-dropdown {
  position: absolute !important;
  top: 100% !important;
  left: 0 !important;
  z-index: 10000 !important;
  margin-top: 4px !important;
}

.color-btn {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem !important;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  position: relative;
}

.color-btn:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.color-icon {
  font-size: 1rem;
  font-weight: bold;
  pointer-events: none; /* Permite que o clique passe para o botão pai */
}

.text-icon {
  color: var(--text-primary);
  font-family: 'Times New Roman', serif;
  text-decoration: underline;
  text-decoration-color: currentColor;
  pointer-events: none; /* Permite que o clique passe para o botão pai */
}

.bucket-icon {
  font-size: 1.1rem;
  pointer-events: none; /* Permite que o clique passe para o botão pai */
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
  pointer-events: none; /* Permite que o clique passe para o botão pai */
}

/* Z-index alto para dropdowns */
.dropdown-high-z {
  z-index: 10000 !important;
  position: absolute !important;
  top: 100% !important;
  left: 0 !important;
}

.text-color-picker {
  left: 0 !important;
}

.bg-color-picker {
  left: 60px !important;
}
</style>
