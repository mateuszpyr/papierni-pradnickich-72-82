/* ==========================================================
   Warsztat papiernika — minigra inspirowana XV-wieczną
   papiernią nad Prądnikiem (1491). 3 etapy × 6 cykli.
   ========================================================== */
(function () {
  'use strict';

  // --------- Dane: 6 faktów (1 per arkusz, 6 budynków 72-82) ---------
  const FACTS = [
    {
      house: '72',
      title: 'Rzeka, która zmieniła nazwę',
      text: 'Prądnik dawno temu zaczęto nazywać Białuchą — od koloru pyłu mącznego, którym pokrywały się jego brzegi. Tej samej wody używały dawniej także papiernie.'
    },
    {
      house: '74',
      title: '1491 — pierwszy młyn papierniczy',
      text: 'Najstarszy znany na ziemiach polskich młyn papierniczy stanął właśnie nad Prądnikiem. Polska dołączyła do grona producentów papieru niemal w tym samym czasie, gdy Kraków stawał się centrum drukarstwa.'
    },
    {
      house: '76',
      title: 'Jan Haller, drukarz krakowski',
      text: 'W I połowie XVI w. papiernię duchaków nad Prądnikiem dzierżawił Jan Haller — pierwszy zawodowy drukarz Krakowa, wydawca pierwszych polskich książek liturgicznych i podręczników uniwersyteckich.'
    },
    {
      house: '78',
      title: 'Szmaty, woda, papier, książka',
      text: 'Cały łańcuch produkcji rozciągał się między doliną Prądnika a krakowskim Rynkiem: szmaty lniane → mielenie w młynie → czerpanie arkuszy → suszenie → drukarnia → księga.'
    },
    {
      house: '80',
      title: 'I jeszcze chleb prądnicki',
      text: 'Te same młyny mełły też zboże. Z drobnej, białej mąki wypiekano słynny chleb prądnicki — biskupie pieczywo, dziś wpisane na listę produktów tradycyjnych Ministerstwa Rolnictwa.'
    },
    {
      house: '82',
      title: 'Ślad w nazwie ulicy',
      text: 'Po młynach nie zostało prawie nic widocznego, ale nazwa „Papierni Prądnickich” codziennie przypomina, że stoimy na ziemi, na której zaczęła się polska tradycja papiernicza — ponad 500 lat temu.'
    }
  ];

  // --------- Stan gry ---------
  let cycleIndex = 0;        // 0..5
  let stageResults = [];     // wyniki bieżącego cyklu (3 etapy)
  let revealed = [];         // indeksy odsłoniętych faktów

  const stageEl = document.getElementById('gameStage');
  const sheetsEl = document.getElementById('progressSheets');
  const labelEl = document.getElementById('progressLabel');
  const archiveEl = document.getElementById('gameArchive');
  const factsEl = document.getElementById('gameFacts');

  // --------- Progress UI ---------
  function renderProgress() {
    sheetsEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const pip = document.createElement('div');
      pip.className = 'sheet-pip';
      if (revealed.includes(i)) pip.classList.add('done');
      if (i === cycleIndex && !revealed.includes(i)) pip.classList.add('current');
      pip.textContent = FACTS[i].house;
      sheetsEl.appendChild(pip);
    }
    if (revealed.length === 6) {
      labelEl.textContent = 'Wszystkie sześć arkuszy gotowych — Księga Wspólnoty kompletna.';
    } else if (revealed.length === 0) {
      labelEl.textContent = 'Pierwszy arkusz przed Tobą — dla budynku 72.';
    } else {
      labelEl.textContent = `Gotowych: ${revealed.length} z 6 · następny dla budynku ${FACTS[cycleIndex].house}`;
    }
  }

  function renderArchive() {
    if (revealed.length === 0) {
      archiveEl.hidden = true;
      return;
    }
    archiveEl.hidden = false;
    factsEl.innerHTML = '';
    revealed.forEach((idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>Budynek ${FACTS[idx].house} · ${FACTS[idx].title}</strong>${FACTS[idx].text}`;
      factsEl.appendChild(li);
    });
  }

  // --------- INTRO ---------
  function renderIntro() {
    stageEl.innerHTML = `
      <div class="stage-intro">
        <h2>Witaj nad Prądnikiem</h2>
        <p>
          Twój warsztat ma trzy stacje: <strong>młyn z kołem wodnym</strong> (mielenie szmat),
          <strong>wannę z masą papierniczą</strong> (czerpanie sitem) i <strong>strych do suszenia</strong>.
          Każdy gotowy arkusz odsłania jeden fakt z historii naszej ulicy.
        </p>
        <button class="btn-primary" id="btnStart">Rozpocznij pracę</button>
      </div>
    `;
    document.getElementById('btnStart').addEventListener('click', startCycle);
  }

  function startCycle() {
    stageResults = [];
    renderProgress();
    renderMill();
  }

  // ==========================================================
  // ETAP 1: MŁYN — koło wodne i timing
  // ==========================================================
  function renderMill() {
    stageEl.innerHTML = `
      <div class="stage-mill">
        <h2>1. Mielenie szmat</h2>
        <p class="instr">Klikaj w koło wodne (lub naciskaj <strong>spację</strong>), gdy łopata uderza w czerwony znacznik. Pięć trafień zmieli wystarczająco masy.</p>
        <canvas class="mill-canvas" id="millCanvas" width="480" height="280" aria-label="Koło wodne młyna"></canvas>
        <div class="mill-bar"><div class="mill-bar-fill" id="millFill"></div></div>
        <div class="mill-stats">
          <span>Trafienia: <strong id="millHits">0</strong> / 5</span>
          <span>Precyzja: <strong id="millAcc">—</strong></span>
        </div>
        <p class="mill-hint" id="millHint">Wczuj się w rytm koła…</p>
      </div>
    `;
    initMill();
  }

  function initMill() {
    const cvs = document.getElementById('millCanvas');
    const ctx = cvs.getContext('2d');
    const fill = document.getElementById('millFill');
    const hitsEl = document.getElementById('millHits');
    const accEl = document.getElementById('millAcc');
    const hintEl = document.getElementById('millHint');

    const W = cvs.width, H = cvs.height;
    const cx = W / 2, cy = 130;
    const radius = 90;
    let angle = 0;
    const speed = 0.025; // rad/frame
    let hits = 0;
    let totalAccuracy = 0;
    let attempts = 0;
    let running = true;
    let lastHitTime = 0;

    // Marker (target) na top-center: angle = -PI/2
    const targetAngle = -Math.PI / 2;
    const tolerance = 0.35; // accepted window (rad)

    function draw() {
      // Niebo + woda
      ctx.fillStyle = '#5a8fa8';
      ctx.fillRect(0, 0, W, H);
      // Woda płynąca
      ctx.fillStyle = '#3d6b85';
      ctx.fillRect(0, 200, W, 80);
      // Fale
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const off = (Date.now() / 80 + i * 40) % 80;
        ctx.moveTo(off - 20, 210 + i * 12);
        ctx.quadraticCurveTo(off + 20, 205 + i * 12, off + 60, 210 + i * 12);
        ctx.stroke();
      }
      // Most/brzeg
      ctx.fillStyle = '#6b4f2a';
      ctx.fillRect(0, 190, W, 14);
      // Koło wodne
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      // szprychy + łopaty
      ctx.strokeStyle = '#3a2a14';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#8b6f3f';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.stroke();
        // łopata
        ctx.save();
        ctx.rotate(a);
        ctx.fillRect(radius - 14, -10, 18, 20);
        ctx.restore();
      }
      // obręcz
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#3a2a14';
      ctx.lineWidth = 5;
      ctx.stroke();
      // środek
      ctx.fillStyle = '#3a2a14';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Marker (czerwony znacznik na górze)
      ctx.save();
      ctx.translate(cx, cy + Math.sin(targetAngle) * (radius + 18));
      ctx.fillStyle = '#c8553d';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8, 0);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Feedback ring kiedy łopata blisko targeta
      const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const targetN = ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      // find min distance between any spoke and target
      let minDelta = Infinity;
      for (let i = 0; i < 8; i++) {
        const spokeA = ((norm + (i / 8) * Math.PI * 2) % (Math.PI * 2));
        let d = Math.abs(spokeA - targetN);
        if (d > Math.PI) d = Math.PI * 2 - d;
        if (d < minDelta) minDelta = d;
      }
      if (minDelta < tolerance) {
        ctx.strokeStyle = 'rgba(247, 207, 73, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy + Math.sin(targetAngle) * (radius + 18), 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function loop() {
      if (!running) return;
      angle += speed;
      draw();
      requestAnimationFrame(loop);
    }

    function attempt() {
      if (!running) return;
      const now = Date.now();
      if (now - lastHitTime < 200) return; // debounce
      lastHitTime = now;
      // jak blisko któraś łopata jest do markera?
      const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const targetN = ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let minDelta = Infinity;
      for (let i = 0; i < 8; i++) {
        const spokeA = ((norm + (i / 8) * Math.PI * 2) % (Math.PI * 2));
        let d = Math.abs(spokeA - targetN);
        if (d > Math.PI) d = Math.PI * 2 - d;
        if (d < minDelta) minDelta = d;
      }
      attempts++;
      const accuracy = Math.max(0, 1 - minDelta / tolerance);
      if (minDelta < tolerance) {
        hits++;
        totalAccuracy += accuracy;
        flashHit(true);
        hitsEl.textContent = hits;
        fill.style.width = (hits / 5 * 100) + '%';
        const pct = Math.round((totalAccuracy / hits) * 100);
        accEl.textContent = pct + '%';
        hintEl.textContent = hits >= 5 ? 'Masa gotowa! Przechodzimy do wanny…' : 'Świetny rytm — dalej!';
        if (hits >= 5) {
          running = false;
          const stars = pct >= 80 ? 3 : pct >= 55 ? 2 : 1;
          stageResults.push({ stage: 'mill', stars });
          setTimeout(renderVat, 900);
        }
      } else {
        flashHit(false);
        hintEl.textContent = 'Za wcześnie lub za późno — patrz na czerwony znacznik.';
      }
    }

    function flashHit(good) {
      const orig = cvs.style.boxShadow;
      cvs.style.boxShadow = good
        ? '0 0 0 4px rgba(247,207,73,0.7)'
        : '0 0 0 4px rgba(200,85,61,0.5)';
      setTimeout(() => { cvs.style.boxShadow = orig; }, 150);
    }

    cvs.addEventListener('click', attempt);
    const keyHandler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); attempt(); }
    };
    document.addEventListener('keydown', keyHandler);
    // cleanup on stage change: usuwam handler gdy element zniknie
    const obs = new MutationObserver(() => {
      if (!document.contains(cvs)) {
        document.removeEventListener('keydown', keyHandler);
        running = false;
        obs.disconnect();
      }
    });
    obs.observe(stageEl, { childList: true });

    loop();
  }

  // ==========================================================
  // ETAP 2: WANNA — czerpanie sitem (coverage)
  // ==========================================================
  function renderVat() {
    stageEl.innerHTML = `
      <div class="stage-vat">
        <h2>2. Czerpanie arkusza</h2>
        <p class="instr">Przesuń sito (mysz / palec) po całej powierzchni wanny — rozprowadź włókna równomiernie. Im pełniejsze pokrycie, tym lepszy arkusz.</p>
        <canvas class="vat-canvas" id="vatCanvas" width="480" height="320" aria-label="Wanna z masą papierniczą"></canvas>
        <div class="vat-coverage">Pokrycie: <strong id="vatCoverage">0%</strong></div>
        <button class="btn-primary" id="btnDoneVat" disabled>Wyjmij arkusz</button>
      </div>
    `;
    initVat();
  }

  function initVat() {
    const cvs = document.getElementById('vatCanvas');
    const ctx = cvs.getContext('2d');
    const covEl = document.getElementById('vatCoverage');
    const btnDone = document.getElementById('btnDoneVat');

    const W = cvs.width, H = cvs.height;
    const cols = 12, rows = 8;
    const cellW = W / cols, cellH = H / rows;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

    // Włókna w masie (random dots)
    const fibers = [];
    for (let i = 0; i < 220; i++) {
      fibers.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 6 + Math.random() * 14,
        ang: Math.random() * Math.PI * 2,
        col: ['#8b7355', '#a89472', '#6b4f2a'][i % 3]
      });
    }

    let drawing = false;
    let lastUpdate = 0;

    function draw() {
      // tło - mokra masa
      ctx.fillStyle = '#a89472';
      ctx.fillRect(0, 0, W, H);
      // delikatna fala
      const t = Date.now() / 500;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(168,148,114,' + (0.3 - i * 0.08) + ')';
        ctx.fillRect(0, (i * 40 + t * 8) % H, W, 4);
      }
      // włókna
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      fibers.forEach((f) => {
        ctx.strokeStyle = f.col;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + Math.cos(f.ang) * f.len, f.y + Math.sin(f.ang) * f.len);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // ślad sita (coverage cells)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] > 0) {
            const alpha = Math.min(0.85, 0.25 + grid[r][c] * 0.15);
            ctx.fillStyle = `rgba(248, 239, 217, ${alpha})`;
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }
      // siatka sita (cienka)
      ctx.strokeStyle = 'rgba(74,56,32,0.12)';
      ctx.lineWidth = 0.5;
      for (let r = 1; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellH);
        ctx.lineTo(W, r * cellH);
        ctx.stroke();
      }
      for (let c = 1; c < cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, H);
        ctx.stroke();
      }
    }

    function loop() {
      draw();
      if (!document.contains(cvs)) return;
      requestAnimationFrame(loop);
    }

    function getPos(e) {
      const rect = cvs.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      let cx, cy;
      if (e.touches) {
        cx = (e.touches[0].clientX - rect.left) * sx;
        cy = (e.touches[0].clientY - rect.top) * sy;
      } else {
        cx = (e.clientX - rect.left) * sx;
        cy = (e.clientY - rect.top) * sy;
      }
      return { x: cx, y: cy };
    }

    function markAt(x, y) {
      // paint 3x3 cells around
      const c0 = Math.floor(x / cellW);
      const r0 = Math.floor(y / cellH);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = r0 + dr, c = c0 + dc;
          if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
          if (Math.abs(dr) + Math.abs(dc) > 1) continue; // diamond shape
          grid[r][c]++;
        }
      }
      updateCoverage();
    }

    function updateCoverage() {
      let covered = 0, total = rows * cols, over = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] > 0) covered++;
          if (grid[r][c] > 2) over++;
        }
      }
      const pct = Math.round((covered / total) * 100);
      const overPct = over / total;
      covEl.textContent = pct + '%';
      btnDone.disabled = pct < 70;
      // oceń: pokrycie - nadmiar
      btnDone.dataset.score = pct;
      btnDone.dataset.over = over;
    }

    cvs.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); markAt(p.x, p.y); });
    cvs.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const now = Date.now();
      if (now - lastUpdate < 30) return;
      lastUpdate = now;
      const p = getPos(e);
      markAt(p.x, p.y);
    });
    cvs.addEventListener('mouseup', () => { drawing = false; });
    cvs.addEventListener('mouseleave', () => { drawing = false; });
    cvs.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); markAt(p.x, p.y); }, { passive: false });
    cvs.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!drawing) return;
      const now = Date.now();
      if (now - lastUpdate < 30) return;
      lastUpdate = now;
      const p = getPos(e);
      markAt(p.x, p.y);
    }, { passive: false });
    cvs.addEventListener('touchend', () => { drawing = false; });

    btnDone.addEventListener('click', () => {
      const pct = parseInt(btnDone.dataset.score || '0', 10);
      const over = parseInt(btnDone.dataset.over || '0', 10);
      const stars = pct >= 90 && over < 10 ? 3 : pct >= 75 && over < 20 ? 2 : 1;
      stageResults.push({ stage: 'vat', stars });
      renderDry();
    });

    loop();
  }

  // ==========================================================
  // ETAP 3: SUSZENIE — wybór miejsca
  // ==========================================================
  const DRY_SPOTS = [
    { name: 'Słońce', attrs: 'Bardzo ciepło, mocne UV', good: false, reason: 'Zbyt szybkie suszenie — papier się skręci i popęka.' },
    { name: 'Przy palenisku', attrs: 'Gorąco, dym, sadza', good: false, reason: 'Dym pobrudzi arkusz, a wysoka temperatura wykrzywi włókna.' },
    { name: 'Strych z przewiewem', attrs: 'Cień, ruch powietrza', good: true, reason: 'Równomierne suszenie — papier zachowa kształt i biel.' },
    { name: 'Piwnica', attrs: 'Chłodno, wilgotno', good: false, reason: 'Zbyt wolno wyschnie — masa się zacznie psuć i pleśnieć.' }
  ];

  function renderDry() {
    stageEl.innerHTML = `
      <div class="stage-dry">
        <h2>3. Suszenie</h2>
        <p class="instr">Świeży, mokry arkusz musi wyschnąć. Wybierz <strong>najlepsze miejsce</strong> na osuszanie.</p>
        <div class="dry-spots" id="drySpots"></div>
      </div>
    `;
    const wrap = document.getElementById('drySpots');
    DRY_SPOTS.forEach((spot, idx) => {
      const btn = document.createElement('button');
      btn.className = 'dry-spot';
      btn.innerHTML = `
        <div class="dry-spot-name">${spot.name}</div>
        <div class="dry-spot-attrs">${spot.attrs}</div>
      `;
      btn.addEventListener('click', () => chooseDry(idx, btn, wrap));
      wrap.appendChild(btn);
    });
  }

  function chooseDry(idx, btn, wrap) {
    const spot = DRY_SPOTS[idx];
    // disable wszystkie
    wrap.querySelectorAll('.dry-spot').forEach((b, i) => {
      b.disabled = true;
      b.style.cursor = 'default';
      if (DRY_SPOTS[i].good) b.classList.add('revealed-correct');
    });
    btn.classList.remove('revealed-correct');
    btn.classList.add(spot.good ? 'chosen-correct' : 'chosen-wrong');
    // dodaj wyjaśnienie
    const note = document.createElement('p');
    note.style.cssText = 'max-width:540px;text-align:center;color:var(--text-soft);margin:1rem auto 0;font-style:italic;';
    note.textContent = spot.reason;
    wrap.parentElement.appendChild(note);

    const stars = spot.good ? 3 : 1;
    stageResults.push({ stage: 'dry', stars });

    const cont = document.createElement('button');
    cont.className = 'btn-primary';
    cont.style.marginTop = '1rem';
    cont.textContent = 'Zobacz gotowy arkusz';
    cont.addEventListener('click', renderResult);
    wrap.parentElement.appendChild(cont);
  }

  // ==========================================================
  // RESULT — pokazuje arkusz z faktem
  // ==========================================================
  function renderResult() {
    const totalStars = stageResults.reduce((s, r) => s + r.stars, 0);
    const maxStars = stageResults.length * 3;
    const starsHTML = '★'.repeat(totalStars) + '☆'.repeat(maxStars - totalStars);

    const fact = FACTS[cycleIndex];
    revealed.push(cycleIndex);

    stageEl.innerHTML = `
      <div class="stage-result">
        <h2>Arkusz dla budynku ${fact.house} gotowy</h2>
        <div class="result-sheet">
          <strong>${fact.title}</strong>
          <div class="result-sheet-stars">${starsHTML}</div>
          <div class="result-sheet-fact">${fact.text}</div>
        </div>
        <div>
          ${cycleIndex < 5
            ? '<button class="btn-primary" id="btnNext">Czerp kolejny arkusz</button>'
            : '<button class="btn-primary" id="btnVictory">Zamknij Księgę Wspólnoty</button>'
          }
        </div>
      </div>
    `;

    cycleIndex++;
    renderProgress();
    renderArchive();

    if (cycleIndex <= 5) {
      document.getElementById('btnNext').addEventListener('click', startCycle);
    } else {
      document.getElementById('btnVictory').addEventListener('click', renderVictory);
    }
  }

  // ==========================================================
  // VICTORY
  // ==========================================================
  function renderVictory() {
    stageEl.innerHTML = `
      <div class="stage-victory">
        <h2>Mistrz papiernika roku 1491</h2>
        <div class="diploma">
          <h3>Sześć arkuszy, sześć budynków</h3>
          <p>Zostałeś przyjęty do cechu papierników krakowskich. Twoja Księga Wspólnoty jest kompletna — sześć arkuszy, po jednym dla każdego budynku przy ulicy Papierni Prądnickich.</p>
          <p>Niech rzemiosło sprzed pół tysiąca lat trwa w pamięci.</p>
          <div class="seal">⚜</div>
        </div>
        <p>
          <button class="btn-primary" id="btnReplay">Zagraj ponownie</button>
          <a class="btn-secondary" href="history.html">Wróć do historii</a>
        </p>
      </div>
    `;
    document.getElementById('btnReplay').addEventListener('click', () => {
      cycleIndex = 0;
      revealed = [];
      stageResults = [];
      renderProgress();
      renderArchive();
      renderIntro();
    });
  }

  // --------- START ---------
  renderProgress();
  renderArchive();
  renderIntro();
})();
