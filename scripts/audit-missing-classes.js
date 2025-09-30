#!/usr/bin/env node
/*
  Audit simples: coleta classes dos arquivos .html e .php e verifica se aparecem em qualquer .scss novo (app architecture).
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const extsSource = ['.html','.php'];
const scssDir = path.join(root,'css','scss');

function walk(dir, filterExts){
  let out=[]; for(const item of fs.readdirSync(dir)){ const full=path.join(dir,item); const st=fs.statSync(full); if(st.isDirectory()){ out=out.concat(walk(full,filterExts)); } else { if(!filterExts || filterExts.includes(path.extname(full))) out.push(full); } } return out;
}

const htmlFiles = walk(root, extsSource);
const scssFiles = walk(scssDir, ['.scss']);

const classRegex = /class\s*=\s*"([^"]+)"/g;
// Ignorar tokens que não representam classes reais (artefatos de PHP ou CSS inline acidental)
const IGNORE = new Set(["'","ENT_QUOTES)","inset"]);
const VALID_CLASS = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const allClasses = new Set();
for(const f of htmlFiles){
  const txt = fs.readFileSync(f,'utf8');
  let m; while((m=classRegex.exec(txt))){
    m[1].split(/\s+/).forEach(c=>{
      if(!c) return;
      if(c.startsWith('lang-')) return;
      if(IGNORE.has(c)) return;
      if(!VALID_CLASS.test(c)) return;
      allClasses.add(c);
    });
  }
}

const scssContent = scssFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const missing = [];
function escapeReg(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
for(const c of allClasses){
  if(c.includes('htmlspecialchars(')) continue; // ignorar fragmentos PHP injectados acidentalmente
  if(IGNORE.has(c)) continue;
  const pattern = new RegExp('\\.'+escapeReg(c)+'(?![a-zA-Z0-9_-])','m');
  if(!pattern.test(scssContent)) missing.push(c);
}
missing.sort();
console.log('Total classes encontradas:', allClasses.size);
console.log('Faltando definição (aprox):', missing.length);
if(missing.length){
  console.log('\n--- CLASSES SEM MATCH SCSS ---');
  console.log(missing.join('\n'));
}
