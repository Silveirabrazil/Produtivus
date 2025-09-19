// scripts/reinstall-fullcalendar.js
// Copia os bundles globais do FullCalendar de node_modules para js/fullcalendar
// e os CSS principais para css/fullcalendar quando disponíveis.

const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function copy(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log('✓', path.relative(process.cwd(), dest));
  } catch (e) {
    console.error('✗ Falhou:', src, '->', dest, e.message);
  }
}

const root = process.cwd();
const nm = path.join(root, 'node_modules');
const outJs = path.join(root, 'js', 'fullcalendar');
const outCss = path.join(root, 'css', 'fullcalendar');
ensureDir(outJs);
ensureDir(outCss);

const files = [
  { src: '@fullcalendar/core/index.global.min.js', dest: 'core.global.min.js' },
  { src: '@fullcalendar/interaction/index.global.min.js', dest: 'interaction.global.min.js' },
  { src: '@fullcalendar/daygrid/index.global.min.js', dest: 'daygrid.global.min.js' },
  { src: '@fullcalendar/timegrid/index.global.min.js', dest: 'timegrid.global.min.js' },
  { src: '@fullcalendar/core/locales-all.global.min.js', dest: 'locales-all.global.min.js' },
  // moment/moment-timezone/luxon bundles (opcionais; copiar se existirem)
  { src: '@fullcalendar/moment/index.global.min.js', dest: 'moment.global.min.js', optional: true },
  { src: '@fullcalendar/moment-timezone/index.global.min.js', dest: 'moment-timezone.global.min.js', optional: true },
  { src: '@fullcalendar/luxon1/index.global.min.js', dest: 'luxon1.global.min.js', optional: true },
  { src: '@fullcalendar/luxon2/index.global.min.js', dest: 'luxon2.global.min.js', optional: true },
  { src: '@fullcalendar/list/index.global.min.js', dest: 'list.global.min.js', optional: true },
  { src: '@fullcalendar/multimonth/index.global.min.js', dest: 'multimonth.global.min.js', optional: true },
  { src: '@fullcalendar/rrule/index.global.min.js', dest: 'rrule.global.min.js', optional: true },
];

const cssFiles = [
  { src: '@fullcalendar/daygrid/index.global.min.css', dest: 'daygrid.global.min.css' },
  { src: '@fullcalendar/timegrid/index.global.min.css', dest: 'timegrid.global.min.css' },
];

let copiedAny = false;
for (const f of files) {
  const from = path.join(nm, ...f.src.split('/'));
  if (!fs.existsSync(from)) {
    if (!f.optional) console.warn('Arquivo não encontrado em node_modules:', f.src);
    continue;
  }
  copy(from, path.join(outJs, f.dest));
  copiedAny = true;
}
for (const f of cssFiles) {
  const from = path.join(nm, ...f.src.split('/'));
  if (!fs.existsSync(from)) continue;
  copy(from, path.join(outCss, f.dest));
  copiedAny = true;
}

if (!copiedAny) {
  console.error('Nenhum arquivo copiado. Rode `npm install` primeiro e confirme a dependência "fullcalendar".');
  process.exit(1);
}
console.log('FullCalendar reinstalado (arquivos copiados).');
