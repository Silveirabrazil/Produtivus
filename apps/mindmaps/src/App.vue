<template>
  <div class="app">
    <header class="app-bar">
      <div class="app-left">
        <strong class="app-title">Mapas Mentais</strong>
        <!-- Abas de mapas abertos -->
        <nav class="tabs" aria-label="Mapas abertos">
    <button v-for="mid in nb.openTabs" :key="mid"
        class="tab"
        :data-id="mid"
        :data-active="mid === nb.activeId"
        @click="activate(mid)">
      <span v-if="editingTabId !== mid"
        class="tab-title"
        @dblclick.stop.prevent="startRenameTab(mid)">{{ nb.maps[mid]?.title || 'Mapa' }}</span>
      <input v-else
         class="tab-input"
         type="text"
         v-model="tempTabTitle"
         @keydown.enter.prevent="commitRenameTab()"
         @keydown.esc.prevent="cancelRenameTab()"
         @blur="commitRenameTab()"
         />
      <span v-show="editingTabId !== mid" class="tab-close" role="button" aria-label="Fechar"
        @click.stop="closeTab(mid)">✕</span>
    </button>
        <button class="tab add" @click="addMap()" title="Novo mapa">+</button>
        </nav>
      </div>

      <!-- Menubar existente (centro) -->
      <nav class="mm-menubar me-2 app-center" role="menubar" aria-label="Menu">
        <div class="mm-menu" role="none">
          <button class="mm-menu-btn btn btn-sm btn-outline-secondary" role="menuitem" aria-haspopup="true" aria-expanded="false">Ferramentas</button>
          <div class="mm-menu-dropdown" role="menu">
            <div class="mm-menu-section">Modo</div>
            <button role="menuitem" class="mm-menu-item" @click="setTool('select')"><span class="material-symbols-outlined">select_all</span> Seleção</button>
            <button role="menuitem" class="mm-menu-item" @click="setTool('node')"><span class="material-symbols-outlined">add_box</span> Nó</button>
            <button role="menuitem" class="mm-menu-item" @click="setTool('edge')"><span class="material-symbols-outlined">timeline</span> Ligação</button>
            <button role="menuitem" class="mm-menu-item" @click="setTool('text')"><span class="material-symbols-outlined">title</span> Texto</button>
            <button role="menuitem" class="mm-menu-item" @click="setTool('freehand')"><span class="material-symbols-outlined">draw</span> Lápis</button>
            <button role="menuitem" class="mm-menu-item" @click="setTool('line')"><span class="material-symbols-outlined">show_chart</span> Linha</button>
            <button role="menuitem" class="mm-menu-item" @click="setTool('bucket')"><span class="material-symbols-outlined">format_color_fill</span> Balde</button>
          </div>
        </div>
        <div class="mm-menu" role="none">
          <button class="mm-menu-btn btn btn-sm btn-outline-secondary" role="menuitem" aria-haspopup="true" aria-expanded="false">Editar</button>
          <div class="mm-menu-dropdown" role="menu">
            <div class="mm-menu-section">Editar</div>
            <button role="menuitem" class="mm-menu-item" @click="undo"><span class="material-symbols-outlined">undo</span> Desfazer</button>
            <button role="menuitem" class="mm-menu-item" @click="redo"><span class="material-symbols-outlined">redo</span> Refazer</button>
            <div class="mm-menu-sep" role="separator"></div>
            <button role="menuitem" class="mm-menu-item" @click="align('left')"><span class="material-symbols-outlined">format_align_left</span> Alinhar à esquerda</button>
            <button role="menuitem" class="mm-menu-item" @click="align('centerX')"><span class="material-symbols-outlined">format_align_center</span> Alinhar ao centro</button>
            <button role="menuitem" class="mm-menu-item" @click="align('right')"><span class="material-symbols-outlined">format_align_right</span> Alinhar à direita</button>
            <button role="menuitem" class="mm-menu-item" @click="align('top')"><span class="material-symbols-outlined">vertical_align_top</span> Alinhar ao topo</button>
            <button role="menuitem" class="mm-menu-item" @click="align('middle')"><span class="material-symbols-outlined">vertical_align_center</span> Alinhar ao meio</button>
            <button role="menuitem" class="mm-menu-item" @click="align('bottom')"><span class="material-symbols-outlined">vertical_align_bottom</span> Alinhar à base</button>
            <button role="menuitem" class="mm-menu-item" @click="distribute('x')"><span class="material-symbols-outlined">horizontal_distribute</span> Distribuir horizontal</button>
            <button role="menuitem" class="mm-menu-item" @click="distribute('y')"><span class="material-symbols-outlined">vertical_distribute</span> Distribuir vertical</button>
            <div class="mm-menu-sep" role="separator"></div>
            <button role="menuitem" class="mm-menu-item" @click="toFront"><span class="material-symbols-outlined">flip_to_front</span> Trazer p/ frente</button>
            <button role="menuitem" class="mm-menu-item" @click="toBack"><span class="material-symbols-outlined">flip_to_back</span> Enviar p/ trás</button>
            <button role="menuitem" class="mm-menu-item" @click="rotate(+15)"><span class="material-symbols-outlined">rotate_right</span> Rotacionar +15º</button>
            <button role="menuitem" class="mm-menu-item" @click="rotate(-15)"><span class="material-symbols-outlined">rotate_left</span> Rotacionar -15º</button>
          </div>
        </div>
        <!-- Estilo: painel compacto de configurações de Nó e Aresta -->
        <div class="mm-menu" role="none">
          <button class="mm-menu-btn btn btn-sm btn-outline-secondary" role="menuitem" aria-haspopup="true" aria-expanded="false">Estilo</button>
          <div class="mm-menu-dropdown" role="menu">
            <div class="mm-menu-section">Nó</div>
            <div class="mb-2 d-flex align-items-center gap-2">
              <label class="form-label me-2" style="min-width:80px">Forma</label>
              <select class="form-select form-select-sm" v-model="nodeStyle.shape" style="flex:1 1 auto">
                <option value="rect">Retângulo</option>
                <option value="ellipse">Elipse</option>
                <option value="diamond">Losango</option>
              </select>
            </div>
            <div class="mb-2 d-flex align-items-center gap-2">
              <label class="form-label me-2" style="min-width:80px">Preench.</label>
              <input class="form-control form-control-color" type="color" v-model="nodeStyle.fill" />
              <label class="form-label ms-3 me-2" style="min-width:60px">Borda</label>
              <input class="form-control form-control-color" type="color" v-model="nodeStyle.stroke" />
            </div>
            <div class="mb-2 d-flex align-items-center gap-2">
              <label class="form-label me-2" style="min-width:80px">Texto</label>
              <input class="form-control form-control-color" type="color" v-model="nodeStyle.textColor" />
              <label class="form-label ms-3 me-2">Tamanho</label>
              <input class="form-control form-control-sm" type="number" min="10" max="72" v-model.number="nodeStyle.fontSize" style="width:80px" />
            </div>
            <div class="mb-2 d-flex align-items-center gap-2">
              <label class="form-label me-2" style="min-width:80px">Fonte</label>
              <select class="form-select form-select-sm" v-model="nodeStyle.fontFamily" style="flex:1 1 auto">
                <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
              </select>
            </div>

            <div class="mm-menu-sep" role="separator"></div>
            <div class="mm-menu-section">Aresta</div>
            <div class="mb-2 d-flex align-items-center gap-2">
              <label class="form-label me-2" style="min-width:80px">Tipo</label>
              <select class="form-select form-select-sm" v-model="edgeStyle.type" style="flex:1 1 auto">
                <option value="straight">Reta</option>
                <option value="curved">Curva</option>
              </select>
            </div>
            <div class="mb-2 d-flex align-items-center gap-3">
              <label class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" v-model="edgeStyle.dashed" />
                <span class="form-check-label">Tracejada</span>
              </label>
              <label class="form-check form-check-inline">
                <input class="form-check-input" type="checkbox" v-model="edgeStyle.arrow" />
                <span class="form-check-label">Seta</span>
              </label>
            </div>
            <div class="mb-2 d-flex align-items-center gap-2">
              <label class="form-label me-2" style="min-width:80px">Cor</label>
              <input class="form-control form-control-color" type="color" v-model="edgeStyle.color" />
              <label class="form-label ms-3 me-2">Espessura</label>
              <input class="form-control form-control-sm" type="number" min="1" max="12" v-model.number="edgeStyle.width" style="width:80px" />
            </div>
          </div>
        </div>
      </nav>

      <div class="app-right">
        <!-- Formas: busca + grade -->
        <details class="mm-dropdown me-2">
          <summary class="btn btn-sm btn-outline-secondary dropdown-toggle">
            <span class="material-symbols-outlined">category</span>
            <span>Formas</span>
          </summary>
          <div class="mm-dropdown-menu p-2">
            <input type="search" class="form-control form-control-sm mb-2" placeholder="Buscar forma..." v-model="shapeFilter" aria-label="Buscar forma" />
            <div class="shape-grid">
              <button v-for="s in filteredShapes" :key="s.key" class="btn btn-outline-secondary shape-tile" draggable="true" @dragstart="onDragShape($event, s.key)" @click="onQuickAddShape(s.key)" :title="s.label">
                <span class="shape-icon" :data-shape="s.key"></span>
                <span class="shape-label">{{ s.label }}</span>
              </button>
            </div>
          </div>
        </details>
        <div class="io">
          <button
            class="icon-btn"
            @click="onQuickAdd"
            title="Adicionar no centro"
          >
            <span class="material-symbols-outlined">my_location</span>
          </button>
          <button class="icon-btn" @click="exportPNG" title="Exportar PNG">
            <span class="material-symbols-outlined">image</span>
          </button>
          <button class="icon-btn" @click="exportSVG" title="Exportar SVG">
            <span class="material-symbols-outlined">format_shapes</span>
          </button>
          <button class="icon-btn" @click="onExport" title="Exportar JSON">
            <span class="material-symbols-outlined">code</span>
          </button>
          <label
            class="import-label"
            title="Importar JSON"
            aria-label="Importar JSON"
            ><span class="material-symbols-outlined">file_upload</span>
            <input
              type="file"
              accept="application/json"
              @change="onImport"
              hidden
          /></label>
        </div>
      </div>
    </header>

    <div class="workspace">
      <!-- Sidebar de grupos e mapas -->
      <aside class="notebook-sidebar">
        <div class="nb-header">
          <span class="nb-title">Cadernos</span>
          <button class="btn btn-sm btn-outline-secondary" @click="addGroup()" title="Novo grupo">+ Grupo</button>
        </div>
        <div class="nb-groups">
          <div v-for="g in nb.groups" :key="g.id" class="nb-group">
            <div class="nb-group-head" :data-id="g.id">
              <span v-if="editingGroupId !== g.id" class="nb-group-title" @dblclick.stop.prevent="startRenameGroup(g.id)">{{ g.title }}</span>
              <input v-else class="nb-group-input" type="text" v-model="tempGroupTitle"
                     @keydown.enter.prevent="commitRenameGroup()"
                     @keydown.esc.prevent="cancelRenameGroup()"
                     @blur="commitRenameGroup()" />
              <button class="btn btn-sm btn-outline-secondary" @click="addMap(g.id)" title="Novo mapa neste grupo">+</button>
            </div>
            <ul class="nb-maps">
              <li v-for="mid in (nb.order[g.id] || [])" :key="mid" class="nb-map-item"
                  :data-id="mid"
                  :data-active="mid === nb.activeId" @click="activate(mid)">
                <span class="material-symbols-outlined">description</span>
                <span v-if="editingMapId !== mid" class="nb-map-title" @dblclick.stop.prevent="startRenameMap(mid)">{{ nb.maps[mid]?.title || 'Mapa' }}</span>
                <input v-else class="nb-map-input" type="text" v-model="tempMapTitle"
                       @keydown.enter.prevent="commitRenameMap()"
                       @keydown.esc.prevent="cancelRenameMap()"
                       @blur="commitRenameMap()" />
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <div class="workspace-main card shadow-sm">
        <X6Editor
          ref="editor"
          :tool="tool"
          :nodeStyle="nodeStyle"
          :edgeStyle="edgeStyle"
          @data-change="onDataChange"
          @selection-change="onSelection"
          @sample-style="onSample"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
