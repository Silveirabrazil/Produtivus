<template>
  <div id="    <main class="app-main">
      <div class="container">
        <NotebookTabs />
      </div>
    </main>  <header class="app-header">
      <div class="container">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="app-title">
              📝 Editor Caderno
            </h1>
            <span class="app-subtitle">Produtivus</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="saveDocument" class="btn btn-primary btn-sm">
              💾 Salvar
            </button>
            <button @click="loadDocument" class="btn btn-secondary btn-sm">
              📂 Carregar
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="container">
        <TextEditor
          v-model="documentContent"
          @save="handleSave"
          @load="handleLoad"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextEditor from './components/TextEditor.vue'

const documentContent = ref('')

const saveDocument = () => {
  const content = documentContent.value
  if (content) {
    localStorage.setItem('caderno-document', content)
    alert('Documento salvo com sucesso!')
  }
}

const loadDocument = () => {
  const saved = localStorage.getItem('caderno-document')
  if (saved) {
    documentContent.value = saved
    alert('Documento carregado com sucesso!')
  } else {
    alert('Nenhum documento salvo encontrado.')
  }
}

const handleSave = (content: string) => {
  documentContent.value = content
  saveDocument()
}

const handleLoad = () => {
  loadDocument()
}
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: var(--shadow-md);
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.app-subtitle {
  font-size: 0.875rem;
  opacity: 0.8;
  font-weight: 500;
}

.app-main {
  padding: 2rem 0;
  min-height: calc(100vh - 80px);
}

.btn {
  border: none !important;
}

.btn:hover {
  box-shadow: var(--shadow-sm);
}
</style>
