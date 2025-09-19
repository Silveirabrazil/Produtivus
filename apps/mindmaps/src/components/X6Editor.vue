<template>
  <div class="x6-wrap">
    <div ref="container" class="x6-container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, defineExpose } from 'vue'
import { Graph } from '@antv/x6'
import { Selection } from '@antv/x6-plugin-selection'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { History } from '@antv/x6-plugin-history'
import { Transform } from '@antv/x6-plugin-transform'
import { Export } from '@antv/x6-plugin-export'
import { Clipboard } from '@antv/x6-plugin-clipboard'

type NodeStyle = { fill?: string; stroke?: string; shape?: 'rect'|'ellipse'|'diamond'; fontSize?: number; textColor?: string; icon?: string; fontFamily?: string }
type EdgeStyle = { type?: 'straight'|'curved'; dashed?: boolean; color?: string; width?: number; arrow?: boolean }

type Tool = 'select'|'node'|'edge'|'text'|'freehand'|'line'|'pen'|'shapeDraw'|'bucket'|'eyedropper'|'eraser'
const props = defineProps<{ tool:Tool; nodeStyle?: NodeStyle; edgeStyle?: EdgeStyle }>()
const emit = defineEmits<{ (e:'data-change', data:any):void; (e:'selection-change', payload:{ nodeId:string|null; edgeIndex:number|null }):void; (e:'sample-style', payload:{ nodeStyle?:NodeStyle; edgeStyle?:EdgeStyle }):void }>()

const container = ref<HTMLDivElement|null>(null)
let graph: Graph
let selectionPlugin: Selection | null = null
let isDrawing = false
let penEdge: any = null
let penPoints: Array<{x:number;y:number}> = []