// mapa para restaurar dropdowns ao fechar
// Controle de dropdowns flutuantes (position: fixed)
const floatMap = new WeakMap<HTMLElement, { onScroll: () => void }>();
const cleanupStack: Array<() => void> = [];
import X6Editor from "./components/X6Editor.vue";
import { loadCurrent, saveCurrent, loadNotebook, saveNotebook, createGroup, createMap, renameGroup, renameMap } from "./store";

type Tool =
  | "select"
  | "node"
  | "edge"
  | "text"
  | "freehand"
  | "line"
  | "bucket"
  | "eyedropper"
  | "eraser";
const tool = ref<Tool>("select");
const nodeStyle = ref<{
  fill: string;
  stroke: string;
  shape: "rect" | "ellipse" | "diamond";
  fontSize: number;
  textColor: string;
  fontFamily?: string;
}>({
  fill: "#ffffff",
  stroke: "#cbd5e1",
  shape: "rect",
  fontSize: 14,
  textColor: "#0b0f13",
  fontFamily: "Inter, system-ui, sans-serif",
});
const edgeStyle = ref<{
  type: "straight" | "curved";
  dashed: boolean;
  color: string;
  width: number;
  arrow: boolean;
}>({
  type: "straight",
  dashed: false,
  color: "#475569",
  width: 2,
  arrow: true,
});

