const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8080/estudos.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const report = { url, ok: true, console: [], errors: [], networkFailures: [], selectors: {}, actions: [] };

  page.on('console', msg => { report.console.push({type: msg.type(), text: msg.text()}); });
  page.on('pageerror', err => { report.errors.push(String(err)); report.ok = false; });
  page.on('requestfailed', req => { report.networkFailures.push({url: req.url(), method: req.method(), resourceType: req.resourceType(), failureText: req.failure().errorText}); report.ok = false; });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // wait for dynamic mounts (studies-tools)
    await page.waitForSelector('#studies-tools', { timeout: 10000 }).catch(()=>{});
    // small helper to check presence
    async function check(sel){ const exists = await page.$(sel) !== null; report.selectors[sel] = exists; return exists; }

    const checks = ['#studies-tools', '#studies-hub', '.pv-fc', '#pv-full-timer'];
    for (const s of checks) await check(s);

    // wait a bit for mounts to run
    await new Promise(r => setTimeout(r, 1200));

    // try to click key buttons if present
    const buttons = [ '#fc-deck-add', '#fc-prova-new', '#fc-prova-mini', '#fc-quiz', '#tm-toggle', '#tm-test' ];
    for (const b of buttons){
      const el = await page.$(b);
      if (el){
        try{ await el.click({delay:100}); report.actions.push({button: b, clicked: true}); await new Promise(r=>setTimeout(r,300)); }catch(e){ report.actions.push({button: b, clicked:false, error:String(e)}); report.ok=false; }
      } else report.actions.push({button: b, clicked:false, reason:'not found'});
    }

    // Tentar abrir o modal do Timer via botão no navbar (#btn-timer)
    const timerBtn = await page.$('#btn-timer');
    if (timerBtn) {
      try{
        await timerBtn.click({delay:100});
        report.actions.push({button:'#btn-timer', clicked:true});
        // esperar modal aparecer
        await page.waitForSelector('#pv-timer-modal', { timeout: 3000 }).catch(()=>{});
        // esperar que o host do full timer exista dentro do modal
        await page.waitForSelector('#pv-full-timer', { timeout: 3000 }).catch(()=>{});
        // recheck selector
        report.selectors['#pv-full-timer'] = (await page.$('#pv-full-timer')) !== null;
      }catch(e){ report.actions.push({button:'#btn-timer', clicked:false, error:String(e)}); report.ok=false; }
    } else { report.actions.push({button:'#btn-timer', clicked:false, reason:'not found'}); }

    // capture a screenshot
    const outDir = 'tools/tests/out'; if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const shot = `${outDir}/estudos-snapshot.png`;
    await page.screenshot({ path: shot, fullPage: true });
    report.screenshot = shot;

  } catch (e) {
    report.ok = false; report.errors.push(String(e));
  } finally {
    await browser.close();
    const out = 'tools/tests/report-estudos.json'; fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log('Wrote report ->', out);
    process.exit(report.ok?0:2);
  }
})();
