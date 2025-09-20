<template>
  <div class="sheets-app">
    <!-- Barra de Ferramentas -->
  <div class="toolbar bg-white border-bottom p-2" @mousedown.capture="onToolbarMouseDown">
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <!-- Ações principais (ícones) -->
        <button @click="newSheet" class="btn btn-sm btn-outline-primary" title="Nova Planilha">
          <span class="material-symbols-outlined">add</span>
        </button>
        <button @click="save" class="btn btn-sm btn-primary" title="Salvar">
          <span class="material-symbols-outlined">save</span>
        </button>
        <button @click="load" class="btn btn-sm btn-outline-secondary" title="Carregar">
          <span class="material-symbols-outlined">download</span>
        </button>
        <div class="vr"></div>
        <!-- Formatação de Texto -->
  <button @mousedown.stop="onToolbarMouseDown" @click="formatBold" class="btn btn-sm btn-outline-secondary" title="Negrito">
          <span class="material-symbols-outlined">format_bold</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="formatItalic" class="btn btn-sm btn-outline-secondary" title="Itálico">
          <span class="material-symbols-outlined">format_italic</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="formatUnderline" class="btn btn-sm btn-outline-secondary" title="Sublinhado">
          <span class="material-symbols-outlined">format_underlined</span>
        </button>
        <div class="vr"></div>
        <!-- Alinhamento -->
  <button @mousedown.stop="onToolbarMouseDown" @click="alignLeft" class="btn btn-sm btn-outline-secondary" title="Alinhar à esquerda">
          <span class="material-symbols-outlined">format_align_left</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="alignCenter" class="btn btn-sm btn-outline-secondary" title="Centralizar">
          <span class="material-symbols-outlined">format_align_center</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="alignRight" class="btn btn-sm btn-outline-secondary" title="Alinhar à direita">
          <span class="material-symbols-outlined">format_align_right</span>
        </button>
        <div class="vr"></div>
        <!-- Cores (dropdowns) -->
        <div class="toolbar-dropdown" @keydown.esc.stop.prevent="showTextColorMenu=false">
          <button @mousedown.stop @click="toggleTextColorMenu" class="btn btn-sm btn-outline-secondary d-flex align-items-center" title="Cor do texto">
            <span class="material-symbols-outlined">format_color_text</span>
            <span class="material-symbols-outlined caret">arrow_drop_down</span>
          </button>
          <div v-if="showTextColorMenu" class="dropdown-menu-like color-menu" @mousedown.stop>
            <div class="menu-header d-flex align-items-center justify-content-between">
              <button class="btn btn-link p-0 small" @click="applyTextColor(undefined)">Redefinir</button>
            </div>
            <div class="palette-grid">
              <button v-for="c in basePalette" :key="'tc-'+c" class="swatch" :style="{ background: c }" @click="applyTextColor(c)"></button>
            </div>
            <div class="menu-subtitle">Padrão</div>
            <div class="palette-row">
              <button v-for="c in standardPalette" :key="'tcs-'+c" class="swatch" :style="{ background: c }" @click="applyTextColor(c)"></button>
            </div>
            <div class="menu-subtitle">Cores personalizadas</div>
            <div class="custom-row d-flex gap-2 align-items-center">
              <input type="color" class="form-control form-control-color form-control-sm" style="width: 40px; padding:0;" @input="e=>applyTextColor((e.target as HTMLInputElement).value)" />
            </div>
            <div class="menu-divider"></div>
            <button class="menu-item" @click="openConditionalFormatting">Formatação condicional</button>
            <button class="menu-item" @click="openAlternatingColors">Cores alternadas</button>
          </div>
        </div>

        <div class="toolbar-dropdown" @keydown.esc.stop.prevent="showBgColorMenu=false">
          <button @mousedown.stop @click="toggleBgColorMenu" class="btn btn-sm btn-outline-secondary d-flex align-items-center" title="Cor de fundo">
            <span class="material-symbols-outlined">format_color_fill</span>
            <span class="material-symbols-outlined caret">arrow_drop_down</span>
          </button>
          <div v-if="showBgColorMenu" class="dropdown-menu-like color-menu" @mousedown.stop>
            <div class="menu-header d-flex align-items-center justify-content-between">
              <button class="btn btn-link p-0 small" @click="applyBgColor(undefined)">Redefinir</button>
            </div>
            <div class="palette-grid">
              <button v-for="c in basePalette" :key="'bg-'+c" class="swatch" :style="{ background: c }" @click="applyBgColor(c)"></button>
            </div>
            <div class="menu-subtitle">Padrão</div>
            <div class="palette-row">
              <button v-for="c in standardPalette" :key="'bgs-'+c" class="swatch" :style="{ background: c }" @click="applyBgColor(c)"></button>
            </div>
            <div class="menu-subtitle">Cores personalizadas</div>
            <div class="custom-row d-flex gap-2 align-items-center">
              <input type="color" class="form-control form-control-color form-control-sm" style="width: 40px; padding:0;" @input="e=>applyBgColor((e.target as HTMLInputElement).value)" />
            </div>
            <div class="menu-divider"></div>
            <button class="menu-item" @click="openConditionalFormatting">Formatação condicional</button>
            <button class="menu-item" @click="openAlternatingColors">Cores alternadas</button>
          </div>
        </div>
        <div class="vr"></div>
        <!-- Formatos numéricos -->
        <select class="form-select form-select-sm" style="width:160px" @change="changeFormat($event)">
          <option value="general">Geral</option>
          <option value="currency">Moeda (R$)</option>
          <option value="number">Número</option>
          <option value="percent">Percentual</option>
        </select>
        <button @click="increaseDecimals" class="btn btn-sm btn-outline-secondary" title="Aumentar casas decimais">.0+</button>
        <button @click="decreaseDecimals" class="btn btn-sm btn-outline-secondary" title="Diminuir casas decimais">.0-</button>
        <div class="vr"></div>
        <!-- Bordas (dropdown) -->
        <div class="toolbar-dropdown" @keydown.esc.stop.prevent="showBorderMenu=false">
          <button @mousedown.stop @click="toggleBorderMenu" class="btn btn-sm btn-outline-secondary d-flex align-items-center" title="Bordas">
            <span class="material-symbols-outlined">border_all</span>
            <span class="material-symbols-outlined caret">arrow_drop_down</span>
          </button>
          <div v-if="showBorderMenu" class="dropdown-menu-like border-menu" @mousedown.stop>
            <div class="border-actions">
              <button class="btn icon-btn" title="Todas" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('all')"><span class="material-symbols-outlined">border_all</span></button>
              <button class="btn icon-btn" title="Externa" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('outer')"><span class="material-symbols-outlined">border_outer</span></button>
              <button class="btn icon-btn" title="Interna" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('inner')"><span class="material-symbols-outlined">border_inner</span></button>
              <button class="btn icon-btn" title="Superior" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('top')"><span class="material-symbols-outlined">border_top</span></button>
              <button class="btn icon-btn" title="Direita" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('right')"><span class="material-symbols-outlined">border_right</span></button>
              <button class="btn icon-btn" title="Inferior" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('bottom')"><span class="material-symbols-outlined">border_bottom</span></button>
              <button class="btn icon-btn" title="Esquerda" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('left')"><span class="material-symbols-outlined">border_left</span></button>
              <button class="btn icon-btn" title="Sem borda" @mousedown.stop="onToolbarMouseDown" @click="applyBorderMode('none')"><span class="material-symbols-outlined">border_clear</span></button>
            </div>
            <div class="menu-subtitle mt-2">Espessura (px)</div>
            <div class="thickness-row">
              <input type="number" min="1" max="20" step="1"
                     class="form-control form-control-sm w-auto"
                     v-model.number="borderWidth"
                     @mousedown.stop="onToolbarMouseDown"
                     @input="onBorderWidthInput" />
              <input type="range" min="1" max="20" step="1"
                     class="form-range"
                     style="width:150px"
                     v-model.number="borderWidth"
                     @mousedown.stop="onToolbarMouseDown"
                     @input="onBorderWidthInput" />
              <span class="small text-muted">{{ borderWidth }} px</span>
            </div>
            <div class="menu-subtitle mt-2">Cor</div>
            <div class="palette-row">
              <button v-for="c in standardPalette" :key="'bd-'+c" class="swatch" :style="{ background: c }" @mousedown.stop="onToolbarMouseDown" @click="setBorderColor(c)"></button>
              <input type="color" class="form-control form-control-color form-control-sm ms-2" style="width: 40px; padding:0;" v-model="borderColor" @mousedown.stop="onToolbarMouseDown" />
            </div>
          </div>
        </div>
  <div class="vr"></div>
        <!-- Inserir -->
  <button @mousedown.stop="onToolbarMouseDown" @click="insertRow" class="btn btn-sm btn-outline-secondary" title="Inserir linha">
          <span class="material-symbols-outlined">table_rows</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="insertCol" class="btn btn-sm btn-outline-secondary" title="Inserir coluna">
          <span class="material-symbols-outlined">view_column</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="deleteRow" class="btn btn-sm btn-outline-secondary" title="Excluir linha">
          <span class="material-symbols-outlined">delete</span>
        </button>
  <button @mousedown.stop="onToolbarMouseDown" @click="deleteCol" class="btn btn-sm btn-outline-secondary" title="Excluir coluna">
          <span class="material-symbols-outlined">delete</span>
        </button>
        <div class="vr"></div>
        <!-- Mesclar -->
        <button @click="mergeCellsAction" class="btn btn-sm btn-outline-secondary" title="Mesclar células">
          <span class="material-symbols-outlined">merge_type</span>
        </button>
        <button @click="unmergeCellsAction" class="btn btn-sm btn-outline-secondary" title="Desfazer mesclagem">
          <span class="material-symbols-outlined">call_split</span>
        </button>
  <div class="vr"></div>
      <div class="vr"></div>
      <button class="btn btn-sm btn-outline-secondary" @click="clearValues" title="Limpar valores">
        <span class="material-symbols-outlined">backspace</span>
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="clearFormats" title="Limpar formatação">
        <span class="material-symbols-outlined">format_clear</span>
      </button>
      <div class="vr"></div>
      <button class="btn btn-sm btn-outline-secondary" @click="toggleFreezeRow" :class="{active: fixedRowsTop>0}" title="Fixar 1ª linha">
        <span class="material-symbols-outlined">push_pin</span>
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="toggleFreezeCol" :class="{active: fixedColumnsLeft>0}" title="Fixar 1ª coluna">
        <span class="material-symbols-outlined">push_pin</span>
      </button>
      <div class="vr"></div>
      <button class="btn btn-sm btn-outline-secondary" @click="exportCsv" title="Exportar CSV">
        <span class="material-symbols-outlined">file_export</span>
      </button>
      <input ref="csvInputRef" type="file" accept=".csv,text/csv" class="d-none" @change="importCsv($event)" />
      <button class="btn btn-sm btn-outline-secondary" @click="() => csvInputRef?.click()" title="Importar CSV">
        <span class="material-symbols-outlined">file_upload</span>
      </button>
        <!-- Inserir novas ações -->
        <button @click="reapplyAllBorders" class="btn btn-sm btn-outline-secondary" title="Reaplicar bordas salvas">
          <span class="material-symbols-outlined">grid_on</span>
        </button>
        <button @click="toggleLog" class="btn btn-sm btn-outline-secondary" :class="{active: debugLog}" title="Toggle debug seleção">
          <span class="material-symbols-outlined">bug_report</span>
        </button>
      </div>
    </div>

    <!-- Barra de fórmula -->
  <div class="formula-bar bg-white border-bottom px-2 py-1 d-flex align-items-center gap-2" @mousedown.capture="onToolbarMouseDown">
      <span class="text-muted small">fx</span>
      <input ref="formulaInputRef" class="form-control form-control-sm"
             v-model="formulaValue"
             @focus="onFormulaFocus"
             @input="onFormulaInput"
             @keydown.enter.prevent="applyFormulaValue"
             @blur="onFormulaBlur"
             placeholder="Valor ou fórmula (ex.: =A1+B1)" list="formula-ptbr-list" />
      <datalist id="formula-ptbr-list">
        <option value="SOMA"></option>
        <option value="MÉDIA"></option>
        <option value="MINIMO"></option>
        <option value="MÁXIMO"></option>
        <option value="CONTSE"></option>
        <option value="SE"></option>
        <option value="E"></option>
        <option value="OU"></option>
        <option value="NÃO"></option>
        <option value="CONCATENAR"></option>
        <option value="TEXTO"></option>
        <option value="PROCV"></option>
        <option value="PROCH"></option>
        <option value="HOJE"></option>
        <option value="AGORA"></option>
        <option value="ARRED"></option>
        <option value="ABS"></option>
        <option value="MAIOR"></option>
        <option value="MENOR"></option>
        <option value="SUBSTITUIR"></option>
        <option value="EXT.TEXTO"></option>
        <option value="ESQUERDA"></option>
        <option value="DIREITA"></option>
        <option value="NÚM.CARACT"></option>
        <option value="NÚMERO"></option>
        <option value="VALOR"></option>
        <option value="SOMASE"></option>
      </datalist>
      <div class="vr"></div>
      <button class="btn btn-sm btn-outline-secondary" @click="clearValues" title="Limpar valores">
        <span class="material-symbols-outlined">backspace</span>
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="clearFormats" title="Limpar formatação">
        <span class="material-symbols-outlined">format_clear</span>
      </button>
      <div class="vr"></div>
      <button class="btn btn-sm btn-outline-secondary" @click="toggleFreezeRow" :class="{active: fixedRowsTop>0}" title="Fixar 1ª linha">
        <span class="material-symbols-outlined">push_pin</span>
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="toggleFreezeCol" :class="{active: fixedColumnsLeft>0}" title="Fixar 1ª coluna">
        <span class="material-symbols-outlined">push_pin</span>
      </button>
      <div class="vr"></div>
      <button class="btn btn-sm btn-outline-secondary" @click="exportCsv" title="Exportar CSV">
        <span class="material-symbols-outlined">file_export</span>
      </button>
      <input ref="csvInputRef" type="file" accept=".csv,text/csv" class="d-none" @change="importCsv($event)" />
      <button class="btn btn-sm btn-outline-secondary" @click="() => csvInputRef?.click()" title="Importar CSV">
        <span class="material-symbols-outlined">file_upload</span>
      </button>
    </div>

    <!-- Abas de Planilhas -->
    <div class="sheet-tabs border-bottom bg-white px-2 py-1 d-flex align-items-center gap-2 flex-wrap">
      <button v-for="id in sheetsList" :key="id" class="btn btn-sm" :class="id===activeSheetId ? 'btn-primary' : 'btn-outline-secondary'" @click="switchSheet(id)">{{ id }}</button>
      <button class="btn btn-sm btn-outline-primary" @click="newSheet">+ Nova Aba</button>
    </div>

    <!-- Área da Planilha -->
    <main class="sheet-container">
      <div v-if="!hot" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando planilha...</span>
        </div>
        <p class="mt-2">Carregando planilha...</p>
      </div>
  <div id="hot-container" class="pv-hot">
        <!-- Overlay: destaque de intervalo durante edição em célula -->
        <div v-if="rangeOverlay.show" class="range-overlay" :style="{ top: rangeOverlay.top+'px', left: rangeOverlay.left+'px', width: rangeOverlay.width+'px', height: rangeOverlay.height+'px' }"></div>
        <!-- Dropdown: autocomplete de funções PT-BR ao digitar '=' em célula -->
        <div v-if="fnSuggest.show" class="fn-suggest" :style="{ top: fnSuggest.top+'px', left: fnSuggest.left+'px' }" @mousedown.stop>
          <div class="fn-suggest-item" v-for="(it, idx) in fnSuggest.items" :key="it" :class="{ active: idx===fnSuggest.index }" @mousedown.prevent="pickFnSuggestion(idx)">{{ it }}</div>
        </div>
      </div>
    </main>

    <!-- Status Bar -->
    <div v-if="statusMessage" class="status-bar bg-success text-white text-center py-2">
      {{ statusMessage }}
    </div>

    <!-- Modal: Formatação Condicional -->
    <div v-if="showConditionalModal" class="modal-overlay" @mousedown.self="showConditionalModal=false">
      <div class="modal-card">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <strong>Formatação condicional</strong>
          <button class="btn-close" @click="showConditionalModal=false" aria-label="Fechar"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2 align-items-center mb-2">
            <div class="col-5">
              <select class="form-select form-select-sm" v-model="conditionalForm.type">
                <option value="greaterThan">Maior que</option>
                <option value="lessThan">Menor que</option>
                <option value="equalTo">Igual a</option>
                <option value="between">Entre</option>
                <option value="textContains">Texto contém</option>
                <option value="isEmpty">Está vazio</option>
                <option value="notEmpty">Não está vazio</option>
              </select>
            </div>
            <div class="col-7" v-if="conditionalForm.type==='between'">
              <div class="d-flex gap-2">
                <input class="form-control form-control-sm" v-model="conditionalForm.value" placeholder="mín" />
                <input class="form-control form-control-sm" v-model="conditionalForm.value2" placeholder="máx" />
              </div>
            </div>
            <div class="col-7" v-else-if="conditionalForm.type!=='isEmpty' && conditionalForm.type!=='notEmpty'">
              <input class="form-control form-control-sm" v-model="conditionalForm.value" placeholder="valor ou texto" />
            </div>
          </div>
          <div class="row g-2 align-items-center">
            <div class="col-auto small text-muted">Estilo:</div>
            <div class="col-auto">
              <input type="color" class="form-control form-control-color form-control-sm" v-model="conditionalForm.bgColor" title="Cor de fundo" />
            </div>
            <div class="col-auto">
              <input type="color" class="form-control form-control-color form-control-sm" v-model="conditionalForm.textColor" title="Cor do texto" />
            </div>
            <div class="col-auto form-check form-check-inline">
              <input class="form-check-input" type="checkbox" v-model="conditionalForm.bold" id="cf-bold">
              <label class="form-check-label" for="cf-bold">Negrito</label>
            </div>
            <div class="col-auto form-check form-check-inline">
              <input class="form-check-input" type="checkbox" v-model="conditionalForm.italic" id="cf-italic">
              <label class="form-check-label" for="cf-italic">Itálico</label>
            </div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between">
          <button class="btn btn-outline-danger btn-sm" @click="clearConditionalForSelection">Limpar regras da seleção</button>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" @click="showConditionalModal=false">Cancelar</button>
            <button class="btn btn-primary btn-sm" @click="applyConditionalFormatting">Aplicar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Cores Alternadas -->
    <div v-if="showAlternatingModal" class="modal-overlay" @mousedown.self="showAlternatingModal=false">
      <div class="modal-card">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <strong>Cores alternadas</strong>
          <button class="btn-close" @click="showAlternatingModal=false" aria-label="Fechar"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2 align-items-center mb-2">
            <div class="col-auto small text-muted">Cores:</div>
            <div class="col-auto"><input type="color" class="form-control form-control-color form-control-sm" v-model="alternatingForm.color1" /></div>
            <div class="col-auto"><input type="color" class="form-control form-control-color form-control-sm" v-model="alternatingForm.color2" /></div>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" v-model="alternatingForm.hasHeader" id="alt-hdr">
            <label class="form-check-label" for="alt-hdr">Primeira linha é cabeçalho</label>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between">
          <button class="btn btn-outline-danger btn-sm" @click="clearAlternatingForSelection">Remover alternância da seleção</button>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" @click="showAlternatingModal=false">Cancelar</button>
            <button class="btn btn-primary btn-sm" @click="applyAlternatingColors">Aplicar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer da Planilha - Fixed no Bottom -->
    <footer class="sheet-footer-fixed bg-light border-top py-2">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col-md-6">
            <small class="text-muted">
              <span class="me-2">💾</span>
              Salvamento automático ativado
            </small>
          </div>
          <div class="col-md-6 text-md-end">
            <small class="text-muted">
              Último salvamento: {{ lastSaveTime }}
              <span class="ms-3">Σ {{ selectionStats.sum }} | média {{ selectionStats.avg }} | n={{ selectionStats.count }}</span>
            </small>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import Handsontable from 'handsontable'