const editor = ref<any>(null);
const fonts = ref<string[]>([
  "Inter, system-ui, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Calibri, Segoe UI, sans-serif",
  "Trebuchet MS, Tahoma, sans-serif",
  "Georgia, serif",
  "Times New Roman, Times, serif",
  "Garamond, serif",
  "Courier New, monospace",
  "Consolas, monospace",
]);
const shapeList = ref([
  { key: "rect", label: "Retângulo" },
  { key: "rounded", label: "Arredondado" },
  { key: "ellipse", label: "Elipse" },
  { key: "diamond", label: "Losango" },
  { key: "triangle", label: "Triângulo" },
  { key: "hexagon", label: "Hexágono" },
  { key: "star", label: "Estrela" },
  { key: "cloud", label: "Nuvem" },
  { key: "parallelogram", label: "Paralelogr." },
  { key: "arrowRight", label: "Seta →" },
]);

const shapeFilter = ref("");
const filteredShapes = computed(() => {
  const q = shapeFilter.value.trim().toLowerCase();
  if (!q) return shapeList.value;
  return shapeList.value.filter(
    (s) => s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
  );
});

// Dropdown de Formas substitui paleta flutuante

const nb = ref(loadNotebook())

// Renomear abas via duplo clique (inline)
const editingTabId = ref<string | null>(null)
const tempTabTitle = ref<string>("")
function startRenameTab(mapId: string){
  editingTabId.value = mapId
  tempTabTitle.value = nb.value.maps[mapId]?.title || ""
  nextTick(() => {
    try {
      const sel = `.tab[data-id="${CSS.escape(mapId)}"] .tab-input`
      const input = document.querySelector(sel) as HTMLInputElement | null
      input?.focus();
      input?.select();
    } catch {}
  })
}
function commitRenameTab(){
  const id = editingTabId.value
  if (!id) return
  const title = tempTabTitle.value.trim()
  if (title && title !== (nb.value.maps[id]?.title || "")) {
    renameMap(nb.value, id, title)
    nb.value = loadNotebook()
  }
  editingTabId.value = null
  tempTabTitle.value = ""
}
function cancelRenameTab(){
  editingTabId.value = null
  tempTabTitle.value = ""
}

// Renomeação inline: grupos e mapas na sidebar
const editingGroupId = ref<string | null>(null)
const tempGroupTitle = ref<string>("")
const editingMapId = ref<string | null>(null)
const tempMapTitle = ref<string>("")

