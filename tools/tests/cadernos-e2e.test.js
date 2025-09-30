/**
 * Teste E2E simplificado para Cadernos (Puppeteer)
 * Requisitos: servidor local ativo (npm start) em http://localhost:8081
 */
const puppeteer = require('puppeteer');

const RAW_BASE = process.env.BASE_URL || 'http://localhost:8081/html/cadernos-novo.html';
function withNoProtect(url) {
  try {
    const u = new URL(url);
    // evita duplicar caso já tenha sido fornecido via env
    if (!u.searchParams.has('noprotect')) u.searchParams.set('noprotect', '1');
    if (!u.searchParams.has('pv_noprotect')) u.searchParams.set('pv_noprotect', '1');
    if (!u.searchParams.has('debug')) u.searchParams.set('debug', '1');
    return u.toString();
  } catch {
    return url + (url.includes('?') ? '&' : '?') + 'noprotect=1&pv_noprotect=1&debug=1';
  }
}
const BASE = withNoProtect(RAW_BASE);

async function waitForEditor(page) {
  try {
    await page.waitForSelector('#cadernos-app[data-cadernos-novo]', { timeout: 15000 });
  } catch (e) {
    // fallback: tentar sem o atributo e depurar o HTML carregado
    try {
      await page.waitForSelector('#cadernos-app', { timeout: 5000 });
    } catch (e2) {
      const html = await page.content();
      console.error('[E2E] DEBUG body length=', html.length);
      throw e;
    }
  }
  await page.waitForSelector('[data-editor-area] [data-editor-pagina]', { timeout: 15000 });
}

