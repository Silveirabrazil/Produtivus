// 🚨 CORREÇÃO DE SINTAXE: Adicionado 'const' na primeira linha
const FONTES_PADRAO = [
  'Inter, system-ui, sans-serif',
  'Arial, sans-serif',
  'Verdana, sans-serif',
  'Tahoma, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Garamond, serif',
  'Courier New, monospace',
  'Consolas, monospace',
  'Helvetica, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Montserrat, sans-serif',
  'Oswald, sans-serif',
  'Poppins, sans-serif',
  'Noto Sans, sans-serif',
  'Ubuntu, sans-serif',
  'Raleway, sans-serif',
  'Merriweather, serif',
  'Playfair Display, serif',
  'Source Sans Pro, sans-serif',
  'Fira Sans, sans-serif',
  'PT Sans, sans-serif',
  'Nunito, sans-serif',
  'Cabin, sans-serif',
  'Exo, sans-serif',
  'Inconsolata, monospace',
  'JetBrains Mono, monospace',
  'Lucida Console, monospace',
];

const TAMANHOS_PX = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];
const EDITOR_BUILD = '20250929-5';
const TAMANHO_PADRAO_PX = 11;
const TAMANHO_MIN_PX = 8;
const TAMANHO_MAX_PX = 96;

const BLOCOS = [
  { rotulo: 'Parágrafo', valor: 'p' },
  { rotulo: 'Título 1', valor: 'h1' },
  { rotulo: 'Título 2', valor: 'h2' },
  { rotulo: 'Título 3', valor: 'h3' },
  { rotulo: 'Citação', valor: 'blockquote' },
  { rotulo: 'Código', valor: 'pre' },
];

const PALETA_PADRAO = ['#000000', '#7f7f7f', '#ffffff', '#ff0000', '#ffa500', '#ffff00', '#00ff00', '#00b050', '#00b0f0', '#0000ff', '#7030a0'];
const PALETA_BASE = [
  '#000000', '#404040', '#7f7f7f', '#bfbfbf', '#d9d9d9', '#efefef', '#ffffff',
  '#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#d32f2f', '#b71c1c',
  '#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#f57c00', '#e65100',
  '#fffde7', '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#ffeb3b', '#fbc02d', '#f57f17',
  '#f1f8e9', '#dcedc8', '#c5e1a5', '#aed581', '#9ccc65', '#8bc34a', '#689f38', '#33691e',
  '#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da', '#00bcd4', '#0097a7', '#006064',
  '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1976d2', '#0d47a1',
  '#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2', '#673ab7', '#5e35b1', '#311b92',
];
const COR_TEXTO_PADRAO = '#0f172a';

const MARGEM_MINIMA_PX = 16;
const LARGURA_MINIMA_CONTEUDO = 240;
const LIMITE_NORMALIZACAO = 240;
const TOLERANCIA_ALTURA_PX = 1;

class GerenciadorMenus {
  constructor(container) {
    this.container = container;
    this.ativo = null;
    this.vincular();
  }

  vincular() {
    this.container.addEventListener('click', (evento) => {
      const toggle = evento.target.closest('[data-menu-toggle]');
      if (toggle) {
        evento.preventDefault();
        this.alternar(toggle.getAttribute('data-menu-toggle'));
        return;
      }
      if (!evento.target.closest('.cn-menu__painel')) {
        this.fechar();
      }
    });
    window.addEventListener('pointerdown', (evento) => {
      if (!this.ativo) return;
      if (!evento.target.closest('.cn-menu')) {
        this.fechar();
      }
    }, true);
    window.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        this.fechar();
      }
    });
  }

  alternar(nome) {
    if (this.ativo === nome) {
      this.fechar();
      return;
    }
    this.fechar();
    const painel = this.container.querySelector(`[data-menu-painel="${nome}"]`);
    const toggle = this.container.querySelector(`[data-menu-toggle="${nome}"]`);
    if (!painel || !toggle) return;
    painel.classList.add('cn-menu__painel--aberto');
    toggle.setAttribute('aria-expanded', 'true');
    this.ativo = nome;
    this.container.dispatchEvent(new CustomEvent('cn-menu-ativado', { detail: { nome } }));
  }

  fechar() {
    if (!this.ativo) return;
    const ativoAnterior = this.ativo;
    const painel = this.container.querySelector(`[data-menu-painel="${ativoAnterior}"]`);
    const toggle = this.container.querySelector(`[data-menu-toggle="${ativoAnterior}"]`);
    if (painel) painel.classList.remove('cn-menu__painel--aberto');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    this.container.dispatchEvent(new CustomEvent('cn-menu-fechado', { detail: { nome: ativoAnterior } }));
    this.ativo = null;
  }
}

const contarPalavras = (texto) => {
  if (!texto) return 0;
  return (texto.trim().match(/\S+/g) || []).length;
};

// Funções utilitárias mockadas que devem ser implementadas no editor real
const mockFn = (name) => {
  return (...args) => {
    // console.warn(`Função mockada "${name}" chamada. Implementação real necessária.`);
    return false;
  };
};

export class EditorCadernos {
  constructor(container, opcoes = {}) {
    this.container = container;
    this.opcoes = opcoes;
    this.eventos = new Map();
    this.selecaoSalva = null;
    this.status = 'Pronto';
    this.paginaAtiva = null;
    this.margens = {
      esquerda: 72,
      direita: 72,
      superior: 10,
      inferior: 72,
    };
    this._arrasteMargem = null;
    this._reguaSincronizada = false;

    // Monta a UI primeiro
    this._montar();

    // Após montar, faz o bind consistente de todos os métodos implementados; fallback para mock apenas se não existir
    const bindOrMock = (nome) => {
      const fn = EditorCadernos.prototype[nome];
      if (typeof fn === 'function') {
        this[nome] = fn.bind(this);
      } else {
        this[nome] = mockFn(nome);
      }
    };

    [
      'emitir',
      'obterHtml',
      '_definirSelecaoPorCoordenada',
      '_salvarSelecao',
      '_restaurarSelecao',
      '_atualizarSelecao',
      '_executarComando',
      '_executarAcao',
      '_aplicarMenu',
      '_ajustarTamanhoPorEtapa',
      '_normalizarTamanho',
      '_sincronizarRegua',
      '_iniciarArrasteMargem',
    ].forEach(bindOrMock);

    // Marca versão no DOM e console para facilitar suporte
    try {
      if (this.container) {
        this.container.setAttribute('data-editor-build', EDITOR_BUILD);
      }
      console.info('[Cadernos Editor] build', EDITOR_BUILD);
    } catch {}
  }

  // --- Implementações de Cursor/Seleção (Corrigidas) ---

  _obterRangeAtivo() {
    const selecao = window.getSelection();
    if (!selecao.rangeCount) return null;
    const range = selecao.getRangeAt(0);
    // Verifica se a seleção está dentro de alguma página do editor, tratando TextNode
    const node = range.startContainer;
    const el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
    if (!el || !el.closest('[data-editor-pagina]')) {
      return null;
    }
    return range;
  }