function startRenameGroup(groupId: string){
  editingMapId.value = null
  editingTabId.value = null
  editingGroupId.value = groupId
  tempGroupTitle.value = nb.value.groups.find(g => g.id === groupId)?.title || ""
  nextTick(() => {
    try {
      const sel = `.nb-group-head[data-id="${CSS.escape(groupId)}"] .nb-group-input`
      const input = document.querySelector(sel) as HTMLInputElement | null
      input?.focus(); input?.select();
    } catch {}
  })
}
function commitRenameGroup(){
  const id = editingGroupId.value
  if (!id) return
  const title = tempGroupTitle.value.trim()
  if (title && title !== (nb.value.groups.find(g => g.id===id)?.title || "")) {
    renameGroup(nb.value, id, title)
    nb.value = loadNotebook()
  }
  editingGroupId.value = null
  tempGroupTitle.value = ""
}
function cancelRenameGroup(){
  editingGroupId.value = null
  tempGroupTitle.value = ""
}

function startRenameMap(mapId: string){
  editingGroupId.value = null
  editingTabId.value = null
  editingMapId.value = mapId
  tempMapTitle.value = nb.value.maps[mapId]?.title || ""
  nextTick(() => {
    try {
      const sel = `.nb-map-item[data-id="${CSS.escape(mapId)}"] .nb-map-input`
      const input = document.querySelector(sel) as HTMLInputElement | null
      input?.focus(); input?.select();
    } catch {}
  })
}
function commitRenameMap(){
  const id = editingMapId.value
  if (!id) return
  const title = tempMapTitle.value.trim()
  if (title && title !== (nb.value.maps[id]?.title || "")) {
    renameMap(nb.value, id, title)
    nb.value = loadNotebook()
  }
  editingMapId.value = null
  tempMapTitle.value = ""
}
function cancelRenameMap(){
  editingMapId.value = null
  tempMapTitle.value = ""
}

// Ações do notebook (abas e grupos)
function activate(mapId: string){
  if (!nb.value.openTabs.includes(mapId)) nb.value.openTabs.push(mapId)
  nb.value.activeId = mapId
  saveNotebook(nb.value)
  const data = nb.value.maps[mapId]?.data
  if (data && editor.value?.setData) editor.value.setData(data)
}
function closeTab(mapId: string){
  nb.value.openTabs = nb.value.openTabs.filter(id => id !== mapId)
  if (nb.value.activeId === mapId) {
    nb.value.activeId = nb.value.openTabs[nb.value.openTabs.length-1] || null
    const next = nb.value.activeId
    const data = next ? nb.value.maps[next]?.data : null
    if (data && editor.value?.setData) editor.value.setData(data)
  }
  saveNotebook(nb.value)
}
function addGroup(){
  createGroup(nb.value, 'Novo grupo')
  nb.value = loadNotebook()
}
function addMap(groupId?: string){
  const gId = groupId || nb.value.groups[0]?.id || createGroup(nb.value, 'Pessoal').id
  createMap(nb.value, gId, 'Novo mapa')
  nb.value = loadNotebook()
}
// removido: prompts substituídos por renomeação inline