async function getEditorBuild(page) {
  return page.$eval('[data-editor-menus]', el => {
    const root = el.closest('.cn-editor');
    const host = root?.parentElement;
    const build = host?.getAttribute('data-editor-build') || document.querySelector('[data-editor-build]')?.getAttribute('data-editor-build') || '';
    return build;
  }).catch(() => '');
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  console.log('[E2E] Abrindo', BASE);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  console.log('[E2E] URL atual:', page.url());
  await waitForEditor(page);

  const build = await getEditorBuild(page);
  console.log('[E2E] Editor build:', build || '(desconhecido)');

  // Focar na página e digitar texto
  const paginaSel = '[data-editor-area] [data-editor-pagina]';
  await page.click(paginaSel);
  await page.type(paginaSel, 'Linha 1');
  await page.keyboard.press('Enter');
  await page.type(paginaSel, 'Linha 2');

  // Ativar lista pontuada e digitar item
  await page.click('[data-comando="insertUnorderedList"]');
  await page.type(paginaSel, ' Item de lista');

  // Seleciona a segunda linha e aplica 16px via input numérico
  await page.click(paginaSel, { clickCount: 3 }); // seleciona a linha atual
  await page.click('[data-tamanho-input]');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.type('[data-tamanho-input]', '16');
  await page.keyboard.press('Enter');

  // Verificar que algum elemento recebeu font-size 16px (inline style ou computado)
  const has16 = await page.$eval(paginaSel, pg => {
    const els = pg.querySelectorAll('[style*="font-size"], span, b, i, strong, em, u, s, mark, code, li, p, div');
    for (const el of els) {
      const stAttr = el.getAttribute('style') || '';
      if (/font-size:\s*16px/i.test(stAttr)) return true;
      const cs = window.getComputedStyle(el);
      if (Math.round(parseFloat(cs.fontSize)) === 16) return true;
    }
    return false;
  }).catch(() => false);
  console.log('[E2E] Aplicou 16px?', has16);

  // Teste caret colapsado: posiciona caret no fim via JS, muda tamanho para 18, digita e confere
  await page.$eval(paginaSel, pg => {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(pg);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page.click('[data-tamanho-input]');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.type('[data-tamanho-input]', '18');
  await page.keyboard.press('Enter');
  // refoca o editor sem mover a seleção
  await page.$eval(paginaSel, el => el.focus());
  await page.keyboard.type(' X');
  // pequena espera para reflow
  await new Promise(r => setTimeout(r, 120));
  const lastApplied = await page.$eval('.cn-editor', el => el.getAttribute('data-last-size-applied')||'').catch(()=> '');
  console.log('[E2E] last-size-applied:', lastApplied || '(vazio)');

  // Teste dos botões +/- de ajuste de tamanho
  console.log('[E2E] Testando botões +/- de tamanho...');

  // Seleciona uma palavra e testa o botão +
  await page.evaluate(() => {
    const editor = document.querySelector('[data-editor-pagina]');
    if (!editor) throw new Error('Editor não encontrado');

    // Garante que há texto
    if (!editor.textContent.trim()) {
      editor.innerHTML = '<p>Teste de tamanho</p>';
    }

    // Seleciona texto para aplicar tamanho
    const range = document.createRange();
    const textNodes = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim()) {
        textNodes.push(walker.currentNode);
      }
    }

    if (textNodes.length > 0) {
      const firstText = textNodes[0];
      range.setStart(firstText, 0);
      range.setEnd(firstText, Math.min(5, firstText.textContent.length));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  // Clica no botão + para aumentar tamanho
  const botaoMais = await page.$('[data-acao="tamanho-ajuste"][data-ajuste="1"]');
  if (botaoMais) {
    await botaoMais.click();
    await new Promise(r => setTimeout(r, 150));
  }

  // Verifica se o tamanho aumentou
  const tamanhoAumentou = await page.evaluate(() => {
    const spans = document.querySelectorAll('[data-size-marker]');
    const input = document.querySelector('[data-tamanho-input]');
    const inputValue = input ? parseInt(input.value) : 0;

    // Verifica se há spans com marcador de tamanho maior
    for (const span of spans) {
      const fontSize = span.getAttribute('data-size-marker');
      if (fontSize && parseInt(fontSize) > 11) {
        return true;
      }
    }

    // Verifica se o input mostra um valor maior
    return inputValue > 11;
  });

  console.log('[E2E] Botão + funcionou?', tamanhoAumentou);

  // Clica no botão - para diminuir tamanho
  const botaoMenos = await page.$('[data-acao="tamanho-ajuste"][data-ajuste="-1"]');
  if (botaoMenos) {
    await botaoMenos.click();
    await new Promise(r => setTimeout(r, 150));
  }

  const tamanhoDiminuiu = await page.evaluate(() => {
    const input = document.querySelector('[data-tamanho-input]');
    const inputValue = input ? parseInt(input.value) : 0;
    // Verifica se diminuiu em relação ao teste anterior
    return inputValue < 18; // menor que o 18px aplicado antes
  });

  console.log('[E2E] Botão - funcionou?', tamanhoDiminuiu);
  const has18 = await page.$eval(paginaSel, pg => {
    if (pg.querySelector('[data-size-marker="18px"]')) return true;
    if (/font-size:\s*18px/i.test(pg.innerHTML)) return true;
    const nodes = pg.querySelectorAll('[style*="font-size"], span, b, i, strong, em, u, s, mark, code, li, p, div');
    for (const el of nodes) {
      const stAttr = el.getAttribute('style') || '';
      if (/font-size:\s*18px/i.test(stAttr)) return true;
      const st = window.getComputedStyle(el);
      if (parseInt(st.fontSize, 10) === 18) return true;
    }
    return false;
  }).catch(() => false);
  console.log('[E2E] Caret -> 18px aplicado?', has18);

  // Abrir menu de cor de fundo e checar se painel abriu (não clipado)
  await page.click('[data-menu-toggle="fundo"]');
  const fundoAberto = await page.$eval('[data-menu-painel="fundo"]', el => (
    el && window.getComputedStyle(el).display !== 'none'
  )).catch(() => false);
  console.log('[E2E] Menu fundo aberto?', fundoAberto);

  // Checar que a régua renderizou labels
  const temRotulosRegua = await page.$eval('[data-editor-regua] [data-regua-escala]', el => !!el && el.querySelectorAll('.cn-regua__label').length > 0).catch(() => false);
  console.log('[E2E] Régua com rótulos?', temRotulosRegua);
  console.log('[E2E] Botões +/- funcionaram?', tamanhoAumentou && tamanhoDiminuiu);

  // Resultado final incluindo teste dos botões +/-
  const pass = has16 && has18 && fundoAberto && temRotulosRegua && tamanhoAumentou && tamanhoDiminuiu;
  console.log(pass ? '[E2E] PASS' : '[E2E] FAIL');
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
