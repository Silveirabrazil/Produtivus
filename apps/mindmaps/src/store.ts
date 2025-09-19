// Tipos legados (editor Canvas)
export type Node = { id: string; x: number; y: number; label: string }
export type Edge = { a: string; b: string }
export type LegacyMapData = { nodes: Node[]; edges: Edge[] }

// Tipos do notebook
export type MMGroup = { id: string; title: string }
export type MMMap = { id: string; title: string; groupId: string; data: any; createdAt: number; updatedAt: number }
export type Notebook = {
  version: 1;
  groups: MMGroup[];
  maps: Record<string, MMMap>;
  order: Record<string, string[]>; // groupId -> mapIds (ordem)
  openTabs: string[]; // mapIds
  activeId: string | null;
}

const LEGACY_KEY = 'mindmaps.current'
const NB_KEY = 'mindmaps.notebook.v1'

function newId(): string { return Math.random().toString(36).slice(2) + String(Date.now()).slice(-6) }

function defaultLegacy(): LegacyMapData {
  return { nodes: [{ id: 'root', x: 400, y: 250, label: 'Mapa' }], edges: [] }
}

export function loadNotebook(): Notebook {
  // tentar notebook
  try {
    const raw = localStorage.getItem(NB_KEY)
    if (raw) {
      const nb = JSON.parse(raw) as Notebook
      // sanity
      if (!nb.version) throw new Error('bad nb')
      nb.openTabs = Array.isArray(nb.openTabs) ? nb.openTabs : []
      return nb
    }
  } catch {}
  // migrar de legado para notebook
  let legacy: any = null
  try {
    const lr = localStorage.getItem(LEGACY_KEY)
    if (lr) legacy = JSON.parse(lr)
  } catch {}
  const gid = newId()
  const mid = newId()
  const data = legacy && (Array.isArray(legacy?.cells) || (Array.isArray(legacy?.nodes) && Array.isArray(legacy?.edges))) ? legacy : defaultLegacy()
  const nb: Notebook = {
    version: 1,
    groups: [{ id: gid, title: 'Pessoal' }],
    maps: { [mid]: { id: mid, title: 'Mapa 1', groupId: gid, data, createdAt: Date.now(), updatedAt: Date.now() } },
    order: { [gid]: [mid] },
    openTabs: [mid],
    activeId: mid,
  }
  saveNotebook(nb)
  return nb
}

export function saveNotebook(nb: Notebook) {
  try { localStorage.setItem(NB_KEY, JSON.stringify(nb)) } catch {}
}

export function createGroup(nb: Notebook, title = 'Grupo'): MMGroup {
  const g: MMGroup = { id: newId(), title }
  nb.groups.push(g)
  nb.order[g.id] = []
  saveNotebook(nb)
  return g
}
export function renameGroup(nb: Notebook, groupId: string, title: string){
  const g = nb.groups.find(g => g.id === groupId); if (!g) return; g.title = title; saveNotebook(nb)
}
export function createMap(nb: Notebook, groupId: string, title = 'Novo mapa', data?: any): MMMap {
  if (!nb.order[groupId]) nb.order[groupId] = []
  const m: MMMap = { id: newId(), title, groupId, data: data ?? defaultLegacy(), createdAt: Date.now(), updatedAt: Date.now() }
  nb.maps[m.id] = m
  nb.order[groupId].push(m.id)
  // abrir automaticamente
  if (!nb.openTabs.includes(m.id)) nb.openTabs.push(m.id)
  nb.activeId = m.id
  saveNotebook(nb)
  return m
}
export function renameMap(nb: Notebook, mapId: string, title: string){
  const m = nb.maps[mapId]; if (!m) return; m.title = title; m.updatedAt = Date.now(); saveNotebook(nb)
}
export function moveMap(nb: Notebook, mapId: string, toGroupId: string){
  const m = nb.maps[mapId]; if (!m) return;
  // remover do grupo antigo
  const fromOrder = nb.order[m.groupId] || []
  nb.order[m.groupId] = fromOrder.filter(id => id !== mapId)
  // adicionar no novo
  if (!nb.order[toGroupId]) nb.order[toGroupId] = []
  nb.order[toGroupId].push(mapId)
  m.groupId = toGroupId; m.updatedAt = Date.now();
  saveNotebook(nb)
}
export function removeMap(nb: Notebook, mapId: string){
  const m = nb.maps[mapId]; if (!m) return;
  nb.order[m.groupId] = (nb.order[m.groupId] || []).filter(id => id !== mapId)
  nb.openTabs = nb.openTabs.filter(id => id !== mapId)
  if (nb.activeId === mapId) nb.activeId = nb.openTabs[nb.openTabs.length - 1] || null
  delete nb.maps[mapId]
  saveNotebook(nb)
}

// Compat com App.vue atual: carrega/salva o mapa ativo
export function loadCurrent(): any {
  const nb = loadNotebook()
  const id = nb.activeId || nb.openTabs[0]
  if (id && nb.maps[id]) return nb.maps[id].data
  return defaultLegacy()
}
export function saveCurrent(data: any){
  const nb = loadNotebook()
  const id = nb.activeId || nb.openTabs[0]
  if (id && nb.maps[id]) {
    nb.maps[id].data = data; nb.maps[id].updatedAt = Date.now(); saveNotebook(nb)
  } else {
    // sem mapa ativo: criar padrão
    const g = nb.groups[0] || createGroup(nb, 'Pessoal')
    createMap(nb, g.id, 'Mapa', data)
  }
}
