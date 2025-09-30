import { ApiCadernos } from './api.js';
import { EditorCadernos } from './editor.js?v=20250929-5';

const textoSeguro = (valor) => (valor == null ? '' : String(valor));
const normalizarTexto = (valor) => textoSeguro(valor)
  .normalize('NFD')
  .replace(/\p{Diacritic}+/gu, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const inferirCursoDoCaderno = (caderno, materias) => {
  // Tenta usar course_id direto; se ausente, mapeia via subject_id
  if (caderno && caderno.course_id != null) return String(caderno.course_id);
  const sid = caderno ? caderno.subject_id : null;
  if (!sid) return '';
  const m = Array.isArray(materias) ? materias.find((x) => String(x.id) === String(sid)) : null;
  return m && m.course_id != null ? String(m.course_id) : '';
};
const paraNumero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

const criarElemento = (tag, classes = '', atributos = {}) => {
  const el = document.createElement(tag);
  if (classes) el.className = classes;
  Object.entries(atributos).forEach(([nome, valor]) => {
    if (valor == null) return;
    el.setAttribute(nome, valor);
  });
  return el;
};

const montarOverlay = (conteudo) => {
  const fundo = criarElemento('div', 'cn-overlay');
  fundo.innerHTML = '';
  fundo.appendChild(conteudo);
  document.body.appendChild(fundo);
  return fundo;
};

const fecharOverlay = (overlay) => {
  if (!overlay) return;
  overlay.classList.add('cn-overlay--fechando');
  setTimeout(() => {
    try { overlay.remove(); } catch (erro) { console.error(erro); }
  }, 180);
};

const criarDialogo = ({ titulo, corpo, botoes }) => {
  const caixa = criarElemento('section', 'cn-dialogo', { role: 'dialog', 'aria-modal': 'true' });
  caixa.innerHTML = `
    <header class="cn-dialogo__topo">
      <h2>${titulo || ''}</h2>
      <button type="button" class="cn-dialogo__fechar" data-ref="fechar">&times;</button>
    </header>
    <div class="cn-dialogo__corpo"></div>
    <footer class="cn-dialogo__rodape"></footer>
  `;
  const corpoEl = caixa.querySelector('.cn-dialogo__corpo');
  const rodapeEl = caixa.querySelector('.cn-dialogo__rodape');
  if (typeof corpo === 'string') {
    corpoEl.innerHTML = corpo;
  } else if (corpo instanceof Node) {
    corpoEl.appendChild(corpo);
  }
  (botoes || []).forEach((btn) => {
    const botao = criarElemento('button', `cn-botao cn-botao--${btn.variant || 'primario'}`);
    botao.type = 'button';
    botao.textContent = btn.rotulo;
    botao.addEventListener('click', () => btn.onClick && btn.onClick());
    rodapeEl.appendChild(botao);
  });
  return caixa;
};

const chaveRascunho = (id) => `cadernos-novo:${id}`;

const guardarRascunho = (id, dados) => {
  try {
    localStorage.setItem(chaveRascunho(id), JSON.stringify({ ...dados, salvoEm: Date.now() }));
  } catch (erro) {
    console.warn('Não foi possível guardar o rascunho', erro);
  }
};

const recuperarRascunho = (id) => {
  try {
    const bruto = localStorage.getItem(chaveRascunho(id));
    if (!bruto) return null;
    return JSON.parse(bruto);
  } catch (erro) {
    return null;
  }
};

const removerRascunho = (id) => {
  try { localStorage.removeItem(chaveRascunho(id)); } catch (erro) { /* noop */ }
};

class AplicativoCadernos {
  constructor(host) {
    this.host = host;
    this.api = new ApiCadernos();
    const painelPref = this.capturarPreferencia ? this.capturarPreferencia('painelColapsado') : null;
    this.estado = {
      cursos: [],
      materias: [],
      cadernos: [],
      paginas: [],
      abasAbertas: [],
      cadernoAtivoId: null,
      paginaAtivaId: null,
      filtros: { curso: '', materia: '', busca: '' },
      painelColapsado: painelPref === '1',
    };
    this.refs = {};
    this.timerSalvar = null;
    this.salvando = false;
  this._bloquearRenderLista = false;
  this._criandoPaginaInicial = false;
  this._materiasFiltradas = null; // lista para o select, mantemos estado.materias completo
  }

  async iniciar() {
    this._montarEstrutura();
    this._configurarPainelLateral();
    await this._carregarListasIniciais();
    this._instalarEditor();
    this._renderizarCursos();
    this._renderizarMaterias();
    this._renderizarListaCadernos();
    const ultimo = this.capturarPreferencia('ultimoCaderno');
    let alvoInicial = null;
    if (ultimo) {
      const existe = this.estado.cadernos.find((c) => String(c.id) === String(ultimo));
      if (existe) alvoInicial = existe.id;
    }
    if (!alvoInicial && this.estado.cadernos.length) {
      alvoInicial = this.estado.cadernos[0].id;
    }
    if (alvoInicial) {
      await this._selecionarCaderno(alvoInicial);
    }
  }

  _montarEstrutura() {
    this.host.innerHTML = `
      <div class="cn-app" data-app="cadernos">
        <aside class="cn-app__lateral" data-ref="painel-lateral">
          <header class="cn-lateral__topo">
            <div class="cn-lateral__titulo">
              <h1>Meus cadernos</h1>
              <div class="cn-lateral__acoes-inline">
                <button type="button" class="cn-botao cn-botao--fantasma" data-acao="atualizar" title="Atualizar lista">↻</button>
              </div>
            </div>
            <button type="button" class="cn-lateral__toggle" data-ref="alternar-painel" title="Recolher painel" aria-label="Recolher painel">⮜</button>
          </header>
          <div class="cn-lateral__conteudo" data-ref="lateral-conteudo">
            <section class="cn-lateral__filtros">
              <label class="cn-campo">
                <span>Curso</span>
                <select data-ref="filtro-curso"></select>
              </label>
              <label class="cn-campo">
                <span>Matéria</span>
                <select data-ref="filtro-materia"></select>
              </label>
              <label class="cn-campo">
                <span>Buscar</span>
                <input type="search" placeholder="Título ou palavra-chave" data-ref="filtro-busca" />
              </label>
            </section>
            <div class="cn-lateral__acoes">
              <button type="button" class="cn-botao cn-botao--primario" data-acao="novo">Novo caderno</button>
              <button type="button" class="cn-botao cn-botao--secundario" data-acao="avulso">Criar avulso</button>
              <button type="button" class="cn-botao cn-botao--secundario" data-acao="lote">Criar por matérias</button>
            </div>
            <div class="cn-lateral__lista" data-ref="lista-cadernos"></div>
          </div>
        </aside>
        <main class="cn-app__principal">
          <header class="cn-principal__topo">
            <div>
              <h2 data-ref="titulo-caderno">Selecione um caderno</h2>
              <p data-ref="subtitulo-caderno" class="cn-principal__subtitulo"></p>
            </div>
            <div class="cn-principal__acoes">
              <button type="button" class="cn-botao cn-botao--secundario" data-acao="renomear-caderno">Renomear</button>
              <button type="button" class="cn-botao cn-botao--secundario" data-acao="alterar-materia">Alterar matéria</button>
              <button type="button" class="cn-botao cn-botao--perigo" data-acao="apagar-caderno">Excluir</button>
              <button type="button" class="cn-botao cn-botao--primario" data-acao="nova-pagina">Nova página</button>
            </div>
          </header>
          <nav class="cn-abas" data-ref="abas"></nav>
          <section class="cn-editor-host" data-ref="editor-host"></section>
        </main>
      </div>
    `;
    this.refs = {
      filtroCurso: this.host.querySelector('[data-ref="filtro-curso"]'),
      filtroMateria: this.host.querySelector('[data-ref="filtro-materia"]'),
      filtroBusca: this.host.querySelector('[data-ref="filtro-busca"]'),
      listaCadernos: this.host.querySelector('[data-ref="lista-cadernos"]'),
      tituloCaderno: this.host.querySelector('[data-ref="titulo-caderno"]'),
      subtituloCaderno: this.host.querySelector('[data-ref="subtitulo-caderno"]'),
      abas: this.host.querySelector('[data-ref="abas"]'),
      editorHost: this.host.querySelector('[data-ref="editor-host"]'),
      principal: this.host.querySelector('.cn-app__principal'),
      painelLateral: this.host.querySelector('[data-ref="painel-lateral"]'),
      lateralConteudo: this.host.querySelector('[data-ref="lateral-conteudo"]'),
      togglePainel: this.host.querySelector('[data-ref="alternar-painel"]'),
      appRoot: this.host.querySelector('.cn-app'),
    };
    this._registrarEventosGlobais();
  }

  _configurarPainelLateral() {
    this._aplicarEstadoPainel();
    if (this.refs.togglePainel) {
      this.refs.togglePainel.addEventListener('click', () => this._alternarPainelLateral());
    }
  }

  _alternarPainelLateral() {
    this.estado.painelColapsado = !this.estado.painelColapsado;
    this.guardarPreferencia('painelColapsado', this.estado.painelColapsado ? '1' : '0');
    this._aplicarEstadoPainel();
  }

  _aplicarEstadoPainel() {
    if (this.refs.appRoot) {
      this.refs.appRoot.classList.toggle('cn-app--colapsada', !!this.estado.painelColapsado);
    }
    if (this.refs.togglePainel) {
      const titulo = this.estado.painelColapsado ? 'Expandir painel' : 'Recolher painel';
      this.refs.togglePainel.setAttribute('title', titulo);
      this.refs.togglePainel.setAttribute('aria-label', titulo);
      this.refs.togglePainel.textContent = this.estado.painelColapsado ? '⮞' : '⮜';
    }
    if (this.refs.painelLateral) {
      this.refs.painelLateral.setAttribute('data-colapsado', this.estado.painelColapsado ? 'true' : 'false');
    }
  }

  _registrarEventosGlobais() {
    this.host.addEventListener('change', async (evento) => {
      if (evento.target === this.refs.filtroCurso) {
        this.estado.filtros.curso = evento.target.value;
        // Ao trocar o curso, resetar matéria e recarregar matérias filtradas
        this.estado.filtros.materia = '';
        // busca matérias do curso selecionado sem perder a lista completa
        if (this.estado.filtros.curso) {
          const resp = await this.api.listarMaterias(this.estado.filtros.curso).catch(() => ({ items: [] }));
          this._materiasFiltradas = Array.isArray(resp.items) ? resp.items : resp;
        } else {
          this._materiasFiltradas = null;
        }
        this._renderizarMaterias();
        if (this.refs.filtroMateria) this.refs.filtroMateria.value = '';
        this._renderizarListaCadernos();
        // Busca também no servidor para refletir recorte por curso
        this._carregarCadernos();
        this.guardarPreferencia('cursoSelecionado', this.estado.filtros.curso);
      }
      if (evento.target === this.refs.filtroMateria) {
        this.estado.filtros.materia = evento.target.value;
        this._renderizarListaCadernos();
        // Recarrega do servidor restringindo por matéria (e curso se houver)
        this._carregarCadernos();
        this.guardarPreferencia('materiaSelecionada', this.estado.filtros.materia);
      }
    });

    this.host.addEventListener('input', (evento) => {
      if (evento.target === this.refs.filtroBusca) {
        this.estado.filtros.busca = evento.target.value;
        this._renderizarListaCadernos();
      }
    });

    this.host.addEventListener('click', async (evento) => {
      const botao = evento.target.closest('[data-acao]');
      if (!botao) return;
      evento.preventDefault();
      const acao = botao.getAttribute('data-acao');
      if (acao === 'atualizar') await this._carregarCadernos();
      if (acao === 'novo') this._abrirDialogoNovoCaderno();
      if (acao === 'avulso') await this._criarCadernoAvulso();
      if (acao === 'lote') this._abrirDialogoLote();
      if (acao === 'renomear-caderno') this._abrirDialogoRenomearCaderno();
      if (acao === 'alterar-materia') this._abrirDialogoAlterarMateria();
      if (acao === 'apagar-caderno') this._confirmarExcluirCaderno();
      if (acao === 'nova-pagina') this._criarPagina();
    });

    this.refs.listaCadernos.addEventListener('click', async (evento) => {
      const excluir = evento.target.closest('[data-card-acao="excluir"]');
      if (excluir) {
        evento.preventDefault();
        evento.stopPropagation();
        const card = excluir.closest('[data-caderno-id]');
        if (!card) return;
        const id = card.getAttribute('data-caderno-id');
        await this._confirmarExcluirCaderno(id);
        return;
      }
      const item = evento.target.closest('[data-caderno-id]');
      if (!item) return;
      const id = item.getAttribute('data-caderno-id');
      await this._selecionarCaderno(id);
    });

    this.refs.listaCadernos.addEventListener('dblclick', (evento) => {
      const titulo = evento.target.closest('[data-card-titulo]');
      if (!titulo) return;
      const card = titulo.closest('[data-caderno-id]');
      if (!card) return;
      evento.preventDefault();
      evento.stopPropagation();
      const id = card.getAttribute('data-caderno-id');
      this._iniciarEdicaoRapidaTitulo(id, card);
    });

    if (this.refs.tituloCaderno) {
      this.refs.tituloCaderno.addEventListener('dblclick', (evento) => {
        evento.preventDefault();
        this._iniciarRenomearCaderno();
      });
    }

  }

  async _carregarListasIniciais() {
    const [cursos, materias, cadernos] = await Promise.all([
      this.api.listarCursos().catch(() => []),
      this.api.listarMaterias('').catch(() => []),
      this.api.listarCadernos().catch(() => []),
    ]);
    this.estado.cursos = Array.isArray(cursos.items) ? cursos.items : cursos;
    this.estado.materias = Array.isArray(materias.items) ? materias.items : materias;
    this.estado.cadernos = Array.isArray(cadernos.items) ? cadernos.items : cadernos;

    const cursoPref = this.capturarPreferencia('cursoSelecionado');
    const materiaPref = this.capturarPreferencia('materiaSelecionada');
    if (cursoPref) this.estado.filtros.curso = cursoPref;
    if (materiaPref) this.estado.filtros.materia = materiaPref;
    // Se houver curso pré-selecionado, traga matérias desse curso para o select
    if (this.estado.filtros.curso) {
      const resp = await this.api.listarMaterias(this.estado.filtros.curso).catch(() => ({ items: [] }));
      this._materiasFiltradas = Array.isArray(resp.items) ? resp.items : resp;
    }
    if (this.refs.filtroCurso) this.refs.filtroCurso.value = this.estado.filtros.curso;
    if (this.refs.filtroMateria) this.refs.filtroMateria.value = this.estado.filtros.materia;
  }

  async _carregarCadernos() {
    const ativoAnterior = this.estado.cadernoAtivoId;
    this.estado.cadernos = [];
    this._renderizarListaCadernos();
    const filtro = {};
    if (this.estado.filtros.curso) filtro.cursoId = this.estado.filtros.curso;
    if (this.estado.filtros.materia) filtro.materiaId = this.estado.filtros.materia;
    const dados = await this.api.listarCadernos(filtro).catch(() => ({ items: [] }));
    this.estado.cadernos = Array.isArray(dados.items) ? dados.items : dados;
    const aindaExiste = ativoAnterior
      ? this.estado.cadernos.find((c) => String(c.id) === String(ativoAnterior))
      : null;
    if (aindaExiste) {
      this.estado.cadernoAtivoId = aindaExiste.id;
      if (this.refs.tituloCaderno) {
        this.refs.tituloCaderno.textContent = aindaExiste.title || 'Caderno';
      }
      if (this.refs.subtituloCaderno) {
        this.refs.subtituloCaderno.textContent = this._descricaoCaderno(aindaExiste) || '';
      }
      this._renderizarListaCadernos();
      return;
    }
    this._renderizarListaCadernos();
    if (!this.estado.cadernoAtivoId && this.estado.cadernos.length) {
      await this._selecionarCaderno(this.estado.cadernos[0].id);
    }
  }

  _renderizarCursos() {
    const select = this.refs.filtroCurso;
    if (!select) return;
    const opcoes = ['<option value="">Todos os cursos</option>'];
    const valorAtual = textoSeguro(this.estado.filtros.curso);
    this.estado.cursos.forEach((curso) => {
      opcoes.push(`<option value="${curso.id}" ${valorAtual === String(curso.id) ? 'selected' : ''}>${curso.name || curso.title || curso.nome}</option>`);
    });
    select.innerHTML = opcoes.join('');
  }

  _renderizarMaterias() {
    const select = this.refs.filtroMateria;
    if (!select) return;
    const cursoSelecionado = this.estado.filtros.curso;
    // Use a lista filtrada vinda do servidor para consistência; fallback para filtro local
    const baseLista = Array.isArray(this._materiasFiltradas) ? this._materiasFiltradas : this.estado.materias;
    const lista = baseLista.filter((materia) => {
      if (!cursoSelecionado) return true;
      return String(materia.course_id) === String(cursoSelecionado);
    });
    const valorAtual = lista.some((m) => String(m.id) === String(this.estado.filtros.materia))
      ? textoSeguro(this.estado.filtros.materia)
      : '';
    const opcoes = ['<option value="">Todas as matérias</option>'];
    lista.forEach((materia) => {
      opcoes.push(`<option value="${materia.id}" ${valorAtual === String(materia.id) ? 'selected' : ''}>${materia.name || materia.title || materia.nome}</option>`);
    });
    select.innerHTML = opcoes.join('');
  }

  _descricaoCaderno(caderno) {
    if (!caderno) return '';
    const materia = this.estado.materias.find((m) => String(m.id) === String(caderno.subject_id));
    const curso = this.estado.cursos.find((c) => String(c.id) === String(caderno.course_id));
    const partes = [];
    if (materia) partes.push(materia.name || materia.title || materia.nome);
    if (curso) partes.push(curso.name || curso.title || curso.nome);
    if (caderno.updated_at) partes.push(`Atualizado em ${new Date(caderno.updated_at).toLocaleString()}`);
    return partes.join(' • ');
  }

  _renderizarListaCadernos() {
    const container = this.refs.listaCadernos;
    if (!container) return;
    if (this._bloquearRenderLista) return;
    const busca = normalizarTexto(this.estado.filtros.busca);
    const materiaSel = textoSeguro(this.estado.filtros.materia);
    const cursoSel = textoSeguro(this.estado.filtros.curso);
    const itens = this.estado.cadernos.filter((caderno) => {
      const cursoDoCard = inferirCursoDoCaderno(caderno, this.estado.materias);
      if (cursoSel && cursoDoCard !== cursoSel) return false;
      if (materiaSel && String(caderno.subject_id) !== materiaSel) return false;
      if (busca) {
        const titulo = normalizarTexto(caderno.title || '');
        const conteudo = normalizarTexto(caderno.content_excerpt || caderno.content || '');
        const materia = this.estado.materias.find(m => String(m.id) === String(caderno.subject_id));
        const curso = this.estado.cursos.find(c => String(c.id) === String(caderno.course_id));
        const nomeMateria = normalizarTexto(materia?.name || materia?.title || materia?.nome || '');
        const nomeCurso = normalizarTexto(curso?.name || curso?.title || curso?.nome || '');
        const combinado = `${titulo} ${conteudo} ${nomeMateria} ${nomeCurso}`.trim();
        if (!combinado.includes(busca)) return false;
      }
      return true;
    });
    if (!itens.length) {
      container.innerHTML = '<p class="cn-vazio">Nenhum caderno encontrado.</p>';
      return;
    }
    container.innerHTML = itens.map((caderno) => {
      const ativo = String(caderno.id) === String(this.estado.cadernoAtivoId);
      return `
        <article class="cn-card ${ativo ? 'cn-card--ativo' : ''}" data-caderno-id="${caderno.id}" role="button" tabindex="0">
          <div class="cn-card__header" data-card-header>
            <strong class="cn-card__title" data-card-titulo>${textoSeguro(caderno.title || 'Caderno')}</strong>
            <button type="button" class="cn-card__delete" data-card-acao="excluir" aria-label="Excluir caderno ${textoSeguro(caderno.title || 'Caderno')}">
              <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
          </div>
          <small>${this._descricaoCaderno(caderno) || 'Sem vínculo'}</small>
        </article>
      `;
    }).join('');
  }

  async _selecionarCaderno(id) {
    const alvo = this.estado.cadernos.find((c) => String(c.id) === String(id));
    if (!alvo) return;
    this.estado.cadernoAtivoId = alvo.id;
    this.guardarPreferencia('ultimoCaderno', alvo.id);
    this.refs.tituloCaderno.textContent = alvo.title || 'Caderno';
    this.refs.subtituloCaderno.textContent = this._descricaoCaderno(alvo) || '';
    this._renderizarListaCadernos();
    await this._carregarPaginas(alvo.id);
  }

  async _carregarPaginas(cadernoId, opcoes = {}) {
    const { permitirCriar = true } = opcoes;
    const resposta = await this.api.listarPaginas(cadernoId).catch(() => ({ items: [] }));
    const bruto = Array.isArray(resposta.items) ? resposta.items : resposta;
    this.estado.paginas = bruto.filter((pagina) => {
      if (!pagina) return false;
      if (pagina.notebook_id == null) return true;
      return String(pagina.notebook_id) === String(cadernoId);
    });
    this.estado.abasAbertas = [...this.estado.paginas];

    if (!this.estado.paginas.length) {
      if (permitirCriar) {
        const criada = await this._criarPaginaInicial(cadernoId);
        if (criada) {
          return;
        }
      }
      this.estado.paginaAtivaId = null;
      this.editor.definirTitulo('');
      this.editor.definirHtml('');
      this.editor.definirStatus('Clique em "Nova página" para começar', 'inativo');
      this._renderizarAbas();
      return;
    }

    const chavePreferencia = this._chaveUltimaPagina(cadernoId);
    const permanencia = chavePreferencia ? this.capturarPreferencia(chavePreferencia) : null;
    if (permanencia) {
      const existe = this.estado.paginas.find((p) => String(p.id) === String(permanencia));
      if (existe) {
        await this._selecionarPagina(existe.id);
        this._renderizarAbas();
        return;
      }
    }

    await this._selecionarPagina(this.estado.paginas[0].id);
    this._renderizarAbas();
  }

  _renderizarAbas() {
    const container = this.refs.abas;
    if (!container) return;
    container.innerHTML = '';
    const fragmento = document.createDocumentFragment();

    this.estado.paginas.forEach((pagina) => {
      const ativa = String(pagina.id) === String(this.estado.paginaAtivaId);
      const aba = criarElemento('button', `cn-aba ${ativa ? 'cn-aba--ativa' : ''}`, {
        type: 'button',
        'data-aba-id': pagina.id,
      });

      const titulo = criarElemento('span', 'cn-aba__titulo');
      titulo.textContent = textoSeguro(pagina.title || 'Página');
      aba.appendChild(titulo);

      const fechar = criarElemento('span', 'cn-aba__fechar', {
        title: 'Excluir página',
        'data-fechar-aba': pagina.id,
      });
      fechar.textContent = '×';
      aba.appendChild(fechar);

      aba.addEventListener('click', (evento) => {
        if (evento.target.closest('[data-fechar-aba]')) return;
        this._selecionarPagina(pagina.id);
      });

      aba.addEventListener('dblclick', (evento) => {
        if (evento.target.closest('[data-fechar-aba]')) return;
        evento.preventDefault();
        this._iniciarRenomearAba(pagina.id);
      });

      fechar.addEventListener('click', async (evento) => {
        evento.stopPropagation();
        await this._excluirPagina(pagina.id);
      });

      fragmento.appendChild(aba);
    });

    const botaoNova = criarElemento('button', 'cn-aba cn-aba--nova', {
      type: 'button',
      title: 'Nova página',
    });
    botaoNova.textContent = '+';
    botaoNova.addEventListener('click', () => this._criarPagina());
    fragmento.appendChild(botaoNova);

    container.appendChild(fragmento);
  }

  _iniciarRenomearAba(id) {
    const pagina = this.estado.paginas.find((p) => String(p.id) === String(id));
    if (!pagina) return;
    const aba = this.refs.abas ? this.refs.abas.querySelector(`[data-aba-id="${pagina.id}"]`) : null;
    if (!aba || aba.classList.contains('cn-aba--editando')) return;
    const tituloSpan = aba.querySelector('.cn-aba__titulo');
    if (!tituloSpan) return;
    const valorAtual = pagina.title || 'Página';
    const input = criarElemento('input', 'cn-aba__input', { type: 'text' });
    input.value = valorAtual;
    aba.classList.add('cn-aba--editando');
    aba.replaceChild(input, tituloSpan);
    input.focus();
    input.select();

    const finalizar = async (salvar) => {
      if (!input.isConnected) return;
      aba.classList.remove('cn-aba--editando');
      aba.replaceChild(tituloSpan, input);
      if (!salvar) {
        tituloSpan.textContent = valorAtual;
        return;
      }
      const novoTitulo = textoSeguro(input.value).trim() || 'Página';
      if (novoTitulo === valorAtual) {
        tituloSpan.textContent = valorAtual;
        return;
      }
      tituloSpan.textContent = novoTitulo;
      await this._renomearPagina(pagina.id, novoTitulo);
    };

    input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') { evento.preventDefault(); finalizar(true); }
      if (evento.key === 'Escape') { evento.preventDefault(); finalizar(false); }
    });
    input.addEventListener('blur', () => finalizar(true));
  }

  async _renomearPagina(id, titulo) {
    const pagina = this.estado.paginas.find((p) => String(p.id) === String(id));
    if (!pagina) return;
    try {
      await this.api.atualizarPagina(id, { title: titulo });
      pagina.title = titulo;
      if (String(pagina.id) === String(this.estado.paginaAtivaId)) {
        this.editor.definirTitulo(titulo);
      }
    } catch (erro) {
      console.error('Falha ao renomear página', erro);
      window.alert('Não foi possível renomear a página. Tente novamente.');
    } finally {
      this._renderizarAbas();
    }
  }

  async _selecionarPagina(id) {
    const pagina = this.estado.paginas.find((p) => String(p.id) === String(id));
    if (!pagina) return;
    this.estado.paginaAtivaId = pagina.id;
    const chavePreferencia = this._chaveUltimaPagina(this.estado.cadernoAtivoId);
    if (chavePreferencia) {
      this.guardarPreferencia(chavePreferencia, pagina.id);
    }
    const rascunho = recuperarRascunho(pagina.id);
    if (rascunho && !pagina.content) {
      this.editor.definirTitulo(rascunho.titulo || pagina.title || 'Página');
      this.editor.definirHtml(rascunho.html || '');
      this.editor.definirStatus('Rascunho recuperado', 'rascunho');
    } else {
      this.editor.definirTitulo(pagina.title || 'Página');
      this.editor.definirHtml(pagina.content || '');
      this.editor.definirStatus('Tudo salvo', 'ok');
    }
    this._renderizarAbas();
  }

  _instalarEditor() {
    this.editor = new EditorCadernos(this.refs.editorHost);
    this.editor.ao('conteudo-alterado', () => this._agendarSalvar());
    this.editor.ao('titulo-alterado', (titulo) => this._quandoTituloAlterar(titulo));
    this.editor.definirStatus('Aguardando seleção', 'inativo');
  }

  _quandoTituloAlterar(titulo) {
    const pagina = this._paginaAtiva();
    if (!pagina) return;
    pagina.title = titulo || 'Página';
    this._renderizarAbas();
    this._agendarSalvar();
  }

  _paginaAtiva() {
    return this.estado.paginas.find((p) => String(p.id) === String(this.estado.paginaAtivaId)) || null;
  }

  _agendarSalvar() {
    const pagina = this._paginaAtiva();
    if (!pagina) return;
    this.editor.definirStatus('Alterações pendentes', 'pendente');
    if (this.timerSalvar) clearTimeout(this.timerSalvar);
    this.timerSalvar = setTimeout(() => this._salvarPagina(), 700);
  }

  async _salvarPagina() {
    const pagina = this._paginaAtiva();
    if (!pagina) return;
    if (this.salvando) return;
    const conteudo = this.editor.obterHtml();
    const titulo = this.editor.obterTitulo() || pagina.title || 'Página';
    const caderno = this.estado.cadernos.find((c) => String(c.id) === String(this.estado.cadernoAtivoId));
    const payload = {
      title: titulo,
      subject_id: caderno ? caderno.subject_id : null,
      content: conteudo,
    };
    guardarRascunho(pagina.id, { titulo, html: conteudo });
    this.editor.definirStatus('Salvando...', 'salvando');
    this.salvando = true;
    try {
      await this.api.atualizarPagina(pagina.id, payload);
      pagina.title = titulo;
      pagina.content = conteudo;
      this.editor.definirStatus('Tudo salvo', 'ok');
      removerRascunho(pagina.id);
    } catch (erro) {
      console.error('Falha ao salvar página', erro);
      this.editor.definirStatus('Erro ao salvar', 'erro');
    } finally {
      this.salvando = false;
      this._renderizarAbas();
    }
  }

  _capturarTituloPaginaPadrao() {
    const total = this.estado.paginas.length + 1;
    return `Página ${total}`;
  }

  _chaveUltimaPagina(cadernoId) {
    if (!cadernoId) return null;
    return `ultimaPagina:${cadernoId}`;
  }

  async _criarPagina() {
    if (!this.estado.cadernoAtivoId) return;
    const titulo = this._capturarTituloPaginaPadrao();
    const nova = await this.api.criarPagina({
      notebook_id: this.estado.cadernoAtivoId,
      title: titulo,
    }).catch((erro) => {
      console.error(erro);
      return null;
    });
    if (!nova) return;
    await this._carregarPaginas(this.estado.cadernoAtivoId);
    await this._selecionarPagina(nova.id || nova.page_id || nova);
  }

  async _criarPaginaInicial(cadernoId) {
    if (!cadernoId || this._criandoPaginaInicial) return false;
    this._criandoPaginaInicial = true;
    try {
      const titulo = this._capturarTituloPaginaPadrao();
      const nova = await this.api.criarPagina({
        notebook_id: cadernoId,
        title: titulo,
      }).catch((erro) => {
        console.error('Falha ao criar página inicial do caderno', erro);
        return null;
      });
      if (!nova) return false;
      await this._carregarPaginas(cadernoId, { permitirCriar: false });
      if (this.editor && typeof this.editor.focarArea === 'function') {
        this.editor.focarArea();
      }
      return true;
    } finally {
      this._criandoPaginaInicial = false;
    }
  }

  async _excluirPagina(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta página?')) return;
    await this.api.apagarPagina(id).catch((erro) => console.error(erro));
    await this._carregarPaginas(this.estado.cadernoAtivoId);
  }

  _abrirDialogoNovoCaderno() {
    const corpo = criarElemento('form', 'cn-formulario');
    corpo.innerHTML = `
      <label class="cn-campo">
        <span>Título</span>
        <input type="text" name="titulo" required placeholder="Nome do caderno">
      </label>
      <label class="cn-campo">
        <span>Matéria</span>
        <select name="materia" required>
          <option value="">Selecione</option>
          ${this.estado.materias.map((materia) => `<option value="${materia.id}">${materia.name || materia.title || materia.nome}</option>`).join('')}
        </select>
      </label>
    `;
    const dialogo = criarDialogo({
      titulo: 'Novo caderno',
      corpo,
      botoes: [
        { rotulo: 'Cancelar', variant: 'secundario', onClick: () => fecharOverlay(overlay) },
        { rotulo: 'Criar', variant: 'primario', onClick: async () => {
          const dados = new FormData(corpo);
          const titulo = textoSeguro(dados.get('titulo'));
          const materia = dados.get('materia');
          if (!titulo) { corpo.querySelector('[name="titulo"]').focus(); return; }
          if (!materia) { corpo.querySelector('[name="materia"]').focus(); return; }
          const resp = await this.api.criarCaderno({ title: titulo, subject_id: materia });
          const novoId = (resp && (resp.id || resp.notebook_id)) ? (resp.id || resp.notebook_id) : null;
          // Ajusta filtros para exibir o novo caderno (curso da matéria selecionada)
          const m = this.estado.materias.find((x) => String(x.id) === String(materia));
          if (m && m.course_id != null) {
            this.estado.filtros.curso = String(m.course_id);
            // Atualiza matérias do curso
            const respM = await this.api.listarMaterias(m.course_id).catch(() => ({ items: [] }));
            this._materiasFiltradas = Array.isArray(respM.items) ? respM.items : respM;
            if (this.refs.filtroCurso) this.refs.filtroCurso.value = String(m.course_id);
          } else {
            this.estado.filtros.curso = '';
            this._materiasFiltradas = null;
            if (this.refs.filtroCurso) this.refs.filtroCurso.value = '';
          }
          this.estado.filtros.materia = String(materia);
          if (this.refs.filtroMateria) this.refs.filtroMateria.value = String(materia);
          // Persistir preferências
          this.guardarPreferencia('cursoSelecionado', this.estado.filtros.curso);
          this.guardarPreferencia('materiaSelecionada', this.estado.filtros.materia);
          fecharOverlay(overlay);
          await this._carregarCadernos();
          if (novoId) {
            const existe = this.estado.cadernos.find((c) => String(c.id) === String(novoId));
            if (existe) { await this._selecionarCaderno(existe.id); }
          }
        } },
      ],
    });
    dialogo.querySelector('[data-ref="fechar"]').addEventListener('click', () => fecharOverlay(overlay));
    const overlay = montarOverlay(dialogo);
    const primeiro = dialogo.querySelector('input, select, button');
    if (primeiro) primeiro.focus();
  }

  async _criarCadernoAvulso() {
    const titulo = window.prompt('Título do caderno avulso:');
    if (!titulo) return;
    const resp = await this.api.criarCaderno({ title: titulo, subject_id: null });
    const novoId = (resp && (resp.id || resp.notebook_id)) ? (resp.id || resp.notebook_id) : null;
    // Caderno avulso: limpar filtros para aparecer
    this.estado.filtros.curso = '';
    this.estado.filtros.materia = '';
    this._materiasFiltradas = null;
    if (this.refs.filtroCurso) this.refs.filtroCurso.value = '';
    if (this.refs.filtroMateria) this.refs.filtroMateria.value = '';
    // Persistir preferências limpas
    this.guardarPreferencia('cursoSelecionado', '');
    this.guardarPreferencia('materiaSelecionada', '');
    await this._carregarCadernos();
    if (novoId) {
      const existe = this.estado.cadernos.find((c) => String(c.id) === String(novoId));
      if (existe) { await this._selecionarCaderno(existe.id); }
    }
  }

  _abrirDialogoLote() {
    const cursoAtual = this.estado.filtros.curso;
    const materias = this.estado.materias.filter((m) => !cursoAtual || String(m.course_id) === String(cursoAtual));
    if (!materias.length) {
      window.alert('Não há matérias disponíveis para criar cadernos em lote.');
      return;
    }
    const corpo = criarElemento('form', 'cn-formulario');
    corpo.innerHTML = `
      <fieldset class="cn-lista-opcoes">
        ${materias.map((materia) => `
          <label><input type="checkbox" name="materias" value="${materia.id}"> ${materia.name || materia.title || materia.nome}</label>
        `).join('')}
      </fieldset>
      <label class="cn-campo">
        <span>Prefixo (opcional)</span>
        <input type="text" name="prefixo" placeholder="Ex.: Aula -">
      </label>
    `;
    const overlay = montarOverlay(criarDialogo({
      titulo: 'Criar cadernos por matérias',
      corpo,
      botoes: [
        { rotulo: 'Cancelar', variant: 'secundario', onClick: () => fecharOverlay(overlay) },
        { rotulo: 'Criar selecionados', variant: 'primario', onClick: async () => {
          const selecionados = Array.from(corpo.querySelectorAll('input[name="materias"]:checked')).map((inp) => inp.value);
          if (!selecionados.length) {
            window.alert('Selecione ao menos uma matéria.');
            return;
          }
          const prefixo = textoSeguro(corpo.querySelector('[name="prefixo"]').value);
          await Promise.all(selecionados.map((id) => this.api.criarCaderno({
            title: prefixo ? `${prefixo} ${this._nomeMateria(id)}` : this._nomeMateria(id),
            subject_id: id,
          }).catch((erro) => console.error(erro))));
          fecharOverlay(overlay);
          await this._carregarCadernos();
        } },
      ],
    }));
    overlay.querySelector('[data-ref="fechar"]').addEventListener('click', () => fecharOverlay(overlay));
  }

  _nomeMateria(id) {
    const materia = this.estado.materias.find((m) => String(m.id) === String(id));
    return materia ? (materia.name || materia.title || materia.nome || 'Matéria') : 'Matéria';
  }

  _iniciarEdicaoRapidaTitulo(id, card) {
    if (!card || card.dataset.editando === 'true') return;
    const caderno = this.estado.cadernos.find((c) => String(c.id) === String(id));
    if (!caderno) return;
    const tituloEl = card.querySelector('[data-card-titulo]');
    if (!tituloEl || tituloEl.dataset.editando === 'true') return;
    const header = card.querySelector('[data-card-header]') || card;
    const valorAtual = textoSeguro(caderno.title || 'Caderno');

  this._bloquearRenderLista = true;
    card.dataset.editando = 'true';
    tituloEl.dataset.editando = 'true';
    tituloEl.setAttribute('data-card-original', valorAtual);
    tituloEl.hidden = true;
    header.classList.add('cn-card__header--editando');

    const input = criarElemento('input', 'cn-card__input', { type: 'text' });
    input.value = valorAtual;
    header.appendChild(input);
    input.focus();
    input.select();

    let finalizado = false;
    const restaurar = (novoTitulo = valorAtual) => {
      if (finalizado) return;
      finalizado = true;
      input.removeEventListener('keydown', aoPressionar);
      input.removeEventListener('blur', aoPerderFoco);
      if (input.parentNode) input.remove();
      tituloEl.hidden = false;
      tituloEl.textContent = novoTitulo;
      delete tituloEl.dataset.editando;
      tituloEl.removeAttribute('data-card-original');
  delete card.dataset.editando;
  header.classList.remove('cn-card__header--editando');
  this._bloquearRenderLista = false;
    };

    const salvar = async () => {
      if (finalizado) return;
      const textoDigitado = textoSeguro(input.value).trim();
      const novoTitulo = textoDigitado || 'Caderno';
      restaurar(novoTitulo);
      if (novoTitulo === valorAtual) {
        this._renderizarListaCadernos();
        return;
      }
      try {
        await this.api.atualizarCaderno(caderno.id, { title: novoTitulo });
        caderno.title = novoTitulo;
        if (String(caderno.id) === String(this.estado.cadernoAtivoId) && this.refs.tituloCaderno) {
          this.refs.tituloCaderno.textContent = novoTitulo;
        }
      } catch (erro) {
        console.error('Falha ao renomear caderno', erro);
        window.alert('Não foi possível renomear o caderno. Tente novamente.');
        caderno.title = valorAtual;
        if (String(caderno.id) === String(this.estado.cadernoAtivoId) && this.refs.tituloCaderno) {
          this.refs.tituloCaderno.textContent = valorAtual;
        }
      } finally {
        this._renderizarListaCadernos();
      }
    };

    const cancelar = () => {
      if (finalizado) return;
      restaurar(valorAtual);
      this._renderizarListaCadernos();
    };

    const aoPressionar = (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        salvar();
      }
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cancelar();
      }
    };

    const aoPerderFoco = () => {
      salvar();
    };

    input.addEventListener('keydown', aoPressionar);
    input.addEventListener('blur', aoPerderFoco);
  }

  _abrirDialogoRenomearCaderno() {
    const caderno = this.estado.cadernos.find((c) => String(c.id) === String(this.estado.cadernoAtivoId));
    if (!caderno) return;
    const input = criarElemento('input', 'cn-input');
    input.type = 'text';
    input.value = caderno.title || '';
    const overlay = montarOverlay(criarDialogo({
      titulo: 'Renomear caderno',
      corpo: input,
      botoes: [
        { rotulo: 'Cancelar', variant: 'secundario', onClick: () => fecharOverlay(overlay) },
        { rotulo: 'Salvar', variant: 'primario', onClick: async () => {
          const novoTitulo = textoSeguro(input.value);
          if (!novoTitulo) { input.focus(); return; }
          await this.api.atualizarCaderno(caderno.id, { title: novoTitulo });
          caderno.title = novoTitulo;
          this.refs.tituloCaderno.textContent = novoTitulo;
          this._renderizarListaCadernos();
          fecharOverlay(overlay);
        } },
      ],
    }));
    overlay.querySelector('[data-ref="fechar"]').addEventListener('click', () => fecharOverlay(overlay));
    input.focus();
    input.select();
  }

  _abrirDialogoAlterarMateria() {
    const caderno = this.estado.cadernos.find((c) => String(c.id) === String(this.estado.cadernoAtivoId));
    if (!caderno) return;
    const select = criarElemento('select', 'cn-select');
    select.innerHTML = '<option value="">Sem matéria</option>' + this.estado.materias.map((materia) => `
      <option value="${materia.id}" ${String(materia.id) === String(caderno.subject_id) ? 'selected' : ''}>${materia.name || materia.title || materia.nome}</option>
    `).join('');
    const overlay = montarOverlay(criarDialogo({
      titulo: 'Alterar matéria do caderno',
      corpo: select,
      botoes: [
        { rotulo: 'Cancelar', variant: 'secundario', onClick: () => fecharOverlay(overlay) },
        { rotulo: 'Salvar', variant: 'primario', onClick: async () => {
          const novaMateria = select.value || null;
          await this.api.atualizarCaderno(caderno.id, { subject_id: novaMateria });
          caderno.subject_id = novaMateria;
          this.refs.subtituloCaderno.textContent = this._descricaoCaderno(caderno);
          this._renderizarListaCadernos();
          fecharOverlay(overlay);
        } },
      ],
    }));
    overlay.querySelector('[data-ref="fechar"]').addEventListener('click', () => fecharOverlay(overlay));
  }

  async _confirmarExcluirCaderno(id = this.estado.cadernoAtivoId) {
    if (!id) return;
    const caderno = this.estado.cadernos.find((c) => String(c.id) === String(id));
    if (!caderno) return;
    const titulo = textoSeguro(caderno.title || 'Caderno');
    if (!window.confirm(`Excluir o caderno "${titulo}"?`)) return;
    await this.api.apagarCaderno(caderno.id).catch((erro) => console.error(erro));
    const eraAtivo = String(caderno.id) === String(this.estado.cadernoAtivoId);
    if (eraAtivo) {
      this.estado.cadernoAtivoId = null;
      this.estado.paginas = [];
      if (this.editor) {
        this.editor.definirTitulo('');
        this.editor.definirHtml('');
        this.editor.definirStatus('Selecione um caderno', 'inativo');
      }
    }
    await this._carregarCadernos();
  }

  _iniciarRenomearCaderno() {
    const heading = this.refs.tituloCaderno;
    if (!heading || heading.dataset.editando === 'true') return;
    const caderno = this.estado.cadernos.find((c) => String(c.id) === String(this.estado.cadernoAtivoId));
    if (!caderno) return;
    heading.dataset.editando = 'true';
    const valorAtual = caderno.title || 'Caderno';
    const input = criarElemento('input', 'cn-titulo-caderno__input', { type: 'text' });
    input.value = valorAtual;
    const restaurar = (texto) => {
      heading.dataset.editando = 'false';
      heading.innerHTML = '';
      heading.textContent = texto;
    };
    heading.innerHTML = '';
    heading.appendChild(input);
    input.focus();
    input.select();

    let cancelado = false;
    const salvar = async () => {
      if (cancelado) { restaurar(valorAtual); return; }
      const novoTitulo = textoSeguro(input.value).trim() || 'Caderno';
      if (novoTitulo === valorAtual) {
        restaurar(novoTitulo);
        return;
      }
      try {
        await this.api.atualizarCaderno(caderno.id, { title: novoTitulo });
        caderno.title = novoTitulo;
        this.refs.tituloCaderno.textContent = novoTitulo;
        this._renderizarListaCadernos();
        restaurar(novoTitulo);
      } catch (erro) {
        console.error('Falha ao renomear caderno', erro);
        window.alert('Não foi possível renomear o caderno. Tente novamente.');
        restaurar(valorAtual);
      }
    };

    const cancelar = () => {
      cancelado = true;
      restaurar(valorAtual);
    };

    input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') { evento.preventDefault(); salvar(); }
      if (evento.key === 'Escape') { evento.preventDefault(); cancelar(); }
    });
    input.addEventListener('blur', () => salvar());
  }

  guardarPreferencia(chave, valor) {
    try { localStorage.setItem(`cn-preferencia:${chave}`, String(valor)); } catch (erro) { /* noop */ }
  }

  capturarPreferencia(chave) {
    try { return localStorage.getItem(`cn-preferencia:${chave}`); } catch (erro) { return null; }
  }
}

const inicializar = () => {
  const host = document.getElementById('cadernos-app') || document.querySelector('[data-cadernos-novo]');
  if (!host) return;
  const app = new AplicativoCadernos(host);
  app.iniciar();
};

document.addEventListener('DOMContentLoaded', inicializar);