function createGraph(){
  graph = new Graph({
    container: container.value!,
    grid: { visible: true, type: 'dot', size: 12 },
    panning: { enabled: true, eventTypes: ['rightMouseDown', 'mouseWheel'] },
    mousewheel: { enabled: true, modifiers: ['ctrl', 'meta'] },
  connecting: {
      allowBlank: false,
      allowLoop: false,
      highlight: true,
      snap: true,
      // aceitar conexão nó->nó (sem portas explícitas) para UX tipo PowerPoint
      allowNode: true,
      allowEdge: false,
      anchor: 'center',
      // garantir que a aresta termine na borda do nó (não por cima do texto)
      connectionPoint: 'boundary',
  // só iniciar conexão quando a ferramenta for 'edge'
  validateMagnet({}) { return props.tool === 'edge' },
      createEdge() {
        return graph.createEdge(defaultEdgeAttrs())
      },
      validateConnection({ sourceCell, targetCell }){
        return props.tool === 'edge' && !!sourceCell && !!targetCell && sourceCell.id !== targetCell.id
      },
      router: defaultRouter(),
      connector: defaultConnector(),
    },
  })

  selectionPlugin = new Selection({ enabled: true, rubberband: true, showNodeSelectionBox: true })
  graph.use(selectionPlugin)
  graph.use(new Snapline({ enabled: true }))
  graph.use(new Keyboard({ enabled: true }))
  graph.use(new History({ enabled: true }))
  graph.use(new Transform({ resizing: true, rotating: true }))
  graph.use(new Export())
  graph.use(new Clipboard({ enabled: true }))

  // atalhos
  graph.bindKey(['backspace', 'delete'], (e:any) => {
    try { e?.preventDefault?.() } catch {}
    const cells = graph.getSelectedCells()
    if (cells.length) { graph.removeCells(cells); emitChange() }
    return false
  })
  graph.bindKey(['ctrl+z', 'meta+z'], () => { (graph as any).undo?.(); return false })
  graph.bindKey(['ctrl+y', 'meta+y', 'ctrl+shift+z', 'meta+shift+z'], () => { (graph as any).redo?.(); return false })
  // nudge com setas (Shift para passos maiores)
  const nudge = (dx:number, dy:number) => {
    const cells = graph.getSelectedCells().filter(c=>c.isNode()) as any[]
    if (!cells.length) return false
    cells.forEach(n=>{ const p=n.getPosition(); n.position(p.x+dx, p.y+dy) })
    emitChange(); return false
  }
  graph.bindKey(['left'], (e:any)=>{ const big = e?.shiftKey; return nudge(big?-10:-1, 0) })
  graph.bindKey(['right'], (e:any)=>{ const big = e?.shiftKey; return nudge(big?10:1, 0) })
  graph.bindKey(['up'], (e:any)=>{ const big = e?.shiftKey; return nudge(0, big?-10:-1) })
  graph.bindKey(['down'], (e:any)=>{ const big = e?.shiftKey; return nudge(0, big?10:1) })
  // selecionar tudo (apenas na ferramenta Seleção)
  graph.bindKey(['ctrl+a', 'meta+a'], () => {
    if (props.tool !== 'select') return false
    const cells = graph.getCells()
    if (cells.length) graph.select(cells)
    return false
  })
  // copiar / colar (apenas na ferramenta Seleção)
  graph.bindKey(['ctrl+c', 'meta+c'], () => {
    if (props.tool !== 'select') return false
    const cells = graph.getSelectedCells()
    if (cells.length) (graph as any).copy?.(cells)
    return false
  })
  graph.bindKey(['ctrl+v', 'meta+v'], () => {
    if (props.tool !== 'select') return false
    const pasted = (graph as any).paste?.({ offset: 24 })
    if (pasted?.length) graph.select(pasted)
    emitChange()
    return false
  })

  // eventos para persistência e seleção
  const dataEvents = ['cell:added','cell:removed','cell:changed','edge:connected','node:moved']
  dataEvents.forEach(e => graph.on(e as any, () => emitChange()))
  graph.on('selection:changed', () => emitSelection())
  // selecionar edges com clique e exibir ferramentas (somente na ferramenta Seleção)
  graph.on('edge:click', ({ edge }) => { if (props.tool === 'select') graph.select(edge) })
  graph.on('cell:selected', ({ cell }) => {
    if (isDrawing || props.tool !== 'select') return
    if (cell.isEdge()) {
      cell.addTools([
        { name: 'vertices' },
        { name: 'button-remove', args: { distance: -30 } },
      ])
      // leve destaque visual mantendo cor
      const c = (cell.attr('line/stroke') as string) || '#475569'
      const w = (cell.attr('line/strokeWidth') as number) || 2
      cell.attr({ line: { stroke: c, strokeWidth: Math.min(w + 2, 10) } })
    } else if (cell.isNode()) {
      cell.addTools([{ name: 'boundary' }])
    }
  })
  graph.on('cell:unselected', ({ cell }) => {
    if (cell.isEdge()) {
      // remover realce, restaurar largura padrão mínima 1
      const w = (cell.attr('line/strokeWidth') as number) || 2
      cell.attr({ line: { strokeWidth: Math.max(1, w - 2) } })
    }
    cell.removeTools()
  })
  graph.on('node:dblclick', ({ node, e }) => {
    if (props.tool !== 'select') return
    e.stopPropagation()
    // Edição inline: cria um input posicionado sobre o nó
    const bbox = node.getBBox()
    const host = graph.container as HTMLElement
    const input = document.createElement('input')
    input.type = 'text'
    const current = (node.getAttrs() as any)?.label?.text || ''
    input.value = current
    Object.assign(input.style, {
      position: 'absolute',
      left: `${bbox.x}px`,
      top: `${bbox.y + bbox.height / 2 - 14}px`,
      width: `${Math.max(80, bbox.width - 16)}px`,
      height: '28px',
      transform: 'translate(0, -50%)',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      padding: '2px 6px',
      fontSize: '14px',
      fontFamily: (props.nodeStyle?.fontFamily ?? 'Inter, system-ui, sans-serif'),
      zIndex: '1000',
      background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,.06)'
    } as CSSStyleDeclaration)
    host.appendChild(input)
    input.focus()
    input.select()
    const commit = () => {
      const val = input.value
      node.setAttrs({ label: { text: val } })
      host.removeChild(input)
      emitChange()
    }
    const cancel = () => { host.removeChild(input) }
    input.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') { evt.preventDefault(); commit() }
      if (evt.key === 'Escape') { evt.preventDefault(); cancel() }
    })
    input.addEventListener('blur', commit, { once: true })
  })

  // utilitário para aplicar estilo em edges (declarado aqui para uso precoce)
  function styleForEdge(s:EdgeStyle){
    const color = s.color ?? '#475569'
    const width = s.width ?? 2
    const dashed = s.dashed ? 6 : 0
    const arrow = s.arrow !== false
    return {
      attrs: { line: { stroke: color, strokeWidth: width, targetMarker: arrow ? { name:'block', width:12, height:8, offset:2 } : null, sourceMarker: null, strokeDasharray: dashed ? 6 : 0, strokeLinecap:'round' } },
    }
  }

  // ferramentas por clique
  graph.on('cell:click', ({ cell }) => {
    if (props.tool === 'bucket'){
      if (cell.isNode()){
        const ns = props.nodeStyle || {}
        cell.setAttrs({ body: { fill: ns.fill ?? undefined, stroke: ns.stroke ?? undefined }, label: { fill: ns.textColor ?? undefined, fontSize: ns.fontSize ?? undefined, fontFamily: ns.fontFamily ?? undefined } })
        emitChange()
      } else if (cell.isEdge()){
        const es = props.edgeStyle || {}
        const def = styleForEdge(es)
        ;(cell as any).setAttrs(def.attrs)
        ;(cell as any).setConnector({ name: es.type === 'curved' ? 'smooth' : 'normal' })
  ;(cell as any).setRouter({ name: es.type === 'curved' ? 'normal' : 'orth' })
        emitChange()
      }
    } else if (props.tool === 'eyedropper'){
      if (cell.isNode()){
        const label = (cell.getAttrs() as any).label || {}
        const body = (cell.getAttrs() as any).body || {}
        emit('sample-style', { nodeStyle: { fill: body.fill, stroke: body.stroke, fontSize: label.fontSize, textColor: label.fill, fontFamily: label.fontFamily } })
      } else if (cell.isEdge()){
        const line = (cell.getAttrs() as any).line || {}
        emit('sample-style', { edgeStyle: { type: (cell.getConnector()?.name === 'smooth') ? 'curved' : 'straight', dashed: !!line.strokeDasharray, color: line.stroke, width: line.strokeWidth, arrow: !!line.targetMarker } })
      }
    } else if (props.tool === 'eraser'){
      graph.removeCell(cell); emitChange()
    }
  })

  // nó inicial
  if (graph.getNodes().length === 0){
    const n = graph.addNode(newNode(400, 250, 'Mapa'))
    if (props.tool === 'select') graph.select(n)
  }
}

