<template>
  <div class="editor" ref="wrap">
    <canvas ref="canvas"
            @dblclick="onDblClick"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseLeave"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, defineExpose } from 'vue'

type Node = { id: string; x: number; y: number; label: string }
type Edge = { a: string; b: string }

const props = defineProps<{
  tool: 'select' | 'node' | 'edge',
  nodeStyle?: { fill?: string; icon?: string },
  edgeStyle?: { type?: 'straight'|'curved'; dashed?: boolean; color?: string; width?: number; arrow?: boolean }
}>()

const wrap = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const nodes = ref<Node[]>([{ id: 'root', x: 400, y: 250, label: 'Mapa' }])
const edges = ref<Edge[]>([])

// seleção
const selectedNodeId = ref<string | null>(null)
const selectedEdgeIndex = ref<number | null>(null)

let raf = 0
let draggingNodeId: string | null = null
let connectingFromId: string | null = null
let previewXY: { x: number; y: number } | null = null

function dprResize() {
  const c = canvas.value!, w = wrap.value!
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const rect = w.getBoundingClientRect()
  c.style.width = rect.width + 'px'
  c.style.height = (rect.height) + 'px'
  c.width = Math.floor(rect.width * dpr)
  c.height = Math.floor(rect.height * dpr)
  const _ctx = c.getContext('2d')!
  _ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.value = _ctx
}

function render() {
  const c = canvas.value!, _ctx = ctx.value!
  _ctx.clearRect(0, 0, c.width, c.height)
  // edges
  for (let i=0;i<edges.value.length;i++) {
    const e = edges.value[i]
    const a = nodes.value.find(n => n.id === e.a)
    const b = nodes.value.find(n => n.id === e.b)
    if (!a || !b) continue
    const highlighted = selectedEdgeIndex.value === i
    drawStyledEdge(a.x, a.y, b.x, b.y, highlighted)
  }
  // preview
  if (connectingFromId && previewXY) {
    const a = nodes.value.find(n => n.id === connectingFromId)
    if (a) drawEdge(a.x, a.y, previewXY.x, previewXY.y, '#9ca3af', 2, [6, 6])
  }
  // nodes
  for (const n of nodes.value) drawNode(n)
}

function drawEdge(x1:number, y1:number, x2:number, y2:number, color:string, w=2, dash:number[]=[]){
  const _ctx = ctx.value!
  _ctx.save()
  _ctx.strokeStyle = color
  _ctx.lineWidth = w
  _ctx.setLineDash(dash)
  _ctx.beginPath()
  _ctx.moveTo(x1, y1)
  _ctx.lineTo(x2, y2)
  _ctx.stroke()
  _ctx.restore()
}

function drawStyledEdge(x1:number,y1:number,x2:number,y2:number, highlighted=false){
  const st = {
    type: props.edgeStyle?.type ?? 'straight',
    dashed: props.edgeStyle?.dashed ?? false,
    color: props.edgeStyle?.color ?? '#475569',
    width: props.edgeStyle?.width ?? 2,
    arrow: props.edgeStyle?.arrow ?? true,
  }
  const _ctx = ctx.value!
  _ctx.save()
  _ctx.strokeStyle = highlighted ? '#2563eb' : st.color
  _ctx.lineWidth = highlighted ? (st.width + 2) : st.width
  _ctx.setLineDash(st.dashed ? [10, 6] : [])
  _ctx.beginPath()
  if (st.type === 'curved'){
    const mx=(x1+x2)/2, my=(y1+y2)/2
    const dx=x2-x1, dy=y2-y1
    const len=Math.hypot(dx,dy)||1
    const nx=-dy/len, ny=dx/len
    const k=60
    const cx=mx+nx*k, cy=my+ny*k
    _ctx.moveTo(x1,y1)
    _ctx.quadraticCurveTo(cx,cy,x2,y2)
    _ctx.stroke()
    if (st.arrow) drawArrowheadQuadratic(x1,y1,cx,cy,x2,y2, st)
  } else {
    _ctx.moveTo(x1,y1)
    _ctx.lineTo(x2,y2)
    _ctx.stroke()
    if (st.arrow) drawArrowhead(x1,y1,x2,y2, st)
  }
  _ctx.restore()
}