import { registerAllModules } from 'handsontable/registry'
import { HyperFormula } from 'hyperformula'
import 'handsontable/dist/handsontable.full.css'

// Registrar todos os módulos (plugins) do Handsontable, incluindo customBorders/mergeCells/etc.
registerAllModules()

// Aliases de funções PT-BR para HyperFormula
const ptBrFunctions: Record<string, string> = {
  SOMA: 'SUM',
  MÉDIA: 'AVERAGE',
  MINIMO: 'MIN',
  MÍNIMO: 'MIN',
  MAXIMO: 'MAX',
  MÁXIMO: 'MAX',
  CONTAR: 'COUNT',
  CONTSE: 'COUNTIF',
  'CONT.SE': 'COUNTIF',
  SE: 'IF',
  E: 'AND',
  OU: 'OR',
  'NÃO': 'NOT',
  CONCATENAR: 'CONCAT',
  TEXTO: 'TEXT',
  PROCV: 'VLOOKUP',
  PROCH: 'HLOOKUP',
  HOJE: 'TODAY',
  AGORA: 'NOW',
  ARRED: 'ROUND',
  ARREDONDAR: 'ROUND',
  ABS: 'ABS',
  MAIOR: 'LARGE',
  MENOR: 'SMALL',
  SUBSTITUIR: 'SUBSTITUTE',
  'EXT.TEXTO': 'MID',
  ESQUERDA: 'LEFT',
  DIREITA: 'RIGHT',
  'NÚM.CARACT': 'LEN',
  'NÚMERO': 'VALUE',
  VALOR: 'VALUE',
  SOMASE: 'SUMIF',
  'SOMA.SE': 'SUMIF',
}
// Estender funções PT-BR adicionais
Object.assign(ptBrFunctions, {
  'CONT.SES': 'COUNTIFS',
  CONTSES: 'COUNTIFS',
  'SOMASES': 'SUMIFS',
  'MEDIASE': 'AVERAGEIF',
  'MÉDIASE': 'AVERAGEIF',
  'MÉDIASES': 'AVERAGEIFS',
  'MEDIASES': 'AVERAGEIFS'
})

type CustomMeta = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: 'left'|'center'|'right'
  textColor?: string
  bgColor?: string
  format?: 'general'|'currency'|'number'|'percent'
  decimals?: number
  type?: 'text'|'numeric'|'checkbox'|'dropdown'
  source?: string[]
  strict?: boolean
  borders?: any
  conditional?: any[]
  alternating?: { groupId: string } | undefined
}

// Lista de funções incluindo novas desde o início
const fnListPTBR = ['SOMA','MÉDIA','MINIMO','MÍNIMO','MAXIMO','MÁXIMO','CONTAR','CONTSE','SOMASE','SE','E','OU','NÃO','CONCATENAR','TEXTO','PROCV','PROCH','HOJE','AGORA','ARRED','ARREDONDAR','ABS','MAIOR','MENOR','SUBSTITUIR','EXT.TEXTO','ESQUERDA','DIREITA','NÚM.CARACT','NÚMERO','VALOR','CONT.SES','CONTSES','SOMASES','MEDIASE','MÉDIASE','MÉDIASES','MEDIASES']

const appVersion = ref((import.meta as any).env?.VITE_APP_VERSION || '')
const debugLog = ref(false)
function toggleLog(){ debugLog.value = !debugLog.value }
function logDbg(...args:any[]){ if (debugLog.value) { try { console.debug('[sheets-debug]', ...args) } catch {} } }
function reapplyAllBorders(){
  if (!hot.value) return
  const rows = hot.value.countRows(); const cols = hot.value.countCols()
  const plugin: any = (hot.value as any).getPlugin?.('customBorders')
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const meta = (hot.value as any).getCellMeta(r,c) || {}
    const b = meta.borders
    if (b && plugin?.setBorders) {
      const cfg: any = {}
      if (b.top) cfg.top = b.top
      if (b.bottom) cfg.bottom = b.bottom
      if (b.left) cfg.left = b.left
      if (b.right) cfg.right = b.right
      if (Object.keys(cfg).length) {
        try { plugin.setBorders([{row:r,col:c,row2:r,col2:c}], cfg) } catch {}
      }
    }
  }
  try { hot.value.render() } catch {}
  restoreSelection()
}

const hot = ref<Handsontable | null>(null)
const data = ref(
  Array.from({ length: 200 }, () => Array(26).fill(''))
)
const autoSaveInterval = ref<number | null>(null)
const statusMessage = ref('')
const lastSaveTime = ref('Nunca')
const currentSelection = ref<number[] | null>(null)
const preserveSelection = ref(false) // Flag para preservar seleção em cliques fora da tabela
// Flag global para sabermos quando cliques na UI (toolbar/formula/tabs) devem preservar a seleção do grid
const interactingWithToolbar = ref(false)
const selectionStats = ref({ sum: 0, count: 0, avg: 0 })
const formulaValue = ref('')
const activeSheetId = ref('default')
const sheetsList = ref<string[]>([])
const fixedRowsTop = ref(0)
const fixedColumnsLeft = ref(0)
const csvInputRef = ref<HTMLInputElement | null>(null)
const formulaInputRef = ref<HTMLInputElement | null>(null)
const isEditingFormula = ref(false)
let formulaBlurTimer: any = null
const borderWidth = ref<number>(1)
const borderColor = ref<string>('#000000')

// Autocomplete em-célula e overlay de intervalo
const fnSuggest = ref<{show: boolean, items: string[], index: number, top: number, left: number, editorCell?: {row:number,col:number}}>(
  { show: false, items: [], index: 0, top: 0, left: 0 }
)
const rangeOverlay = ref<{show:boolean, top:number, left:number, width:number, height:number}>({ show:false, top:0, left:0, width:0, height:0 })