function defaultConnector(){
  return props.edgeStyle?.type === 'curved' ? 'smooth' : 'normal'
}
function defaultRouter(){
  // tipo PowerPoint => ortogonal por padrão quando straight
  return props.edgeStyle?.type === 'curved' ? 'normal' : 'orth'
}
function defaultEdgeAttrs(){
  const s = props.edgeStyle || {}
  const color = s.color ?? '#475569'
  const width = s.width ?? 2
  const dashed = s.dashed ? 6 : 0
  const arrow = s.arrow !== false
  return {
    attrs: {
      line: {
        stroke: color,
        strokeWidth: width,
  // marcador com leve recuo e cantos arredondados para não invadir o nó
  targetMarker: arrow ? { name: 'block', width: 12, height: 8, offset: 2 } : null,
  sourceMarker: null,
        strokeDasharray: dashed ? 6 : 0,
  strokeLinecap: 'round'
      },
    },
    connector: { name: defaultConnector() as any },
    router: { name: defaultRouter() as any },
  }
}

function newNode(x:number, y:number, label='Novo nó'){
  const ns = props.nodeStyle || {}
  const fill = ns.fill ?? '#ffffff'
  const stroke = ns.stroke ?? '#cbd5e1'
  const fontSize = ns.fontSize ?? 14
  const textColor = ns.textColor ?? '#0b0f13'
  const fontFamily = ns.fontFamily ?? 'Inter, system-ui, sans-serif'
  const shape = ns.shape ?? 'rect'
  const base:any = { x, y, width: 160, height: 60, attrs: {}, markup: [] as any[] }
  if (shape === 'ellipse'){
    base.shape = 'ellipse'
    base.attrs = { body: { fill, stroke }, label: { text: label, fontSize, fill: textColor, fontFamily } }
  base.markup = [ { tagName:'ellipse', selector:'body', attrs:{ magnet: 'true' } }, { tagName:'text', selector:'label' } ]
  } else if (shape === 'diamond'){
    base.shape = 'polygon'
    // usar refPoints relativos ao bbox para que o X6 calcule corretamente o boundary
    base.attrs = { body: { fill, stroke, refPoints: '0,50 50,0 100,50 50,100' }, label: { text: label, fontSize, fill: textColor, fontFamily } }
  base.markup = [ { tagName:'polygon', selector:'body', attrs:{ magnet: 'true' } }, { tagName:'text', selector:'label' } ]
  } else {
    base.shape = 'rect'
    base.attrs = { body: { fill, stroke, rx: 10, ry: 10 }, label: { text: label, fontSize, fill: textColor, fontFamily } }
  base.markup = [ { tagName:'rect', selector:'body', attrs:{ magnet: 'true' } }, { tagName:'text', selector:'label' } ]
  }
  return base
}

function emitChange(){
  const data = graph.toJSON()
  emit('data-change', data)
}
function emitSelection(){
  const sel = graph.getSelectedCells()
  const node = sel.find(c => c.isNode())
  const edge = sel.find(c => c.isEdge())
  emit('selection-change', { nodeId: node?.id ?? null, edgeIndex: edge ? 0 : null })
}

function addNodeAt(x:number,y:number){
  const n = graph.addNode(newNode(x,y))
  if (props.tool === 'select') graph.select(n)
  emitChange()
}
function addNodeAtCenter(){
  const bbox = graph.container!.getBoundingClientRect()
  const n = graph.addNode(newNode(bbox.width/2, bbox.height/2))
  if (props.tool === 'select') graph.select(n)
  emitChange()
}