onMounted(() => {
  cleanupStack.length = 0;
  const pushCleanup = (fn: () => void) => cleanupStack.push(fn);
  const raw = loadCurrent();
  // Migrar dados legados (nodes/edges) para X6 (cells) se necessário
  const isLegacy = raw && Array.isArray(raw.nodes) && Array.isArray(raw.edges);
  const data = isLegacy ? legacyToX6(raw) : raw;
  editor.value?.setData?.(data);
  if (isLegacy) saveCurrent(data);
  // tentar obter fontes locais (quando suportado)
  const qlf = (window as any).queryLocalFonts;
  if (typeof qlf === "function") {
    // pedir permissao e popular lista (silencioso em navegadores sem suporte)
    qlf()
      .then((list: any[]) => {
        const names = Array.from(new Set(list.map((f) => f.fullName))).slice(
          0,
          200
        );
        if (names.length) fonts.value = [...names, ...fonts.value];
      })
      .catch(() => {});
  }
  // restaurar posição da paleta
  // (removido: a paleta agora é um dropdown)

  // Padronizar botões dentro do app: aplicar btn btn-sm btn-outline-secondary onde couber
  nextTick(() => {
    try {
      const root = document.querySelector("#app, .app") || document.body;
      const BTN_SEL = 'button, a[role="button"]';
      const exclude = (el: Element) =>
        el.closest(".mm-dropdown-menu") || el.closest(".tool-dock") || el.closest('.tabs');
      root.querySelectorAll(BTN_SEL).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (exclude(el)) return;
        // adicionar classes bootstrap-like
        if (!el.classList.contains("btn")) el.classList.add("btn");
        if (!el.classList.contains("btn-sm")) el.classList.add("btn-sm");
        // aplicar outline-secondary como padrão
        const variants = [
          "primary",
          "secondary",
          "success",
          "danger",
          "warning",
          "info",
          "light",
          "dark",
          "link",
        ];
        variants.forEach((v) => {
          el.classList.remove("btn-" + v);
          el.classList.remove("btn-outline-" + v);
        });
        el.classList.add("btn-outline-secondary");
      });
      const menubar = root.querySelector('.mm-menubar') as HTMLElement | null;
      const details = root.querySelector('details.mm-dropdown') as HTMLDetailsElement | null;
      const menubarState = (() => {
        let activeAnchor: HTMLElement | null = null;
        let activeDropdown: HTMLElement | null = null;
        const contains = (target: HTMLElement | null) => {
          if (!target) return false;
          if (target.closest('.mm-menubar')) return true;
          const dd = target.closest('.mm-menu-dropdown');
          return !!(dd && dd.closest('.mm-menubar'));
        };
        const close = () => {
          if (!activeDropdown || !activeAnchor) {
            activeDropdown = null;
            activeAnchor = null;
            return;
          }
          closeFloating(activeDropdown);
          activeAnchor.setAttribute('aria-expanded', 'false');
          activeAnchor.closest('.mm-menu')?.classList.remove('open');
          activeDropdown = null;
          activeAnchor = null;
        };
        const open = (anchor: HTMLElement, dropdown: HTMLElement) => {
          if (activeDropdown === dropdown) return;
          close();
          menubar?.querySelectorAll('.mm-menu.open').forEach((m) => {
            if (m !== anchor.closest('.mm-menu')) m.classList.remove('open');
          });
          menubar?.querySelectorAll('.mm-menu-btn[aria-expanded="true"]').forEach((btn) => {
            if (btn !== anchor) (btn as HTMLElement).setAttribute('aria-expanded', 'false');
          });
          menubar?.querySelectorAll('.mm-menu-dropdown').forEach((el) => {
            if (el !== dropdown) closeFloating(el as HTMLElement);
          });
          activeAnchor = anchor;
          activeDropdown = dropdown;
          anchor.setAttribute('aria-expanded', 'true');
          anchor.closest('.mm-menu')?.classList.add('open');
          floatDropdown(anchor, dropdown, { offsetY: 6 });
        };
        const toggle = (anchor: HTMLElement, dropdown: HTMLElement) => {
          if (activeDropdown === dropdown) {
            close();
          } else {
            open(anchor, dropdown);
          }
        };
        return { get activeAnchor() { return activeAnchor; }, get activeDropdown() { return activeDropdown; }, close, open, toggle, contains };
      })();
      const closeShapesDropdown = () => {
        if (!details?.open) return;
        const menu = details.querySelector('.mm-dropdown-menu') as HTMLElement | null;
        details.open = false;
        if (menu) closeFloating(menu);
      };

      if (menubar) {
        menubar.querySelectorAll('.mm-menu').forEach((menu) => {
          const anchor = menu.querySelector('.mm-menu-btn') as HTMLElement | null;
          const dropdown = menu.querySelector('.mm-menu-dropdown') as HTMLElement | null;
          if (!anchor || !dropdown) return;
          anchor.setAttribute('aria-expanded', 'false');
          const onClick = (e: Event) => {
            e.preventDefault();
            menubarState.toggle(anchor, dropdown);
          };
          anchor.addEventListener('click', onClick);
          pushCleanup(() => anchor.removeEventListener('click', onClick));
        });

        const onPointerDown = (ev: PointerEvent) => {
          const target = ev.target as HTMLElement | null;
          const insideMenubar = menubarState.contains(target);
          if (!insideMenubar) menubarState.close();
          if (details?.open && (!target || !details.contains(target))) closeShapesDropdown();
        };
        window.addEventListener('pointerdown', onPointerDown, true);
        pushCleanup(() => window.removeEventListener('pointerdown', onPointerDown, true));

        const onFocusIn = (ev: FocusEvent) => {
          const target = ev.target as HTMLElement | null;
          const insideMenubar = menubarState.contains(target);
          if (!insideMenubar) menubarState.close();
          if (details?.open && (!target || !details.contains(target))) closeShapesDropdown();
        };
        window.addEventListener('focusin', onFocusIn);
        pushCleanup(() => window.removeEventListener('focusin', onFocusIn));

        const onKeydown = (ev: KeyboardEvent) => {
          if (ev.key !== 'Escape') return;
          let handled = false;
          if (menubarState.activeDropdown) {
            menubarState.close();
            handled = true;
          }
          if (details?.open) {
            closeShapesDropdown();
            handled = true;
          }
          if (handled) ev.stopPropagation();
        };
        window.addEventListener('keydown', onKeydown);
        pushCleanup(() => window.removeEventListener('keydown', onKeydown));
      }

      // Dropdown de Formas (details) como flutuante + fechar ao clicar fora/ESC
      if (details) {
        const summary = details.querySelector('summary') as HTMLElement | null;
        summary?.setAttribute('aria-expanded', 'false');
        const onToggle = (ev: Event) => {
          const det = ev.currentTarget as HTMLDetailsElement;
          if (det.open) {
            const sum = det.querySelector('summary') as HTMLElement | null;
            const menu = det.querySelector('.mm-dropdown-menu') as HTMLElement | null;
            if (sum && menu) {
              floatDropdown(sum, menu, { offsetY: 6 });
              sum.setAttribute('aria-expanded', 'true');
            }
          } else {
            const menu = det.querySelector('.mm-dropdown-menu') as HTMLElement | null;
            const sum = det.querySelector('summary') as HTMLElement | null;
            if (menu) closeFloating(menu);
            sum?.setAttribute('aria-expanded', 'false');
          }
        };
        details.addEventListener('toggle', onToggle);
        pushCleanup(() => details.removeEventListener('toggle', onToggle));
      }
    } catch {}
  });
});

onUnmounted(() => {
  while (cleanupStack.length) {
    const fn = cleanupStack.pop();
    try {
      fn?.();
    } catch {}
  }
});

