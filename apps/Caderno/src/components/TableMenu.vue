<template>
  <div class="table-menu-dropdown" v-if="isOpen" @click.stop>
    <div class="menu-header">
      <h3>📊 Inserir Tabela</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>

    <!-- Grid Visual - Criação Rápida -->
    <div class="quick-section">
      <h4>✨ Criação Rápida</h4>
      <p class="help-text">Arraste sobre os quadradinhos para selecionar o tamanho</p>
      <div class="grid-visual-quick">
        <div
          v-for="(_, rowIndex) in 8"
          :key="rowIndex"
          class="grid-row"
        >
          <div
            v-for="(_, colIndex) in 10"
            :key="colIndex"
            class="grid-cell"
            :class="{
              'highlighted': rowIndex < previewRows && colIndex < previewCols
            }"
            @mouseenter="updatePreview(rowIndex + 1, colIndex + 1)"
            @click="createQuickTable(rowIndex + 1, colIndex + 1)"
          ></div>
        </div>
      </div>
      <div class="size-display-quick">
        {{ previewRows }} × {{ previewCols }} (Clique para criar!)
      </div>
    </div>

    <!-- Divisor -->
    <div class="divider">
      <span>OU</span>
    </div>

    <!-- Configuração Avançada (Colapsável) -->
    <div class="advanced-section">
      <button @click="showAdvanced = !showAdvanced" class="section-toggle">
        🔧 Configuração Avançada {{ showAdvanced ? '▲' : '▼' }}
      </button>

      <div v-if="showAdvanced" class="advanced-content">
        <!-- Seletor de tamanho manual -->
        <div class="size-selector-manual">
          <h4>Tamanho Manual</h4>
          <div class="size-inputs">
            <div class="input-group">
              <label>Linhas:</label>
              <input type="number" v-model="selectedRows" min="1" max="20">
            </div>
            <div class="input-group">
              <label>Colunas:</label>
              <input type="number" v-model="selectedCols" min="1" max="20">
            </div>
          </div>
        </div>

    <!-- Estilos de tabela -->
    <div class="table-styles-section">
      <h4>Estilos de Tabela</h4>
      <div class="style-grid">
        <div
          v-for="style in tableStyles"
          :key="style.name"
          class="style-option"
          :class="{ active: selectedStyle === style.name }"
          @click="selectStyle(style.name)"
        >
          <div class="style-preview" :style="style.preview">
            <div class="mini-table">
              <div class="mini-row header">
                <div class="mini-cell">A</div>
                <div class="mini-cell">B</div>
                <div class="mini-cell">C</div>
              </div>
              <div class="mini-row">
                <div class="mini-cell">1</div>
                <div class="mini-cell">2</div>
                <div class="mini-cell">3</div>
              </div>
            </div>
          </div>
          <span class="style-name">{{ style.name }}</span>
        </div>
      </div>
    </div>

    <!-- Configurações de borda -->
    <div class="border-section">
      <h4>Configurações de Borda</h4>

      <div class="border-controls">
        <div class="control-group">
          <label>Espessura:</label>
          <select v-model="borderWidth">
            <option value="1">1px - Fina</option>
            <option value="2">2px - Média</option>
            <option value="3">3px - Grossa</option>
            <option value="4">4px - Extra Grossa</option>
          </select>
        </div>

        <div class="control-group">
          <label>Estilo:</label>
          <select v-model="borderStyle">
            <option value="solid">Sólida</option>
            <option value="dashed">Tracejada</option>
            <option value="dotted">Pontilhada</option>
            <option value="double">Dupla</option>
          </select>
        </div>

        <div class="control-group">
          <label>Cor:</label>
          <ColorPicker v-model="borderColor" />
        </div>
      </div>
    </div>

    <!-- Ações -->
    <div class="menu-actions">
      <button @click="insertTable" class="btn btn-primary">
        📊 Inserir Tabela
      </button>
      <button @click="$emit('close')" class="btn btn-secondary">
        Cancelar
      </button>
    </div>

        <!-- Botões de ação para seção avançada -->
        <div class="action-buttons">
          <button @click="insertTable" class="btn btn-primary">
            📊 Criar Tabela Personalizada
          </button>
          <button @click="$emit('close')" class="btn btn-secondary">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ColorPicker from './ColorPicker.vue'

// Props e Emits
defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  insertTable: [config: TableConfig]
}>()

// Interfaces
interface TableConfig {
  rows: number
  cols: number
  style: string
  borderWidth: number
  borderStyle: string
  borderColor: string
}