// Estado para seleção de intervalo enquanto edita dentro da célula
let inCellRefSpan: { start:number, end:number } | null = null
let inCellEditorActive = false
// Estado para arraste manual de intervalo em edição dentro da célula
let formulaDragActive = false
let formulaDragAnchor: { row:number, col:number } | null = null


// Menus de dropdown (cores e borda)
const showTextColorMenu = ref(false)
const showBgColorMenu = ref(false)
const showBorderMenu = ref(false)

const standardPalette: string[] = ['#000000','#7f7f7f','#ffffff','#ff0000','#ffa500','#ffff00','#00ff00','#00b050','#00b0f0','#0000ff','#7030a0']
const basePalette: string[] = [
  '#000000','#404040','#7f7f7f','#bfbfbf','#d9d9d9','#efefef','#ffffff',
  '#ffebee','#ffcdd2','#ef9a9a','#e57373','#ef5350','#f44336','#d32f2f','#b71c1c',
  '#fff3e0','#ffe0b2','#ffcc80','#ffb74d','#ffa726','#ff9800','#f57c00','#e65100',
  '#fffde7','#fff9c4','#fff59d','#fff176','#ffee58','#ffeb3b','#fbc02d','#f57f17',
  '#f1f8e9','#dcedc8','#c5e1a5','#aed581','#9ccc65','#8bc34a','#689f38','#33691e',
  '#e0f7fa','#b2ebf2','#80deea','#4dd0e1','#26c6da','#00bcd4','#0097a7','#006064',
  '#e3f2fd','#bbdefb','#90caf9','#64b5f6','#42a5f5','#2196f3','#1976d2','#0d47a1',
  '#ede7f6','#d1c4e9','#b39ddb','#9575cd','#7e57c2','#673ab7','#5e35b1','#311b92'
]

function closeAllMenus(){ showTextColorMenu.value=false; showBgColorMenu.value=false; showBorderMenu.value=false }
function onToolbarMouseDown(){
  // Sinaliza que um clique começou na toolbar/formula/tabs e captura a seleção atual do HOT
  interactingWithToolbar.value = true
  setTimeout(() => { interactingWithToolbar.value = false }, 200) // janela curta
  if (!hot.value) return
  try {
    const sel = hot.value.getSelectedLast?.() || hot.value.getSelected?.()?.[0]
    if (sel && Array.isArray(sel) && sel.length >= 4) {
      currentSelection.value = normalizeRange(sel[0], sel[1], sel[2], sel[3])
    }
  } catch {}
}
function toggleTextColorMenu(){
  showTextColorMenu.value=!showTextColorMenu.value;
  showBgColorMenu.value=false;
  showBorderMenu.value=false
}
function toggleBgColorMenu(){
  showBgColorMenu.value=!showBgColorMenu.value;
  showTextColorMenu.value=false;
  showBorderMenu.value=false
}
function toggleBorderMenu(){
  // Preservar seleção atual antes de abrir o menu
  if (!showBorderMenu.value && hot.value) {
    try {
      const selected = hot.value.getSelectedLast?.() || hot.value.getSelected?.()?.[0]
      if (selected && Array.isArray(selected) && selected.length >= 4) {
        currentSelection.value = normalizeRange(selected[0], selected[1], selected[2], selected[3])
      }
    } catch {}
  }
  showBorderMenu.value=!showBorderMenu.value;
  showTextColorMenu.value=false;
  showBgColorMenu.value=false
}function applyTextColor(color?: string){
  applyMetaToSelection((m)=>({ ...m, textColor: color }))
  showTextColorMenu.value=false
}
function applyBgColor(color?: string){
  // Se não houver seleção registrada, tenta pegar a seleção atual do HOT
  if (!currentSelection.value && hot.value) {
    try {
      const sel = (hot.value.getSelectedLast?.() || hot.value.getSelected?.() || [])[0]
      if (sel && Array.isArray(sel) && sel.length >= 4) currentSelection.value = normalizeRange(sel[0], sel[1], sel[2], sel[3])
    } catch {}
  }
  applyMetaToSelection((m)=>({ ...m, bgColor: color }))
  showBgColorMenu.value=false
}
function reapplyBordersFromMetaRange(r1: number, c1: number, r2: number, c2: number) {
  if (!hot.value) return
  const plugin: any = (hot.value as any).getPlugin?.('customBorders')
  if (!plugin?.setBorders) return
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) continue
      const meta = (hot.value as any).getCellMeta(r, c) || {}
      const b: any = meta.borders
      if (!b) continue
      const cfg: any = {}
      if (b.top) cfg.top = { width: b.top.width || 1, color: b.top.color || '#000' }
      if (b.bottom) cfg.bottom = { width: b.bottom.width || 1, color: b.bottom.color || '#000' }
      if (b.left) cfg.left = { width: b.left.width || 1, color: b.left.color || '#000' }
      if (b.right) cfg.right = { width: b.right.width || 1, color: b.right.color || '#000' }
      if (Object.keys(cfg).length) {
        try { plugin.setBorders([{ row: r, col: c, row2: r, col2: c }], cfg) } catch {}
      }
    }
  }
}

function setBorderWidth(n: number){
  borderWidth.value = Math.max(1, Math.min(20, n))
  // Atualiza bordas existentes na seleção com a nova espessura
  if (!hot.value) return
  if (!currentSelection.value) {
    try {
      const sel = (hot.value.getSelectedLast?.() || hot.value.getSelected?.() || [])[0]
      if (sel && Array.isArray(sel) && sel.length >= 4) currentSelection.value = normalizeRange(sel[0], sel[1], sel[2], sel[3])
    } catch {}
  }
  if (!currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  let any = false
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) continue
      const meta = (hot.value as any).getCellMeta(r, c) || {}
      if (!meta.borders) continue
      any = true
      const b = { ...(meta.borders || {}) }
      for (const side of ['top','bottom','left','right'] as const) {
        if ((b as any)[side]) (b as any)[side].width = borderWidth.value
      }
      ;(hot.value as any).setCellMeta(r, c, 'borders', b)
    }
  }
  if (any) { reapplyBordersFromMetaRange(r1, c1, r2, c2); try { hot.value?.render() } catch {}; restoreSelection() }
}
function onBorderWidthInput(){
  // Aplica imediatamente a espessura escolhida às bordas existentes no range
  setBorderWidth(borderWidth.value)
}
function setBorderColor(c: string){
  borderColor.value = c
  // Atualiza bordas existentes na seleção com a nova cor
  if (!hot.value) return
  if (!currentSelection.value) {
    try {
      const sel = (hot.value.getSelectedLast?.() || hot.value.getSelected?.() || [])[0]
      if (sel && Array.isArray(sel) && sel.length >= 4) currentSelection.value = normalizeRange(sel[0], sel[1], sel[2], sel[3])
    } catch {}
  }
  if (!currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  let any = false
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) continue
      const meta = (hot.value as any).getCellMeta(r, c) || {}
      if (!meta.borders) continue
      any = true
      const b = { ...(meta.borders || {}) }
      for (const side of ['top','bottom','left','right'] as const) {
        if ((b as any)[side]) (b as any)[side].color = borderColor.value
      }
      ;(hot.value as any).setCellMeta(r, c, 'borders', b)
    }
  }
  if (any) { reapplyBordersFromMetaRange(r1, c1, r2, c2); try { hot.value?.render() } catch {}; restoreSelection() }
}
function applyBorderMode(mode: BorderMode){
  try { console.debug('[sheets] applyBorderMode', mode) } catch {}

  // Garantir que temos uma seleção válida antes de aplicar bordas
  if (!hot.value) return
  if (!currentSelection.value) {
    try {
      const selected = hot.value.getSelectedLast?.() || hot.value.getSelected?.()?.[0]
      if (selected && Array.isArray(selected) && selected.length >= 4) {
        currentSelection.value = normalizeRange(selected[0], selected[1], selected[2], selected[3])
      }
    } catch {}
  }

  if (!currentSelection.value) {
    updateStatus('Selecione uma ou mais células para aplicar bordas')
    setTimeout(() => updateStatus(''), 2000)
    return
  }

  // feedback rápido caso o plugin não esteja disponível (seguiremos com fallback via CSS)
  try {
    const plugin: any = (hot.value as any)?.getPlugin?.('customBorders')
    if (!plugin || !plugin.setBorders) {
      updateStatus('Aplicando bordas (modo compatibilidade)')
      setTimeout(() => updateStatus(''), 1200)
    }
  } catch {}

  // Salvar seleção antes de aplicar
  const savedSelection = [...currentSelection.value] as [number, number, number, number]

  setBorders(mode)

  // Restaurar seleção após aplicar bordas
  setTimeout(() => {
    if (hot.value && savedSelection) {
      try {
        hot.value.selectCell(savedSelection[0], savedSelection[1], savedSelection[2], savedSelection[3])
        currentSelection.value = savedSelection
      } catch {}
    }
  }, 50)

  // fechar o menu para deixar claro que a ação foi aplicada
  showBorderMenu.value = false
}

// ===== Formatação Condicional e Cores Alternadas =====
const showConditionalModal = ref(false)
const showAlternatingModal = ref(false)
const conditionalForm = ref({ type: 'greaterThan', value: '', value2: '', bgColor: '#fff3cd', textColor: '#000000', bold: false, italic: false })
const alternatingForm = ref({ color1: '#f9fafb', color2: '#ffffff', hasHeader: false })

function openConditionalFormatting(){ showConditionalModal.value = true; closeAllMenus() }
function openAlternatingColors(){ showAlternatingModal.value = true; closeAllMenus() }

function applyConditionalFormatting(){
  if (!hot.value || !currentSelection.value) return
  const [r1,c1,r2,c2] = normalizeRange(...currentSelection.value as [number,number,number,number])
  const rule = { ...conditionalForm.value }
  for (let r=r1;r<=r2;r++){
    for (let c=c1;c<=c2;c++){
      const meta = hot.value.getCellMeta(r,c) as CustomMeta & any
      const arr = Array.isArray(meta.conditional) ? meta.conditional : []
      arr.push(rule)
      hot.value.setCellMeta(r,c,'conditional',arr)
    }
  }
  if (hot.value) hot.value.render(); restoreSelection(); showConditionalModal.value=false
}
function clearConditionalForSelection(){
  if (!hot.value || !currentSelection.value) return
  const [r1,c1,r2,c2] = normalizeRange(...currentSelection.value as [number,number,number,number])
  for (let r=r1;r<=r2;r++) for (let c=c1;c<=c2;c++) hot.value!.setCellMeta(r,c,'conditional',undefined)
  if (hot.value) hot.value.render(); restoreSelection()
}

