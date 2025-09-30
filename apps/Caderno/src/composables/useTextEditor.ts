import { ref, Ref } from 'vue'

// Tamanhos de fonte predefinidos
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72]
const DEFAULT_FONT_SIZE = 16

export function useTextEditor(editorRef: Ref<HTMLElement | undefined>) {
  // Estados reativos
  const currentFontSize = ref(DEFAULT_FONT_SIZE)
  const characterCount = ref(0)
  const wordCount = ref(0)
  const lineCount = ref(0)

  // Histórico para undo/redo
  const history = ref<string[]>([])
  const historyIndex = ref(-1)
  let isUndoRedoOperation = false

  // Função para salvar estado no histórico
  const saveToHistory = () => {
    if (!editorRef.value || isUndoRedoOperation) return

    const content = editorRef.value.innerHTML

    // Evita duplicatas consecutivas
    if (history.value.length > 0 && history.value[historyIndex.value] === content) {
      return
    }

    // Remove estados futuros se estivermos no meio do histórico
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Adiciona novo estado
    history.value.push(content)
    historyIndex.value = history.value.length - 1

    // Limita o histórico a 50 estados
    if (history.value.length > 50) {
      history.value.shift()
      historyIndex.value--
    }

    console.log(`📝 Histórico salvo: ${history.value.length} estados, índice atual: ${historyIndex.value}`)
  }

  // Função para obter a seleção atual
  const getSelection = () => {
    return window.getSelection()
  }

  // Função para salvar a seleção
  const saveSelection = () => {
    const selection = getSelection()
    if (!selection || selection.rangeCount === 0) return null

    const range = selection.getRangeAt(0)
    return {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    }
  }

  // Função para restaurar a seleção
  const restoreSelection = (savedSelection: any) => {
    if (!savedSelection) return

    try {
      const range = document.createRange()
      range.setStart(savedSelection.startContainer, savedSelection.startOffset)
      range.setEnd(savedSelection.endContainer, savedSelection.endOffset)

      const selection = getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    } catch (e) {
      console.warn('Erro ao restaurar seleção:', e)
    }
  }

  // Função para executar comando
  const execCommand = (command: string, value: any = null) => {
    if (!editorRef.value) return false

    const savedSelection = saveSelection()
    const result = document.execCommand(command, false, value)

    if (savedSelection) {
      restoreSelection(savedSelection)
    }

    saveToHistory()
    return result
  }

  // Função para verificar se uma formatação está ativa
  const isFormatActive = (format: string): boolean => {
    try {
      return document.queryCommandState(format)
    } catch {
      return false
    }
  }

  // Função para alternar formatação
  const toggleFormat = (format: string) => {
    execCommand(format)
    updateToolbarState()
  }

  // Função para aumentar fonte
  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(currentFontSize.value)
    const nextIndex = Math.min(currentIndex + 1, FONT_SIZES.length - 1)
    const newSize = FONT_SIZES[nextIndex]

    applyFontSize(newSize)
  }

  // Função para diminuir fonte
  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(currentFontSize.value)
    const prevIndex = Math.max(currentIndex - 1, 0)
    const newSize = FONT_SIZES[prevIndex]

    applyFontSize(newSize)
  }

  // Função para aplicar tamanho de fonte
  const applyFontSize = (size: number) => {
    const selection = getSelection()
    if (!selection || !editorRef.value) return

    if (selection.rangeCount === 0) {
      // Se não há seleção, aplica ao elemento focado
      editorRef.value.style.fontSize = `${size}px`
      currentFontSize.value = size
      return
    }

    const range = selection.getRangeAt(0)

    if (range.collapsed) {
      // Cursor sem seleção - cria span para próximo texto
      const span = document.createElement('span')
      span.style.fontSize = `${size}px`
      span.setAttribute('data-font-size', size.toString())

      // Adiciona um caractere zero-width para posicionar o cursor
      const textNode = document.createTextNode('\u200B')
      span.appendChild(textNode)

      range.insertNode(span)
      range.setStartAfter(textNode)
      range.collapse(true)

      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      // Há texto selecionado - envolve em span
      try {
        const contents = range.extractContents()
        const span = document.createElement('span')
        span.style.fontSize = `${size}px`
        span.setAttribute('data-font-size', size.toString())
        span.appendChild(contents)

        range.insertNode(span)

        // Reseleciona o conteúdo
        range.selectNodeContents(span)
        selection.removeAllRanges()
        selection.addRange(range)
      } catch (e) {
        console.warn('Erro ao aplicar tamanho de fonte:', e)
      }
    }

    currentFontSize.value = size
    saveToHistory()
  }

  // Função para definir alinhamento
  const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    const commands: Record<string, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull'
    }

    execCommand(commands[align])
  }

  // Função para inserir lista
  const insertList = (type: 'ul' | 'ol') => {
    const command = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList'
    execCommand(command)
  }

  // Função para inserir tabela
  const insertTable = () => {
    const rows = prompt('Número de linhas:', '3')
    const cols = prompt('Número de colunas:', '3')

    if (!rows || !cols) return

    const rowCount = parseInt(rows)
    const colCount = parseInt(cols)

    if (isNaN(rowCount) || isNaN(colCount) || rowCount < 1 || colCount < 1) {
      alert('Por favor, insira números válidos')
      return
    }

    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1rem 0;">'

    // Cabeçalho
    tableHTML += '<thead><tr>'
    for (let j = 0; j < colCount; j++) {
      tableHTML += `<th style="border: 1px solid #e2e8f0; padding: 0.5rem; background: #f8fafc;">Cabeçalho ${j + 1}</th>`
    }
    tableHTML += '</tr></thead>'

    // Corpo
    tableHTML += '<tbody>'
    for (let i = 0; i < rowCount - 1; i++) {
      tableHTML += '<tr>'
      for (let j = 0; j < colCount; j++) {
        tableHTML += '<td style="border: 1px solid #e2e8f0; padding: 0.5rem;">Célula</td>'
      }
      tableHTML += '</tr>'
    }
    tableHTML += '</tbody></table>'

    execCommand('insertHTML', tableHTML)
  }

  // Função para inserir link
  const insertLink = () => {
    const url = prompt('URL do link:', 'https://')
    if (url) {
      execCommand('createLink', url)
    }
  }

  // Função para limpar formatação
  const clearFormatting = () => {
    execCommand('removeFormat')

    // Remove também estilos inline
    const selection = getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedElements = range.cloneContents().querySelectorAll('*')

      selectedElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.removeAttribute('style')
        }
      })
    }
  }

  // Função para aplicar cor do texto
  const applyTextColor = (color: string) => {
    execCommand('foreColor', color)
  }

  // Função para aplicar cor de fundo
  const applyBackgroundColor = (color: string) => {
    execCommand('hiliteColor', color)
  }

  // Função para desfazer
  const undo = () => {
    if (historyIndex.value > 0) {
      isUndoRedoOperation = true
      historyIndex.value--
      const content = history.value[historyIndex.value]
      if (editorRef.value) {
        editorRef.value.innerHTML = content
        console.log(`↶ Undo: índice agora é ${historyIndex.value}/${history.value.length - 1}`)
      }
      setTimeout(() => { isUndoRedoOperation = false }, 100)
    } else {
      console.log('↶ Undo: Não há mais estados para desfazer')
    }
  }

  // Função para refazer
  const redo = () => {
    if (historyIndex.value < history.value.length - 1) {
      isUndoRedoOperation = true
      historyIndex.value++
      const content = history.value[historyIndex.value]
      if (editorRef.value) {
        editorRef.value.innerHTML = content
        console.log(`↷ Redo: índice agora é ${historyIndex.value}/${history.value.length - 1}`)
      }
      setTimeout(() => { isUndoRedoOperation = false }, 100)
    } else {
      console.log('↷ Redo: Não há mais estados para refazer')
    }
  }

  // Função para atualizar contadores
  const updateCounts = (text: string) => {
    characterCount.value = text.length
    wordCount.value = text.trim() ? text.trim().split(/\s+/).length : 0
    lineCount.value = text.split('\n').length
  }

  // Função para atualizar estado da toolbar
  const updateToolbarState = () => {
    // Detecta tamanho de fonte atual
    const selection = getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      let element = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer as HTMLElement

      while (element && element !== editorRef.value) {
        const fontSize = window.getComputedStyle(element).fontSize
        if (fontSize) {
          const size = parseInt(fontSize)
          if (!isNaN(size)) {
            currentFontSize.value = size
            break
          }
        }
        element = element.parentElement
      }
    }
  }

  return {
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
    insertTable,
    insertLink,
    clearFormatting,
    applyTextColor,
    applyBackgroundColor,
    undo,
    redo,
    updateCounts,
    updateToolbarState,
    saveToHistory
  }
}
