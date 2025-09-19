const puppeteer = require('puppeteer');
const fs = require('fs');

(async ()=>{
  const url = process.argv[2] || 'http://127.0.0.1:8080/estudos.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const report = { url, ok: true, console: [], errors: [], networkFailures: [], steps: [] };

  page.on('console', msg => report.console.push({type: msg.type(), text: msg.text()}));
  page.on('pageerror', err => { report.errors.push(String(err)); report.ok=false; });
  page.on('requestfailed', req => { report.networkFailures.push({url: req.url(), method: req.method(), resourceType: req.resourceType(), failureText: req.failure().errorText}); report.ok=false; });

  try{
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#studies-tools', { timeout: 10000 }).catch(()=>{});

    // set a test sound in localStorage
    await page.evaluate(() => { try{ localStorage.setItem('pv_timer_sound_src', 'data:audio/mp3;base64,SUQzAwAAAAAA'); }catch{} });
    report.steps.push('injected pv_timer_sound_src');

    // ensure #btn-timer exists then click
    await page.waitForSelector('#btn-timer', { timeout: 5000 });
    // inject study-timer.js if missing and wait until window.pvStudyTimer is available
    const injected = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.pvStudyTimer) return resolve(true);
        const existing = Array.from(document.querySelectorAll('script')).some(s => (s.getAttribute('src')||'').endsWith('js/modules/study-timer.js'));
        if (existing) {
          // wait for global to appear
          let waited = 0; const iv = setInterval(()=>{ if (window.pvStudyTimer) { clearInterval(iv); resolve(true); } waited+=200; if (waited>3000) { clearInterval(iv); resolve(false); } }, 200);
          return;
        }
        const s = document.createElement('script'); s.src = 'js/modules/study-timer.js'; s.defer = true; s.onload = ()=>{ let waited=0; const iv = setInterval(()=>{ if (window.pvStudyTimer) { clearInterval(iv); resolve(true); } waited+=200; if (waited>3000) { clearInterval(iv); resolve(false); } }, 200); };
        s.onerror = ()=> resolve(false);
        document.body.appendChild(s);
      });
    });
    report.steps.push({ injectedTimerScript: injected });
    // open modal via global to ensure mounting
    await page.evaluate(()=>{ try{ if (window.openTimerModal) window.openTimerModal(); }catch{} });
    report.steps.push('called window.openTimerModal()');
    // wait for modal and host
    await page.waitForSelector('#pv-timer-modal', { timeout: 5000 }).catch(()=>{});
    report.steps.push('#pv-timer-modal present');
    // wait a bit for mount
    await new Promise(r=>setTimeout(r, 1200));

    // debug: check if the script tag is present and if window.pvStudyTimer is defined
    const scripts = await page.evaluate(()=> Array.from(document.querySelectorAll('script')).map(s=> ({ src: s.src||s.getAttribute('src'), data: s.getAttribute('data-pv') })) );
    const hasStudyScript = scripts.some(s=> s.src && s.src.endsWith('js/modules/study-timer.js'));
    const hasDataFlag = scripts.some(s=> s.data === 'study-timer');
    const hasPvStudy = await page.evaluate(()=> !!window.pvStudyTimer);
    report.steps.push({ scriptsCount: scripts.length, hasStudyScript, hasDataFlag, hasPvStudy });

    const hasFull = await page.$('#pv-full-timer') !== null;
    report.steps.push({ '#pv-full-timer_exists': hasFull });

    // read current left display if exists
    const leftBefore = await page.evaluate(()=>{ try{ const el=document.querySelector('#tm-left'); return el ? el.textContent.trim() : null; }catch{return null;} });
    report.steps.push({ leftBefore });

    // Click Test Alarm button (#tm-test)
    const testBtn = await page.$('#tm-test');
    if (testBtn){
      await testBtn.click();
      report.steps.push('clicked #tm-test');
    } else {
      report.steps.push('no #tm-test found');
      report.ok = false;
    }

    // Change input parameters (study, break, long, cycles)
    const changes = { study: 15, break: 3, long: 10, cycles: 3 };
    await page.evaluate((c)=>{
      try{
        const s = document.querySelector('#tm-study'); if (s) { s.value = String(c.study); s.dispatchEvent(new Event('input', { bubbles:true })); }
        const b = document.querySelector('#tm-break'); if (b) { b.value = String(c.break); b.dispatchEvent(new Event('input', { bubbles:true })); }
        const l = document.querySelector('#tm-long'); if (l) { l.value = String(c.long); l.dispatchEvent(new Event('input', { bubbles:true })); }
        const cy = document.querySelector('#tm-cycles'); if (cy) { cy.value = String(c.cycles); cy.dispatchEvent(new Event('input', { bubbles:true })); }
      }catch(e){}
    }, changes);
    report.steps.push({ changedInputs: changes });

    // small wait for state persistence
    await new Promise(r=>setTimeout(r, 500));

    // Read localStorage state pv_study_timer_v2
    const state = await page.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('pv_study_timer_v2')||'null'); }catch{return null;} });
    report.steps.push({ persistedState: state });

    // Click reset
    const resetBtn = await page.$('#tm-reset');
    if (resetBtn){
      await resetBtn.click();
      report.steps.push('clicked #tm-reset');
      await new Promise(r=>setTimeout(r, 500));
      const leftAfterReset = await page.evaluate(()=>{ try{ const el=document.querySelector('#tm-left'); return el ? el.textContent.trim() : null; }catch{return null;} });
      report.steps.push({ leftAfterReset });
    } else { report.steps.push('no #tm-reset found'); report.ok = false; }

  }catch(e){ report.ok=false; report.errors.push(String(e)); }
  finally{ await browser.close(); fs.writeFileSync('tools/tests/report-timer.json', JSON.stringify(report, null, 2)); console.log('Wrote -> tools/tests/report-timer.json'); process.exit(report.ok?0:2); }
})();