function applyAlternatingColors(){
  if (!hot.value || !currentSelection.value) return
  const [r1,c1,r2,c2] = normalizeRange(...currentSelection.value as [number,number,number,number])
  const groupId = `alt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
  const cfg = { ...alternatingForm.value, groupId }
  for (let r=r1;r<=r2;r++){
    for (let c=c1;c<=c2;c++){
      hot.value!.setCellMeta(r,c,'alternating',{ groupId })
      // guardamos config por grupo no meta da 1ª célula do recorte
    }
  }
  // guarda config no objeto global em window para não inflar cada célula
  ;(window as any).__pvAltGroups = (window as any).__pvAltGroups || {}
  ;(window as any).__pvAltGroups[groupId] = { r1,c1,r2,c2, cfg }
  if (hot.value) hot.value.render(); restoreSelection(); showAlternatingModal.value=false
}
function clearAlternatingForSelection(){
  if (!hot.value || !currentSelection.value) return
  const [r1,c1,r2,c2] = normalizeRange(...currentSelection.value as [number,number,number,number])
  for (let r=r1;r<=r2;r++) for (let c=c1;c<=c2;c++) hot.value!.setCellMeta(r,c,'alternating',undefined)
  if (hot.value) hot.value.render(); restoreSelection()
}

// Custom renderer aplica meta de estilo/formatos
const customRenderer = function (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: any, value: any, cellProperties: any) {
  // Usa o renderer de texto padrão e aplica estilos via meta (vindo de cellProperties)
  // @ts-ignore
  Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
  const meta = (cellProperties || {}) as CustomMeta & any
  // Reset inline styles applied previously
  td.style.fontWeight = meta.bold ? '700' : ''
  td.style.fontStyle = meta.italic ? 'italic' : ''
  td.style.textDecoration = meta.underline ? 'underline' : ''
  td.style.textAlign = meta.align ? (meta.align === 'left' ? 'left' : meta.align === 'center' ? 'center' : 'right') : ''
  td.style.color = meta.textColor || ''
  td.style.backgroundColor = meta.bgColor || ''

  // Fallback de bordas via CSS inline (além do customBorders do plugin)
  try {
    const b: any = (meta as any).borders
    if (b) {
      if (b.top) td.style.setProperty('border-top', `${b.top.width || 1}px solid ${b.top.color || '#000'}`, 'important')
      else td.style.removeProperty('border-top')
      if (b.bottom) td.style.setProperty('border-bottom', `${b.bottom.width || 1}px solid ${b.bottom.color || '#000'}`, 'important')
      else td.style.removeProperty('border-bottom')
      if (b.left) td.style.setProperty('border-left', `${b.left.width || 1}px solid ${b.left.color || '#000'}`, 'important')
      else td.style.removeProperty('border-left')
      if (b.right) td.style.setProperty('border-right', `${b.right.width || 1}px solid ${b.right.color || '#000'}`, 'important')
      else td.style.removeProperty('border-right')
    } else {
      // não força bordas quando não há meta
      td.style.removeProperty('border-top')
      td.style.removeProperty('border-right')
      td.style.removeProperty('border-bottom')
      td.style.removeProperty('border-left')
    }
  } catch {}

  // Aplicar cores alternadas (sobrepõe fundo, mas não texto/estilo já definidos por meta explícito)
  try {
    const alt = meta.alternating
    if (alt && (window as any).__pvAltGroups) {
      const g = (window as any).__pvAltGroups[alt.groupId]
      if (g) {
        const { r1,c1,r2,c2, cfg } = g
        if (row>=r1 && row<=r2 && col>=c1 && col<=c2) {
          const headerAdj = cfg.hasHeader ? 1 : 0
          const idx = (row - r1 - headerAdj)
          if (idx >= 0) {
            const use1 = idx % 2 === 0
            const bg = use1 ? cfg.color1 : cfg.color2
            if (!meta.bgColor) td.style.backgroundColor = bg
          }
        }
      }
    }
  } catch {}

  // Aplicar formatação condicional (tem precedência sobre alternadas e meta simples)
  try {
    const rules = Array.isArray(meta.conditional) ? meta.conditional : []
    if (rules.length) {
      const raw = value
      for (const r of rules) {
        if (passesCondition(raw, r)) {
          if (r.bgColor) td.style.backgroundColor = r.bgColor
          if (r.textColor) td.style.color = r.textColor
          if (r.bold) td.style.fontWeight = '700'
          if (r.italic) td.style.fontStyle = 'italic'
          break
        }
      }
    }
  } catch {}

  // Formatação numérica
  if (meta.format && value !== null && value !== undefined && value !== '') {
    const decimals = typeof meta.decimals === 'number' ? meta.decimals : 2
    let num: number | null = null
    if (typeof value === 'number') num = value
    else if (typeof value === 'string') {
      const v = value.replace(/\./g, '').replace(/,/g, '.')
      const parsed = Number(v)
      if (!Number.isNaN(parsed)) num = parsed
    }
    if (num !== null) {
      let formatted = ''
      try {
        if (meta.format === 'currency') {
          formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
        } else if (meta.format === 'percent') {
          formatted = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
        } else if (meta.format === 'number') {
          formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)
        }
      } catch {}
      if (formatted) td.textContent = formatted
    }
  }
}

function passesCondition(raw: any, r: any): boolean {
  const num = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw.replace(/\./g,'').replace(/,/g,'.')) : NaN)
  const s = (raw==null?'':String(raw)).toLowerCase()
  switch(r.type){
    case 'greaterThan': return !Number.isNaN(num) && num > Number(r.value)
    case 'lessThan': return !Number.isNaN(num) && num < Number(r.value)
    case 'equalTo': return (!Number.isNaN(num) && num === Number(r.value)) || s === String(r.value).toLowerCase()
    case 'between': {
      const a = Number(r.value), b = Number(r.value2)
      return !Number.isNaN(num) && num >= Math.min(a,b) && num <= Math.max(a,b)
    }
    case 'textContains': return s.includes(String(r.value).toLowerCase())
    case 'isEmpty': return s === ''
    case 'notEmpty': return s !== ''
    default: return false
  }
}

onMounted(() => {
  const container = document.getElementById('hot-container')
  if (container) {
  // Flag para saber se estamos arrastando seleção (mantém durante mousedown)
  window.addEventListener('mousedown', (e) => { (window as any).__hotMouseDown = true })
  window.addEventListener('mouseup', (e) => { (window as any).__hotMouseDown = false })

  // REMOVIDO: Listeners que interferiam com seleção múltipla
  // Os listeners de mousedown no container foram removidos para permitir seleção múltipla natural

  window.addEventListener('mouseup', (e) => {
    if (!formulaDragActive) return
    formulaDragActive = false
    try {
      const editorEl = document.querySelector('.handsontableInput') as HTMLTextAreaElement | null
      if (editorEl && document.activeElement === editorEl) {
        const v = editorEl.value
        const opens = (v.match(/\(/g) || []).length
        const closes = (v.match(/\)/g) || []).length
        if (opens > closes) {
          editorEl.value = v + ')'
          const pos = editorEl.value.length
          editorEl.setSelectionRange(pos, pos)
          editorEl.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    } catch {}
  })

    const getGridHeight = () => {
      try {
        const sc = document.querySelector('.sheet-container') as HTMLElement | null
        const top = sc ? sc.getBoundingClientRect().top : 0
        const available = window.innerHeight - top - 90 /* espaço p/ footer/status */
        return Math.max(360, Math.floor(available))
      } catch { return 480 }
    }
    const initialHeight = getGridHeight()
  try { container.style.height = initialHeight + 'px' } catch {}
    hot.value = new Handsontable(container, {
      data: data.value,
      // Headers simples e padrão para reduzir riscos de crash
      rowHeaders: true,
      colHeaders: true,
      height: initialHeight,
      minRows: 200,
      minCols: 26,
      stretchH: 'all',
      // Menu de contexto básico (sem customizações por enquanto)
      contextMenu: true,
      // Desativar temporariamente fórmulas e menus avançados até estabilizar
      // formulas: { engine: HyperFormula },
      editor: 'text',
      readOnly: false,
      // Seleção básica e estável - CONFIGURAÇÕES CORRIGIDAS
      selectionMode: 'range',
      fillHandle: true,
      dragToScroll: true,
      disableVisualSelection: false,
      fragmentSelection: true,
      // Interações manuais habilitadas para melhor experiência
      manualColumnMove: true,
      manualRowMove: true,
      manualColumnResize: true,
      manualRowResize: true,
      // mergeCells: true,
      customBorders: true,
      undo: true,
      // allowHtml: false,
      // autoWrapRow: true,
      // autoWrapCol: true,
      // dropdownMenu: true,
      // filters: true,
  // Evita perder a seleção ao clicar na UI do app (toolbar, formula bar, abas)
  outsideClickDeselects: (evt: any) => {
    try {
      const t = (evt?.target as HTMLElement | null)
      if (t && (t.closest('.toolbar') || t.closest('.formula-bar') || t.closest('.sheet-tabs') || t.closest('.navbar'))) return false
      // Se estamos no pequeno intervalo de interação com toolbar, não deseleciona
      if (interactingWithToolbar.value) return false
    } catch {}
    return true
  },
      cells: () => {
        // Não acessar getCellMeta aqui para evitar recursão (extendCellMeta -> cells -> getCellMeta)
        // Apenas aplicamos renderer; o Handsontable injeta cellProperties com meta já existente
        const cell: any = { renderer: customRenderer }
        return cell
      },
      afterSelection: (row, col, row2, col2, preventScrolling, selectionLayerLevel) => {
  logDbg('afterSelection', {row,col,row2,col2, isEditingFormula: isEditingFormula.value, selectionLayerLevel})

        // Suporte para seleção múltipla/fragmentada
        if (selectionLayerLevel !== undefined && selectionLayerLevel > 0) {
          // Esta é uma seleção adicional (Ctrl+clique), apenas calcule estatísticas
          computeSelectionStats()
          return
        }

        // Normaliza a seleção para garantir r1<=r2 e c1<=c2
        const [nr1, nc1, nr2, nc2] = normalizeRange(row, col, row2, col2)

        // Salvar seleção atual para operações posteriores
        currentSelection.value = [nr1, nc1, nr2, nc2]

        // Calcular estatísticas da seleção
        computeSelectionStats()

        // Se estamos editando a fórmula, inserir referência e destacar intervalo, sem sobrescrever o input
        if (isEditingFormula.value) {
          try {
            insertSelectionIntoFormula(nr1, nc1, nr2, nc2)
            highlightRange(nr1, nc1, nr2, nc2)
            // Manter o foco no campo de fórmula
            setTimeout(() => {
              if (formulaInputRef.value) {
                formulaInputRef.value.focus()
              }
            }, 10)
          } catch {}
          return
        }

        // Caso esteja editando dentro da célula com fórmula, lidar com referências
        try {
          const editorEl = document.querySelector('.handsontableInput') as HTMLTextAreaElement | null
          if (editorEl && document.activeElement === editorEl) {
            const fullVal = editorEl.value || ''
            const isFormula = fullVal.trimStart().startsWith('=')
            if (!isFormula) {
              // Não intercepta seleção normal; apenas limpa overlay se algum restou
              hideRangeOverlay()
              inCellRefSpan = null
              return // Permite seleção normal sem interferência
            } else {
              const ref = rangeToRef(nr1, nc1, nr2, nc2)
              let val = fullVal
              const selectingWithMouse = (window as any).__hotMouseDown === true
              const kb = (window as any).__lastKb || {}
              const shiftHeld = !!kb.shiftKey
              const ctrlHeld = !!kb.ctrlKey || !!kb.metaKey
              // Garante sempre referência completa (intervalo) durante drag
              // 1. Durante o arrasto: atualiza o intervalo atual (inCellRefSpan) se existir
              // 2. Primeiro intervalo: insere e abre/fecha parêntese se preciso
              // 3. Novo clique após soltar mouse: Ctrl adiciona, Shift expande último, clique simples substitui último
              if (inCellRefSpan && selectingWithMouse) {
                // Atualizando o mesmo intervalo durante o drag
                val = val.slice(0, inCellRefSpan.start) + ref + val.slice(inCellRefSpan.end)
                editorEl.value = val
                const pos = inCellRefSpan.start + ref.length
                editorEl.setSelectionRange(pos, pos)
              } else if (!inCellRefSpan) {
                // Inserindo primeiro intervalo desta etapa
                const caret = editorEl.selectionStart ?? val.length
                const before = val.slice(0, caret)
                const last = before.slice(-1)
                const needsSep = before && !/[+\-*/^(,]/.test(last) && !before.trim().endsWith('=') && !before.trim().endsWith('(')
                const sep = needsSep ? ',' : ''
                // Detecta se é provável que usuário iniciou função e esqueceu parêntese de abertura (ex: =SOMA )
                const opened = (before.match(/\(/g) || []).length
                const closed = (before.match(/\)/g) || []).length
                const missingOpen = opened === 0 && /=[A-ZÀ-ÚA-Z\.]+$/i.test(before.trim())
                let prefix = ''
                if (missingOpen) {
                  prefix = '('
                }
                let insert = sep + prefix + ref
                editorEl.value = before + insert + val.slice(caret)
                // Auto fecha parêntese se existir mais '(' que ')' após inserir primeiro intervalo
                let appendedClose = false
                const afterInsert = editorEl.value
                const o2 = (afterInsert.match(/\(/g) || []).length
                const c2 = (afterInsert.match(/\)/g) || []).length
                if (o2 > c2) {
                  editorEl.value = afterInsert + ')'
                  appendedClose = true
                }
                const startRef = before.length + sep.length + prefix.length
                const endRef = startRef + ref.length
                editorEl.setSelectionRange(endRef, endRef)
                inCellRefSpan = { start: startRef, end: endRef }
              } else if (!selectingWithMouse) {
                // Novo clique após soltar mouse: depende de Shift/Ctrl
                const caret = editorEl.selectionStart ?? val.length
                const before = val.slice(0, caret)
                // Shift: expandir último intervalo (não adiciona)
                if (shiftHeld && inCellRefSpan) {
                  // substitui último ref pelo novo (expansão)
                  val = val.slice(0, inCellRefSpan.start) + ref + val.slice(inCellRefSpan.end)
                  editorEl.value = val
                  inCellRefSpan.end = inCellRefSpan.start + ref.length
                  editorEl.setSelectionRange(inCellRefSpan.end, inCellRefSpan.end)
                } else {
                  // Ctrl adiciona novo intervalo; clique simples substitui o último
                  if (ctrlHeld) {
                    const needComma = !before.trim().endsWith('=') && !before.trim().endsWith('(') && !before.endsWith(',')
                    const prefix = needComma ? ',' : ''
                    const insert = prefix + ref
                    editorEl.value = before + insert + val.slice(caret)
                    const startRef = before.length + prefix.length
                    const endRef = startRef + ref.length
                    editorEl.setSelectionRange(endRef, endRef)
                    inCellRefSpan = { start: startRef, end: endRef }
                  } else if (inCellRefSpan) {
                    // substitui último intervalo existente (usuário quer alterar, não adicionar)
                    val = val.slice(0, inCellRefSpan.start) + ref + val.slice(inCellRefSpan.end)
                    editorEl.value = val
                    inCellRefSpan.end = inCellRefSpan.start + ref.length
                    editorEl.setSelectionRange(inCellRefSpan.end, inCellRefSpan.end)
                  }
                }
              }
              editorEl.dispatchEvent(new Event('input', { bubbles: true }))
              updateRangeOverlay(nr1, nc1, nr2, nc2)
              return
            }
          }
        } catch {}
        currentSelection.value = [nr1, nc1, nr2, nc2]
        computeSelectionStats()
        if (hot.value) {
          const v = hot.value.getDataAtCell(nr1, nc1)
          formulaValue.value = v == null ? '' : String(v)
        }
      },
      afterChange: () => {
        // Atualiza barra de fórmula e estatística sempre que houver mudança
        computeSelectionStats()
        if (hot.value && currentSelection.value) {
          const [r, c] = currentSelection.value
          const v = hot.value.getDataAtCell(r, c)
          formulaValue.value = v == null ? '' : String(v)
        }
      },
      beforeChange: (changes: any[]) => {
        try {
          if (!Array.isArray(changes)) return
          for (const ch of changes) {
            // ch = [row, prop/col, oldValue, newValue]
            const newVal = ch?.[3]
            if (typeof newVal === 'string' && newVal.trim().startsWith('=')) {
              const inner = newVal.trim().slice(1)
              ch[3] = '=' + translateFormulaPTBR(inner)
            }
          }
        } catch {}
      },
  afterBeginEditing: (row: number, col: number) => {
        // abrir autocomplete se começar com '='
        try {
          const editorEl = document.querySelector('.handsontableInput') as HTMLTextAreaElement | null
          if (!editorEl) return
          inCellEditorActive = true
          setTimeout(() => {
            const val = editorEl.value || ''
            handleEditorInput(row, col, editorEl, val)
            editorEl.addEventListener('input', onEditorInput as any)
            editorEl.addEventListener('keydown', onEditorKeydown as any)
          }, 0)
        } catch {}
      },
      afterOnCellMouseUp: () => {
        // Finaliza seleção drag dentro da célula
        inCellRefSpan = null
        try {
          const editorEl = document.querySelector('.handsontableInput') as HTMLTextAreaElement | null
          if (editorEl && document.activeElement === editorEl) {
            const v = editorEl.value
            if (v.trimStart().startsWith('=')) {
              const opens = (v.match(/\(/g) || []).length
              const closes = (v.match(/\)/g) || []).length
              if (opens > closes) {
                editorEl.value = v + ')'
                const pos = editorEl.value.length
                editorEl.setSelectionRange(pos, pos)
                editorEl.dispatchEvent(new Event('input', { bubbles: true }))
              }
            }
          }
        } catch {}
      },
  // Encerramento da edição será capturado via blur do editor e seleção posterior
      afterDeselect: () => {
        // Preservar seleção se há menus ativos ou se está editando fórmula
        const activeMenus = showTextColorMenu.value || showBgColorMenu.value || showBorderMenu.value
        const editingFormula = isEditingFormula.value

        // Só limpar seleção se não há menus ativos e não está editando fórmula
        if (!activeMenus && !editingFormula && !interactingWithToolbar.value) {
          currentSelection.value = null
          selectionStats.value = { sum: 0, count: 0, avg: 0 }
        }
      },
      licenseKey: 'non-commercial-and-evaluation'
    })

  // Não forçamos restauração de seleção para não atrapalhar o foco/edição

  // Atalho de salvar
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keydown', (e) => { (window as any).__lastKb = e })
  window.addEventListener('keyup', (e) => { (window as any).__lastKb = e })

  // Inicialização de abas
  initSheetsTabs()

  // Auto-save every 30 seconds (com tolerância a falta de servidor/conectividade)
    autoSaveInterval.value = setInterval(async () => {
      if (!hot.value) return
      const payload = buildSavePayload()
      try { localStorage.setItem('sheets-data', JSON.stringify(payload)) } catch {}
      // Só tenta servidor se estiver online; em falha silencie e mantém local
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const res = await fetch('/server/api/sheets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeSheetId.value, ...payload })
          })
          if (res.ok) {
            lastSaveTime.value = new Date().toLocaleTimeString()
          }
        }
      } catch {}
    }, 30000)
  }
  // Responsivo: atualizar altura ao redimensionar
  const onResize = () => {
    try {
      if (hot.value) {
        const sc = document.querySelector('.sheet-container') as HTMLElement | null
        const top = sc ? sc.getBoundingClientRect().top : 0
        const h = Math.max(360, Math.floor(window.innerHeight - top - 90))
        hot.value.updateSettings({ height: h })
      }
    } catch {}
  }
  window.addEventListener('resize', onResize)
  ;(window as any).__pvSheetsOnResize = onResize

  // REMOVIDO: Blocker que interferia com seleção múltipla
  // O blocker de mousedown foi removido para permitir seleção múltipla natural do Handsontable

  // Fallback: garantir um recálculo imediato de altura e render após montar
  setTimeout(() => {
    try {
      if (hot.value) {
        const sc = document.querySelector('.sheet-container') as HTMLElement | null
        const top = sc ? sc.getBoundingClientRect().top : 0
        const h = Math.max(360, Math.floor(window.innerHeight - top - 90))
        const el = document.getElementById('hot-container') as HTMLElement | null
        if (el) el.style.height = h + 'px'
        hot.value.updateSettings({ height: h })
  if (hot.value) hot.value.render()
      }
    } catch {}
  }, 0)

  // Fecha menus ao clicar fora dos dropdowns
  try {
    const closeMenus = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return

      // Fechar menus se clicou fora dos dropdowns
      if (!t.closest('.toolbar-dropdown')) {
        closeAllMenus()
      }
    }
    document.addEventListener('mousedown', closeMenus, true)
    ;(window as any).__pvSheetsCloseMenus = closeMenus
  } catch {}
})

onUnmounted(() => {
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value)
  }
  window.removeEventListener('keydown', onKeyDown)
  const onResize = (window as any).__pvSheetsOnResize
  if (onResize) window.removeEventListener('resize', onResize)
  const blocker = (window as any).__pvSheetsMouseBlocker
  if (blocker) document.removeEventListener('mousedown', blocker, true)
  const closeMenus = (window as any).__pvSheetsCloseMenus
  if (closeMenus) document.removeEventListener('mousedown', closeMenus, true)
})

const updateStatus = (message: string) => {
  statusMessage.value = message
}

const restoreSelection = () => {
  if (hot.value && currentSelection.value) {
    const [row, col, row2, col2] = currentSelection.value
    setTimeout(() => {
      if (hot.value && currentSelection.value) {
        hot.value.selectCell(row, col, row2, col2)
      }
    }, 10)
  }
}

// Normaliza a seleção garantindo r1<=r2 e c1<=c2
function normalizeRange(r1: number, c1: number, r2: number, c2: number): [number, number, number, number] {
  const nr1 = Math.min(r1, r2)
  const nr2 = Math.max(r1, r2)
  const nc1 = Math.min(c1, c2)
  const nc2 = Math.max(c1, c2)
  return [nr1, nc1, nr2, nc2]
}

const save = () => {
  if (hot.value) {
    const payload = buildSavePayload()
    localStorage.setItem('sheets-data', JSON.stringify(payload))
    // Enviar para servidor
    fetch('/server/api/sheets.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: activeSheetId.value, ...payload })
    }).then(res => res.json()).then(() => {
      updateStatus('Planilha salva com sucesso!')
      lastSaveTime.value = new Date().toLocaleTimeString()
      setTimeout(() => updateStatus(''), 3000)
    }).catch(() => {
      // Sem servidor: considera salvo localmente e segue sem ruído no console
      updateStatus('Salvo localmente (sem conexão com servidor)')
      lastSaveTime.value = new Date().toLocaleTimeString()
      setTimeout(() => updateStatus(''), 3000)
    })
  }
}

const load = () => {
  const saved = localStorage.getItem('sheets-data')
  if (saved && hot.value) {
    const parsed = JSON.parse(saved)
    if (parsed && parsed.data) {
      hot.value.loadData(parsed.data)
  applyLoadedMeta(parsed.meta || {}, parsed.altGroups || {}, parsed.conditional || {}, parsed.alternating || {})
    } else {
      hot.value.loadData(parsed)
    }
  } else {
    // Carregar do servidor
    fetch('/server/api/sheets.php?id=' + encodeURIComponent(activeSheetId.value))
      .then(res => res.json())
      .then(data => {
        if (data.success && hot.value) {
          if (data.data && data.data.data) {
            hot.value.loadData(data.data.data)
    applyLoadedMeta(data.data.meta || {}, data.data.altGroups || {}, data.data.conditional || {}, data.data.alternating || {})
            // Reaplicar merges se existirem
            if (Array.isArray(data.data.merges) && data.data.merges.length) {
              hot.value.updateSettings({ mergeCells: data.data.merges } as any)
            }
          } else {
            hot.value.loadData(data.data)
          }
        } else {
          console.log('No server data')
        }
      })
      .catch(() => { /* offline/indisponível: silencioso */ })
  }
}

const newSheet = () => {
  const base = 'Página'
  let idx = 1
  const current = new Set(sheetsList.value)
  while (current.has(`${base}${idx}`)) idx++
  const name = prompt('Nome da nova planilha:', `${base}${idx}`)
  if (!name) return
  if (!sheetsList.value.includes(name)) {
    sheetsList.value.push(name)
    saveSheetsTabs()
  }
  switchSheet(name)
}

// Utilitário para aplicar meta na seleção
function applyMetaToSelection(patch: (m: CustomMeta, row: number, col: number) => CustomMeta) {
  if (!hot.value || !currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const meta = hot.value.getCellMeta(r, c) as CustomMeta & any
      const next = patch({ ...meta }, r, c)
      Object.keys(next).forEach((k) => {
        // @ts-ignore
        hot.value!.setCellMeta(r, c, k, next[k as keyof CustomMeta])
      })
    }
  }
  if (hot.value) hot.value.render()
  restoreSelection()
}

// Atalhos de teclado
function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

// Funções de formatação
const formatBold = () => {
  if (!hot.value || !currentSelection.value) return
  const [r, c] = currentSelection.value
  const curr = hot.value.getCellMeta(r, c) as CustomMeta & any
  const newVal = !curr.bold
  applyMetaToSelection((m) => ({ ...m, bold: newVal }))
}

const formatItalic = () => {
  if (!hot.value || !currentSelection.value) return
  const [r, c] = currentSelection.value
  const curr = hot.value.getCellMeta(r, c) as CustomMeta & any
  const newVal = !curr.italic
  applyMetaToSelection((m) => ({ ...m, italic: newVal }))
}

const formatUnderline = () => {
  if (!hot.value || !currentSelection.value) return
  const [r, c] = currentSelection.value
  const curr = hot.value.getCellMeta(r, c) as CustomMeta & any
  const newVal = !curr.underline
  applyMetaToSelection((m) => ({ ...m, underline: newVal }))
}

const alignLeft = () => applyMetaToSelection((m) => ({ ...m, align: 'left' }))
const alignCenter = () => applyMetaToSelection((m) => ({ ...m, align: 'center' }))
const alignRight = () => applyMetaToSelection((m) => ({ ...m, align: 'right' }))

const setTextColor = (event: Event) => {
  const color = (event.target as HTMLInputElement).value
  applyMetaToSelection((m) => ({ ...m, textColor: color }))
}

const setBgColor = (event: Event) => {
  const color = (event.target as HTMLInputElement).value
  // Se por algum motivo currentSelection estiver nulo, tentar usar a seleção atual do HOT
  if (!currentSelection.value && hot.value) {
    try {
      const sel = (hot.value.getSelectedLast?.() || hot.value.getSelected?.() || [])[0]
      if (sel && Array.isArray(sel) && sel.length >= 4) {
        currentSelection.value = normalizeRange(sel[0], sel[1], sel[2], sel[3])
      }
    } catch {}
  }
  applyMetaToSelection((m) => ({ ...m, bgColor: color }))
}

const changeFormat = (event: Event) => {
  const format = (event.target as HTMLSelectElement).value as CustomMeta['format']
  applyMetaToSelection((m) => ({ ...m, format }))
}

const increaseDecimals = () => {
  applyMetaToSelection((m) => ({ ...m, decimals: Math.min(8, (m.decimals ?? 2) + 1) }))
}

const decreaseDecimals = () => {
  applyMetaToSelection((m) => ({ ...m, decimals: Math.max(0, (m.decimals ?? 2) - 1) }))
}

const insertRow = () => {
  if (hot.value && currentSelection.value) {
    const row = normalizeRange(...currentSelection.value as [number, number, number, number])[0]
    hot.value.alter('insert_row_below', row)
    setTimeout(() => {
      if (hot.value && currentSelection.value) {
        const [, c1, , c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
        currentSelection.value = [row + 1, c1, row + 1, c2]
  if (hot.value) hot.value.render()
        restoreSelection()
      }
    }, 10)
  }
}

const insertCol = () => {
  if (hot.value && currentSelection.value) {
    const col = normalizeRange(...currentSelection.value as [number, number, number, number])[1]
    hot.value.alter('insert_col_end', col)
    setTimeout(() => {
      if (hot.value && currentSelection.value) {
        const [r1, , r2] = normalizeRange(...currentSelection.value as [number, number, number, number])
        currentSelection.value = [r1, col + 1, r2, col + 1]
  if (hot.value) hot.value.render()
        restoreSelection()
      }
    }, 10)
  }
}

const deleteRow = () => {
  if (hot.value && currentSelection.value) {
    const row = currentSelection.value[0]
    hot.value.alter('remove_row', row)
    setTimeout(() => {
  if (hot.value) hot.value.render()
      restoreSelection()
    }, 10)
  }
}

const deleteCol = () => {
  if (hot.value && currentSelection.value) {
    const col = currentSelection.value[1]
    hot.value.alter('remove_col', col)
    setTimeout(() => {
  if (hot.value) hot.value.render()
      restoreSelection()
    }, 10)
  }
}

// Build payload com dados + meta
function buildSavePayload() {
  if (!hot.value) return { data: [] }
  const rows = hot.value.countRows()
  const cols = hot.value.countCols()
  const meta: Record<string, CustomMeta> = {}
  const keys: (keyof CustomMeta)[] = ['bold','italic','underline','align','textColor','bgColor','format','decimals','type','source','strict','borders'] as any
  const condMap: Record<string, any[]> = {}
  const altMap: Record<string, any> = {}
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const m = hot.value.getCellMeta(r, c) as CustomMeta & any
      const entry: CustomMeta = {}
      keys.forEach(k => {
        const v = (m as any)[k]
        if (v !== undefined && v !== null && v !== '') (entry as any)[k] = v
      })
      if (Array.isArray((m as any).conditional) && (m as any).conditional.length) condMap[`${r}:${c}`] = (m as any).conditional
      if ((m as any).alternating) altMap[`${r}:${c}`] = (m as any).alternating
      if (Object.keys(entry).length) meta[`${r}:${c}`] = entry
    }
  }
  // Tenta exportar merges
  let merges: any[] = []
  try {
    const plugin: any = (hot.value as any).getPlugin?.('mergeCells')
    if (plugin?.mergedCellsCollection?.mergedCells) {
      merges = plugin.mergedCellsCollection.mergedCells.map((m: any) => ({ row: m.row, col: m.col, rowspan: m.rowspan, colspan: m.colspan }))
    } else if (Array.isArray((hot.value as any).getSettings().mergeCells)) {
      merges = (hot.value as any).getSettings().mergeCells
    }
  } catch {}
  // salvar grupos alternados globais
  let altGroups = {}
  try { altGroups = (window as any).__pvAltGroups || {} } catch {}
  // Usar getSourceData() para preservar fórmulas originais
  return { data: hot.value.getSourceData(), meta, rows, cols, merges, conditional: condMap, alternating: altMap, altGroups }
}

function applyLoadedMeta(
  meta: Record<string, CustomMeta>,
  altGroups?: any,
  conditionalMap?: Record<string, any[]>,
  alternatingMap?: Record<string, any>
) {
  if (!hot.value) return
  Object.entries(meta).forEach(([key, m]) => {
    const [r, c] = key.split(':').map(Number)
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return
    Object.entries(m).forEach(([k, v]) => {
      // @ts-ignore
      hot.value!.setCellMeta(r, c, k, v)
    })
  })
  // Reaplicar bordas visuais a partir do meta, se houver
  try {
    const plugin: any = (hot.value as any).getPlugin?.('customBorders')
    if (plugin?.setBorders) {
      Object.entries(meta).forEach(([key, m]) => {
        if (!m || !m.borders) return
        const [r, c] = key.split(':').map(Number)
        if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return
        const b: any = m.borders as any
        const cfg: any = {}
        if (b.top) cfg.top = { width: b.top.width || 1, color: b.top.color || '#000' }
        if (b.bottom) cfg.bottom = { width: b.bottom.width || 1, color: b.bottom.color || '#000' }
        if (b.left) cfg.left = { width: b.left.width || 1, color: b.left.color || '#000' }
        if (b.right) cfg.right = { width: b.right.width || 1, color: b.right.color || '#000' }
        if (Object.keys(cfg).length) {
          try { plugin.setBorders([{ row: r, col: c, row2: r, col2: c }], cfg) } catch {}
        }
      })
    }
  } catch {}
  // Restaurar mapa de grupos alternados
  try { (window as any).__pvAltGroups = altGroups || {} } catch {}
  // Reaplicar mapas de formatação condicional e alternância, se fornecidos
  try {
    if (conditionalMap) {
      Object.entries(conditionalMap).forEach(([key, rules]) => {
        const [r, c] = key.split(':').map(Number)
        ;(hot.value as any).setCellMeta(r, c, 'conditional', Array.isArray(rules) ? rules : undefined)
      })
    }
    if (alternatingMap) {
      Object.entries(alternatingMap).forEach(([key, alt]) => {
        const [r, c] = key.split(':').map(Number)
        ;(hot.value as any).setCellMeta(r, c, 'alternating', alt)
      })
    }
  } catch {}
  if (hot.value) hot.value.render()
}

// Função simples de tradução de fórmulas (placeholder - pode ser expandida)
function translateFormulaPTBR(formula: string): string {
  // Por enquanto, apenas retorna a fórmula como está
  // Esta função pode ser expandida para traduzir nomes de funções
  return formula
}

function computeSelectionStats() {
  if (!hot.value) {
    selectionStats.value = { sum: 0, count: 0, avg: 0 }
    return
  }

  let sum = 0, count = 0

  try {
    // Tenta obter todas as seleções (múltiplas/fragmentadas)
    const selected = (hot.value as any).getSelected()
    if (selected && selected.length > 0) {
      // Processa todas as seleções
      selected.forEach((selection: number[]) => {
        const [r1, c1, r2, c2] = normalizeRange(selection[0], selection[1], selection[2], selection[3])
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const v = hot.value!.getDataAtCell(r, c)
            let num: number | null = null
            if (typeof v === 'number') num = v
            else if (typeof v === 'string') {
              const vv = v.replace(/\./g, '').replace(/,/g, '.')
              const parsed = Number(vv)
              if (!Number.isNaN(parsed)) num = parsed
            }
            if (num !== null) { sum += num; count++ }
          }
        }
      })
    } else if (currentSelection.value) {
      // Fallback para seleção única
      const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const v = hot.value.getDataAtCell(r, c)
          let num: number | null = null
          if (typeof v === 'number') num = v
          else if (typeof v === 'string') {
            const vv = v.replace(/\./g, '').replace(/,/g, '.')
            const parsed = Number(vv)
            if (!Number.isNaN(parsed)) num = parsed
          }
          if (num !== null) { sum += num; count++ }
        }
      }
    }
  } catch (error) {
    console.warn('Erro ao calcular estatísticas de seleção:', error)
  }

  const avg = count ? +(sum / count).toFixed(2) : 0
  selectionStats.value = { sum: +sum.toFixed(2), count, avg }
}

function applyFormulaValue() {
  if (!hot.value || !currentSelection.value) return
  let value = formulaValue.value
  // Traduzir funções PT-BR para EN
  if (typeof value === 'string' && value.startsWith('=')) {
    value = '=' + translateFormulaPTBR(value.slice(1))
  }
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      hot.value.setDataAtCell(r, c, value)
    }
  }
  if (hot.value) hot.value.render()
  restoreSelection()
}

// ===== Bordas (customBorders)
type BorderMode = 'all'|'outer'|'inner'|'top'|'bottom'|'left'|'right'|'none'
function setBorders(mode: BorderMode) {
  if (!hot.value) return
  // fallback para seleção atual do HOT se currentSelection estiver ausente
  if (!currentSelection.value) {
    try {
      const sel = (hot.value.getSelectedLast?.() || hot.value.getSelected?.() || [])[0]
      if (sel && Array.isArray(sel) && sel.length >= 4) currentSelection.value = normalizeRange(sel[0], sel[1], sel[2], sel[3])
    } catch {}
  }
  if (!currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  if (![r1,c1,r2,c2].every(v => Number.isFinite(v) && v >= 0)) return
  const plugin: any = (hot.value as any).getPlugin?.('customBorders')
  const width = Math.max(1, Math.min(20, borderWidth.value || 1))
  const color = borderColor.value || '#000000'
  const sideCfg = (side: 'top'|'bottom'|'left'|'right') => ({ [side]: { width, color } })

  // Helpers para persistir meta 'borders' por célula
  const setCellBorderMeta = (r: number, c: number, patch: any) => {
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return
    const meta = (hot.value as any).getCellMeta(r, c) || {}
    const existing = { ...(meta.borders || {}) }
    const next: any = { ...existing }
    // merge lado a lado sem perder espessura/cor existentes
    for (const side of ['top','bottom','left','right'] as const) {
      if (patch && patch[side]) {
        next[side] = { ...(existing as any)[side], ...patch[side] }
      }
    }
    ;(hot.value as any).setCellMeta(r, c, 'borders', next)
  }
  const clearCellBorderMeta = (r: number, c: number, sides?: Array<'top'|'bottom'|'left'|'right'>) => {
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return
    if (!sides || !sides.length) {
      ;(hot.value as any).setCellMeta(r, c, 'borders', undefined)
      return
    }
    const meta = (hot.value as any).getCellMeta(r, c) || {}
    const existing = { ...(meta.borders || {}) }
    for (const s of sides) delete (existing as any)[s]
    const hasAny = Object.keys(existing).length > 0
    ;(hot.value as any).setCellMeta(r, c, 'borders', hasAny ? existing : undefined)
  }

  const clearRangeBorders = () => {
    // Limpa visualmente (tenta diferentes formatos aceitos pela API)
    try { plugin?.clearBorders?.([{ row: r1, col: c1, row2: r2, col2: c2 }]) } catch {}
    try { plugin?.clearBorders?.([[r1, c1, r2, c2]]) } catch {}
    // fallback: limpar célula a célula
    if (plugin?.clearBorders) {
      try {
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            try { plugin.clearBorders([{ row: r, col: c, row2: r, col2: c }]) } catch {}
            try { plugin.clearBorders([[r, c, r, c]]) } catch {}
          }
        }
      } catch {}
    }
    // Limpa meta
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) continue
        ;(hot.value as any).setCellMeta(r, c, 'borders', undefined)
      }
    }
  }

  if (mode === 'none') { clearRangeBorders(); hot.value!.render(); return }

  // Mesmo se o plugin não existir, seguimos aplicando o meta para o fallback via CSS inline

  const apply = (rStart: number, cStart: number, rEnd: number, cEnd: number, cfg: any) => {
    if (![rStart,cStart,rEnd,cEnd].every(v => Number.isFinite(v) && v >= 0)) return
  try { plugin?.setBorders?.([{ row: rStart, col: cStart, row2: rEnd, col2: cEnd }], cfg) } catch {}
  try { plugin?.setBorders?.([[rStart, cStart, rEnd, cEnd]], cfg) } catch {}
  }

  // Não limpamos mais as bordas existentes para evitar que o usuário perca configurações já aplicadas
  // A limpeza só ocorre no modo 'none'. Para demais modos, as bordas são mescladas (merge) com o que já existe.

  if (mode === 'top') {
    for (let c = c1; c <= c2; c++) {
  try { plugin?.setBorders?.([{ row: r1, col: c, row2: r1, col2: c }], sideCfg('top')) } catch {}
      setCellBorderMeta(r1, c, sideCfg('top'))
    }
  }
  else if (mode === 'bottom') {
    for (let c = c1; c <= c2; c++) {
  try { plugin?.setBorders?.([{ row: r2, col: c, row2: r2, col2: c }], sideCfg('bottom')) } catch {}
      setCellBorderMeta(r2, c, sideCfg('bottom'))
    }
  }
  else if (mode === 'left') {
    for (let r = r1; r <= r2; r++) {
  try { plugin?.setBorders?.([{ row: r, col: c1, row2: r, col2: c1 }], sideCfg('left')) } catch {}
      setCellBorderMeta(r, c1, sideCfg('left'))
    }
  }
  else if (mode === 'right') {
    for (let r = r1; r <= r2; r++) {
  try { plugin?.setBorders?.([{ row: r, col: c2, row2: r, col2: c2 }], sideCfg('right')) } catch {}
      setCellBorderMeta(r, c2, sideCfg('right'))
    }
  }
  else if (mode === 'outer') {
    // Apenas bordas externas (aplicadas célula a célula)
    for (let c = c1; c <= c2; c++) {
  try { plugin?.setBorders?.([{ row: r1, col: c, row2: r1, col2: c }], sideCfg('top')) } catch {}
      setCellBorderMeta(r1, c, sideCfg('top'))
  try { plugin?.setBorders?.([{ row: r2, col: c, row2: r2, col2: c }], sideCfg('bottom')) } catch {}
      setCellBorderMeta(r2, c, sideCfg('bottom'))
    }
    for (let r = r1; r <= r2; r++) {
  try { plugin?.setBorders?.([{ row: r, col: c1, row2: r, col2: c1 }], sideCfg('left')) } catch {}
      setCellBorderMeta(r, c1, sideCfg('left'))
  try { plugin?.setBorders?.([{ row: r, col: c2, row2: r, col2: c2 }], sideCfg('right')) } catch {}
      setCellBorderMeta(r, c2, sideCfg('right'))
    }
  }
  else if (mode === 'inner') {
    // Bordas internas: desenhar linhas entre colunas e entre linhas
    // Primeiro, garantimos que não há resíduos conflitantes dentro do range
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const sides: any[] = []
        if (c < c2) sides.push('right')
        if (r < r2) sides.push('bottom')
        if (sides.length) clearCellBorderMeta(r, c, sides as any)
      }
    }
    // Linhas verticais internas (entre colunas)
    for (let c = c1; c < c2; c++) {
      for (let r = r1; r <= r2; r++) {
        setCellBorderMeta(r, c, { right: { width, color } })
        setCellBorderMeta(r, c+1, { left: { width, color } })
        try {
          plugin?.setBorders?.([{ row: r, col: c, row2: r, col2: c }], { right: { width, color } })
          plugin?.setBorders?.([{ row: r, col: c+1, row2: r, col2: c+1 }], { left: { width, color } })
        } catch {}
      }
    }
    // Linhas horizontais internas (entre linhas)
    for (let r = r1; r < r2; r++) {
      for (let c = c1; c <= c2; c++) {
        setCellBorderMeta(r, c, { bottom: { width, color } })
        setCellBorderMeta(r+1, c, { top: { width, color } })
        try {
          plugin?.setBorders?.([{ row: r, col: c, row2: r, col2: c }], { bottom: { width, color } })
          plugin?.setBorders?.([{ row: r+1, col: c, row2: r+1, col2: c }], { top: { width, color } })
        } catch {}
      }
    }
  }
  else if (mode === 'all') {
    // Todas as bordas: borda externa + internas
    // Externas
    for (let c = c1; c <= c2; c++) {
      setCellBorderMeta(r1, c, { top: { width, color } })
      setCellBorderMeta(r2, c, { bottom: { width, color } })
      try {
        plugin?.setBorders?.([{ row: r1, col: c, row2: r1, col2: c }], { top: { width, color } })
        plugin?.setBorders?.([{ row: r2, col: c, row2: r2, col2: c }], { bottom: { width, color } })
      } catch {}
    }
    for (let r = r1; r <= r2; r++) {
      setCellBorderMeta(r, c1, { left: { width, color } })
      setCellBorderMeta(r, c2, { right: { width, color } })
      try {
        plugin?.setBorders?.([{ row: r, col: c1, row2: r, col2: c1 }], { left: { width, color } })
        plugin?.setBorders?.([{ row: r, col: c2, row2: r, col2: c2 }], { right: { width, color } })
      } catch {}
    }
    // Internas (reuse da lógica do modo 'inner')
    for (let c = c1; c < c2; c++) {
      for (let r = r1; r <= r2; r++) {
        setCellBorderMeta(r, c, { right: { width, color } })
        setCellBorderMeta(r, c+1, { left: { width, color } })
        try {
          plugin?.setBorders?.([{ row: r, col: c, row2: r, col2: c }], { right: { width, color } })
          plugin?.setBorders?.([{ row: r, col: c+1, row2: r, col2: c+1 }], { left: { width, color } })
        } catch {}
      }
    }
    for (let r = r1; r < r2; r++) {
      for (let c = c1; c <= c2; c++) {
        setCellBorderMeta(r, c, { bottom: { width, color } })
        setCellBorderMeta(r+1, c, { top: { width, color } })
        try {
          plugin?.setBorders?.([{ row: r, col: c, row2: r, col2: c }], { bottom: { width, color } })
          plugin?.setBorders?.([{ row: r+1, col: c, row2: r+1, col2: c }], { top: { width, color } })
        } catch {}
      }
    }
  }
  // Redesenhar bordas a partir do meta garante que todas as células recebam o desenho
  try { reapplyBordersFromMetaRange(r1, c1, r2, c2) } catch {}
  try { hot.value!.render() } catch {}
}

// ===== Fórmulas: seleção manual e destaque de referências
function colToName(col: number): string {
  let n = col + 1, name = ''
  while (n > 0) { const rem = (n - 1) % 26; name = String.fromCharCode(65 + rem) + name; n = Math.floor((n - 1) / 26) }
  return name
}
function nameToCol(name: string): number {
  let n = 0
  for (const ch of name) { n = n * 26 + (ch.charCodeAt(0) - 64) }
  return n - 1
}
function rangeToRef(r1: number, c1: number, r2?: number, c2?: number) {
  const a = colToName(c1) + (r1 + 1)
  if (r2 === undefined || c2 === undefined || (r1 === r2 && c1 === c2)) return a
  const b = colToName(c2) + (r2 + 1)
  return a + ':' + b
}
function parseRefToken(tok: string): [number, number, number, number] | null {
  const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(tok.toUpperCase())
  if (!m) return null
  const c1 = nameToCol(m[1]); const r1 = parseInt(m[2], 10) - 1
  const c2 = m[3] ? nameToCol(m[3]) : c1; const r2 = m[4] ? parseInt(m[4], 10) - 1 : r1
  return [r1, c1, r2, c2]
}

function onFormulaFocus() {
  // cancelar qualquer timer pendente e marcar edição ativa
  if (formulaBlurTimer) { clearTimeout(formulaBlurTimer); formulaBlurTimer = null }
  isEditingFormula.value = true
}
function onFormulaBlur() {
  // manter edição ativa por um curto período para permitir clique/arrasto no grid
  if (formulaBlurTimer) { clearTimeout(formulaBlurTimer) }
  formulaBlurTimer = setTimeout(() => { isEditingFormula.value = false; formulaBlurTimer = null }, 300)
}
function onFormulaInput() {
  try {
    const el = formulaInputRef.value
    const s = formulaValue.value
    if (!el || !s) return
    const caret = el.selectionStart ?? s.length
    // pegar último token de referência antes do caret
    const left = s.slice(0, caret)
    const match = left.match(/([A-Z]+\d+(?::[A-Z]+\d+)?)(?!.*[A-Z]+\d+)/i)
    const tok = match ? match[1] : ''
    if (!tok) return
    const range = parseRefToken(tok)
    if (range && hot.value) highlightRange(range[0], range[1], range[2], range[3])
  } catch {}
}
function highlightRange(r1: number, c1: number, r2: number, c2: number) {
  // Importante: não chamar selectCell aqui para evitar loop afterSelection → selectCell → afterSelection
  try {
    if (!hot.value) return
    const [nr1, nc1, nr2, nc2] = normalizeRange(r1, c1, r2, c2)
    updateRangeOverlay(nr1, nc1, nr2, nc2)
    // manter foco no campo correto
    setTimeout(() => {
      if (isEditingFormula.value) formulaInputRef.value?.focus()
      else (document.querySelector('.handsontableInput') as HTMLTextAreaElement | null)?.focus()
    }, 0)
  } catch {}
}
function insertAtCaret(text: string) {
  const el = formulaInputRef.value
  if (!el) return
  const start = el.selectionStart ?? formulaValue.value.length
  const end = el.selectionEnd ?? start
  const before = formulaValue.value.slice(0, start)
  const after = formulaValue.value.slice(end)
  formulaValue.value = before + text + after
  const pos = (before + text).length
  setTimeout(() => { try { el.setSelectionRange(pos, pos); el.focus() } catch {} }, 0)
}
function insertSelectionIntoFormula(r1: number, c1: number, r2: number, c2: number) {
  // inserir referência do intervalo selecionado no caret
  const [nr1, nc1, nr2, nc2] = normalizeRange(r1, c1, r2, c2)
  const ref = rangeToRef(nr1, nc1, nr2, nc2)
  // se ainda não começou com '=', começar
  if (!formulaValue.value.startsWith('=')) {
    formulaValue.value = '='
  }
  // se último caractere não é operador ou parêntese, insere separador
  const last = formulaValue.value.slice(-1)
  if (last && !/[+\-*/^(,]/.test(last)) formulaValue.value += (last === '=' ? '' : '+')
  insertAtCaret(ref)
}

// ===== Autocomplete em-célula: helpers
function hideFnSuggest(){ fnSuggest.value = { show:false, items: [], index:0, top:0, left:0 } as any }
function pickFnSuggestion(idx: number){
  const i = Math.max(0, Math.min((fnSuggest.value.items.length-1), idx))
  const fn = fnSuggest.value.items[i]
  try {
    const editorEl = document.querySelector('.handsontableInput') as HTMLTextAreaElement | null
    if (!editorEl) return
    const { value } = editorEl
    // substitui o token de função atual pelo selecionado (maiúsculo)
    const caret = editorEl.selectionStart ?? value.length
    const left = value.slice(0, caret)
    const m = left.match(/=([a-zA-Zçéêíóúãõâêôáàéíóúüñ\.]+)$/i)
    if (m) {
      const before = left.slice(0, m.index! + 1)
      const after = value.slice(caret)
      const next = before + fn + '(' + after
      editorEl.value = next
      const pos = (before + fn + '(').length
      editorEl.setSelectionRange(pos, pos)
      editorEl.dispatchEvent(new Event('input', { bubbles: true }))
    }
  } catch {}
  hideFnSuggest()
}
function showFnSuggestAt(row:number, col:number, editorEl: HTMLTextAreaElement){
  try {
    const rect = editorEl.getBoundingClientRect()
    const holder = document.getElementById('hot-container')!.getBoundingClientRect()
    const top = rect.bottom - holder.top + 2
    const left = rect.left - holder.left
    fnSuggest.value = { show:true, items: fnListPTBR, index:0, top, left, editorCell:{row,col} as any }
  } catch {}
}
function filterFnSuggest(prefix: string){
  const p = prefix.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
  const norm = (s:string)=> s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
  const items = fnListPTBR.filter(f => norm(f).startsWith(p))
  fnSuggest.value.items = items.length ? items : fnListPTBR
  fnSuggest.value.index = 0
}
function onEditorKeydown(e: KeyboardEvent){
  if (!fnSuggest.value.show) return
  if (e.key === 'ArrowDown') { e.preventDefault(); fnSuggest.value.index = Math.min(fnSuggest.value.index+1, fnSuggest.value.items.length-1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); fnSuggest.value.index = Math.max(fnSuggest.value.index-1, 0) }
  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickFnSuggestion(fnSuggest.value.index) }
  else if (e.key === 'Escape') { hideFnSuggest() }
  // Se o usuário começa a digitar algo novo fora do ref atual, liberamos o span
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Shift','Control','Alt','Meta','Tab'].includes(e.key)) {
    inCellRefSpan = null
  }
}
function onEditorInput(this: HTMLTextAreaElement){
  const el = this
  // token de função e referência para overlay
  handleEditorInput(fnSuggest.value.editorCell?.row ?? 0, fnSuggest.value.editorCell?.col ?? 0, el, el.value)
}
function handleEditorInput(row:number, col:number, editorEl: HTMLTextAreaElement, val: string){
  try {
    // 1) Autocomplete: se começa com '=' e está digitando nome de função
    const caret = editorEl.selectionStart ?? val.length
    const left = val.slice(0, caret)
    const fnTok = left.match(/=([a-zA-Zçéêíóúãõâêôáàéíóúüñ\.]+)$/i)
    if (fnTok) {
      const word = fnTok[1]
      showFnSuggestAt(row, col, editorEl)
      filterFnSuggest(word)
    } else hideFnSuggest()

    // 2) Overlay de intervalo: achar último token ref A1:B2
    const refTok = left.match(/([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)$/)
    if (refTok && hot.value) {
      const range = parseRefToken(refTok[1])
      if (range) updateRangeOverlay(range[0], range[1], range[2], range[3])
      else hideRangeOverlay()
    } else hideRangeOverlay()
  } catch {}
}
function hideRangeOverlay(){ rangeOverlay.value = { show:false, top:0, left:0, width:0, height:0 } }
function updateRangeOverlay(r1:number, c1:number, r2:number, c2:number){
  try {
    if (!hot.value) return
    const [nr1,nc1,nr2,nc2] = normalizeRange(r1,c1,r2,c2)
    const holderEl = document.getElementById('hot-container')
    if (!holderEl) return
    const tlCell = hot.value.getCell(nr1, nc1) as HTMLElement | null
    const brCell = hot.value.getCell(nr2, nc2) as HTMLElement | null
    if (!tlCell || !brCell) { hideRangeOverlay(); return }
    const tl = tlCell.getBoundingClientRect()
    const br = brCell.getBoundingClientRect()
    const holder = holderEl.getBoundingClientRect()
    const top = tl.top - holder.top - 1
    const left = tl.left - holder.left - 1
    const width = br.right - tl.left + 2
    const height = br.bottom - tl.top + 2
    rangeOverlay.value = { show:true, top, left, width, height }
  } catch { hideRangeOverlay() }
}

// Remover listeners quando o editor perder foco (fim da edição)
document.addEventListener('mousedown', () => {
  try {
    const editorEl = document.querySelector('.handsontableInput') as HTMLTextAreaElement | null
    if (!editorEl) { hideFnSuggest(); hideRangeOverlay() }
  else if (document.activeElement !== editorEl) { inCellEditorActive = false; inCellRefSpan = null; hideRangeOverlay() }
  } catch {}
}, true)

// ===== Mesclar células
function mergeCellsAction() {
  if (!hot.value || !currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  const rowspan = r2 - r1 + 1
  const colspan = c2 - c1 + 1
  if (rowspan === 1 && colspan === 1) return
  const plugin: any = (hot.value as any).getPlugin?.('mergeCells')
  if (plugin?.mergeSelection) {
    try { hot.value.selectCell(r1, c1, r2, c2, false, false) } catch {}
    try { plugin.mergeSelection() } catch {}
  } else {
    const settings = (hot.value as any).getSettings()
    const current: any[] = Array.isArray(settings.mergeCells) ? [...settings.mergeCells] : []
    current.push({ row: r1, col: c1, rowspan, colspan })
    hot.value.updateSettings({ mergeCells: current } as any)
  }
  setTimeout(() => {
  if (hot.value) hot.value.render()
    restoreSelection()
  }, 10)
}
function unmergeCellsAction() {
  if (!hot.value || !currentSelection.value) return
  const plugin: any = (hot.value as any).getPlugin?.('mergeCells')
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  if (plugin?.unmergeSelection) {
    try { hot.value.selectCell(r1, c1, r2, c2, false, false) } catch {}
    try { plugin.unmergeSelection() } catch {}
  } else {
    const settings = (hot.value as any).getSettings()
    const current: any[] = Array.isArray(settings.mergeCells) ? settings.mergeCells : []
    const filtered = current.filter((m: any) => {
      const mr2 = m.row + (m.rowspan || 1) - 1
      const mc2 = m.col + (m.colspan || 1) - 1
      // remove qualquer merge que intersecte o range atual
      const intersects = !(m.row > r2 || mr2 < r1 || m.col > c2 || mc2 < c1)
      return !intersects
    })
    hot.value.updateSettings({ mergeCells: filtered } as any)
  }
  setTimeout(() => {
  if (hot.value) hot.value.render()
    restoreSelection()
  }, 10)
}

// ===== Validações rápidas
function setCheckboxType() { applyMetaToSelection((m) => ({ ...m, type: 'checkbox' })) }
function setNumericType() { applyMetaToSelection((m) => ({ ...m, type: 'numeric', strict: true })) }
function setListValidation() {
  const txt = prompt('Valores da lista (separados por vírgula):', 'Sim,Não')
  if (!txt) return
  const source = txt.split(',').map(s => s.trim()).filter(Boolean)
  applyMetaToSelection((m) => ({ ...m, type: 'dropdown', source, strict: true }))
}
function clearValidation() { applyMetaToSelection((m) => ({ ...m, type: undefined, source: undefined, strict: undefined })) }

// ===== Abas
function initSheetsTabs() {
  const urlId = new URLSearchParams(window.location.search).get('id') || undefined
  sheetsList.value = loadSheetsTabs()
  activeSheetId.value = urlId || localStorage.getItem('sheets-last') || 'default'
  if (!sheetsList.value.includes(activeSheetId.value)) sheetsList.value.push(activeSheetId.value)
  saveSheetsTabs()
  switchSheet(activeSheetId.value)
}

function switchSheet(id: string) {
  activeSheetId.value = id
  localStorage.setItem('sheets-last', id)
  // carrega do servidor (se existir)
  if (hot.value) {
    fetch('/server/api/sheets.php?id=' + encodeURIComponent(id))
      .then(r => r.json())
      .then(resp => {
        if (resp.success && resp.data) {
          if (resp.data.data) {
            hot.value!.loadData(resp.data.data)
            applyLoadedMeta(resp.data.meta || {}, resp.data.altGroups || {}, resp.data.conditional || {}, resp.data.alternating || {})
            if (Array.isArray(resp.data.merges) && resp.data.merges.length) {
              hot.value!.updateSettings({ mergeCells: resp.data.merges } as any)
            }
          } else {
            hot.value!.loadData(resp.data)
          }
        } else {
          // nova aba limpa
          hot.value!.loadData(Array.from({ length: 50 }, () => Array(26).fill('')))
        }
        restoreSelection()
      }).catch(() => {
        hot.value!.loadData(Array.from({ length: 50 }, () => Array(26).fill('')))
      })
  }
}

function loadSheetsTabs(): string[] {
  try { return JSON.parse(localStorage.getItem('sheets-tabs') || '[]') } catch { return [] }
}
function saveSheetsTabs() { localStorage.setItem('sheets-tabs', JSON.stringify(sheetsList.value)) }

// ===== Limpar valores/formatos
function clearValues() {
  if (!hot.value || !currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      hot.value.setDataAtCell(r, c, '')
    }
  }
  computeSelectionStats(); if (hot.value) hot.value.render(); restoreSelection()
}
function clearFormats() {
  if (!hot.value || !currentSelection.value) return
  const [r1, c1, r2, c2] = normalizeRange(...currentSelection.value as [number, number, number, number])
  const keys: (keyof CustomMeta)[] = ['bold','italic','underline','align','textColor','bgColor','format','decimals']
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) continue
      for (const k of keys) (hot.value as any).setCellMeta(r, c, k, undefined)
  ;(hot.value as any).setCellMeta(r, c, 'borders', undefined)
    }
  }
  // limpar bordas visuais também
  try { (hot.value as any).getPlugin?.('customBorders')?.clearBorders?.([{ row: r1, col: c1, row2: r2, col2: c2 }]) } catch {}
  try { (hot.value as any).getPlugin?.('customBorders')?.clearBorders?.([[r1, c1, r2, c2]]) } catch {}
  try { hot.value?.render() } catch {}
  restoreSelection()
}

// ===== Fixar linha/coluna
function toggleFreezeRow() {
  fixedRowsTop.value = fixedRowsTop.value > 0 ? 0 : 1
  hot.value?.updateSettings({ fixedRowsTop: fixedRowsTop.value })
  restoreSelection()
}
function toggleFreezeCol() {
  fixedColumnsLeft.value = fixedColumnsLeft.value > 0 ? 0 : 1
  hot.value?.updateSettings({ fixedColumnsLeft: fixedColumnsLeft.value })
  restoreSelection()
}

// ===== CSV
function exportCsv() {
  if (!hot.value) return
  const rows = hot.value.getData()
  const sep = ';'
  const csv = rows.map((r: any[]) => r.map((v: any) => {
    const s = (v ?? '').toString()
    if (s.includes('"') || s.includes(sep) || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }).join(sep)).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${activeSheetId.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
function importCsv(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !hot.value) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result || '')
    // detecção simples de separador
    const sep = text.indexOf(';') >= 0 ? ';' : ','
    const lines = text.split(/\r?\n/)
    const rows = lines.map(line => parseCsvLine(line, sep))
    hot.value!.loadData(rows)
    restoreSelection()
    input.value = ''
  }
  reader.readAsText(file)
}
function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false }
      } else cur += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === sep) { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out
}
</script>

<style scoped>
.sheets-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  flex-shrink: 0;
}

.toolbar {
  flex-shrink: 0;
}

.toolbar .btn.btn-sm {
  padding: 4px 6px;
  line-height: 1;
}

.toolbar .material-symbols-outlined {
  font-size: 20px;
  vertical-align: middle;
}

.formula-bar { flex-shrink: 0; }

.sheet-container {
  flex: 1;
  padding: 10px;
  padding-bottom: 60px; /* Espaço para o footer */
  overflow: hidden; /* o HOT controla scroll interno */
  display: flex;
  flex-direction: column;
}

#hot-container {
  flex: 1;
  height: 100%;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  background: #fff;
  position: relative;
}

/* Autocomplete e overlay */
.fn-suggest {
  position: absolute;
  min-width: 220px;
  max-height: 220px;
  overflow: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 10px 20px rgba(0,0,0,.08);
  z-index: 18000;
}
.fn-suggest-item { padding: 6px 10px; font-size: 13px; cursor: pointer; }
.fn-suggest-item.active, .fn-suggest-item:hover { background: #f3f4f6; }
.range-overlay {
  position: absolute;
  border: 2px dashed #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  pointer-events: none;
  z-index: 17000;
}

.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1030;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  font-size: 0.875rem;
}

/* Dropdowns de toolbar */
.toolbar-dropdown { position: relative; }
.toolbar-dropdown .caret { font-size: 18px; margin-left: 2px; }
.dropdown-menu-like {
  position: absolute;
  top: 110%;
  left: 0;
  min-width: 260px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
  padding: 10px;
  z-index: 15000;
}
.dropdown-menu-like.color-menu { width: 300px; }
.dropdown-menu-like .menu-header { padding: 2px 0 6px 0; }
.dropdown-menu-like .menu-subtitle { font-size: 12px; color: #6b7280; margin-top: 6px; margin-bottom: 4px; }
.dropdown-menu-like .menu-divider { height: 1px; background: #e5e7eb; margin: 8px 0; }
.dropdown-menu-like .menu-item { width: 100%; text-align: left; padding: 6px 8px; border: none; background: transparent; border-radius: 6px; }
.dropdown-menu-like .menu-item:hover { background: #f3f4f6; }
.palette-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; }
.palette-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.swatch {
  width: 18px; height: 18px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.1);
}
.swatch:hover { outline: 2px solid rgba(0,0,0,0.12); }
.icon-btn { padding: 4px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 2px; }
.icon-btn:hover { background: #f9fafb; }
.border-actions { display: grid; grid-template-columns: repeat(4, auto); gap: 6px; }
.thickness-row { display: flex; gap: 8px; align-items: center; }
/* removidos os botões de amostra visual */

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Formatação personalizada */
.font-weight-bold {
  font-weight: bold !important;
}

.font-italic {
  font-style: italic !important;
}

.text-decoration-underline {
  text-decoration: underline !important;
}

.text-start {
  text-align: left !important;
}

.text-center {
  text-align: center !important;
}

.text-end {
  text-align: right !important;
}

.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1030;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.sheet-footer-fixed {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000; /* abaixo do menu de contexto */
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}

/* Container da aplicação com posição relativa para o footer */
.sheets-app {
  position: relative;
  min-height: 100vh;
  padding-bottom: 60px; /* Espaço para o footer */
}

/* Garantir que o footer do site apareça acima do footer da planilha */
#footer-container {
  position: relative;
  z-index: 1030;
}

/* Garantir menu de contexto acima de qualquer overlay */
.htMenu {
  z-index: 20000 !important;
}

/* Garantir que as bordas (customBorders) fiquem acima das células/seleção */
:deep(.handsontable .htBorders),
:deep(.handsontable .wtBorder),
:deep(.handsontable .wtBorder.hidden) {
  z-index: 18000 !important; /* acima do overlay de seleção (17000) */
  pointer-events: none;
}

/* Garantir área interna com altura total */
.handsontable .wtHolder {
  height: 100% !important;
}

/* Gridlines padrão do HOT (ajuste leve para garantir visibilidade mesmo com resets globais) */
:deep(.pv-hot .handsontable .htCore td) {
  border-right: 1px solid #e6e6e6;
  border-bottom: 1px solid #e6e6e6;
}
:deep(.pv-hot .handsontable .htCore th) {
  border-right: 1px solid #e6e6e6;
  border-bottom: 1px solid #e6e6e6;
}

/* Evitar que algum ancestor bloqueie cliques */
#hot-container, #hot-container * {
  pointer-events: auto;
}

/* Modais simples */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; z-index: 20000; }
.modal-card { width: 520px; max-width: 90vw; background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; box-shadow: 0 20px 30px rgba(0,0,0,0.15); overflow: hidden; }
.modal-header, .modal-footer { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
.modal-footer { border-top: 1px solid #e5e7eb; border-bottom: none; }
.modal-body { padding: 12px; }
.btn-close { border: none; background: transparent; width: 28px; height: 28px; position: relative; }
.btn-close::before, .btn-close::after { content: ''; position: absolute; top: 50%; left: 50%; width: 14px; height: 2px; background: #374151; transform-origin: center; }
.btn-close::before { transform: translate(-50%, -50%) rotate(45deg); }
.btn-close::after { transform: translate(-50%, -50%) rotate(-45deg); }
</style>