// Estados reativos
const selectedRows = ref(3)
const selectedCols = ref(3)
const previewRows = ref(3)
const previewCols = ref(3)
const showAdvanced = ref(false)
const selectedStyle = ref('basic')
const borderWidth = ref(1)
const borderStyle = ref('solid')
const borderColor = ref('#000000')
// const showColorPicker = ref(false)

// Estilos de tabela predefinidos
const tableStyles = [
  {
    name: 'default',
    preview: {
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0'
    }
  },
  {
    name: 'striped',
    preview: {
      background: 'linear-gradient(to bottom, #f8fafc 50%, #fff 50%)'
    }
  },
  {
    name: 'bordered',
    preview: {
      backgroundColor: '#fff',
      border: '2px solid #3b82f6'
    }
  },
  {
    name: 'dark',
    preview: {
      backgroundColor: '#1e293b',
      color: '#fff'
    }
  },
  {
    name: 'success',
    preview: {
      backgroundColor: '#dcfce7',
      border: '1px solid #16a34a'
    }
  },
  {
    name: 'warning',
    preview: {
      backgroundColor: '#fef3c7',
      border: '1px solid #d97706'
    }
  }
]

// Methods
const updatePreview = (rows: number, cols: number) => {
  previewRows.value = rows
  previewCols.value = cols
}

// Função para criação rápida de tabela
const createQuickTable = (rows: number, cols: number) => {
  const config: TableConfig = {
    rows,
    cols,
    style: 'basic',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e2e8f0'
  }

  emit('insertTable', config)
  emit('close')
}

// const resetPreview = () => {
//   previewRows.value = selectedRows.value
//   previewCols.value = selectedCols.value
// }

// const selectSize = (rows: number, cols: number) => {
//   selectedRows.value = rows
//   selectedCols.value = cols
//   previewRows.value = rows
//   previewCols.value = cols
// }

const selectStyle = (styleName: string) => {
  selectedStyle.value = styleName
}

const insertTable = () => {
  const config: TableConfig = {
    rows: selectedRows.value,
    cols: selectedCols.value,
    style: selectedStyle.value,
    borderWidth: borderWidth.value,
    borderStyle: borderStyle.value,
    borderColor: borderColor.value
  }

  emit('insertTable', config)
  emit('close')
}
</script>

<style scoped>
.table-menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 1.5rem;
  width: 450px;
  max-height: 500px;
  overflow-y: auto;
  z-index: 1000;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.menu-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.table-size-section,
.table-styles-section,
.border-section {
  margin-bottom: 1.5rem;
}

.table-size-section h4,
.table-styles-section h4,
.border-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.size-selector {
  text-align: center;
}

.grid-preview {
  display: inline-block;
  margin-bottom: 0.5rem;
}

.grid-row {
  display: flex;
}

.grid-cell {
  width: 20px;
  height: 20px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-cell:hover,
.grid-cell.highlighted {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.grid-cell.selected {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.size-display {
  font-weight: 600;
  color: var(--text-primary);
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.style-option {
  text-align: center;
  cursor: pointer;
  padding: 0.75rem;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.style-option:hover {
  border-color: var(--border-hover);
  background: var(--bg-secondary);
}

.style-option.active {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.1);
}

.style-preview {
  width: 100%;
  height: 50px;
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-table {
  display: flex;
  flex-direction: column;
  width: 60px;
  height: 30px;
  font-size: 10px;
}

.mini-row {
  display: flex;
  flex: 1;
}

.mini-row.header {
  font-weight: 600;
}

.mini-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
}

.style-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.border-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-group label {
  font-weight: 500;
  color: var(--text-primary);
  min-width: 80px;
}

.control-group select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: white;
}

.menu-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

/* Estilos da nova interface */
.table-menu-dropdown {
  z-index: 9999 !important; /* Z-index alto para ficar acima de tudo */
}

.quick-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1rem;
  border: 2px dashed var(--primary-color);
}

.help-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  text-align: center;
}

.grid-visual-quick {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 1rem;
  padding: 1rem;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.grid-visual-quick .grid-cell {
  width: 24px;
  height: 24px;
  border: 1px solid #cbd5e1;
  transition: all 0.15s ease;
  cursor: pointer;
}

.grid-visual-quick .grid-cell:hover,
.grid-visual-quick .grid-cell.highlighted {
  background: var(--primary-color);
  border-color: var(--primary-hover);
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.size-display-quick {
  text-align: center;
  font-weight: 600;
  color: var(--primary-color);
  font-size: 1.1rem;
  padding: 0.75rem;
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--primary-color);
}

.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem 0;
  position: relative;
}

.divider::before {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.divider span {
  padding: 0 1rem;
  background: white;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.section-toggle {
  width: 100%;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.section-toggle:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
}

.advanced-content {
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  background: white;
}

.size-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.input-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