function floatDropdown(anchor: HTMLElement, menuEl: HTMLElement, opts?: { offsetY?: number }) {
  const offsetY = opts?.offsetY ?? 6;
  // tornar visível e fixo
  menuEl.style.display = 'block';
  menuEl.style.position = 'fixed';
  menuEl.style.zIndex = '4000';
  // posicionar
  const place = () => {
    const r = anchor.getBoundingClientRect();
    // largura estimada
    const cs = getComputedStyle(menuEl);
    const minW = parseInt(cs.minWidth || '240', 10) || 240;
    const menuW = Math.max(menuEl.offsetWidth || 0, minW);
    let left = r.left;
    if (left + menuW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - menuW - 8);
    let top = r.bottom + offsetY;
    const menuH = menuEl.offsetHeight || 0;
    if (top + menuH > window.innerHeight - 8) top = Math.max(8, window.innerHeight - menuH - 8);
    menuEl.style.left = `${Math.round(left)}px`;
    menuEl.style.top = `${Math.round(top)}px`;
  };
  place();
  const onScroll = () => place();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  floatMap.set(menuEl, { onScroll });
}
function closeFloating(menuEl: HTMLElement) {
  const rec = floatMap.get(menuEl);
  if (rec) {
    window.removeEventListener('scroll', rec.onScroll);
    window.removeEventListener('resize', rec.onScroll);
    floatMap.delete(menuEl);
  }
  menuEl.style.display = '';
  menuEl.style.position = '';
  menuEl.style.left = '';
  menuEl.style.top = '';
  (menuEl.parentElement?.closest('.mm-menu') as HTMLElement | null)?.classList.remove('open');
}

// Debounce para evitar escrita excessiva no localStorage durante drag/move
let saveT: number | undefined;
function onDataChange(data: any) {
  if (saveT) window.clearTimeout(saveT);
  saveT = window.setTimeout(() => saveCurrent(data), 250);
}
function onSelection(payload: {
  nodeId: string | null;
  edgeIndex: number | null;
}) {
  // no-op for now; future: mostrar painel de propriedades
}

function onSample(payload: { nodeStyle?: any; edgeStyle?: any }) {
  if (payload.nodeStyle) Object.assign(nodeStyle.value, payload.nodeStyle);
  if (payload.edgeStyle) Object.assign(edgeStyle.value, payload.edgeStyle);
}

function onExport() {
  const data = editor.value?.getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mindmap.json";
  a.click();
  URL.revokeObjectURL(url);
}
function onImport(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      editor.value?.setData(data);
      saveCurrent(data);
    } catch {}
  };
  reader.readAsText(file);
}

function onQuickAdd() {
  editor.value?.addNodeAtCenter?.();
}
function onQuickAddShape(shape: string) {
  // insere forma pré-definida no centro
  if ((editor.value as any)?.createPresetShapeCentered) {
    (editor.value as any).createPresetShapeCentered(shape);
  } else {
    onQuickAdd();
  }
}
function exportPNG() {
  editor.value?.exportPNG?.();
}
function exportSVG() {
  editor.value?.exportSVG?.();
}
function align(
  dir: "left" | "centerX" | "right" | "top" | "middle" | "bottom"
) {
  editor.value?.align?.(dir);
}
function distribute(axis: "x" | "y") {
  editor.value?.distribute?.(axis);
}
function toFront() {
  editor.value?.toFront?.();
}
function toBack() {
  editor.value?.toBack?.();
}
function rotate(delta: number) {
  editor.value?.rotateSelected?.(delta);
}
function undo() {
  editor.value?.undo?.();
}
function redo() {
  editor.value?.redo?.();
}
function setTool(t: Tool) {
  tool.value = t;
}
function onDragShape(ev: DragEvent, shape: string) {
  if (!ev.dataTransfer) return;
  ev.dataTransfer.setData("application/x-mm-shape", JSON.stringify({ shape }));
  ev.dataTransfer.effectAllowed = "copy";
}

// Conversão de formato legado (Canvas) para X6 JSON
function legacyToX6(legacy: {
  nodes: Array<{ id: string; x: number; y: number; label: string }>;
  edges: Array<{ a: string; b: string }>;
}) {
  const cells: any[] = [];
  // mapear nós
  const defaultNode = (n: any) => ({
    id: n.id,
    shape: "rect",
    x: n.x - 80, // centralizar: X6 posiciona pela borda sup-esq
    y: n.y - 30,
    width: 160,
    height: 60,
    attrs: {
      body: { fill: "#ffffff", stroke: "#cbd5e1", rx: 10, ry: 10 },
      label: {
        text: n.label || "Nó",
        fontSize: 14,
        fill: "#0b0f13",
        fontFamily: "Inter, system-ui, sans-serif",
      },
    },
    markup: [
      { tagName: "rect", selector: "body", attrs: { magnet: true } },
      { tagName: "text", selector: "label" },
    ],
  });
  legacy.nodes.forEach((n) => cells.push(defaultNode(n)));
  // mapear arestas
  legacy.edges.forEach((e, idx) =>
    cells.push({
      id: `e${idx}_${e.a}_${e.b}`,
      shape: "edge",
      source: { cell: e.a },
      target: { cell: e.b },
      attrs: {
        line: {
          stroke: "#475569",
          strokeWidth: 2,
          targetMarker: { name: "block", width: 12, height: 8, offset: 2 },
          sourceMarker: null,
          strokeDasharray: 0,
          strokeLinecap: "round",
        },
      },
      connector: { name: "normal" },
      router: { name: "orth" },
    })
  );
  return { cells };
}
</script>

<style>
.me-2 {
  margin-right: 0.5rem;
}

