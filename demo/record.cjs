// Nagrywa film demo aplikacji (MP4 1920×1080) — widok pracownika i administratora.
//
//   cd demo && npm install && node record.cjs            → out/IT-S_demo.mp4
//   DEMO_PREVIEW=1 node record.cjs                        → szybki przebieg + zrzuty ekranu w out/preview/
//
// Wymaga: Playwright (globalnie lub w NODE_PATH) z Chromium, ffmpeg, pdftoppm (poppler).
// Aplikacja (../index.html) działa tu bez zmian — przekierowujemy tylko:
//   • www.gstatic.com/firebasejs/*  → fake-firebase/* (dane demo w pamięci, prawdziwa baza nietknięta)
//   • cdn.jsdelivr.net (jsPDF, autotable, font Inter do PDF) → lokalne kopie z node_modules
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const DEMO = __dirname;
const ROOT = path.resolve(DEMO, '..');
const OUT = path.join(DEMO, 'out');
const FRAMES = path.join(OUT, 'frames');
const PREVIEW = !!process.env.DEMO_PREVIEW;
const SPEED = PREVIEW ? 0.35 : 1;
const FPS = 30;
const NOW = new Date('2026-11-23T09:14:00+01:00');   // pon. 23 listopada 2026, rano

const sleep = ms => new Promise(r => setTimeout(r, ms * SPEED));

// ───────────── przygotowanie: jsPDF jako jeden moduł ESM (jak „+esm” z jsDelivr) ─────────────
fs.mkdirSync(OUT, { recursive: true });
const JSPDF_BUNDLE = path.join(OUT, 'jspdf.esm.js');
require('esbuild').buildSync({
  stdin: { contents: "export * from 'jspdf'; export { default } from 'jspdf';", resolveDir: DEMO },
  bundle: true, format: 'esm', platform: 'browser', minify: true, outfile: JSPDF_BUNDLE, logLevel: 'error',
  external: ['html2canvas', 'dompurify', 'canvg']
});

// ───────────── lokalny serwer z aplikacją ─────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});

function fulfillFile(route, file, contentType) {
  return route.fulfill({ status: 200, body: fs.readFileSync(file), headers: {
    'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' } });
}