// cursores em data-URI simples para melhor feedback visual
const CURSORS: Record<Tool, string> = {
  select: 'default',
  node: 'copy',
  edge: 'crosshair',
  text: 'text',
  freehand: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M3 21l6-2 10-10-4-4L5 15l-2 6z' fill='%23222'/></svg>") 2 22, crosshair`,
  line: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M2 22L22 2' stroke='%23222' stroke-width='2'/></svg>") 2 22, crosshair`,
  pen: 'crosshair',
  shapeDraw: 'crosshair',
  bucket: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M7 3l10 10-5 5L2 8z' fill='%23222'/><circle cx='18' cy='18' r='3' fill='%23222'/></svg>") 4 20, pointer`,
  eyedropper: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M4 20l6-6 2 2-6 6H4zM14 4l6 6-4 4-6-6 4-4z' fill='%23222'/></svg>") 2 22, crosshair`,
  eraser: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M3 16l8-8 6 6-6 6H7z' fill='%23222'/></svg>") 2 22, not-allowed`
}

// mapear props.tool para cursores/ações
function setupToolBehavior(){
  const t = props.tool
  if (!graph) return
  // seleção sempre habilitada; controlar criação de nós e conexão
  graph.container!.style.cursor = CURSORS[t]
  // habilitar seleção apenas na ferramenta de Seleção
  if (selectionPlugin){
    const anySel:any = selectionPlugin as any
    if (t === 'select'){
  anySel.enable?.()
  anySel.enableRubberband?.(true)
    } else {
  // desabilitar seleção fora da ferramenta Seleção e limpar seleção atual
  anySel.disable?.()
  ;(graph as any).cleanSelection?.()
    }
  }
  // arrastar nós apenas na ferramenta de Seleção
  const nodes = graph.getNodes()
  nodes.forEach((n:any) => n.setDraggable?.(t === 'select'))
}

