const normalizarBase = (valor) => {
  if (!valor) return '';
  const texto = String(valor).trim();
  if (!texto) return '';
  if (/^https?:/i.test(texto)) {
    return texto.replace(/\/$/, '');
  }
  if (texto.startsWith('/')) {
    return texto.replace(/\/$/, '');
  }
  return `/${texto.replace(/\/$/, '')}`;
};

const inferirBaseAtual = () => {
  const caminho = window.location && window.location.pathname ? window.location.pathname : '';
  if (!caminho) return '';
  const htmlMatch = caminho.match(/^(.*)\/html\//);
  if (htmlMatch && typeof htmlMatch[1] === 'string') {
    return normalizarBase(htmlMatch[1]);
  }
  const appsMatch = caminho.match(/^(.*)\/apps\/[^/]+\//);
  if (appsMatch && typeof appsMatch[1] === 'string') {
    return normalizarBase(appsMatch[1]);
  }
  const partes = caminho.split('/').filter(Boolean);
  if (partes.length > 0) {
    return normalizarBase(`/${partes[0]}`);
  }
  return '';
};

const descobrirEndpoints = () => {
  const cfg = (window.ProdutivusAPI && window.ProdutivusAPI.endpoints) || null;
  let base = normalizarBase(cfg && cfg.base);
  if (!base) {
    base = inferirBaseAtual();
  }
  const montar = (override, caminho) => {
    if (override) return override;
    if (base) {
      const combinado = base.endsWith('/') ? `${base}${caminho}` : `${base}/${caminho}`;
      return combinado.replace(/([^:]\/)(\/+)/g, '$1');
    }
    return `/${caminho}`;
  };
  return {
    cursos: montar(cfg && cfg.courses, 'server/api/courses.php'),
    materias: montar(cfg && cfg.subjects, 'server/api/subjects.php'),
    cadernos: montar(cfg && cfg.notebooks, 'server/api/notebooks.php'),
    paginas: montar((cfg && (cfg.notebookPages || cfg.pages)), 'server/api/notebook_pages.php'),
  };
};

const tratarResposta = async (resposta) => {
  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => resposta.statusText);
    const erro = new Error(`HTTP ${resposta.status}: ${texto}`);
    erro.status = resposta.status;
    throw erro;
  }
  const tipo = resposta.headers.get('content-type') || '';
  if (tipo.includes('application/json')) {
    return resposta.json();
  }
  return resposta.text();
};

const jsonHeaders = { 'Content-Type': 'application/json' };

const consulta = async (url, opcoes = {}) => {
  const resp = await fetch(url, { credentials: 'same-origin', ...opcoes });
  return tratarResposta(resp);
};

export class ApiCadernos {
  constructor() {
    this.endpoints = descobrirEndpoints();
  }

  async listarCursos() {
    return consulta(this.endpoints.cursos);
  }

  async listarMaterias(cursoId) {
    const baseUrl = this.endpoints.materias;
    const url = cursoId ? `${baseUrl}?course_id=${encodeURIComponent(cursoId)}` : baseUrl;
    return consulta(url);
  }

  async listarCadernos(params = {}) {
    const query = new URLSearchParams();
    if (params.cursoId) query.set('course_id', params.cursoId);
    if (params.materiaId) query.set('subject_id', params.materiaId);
    const baseUrl = this.endpoints.cadernos;
    const url = query.toString() ? `${baseUrl}?${query.toString()}` : baseUrl;
    return consulta(url);
  }

  async criarCaderno(dados) {
    return consulta(this.endpoints.cadernos, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(dados),
    });
  }

  async atualizarCaderno(id, dados) {
    return consulta(`${this.endpoints.cadernos}?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(dados),
    });
  }

  async apagarCaderno(id) {
    return consulta(`${this.endpoints.cadernos}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async listarPaginas(cadernoId) {
    const url = `${this.endpoints.paginas}?notebook_id=${encodeURIComponent(cadernoId)}`;
    return consulta(url);
  }

  async obterPagina(id) {
    const url = `${this.endpoints.paginas}?id=${encodeURIComponent(id)}`;
    return consulta(url);
  }

  async criarPagina(dados) {
    return consulta(this.endpoints.paginas, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(dados),
    });
  }

  async atualizarPagina(id, dados) {
    return consulta(`${this.endpoints.paginas}?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(dados),
    });
  }

  async apagarPagina(id) {
    return consulta(`${this.endpoints.paginas}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