/* Botão claro com caret (estilo próximo ao Bootstrap .btn-light .btn-sm) */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ced4da;
  background: #f8f9fa;
  color: #212529;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25;
  cursor: pointer;
}
.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
.btn-light {
  background: #f8f9fa;
  border-color: #ced4da;
  color: #212529;
}
/* Outline secondary (estilo Bootstrap) */
.btn-outline-secondary {
  color: #6c757d;
  border-color: #6c757d;
  background-color: #f8f9fa; /* solicitado */
}
.btn-outline-secondary:hover {
  color: #495057;
  background-color: #e9ecef;
  border-color: #6c757d;
}
.btn-outline-secondary:active {
  color: #343a40;
  background-color: #dee2e6;
  border-color: #565e64;
}
.btn-outline-secondary:focus {
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5);
}
.btn:hover {
  filter: brightness(0.98);
}
.btn:active {
  transform: translateY(1px);
}
.btn:focus {
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
}

/* Caret ao lado do texto */
.dropdown-toggle::after {
  display: inline-block;
  margin-left: 0.4rem;
  vertical-align: 0.255em;
  content: "";
  border-top: 0.3em solid;
  border-right: 0.3em solid transparent;
  border-left: 0.3em solid transparent;
}
.mm-dropdown[open] > .dropdown-toggle::after {
  transform: rotate(180deg);
}
.app {
  font-family: system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}
