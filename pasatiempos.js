// ==========================================================================
// Menos Ruido - Pasatiempo del Día (Sudoku Diario Determinista y Estadísticas)
// Sin dependencias externas · 100% Client-Side · Generación por semilla de fecha
// ==========================================================================

(function () {
  'use strict';

  // --- 1. PRNG determinista (Mulberry32) ---
  function createPRNG(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Obtener fecha actual YYYY-MM-DD
  function getTodayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getTodayDisplay() {
    const d = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const str = d.toLocaleDateString('es-ES', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getDateSeed(dateStr, mode = 'classic') {
    const parts = dateStr.split('-').map(Number);
    const modeOffset = mode === 'mini' ? 77777 : 12345;
    return parts[0] * 10000 + parts[1] * 100 + parts[2] + modeOffset;
  }

  // --- 2. Generador y Validador Sudoku 9x9 ---
  function generateSolved9(rng) {
    const grid = [];
    for (let r = 0; r < 9; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        row.push(((r * 3 + Math.floor(r / 3) + c) % 9) + 1);
      }
      grid.push(row);
    }

    // 1. Permutar dígitos
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    const map = {};
    for (let i = 0; i < 9; i++) map[i + 1] = digits[i];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) grid[r][c] = map[grid[r][c]];
    }

    // 2. Permutar filas dentro de bloques de 3
    for (let b = 0; b < 3; b++) {
      const order = shuffle([0, 1, 2], rng);
      const orig = grid.slice(b * 3, b * 3 + 3);
      for (let i = 0; i < 3; i++) grid[b * 3 + i] = orig[order[i]];
    }

    // 3. Permutar columnas dentro de bloques de 3
    for (let b = 0; b < 3; b++) {
      const order = shuffle([0, 1, 2], rng);
      for (let r = 0; r < 9; r++) {
        const orig = [grid[r][b * 3], grid[r][b * 3 + 1], grid[r][b * 3 + 2]];
        grid[r][b * 3] = orig[order[0]];
        grid[r][b * 3 + 1] = orig[order[1]];
        grid[r][b * 3 + 2] = orig[order[2]];
      }
    }

    // 4. Permutar bandas de 3 filas
    const bandOrder = shuffle([0, 1, 2], rng);
    const bandCopy = [
      grid.slice(0, 3),
      grid.slice(3, 6),
      grid.slice(6, 9)
    ];
    let newGrid = [];
    for (let i = 0; i < 3; i++) {
      newGrid = newGrid.concat(bandCopy[bandOrder[i]]);
    }

    // 5. Opcional transposición
    if (rng() > 0.5) {
      const transposed = [];
      for (let c = 0; c < 9; c++) {
        const row = [];
        for (let r = 0; r < 9; r++) row.push(newGrid[r][c]);
        transposed.push(row);
      }
      return transposed;
    }

    return newGrid;
  }

  // Solver rápido 9x9 con heurística MRV
  function countSolutions9(grid, limit = 2) {
    let count = 0;
    function getPossibilities(g, r, c) {
      const used = new Uint8Array(10);
      for (let i = 0; i < 9; i++) {
        used[g[r][i]] = 1;
        used[g[i][c]] = 1;
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          used[g[br + dr][bc + dc]] = 1;
        }
      }
      const poss = [];
      for (let v = 1; v <= 9; v++) {
        if (!used[v]) poss.push(v);
      }
      return poss;
    }

    function solve(g) {
      let minPoss = null;
      let bestR = -1, bestC = -1;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (g[r][c] === 0) {
            const p = getPossibilities(g, r, c);
            if (p.length === 0) return;
            if (minPoss === null || p.length < minPoss.length) {
              minPoss = p;
              bestR = r;
              bestC = c;
              if (p.length === 1) break;
            }
          }
        }
        if (minPoss && minPoss.length === 1) break;
      }

      if (bestR === -1) {
        count++;
        return;
      }

      for (let i = 0; i < minPoss.length; i++) {
        g[bestR][bestC] = minPoss[i];
        solve(g);
        g[bestR][bestC] = 0;
        if (count >= limit) return;
      }
    }

    const copy = grid.map(r => r.slice());
    solve(copy);
    return count;
  }

  function createPuzzle9(solved, rng, targetClues = 36) {
    const puzzle = solved.map(r => r.slice());
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push({ r, c });
      }
    }
    const shuffledPositions = shuffle(positions, rng);

    let clues = 81;
    for (const pos of shuffledPositions) {
      if (clues <= targetClues) break;
      const { r, c } = pos;
      if (puzzle[r][c] === 0) continue;

      const val = puzzle[r][c];
      puzzle[r][c] = 0;

      if (countSolutions9(puzzle, 2) === 1) {
        clues--;
      } else {
        puzzle[r][c] = val;
      }
    }
    return puzzle;
  }

  // --- 3. Generador Mini Sudoku 4x4 (2x2) ---
  function generateSolved4(rng) {
    const grid = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1]
    ];
    const digits = shuffle([1, 2, 3, 4], rng);
    const map = { 1: digits[0], 2: digits[1], 3: digits[2], 4: digits[3] };
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) grid[r][c] = map[grid[r][c]];
    }
    if (rng() > 0.5) {
      [grid[0], grid[1]] = [grid[1], grid[0]];
    }
    if (rng() > 0.5) {
      [grid[2], grid[3]] = [grid[3], grid[2]];
    }
    return grid;
  }

  function countSolutions4(grid) {
    let count = 0;
    function isValid(g, r, c, val) {
      for (let i = 0; i < 4; i++) {
        if (g[r][i] === val || g[i][c] === val) return false;
      }
      const br = Math.floor(r / 2) * 2;
      const bc = Math.floor(c / 2) * 2;
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          if (g[br + dr][bc + dc] === val) return false;
        }
      }
      return true;
    }

    function solve(g, r, c) {
      if (r === 4) {
        count++;
        return;
      }
      const nr = c === 3 ? r + 1 : r;
      const nc = c === 3 ? 0 : c + 1;
      if (g[r][c] !== 0) {
        solve(g, nr, nc);
        return;
      }
      for (let v = 1; v <= 4; v++) {
        if (isValid(g, r, c, v)) {
          g[r][c] = v;
          solve(g, nr, nc);
          g[r][c] = 0;
          if (count >= 2) return;
        }
      }
    }
    const copy = grid.map(r => r.slice());
    solve(copy, 0, 0);
    return count;
  }

  function createPuzzle4(solved, rng, targetClues = 6) {
    const puzzle = solved.map(r => r.slice());
    const positions = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) positions.push({ r, c });
    }
    const shuffled = shuffle(positions, rng);
    let clues = 16;
    for (const pos of shuffled) {
      if (clues <= targetClues) break;
      const { r, c } = pos;
      const val = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions4(puzzle) === 1) {
        clues--;
      } else {
        puzzle[r][c] = val;
      }
    }
    return puzzle;
  }

  // --- 4. Gestión de Estado y Estadísticas ---
  const STATS_STORAGE_KEY = 'menosruido_sudoku_stats_v1';
  const STATE_STORAGE_KEY = 'menosruido_sudoku_state_v1';

  function getStats() {
    try {
      const data = localStorage.getItem(STATS_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('LocalStorage inaccesible:', e);
    }
    return {
      streak: 0,
      lastSolvedDate: null,
      totalCompleted: 0,
      bestTime9: null,
      bestTime4: null
    };
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn('Error guardando stats:', e);
    }
  }

  function getSavedState(dateStr, mode) {
    try {
      const data = localStorage.getItem(`${STATE_STORAGE_KEY}_${mode}_${dateStr}`);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return null;
  }

  function saveCurrentState(dateStr, mode, state) {
    try {
      localStorage.setItem(`${STATE_STORAGE_KEY}_${mode}_${dateStr}`, JSON.stringify(state));
    } catch (e) {}
  }

  // --- 5. Controlador Principal de Juego ---
  class SudokuGame {
    constructor() {
      this.mode = 'classic'; // 'classic' (9x9) o 'mini' (4x4)
      this.dateStr = getTodayDateString();
      this.displayDate = getTodayDisplay();
      this.size = 9;
      this.subgrid = 3;
      this.solved = [];
      this.initial = [];
      this.current = [];
      this.selectedCell = null; // { r, c }
      this.secondsElapsed = 0;
      this.timerInterval = null;
      this.isPaused = false;
      this.isCompleted = false;

      this.initElements();
      this.bindEvents();
      this.startDay(this.mode);
      this.updateStatsUI();
    }

    initElements() {
      this.dateLabel = document.getElementById('sudokuDateLabel');
      this.boardContainer = document.getElementById('sudokuBoard');
      this.timerDisplay = document.getElementById('sudokuTimer');
      this.btnPause = document.getElementById('btnPauseTimer');
      this.btnReset = document.getElementById('btnResetBoard');
      this.keypad = document.getElementById('sudokuKeypad');
      this.modeTabs = document.querySelectorAll('[data-sudoku-mode]');
      this.statsModal = document.getElementById('sudokuStatsModal');
      this.victoryModal = document.getElementById('sudokuVictoryModal');

      // Elementos de estadísticas
      this.statStreak = document.getElementById('statCurrentStreak');
      this.statCompleted = document.getElementById('statTotalWins');
      this.statBestTime = document.getElementById('statBestRecord');
    }

    bindEvents() {
      // Cambio de modo (Clásico 9x9 / Mini 4x4)
      this.modeTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const newMode = tab.getAttribute('data-sudoku-mode');
          if (newMode !== this.mode) {
            this.modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.startDay(newMode);
          }
        });
      });

      // Teclado físico
      window.addEventListener('keydown', (e) => {
        if (!this.selectedCell || this.isCompleted || this.isPaused) return;
        const key = e.key;
        const maxVal = this.size;

        if (key >= '1' && key <= String(maxVal)) {
          this.setCellValue(parseInt(key, 10));
        } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
          this.setCellValue(0);
        } else if (key === 'ArrowUp') {
          this.moveSelection(-1, 0);
          e.preventDefault();
        } else if (key === 'ArrowDown') {
          this.moveSelection(1, 0);
          e.preventDefault();
        } else if (key === 'ArrowLeft') {
          this.moveSelection(0, -1);
          e.preventDefault();
        } else if (key === 'ArrowRight') {
          this.moveSelection(0, 1);
          e.preventDefault();
        }
      });

      // Botón pausa
      if (this.btnPause) {
        this.btnPause.addEventListener('click', () => this.togglePause());
      }

      // Botón reiniciar
      if (this.btnReset) {
        this.btnReset.addEventListener('click', () => {
          if (confirm('¿Quieres reiniciar el tablero de hoy?')) {
            this.resetBoard();
          }
        });
      }

      // Botón Ver Estadísticas
      const btnOpenStats = document.getElementById('btnOpenStats');
      if (btnOpenStats && this.statsModal) {
        btnOpenStats.addEventListener('click', () => {
          this.updateStatsUI();
          this.statsModal.classList.add('open');
        });
      }

      // Cerrar modales con data-close-modal
      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.sudoku-modal.open').forEach(m => m.classList.remove('open'));
        });
      });

      // Compartir resultado
      const btnShare = document.getElementById('btnShareResult');
      if (btnShare) {
        btnShare.addEventListener('click', () => {
          const timeText = this.formatTime(this.secondsElapsed);
          const modeName = this.mode === 'classic' ? '9×9' : 'Mini 4×4';
          const text = `Menos Ruido · Sudoku del Día (${modeName})\nFecha: ${this.dateStr}\nTiempo: ${timeText}\n¡Resuelve el tuyo en: https://editorialmenosruido.com/pasatiempos.html`;
          
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
              const original = btnShare.textContent;
              btnShare.textContent = '¡Copiado!';
              setTimeout(() => btnShare.textContent = original, 2000);
            });
          }
        });
      }
    }

    startDay(mode = 'classic') {
      this.mode = mode;
      this.size = mode === 'classic' ? 9 : 4;
      this.subgrid = mode === 'classic' ? 3 : 2;
      this.isCompleted = false;
      this.isPaused = false;
      this.selectedCell = null;

      if (this.dateLabel) {
        this.dateLabel.textContent = `${this.displayDate} · ${mode === 'classic' ? 'Reto 9×9' : 'Mini 4×4'}`;
      }

      const seed = getDateSeed(this.dateStr, this.mode);
      const rng = createPRNG(seed);

      // Generación
      if (this.size === 9) {
        this.solved = generateSolved9(rng);
        this.initial = createPuzzle9(this.solved, rng, 38);
      } else {
        this.solved = generateSolved4(rng);
        this.initial = createPuzzle4(this.solved, rng, 6);
      }

      // Cargar progreso previo si existe
      const saved = getSavedState(this.dateStr, this.mode);
      if (saved && saved.current) {
        this.current = saved.current;
        this.secondsElapsed = saved.secondsElapsed || 0;
        this.isCompleted = !!saved.isCompleted;
      } else {
        this.current = this.initial.map(r => r.slice());
        this.secondsElapsed = 0;
      }

      this.renderBoard();
      this.renderKeypad();
      this.startTimer();

      if (this.isCompleted) {
        this.stopTimer();
        this.showVictory(false);
      }
    }

    renderBoard() {
      if (!this.boardContainer) return;
      this.boardContainer.innerHTML = '';
      this.boardContainer.className = `sudoku-grid-board size-${this.size}`;

      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'sudoku-cell';
          cell.dataset.row = r;
          cell.dataset.col = c;

          // Bordes de subcuadrícula
          if ((r + 1) % this.subgrid === 0 && r + 1 < this.size) {
            cell.classList.add('border-bottom-thick');
          }
          if ((c + 1) % this.subgrid === 0 && c + 1 < this.size) {
            cell.classList.add('border-right-thick');
          }

          const isInitial = this.initial[r][c] !== 0;
          const val = this.current[r][c];

          if (isInitial) {
            cell.classList.add('cell-initial');
            cell.textContent = val;
          } else if (val !== 0) {
            cell.classList.add('cell-user');
            cell.textContent = val;
          }

          cell.addEventListener('click', () => this.selectCell(r, c));
          this.boardContainer.appendChild(cell);
        }
      }

      this.checkConflicts();
    }

    renderKeypad() {
      if (!this.keypad) return;
      this.keypad.innerHTML = '';

      for (let num = 1; num <= this.size; num++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'keypad-btn';
        btn.textContent = num;
        btn.addEventListener('click', () => this.setCellValue(num));
        this.keypad.appendChild(btn);
      }

      // Botón Borrar
      const btnErase = document.createElement('button');
      btnErase.type = 'button';
      btnErase.className = 'keypad-btn keypad-erase';
      btnErase.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`;
      btnErase.title = 'Borrar casilla';
      btnErase.addEventListener('click', () => this.setCellValue(0));
      this.keypad.appendChild(btnErase);

      // Botón Pista
      const btnHint = document.createElement('button');
      btnHint.type = 'button';
      btnHint.className = 'keypad-btn keypad-hint';
      btnHint.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
      btnHint.title = 'Revelar casilla seleccionada';
      btnHint.addEventListener('click', () => this.giveHint());
      this.keypad.appendChild(btnHint);
    }

    selectCell(r, c) {
      if (this.isPaused) return;
      this.selectedCell = { r, c };
      this.highlightRelatedCells();
    }

    moveSelection(dr, dc) {
      if (!this.selectedCell) {
        this.selectCell(0, 0);
        return;
      }
      let newR = this.selectedCell.r + dr;
      let newC = this.selectedCell.c + dc;
      if (newR >= 0 && newR < this.size && newC >= 0 && newC < this.size) {
        this.selectCell(newR, newC);
      }
    }

    highlightRelatedCells() {
      const cells = this.boardContainer.querySelectorAll('.sudoku-cell');
      cells.forEach(c => {
        c.classList.remove('selected', 'highlighted', 'same-digit');
      });

      if (!this.selectedCell) return;
      const { r, c } = this.selectedCell;
      const selectedVal = this.current[r][c];

      const br = Math.floor(r / this.subgrid) * this.subgrid;
      const bc = Math.floor(c / this.subgrid) * this.subgrid;

      cells.forEach(cell => {
        const cr = parseInt(cell.dataset.row, 10);
        const cc = parseInt(cell.dataset.col, 10);

        if (cr === r && cc === c) {
          cell.classList.add('selected');
        } else if (
          cr === r ||
          cc === c ||
          (cr >= br && cr < br + this.subgrid && cc >= bc && cc < bc + this.subgrid)
        ) {
          cell.classList.add('highlighted');
        }

        if (selectedVal !== 0 && this.current[cr][cc] === selectedVal) {
          cell.classList.add('same-digit');
        }
      });
    }

    setCellValue(val) {
      if (!this.selectedCell || this.isCompleted || this.isPaused) return;
      const { r, c } = this.selectedCell;

      // No sobreescribir pistas iniciales
      if (this.initial[r][c] !== 0) return;

      this.current[r][c] = val;

      const cellEl = this.boardContainer.querySelector(`[data-row="${r}"][data-col="${c}"]`);
      if (cellEl) {
        cellEl.textContent = val === 0 ? '' : val;
        if (val === 0) {
          cellEl.classList.remove('cell-user');
        } else {
          cellEl.classList.add('cell-user');
        }
      }

      this.checkConflicts();
      this.highlightRelatedCells();
      this.saveState();

      if (this.checkIfComplete()) {
        this.handleVictory();
      }
    }

    giveHint() {
      if (!this.selectedCell || this.isCompleted || this.isPaused) return;
      const { r, c } = this.selectedCell;
      if (this.initial[r][c] !== 0) return;

      const correctVal = this.solved[r][c];
      this.setCellValue(correctVal);
    }

    checkConflicts() {
      const cells = this.boardContainer.querySelectorAll('.sudoku-cell');
      cells.forEach(c => c.classList.remove('conflict'));

      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const val = this.current[r][c];
          if (val === 0) continue;

          // Comprobar si hay duplicado en fila o columna
          let isConflict = false;
          for (let i = 0; i < this.size; i++) {
            if (i !== c && this.current[r][i] === val) isConflict = true;
            if (i !== r && this.current[i][c] === val) isConflict = true;
          }

          // Duplicado en bloque
          const br = Math.floor(r / this.subgrid) * this.subgrid;
          const bc = Math.floor(c / this.subgrid) * this.subgrid;
          for (let dr = 0; dr < this.subgrid; dr++) {
            for (let dc = 0; dc < this.subgrid; dc++) {
              const rr = br + dr;
              const cc = bc + dc;
              if ((rr !== r || cc !== c) && this.current[rr][cc] === val) {
                isConflict = true;
              }
            }
          }

          if (isConflict) {
            const cell = this.boardContainer.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) cell.classList.add('conflict');
          }
        }
      }
    }

    checkIfComplete() {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.current[r][c] === 0 || this.current[r][c] !== this.solved[r][c]) {
            return false;
          }
        }
      }
      return true;
    }

    handleVictory() {
      this.isCompleted = true;
      this.stopTimer();
      this.saveState();

      // Actualizar estadísticas
      const stats = getStats();
      const today = this.dateStr;

      // Cálculo de racha
      if (stats.lastSolvedDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        if (stats.lastSolvedDate === yStr) {
          stats.streak += 1;
        } else {
          stats.streak = 1;
        }
        stats.lastSolvedDate = today;
        stats.totalCompleted += 1;
      }

      // Récord de tiempo
      if (this.mode === 'classic') {
        if (!stats.bestTime9 || this.secondsElapsed < stats.bestTime9) {
          stats.bestTime9 = this.secondsElapsed;
        }
      } else {
        if (!stats.bestTime4 || this.secondsElapsed < stats.bestTime4) {
          stats.bestTime4 = this.secondsElapsed;
        }
      }

      saveStats(stats);
      this.updateStatsUI();
      this.showVictory(true);
    }

    showVictory(isNew) {
      if (!this.victoryModal) return;
      const victoryTime = document.getElementById('victoryFinalTime');
      const victoryStreak = document.getElementById('victoryStreakCount');
      if (victoryTime) victoryTime.textContent = this.formatTime(this.secondsElapsed);
      if (victoryStreak) victoryStreak.textContent = getStats().streak;
      this.victoryModal.classList.add('open');
    }

    resetBoard() {
      this.current = this.initial.map(r => r.slice());
      this.secondsElapsed = 0;
      this.isCompleted = false;
      this.renderBoard();
      this.startTimer();
      this.saveState();
    }

    // --- Temporizador ---
    startTimer() {
      this.stopTimer();
      this.updateTimerDisplay();
      if (this.isCompleted || this.isPaused) return;

      this.timerInterval = setInterval(() => {
        this.secondsElapsed++;
        this.updateTimerDisplay();
        if (this.secondsElapsed % 5 === 0) {
          this.saveState();
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    togglePause() {
      if (this.isCompleted) return;
      this.isPaused = !this.isPaused;
      if (this.btnPause) {
        this.btnPause.textContent = this.isPaused ? '▶ Continuar' : '⏸ Pausa';
      }
      if (this.isPaused) {
        this.stopTimer();
        this.boardContainer.classList.add('board-paused');
      } else {
        this.boardContainer.classList.remove('board-paused');
        this.startTimer();
      }
    }

    formatTime(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateTimerDisplay() {
      if (this.timerDisplay) {
        this.timerDisplay.textContent = this.formatTime(this.secondsElapsed);
      }
    }

    saveState() {
      saveCurrentState(this.dateStr, this.mode, {
        current: this.current,
        secondsElapsed: this.secondsElapsed,
        isCompleted: this.isCompleted
      });
    }

    updateStatsUI() {
      const stats = getStats();
      if (this.statStreak) this.statStreak.textContent = `${stats.streak} días`;
      if (this.statCompleted) this.statCompleted.textContent = stats.totalCompleted;
      if (this.statBestTime) {
        const best = this.mode === 'classic' ? stats.bestTime9 : stats.bestTime4;
        this.statBestTime.textContent = best ? this.formatTime(best) : '--:--';
      }
    }
  }

  // Inicialización en DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
  });
})();