  _posicionarCursorNoFim(pagina) {
    if (!pagina) return;

    let ultimoNo = pagina.lastElementChild;
    if (!ultimoNo) {
      // Se a página está realmente vazia, garante o <p><br></p>
      this._garantirPlaceholder(pagina);
      ultimoNo = pagina.lastElementChild;
    }

    if (!ultimoNo) return;

    const selecao = window.getSelection();
    const range = document.createRange();

    // Estratégia: ancorar no elemento de bloco (ex.: <p>) no final
    let bloco = ultimoNo;
    // Se o último filho é <br>, o ponto válido é no próprio bloco após seus filhos
    const lastChild = bloco.lastChild;
    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
      // texto -> coloca no fim do texto
      range.setStart(lastChild, lastChild.length);
    } else {
      // sem texto (pode ter <br>), ancorar no bloco após o último filho
      const off = bloco.childNodes ? bloco.childNodes.length : 0;
      range.setStart(bloco, off);
    }
    range.collapse(true); // Colapsa para um cursor
    selecao.removeAllRanges();
    selecao.addRange(range);
    pagina.focus(); // Garante o foco
  }

  // --- Métodos de Montagem e Eventos ---

  _montar() {
    this.container.innerHTML = this._template();
    this.referencias = {
      raiz: this.container.querySelector('.cn-editor'),
      titulo: this.container.querySelector('[data-editor-titulo]'),
      status: this.container.querySelector('[data-editor-status]'),
      barra: this.container.querySelector('[data-editor-barra]'),
      workspace: this.container.querySelector('[data-editor-workspace]'),
      regua: this.container.querySelector('[data-editor-regua]'),
      area: this.container.querySelector('[data-editor-area]'),
      reguaMarcadores: this.container.querySelectorAll('[data-regua-handle]'),
      contagemPalavras: this.container.querySelector('[data-editor-palavras]'),
      contagemCaracteres: this.container.querySelector('[data-editor-caracteres]'),
      contagemSelecao: this.container.querySelector('[data-editor-selecao]'),
      menuContainer: this.container.querySelector('[data-editor-menus]'),
      controleTamanho: this.container.querySelector('[data-controle-tamanho]'),
      inputTamanho: this.container.querySelector('[data-tamanho-input]'),
    };
    this._garantirPaginaInicial();
    this.menus = new GerenciadorMenus(this.referencias.menuContainer);
    this._popularMenus();
    this._atualizarCampoTamanhoUI(this.opcoes.tamanhoPadrao || TAMANHO_PADRAO_PX, { forcar: true });
    this._registrarEventos();
    this._inicializarRegua();
    this._atualizarContadores();
  }

  _registrarEventos() {
    const { area, barra } = this.referencias;

    // Garante placeholder e página ativa ao focar/clicar
    area.addEventListener('focusin', (evento) => {
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (!pagina) return;
      this.paginaAtiva = pagina;
      this._garantirPlaceholder(pagina);
    });

    area.addEventListener('pointerdown', (evento) => {
      if (evento.button !== 0) return;
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (!pagina) return;
      this.paginaAtiva = pagina;
      if (this._paginaVazia(pagina)) {
        this._garantirPlaceholder(pagina);
        requestAnimationFrame(() => {
          this._posicionarCursorNoFim(pagina);
          this._salvarSelecao();
        });
      }
    });

    // Atualiza contadores e estado da UI ao digitar
    area.addEventListener('input', () => {
      this._atualizarContadores();
      this.emitir('conteudo-alterado', this.obterHtml());
    });

    area.addEventListener('mouseup', () => this._salvarSelecao());
    area.addEventListener('keyup', () => this._salvarSelecao());

    // Salva seleção antes de clicar na barra, evitando perder seleção
    barra.addEventListener('mousedown', (evento) => {
      const botao = evento.target.closest('button');
      if (!botao) return;
      this._salvarSelecao({ manterAnterior: true });
      // evita que o foco saia do editor
      evento.preventDefault();
      evento.stopPropagation();
    }, true);

    // Aplica comandos/ações restaurando seleção
    barra.addEventListener('click', (evento) => {
      // Primeiro verifica se é um botão de ajuste de tamanho
      const botaoAjuste = evento.target.closest('[data-acao="tamanho-ajuste"]');
      if (botaoAjuste) {
        console.log('[DEBUG] Clicou no botão de ajuste:', botaoAjuste);
        evento.preventDefault();
        evento.stopPropagation();
        const delta = parseInt(botaoAjuste.getAttribute('data-ajuste') || '0', 10) || 0;
        console.log('[DEBUG] Delta do botão:', delta);
        if (delta !== 0) {
          this._aplicarMenu('tamanho-ajuste', String(delta), botaoAjuste);
        }
        return;
      }

      // Depois verifica outros comandos/ações
      const botao = evento.target.closest('button[data-comando], button[data-acao]');
      if (!botao) return;
      evento.preventDefault();
      const comando = botao.dataset.comando;
      const acao = botao.dataset.acao;
      if (comando) {
        this._executarComando(comando);
      } else if (acao) {
        this._executarAcao(acao, botao);
      }
    });

    // Input de tamanho direto
    if (this.referencias.inputTamanho) {
      const input = this.referencias.inputTamanho;
      input.addEventListener('focus', () => this._salvarSelecao({ manterAnterior: true }));
      input.addEventListener('change', () => {
        const novo = this._normalizarTamanho(input.value);
        input.value = String(novo);
        this._aplicarMenu('tamanho', String(novo), input);
      });
      input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault();
          input.blur();
          const novo = this._normalizarTamanho(input.value);
          input.value = String(novo);
          this._aplicarMenu('tamanho', String(novo), input);
        }
      });
    }
  }

  // ===== Seleção e comandos =====
  _salvarSelecao() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    // garante que a seleção pertence ao editor
    const node = range.startContainer;
    const el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
    if (!el || !el.closest('[data-editor-area]')) return false;
    this.selecaoSalva = {
      startContainerPath: this._pathDoNode(range.startContainer),
      startOffset: range.startOffset,
      endContainerPath: this._pathDoNode(range.endContainer),
      endOffset: range.endOffset,
    };
    return true;
  }

  _restaurarSelecao() {
    if (!this.selecaoSalva) return false;
    const area = this.referencias.area;
    if (!area) return false;
    const start = this._nodePorPath(this.selecaoSalva.startContainerPath, area);
    const end = this._nodePorPath(this.selecaoSalva.endContainerPath, area);
    if (!start || !end) return false;
    const range = document.createRange();
    try {
      range.setStart(start, Math.min(this.selecaoSalva.startOffset, start.length ?? start.childNodes.length));
      range.setEnd(end, Math.min(this.selecaoSalva.endOffset, end.length ?? end.childNodes.length));
    } catch (e) {
      return false;
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }

  _pathDoNode(node) {
    // constrói um caminho por índices a partir da área do editor
    const path = [];
    let atual = node;
    while (atual && atual !== this.referencias.area) {
      const pai = atual.parentNode;
      if (!pai) break;
      const idx = Array.prototype.indexOf.call(pai.childNodes, atual);
      path.unshift(idx);
      atual = pai;
    }
    return path;
  }

  _nodePorPath(path, root) {
    let atual = root;
    for (const idx of path) {
      if (!atual || !atual.childNodes || !atual.childNodes[idx]) return null;
      atual = atual.childNodes[idx];
    }
    return atual;
  }

  _executarComando(comando, valor = null) {
    // Restaura seleção e aplica comando nativo do browser preservando scroll
    this._restaurarSelecao();
    const scroll = this._capturarScroll();
    try {
      document.execCommand(comando, false, valor);
      this._salvarSelecao();
      this._atualizarContadores();
      this._restaurarScroll(scroll);
      return true;
    } catch (e) {
      this._restaurarScroll(scroll);
      return false;
    }
  }

  _aplicarMenu(acao, valor, origem) {
    switch (acao) {
      case 'tamanho':
        {
          // Garante que estamos aplicando ao range correto mesmo quando o foco veio do input
          this._restaurarSelecao();
          const ok = this._aplicarFontSizePxSemExec(valor);
          const n = this._normalizarTamanho(valor);
          this._atualizarCampoTamanhoUI(n, { forcar: true });
          // Salva a seleção após aplicar o tamanho para manter consistência
          this._salvarSelecao();
          return ok;
        }
      case 'insertUnorderedList':
      case 'insertOrderedList':
        // Ação de lista não deve tentar aplicar estilo de tamanho
        return this._executarComando(acao);
      case 'tamanho-ajuste':
        {
          // Para ajustes, sempre salvar seleção primeiro e aplicar diretamente
          console.log('[DEBUG] tamanho-ajuste chamado, valor:', valor);
          this._salvarSelecao({ manterAnterior: true });
          const delta = parseInt(valor, 10) || 0;
          console.log('[DEBUG] delta calculado:', delta);
          const tamanhoAtual = this._obterTamanhoAtualSelecaoPx();
          console.log('[DEBUG] tamanho atual:', tamanhoAtual);
          const novoTamanho = this._ajustarTamanhoPorEtapa(delta);
          console.log('[DEBUG] novo tamanho calculado:', novoTamanho);
          const ok = this._aplicarFontSizePxSemExec(novoTamanho);
          console.log('[DEBUG] aplicou com sucesso:', ok);
          this._atualizarCampoTamanhoUI(novoTamanho, { forcar: true });
          this._salvarSelecao();
          return ok;
        }
      case 'fonte':
        return this._executarComando('fontName', valor);
      case 'cor':
        return this._executarComando('foreColor', valor);
      case 'fundo':
        return this._executarComando('hiliteColor', valor);
      case 'bloco':
        return this._executarComando('formatBlock', valor);
      case 'cor-reset':
        return this._executarComando('removeFormat');
      default:
        return false;
    }
  }

  _aplicarFontSizePxSemExec(px) {
    // Aplica font-size diretamente via JS, sem execCommand
    console.log('[DEBUG] _aplicarFontSizePxSemExec - px:', px);
    const n = parseInt(px, 10);
    if (!Number.isFinite(n)) {
      console.log('[DEBUG] _aplicarFontSizePxSemExec - px inválido');
      return false;
    }
    const alvoPx = `${Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, n))}px`;
    console.log('[DEBUG] _aplicarFontSizePxSemExec - alvoPx:', alvoPx);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      console.log('[DEBUG] _aplicarFontSizePxSemExec - sem seleção');
      return false;
    }
    const range = sel.getRangeAt(0);
    console.log('[DEBUG] _aplicarFontSizePxSemExec - range collapsed:', range.collapsed);

    // Verifica se está dentro do editor
    const node = range.startContainer;
    const el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
    console.log('[DEBUG] _aplicarFontSizePxSemExec - node:', node);
    console.log('[DEBUG] _aplicarFontSizePxSemExec - el:', el);
    const editorContainer = el ? el.closest('[data-editor-pagina]') : null;
    console.log('[DEBUG] _aplicarFontSizePxSemExec - editorContainer:', editorContainer);
    if (!el || !editorContainer) {
      console.log('[DEBUG] _aplicarFontSizePxSemExec - fora do editor');
      return false;
    }

    const scroll = this._capturarScroll();
    try {
      // Marca para debug/teste
      try { this.container?.setAttribute('data-last-size-applied', alvoPx); } catch {}

      if (range.collapsed) {
        // Inserção com caret: cria um span com ZWSP para "preparar" o estilo do próximo texto
        console.log('[DEBUG] _aplicarFontSizePxSemExec - range collapsed, criando span');
        const wrapper = document.createElement('span');
        wrapper.style.fontSize = alvoPx;
        try { wrapper.setAttribute('data-size-marker', alvoPx); } catch {}
        const zwsp = document.createTextNode('\u200B');
        wrapper.appendChild(zwsp);
        range.insertNode(wrapper);

        // Posiciona o caret após o ZWSP
        const novo = document.createRange();
        novo.setStart(zwsp, 1);
        novo.collapse(true);
        sel.removeAllRanges();
        sel.addRange(novo);
        console.log('[DEBUG] _aplicarFontSizePxSemExec - span criado:', wrapper);
        return true;
      }

      // Seleção não colapsada: aplica nos nós de texto intersectados
      console.log('[DEBUG] _aplicarFontSizePxSemExec - aplicando em seleção');

      // Abordagem mais direta: aplica direto no conteúdo selecionado
      const conteudoSelecionado = range.toString();
      console.log('[DEBUG] _aplicarFontSizePxSemExec - conteúdo selecionado:', conteudoSelecionado.slice(0, 50));

      if (conteudoSelecionado.trim()) {
        // Se há texto selecionado, cria um span para envolver
        const span = document.createElement('span');
        span.style.fontSize = alvoPx;
        span.style.setProperty('font-size', alvoPx, 'important'); // Força !important
        span.setAttribute('data-size-marker', alvoPx);
        span.style.backgroundColor = '#ffff00'; // Marca visual para debug
        span.style.border = '2px solid red'; // Marca visual para debug

        try {
          // Extrai o conteúdo e substitui pela versão com span
          const fragmento = range.extractContents();
          span.appendChild(fragmento);
          range.insertNode(span);

          // Reseleciona o conteúdo
          const novoRange = document.createRange();
          novoRange.selectNodeContents(span);
          sel.removeAllRanges();
          sel.addRange(novoRange);

          console.log('[DEBUG] _aplicarFontSizePxSemExec - span aplicado:', span);
          return true;
        } catch (e) {
          console.log('[DEBUG] _aplicarFontSizePxSemExec - erro ao aplicar span:', e);
        }
      }

      // Fallback para abordagem TreeWalker
      const aplicados = new Set();

      // Estratégia robusta: aplica estilo sem quebrar estrutura de blocos
      this._aplicarEstiloEmRange(range, alvoPx, aplicados);
      console.log('[DEBUG] _aplicarFontSizePxSemExec - aplicados:', aplicados.size);

      // Mantém a seleção original
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } finally {
      this._restaurarScroll(scroll);
    }
  }

  _aplicarEstiloEmRange(range, fontSizePx, aplicados = new Set()) {
    console.log('[DEBUG] _aplicarEstiloEmRange - fontSizePx:', fontSizePx);
    const raiz = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    console.log('[DEBUG] _aplicarEstiloEmRange - raiz:', raiz);
    if (!raiz) {
      console.log('[DEBUG] _aplicarEstiloEmRange - sem raiz');
      return;
    }

    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const texto = node.nodeValue || '';
        console.log('[DEBUG] TreeWalker testando nó:', texto.slice(0, 20));
        if (!texto || !texto.replace(/\u200B/g, '').trim()) {
          console.log('[DEBUG] TreeWalker - texto vazio/inválido');
          return NodeFilter.FILTER_REJECT;
        }
        try {
          const nr = document.createRange();
          nr.selectNodeContents(node);
          const intersecta = !(range.compareBoundaryPoints(Range.END_TO_START, nr) <= 0 ||
                               range.compareBoundaryPoints(Range.START_TO_END, nr) >= 0);
          console.log('[DEBUG] TreeWalker - intersecta:', intersecta);
          return intersecta ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        } catch (e) {
          console.log('[DEBUG] TreeWalker - erro na comparação:', e);
          return NodeFilter.FILTER_REJECT;
        }
      }
    });

    while (walker.nextNode()) {
      const txt = walker.currentNode;
      console.log('[DEBUG] _aplicarEstiloEmRange - processando texto:', txt.nodeValue?.slice(0, 20));
      if (!txt || !txt.parentElement) continue;
      const pai = txt.parentElement;
      console.log('[DEBUG] _aplicarEstiloEmRange - pai:', pai.tagName);

      // Não aplicar direto em containers de página
      if (pai.hasAttribute && pai.hasAttribute('data-editor-pagina')) continue;

      // Se já processamos este elemento, pula
      if (aplicados.has(pai)) continue;

      // Se o pai é um elemento inline compatível, aplica nele
      const tag = (pai.tagName || '').toLowerCase();
      const isInlineEditavel = ['span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'mark', 'code', 'kbd', 'samp', 'var'].includes(tag);

      if (isInlineEditavel) {
        console.log('[DEBUG] _aplicarEstiloEmRange - aplicando em inline:', pai.tagName);
        pai.style.fontSize = fontSizePx;
        try { pai.setAttribute('data-size-marker', fontSizePx); } catch {}
        aplicados.add(pai);
        continue;
      }

      // Se o pai é um elemento de bloco ou lista, cria wrapper inline
      const isBloco = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'li', 'td', 'th'].includes(tag);
      if (isBloco || pai.hasAttribute('data-editor-pagina')) {
        // Cria wrapper ao redor apenas do nó de texto
        console.log('[DEBUG] _aplicarEstiloEmRange - criando wrapper para bloco:', pai.tagName);
        const wrapper = document.createElement('span');
        wrapper.style.fontSize = fontSizePx;
        try { wrapper.setAttribute('data-size-marker', fontSizePx); } catch {}
        pai.insertBefore(wrapper, txt);
        wrapper.appendChild(txt);
        aplicados.add(wrapper);
        console.log('[DEBUG] _aplicarEstiloEmRange - wrapper criado:', wrapper);
        continue;
      }

      // Fallback: aplica no pai se não conseguimos categorizar
      console.log('[DEBUG] _aplicarEstiloEmRange - fallback no pai:', pai.tagName);
      pai.style.fontSize = fontSizePx;
      try { pai.setAttribute('data-size-marker', fontSizePx); } catch {}
      aplicados.add(pai);
    }
  }

  _aplicarFontSizeReal(px) {
    // Converte quaisquer <font size> inseridos pelo execCommand em <span style="font-size:px">
    const area = this.referencias.area;
    if (!area) return false;
    const alvoPx = `${parseInt(px, 10)}px`;
    const fontes = area.querySelectorAll('font[size]');
    fontes.forEach((el) => {
      el.style.fontSize = alvoPx;
      el.removeAttribute('size');
      // Opcional: trocaria a tag por span, mas manter <font> com style já resolve visualmente.
    });

    // Se execCommand já aplicou via <font>, não executar fallback para evitar quebrar estrutura (ex.: listas)
    if (fontes.length > 0) {
      return true;
    }

    // Se não houver <font>, tenta aplicar via span quando seleção contém apenas texto simples
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const scroll = this._capturarScroll();
      if (range.collapsed) {
        // Seleção colapsada: insere um span com ZWSP e posiciona o caret dentro
        try {
          const wrapper = document.createElement('span');
          wrapper.style.fontSize = alvoPx;
          const zwsp = document.createTextNode('\u200B');
          wrapper.appendChild(zwsp);
          range.insertNode(wrapper);
          // Posiciona o caret após o ZWSP dentro do wrapper
          const novo = document.createRange();
          novo.setStart(zwsp, 1);
          novo.collapse(true);
          sel.removeAllRanges();
          sel.addRange(novo);
        } catch { /* noop */ }
        this._restaurarScroll(scroll);
        return true;
      }

      // Seleção não colapsada
      try {
        const frag = range.cloneContents();
        const possuiBlocos = !!frag.querySelector?.('ul,ol,li,p,div,pre,blockquote,h1,h2,h3,h4,h5,h6');
        if (!possuiBlocos) {
          const wrapper = document.createElement('span');
          wrapper.style.fontSize = alvoPx;
          range.surroundContents(wrapper);
          sel.removeAllRanges();
          const novo = document.createRange();
          novo.selectNodeContents(wrapper);
          sel.addRange(novo);
        } else {
          // Aplica diretamente o estilo nos elementos de texto dentro do range, sem envolver blocos
          const raiz = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
          const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => {
              if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
              try {
                const nr = document.createRange();
                nr.selectNodeContents(n);
                const intersecta =
                  !(range.compareBoundaryPoints(Range.END_TO_START, nr) <= 0 ||
                    range.compareBoundaryPoints(Range.START_TO_END, nr) >= 0);
                return intersecta ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
              } catch { return NodeFilter.FILTER_REJECT; }
            }
          });
          const vistos = new Set();
          while (walker.nextNode()) {
            const txt = walker.currentNode;
            const el = txt.parentElement;
            if (!el) continue;
            // Evita aplicar no container de página
            if (el.hasAttribute('data-editor-pagina')) continue;
            // Evita aplicar diretamente em UL/OL; aplica no LI ou no próprio elemento inline
            const alvo = el.closest('li') || el;
            if (!vistos.has(alvo)) {
              alvo.style.fontSize = alvoPx;
              vistos.add(alvo);
            }
          }
        }
      } catch { /* noop */ }
      this._restaurarScroll(scroll);
    }
    return true;
  }

  _capturarScroll() {
    return { x: window.scrollX || window.pageXOffset, y: window.scrollY || window.pageYOffset };
  }

  _restaurarScroll(pos) {
    if (!pos) return;
    window.scrollTo(pos.x || 0, pos.y || 0);
  }

  _obterTamanhoAtualSelecaoPx() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      // Sem seleção: usa valor do input (normalizado) ou padrão
      const base = this.referencias.inputTamanho?.value || TAMANHO_PADRAO_PX;
      return Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, parseInt(base, 10) || TAMANHO_PADRAO_PX));
    }

    const range = sel.getRangeAt(0);

    // Se colapsado, pega o elemento no ponto do cursor
    if (range.collapsed) {
      const node = range.startContainer;
      let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

      // Busca o elemento mais próximo com font-size definido
      while (el && !el.hasAttribute('data-editor-pagina')) {
        const comp = window.getComputedStyle(el);
        const px = parseFloat(comp.fontSize);
        if (Number.isFinite(px) && px > 0) {
          return Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, Math.round(px)));
        }
        el = el.parentElement;
      }

      // Fallback para o padrão
      const base = this.referencias.inputTamanho?.value || TAMANHO_PADRAO_PX;
      return Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, parseInt(base, 10) || TAMANHO_PADRAO_PX));
    }

    // Seleção não colapsada: analisa elementos dentro da seleção
    const tamanhos = new Map();
    const fragmento = range.cloneContents();

    // Coleta todos os elementos com texto na seleção
    const coletarTamanhos = (elemento) => {
      if (elemento.nodeType === Node.TEXT_NODE) {
        if ((elemento.textContent || '').trim()) {
          const pai = elemento.parentElement;
          if (pai) {
            const comp = window.getComputedStyle(pai);
            const px = parseFloat(comp.fontSize);
            if (Number.isFinite(px) && px > 0) {
              const t = Math.round(px);
              tamanhos.set(t, (tamanhos.get(t) || 0) + (elemento.textContent || '').length);
            }
          }
        }
      } else if (elemento.nodeType === Node.ELEMENT_NODE) {
        for (const filho of elemento.childNodes) {
          coletarTamanhos(filho);
        }
      }
    };

    coletarTamanhos(fragmento);

    if (tamanhos.size === 0) {
      const base = this.referencias.inputTamanho?.value || TAMANHO_PADRAO_PX;
      return Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, parseInt(base, 10) || TAMANHO_PADRAO_PX));
    }

    // Pega o tamanho mais comum por quantidade de caracteres
    let melhorTamanho = null;
    let maiorPeso = -1;
    for (const [tamanho, peso] of tamanhos.entries()) {
      if (peso > maiorPeso || (peso === maiorPeso && tamanho > (melhorTamanho ?? 0))) {
        maiorPeso = peso;
        melhorTamanho = tamanho;
      }
    }

    return Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, melhorTamanho || TAMANHO_PADRAO_PX));
  }

  _normalizarTamanho(valor) {
    let n = parseInt(String(valor || '').trim(), 10);
    if (!Number.isFinite(n)) n = TAMANHO_PADRAO_PX;
    n = Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, n));
    this._atualizarCampoTamanhoUI(n, { forcar: true });
    return n;
  }

  _ajustarTamanhoPorEtapa(delta) {
    const passo = parseInt(delta, 10) || 0;
    console.log('[DEBUG] _ajustarTamanhoPorEtapa - passo:', passo);
    if (!passo) return this._obterTamanhoAtualSelecaoPx();
    const base = this._obterTamanhoAtualSelecaoPx();
    console.log('[DEBUG] _ajustarTamanhoPorEtapa - base:', base);

    // Se estiver dentro da escala, sobe/desce para o próximo valor da lista.
    const idxExato = TAMANHOS_PX.indexOf(base);
    console.log('[DEBUG] _ajustarTamanhoPorEtapa - idxExato:', idxExato);
    if (idxExato !== -1) {
      const novoIdx = Math.max(0, Math.min(TAMANHOS_PX.length - 1, idxExato + passo));
      console.log('[DEBUG] _ajustarTamanhoPorEtapa - novoIdx:', novoIdx, 'valor:', TAMANHOS_PX[novoIdx]);
      return TAMANHOS_PX[novoIdx];
    }

    // Não está exatamente na escala: encontra vizinhos e vai para o próximo/previo lógico.
    let menor = TAMANHOS_PX[0];
    let maior = TAMANHOS_PX[TAMANHOS_PX.length - 1];
    for (let i = 0; i < TAMANHOS_PX.length; i++) {
      const t = TAMANHOS_PX[i];
      if (t <= base) menor = t;
      if (t >= base) { maior = t; break; }
    }
    console.log('[DEBUG] _ajustarTamanhoPorEtapa - menor:', menor, 'maior:', maior);

    if (base < TAMANHOS_PX[0]) {
      // Abaixo do mínimo da escala: varia em 1px
      const resultado = Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, base + (passo > 0 ? 1 : -1)));
      console.log('[DEBUG] _ajustarTamanhoPorEtapa - abaixo mínimo, resultado:', resultado);
      return resultado;
    }
    if (base > TAMANHOS_PX[TAMANHOS_PX.length - 1]) {
      // Acima do máximo da escala: varia em 2px para não ficar lento em tamanhos grandes
      const resultado = Math.max(TAMANHO_MIN_PX, Math.min(TAMANHO_MAX_PX, base + (passo > 0 ? 2 : -2)));
      console.log('[DEBUG] _ajustarTamanhoPorEtapa - acima máximo, resultado:', resultado);
      return resultado;
    }

    if (passo > 0) {
      // Vai para o próximo maior da escala
      console.log('[DEBUG] _ajustarTamanhoPorEtapa - passo positivo, retorna maior:', maior);
      return maior;
    }
    // Passo negativo: volta para o menor (anterior)
    console.log('[DEBUG] _ajustarTamanhoPorEtapa - passo negativo, retorna menor:', menor);
    return menor;
  }

  _atualizarSelecao() {
    const input = this.referencias.inputTamanho;
    if (!input) return;
    // Evita sobrescrever enquanto o usuário digita no campo de tamanho
    if (document.activeElement === input) return;
    const tamanho = this._obterTamanhoAtualSelecaoPx();
    this._atualizarCampoTamanhoUI(tamanho, { forcar: false });
  }

  _template() {
    return `
      <section class="cn-editor" aria-label="Editor de texto">
        <header class="cn-editor__cabecalho">
          <input type="text" class="cn-editor__titulo" data-editor-titulo hidden aria-hidden="true" tabindex="-1" />
        </header>
        <div class="cn-editor__barra" data-editor-barra>
          <div class="cn-editor__grupo" data-editor-acoes data-editor-menus>
            <button type="button" class="cn-botao" data-comando="bold" title="Negrito">
              <span class="material-symbols-outlined" aria-hidden="true">format_bold</span>
            </button>
            <button type="button" class="cn-botao" data-comando="italic" title="Itálico">
              <span class="material-symbols-outlined" aria-hidden="true">format_italic</span>
            </button>
            <button type="button" class="cn-botao" data-comando="underline" title="Sublinhado">
              <span class="material-symbols-outlined" aria-hidden="true">format_underlined</span>
            </button>
            <button type="button" class="cn-botao" data-comando="strikeThrough" title="Tachado">
              <span class="material-symbols-outlined" aria-hidden="true">strikethrough_s</span>
            </button>
            <span class="cn-separador" aria-hidden="true"></span>
            <button type="button" class="cn-botao" data-comando="justifyLeft" title="Alinhar à esquerda">
              <span class="material-symbols-outlined" aria-hidden="true">format_align_left</span>
            </button>
            <button type="button" class="cn-botao" data-comando="justifyCenter" title="Centralizar">
              <span class="material-symbols-outlined" aria-hidden="true">format_align_center</span>
            </button>
            <button type="button" class="cn-botao" data-comando="justifyRight" title="Alinhar à direita">
              <span class="material-symbols-outlined" aria-hidden="true">format_align_right</span>
            </button>
            <button type="button" class="cn-botao" data-comando="justifyFull" title="Justificar">
              <span class="material-symbols-outlined" aria-hidden="true">format_align_justify</span>
            </button>
            <span class="cn-separador" aria-hidden="true"></span>
            <button type="button" class="cn-botao" data-comando="insertUnorderedList" title="Lista pontuada">
              <span class="material-symbols-outlined" aria-hidden="true">format_list_bulleted</span>
            </button>
            <button type="button" class="cn-botao" data-comando="insertOrderedList" title="Lista numerada">
              <span class="material-symbols-outlined" aria-hidden="true">format_list_numbered</span>
            </button>
            <button type="button" class="cn-botao" data-comando="outdent" title="Diminuir recuo">
              <span class="material-symbols-outlined" aria-hidden="true">format_indent_decrease</span>
            </button>
            <button type="button" class="cn-botao" data-comando="indent" title="Aumentar recuo">
              <span class="material-symbols-outlined" aria-hidden="true">format_indent_increase</span>
            </button>
            <span class="cn-separador" aria-hidden="true"></span>
            <button type="button" class="cn-botao" data-acao="inserir-link" title="Inserir link">
              <span class="material-symbols-outlined" aria-hidden="true">link</span>
            </button>
            <button type="button" class="cn-botao" data-acao="inserir-imagem" title="Inserir imagem">
              <span class="material-symbols-outlined" aria-hidden="true">image</span>
            </button>
            <button type="button" class="cn-botao" data-acao="inserir-tabela" title="Inserir tabela">
              <span class="material-symbols-outlined" aria-hidden="true">table_chart</span>
            </button>
            <div class="cn-menu">
              <button class="cn-menu__botao" data-menu-toggle="fonte" aria-expanded="false" aria-haspopup="menu" type="button" aria-label="Fonte" title="Fonte">
                <span class="material-symbols-outlined" aria-hidden="true">text_fields</span>
                <span class="material-symbols-outlined cn-menu__caret" aria-hidden="true">arrow_drop_down</span>
              </button>
              <div class="cn-menu__painel" data-menu-painel="fonte"></div>
            </div>
            <div class="cn-tamanho" data-controle-tamanho>
              <button type="button" class="cn-tamanho__ajuste" data-acao="tamanho-ajuste" data-ajuste="-1" aria-label="Diminuir tamanho">−</button>
              <input type="number" class="cn-tamanho__input" value="${TAMANHO_PADRAO_PX}" min="${TAMANHO_MIN_PX}" max="${TAMANHO_MAX_PX}" step="1" data-acao="tamanho" data-tamanho-input aria-label="Tamanho da fonte em pixels" />
              <button type="button" class="cn-tamanho__ajuste" data-acao="tamanho-ajuste" data-ajuste="1" aria-label="Aumentar tamanho">+</button>
            </div>
            <div class="cn-menu">
              <button class="cn-menu__botao" data-menu-toggle="bloco" aria-expanded="false" aria-haspopup="menu" type="button" aria-label="Bloco" title="Bloco">
                <span class="material-symbols-outlined" aria-hidden="true">title</span>
                <span class="material-symbols-outlined cn-menu__caret" aria-hidden="true">arrow_drop_down</span>
              </button>
              <div class="cn-menu__painel" data-menu-painel="bloco"></div>
            </div>
            <div class="cn-menu">
              <button class="cn-menu__botao" data-menu-toggle="cor" aria-expanded="false" aria-haspopup="menu" type="button" aria-label="Cor do texto" title="Cor do texto">
                <span class="material-symbols-outlined" aria-hidden="true">format_color_text</span>
                <span class="material-symbols-outlined cn-menu__caret" aria-hidden="true">arrow_drop_down</span>
              </button>
              <div class="cn-menu__painel" data-menu-painel="cor"></div>
            </div>
            <div class="cn-menu">
              <button class="cn-menu__botao" data-menu-toggle="fundo" aria-expanded="false" aria-haspopup="menu" type="button" aria-label="Cor de fundo" title="Cor de fundo">
                <span class="material-symbols-outlined" aria-hidden="true">format_color_fill</span>
                <span class="material-symbols-outlined cn-menu__caret" aria-hidden="true">arrow_drop_down</span>
              </button>
              <div class="cn-menu__painel" data-menu-painel="fundo"></div>
            </div>
          </div>
        </div>
        <div class="cn-editor__workspace" data-editor-workspace>
          <div class="cn-editor__regua" data-editor-regua aria-label="Régua de margens">
            <div class="cn-regua__escala" data-regua-escala></div>
            <button type="button" class="cn-regua__marcador cn-regua__marcador--inicio" data-regua-handle="inicio" role="slider" aria-label="Margem esquerda" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" title="Margem esquerda"></button>
            <button type="button" class="cn-regua__marcador cn-regua__marcador--fim" data-regua-handle="fim" role="slider" aria-label="Margem direita" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" title="Margem direita"></button>
          </div>
          <div class="cn-editor__area" data-editor-area>
            <div class="cn-editor__pagina" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-editor-pagina></div>
          </div>
        </div>
        <footer class="cn-editor__rodape">
          <span class="cn-editor__status" data-editor-status>${this.status}</span>
          <span><strong data-editor-palavras>0</strong> palavras</span>
          <span><strong data-editor-caracteres>0</strong> caracteres</span>
          <span><strong data-editor-selecao>0</strong> selecionados</span>
        </footer>
      </section>
    `;
  }

  _popularMenus() {
    const painelFontes = this.container.querySelector('[data-menu-painel="fonte"]');
    const painelBlocos = this.container.querySelector('[data-menu-painel="bloco"]');
    const painelCor = this.container.querySelector('[data-menu-painel="cor"]');
    const painelFundo = this.container.querySelector('[data-menu-painel="fundo"]');

    if (painelFontes) {
      painelFontes.innerHTML = `
        <div class="cn-menu__lista cn-menu__lista--fontes">
          ${FONTES_PADRAO.map((fonte) => `
            <button type="button" class="cn-menu__item" data-acao="fonte" data-valor="${fonte}">
              <span style="font-family:${fonte}">${fonte.split(',')[0]}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    if (painelBlocos) {
      painelBlocos.innerHTML = BLOCOS.map((item) => `
        <button type="button" class="cn-menu__item" data-acao="bloco" data-valor="${item.valor}">${item.rotulo}</button>
      `).join('');
    }

    const montarMenuCores = (tipo) => {
      const descricao = tipo === 'cor' ? 'do texto' : 'de fundo';
      const valorPersonalizado = tipo === 'cor' ? COR_TEXTO_PADRAO : '#ffffff';
      return `
        <div class="cn-color-menu" role="menu">
          <div class="cn-color-menu__header">
            <button type="button" class="cn-color-menu__reset" data-acao="${tipo}-reset">Redefinir ${descricao}</button>
          </div>
          <div class="cn-color-menu__palette cn-color-menu__palette--grid">
            ${PALETA_BASE.map((cor) => `
              <button type="button" class="cn-color-menu__swatch" data-acao="${tipo}" data-valor="${cor}" style="--cn-swatch:${cor}" title="${cor}" aria-label="${cor}"></button>
            `).join('')}
          </div>
          <div class="cn-color-menu__subtitle">Padrão</div>
          <div class="cn-color-menu__palette cn-color-menu__palette--row">
            ${PALETA_PADRAO.map((cor) => `
              <button type="button" class="cn-color-menu__swatch" data-acao="${tipo}" data-valor="${cor}" style="--cn-swatch:${cor}" title="${cor}" aria-label="${cor}"></button>
            `).join('')}
          </div>
          <div class="cn-color-menu__subtitle">Cor personalizada</div>
          <div class="cn-color-menu__custom">
            <input type="color" class="cn-color-menu__picker" data-acao="${tipo}-personalizada" value="${valorPersonalizado}" aria-label="Cor personalizada" />
          </div>
        </div>
      `;
    };

    if (painelCor) painelCor.innerHTML = montarMenuCores('cor');
    if (painelFundo) painelFundo.innerHTML = montarMenuCores('fundo');
  }

  _registrarEventos() {
    const { titulo, area, barra, menuContainer } = this.referencias;

    titulo.addEventListener('input', () => {
      this.emitir('titulo-alterado', titulo.value.trim());
    });

    area.addEventListener('pointerdown', (evento) => {
      if (evento.button !== 0) return;
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (!pagina) return;
      this.paginaAtiva = pagina;

      // 1. Garante que o foco seja aplicado imediatamente
      if (!pagina.contains(document.activeElement)) {
        pagina.focus({ preventScroll: false });
      }

      // 2. Posicionamento do cursor em página vazia
      if (this._paginaVazia(pagina)) {
        // Não impedir o default; apenas garanta placeholder e caret após o ciclo do evento
        this._garantirPlaceholder(pagina);
        requestAnimationFrame(() => {
          if (!pagina.isConnected) return;
          pagina.focus({ preventScroll: false });
          this._posicionarCursorNoFim(pagina);
          this._salvarSelecao();
        });
      } else {
        // Lógica original para tentar definir seleção por coordenada ou ir para o fim
        const { clientX, clientY } = evento;
        requestAnimationFrame(() => {
          if (!pagina.isConnected) return;
          const definido = this._definirSelecaoPorCoordenada(clientX, clientY, pagina);
          if (!definido) {
            this._posicionarCursorNoFim(pagina);
          }
          this._salvarSelecao();
        });
      }
    });

    area.addEventListener('click', (evento) => {
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (!pagina) return;
      this.paginaAtiva = pagina;
      if (this._paginaVazia(pagina)) {
        this._garantirPlaceholder(pagina);
        this._posicionarCursorNoFim(pagina);
        this._salvarSelecao();
      }
    });

    area.addEventListener('focusin', (evento) => {
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (pagina) {
        this.paginaAtiva = pagina;
        if (this._paginaVazia(pagina)) {
          this._garantirPlaceholder(pagina);
          this._posicionarCursorNoFim(pagina);
          this._salvarSelecao();
        }
      }
    });

    area.addEventListener('input', (evento) => {
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (!pagina) return;
      this.paginaAtiva = pagina;
      this._normalizarPaginas();
      this._atualizarContadores();
      this.emitir('conteudo-alterado', this.obterHtml());
    });

  area.addEventListener('keyup', () => { this._atualizarContadores(); this._atualizarSelecao(); });
    area.addEventListener('mouseup', (evento) => {
      const pagina = evento.target.closest('[data-editor-pagina]');
      if (pagina) this.paginaAtiva = pagina;
      this._salvarSelecao();
      this._atualizarSelecao();
    });
    area.addEventListener('focusout', () => this._salvarSelecao({ manterAnterior: true }));

    barra.addEventListener('mousedown', (evento) => {
      this._salvarSelecao();
      evento.preventDefault();
    }, true);

    barra.addEventListener('click', (evento) => {
      const botao = evento.target.closest('[data-comando]');
      const acao = evento.target.closest('[data-acao]');
      if (botao) {
        evento.preventDefault();
        this._executarComando(botao.getAttribute('data-comando'));
        return;
      }
      if (acao) {
        evento.preventDefault();
        this._executarAcao(acao.getAttribute('data-acao'));
      }
    });

    menuContainer.addEventListener('click', (evento) => {
      const botaoAjuste = evento.target.closest('[data-acao="tamanho-ajuste"]');
      if (botaoAjuste && this.referencias.controleTamanho?.contains(botaoAjuste)) {
        evento.preventDefault();
        evento.stopPropagation();
        const delta = parseInt(botaoAjuste.getAttribute('data-ajuste') || '0', 10) || 0;
        if (delta !== 0) {
          // Usa _aplicarMenu diretamente que já tem a lógica completa de tamanho-ajuste
          this._aplicarMenu('tamanho-ajuste', String(delta), botaoAjuste);
        }
        return;
      }

      const item = evento.target.closest('[data-acao]');
      if (!item) return;
      if (this.referencias.controleTamanho?.contains(item)) return;
      evento.preventDefault();
      const acao = item.getAttribute('data-acao');
      if (!acao) return;
      const fecharMenu = item.getAttribute('data-fechar-menu') !== 'false';
      const valor = item.getAttribute('data-valor');
      this._aplicarMenu(acao, valor, item);
      if (fecharMenu) {
        this.menus.fechar();
      }
    });

    menuContainer.addEventListener('input', (evento) => {
      const alvo = evento.target;
      if (!(alvo instanceof HTMLInputElement)) return;
      if (this.referencias.controleTamanho?.contains(alvo)) return;
      const acao = alvo.getAttribute('data-acao');
      if (!acao) return;
      this._aplicarMenu(acao, alvo.value, alvo);
      if (alvo.getAttribute('data-fechar-menu') !== 'false') {
        this.menus.fechar();
      }
    });

    const { controleTamanho, inputTamanho } = this.referencias;

    if (inputTamanho) {
      inputTamanho.addEventListener('focus', () => {
        this._salvarSelecao({ manterAnterior: true });
        requestAnimationFrame(() => inputTamanho.select());
      });

      inputTamanho.addEventListener('change', () => {
        const novo = this._normalizarTamanho(inputTamanho.value);
        inputTamanho.value = String(novo);
        this._aplicarMenu('tamanho', String(novo), inputTamanho);
      });

      inputTamanho.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault();
          inputTamanho.blur();
          const novo = this._normalizarTamanho(inputTamanho.value);
          inputTamanho.value = String(novo);
          this._aplicarMenu('tamanho', String(novo), inputTamanho);
        } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
          evento.preventDefault();
          const delta = evento.key === 'ArrowUp' ? 1 : -1;
          this._aplicarMenu('tamanho-ajuste', String(delta), inputTamanho);
        }
      });
    }

    if (controleTamanho) {
      controleTamanho.addEventListener('wheel', (evento) => {
        if (!(evento instanceof WheelEvent)) return;
        if (document.activeElement !== inputTamanho) return;
        evento.preventDefault();
        const delta = evento.deltaY < 0 ? 1 : -1;
        this._aplicarMenu('tamanho-ajuste', String(delta), inputTamanho);
      }, { passive: false });
    }
  }

  _obterPaginas() {
    if (!this.referencias.area) return [];
    return Array.from(this.referencias.area.querySelectorAll('[data-editor-pagina]'));
  }

  _criarPagina() {
    const pagina = document.createElement('div');
    pagina.className = 'cn-editor__pagina';
    pagina.setAttribute('contenteditable', 'true');
    pagina.setAttribute('role', 'textbox');
    pagina.setAttribute('aria-multiline', 'true');
    pagina.setAttribute('spellcheck', 'true');
    pagina.dataset.editorPagina = '';
    pagina.innerHTML = '<p><br></p>';
    return pagina;
  }

  _garantirPaginaInicial() {
    const paginas = this._obterPaginas();
    if (!paginas.length) {
      const pagina = this._criarPagina();
      if (this.referencias.area) {
        this.referencias.area.appendChild(pagina);
      }
      this.paginaAtiva = pagina;
    } else if (!this.paginaAtiva) {
      this.paginaAtiva = paginas[0];
    }
    this._aplicarMargens();
  }

  _garantirPlaceholder(pagina) {
    if (!pagina) return;
    this._limparNodesTriviais(pagina);

    if (!pagina.hasChildNodes() || (pagina.childNodes.length === 1 && pagina.firstChild.nodeName === 'BR')) {
      pagina.innerHTML = '<p><br></p>';
      return;
    }

    if (pagina.children.length === 1 && pagina.firstElementChild.tagName === 'P') {
      const p = pagina.firstElementChild;
      const html = p.innerHTML.replace(/&nbsp;/g, '').trim();
      if (html === '' || html === '<br>' || html === '<br/>') {
        p.innerHTML = '<br>';
      }
    }
  }

  _paginaVazia(pagina) {
    if (!pagina) return true;
    const texto = (pagina.textContent || '').replace(/\u200B/g, '').trim();
    if (texto) return false;
    const { children } = pagina;
    if (children.length === 0) return true;
    if (children.length > 1) return false;
    const unico = children[0];
    if (unico.tagName === 'P') {
      const html = unico.innerHTML.replace(/&nbsp;/g, '').trim();
      return html === '' || html === '<br>' || html === '<br/>';
    }
    return texto.length === 0;
  }

  _nodeEhIgnoravel(node) {
    if (!node) return true;
    if (node.nodeType === Node.TEXT_NODE) {
      return !(node.textContent || '').replace(/\u200B/g, '').trim();
    }
    if (!(node instanceof HTMLElement)) {
      return false;
    }
    if (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, 'placeholder')) {
      return true;
    }
    if (node.tagName === 'BR') {
      return false;
    }
    if (!node.childNodes.length) {
      return !(node.textContent || '').trim();
    }
    return false;
  }

  _limparNodesTriviais(container) {
    if (!container) return;
    Array.from(container.childNodes).forEach((node) => {
      if (this._nodeEhIgnoravel(node)) {
        node.remove();
      }
    });
  }

  _contarFilhosSignificativos(container) {
    if (!container) return 0;
    return Array.from(container.childNodes).filter((node) => !this._nodeEhIgnoravel(node)).length;
  }

  _obterUltimoNodeSignificativo(container) {
    if (!container) return null;
    const filhos = Array.from(container.childNodes);
    for (let i = filhos.length - 1; i >= 0; i -= 1) {
      const atual = filhos[i];
      if (this._nodeEhIgnoravel(atual)) {
        atual.remove();
        continue;
      }
      return atual;
    }
    return null;
  }

  _obterPrimeiroNodeSignificativo(container) {
    if (!container) return null;
    const filhos = Array.from(container.childNodes);
    for (let i = 0; i < filhos.length; i += 1) {
      const atual = filhos[i];
      if (this._nodeEhIgnoravel(atual)) {
        atual.remove();
        continue;
      }
      return atual;
    }
    return null;
  }

  _paginaTransborda(pagina) {
    if (!pagina) return false;
    return pagina.scrollHeight > pagina.clientHeight + TOLERANCIA_ALTURA_PX;
  }

  _dividirTexto(node, destino) {
    const textoCompleto = node.textContent || '';
    const semEspaco = textoCompleto.replace(/\u200B/g, '');
    if (!semEspaco.trim()) {
      node.remove();
      return false;
    }
    const corte = Math.max(1, Math.floor(semEspaco.length / 3));
    const indice = textoCompleto.length - corte;
    if (indice <= 0 || indice >= textoCompleto.length) {
      return false;
    }
    const parte = node.splitText(indice);
    if (!parte.textContent || !parte.textContent.replace(/\u200B/g, '').trim()) {
      parte.remove();
      return false;
    }
    node.textContent = (node.textContent || '').replace(/\s+$/u, '');
    parte.textContent = (parte.textContent || '').replace(/^\s+/u, '');
    destino.insertBefore(parte, destino.firstChild || null);
    return true;
  }

  _dividirElemento(elemento, destino, pagina) {
    const clone = elemento.cloneNode(false);
    destino.insertBefore(clone, destino.firstChild || null);
    let moveu = false;
    let tentativas = 0;
    while (this._paginaTransborda(pagina) && elemento.childNodes.length && tentativas < LIMITE_NORMALIZACAO) {
      tentativas += 1;
      const mover = this._obterUltimoNodeSignificativo(elemento);
      if (!mover) break;
      if (mover.nodeType === Node.TEXT_NODE) {
        if (this._dividirTexto(mover, clone)) {
          moveu = true;
          continue;
        }
      }
      clone.insertBefore(mover, clone.firstChild || null);
      moveu = true;
    }

    if (!moveu) {
      clone.remove();
      return false;
    }

    this._limparNodesTriviais(elemento);
    if (!elemento.childNodes.length) {
      elemento.remove();
    }
    this._limparNodesTriviais(clone);
    return true;
  }

  _transferirExcedente(origem, destino) {
    const alvo = this._obterUltimoNodeSignificativo(origem);
    if (!alvo) return false;
    const significativos = this._contarFilhosSignificativos(origem);
    if (significativos > 1) {
      destino.insertBefore(alvo, destino.firstChild || null);
      return true;
    }

    if (alvo.nodeType === Node.TEXT_NODE) {
      return this._dividirTexto(alvo, destino);
    }

    if (alvo instanceof HTMLElement) {
      return this._dividirElemento(alvo, destino, origem);
    }

    destino.insertBefore(alvo, destino.firstChild || null);
    return true;
  }

  _normalizarPaginas() {
    const paginas = this._obterPaginas();
    if (!paginas.length) {
      this._garantirPaginaInicial();
      return;
    }

    const principal = paginas[0];
    const extras = paginas.slice(1);

    // Se houver páginas extras antigas, consolida no principal
    extras.forEach((paginaExtra) => {
      while (paginaExtra.firstChild) {
        principal.appendChild(paginaExtra.firstChild);
      }
      paginaExtra.remove();
    });

    this._limparNodesTriviais(principal);
    this._garantirPlaceholder(principal);

    // Checar transbordo e dividir conteúdo para nova página quando necessário
    if (this._paginaTransborda(principal)) {
      const nova = this._criarPagina();
      principal.after(nova);
      // Move conteúdo excedente do principal para nova
      let guard = 0;
      while (this._paginaTransborda(principal) && guard < LIMITE_NORMALIZACAO) {
        guard += 1;
        this._transferirExcedente(principal, nova);
      }
    }

    this._aplicarMargens();
    this._sincronizarRegua();
  }

  _removerPaginasExtras() {
    let paginas = this._obterPaginas();
    for (let i = paginas.length - 1; i > 0; i -= 1) {
      const pagina = paginas[i];
      if (this._paginaVazia(pagina)) {
        pagina.remove();
      } else {
        break;
      }
    }
    paginas = this._obterPaginas();
    if (paginas.length === 0) {
      this._garantirPaginaInicial();
      paginas = this._obterPaginas();
    }
    if (this.paginaAtiva && !this.paginaAtiva.isConnected) {
      this.paginaAtiva = paginas[paginas.length - 1] || null;
    }
  }

  _capturarMargensAtuais() {
    const pagina = this._obterPaginas()[0];
    if (!pagina) return;
    const estilos = window.getComputedStyle(pagina);
    const parse = (valor, fallback) => {
      const numero = parseFloat(valor);
      if (Number.isFinite(numero)) return numero;
      return fallback;
    };
    this.margens = {
      esquerda: parse(estilos.paddingLeft, this.margens.esquerda),
      direita: parse(estilos.paddingRight, this.margens.direita),
      superior: parse(estilos.paddingTop, this.margens.superior),
      inferior: parse(estilos.paddingBottom, this.margens.inferior),
    };
  }

  _aplicarMargens() {
    const paginas = this._obterPaginas();
    if (!paginas.length) return;
    paginas.forEach((pagina) => {
      pagina.style.setProperty('--cn-pagina-margin-left', `${this.margens.esquerda}px`);
      pagina.style.setProperty('--cn-pagina-margin-right', `${this.margens.direita}px`);
      pagina.style.setProperty('--cn-pagina-margin-top', `${this.margens.superior}px`);
      pagina.style.setProperty('--cn-pagina-margin-bottom', `${this.margens.inferior}px`);
    });
  }

  _inicializarRegua() {
    const { regua, reguaMarcadores } = this.referencias;
    if (!regua) return;
    this._capturarMargensAtuais();
    this._sincronizarRegua({ recapturar: true });
    requestAnimationFrame(() => this._sincronizarRegua());
    const marcadores = Array.from(reguaMarcadores || []);
    marcadores.forEach((handle) => {
      handle.addEventListener('pointerdown', (evento) => this._iniciarArrasteMargem(evento, handle.dataset.reguaHandle));
    });
  }

  _atualizarContadores() {
    if (!this.paginaAtiva) {
        this.referencias.contagemPalavras.textContent = '0';
        this.referencias.contagemCaracteres.textContent = '0';
        this.referencias.contagemSelecao.textContent = '0';
        return;
    }

    const textoTotal = this.paginaAtiva.textContent || '';
    this.referencias.contagemPalavras.textContent = contarPalavras(textoTotal);
    this.referencias.contagemCaracteres.textContent = textoTotal.length;

    const selecao = window.getSelection();
    let textoSelecionado = '';
    if (selecao.rangeCount > 0) {
        textoSelecionado = selecao.toString();
    }
    this.referencias.contagemSelecao.textContent = contarPalavras(textoSelecionado);
  }

  _atualizarCampoTamanhoUI(tamanho, { forcar = false } = {}) {
      if (this.referencias.inputTamanho && (forcar || this.referencias.inputTamanho.value != tamanho)) {
          this.referencias.inputTamanho.value = tamanho;
      }
  }

  // ===== API Pública mínima (necessária para integração com app.js) =====

  ao(nome, handler) {
    if (!nome || typeof handler !== 'function') return;
    if (!this.eventos.has(nome)) this.eventos.set(nome, new Set());
    this.eventos.get(nome).add(handler);
  }

  emitir(nome, dado) {
    const lista = this.eventos.get(nome);
    if (!lista) return false;
    for (const fn of lista) {
      try { fn(dado); } catch (e) { console.error(e); }
    }
    return true;
  }

  definirTitulo(texto) {
    if (this.referencias.titulo) {
      this.referencias.titulo.value = String(texto || '');
    }
  }

  obterTitulo() {
    return this.referencias.titulo ? (this.referencias.titulo.value || '') : '';
  }

  definirHtml(html) {
    const paginas = this._obterPaginas();
    const pagina = paginas[0] || this._criarPagina();
    if (!paginas.length && this.referencias.area) {
      this.referencias.area.appendChild(pagina);
    }
    const conteudo = this._sanitizarConteudoEntrada(html);
    pagina.innerHTML = conteudo;
    this._garantirPlaceholder(pagina);
    this.paginaAtiva = pagina;
    this._atualizarContadores();
  }

  obterHtml() {
    const paginas = this._obterPaginas();
    const pagina = paginas[0];
    return pagina ? pagina.innerHTML : '';
  }

  definirStatus(texto, tipo) {
    if (this.referencias.status) {
      this.referencias.status.textContent = String(texto || '');
      if (tipo != null) this.referencias.status.setAttribute('data-status', String(tipo));
    }
  }

  focarArea() {
    const paginas = this._obterPaginas();
    const pagina = paginas[0] || this._criarPagina();
    if (!paginas.length && this.referencias.area) {
      this.referencias.area.appendChild(pagina);
    }
    this._garantirPlaceholder(pagina);
    this.paginaAtiva = pagina;
    try {
      pagina.focus();
      this._posicionarCursorNoFim(pagina);
    } catch {}
  }

  // Remove wrappers duplicados do conteúdo salvo (compatibilidade com versões antigas)
  _sanitizarConteudoEntrada(html) {
    if (html == null) return '';
    const tmp = document.createElement('div');
    try { tmp.innerHTML = String(html); } catch { return String(html); }

    // Caso traga toda a estrutura do editor, tenta encontrar a página interna
    let pagina = tmp.querySelector('[data-editor-pagina]');
    if (!pagina) pagina = tmp.querySelector('.cn-editor__pagina');
    if (pagina) return pagina.innerHTML;

    // Caso traga a área do editor inteira
    const area = tmp.querySelector('.cn-editor__area');
    if (area) {
      const pg = area.querySelector('[data-editor-pagina], .cn-editor__pagina');
      return pg ? pg.innerHTML : area.innerHTML;
    }

    // Caso traga um documento completo
    const body = tmp.querySelector('body');
    if (body) return body.innerHTML;

    // Fallback: conteúdo como foi recebido
    return tmp.innerHTML;
  }

  // ===== Régua de margens (implementação simples) =====
  _sincronizarRegua() {
    const { regua } = this.referencias;
    if (!regua) return;
    const pagina = this._obterPaginas()[0];
    if (!pagina) return;
    const rect = regua.getBoundingClientRect();
    const larguraRegua = rect.width;
    const esquerda = Math.max(MARGEM_MINIMA_PX, this.margens.esquerda);
    const direita = Math.max(MARGEM_MINIMA_PX, this.margens.direita);
    const totalMin = esquerda + direita + LARGURA_MINIMA_CONTEUDO;
    const larguraMax = Math.max(totalMin, larguraRegua);

    const hInicio = regua.querySelector('[data-regua-handle="inicio"]');
    const hFim = regua.querySelector('[data-regua-handle="fim"]');
    if (hInicio) {
      hInicio.style.left = `${(esquerda / larguraMax) * larguraRegua}px`;
      hInicio.setAttribute('aria-valuenow', String(Math.round(esquerda)));
      hInicio.setAttribute('aria-valuetext', `${Math.round(esquerda)} px`);
    }
    if (hFim) {
      const pos = larguraRegua - (direita / larguraMax) * larguraRegua;
      hFim.style.left = `${pos}px`;
      hFim.setAttribute('aria-valuenow', String(Math.round(direita)));
      hFim.setAttribute('aria-valuetext', `${Math.round(direita)} px`);
    }

    // Renderiza labels em pixels com espaçamento adaptativo para evitar aglomeração
    const escala = regua.querySelector('[data-regua-escala]');
    if (escala) {
      const minLabelSpacing = 80; // px mínimos entre labels
      const maxLabels = Math.max(1, Math.floor(larguraRegua / minLabelSpacing));
      // candidatos de passo em px (50 em 50 por padrão)
      const candidatos = [25, 50, 100, 150, 200];
      let passo = 50;
      for (const cand of candidatos) {
        if ((larguraRegua / cand) <= maxLabels) { passo = cand; break; }
      }
      const totalPx = Math.floor(larguraRegua);
      const parts = [];
      for (let x = 0; x <= totalPx; x += passo) {
        parts.push(`<span class=\"cn-regua__label\" style=\"left:${x}px\">${x}</span>`);
      }
      escala.innerHTML = parts.join('');
    }
  }

  _iniciarArrasteMargem(evento, tipo) {
    const { regua } = this.referencias;
    if (!regua || !tipo) return;
    evento.preventDefault();
    const rect = regua.getBoundingClientRect();
    const largura = rect.width;
    const pointerId = evento.pointerId;
    regua.setPointerCapture && regua.setPointerCapture(pointerId);
    const aoMover = (ev) => {
      const x = Math.min(Math.max(ev.clientX - rect.left, 0), largura);
      const minConteudo = LARGURA_MINIMA_CONTEUDO;
      if (tipo === 'inicio') {
        const outra = this.margens.direita;
        const maxEsquerda = Math.max(MARGEM_MINIMA_PX, largura - outra - minConteudo);
        const novaEsq = Math.min(Math.max(MARGEM_MINIMA_PX, x), maxEsquerda);
        this.margens.esquerda = novaEsq;
      } else {
        // Calcula a margem direita como distância até a borda direita
        const outra = this.margens.esquerda;
        const posDireita = largura - x; // distância da direita
        const maxDireita = Math.max(MARGEM_MINIMA_PX, largura - outra - minConteudo);
        const novaDir = Math.min(Math.max(MARGEM_MINIMA_PX, posDireita), maxDireita);
        this.margens.direita = novaDir;
      }
      this._aplicarMargens();
      this._sincronizarRegua();
    };
    const aoSoltar = () => {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', aoSoltar);
      try { regua.releasePointerCapture && regua.releasePointerCapture(pointerId); } catch {}
    };
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoSoltar);
    window.addEventListener('pointercancel', aoSoltar);
  }

} // FIM DA CLASSE