.app-bar {
  display: grid;
  grid-template-columns: 1fr auto auto; /* esquerda cresce, centro auto, direita auto */
  align-items: center;
  column-gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap; /* sem quebra */
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  position: relative;
  z-index: 100; /* ficar acima do canvas e overlays do X6 */
}
.app-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.app-center { justify-self: center; }
.app-right { justify-self: end; display: inline-flex; align-items: center; gap: 8px; }
.app-title { font-size: 0.95rem; color: #0b0f13; }

/* Abas de mapas abertos */
.tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -ms-overflow-style: none; /* IE/Edge */
  scrollbar-width: thin; /* Firefox */
}
.tabs::-webkit-scrollbar { height: 8px; }
.tabs::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
.tab {
  appearance: none;
  background: #eef2f6;
  border: 1px solid #d6dee6;
  color: #334155;
  border-radius: 8px;
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  cursor: pointer;
}
.tab:hover { background: #e6edf4; }
.tab:active { transform: translateY(1px); }
.tab .tab-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tab .tab-close { font-size: 12px; opacity: .7; padding: 0 4px; border-radius: 6px; }
.tab .tab-close:hover { background: rgba(0,0,0,.06); opacity: 1; }
.tab[data-active="true"] {
  background: #ffffff;
  color: #0b0f13;
  border-color: var(--bs-primary, #0d6efd);
  box-shadow: inset 0 -2px 0 rgba(13,110,253,.25);
}
.tab.add { background: transparent; border-style: dashed; color: #6c757d; }
.tab.add:hover { background: #f1f3f5; }
/* input de edição inline da aba */
.tab .tab-input {
  font: inherit;
  color: inherit;
  padding: 2px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  width: 160px;
  background: #fff;
}
.tools {
  display: inline-flex;
  gap: 4px;
}
.tools button {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fafafa;
  cursor: pointer;
  font-size: 12px;
}
.tools button.active {
  background: #111;
  color: #fff;
  border-color: #111;
}
.style {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.style label {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: #334155;
}
.edit {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}
.divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  display: inline-block;
  margin: 0 4px;
}
.io {
  margin-left: auto;
  display: inline-flex;
  gap: 6px;
}
.import-label {
  border: 1px solid #ddd;
  background: #fafafa;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.import-label input {
  display: none;
}
.shape-item {
  cursor: grab;
  font-size: 12px;
}
/* ícones */
.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 450, "GRAD" 0, "opsz" 24;
  font-size: 18px;
  line-height: 1;
  vertical-align: middle;
}
.icon-btn {
  width: 32px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.icon-btn .material-symbols-outlined {
  font-size: 18px;
}
/* Quando .icon-btn também vira .btn, manter dimensão compacta */
.icon-btn.btn {
  padding: 0;
  width: 32px;
  height: 30px;
}
/* Quando .tool-btn também usa .btn, neutralizar padding e manter dimensões */
.tool-btn.btn {
  padding: 0;
  width: 40px;
  height: 40px;
}

/* Workspace com sidebar de cadernos */
.workspace {
  display: grid;
  grid-template-columns: 260px 1fr; /* sidebar + área principal */
  gap: 10px;
  align-items: start;
  min-height: 70vh;
}
/* Sidebar do notebook (grupos/mapas) */
.notebook-sidebar {
  position: sticky;
  top: 72px;
  align-self: start;
  max-height: calc(100vh - 100px);
  overflow: auto;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px;
}
.nb-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.nb-title { font-weight: 600; color: #334155; }
.nb-group { border-top: 1px solid #e9ecef; padding-top: 6px; margin-top: 6px; }
.nb-group:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
.nb-group-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.nb-group-title { font-size: 0.9rem; font-weight: 500; color: #1f2937; }
.nb-maps { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.nb-map-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; cursor: pointer; color: #334155; }
.nb-map-item:hover { background: #e9ecef; }
.nb-map-item[data-active="true"] { background: #ffffff; border: 1px solid var(--bs-primary, #0d6efd); box-shadow: inset 0 0 0 1px rgba(13,110,253,.15); }
.nb-map-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* inputs de edição inline */
.nb-group-input, .nb-map-input {
  font: inherit;
  color: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 4px 6px;
  background: #fff;
}
.nb-group-input { width: 60%; min-width: 140px; }
.nb-map-input { flex: 1 1 auto; min-width: 120px; }
.tool-dock {
  position: sticky;
  top: 72px;
  z-index: 2; /* garantir que não suma atrás do header */
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tool-dock .btn {
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f8f9fa;
  color: #0b0f13;
  transition: transform 0.08s ease, box-shadow 0.2s ease, background 0.2s ease;
  padding: 0;
}
.tool-dock .btn:hover {
  background: #e9ecef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
.tool-dock .btn:active {
  transform: translateY(0);
  filter: brightness(0.98);
}
.tool-dock .btn[data-active="true"] {
  background: #dee2e6;
  border-color: #c1c8cd;
  box-shadow: inset 0 0 0 1px #c1c8cd;
}
.tool-dock .btn .material-symbols-outlined {
  font-size: 18px;
}

/* ocupar toda a largura disponível e reduzir bordas do card para ampliar canvas */
.workspace-main {
  width: 100%;
}
.workspace-main.card {
  padding: 4px; /* menor padding para mais área útil */
  border-radius: 10px;
  position: relative; /* criar contexto para dropdowns */
  overflow: visible;  /* permitir menu transbordar sobre o canvas */
}
/* Tooltip CSS simples */
.tool-dock .btn[data-tip] {
  position: relative;
}
.tool-dock .btn[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: #111;
  color: #fff;
  font-size: 11px;
  padding: 4px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: left center;
}
.tool-dock .btn[data-tip]:hover::after {
  opacity: 1;
  transform: translate(2px, -50%);
}

/* Dropdown de Formas (ancorado, não flutuante) */
.mm-dropdown {
  position: relative;
}
.mm-dropdown[open] > .mm-dropdown-menu { /* não usar interno; usamos flutuante */ display: none; }
.mm-dropdown > summary {
  list-style: none;
}
.mm-dropdown > summary::-webkit-details-marker {
  display: none;
}
.mm-dropdown-menu {
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 3000; /* garantir acima do canvas quando portal não estiver ativo */
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  min-width: 240px;
  max-height: 60vh;
  overflow: auto;
  display: none;
}
/* Grade de formas */
.shape-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px; }
.shape-tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; font-size: 12px; }
.shape-icon { width: 28px; height: 20px; border: 2px solid #94a3b8; border-radius: 4px; background: #fff; }
.shape-icon[data-shape="ellipse"] { border-radius: 999px; }
.shape-icon[data-shape="diamond"] { transform: rotate(45deg); width: 22px; height: 22px; }
.shape-icon[data-shape="triangle"] { width: 0; height: 0; border-left: 14px solid transparent; border-right: 14px solid transparent; border-bottom: 24px solid #94a3b8; background: transparent; border-radius: 0; }
.shape-icon[data-shape="hexagon"] { position: relative; width: 30px; height: 16px; background: #fff; border: 2px solid #94a3b8; }
.shape-icon[data-shape="hexagon"]::before, .shape-icon[data-shape="hexagon"]::after { content:""; position: absolute; left: 3px; right: 3px; height: 2px; background: #94a3b8; }
.shape-icon[data-shape="hexagon"]::before { top: -2px; }
.shape-icon[data-shape="hexagon"]::after { bottom: -2px; }
.shape-label { line-height: 1; }

/* Menubar com classes exclusivas para evitar conflito */
.mm-menubar { display: inline-flex; gap: 6px; flex: 0 0 auto; }
.mm-menubar .mm-menu { position: relative; }
.mm-menubar .mm-menu-btn { cursor: pointer; padding: 2px 8px; font-size: 12px; }
.mm-menubar .mm-menu-dropdown { position: absolute; top: 100%; left: 0; z-index: 3000; min-width: 260px; background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.08); display: none; }
.mm-menubar .mm-menu.open > .mm-menu-dropdown { /* não mostrar interno; usamos flutuante */ display: none; }
.mm-menubar .mm-menu.open .mm-menu-btn { background: #e9ecef; }
.mm-menubar .mm-menu-section { font-size: 12px; color: #6b7280; padding: 4px 6px; }
.mm-menubar .mm-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: 1px solid transparent; background: transparent; border-radius: 6px; cursor: pointer; white-space: nowrap; }
.mm-menubar .mm-menu-item:hover { background: #e9ecef; }
.mm-menubar .mm-menu-sep { height: 1px; background: #e5e7eb; margin: 6px 0; }
/* Bootstrap dropdown dentro da app-bar com a mesma cor */
.app-bar .dropdown-menu {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

/* Removido portal: dropdowns agora são fixos diretamente no próprio elemento */

/* Responsivo: comprimir UI em telas estreitas */
@media (max-width: 992px) {
  .workspace { grid-template-columns: 200px 1fr; }
  .tool-dock .btn { width: 32px; height: 32px; }
  .tool-dock .btn .material-symbols-outlined { font-size: 16px; }
  .x6-container { height: 72vh; max-height: 82vh; }
  .mm-menubar .menu-dropdown { min-width: 220px; }
}
@media (max-width: 576px) {
  .app-center { display: none; } /* esconder menubar no xs para liberar espaço */
  .workspace { grid-template-columns: 1fr; }
  .notebook-sidebar { position: relative; top: 0; max-height: none; }
  .mm-dropdown .shape-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
}
</style>