onMounted(() => {
  createGraph()
  const dom = graph.container!
  // dblclick cria nó quando na ferramenta de nó
  dom.addEventListener('dblclick', (ev) => {
    const p = graph.clientToLocal({ x: ev.clientX, y: ev.clientY })
    const x = p.x, y = p.y
    if (props.tool === 'node') addNodeAt(x, y)
  })
  // clique+arrasto para conexão já é coberto por connecting/magnet
  // clique simples para texto
  dom.addEventListener('click', (ev) => {
    const p = graph.clientToLocal({ x: ev.clientX, y: ev.clientY })
    const x = p.x, y = p.y
    if (props.tool === 'text'){
      const ns = props.nodeStyle || {}
      const fontSize = ns.fontSize ?? 16
      const color = ns.textColor ?? '#111'
      const fontFamily = ns.fontFamily ?? 'Inter, system-ui, sans-serif'
      const node:any = graph.addNode({
        shape: 'rect', x, y, width: 1, height: 1,
        attrs: { body:{ fill:'transparent', stroke:'transparent' }, label: { text: 'Texto', fontSize, fill: color, fontFamily } },
        markup: [ { tagName:'rect', selector:'body' }, { tagName:'text', selector:'label' } ]
      })
      emitChange()
    }
  })

  // desenho livre e linha
  let drawing:any = null
  let points: Array<{x:number;y:number}> = []
  let origin = { x: 0, y: 0 }
  function toPath(pts:{x:number;y:number}[]){
    if (pts.length < 2) return ''
    let d = `M 0 0`
    for (let i=1;i<pts.length;i++) d += ` L ${pts[i].x - pts[0].x} ${pts[i].y - pts[0].y}`
    return d
  }
  dom.addEventListener('mousedown', (ev) => {
    const p = graph.clientToLocal({ x: ev.clientX, y: ev.clientY })
    const x = p.x, y = p.y
    if (props.tool === 'freehand'){
      isDrawing = true
      ev.preventDefault(); ev.stopPropagation()
      points = [{x,y}]
      origin = { x, y }
      const es = props.edgeStyle || {}
      drawing = graph.addNode({
        shape:'path', x, y, width:1, height:1,
        attrs:{ body:{ d: `M 0 0`, fill:'none', stroke: es.color ?? '#475569', strokeWidth: es.width ?? 2, strokeDasharray: es.dashed ? 6 : 0, strokeLinecap:'round', strokeLinejoin:'round' } },
        markup:[{ tagName:'path', selector:'body' }]
      })
      graph.container?.classList.add('is-drawing')
    } else if (props.tool === 'line'){
      isDrawing = true
      ev.preventDefault(); ev.stopPropagation()
      points = [{x,y}]
      drawing = { x0:x, y0:y }
      graph.container?.classList.add('is-drawing')
    } else if (props.tool === 'shapeDraw'){
      isDrawing = true
      ev.preventDefault(); ev.stopPropagation()
      drawing = { x0:x, y0:y }
      graph.container?.classList.add('is-drawing')
    } else if (props.tool === 'pen'){
      ev.preventDefault(); ev.stopPropagation()
      const es = props.edgeStyle || {}
      if (!penEdge){
        penPoints = [{ x, y }]
        penEdge = graph.addEdge({ source:{ x, y }, target:{ x, y }, vertices: [], ...styleForEdge(es), connector:{ name: es.type==='curved'?'smooth':'normal' }, router:{ name: es.type==='curved'?'normal':'orth' } })
      } else {
        // adicionar vértice
        penPoints.push({ x, y })
        penEdge.setVertices(penPoints.slice(1, penPoints.length-0))
      }
    }
  })
  dom.addEventListener('mousemove', (ev) => {
    if (!drawing) return
    if (isDrawing){ ev.preventDefault(); ev.stopPropagation() }
    const p = graph.clientToLocal({ x: ev.clientX, y: ev.clientY })
    const x = p.x, y = p.y
    if (props.tool === 'freehand'){
      points.push({x,y})
      const d = toPath(points)
      ;(drawing as any).setAttrs({ body: { d } })
    } else if (props.tool === 'shapeDraw'){
      // opcional: preview ignorado para simplicidade
    }
  })
  dom.addEventListener('mouseup', (ev) => {
    if (!drawing) return
    if (isDrawing){ ev.preventDefault(); ev.stopPropagation() }
    const p = graph.clientToLocal({ x: ev.clientX, y: ev.clientY })
    const x = p.x, y = p.y
    if (props.tool === 'freehand'){
          emitChange(); drawing = null; points = []; isDrawing = false; graph.container?.classList.remove('is-drawing')
    } else if (props.tool === 'line'){
          const es = props.edgeStyle || {}
          // Shift: restringir a 0/45/90 graus
          const dx = x - drawing.x0, dy = y - drawing.y0
          const angle = Math.atan2(dy, dx)
          const inc = Math.PI/4
          const snapped = (ev.shiftKey) ? Math.round(angle/inc)*inc : angle
          const len = Math.hypot(dx, dy)
          const tx = drawing.x0 + Math.cos(snapped)*len
          const ty = drawing.y0 + Math.sin(snapped)*len
          graph.addEdge({ source:{ x: drawing.x0, y: drawing.y0 }, target:{ x: tx, y: ty }, ...styleForEdge(es), connector:{ name: es.type==='curved'?'smooth':'normal' }, router:{ name: es.type==='curved'?'normal':'orth' } })
          emitChange(); drawing = null; points = []; isDrawing = false; graph.container?.classList.remove('is-drawing')
    } else if (props.tool === 'shapeDraw'){
          // criar nó conforme arrasto (Shift para manter proporção)
          const x0 = drawing.x0 as number, y0 = drawing.y0 as number
          let left = Math.min(x0, x), top = Math.min(y0, y)
          let w = Math.max(20, Math.abs(x - x0)), h = Math.max(20, Math.abs(y - y0))
          if (ev.shiftKey){ const s = Math.min(w,h); w = s; h = s; if (x < x0) left = x0 - s; if (y < y0) top = y0 - s }
          const ns = props.nodeStyle || {}
          const fill = ns.fill ?? '#ffffff'
          const stroke = ns.stroke ?? '#cbd5e1'
          const label = 'Forma'
          let node:any
          if ((ns.shape ?? 'rect') === 'ellipse'){
            node = graph.addNode({ shape:'ellipse', x:left, y:top, width:w, height:h, attrs:{ body:{ fill, stroke }, label:{ text: label, fontSize: ns.fontSize ?? 14, fill: ns.textColor ?? '#0b0f13', fontFamily: ns.fontFamily ?? 'Inter, system-ui, sans-serif' } }, markup:[{ tagName:'ellipse', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] })
          } else if ((ns.shape ?? 'rect') === 'diamond'){
            node = graph.addNode({ shape:'polygon', x:left, y:top, width:w, height:h, attrs:{ body:{ fill, stroke, refPoints:'0,50 50,0 100,50 50,100' }, label:{ text: label, fontSize: ns.fontSize ?? 14, fill: ns.textColor ?? '#0b0f13', fontFamily: ns.fontFamily ?? 'Inter, system-ui, sans-serif' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] })
          } else {
            node = graph.addNode({ shape:'rect', x:left, y:top, width:w, height:h, attrs:{ body:{ fill, stroke, rx: 10, ry: 10 }, label:{ text: label, fontSize: ns.fontSize ?? 14, fill: ns.textColor ?? '#0b0f13', fontFamily: ns.fontFamily ?? 'Inter, system-ui, sans-serif' } }, markup:[{ tagName:'rect', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] })
          }
          ;(graph as any).cleanSelection?.(); graph.select(node)
          emitChange(); drawing = null; points = []; isDrawing = false; graph.container?.classList.remove('is-drawing')
    }
  })
      dom.addEventListener('mouseleave', () => {
        // garantir limpeza de estado ao sair da área
        if (drawing || isDrawing){ drawing = null; points = []; isDrawing = false; graph.container?.classList.remove('is-drawing') }
      })
  setupToolBehavior()
})

// suportar drop de formas a partir do painel lateral
onMounted(() => {
  const dom = graph.container!
  dom.addEventListener('dragover', (ev) => {
    const hasShape = !!ev.dataTransfer?.types.includes('application/x-mm-shape')
    const items = ev.dataTransfer?.items
    const hasImage = items ? Array.from(items as DataTransferItemList).some((i: DataTransferItem)=> i.kind==='file' && i.type.startsWith('image/')) : false
    if (hasShape || hasImage){ ev.preventDefault(); ev.dataTransfer!.dropEffect = 'copy' }
  })
  dom.addEventListener('drop', (ev) => {
    const data = ev.dataTransfer?.getData('application/x-mm-shape')
    if (data){
      ev.preventDefault()
      const p = graph.clientToLocal({ x: ev.clientX, y: ev.clientY })
      const { shape } = JSON.parse(data)
      createPresetShape(shape, p.x, p.y)
      return
    }
    // imagens
    const items = ev.dataTransfer?.items as DataTransferItemList | undefined
    if (items){
      const arr = Array.from(items)
      const fileItem = arr.find((i)=> i.kind==='file' && i.type.startsWith('image/')) as DataTransferItem | undefined
      if (fileItem){
        ev.preventDefault()
        const file = fileItem.getAsFile?.()
        if (file){
          const reader = new FileReader()
          const cx = ev.clientX, cy = ev.clientY
          reader.onload = () => {
            const p = graph.clientToLocal({ x: cx, y: cy })
            addImageAt(p.x, p.y, reader.result as string)
          }
          reader.readAsDataURL(file)
        }
      }
    }
  })

})

function createPresetShape(shape:string, x:number, y:number){
  const ns = props.nodeStyle || {}
  const fill = ns.fill ?? '#ffffff'
  const stroke = ns.stroke ?? '#1f2937'
  const common = { x, y, width: 140, height: 60 }
  let node:any
  switch(shape){
  case 'rect': node = graph.addNode({ shape:'rect', ...common, attrs:{ body:{ fill, stroke, rx: 0, ry: 0 }, label:{ text:'Retângulo' } }, markup:[{ tagName:'rect', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'rounded': node = graph.addNode({ shape:'rect', ...common, attrs:{ body:{ fill, stroke, rx: 12, ry: 12 }, label:{ text:'Arredondado' } }, markup:[{ tagName:'rect', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'ellipse': node = graph.addNode({ shape:'ellipse', ...common, attrs:{ body:{ fill, stroke }, label:{ text:'Elipse' } }, markup:[{ tagName:'ellipse', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'diamond': node = graph.addNode({ shape:'polygon', ...common, attrs:{ body:{ fill, stroke, refPoints:'0,50 50,0 100,50 50,100' }, label:{ text:'Losango' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'triangle': node = graph.addNode({ shape:'polygon', ...common, attrs:{ body:{ fill, stroke, refPoints:'0,100 50,0 100,100' }, label:{ text:'Triângulo' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'hexagon': node = graph.addNode({ shape:'polygon', ...common, attrs:{ body:{ fill, stroke, refPoints:'25,0 75,0 100,50 75,100 25,100 0,50' }, label:{ text:'Hexágono' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'star': node = graph.addNode({ shape:'polygon', ...common, attrs:{ body:{ fill, stroke, refPoints:'50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35' }, label:{ text:'Estrela' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'cloud': node = graph.addNode({ shape:'path', ...common, attrs:{ body:{ d:'M40 20c10-15 40-15 50 0 15-10 35-5 40 10 20 0 25 20 10 30 5 20-20 30-35 20-10 10-40 10-50 0-20 10-45-5-35-25-20-15-5-40 20-35 0-10 10-10 10 0z', fill, stroke }, label:{ text:'Nuvem' } }, markup:[{ tagName:'path', selector:'body', attrs:{ magnet:'true' } },{ tagName:'text', selector:'label' }] } as any); break
  case 'parallelogram': node = graph.addNode({ shape:'polygon', ...common, attrs:{ body:{ fill, stroke, refPoints:'20,0 100,0 80,100 0,100' }, label:{ text:'Paralelogr.' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  case 'arrowRight': node = graph.addNode({ shape:'polygon', ...common, attrs:{ body:{ fill, stroke, refPoints:'0,30 80,30 80,10 140,50 80,90 80,70 0,70' }, label:{ text:'' } }, markup:[{ tagName:'polygon', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any); break
  default: node = graph.addNode({ shape:'rect', ...common, attrs:{ body:{ fill, stroke }, label:{ text:shape } }, markup:[{ tagName:'rect', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' }] } as any)
  }
  if (props.tool === 'select') graph.select(node); emitChange()
}

onBeforeUnmount(() => { graph?.dispose() })

watch(() => props.tool, () => setupToolBehavior())
watch(() => props.edgeStyle, () => {
  // aplicar estilo aos edges selecionados; futuros edges usam defaultEdgeAttrs
  const sel = graph.getSelectedCells().filter(c => c.isEdge())
  const def = defaultEdgeAttrs() as any
  sel.forEach((e:any) => {
    e.setAttrs(def.attrs)
    // aplicar conector e roteador conforme tipo
    const t = props.edgeStyle?.type === 'curved' ? 'smooth' : 'normal'
  const r = props.edgeStyle?.type === 'curved' ? 'normal' : 'orth'
    e.setConnector({ name: t })
    e.setRouter({ name: r })
  })
})
watch(() => props.nodeStyle, () => {
  const sel = graph.getSelectedCells().filter(c => c.isNode())
  const ns = props.nodeStyle || {}
  sel.forEach((n:any) => {
    n.setAttrs({
  body: { fill: ns.fill ?? undefined, stroke: ns.stroke ?? undefined },
  label: { fontSize: ns.fontSize ?? undefined, fill: ns.textColor ?? undefined, fontFamily: ns.fontFamily ?? undefined }
    })
  })
})

// API compatível com EditorCanvas
function getData(){ return graph?.toJSON() }
function setData(data:any){
  if (!graph) return
  try {
    if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)){
      // Migrar legado para X6
      const cells:any[] = []
      ;(data.nodes as any[]).forEach((n:any) => cells.push({
        id: n.id,
        shape: 'rect',
        x: (n.x ?? 0) - 80,
        y: (n.y ?? 0) - 30,
        width: 160,
        height: 60,
        attrs: { body: { fill: '#ffffff', stroke: '#cbd5e1', rx: 10, ry: 10 }, label: { text: n.label || 'Nó', fontSize: 14, fill: '#0b0f13', fontFamily: 'Inter, system-ui, sans-serif' } },
  markup: [ { tagName:'rect', selector:'body', attrs:{ magnet:'true' } }, { tagName:'text', selector:'label' } ]
      }))
      ;(data.edges as any[]).forEach((e:any, idx:number) => cells.push({
        id: `e${idx}_${e.a}_${e.b}`,
        shape: 'edge',
        source: { cell: e.a },
        target: { cell: e.b },
        attrs: { line: { stroke: '#475569', strokeWidth: 2, targetMarker: { name:'block', width:12, height:8, offset:2 }, sourceMarker: null, strokeDasharray: 0, strokeLinecap:'round' } },
        connector: { name: 'normal' },
        router: { name: 'orth' }
      }))
      graph.fromJSON({ cells })
    } else {
      graph.fromJSON(data)
    }
    ;(graph as any).cleanSelection?.();
    emitChange()
  } catch (e) {
    console.error('setData failed', e)
  }
}
function undo(){ (graph as any).undo?.() }
function redo(){ (graph as any).redo?.() }

function styleForEdge(s:EdgeStyle){
  const color = s.color ?? '#475569'
  const width = s.width ?? 2
  const dashed = s.dashed ? 6 : 0
  const arrow = s.arrow !== false
  return {
    attrs: { line: { stroke: color, strokeWidth: width, targetMarker: arrow ? { name:'block', width:12, height:8, offset:2 } : null, sourceMarker: null, strokeDasharray: dashed ? 6 : 0, strokeLinecap:'round' } },
  }
}

function createPresetShapeCentered(shape:string){
  const bbox = graph.container!.getBoundingClientRect()
  createPresetShape(shape, bbox.width/2, bbox.height/2)
}
function addImageAt(x:number, y:number, src:string, w=200, h=140){
  try {
    // usar shape 'image' quando disponível
    const node:any = graph.addNode({ shape:'image', x, y, width:w, height:h, imageUrl: src, attrs:{ body:{ stroke:'#cbd5e1', fill:'#fff' } } })
    // fallback: se 'image' não aplicar, garantir magnet pela borda
  node.attr?.('body/magnet', 'true')
    emitChange()
    return node
  } catch {
    // fallback com markup custom
  const node:any = graph.addNode({ x, y, width:w, height:h, attrs:{}, markup:[{ tagName:'rect', selector:'body', attrs:{ fill:'#fff', stroke:'#cbd5e1', magnet:'true' } }, { tagName:'image', selector:'img', attrs:{ 'xlink:href': src, width:w, height:h, x:0, y:0, preserveAspectRatio: 'xMidYMid meet' } }] })
    emitChange(); return node
  }
}
defineExpose({ getData, setData, addNodeAtCenter, createPresetShapeCentered, addImageAt, align, distribute, toFront, toBack, rotateSelected, setLabelStyle, exportPNG, exportSVG, undo, redo })

// Utilitários de "layout" ao estilo Illustrator/Corel
function selNodes(){ return graph.getSelectedCells().filter(c=>c.isNode()) as any[] }
function bboxOf(node:any){ const b=node.getBBox(); return { x:b.x, y:b.y, w:b.width, h:b.height, cx:b.x + b.width/2, cy:b.y + b.height/2 } }
function align(direction:'left'|'centerX'|'right'|'top'|'middle'|'bottom'){
  const nodes = selNodes(); if (nodes.length < 2) return
  const boxes = nodes.map(n=>({ n, ...bboxOf(n) }))
  const minX = Math.min(...boxes.map(b=>b.x))
  const maxX = Math.max(...boxes.map(b=>b.x + b.w))
  const minY = Math.min(...boxes.map(b=>b.y))
  const maxY = Math.max(...boxes.map(b=>b.y + b.h))
  const cx = (minX + maxX)/2
  const cy = (minY + maxY)/2
  boxes.forEach(b => {
    if (direction==='left') b.n.position(minX, b.y)
    if (direction==='right') b.n.position(maxX - b.w, b.y)
    if (direction==='centerX') b.n.position(cx - b.w/2, b.y)
    if (direction==='top') b.n.position(b.x, minY)
    if (direction==='bottom') b.n.position(b.x, maxY - b.h)
    if (direction==='middle') b.n.position(b.x, cy - b.h/2)
  })
  emitChange()
}
function distribute(axis:'x'|'y'){
  const nodes = selNodes(); if (nodes.length < 3) return
  const boxes = nodes.map(n=>({ n, ...bboxOf(n) }))
  if (axis==='x'){
    boxes.sort((a,b)=>a.x - b.x)
    const min = boxes[0].x
    const max = boxes[boxes.length-1].x + boxes[boxes.length-1].w
    const totalWidth = boxes.reduce((s,b)=> s + b.w, 0)
    const gap = (max - min - totalWidth) / (boxes.length - 1)
    let cur = min
    boxes.forEach((b,i)=>{ b.n.position(cur, b.y); cur += b.w + gap })
  } else {
    boxes.sort((a,b)=>a.y - b.y)
    const min = boxes[0].y
    const max = boxes[boxes.length-1].y + boxes[boxes.length-1].h
    const totalHeight = boxes.reduce((s,b)=> s + b.h, 0)
    const gap = (max - min - totalHeight) / (boxes.length - 1)
    let cur = min
    boxes.forEach((b,i)=>{ b.n.position(b.x, cur); cur += b.h + gap })
  }
  emitChange()
}
function toFront(){ selNodes().forEach(n=> n.toFront()) }
function toBack(){ selNodes().forEach(n=> n.toBack()) }
function rotateSelected(delta:number){ selNodes().forEach(n=> n.rotate(delta)) }
function setLabelStyle(style:{ fontFamily?: string; fontSize?: number; fontWeight?: number|string; color?: string }){
  selNodes().forEach(n=> n.setAttrs({ label: { fontFamily: style.fontFamily ?? undefined, fontSize: style.fontSize ?? undefined, fontWeight: style.fontWeight ?? undefined, fill: style.color ?? undefined } }))
}
// terminar/cancelar ferramenta caneta
window.addEventListener('keydown', (e:KeyboardEvent) => {
  if (!graph) return
  if (props.tool !== 'pen') return
  if (e.key === 'Enter' && penEdge){ penEdge = null; penPoints = []; }
  if (e.key === 'Escape' && penEdge){ try { graph.removeCell(penEdge) } catch {}; penEdge = null; penPoints = [] }
})
async function exportPNG(){ await (graph as any).exportPNG('mindmap.png', { backgroundColor: '#ffffff' }) }
async function exportSVG(){
  try {
    // usar plugin Export (graph.exportSVG) ao invés de toSVG direto (evita TypeError t is not a function)
    const svg = await (graph as any).exportSVG({ preserveDimensions: true })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url; a.download='mindmap.svg'; a.click(); URL.revokeObjectURL(url)
  } catch (e) {
    // fallback para toSVG caso exportSVG não exista
    try {
      const svg = await (graph as any).toSVG()
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download='mindmap.svg'; a.click(); URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
  }
}

// exposição já feita acima (getData/setData e utilitários)
</script>

<style scoped>
.x6-wrap { flex: 1 1 auto; min-height: 0; display: flex; }
/* aumentar a área de desenho: mais alta, aproveitando viewport */
.x6-container { width: 100%; height: 82vh; min-height: 560px; max-height: 90vh; background: #fff; border-bottom-left-radius: .375rem; border-bottom-right-radius: .375rem; }
.x6-container.is-drawing { user-select: none; }
</style>