function drawArrowhead(x1:number,y1:number,x2:number,y2:number, st:{color:string;width:number}){
  const _ctx = ctx.value!
  const ang=Math.atan2(y2-y1,x2-x1)
  const size=8+(st.width||2)
  _ctx.save()
  _ctx.fillStyle=st.color
  _ctx.setLineDash([])
  _ctx.beginPath()
  _ctx.moveTo(x2,y2)
  _ctx.lineTo(x2 - size*Math.cos(ang-Math.PI/6), y2 - size*Math.sin(ang-Math.PI/6))
  _ctx.lineTo(x2 - size*Math.cos(ang+Math.PI/6), y2 - size*Math.sin(ang+Math.PI/6))
  _ctx.closePath()
  _ctx.fill()
  _ctx.restore()
}
function drawArrowheadQuadratic(x1:number,y1:number,cx:number,cy:number,x2:number,y2:number, st:{color:string;width:number}){
  const t=0.98
  const dx=2*(1-t)*(cx-x1)+2*t*(x2-cx)
  const dy=2*(1-t)*(cy-y1)+2*t*(y2-cy)
  drawArrowhead(x2-dx,y2-dy,x2,y2, st)
}

function drawNode(n: Node){
  const _ctx = ctx.value!
  _ctx.save()
  _ctx.fillStyle = props.nodeStyle?.fill || '#fff'
  const isSel = selectedNodeId.value === n.id
  _ctx.strokeStyle = isSel ? '#2563eb' : 'rgba(0,0,0,.15)'
  _ctx.lineWidth = isSel ? 3 : 2
  const r = 28
  _ctx.beginPath()
  _ctx.arc(n.x, n.y, r, 0, Math.PI*2)
  _ctx.fill()
  _ctx.stroke()
  // ícone
  if (props.nodeStyle?.icon){
    _ctx.fillStyle = '#0b0f13'
    _ctx.font = '16px system-ui, sans-serif'
    _ctx.textAlign = 'center'
    _ctx.textBaseline = 'bottom'
    _ctx.fillText(props.nodeStyle.icon, n.x, n.y-2)
  }
  // texto
  _ctx.fillStyle = '#0b0f13'
  _ctx.font = '500 12px system-ui, sans-serif'
  _ctx.textAlign = 'center'
  _ctx.textBaseline = 'top'
  _ctx.fillText(n.label || 'Nó', n.x, n.y+2)
  _ctx.restore()
}

function toCanvasXY(ev: MouseEvent){
  const c = canvas.value!, rect = c.getBoundingClientRect()
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
  const x = (ev.clientX - rect.left) * (c.width / rect.width) / dpr
  const y = (ev.clientY - rect.top) * (c.height / rect.height) / dpr
  return { x, y }
}

function hitNode(x:number, y:number){
  for (let i = nodes.value.length-1; i>=0; i--) {
    const n = nodes.value[i]
    const dx = x - n.x, dy = y - n.y
    if (Math.hypot(dx, dy) <= 28) return n
  }
  return null
}

function distPointToSegment(px:number, py:number, x1:number, y1:number, x2:number, y2:number){
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  const dot = A * C + B * D
  const len_sq = C * C + D * D
  let t = len_sq !== 0 ? dot / len_sq : -1
  t = Math.max(0, Math.min(1, t))
  const xx = x1 + t * C
  const yy = y1 + t * D
  const dx = px - xx
  const dy = py - yy
  return Math.hypot(dx, dy)
}

function hitEdge(x:number, y:number){
  const threshold = 8
  for (let i=edges.value.length-1;i>=0;i--){
    const e = edges.value[i]
    const a = nodes.value.find(n=>n.id===e.a)
    const b = nodes.value.find(n=>n.id===e.b)
    if (!a||!b) continue
    const d = distPointToSegment(x,y,a.x,a.y,b.x,b.y)
    if (d <= threshold) return i
  }
  return null
}

function onDblClick(ev: MouseEvent){
  const { x, y } = toCanvasXY(ev)
  addNode(x, y)
}