async function main() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  // Polski format pola daty (20.11.2026) wymaga polskiego locale procesu przeglądarki, nie tylko kontekstu.
  const browser = await chromium.launch({
    headless: true, args: ['--font-render-hinting=none', '--lang=pl'],
    env: { ...process.env, LANG: 'pl_PL.UTF-8', LANGUAGE: 'pl', LC_ALL: 'pl_PL.UTF-8' }
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
    locale: 'pl-PL', timezoneId: 'Europe/Warsaw', acceptDownloads: true
  });
  await context.clock.setFixedTime(NOW);

  await context.route('https://www.gstatic.com/firebasejs/**', route => {
    const name = path.basename(new URL(route.request().url()).pathname);
    return fulfillFile(route, path.join(DEMO, 'fake-firebase', name), 'text/javascript');
  });
  await context.route('https://cdn.jsdelivr.net/npm/**', route => {
    const url = route.request().url();
    if (url.includes('/jspdf@2.5.2/')) return fulfillFile(route, JSPDF_BUNDLE, 'text/javascript');
    if (url.includes('/jspdf-autotable@3.8.4/'))
      return fulfillFile(route, path.join(DEMO, 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs'), 'text/javascript');
    const m = url.match(/@expo-google-fonts\/inter@[^/]+\/(.+)$/);
    if (m) return fulfillFile(route, path.join(DEMO, 'node_modules/@expo-google-fonts/inter', m[1]), 'font/ttf');
    return route.abort();
  });

  const page = await context.newPage();
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });

  await page.goto(`${base}/demo/stage.html`);
  await page.evaluate(() => document.fonts.ready);

  // ───────────── nagrywanie: klatki z CDP screencast → pliki JPG z czasem ─────────────
  const frames = [];
  let cdp = null;
  async function startRecording() {
    if (PREVIEW) return;
    fs.rmSync(FRAMES, { recursive: true, force: true });
    fs.mkdirSync(FRAMES, { recursive: true });
    cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      const file = path.join(FRAMES, `f${String(frames.length).padStart(6, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ file, t: metadata.timestamp });
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  }
  async function stopRecording() {
    if (PREVIEW) return;
    await sleep(300);
    const end = Date.now() / 1000;
    await cdp.send('Page.stopScreencast');
    const lines = ['ffconcat version 1.0'];
    frames.forEach((f, i) => {
      const next = i + 1 < frames.length ? frames[i + 1].t : end;
      lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    lines.push(`file '${frames[frames.length - 1].file}'`);
    const list = path.join(OUT, 'frames.ffconcat');
    fs.writeFileSync(list, lines.join('\n'));
    const mp4 = path.join(OUT, 'IT-S_demo.mp4');
    console.log(`Klatki: ${frames.length}, czas: ${(end - frames[0].t).toFixed(1)} s — kodowanie MP4...`);
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage',
      '-movflags', '+faststart', mp4], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg nie powiódł się');
    console.log('Gotowe:', mp4);
  }

  // ───────────── pomocnicze akcje ─────────────
  const app = page.frameLocator('#app');
  const stage = (fn, arg) => page.evaluate(([fn, arg]) => window.stage[fn](arg), [fn, arg]);
  let shotNo = 0;
  async function shot(name) {
    if (!PREVIEW) return;
    fs.mkdirSync(path.join(OUT, 'preview'), { recursive: true });
    await page.screenshot({ path: path.join(OUT, 'preview', `${String(++shotNo).padStart(2, '0')}-${name}.png`) });
  }

  async function ensureVisible(loc) {
    const inView = await loc.evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.top >= 70 && r.bottom <= window.innerHeight - 80;
    });
    if (!inView) {
      await loc.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await waitScrollIdle();
      await sleep(250);
    }
  }
  // Czeka, aż płynne przewijanie się skończy (scrollTop stoi przez ~200 ms).
  async function waitScrollIdle() {
    await app.locator('body').evaluate(b => new Promise(res => {
      let last = -1, stable = 0;
      const tick = () => {
        const y = b.scrollTop;
        if (y === last) { if (++stable >= 4) return res(); } else { stable = 0; last = y; }
        setTimeout(tick, 50);
      };
      tick();
    }));
  }
  async function tap(loc, after = 500) {
    await loc.waitFor({ state: 'visible' });
    await ensureVisible(loc);
    const b = await loc.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate(([x, y]) => window.stage.tap(x, y), [x, y]);
    await sleep(170);
    await page.mouse.click(x, y);
    await sleep(after);
  }
  async function typeInto(loc, text, after = 350) {
    await tap(loc, 250);
    await loc.fill('');   // np. e-mail poprzedniej osoby, który przeglądarka zostawia po wylogowaniu
    await loc.pressSequentially(text, { delay: PREVIEW ? 5 : 55 });
    await sleep(after);
  }
  // W apce przewija się <body> (html i body mają overflow-x: hidden), a nie okno.
  async function scrollApp(y, after = 900) {
    await app.locator('body').evaluate((b, y) => b.scrollTo({ top: y, behavior: 'smooth' }), y);
    await waitScrollIdle();
    await sleep(after);
  }
  async function scrollToEl(loc, block = 'start', offset = 0, after = 1000) {
    await loc.evaluate((el, [block, offset]) => {
      const b = document.body, r = el.getBoundingClientRect();
      const top = block === 'start' ? r.top + b.scrollTop - 70 - offset : r.top + b.scrollTop - (window.innerHeight - r.height) / 2;
      b.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, [block, offset]);
    await waitScrollIdle();
    await sleep(after);
  }
  async function setCardOpen(card, open, after = 800) {
    const isOpen = await card.locator('.employee-details').isVisible();
    if (isOpen !== open) await tap(card.locator('.employee-header'), after);
  }
  const nav = label => app.locator('.page.active .bottom-nav .nav-item', { hasText: label });

  let chapter = { name: '', admin: false, total: 0 }, stepNo = 0;
  async function step(title, text, read = 1600) {
    stepNo++;
    await stage('caption', { chapter: chapter.name, admin: chapter.admin, step: stepNo, total: chapter.total, title, text });
    await sleep(read);
  }
  async function board(html, hold) {
    await stage('board', html);
    await sleep(hold);
  }

  async function showDownloadedPdf(download, label) {
    const pdf = path.join(OUT, download.suggestedFilename());
    await download.saveAs(pdf);
    const png = pdf.replace(/\.pdf$/, '');
    execFileSync('pdftoppm', ['-png', '-r', '150', '-f', '1', '-l', '1', '-singlefile', pdf, png]);
    // Przycinamy pustą część strony A4, żeby tabela była w filmie czytelna.
    execFileSync('convert', [png + '.png', '-trim', '-bordercolor', 'white', '-border', '36', png + '.png']);
    await stage('hideCaption');
    await sleep(350);
    await stage('showPdf', { src: '/demo/out/' + path.basename(png) + '.png?' + Date.now(), label, file: download.suggestedFilename() });
  }
  async function showDownloadedCsv(download, label, maxRows = 22) {
    const file = path.join(OUT, download.suggestedFilename());
    await download.saveAs(file);
    const rows = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r\n/).slice(0, maxRows)
      .map(l => l === '' ? [''] : l.split(';').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')));
    await stage('hideCaption');
    await sleep(350);
    await stage('showCsv', { rows, label, file: download.suggestedFilename() });
  }

  // ═════════════════════════════ SCENARIUSZ ═════════════════════════════
  await stage('loadApp', `${base}/index.html`);
  await app.locator('#login-page.active').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await startRecording();

  // ── intro ──
  await board(`
    <div class="b-kicker">Prezentacja aplikacji</div>
    <div class="b-logo">IT<span>-</span>S</div>
    <div class="b-line"></div>
    <div class="b-title">Ewidencja czasu pracy</div>
    <div class="b-text">Godziny, urlopy i L4 całego zespołu — w telefonie, bez papierów i arkuszy.</div>`, 4200);
  await shot('intro');
  await board(`
    <div class="b-kicker">Część 1</div>
    <div class="b-title" style="margin-top:18px">Widok pracownika</div>
    <div class="b-text">Tomasz Wójcik, serwisant — wpisuje godziny, zgłasza urlop, sprawdza historię.</div>`, 3000);
  await stage('showPhone', true);
  await stage('board', null);
  await sleep(700);

  // ══════════ CZĘŚĆ 1: PRACOWNIK ══════════
  chapter = { name: 'Widok pracownika', admin: false, total: 10 };
  stepNo = 0;

  await step('Zapomniane hasło? Żaden problem', 'Pracownik sam ustawia nowe hasło — link przychodzi na jego e-mail. <b>Bez dzwonienia do szefa.</b>', 1200);
  await tap(app.locator('.login-forgot a'), 600);
  await typeInto(app.locator('#forgot-email'), 'tomasz.wojcik@firma.pl');
  await tap(app.locator('#forgot-box button'), 1500);
  await shot('forgot');
  await sleep(900);
  await tap(app.locator('.login-forgot a'), 500);

  await step('Logowanie', 'Każdy ma własne konto: e-mail i hasło. Aplikacja działa na telefonie i komputerze — można ją dodać do ekranu głównego jak zwykłą apkę.', 1000);
  await typeInto(app.locator('#login-email'), 'tomasz.wojcik@firma.pl', 200);
  await typeInto(app.locator('#login-password'), 'demo1234', 500);
  await tap(app.locator('#login-btn'), 300);
  await sleep(1400);
  await shot('splash');
  await app.locator('#tutorial-overlay.show').waitFor();
  await sleep(600);

  await step('Krótki samouczek na start', 'Przy pierwszym logowaniu aplikacja sama pokazuje, jak z niej korzystać. Można do niego wrócić w każdej chwili ikoną „?”.', 1300);
  await shot('tutorial');
  for (let i = 0; i < 5; i++) await tap(app.locator('#tut-next-btn'), 1050);
  await tap(app.locator('#tut-next-btn'), 900);

  await step('Urlop zawsze na widoku', 'Na pulpicie od razu widać, <b>ile dni urlopu zostało</b> w tym roku, ile już wykorzystano i ile było dni na L4.', 3600);
  await shot('dashboard');

  await step('Podsumowanie miesiąca', 'Godziny, dni pracy, urlop i L4 liczą się same z wpisów. Obok — ile dni roboczych ma miesiąc (z uwzględnieniem świąt).', 600);
  await scrollToEl(app.locator('#dashboard-employee-view .month-stats-head'), 'start', 0, 2600);
  await scrollToEl(app.locator('#dashboard-employee-view .section-header'), 'start', 0, 2200);
  await shot('dashboard-recent');
  await scrollApp(0, 700);

  await step('Dodawanie godzin pracy', 'Typ wpisu, data, liczba godzin i miejsce pracy — <b>zapisane w kilka sekund</b>. Notatka jest opcjonalna.', 900);
  await tap(nav('Dodaj'), 900);
  await tap(app.locator('.stepper-btn').nth(1), 450);
  await tap(app.locator('.stepper-btn').nth(1), 600);
  await typeInto(app.locator('#entry-place'), 'Katowice, ul. Chorzowska 50', 400);
  await tap(app.locator('#note-toggle-btn'), 400);
  await typeInto(app.locator('#entry-note'), 'Montaż okablowania w nowym biurze klienta', 500);
  await shot('add-work');
  await tap(app.locator('#save-entry-btn'), 600);
  await app.locator('#dashboard-page.active').waitFor();
  await sleep(1200);
  await scrollToEl(app.locator('#dashboard-employee-view .month-stats-head'), 'start', 0, 2200);
  await shot('after-add');
  await scrollApp(0, 600);

  await step('Zgłoszenie urlopu', 'Wybieramy „Urlop wypoczynkowy” i dzień. Pula urlopowa <b>od razu się aktualizuje</b> — bez papierowych wniosków.', 900);
  await tap(nav('Dodaj'), 900);
  await tap(app.locator('#type-vacation'), 700);
  const dateInput = app.locator('#entry-date');
  await tap(dateInput, 300);
  await dateInput.fill('2026-12-04');
  await sleep(900);
  await shot('add-vacation');
  await tap(app.locator('#save-entry-btn'), 600);
  await app.locator('#dashboard-page.active').waitFor();
  await sleep(2600);
  await shot('after-vacation');

  await step('Historia i poprawianie wpisów', 'Wszystkie wpisy miesiąc po miesiącu. Pomyłka w godzinach? Wpis można otworzyć i poprawić — tu 9 h zmieniamy na 8,5 h.', 900);
  await tap(nav('Historia'), 1600);
  await shot('history');
  await tap(app.locator('#history-entries .entry-item').first(), 1600);
  await shot('entry-modal');
  await tap(app.locator('#modal-edit-btn'), 1000);
  await tap(app.locator('.stepper-btn').nth(0), 800);
  await tap(app.locator('#save-entry-btn'), 3000);

  await step('Kalendarz obecności', '<b style="color:#4ADE80">Zielony</b> — praca (z liczbą godzin), <b style="color:#A5B4FC">fioletowy</b> — urlop, <b style="color:#F87171">czerwony</b> — brak wpisu, szary — weekend lub święto.', 900);
  await tap(nav('Kalendarz'), 2200);
  await shot('calendar');
  await tap(app.locator('#cal-grid .cal-work').nth(10), 1700);
  await tap(app.locator('#modal-view-actions .btn-outline'), 700);
  await tap(app.locator('#calendar-page .month-btn').first(), 1800);
  await tap(app.locator('#calendar-page .month-btn').last(), 1200);

  await step('Wylogowanie', 'Każdą ważną operację aplikacja potwierdza czytelnym okienkiem.', 900);
  await tap(nav('Pulpit'), 1000);
  await tap(app.locator('#dashboard-page .icon-btn[title="Wyloguj"]'), 1100);
  await shot('logout-confirm');
  await tap(app.locator('#confirm-ok'), 900);
  await app.locator('#login-page.active').waitFor();

  // ══════════ CZĘŚĆ 2: ADMINISTRATOR ══════════
  await stage('hideCaption');
  await board(`
    <div class="b-kicker">Część 2</div>
    <div class="b-title" style="margin-top:18px">Widok administratora</div>
    <div class="b-text">Piotr Mazur, właściciel — widzi cały zespół, urlopy, raporty i zarządza kontami.</div>`, 3200);
  await stage('board', null);
  await sleep(600);

  chapter = { name: 'Widok administratora', admin: true, total: 13 };
  stepNo = 0;

  await step('Ten sam ekran logowania', 'Aplikacja sama rozpoznaje rolę konta i pokazuje szefowi panel administratora.', 900);
  await typeInto(app.locator('#login-email'), 'piotr.mazur@firma.pl', 200);
  await typeInto(app.locator('#login-password'), 'demo1234', 400);
  await tap(app.locator('#login-btn'), 300);
  await app.locator('#tutorial-overlay.show').waitFor();
  await sleep(700);
  for (let i = 0; i < 3; i++) await tap(app.locator('#tut-next-btn'), 500);
  await shot('admin-tutorial');
  await sleep(1400);
  await tap(app.locator('#tut-next-btn'), 1600);
  await tap(app.locator('#tut-next-btn'), 700);
  await tap(app.locator('#tut-next-btn'), 900);

  await step('Kto dziś jest nieobecny', 'Pulpit szefa: kto ma dziś urlop lub L4 oraz godziny, urlopy i L4 całego zespołu w tym miesiącu.', 3600);
  await shot('admin-dashboard');

  await step('Urlopy całego zespołu', 'Przy każdej osobie: <b>ile dni zostało</b>, ile wykorzystano z puli i ile było L4. <b style="color:#FDBA74">Pomarańczowy</b> — pula się kończy, <b style="color:#FCA5A5">czerwony</b> — wykorzystana.', 600);
  await scrollToEl(app.locator('#team-leave-title'), 'start', 0, 2600);
  await shot('team-leave');
  await scrollApp(99999, 2600);
  await shot('team-leave-2');
  await scrollApp(0, 800);

  await step('Podgląd oczami pracownika', 'Jedno kliknięcie w ikonę oka i szef widzi aplikację dokładnie tak, jak jego pracownicy.', 900);
  await tap(app.locator('#view-toggle-btn'), 2400);
  await shot('preview-employee');
  await tap(app.locator('#view-toggle-btn'), 1500);

  await step('Zespół: wszyscy pracownicy', 'Godziny, dni pracy i urlop w wybranym miesiącu oraz roczny pasek urlopu każdej osoby.', 900);
  await tap(nav('Zespół'), 1800);
  await shot('team-list');
  await scrollApp(560, 1800);
  await tap(app.locator('#admin-tab-employees .month-btn').first(), 1400);
  await tap(app.locator('#admin-tab-employees .month-btn').last(), 1000);

  await step('Zmiana puli urlopowej', 'Karolina ma już 10 lat stażu — szef podnosi jej pulę z 20 do 26 dni. Pasek od razu się przelicza.', 900);
  const karolina = app.locator('.employee-card', { hasText: 'Karolina Dąbrowska' });
  await scrollToEl(karolina, 'start', 0, 1200);
  await setCardOpen(karolina, true, 900);
  const pool = karolina.locator('input.pool-input');
  await tap(pool, 300);
  await pool.fill('');
  await pool.pressSequentially('26', { delay: PREVIEW ? 5 : 120 });
  await sleep(500);
  await tap(karolina.locator('button', { hasText: 'Zapisz limity' }), 1400);
  await scrollToEl(karolina, 'start', 0, 1800);
  await shot('pool-changed');
  await setCardOpen(karolina, false, 600);

  await step('Korekta wpisu pracownika', 'Szef może poprawić dowolny wpis w zespole — np. dopisać potwierdzone nadgodziny.', 900);
  const tomasz = app.locator('.employee-card', { hasText: 'Tomasz Wójcik' });
  await scrollToEl(tomasz, 'start', 0, 1200);
  await setCardOpen(tomasz, true, 900);
  const tomaszEntry = tomasz.locator('.entry-item', { hasText: '20.11.2026' });
  await scrollToEl(tomaszEntry, 'center', 0, 1000);
  await tap(tomaszEntry, 1400);
  await tap(app.locator('#modal-edit-btn'), 1000);
  const aeHours = app.locator('#ae-hours');
  await tap(aeHours, 300);
  await aeHours.fill('');
  await aeHours.pressSequentially('10', { delay: PREVIEW ? 5 : 140 });
  await sleep(400);
  const aeNote = app.locator('#ae-note');
  await tap(aeNote, 200);
  await aeNote.press('End');
  await aeNote.pressSequentially(' + 2 h nadgodzin (awaria)', { delay: PREVIEW ? 5 : 50 });
  await sleep(700);
  await shot('admin-edit');
  await tap(app.locator('#modal-edit-actions .btn-primary'), 1500);

  await step('Raport PDF pracownika', 'Miesięczny raport dzień po dniu — z miejscem pracy, notatkami i podsumowaniem. Gotowy do wydruku lub dla księgowości.', 900);
  await setCardOpen(tomasz, true, 700);
  const pdfBtn = tomasz.locator('.btn-export', { hasText: 'PDF' });
  await scrollToEl(pdfBtn, 'center', 0, 900);
  const [pdfDownload] = await Promise.all([page.waitForEvent('download'), tap(pdfBtn, 200)]);
  await sleep(900);
  await showDownloadedPdf(pdfDownload, '📄 Wygenerowany raport PDF');
  await shot('pdf');
  await sleep(5200);
  await stage('hideDoc');
  await sleep(500);

  await step('Eksport zbiorczy CSV i PDF', 'Cała firma w jednym pliku — <b>gotowe do Excela</b> lub programu kadrowego. Ten sam eksport jest też w PDF.', 900);
  await setCardOpen(tomasz, false, 600);
  await scrollApp(0, 900);
  const [csvDownload] = await Promise.all([page.waitForEvent('download'), tap(app.locator('#exp-all-csv'), 200)]);
  await sleep(700);
  await showDownloadedCsv(csvDownload, '📊 Plik CSV otwarty w Excelu');
  await shot('csv');
  await sleep(5000);
  await stage('hideDoc');
  await sleep(500);

  await step('Wszystkie wpisy w jednym miejscu', 'Chronologiczna lista wpisów całego zespołu z danego miesiąca — kto, kiedy, gdzie i ile godzin.', 900);
  await tap(app.locator('#admin-page .tab-btn', { hasText: 'Wszystkie wpisy' }), 1800);
  await shot('all-entries');
  await scrollApp(900, 2000);
  await scrollApp(0, 700);

  await step('Nowy pracownik w kilkanaście sekund', 'Imię, e-mail i hasło startowe — konto gotowe. Pracownik loguje się od razu.', 900);
  await tap(app.locator('#admin-page .tab-btn', { hasText: 'Zarządzaj' }), 1000);
  await typeInto(app.locator('#new-user-name'), 'Adam Nowak', 200);
  await typeInto(app.locator('#new-user-email'), 'adam.nowak@firma.pl', 200);
  await typeInto(app.locator('#new-user-password'), 'Start2026', 500);
  await shot('new-user');
  await tap(app.locator('#admin-tab-manage .btn-primary'), 1500);
  await scrollToEl(app.locator('#manage-users-list'), 'start', 30, 2000);
  await shot('users-list');
  await scrollApp(0, 600);

  await step('Nadawanie uprawnień', 'Każdemu kontu można nadać rolę administratora — np. kierownikowi biura.', 900);
  await tap(app.locator('#admin-page .tab-btn', { hasText: 'Pracownicy' }), 1400);
  const adam = app.locator('.employee-card', { hasText: 'Adam Nowak' });
  await scrollToEl(adam, 'start', 0, 1200);
  await setCardOpen(adam, true, 900);
  const roleSel = adam.locator('select.role-select');
  await scrollToEl(roleSel, 'center', 0, 900);
  await tap(roleSel, 200);
  await roleSel.selectOption('admin');
  await sleep(700);
  await tap(adam.locator('.btn-role'), 1000);
  await shot('role-confirm');
  await tap(app.locator('#confirm-ok'), 1600);
  await scrollToEl(app.locator('.employee-card', { hasText: 'Adam Nowak' }), 'start', 0, 1600);

  await step('Pracownik odchodzi z firmy', 'Konto zostaje zablokowane, a historia wpisów — do wyboru: <b>zachowana do rozliczeń</b> albo trwale usunięta.', 900);
  const marcin = app.locator('.employee-card', { hasText: 'Marcin Wróbel' });
  await scrollToEl(marcin, 'start', 0, 1200);
  await setCardOpen(marcin, true, 900);
  await tap(marcin.locator('.btn-del-emp'), 1300);
  await shot('delete-confirm');
  await tap(app.locator('#confirm-ok'), 1300);
  await shot('history-choice');
  await tap(app.locator('#confirm-cancel'), 1600);
  await scrollApp(0, 1400);

  // ── zakończenie ──
  await stage('hideCaption');
  await board(`
    <div class="b-logo" style="font-size:120px">IT<span>-</span>S</div>
    <div class="b-title" style="margin-top:8px">Ewidencja czasu pracy</div>
    <div class="b-items">
      <div>⏱ Godziny i miejsce pracy</div><div>🏖️ Pule urlopowe</div><div>🤒 L4</div>
      <div>📅 Kalendarz obecności</div><div>👥 Przegląd zespołu</div><div>📄 Raporty PDF i CSV</div>
    </div>
    <div class="b-text" style="margin-top:40px">Telefon, tablet i komputer · bez instalacji ze sklepu · dane w chmurze Google (UE)</div>`, 6500);
  await shot('outro');

  await stopRecording();
  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); server.close(); process.exit(1); });