function onMouseDown(ev: MouseEvent){
  const { x, y } = toCanvasXY(ev)
  const n = hitNode(x, y)
  if (props.tool === 'node') { addNode(x, y); return }
  if (props.tool === 'edge') {
    if (n) { connectingFromId = n.id; previewXY = { x, y }; render() }
    return
  }
  if (props.tool === 'select') {
    // tentar nó primeiro
    if (n) {
      draggingNodeId = n.id
      selectedNodeId.value = n.id
      selectedEdgeIndex.value = null
      emitSelection()
      render()
      return
    }
    // tentar aresta
    const ei = hitEdge(x, y)
    if (ei !== null){
      selectedEdgeIndex.value = ei
      selectedNodeId.value = null
      emitSelection()
      render()
      return
    }
    // clicar vazio limpa seleção
    if (!n){
      selectedNodeId.value = null
      selectedEdgeIndex.value = null
      emitSelection()
      render()
    }
  }
}

function onMouseMove(ev: MouseEvent){
  const { x, y } = toCanvasXY(ev)
  if (draggingNodeId){ const n = nodes.value.find(n => n.id === draggingNodeId)!; n.x = x; n.y = y; render() }
  if (connectingFromId){ previewXY = { x, y }; render() }
}

function onMouseUp(ev: MouseEvent){
  const { x, y } = toCanvasXY(ev)
  if (draggingNodeId){ draggingNodeId = null; emitChange() }
  if (connectingFromId){ const target = hitNode(x, y); if (target && target.id !== connectingFromId){ edges.value.push({ a: connectingFromId, b: target.id }); emitChange() } connectingFromId = null; previewXY = null; render() }
}

function onMouseLeave(){ onMouseUp(new MouseEvent('mouseup')) }

function addNode(x:number, y:number){
  const id = 'n' + Math.random().toString(36).slice(2, 7)
  nodes.value.push({ id, x, y, label: 'Novo nó' })
  selectedNodeId.value = id
  selectedEdgeIndex.value = null
  render()
  emitChange();
  emitSelection();
}

// Expor API para o pai (persistência)
function getData(){ return { nodes: nodes.value, edges: edges.value } }
function setData(data:{nodes:Node[];edges:Edge[]}){ nodes.value = data?.nodes?.length? JSON.parse(JSON.stringify(data.nodes)): nodes.value; edges.value = data?.edges?.length? JSON.parse(JSON.stringify(data.edges)): edges.value; render() }
defineExpose({ getData, setData })

// comunicar com o pai
const emit = defineEmits<{ (e:'data-change', data:{nodes:Node[];edges:Edge[]}) : void; (e:'selection-change', payload:{ nodeId:string|null; edgeIndex:number|null }): void }>()
function emitChange(){ emit('data-change', getData()) }
function emitSelection(){ emit('selection-change', { nodeId: selectedNodeId.value, edgeIndex: selectedEdgeIndex.value }) }

function onKeyDown(ev: KeyboardEvent){
  if (ev.key === 'Delete' || ev.key === 'Backspace'){
    if (selectedNodeId.value){
      const id = selectedNodeId.value
      // remove arestas ligadas
      edges.value = edges.value.filter(e => e.a !== id && e.b !== id)
      // remove nó
      nodes.value = nodes.value.filter(n => n.id !== id)
      selectedNodeId.value = null
      emitChange(); emitSelection(); render()
    } else if (selectedEdgeIndex.value !== null){
      const i = selectedEdgeIndex.value
      edges.value.splice(i,1)
      selectedEdgeIndex.value = null
      emitChange(); emitSelection(); render()
    }
  }
}

onMounted(() => {
  const c = canvas.value!
  const w = wrap.value!
  const ro = new ResizeObserver(() => { dprResize(); render() })
  ro.observe(w)
  dprResize(); render()
  const loop = () => { raf = requestAnimationFrame(loop) }
  raf = requestAnimationFrame(loop)
  window.addEventListener('keydown', onKeyDown)
  onBeforeUnmount(() => { ro.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('keydown', onKeyDown) })
})

watch(() => props.tool, () => { /* could change cursor */ })
</script>

<style scoped>
.editor { flex: 1 1 auto; display: flex; min-height: 0; }
canvas { width: 100%; height: calc(100vh - 48px); display: block; background: #fff; }
</style>
