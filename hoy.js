import { 
            auth, 
            db, 
            doc, 
            getDoc, 
            setDoc, 
            onAuthStateChanged,
            getUserEmail, 
            getUserDisplayName 
        } from './firebase-config.js';
        import { openAuthModal } from './auth-modal.js';

        // REGISTRO DE SERVICE WORKER
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
        }

        /* ==============================================================
           UTILIDADES COMUNES Y FECHAS
           ============================================================== */
        function getTodayString() {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        function formatDisplayDate() {
            const now = new Date();
            const str = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        function formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }

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

        function showToast(msg) {
            const t = document.getElementById('gameToastNotice');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 2200);
        }

        /* ==============================================================
           ESTRUCTURA DE JUEGOS Y CONTROLADORES NATIVOS
           ============================================================== */
        const GAME_KEYS = ['sudoku', 'calcudoku', 'kakuro', 'cruzadas', 'sopa'];
        const GAME_TITLES = {
            sudoku: 'Sudoku del Día',
            calcudoku: 'Calcudoku del Día',
            kakuro: 'Kakuro del Día',
            cruzadas: 'Cruzadas del Día',
            sopa: 'Sopa de Letras del Día'
        };

        const GAME_RULES = {
            sudoku: 'Rellena cada fila, columna y región sin repetir ningún número.',
            calcudoku: 'Números sin repetir por fila/columna. Los grupos delimitados deben cumplir el cálculo matemático.',
            kakuro: 'Rellena casillas blancas del 1 al 9. Las pistas diagonales indican la suma horizontal (→) y vertical (↓) sin números repetidos.',
            cruzadas: 'Encaja las palabras del banco según su longitud y las letras cruzadas compartidas.',
            sopa: 'Encuentra las palabras escondidas en el tablero deslizando o tocando sus casillas.'
        };

        let activeGame = 'sudoku';

        // Estado común de cronómetro y partida para cada juego
        const gameStates = {
            sudoku: { timerSecs: 0, timerRunning: false, isPaused: false, isCompleted: false, hasStarted: false },
            calcudoku: { timerSecs: 0, timerRunning: false, isPaused: false, isCompleted: false, hasStarted: false },
            kakuro: { timerSecs: 0, timerRunning: false, isPaused: false, isCompleted: false, hasStarted: false },
            cruzadas: { timerSecs: 0, timerRunning: false, isPaused: false, isCompleted: false, hasStarted: false },
            sopa: { timerSecs: 0, timerRunning: false, isPaused: false, isCompleted: false, hasStarted: false }
        };

        let globalTimerInterval = null;

        function startGlobalTicker() {
            if (globalTimerInterval) clearInterval(globalTimerInterval);
            globalTimerInterval = setInterval(() => {
                const st = gameStates[activeGame];
                if (st && st.timerRunning && !st.isPaused && !st.isCompleted) {
                    st.timerSecs++;
                    updateTimerDisplay();
                }
            }, 1000);
        }

        function ensureActiveTimerRunning() {
            const st = gameStates[activeGame];
            if (!st) return;
            if (!st.hasStarted && !st.isCompleted) {
                st.hasStarted = true;
                st.timerRunning = true;
                st.isPaused = false;
                updateTimerDisplay();
            } else if (st.isPaused) {
                st.isPaused = false;
                st.timerRunning = true;
                document.getElementById('boardPauseOverlay')?.classList.remove('active');
                document.getElementById('btnOuterPause').textContent = '⏸ Pausa';
            }
        }

        function updateTimerDisplay() {
            const disp = document.getElementById('outerGameTimer');
            if (disp) {
                disp.textContent = formatTime(gameStates[activeGame].timerSecs);
            }
        }

        /* ==============================================================
           1. MOTOR NATIVO: SUDOKU
           ============================================================== */
        const SudokuEngine = (function() {
            let mode = 'classic'; // 'classic' (9x9) | 'mini' (4x4)
            let size = 9;
            let subgrid = 3;
            let initialGrid = [];
            let currentGrid = [];
            let solution = [];
            let selectedCell = null;

            function getDateSeed(dateStr, m) {
                const parts = dateStr.split('-').map(Number);
                const offset = m === 'mini' ? 77777 : 12345;
                return parts[0] * 10000 + parts[1] * 100 + parts[2] + offset;
            }

            function generateSolved9(rng) {
                const grid = [];
                for (let r = 0; r < 9; r++) {
                    const row = [];
                    for (let c = 0; c < 9; c++) {
                        row.push(((r * 3 + Math.floor(r / 3) + c) % 9) + 1);
                    }
                    grid.push(row);
                }
                const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
                const map = {};
                for (let i = 0; i < 9; i++) map[i + 1] = digits[i];
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) grid[r][c] = map[grid[r][c]];
                }
                for (let b = 0; b < 3; b++) {
                    const order = shuffle([0, 1, 2], rng);
                    const orig = grid.slice(b * 3, b * 3 + 3);
                    for (let i = 0; i < 3; i++) grid[b * 3 + i] = orig[order[i]];
                }
                return grid;
            }

            function createPuzzle9(solved, rng, clues = 36) {
                const pz = solved.map(r => r.slice());
                const cells = [];
                for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
                const shuffled = shuffle(cells, rng);
                for (let i = 0; i < 81 - clues; i++) {
                    const [r, c] = shuffled[i];
                    pz[r][c] = 0;
                }
                return pz;
            }

            function generateSolved4(rng) {
                const base = [
                    [1, 2, 3, 4],
                    [3, 4, 1, 2],
                    [2, 1, 4, 3],
                    [4, 3, 2, 1]
                ];
                const digits = shuffle([1, 2, 3, 4], rng);
                const map = {};
                for (let i = 0; i < 4; i++) map[i + 1] = digits[i];
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 4; c++) base[r][c] = map[base[r][c]];
                }
                return base;
            }

            function createPuzzle4(solved, rng) {
                const pz = solved.map(r => r.slice());
                const cells = [];
                for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push([r, c]);
                const shuffled = shuffle(cells, rng);
                for (let i = 0; i < 9; i++) {
                    const [r, c] = shuffled[i];
                    pz[r][c] = 0;
                }
                return pz;
            }

            function init(newMode = 'classic') {
                mode = newMode;
                size = mode === 'classic' ? 9 : 4;
                subgrid = mode === 'classic' ? 3 : 2;
                selectedCell = null;

                const todayStr = getTodayString();
                const seed = getDateSeed(todayStr, mode);
                const rng = createPRNG(seed);

                if (size === 9) {
                    solution = generateSolved9(rng);
                    initialGrid = createPuzzle9(solution, rng, 36);
                } else {
                    solution = generateSolved4(rng);
                    initialGrid = createPuzzle4(solution, rng);
                }

                // Cargar progreso guardado
                const savedRaw = localStorage.getItem(`menosruido_sudoku_state_v1_${mode}_${todayStr}`);
                if (savedRaw) {
                    try {
                        const saved = JSON.parse(savedRaw);
                        currentGrid = saved.current || initialGrid.map(r => r.slice());
                        gameStates.sudoku.timerSecs = saved.secondsElapsed || 0;
                        gameStates.sudoku.isCompleted = !!saved.isCompleted;
                    } catch(e) {
                        currentGrid = initialGrid.map(r => r.slice());
                    }
                } else {
                    currentGrid = initialGrid.map(r => r.slice());
                }

                render();
            }

            function render() {
                const board = document.getElementById('sudokuGrid');
                if (!board) return;
                board.className = `sudoku-board size-${size}`;
                board.innerHTML = '';

                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'sudoku-cell';
                        cell.dataset.r = r;
                        cell.dataset.c = c;
                        const isClue = initialGrid[r][c] !== 0;
                        if (isClue) cell.classList.add('clue');
                        const val = currentGrid[r][c];
                        cell.textContent = val !== 0 ? val : '';

                        cell.addEventListener('click', () => {
                            ensureActiveTimerRunning();
                            onCellClick(r, c);
                        });
                        board.appendChild(cell);
                    }
                }
                updateHighlights();
            }

            function onCellClick(r, c) {
                selectedCell = { r, c };
                updateHighlights();
                updateHelperText();
            }

            function updateHighlights() {
                const cells = document.querySelectorAll('.sudoku-cell');
                cells.forEach(el => el.classList.remove('selected', 'highlight', 'related', 'error'));

                if (!selectedCell) return;
                const { r, c } = selectedCell;
                const selVal = currentGrid[r][c];

                cells.forEach(el => {
                    const er = parseInt(el.dataset.r, 10);
                    const ec = parseInt(el.dataset.c, 10);
                    const val = currentGrid[er][ec];

                    if (er === r && ec === c) {
                        el.classList.add('selected');
                    } else if (selVal !== 0 && val === selVal) {
                        el.classList.add('highlight');
                    } else if (
                        er === r || 
                        ec === c || 
                        (Math.floor(er / subgrid) === Math.floor(r / subgrid) && Math.floor(ec / subgrid) === Math.floor(c / subgrid))
                    ) {
                        el.classList.add('related');
                    }
                });
            }

            function setNumber(num) {
                if (!selectedCell || gameStates.sudoku.isCompleted || gameStates.sudoku.isPaused) return;
                const { r, c } = selectedCell;
                if (initialGrid[r][c] !== 0) return; // Clue fija

                ensureActiveTimerRunning();
                currentGrid[r][c] = num;

                const cellEl = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
                if (cellEl) cellEl.textContent = num !== 0 ? num : '';

                saveProgress();
                updateHighlights();
                checkConflicts();
                checkVictory();
            }

            function checkConflicts() {
                const cells = document.querySelectorAll('.sudoku-cell');
                cells.forEach(el => el.classList.remove('error'));

                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const val = currentGrid[r][c];
                        if (val !== 0) {
                            // Comprobar fila
                            for (let col2 = 0; col2 < size; col2++) {
                                if (col2 !== c && currentGrid[r][col2] === val) {
                                    markError(r, c);
                                    markError(r, col2);
                                }
                            }
                            // Comprobar columna
                            for (let row2 = 0; row2 < size; row2++) {
                                if (row2 !== r && currentGrid[row2][c] === val) {
                                    markError(r, c);
                                    markError(row2, c);
                                }
                            }
                        }
                    }
                }
            }

            function markError(r, c) {
                const el = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
                if (el) el.classList.add('error');
            }

            function hint() {
                if (!selectedCell || gameStates.sudoku.isCompleted) return;
                const { r, c } = selectedCell;
                if (initialGrid[r][c] !== 0) return;
                ensureActiveTimerRunning();
                setNumber(solution[r][c]);
                showToast(`💡 Pista revelada: ${solution[r][c]}`);
            }

            function restart() {
                if (!confirm('¿Reiniciar el Sudoku de hoy?')) return;
                currentGrid = initialGrid.map(r => r.slice());
                gameStates.sudoku.timerSecs = 0;
                gameStates.sudoku.isCompleted = false;
                gameStates.sudoku.hasStarted = false;
                gameStates.sudoku.timerRunning = false;
                selectedCell = null;
                saveProgress();
                render();
                updateTimerDisplay();
                showToast('↺ Sudoku reiniciado');
            }

            function checkVictory() {
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (currentGrid[r][c] !== solution[r][c]) return;
                    }
                }
                // ¡Victoria!
                gameStates.sudoku.isCompleted = true;
                gameStates.sudoku.timerRunning = false;
                saveProgress();
                onGameComplete('sudoku', gameStates.sudoku.timerSecs);
            }

            function saveProgress() {
                const todayStr = getTodayString();
                try {
                    localStorage.setItem(`menosruido_sudoku_state_v1_${mode}_${todayStr}`, JSON.stringify({
                        current: currentGrid,
                        secondsElapsed: gameStates.sudoku.timerSecs,
                        isCompleted: gameStates.sudoku.isCompleted
                    }));
                } catch(e) {}
            }

            function updateHelperText() {
                const left = document.getElementById('helperLeftText');
                if (!left) return;
                if (!selectedCell) {
                    left.innerHTML = `<span>Toca una celda para colocar un número</span>`;
                } else {
                    const { r, c } = selectedCell;
                    const isFixed = initialGrid[r][c] !== 0;
                    left.innerHTML = `<span>Fila ${r+1}, Columna ${c+1} ${isFixed ? '(Pista inicial)' : ''}</span>`;
                }
            }

            return {
                init,
                render,
                setNumber,
                hint,
                restart,
                getMode: () => mode,
                getSize: () => size
            };
        })();

        /* ==============================================================
           2. MOTOR NATIVO: CALCUDOKU (KENKEN)
           ============================================================== */
        const CalcudokuEngine = (function() {
            let currentSize = 4;
            let currentPuzzle = null;
            let currentGrid = [];
            let selectedCell = null;

            const PUZZLES_4X4 = [
                {
                    size: 4,
                    solution: [[1, 2, 4, 3], [3, 4, 2, 1], [4, 1, 3, 2], [2, 3, 1, 4]],
                    cages: [
                        { target: 4, op: "+", cells: [[0, 0], [1, 0]] },
                        { target: 8, op: "*", cells: [[0, 1], [0, 2]] },
                        { target: 3, cells: [[0, 3]] },
                        { target: 2, op: "/", cells: [[1, 1], [1, 2]] },
                        { target: 1, op: "-", cells: [[1, 3], [2, 3]] },
                        { target: 2, op: "/", cells: [[2, 0], [3, 0]] },
                        { target: 2, op: "-", cells: [[2, 1], [3, 1]] },
                        { target: 4, op: "+", cells: [[2, 2], [3, 2]] },
                        { target: 4, cells: [[3, 3]] }
                    ]
                },
                {
                    size: 4,
                    solution: [[2, 1, 3, 4], [4, 3, 2, 1], [3, 4, 1, 2], [1, 2, 4, 3]],
                    cages: [
                        { target: 2, cells: [[0, 0]] },
                        { target: 4, op: "+", cells: [[0, 1], [0, 2]] },
                        { target: 7, op: "+", cells: [[0, 3], [1, 3], [2, 3]] },
                        { target: 1, op: "-", cells: [[1, 0], [2, 0]] },
                        { target: 12, op: "*", cells: [[1, 1], [1, 2], [2, 2]] },
                        { target: 1, cells: [[3, 0]] },
                        { target: 8, op: "*", cells: [[2, 1], [3, 1], [3, 2]] },
                        { target: 3, cells: [[3, 3]] }
                    ]
                }
            ];

            const PUZZLES_5X5 = [
                {
                    size: 5,
                    solution: [
                        [1, 2, 3, 4, 5],
                        [3, 4, 5, 1, 2],
                        [2, 3, 1, 5, 4],
                        [5, 1, 4, 2, 3],
                        [4, 5, 2, 3, 1]
                    ],
                    cages: [
                        { target: 2, op: "/", cells: [[0, 0], [1, 0]] },
                        { target: 5, op: "+", cells: [[0, 1], [0, 2]] },
                        { target: 20, op: "*", cells: [[0, 3], [0, 4]] },
                        { target: 20, op: "*", cells: [[1, 1], [1, 2]] },
                        { target: 2, cells: [[1, 4]] },
                        { target: 1, op: "-", cells: [[1, 3], [2, 3]] },
                        { target: 6, op: "*", cells: [[2, 0], [2, 1]] },
                        { target: 1, cells: [[2, 2]] },
                        { target: 12, op: "*", cells: [[2, 4], [3, 4]] },
                        { target: 5, cells: [[3, 0]] },
                        { target: 3, op: "-", cells: [[3, 1], [4, 1]] },
                        { target: 2, op: "/", cells: [[3, 2], [3, 3]] },
                        { target: 4, cells: [[4, 0]] },
                        { target: 6, op: "+", cells: [[4, 2], [4, 3]] },
                        { target: 1, cells: [[4, 4]] }
                    ]
                }
            ];

            function init(size = 4) {
                currentSize = size;
                selectedCell = null;
                const todayStr = getTodayString();
                const bank = currentSize === 4 ? PUZZLES_4X4 : PUZZLES_5X5;
                const dayNum = parseInt(todayStr.replace(/-/g, ''), 10);
                currentPuzzle = bank[dayNum % bank.length];

                currentGrid = Array.from({ length: currentSize }, () => Array(currentSize).fill(0));

                const savedRaw = localStorage.getItem(`mr_calcudoku_state_${currentSize}_${todayStr}`);
                if (savedRaw) {
                    try {
                        const saved = JSON.parse(savedRaw);
                        currentGrid = saved.grid || currentGrid;
                        gameStates.calcudoku.timerSecs = saved.timerSeconds || 0;
                        gameStates.calcudoku.isCompleted = !!saved.isCompleted;
                    } catch(e) {}
                }

                render();
            }

            function render() {
                const board = document.getElementById('calcudokuGrid');
                if (!board) return;
                board.innerHTML = '';
                board.style.gridTemplateColumns = `repeat(${currentSize}, 1fr)`;
                board.style.gridTemplateRows = `repeat(${currentSize}, 1fr)`;

                for (let r = 0; r < currentSize; r++) {
                    for (let c = 0; c < currentSize; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'calcudoku-cell';
                        cell.dataset.r = r;
                        cell.dataset.c = c;

                        // Encontrar la jaula
                        const cage = currentPuzzle.cages.find(cg => cg.cells.some(([cr, cc]) => cr === r && cc === c));
                        if (cage) {
                            // Bordes gruesos de la jaula
                            const hasTop = cage.cells.some(([cr, cc]) => cr === r - 1 && cc === c);
                            const hasRight = cage.cells.some(([cr, cc]) => cr === r && cc === c + 1);
                            const hasBottom = cage.cells.some(([cr, cc]) => cr === r + 1 && cc === c);
                            const hasLeft = cage.cells.some(([cr, cc]) => cr === r && cc === c - 1);

                            if (!hasTop) cell.classList.add('cage-border-top');
                            if (!hasRight) cell.classList.add('cage-border-right');
                            if (!hasBottom) cell.classList.add('cage-border-bottom');
                            if (!hasLeft) cell.classList.add('cage-border-left');

                            // Etiqueta de la jaula (en la celda superior izquierda)
                            const sorted = cage.cells.slice().sort((a,b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
                            if (sorted[0][0] === r && sorted[0][1] === c) {
                                const lbl = document.createElement('span');
                                lbl.className = 'cage-label';
                                const op = cage.op ? cage.op.replace('*', '×').replace('/', '÷') : '';
                                lbl.textContent = `${cage.target}${op}`;
                                cell.appendChild(lbl);
                            }
                        }

                        const val = currentGrid[r][c];
                        const valSpan = document.createElement('span');
                        valSpan.className = 'calcudoku-val';
                        valSpan.textContent = val !== 0 ? val : '';
                        cell.appendChild(valSpan);

                        cell.addEventListener('click', () => {
                            ensureActiveTimerRunning();
                            onCellClick(r, c);
                        });
                        board.appendChild(cell);
                    }
                }
                updateHighlights();
            }

            function onCellClick(r, c) {
                selectedCell = { r, c };
                updateHighlights();
                updateHelperText();
            }

            function updateHighlights() {
                const cells = document.querySelectorAll('.calcudoku-cell');
                cells.forEach(el => el.classList.remove('selected', 'highlight'));

                if (!selectedCell) return;
                const { r, c } = selectedCell;
                const cage = currentPuzzle.cages.find(cg => cg.cells.some(([cr, cc]) => cr === r && cc === c));

                cells.forEach(el => {
                    const er = parseInt(el.dataset.r, 10);
                    const ec = parseInt(el.dataset.c, 10);
                    if (er === r && ec === c) {
                        el.classList.add('selected');
                    } else if (cage && cage.cells.some(([cr, cc]) => cr === er && cc === ec)) {
                        el.classList.add('highlight');
                    }
                });
            }

            function setNumber(num) {
                if (!selectedCell || gameStates.calcudoku.isCompleted || gameStates.calcudoku.isPaused) return;
                const { r, c } = selectedCell;

                ensureActiveTimerRunning();
                currentGrid[r][c] = num;

                const cellEl = document.querySelector(`.calcudoku-cell[data-r="${r}"][data-c="${c}"] .calcudoku-val`);
                if (cellEl) cellEl.textContent = num !== 0 ? num : '';

                saveProgress();
                checkConflicts();
                checkVictory();
            }

            function checkConflicts() {
                const cells = document.querySelectorAll('.calcudoku-cell');
                cells.forEach(el => el.classList.remove('error'));

                for (let r = 0; r < currentSize; r++) {
                    for (let c = 0; c < currentSize; c++) {
                        const val = currentGrid[r][c];
                        if (val !== 0) {
                            for (let c2 = 0; c2 < currentSize; c2++) {
                                if (c2 !== c && currentGrid[r][c2] === val) {
                                    markError(r, c); markError(r, c2);
                                }
                            }
                            for (let r2 = 0; r2 < currentSize; r2++) {
                                if (r2 !== r && currentGrid[r2][c] === val) {
                                    markError(r, c); markError(r2, c);
                                }
                            }
                        }
                    }
                }
            }

            function markError(r, c) {
                const el = document.querySelector(`.calcudoku-cell[data-r="${r}"][data-c="${c}"]`);
                if (el) el.classList.add('error');
            }

            function hint() {
                if (!selectedCell || gameStates.calcudoku.isCompleted) return;
                const { r, c } = selectedCell;
                ensureActiveTimerRunning();
                setNumber(currentPuzzle.solution[r][c]);
                showToast(`💡 Pista revelada: ${currentPuzzle.solution[r][c]}`);
            }

            function restart() {
                if (!confirm('¿Reiniciar el Calcudoku de hoy?')) return;
                currentGrid = Array.from({ length: currentSize }, () => Array(currentSize).fill(0));
                gameStates.calcudoku.timerSecs = 0;
                gameStates.calcudoku.isCompleted = false;
                gameStates.calcudoku.hasStarted = false;
                gameStates.calcudoku.timerRunning = false;
                selectedCell = null;
                saveProgress();
                render();
                updateTimerDisplay();
                showToast('↺ Calcudoku reiniciado');
            }

            function checkVictory() {
                for (let r = 0; r < currentSize; r++) {
                    for (let c = 0; c < currentSize; c++) {
                        if (currentGrid[r][c] !== currentPuzzle.solution[r][c]) return;
                    }
                }
                gameStates.calcudoku.isCompleted = true;
                gameStates.calcudoku.timerRunning = false;
                saveProgress();
                onGameComplete('calcudoku', gameStates.calcudoku.timerSecs);
            }

            function saveProgress() {
                const todayStr = getTodayString();
                try {
                    localStorage.setItem(`mr_calcudoku_state_${currentSize}_${todayStr}`, JSON.stringify({
                        grid: currentGrid,
                        timerSeconds: gameStates.calcudoku.timerSecs,
                        isCompleted: gameStates.calcudoku.isCompleted
                    }));
                } catch(e) {}
            }

            function updateHelperText() {
                const left = document.getElementById('helperLeftText');
                if (!left) return;
                if (!selectedCell) {
                    left.innerHTML = `<span>Toca una casilla para ver su jaula</span>`;
                    return;
                }
                const { r, c } = selectedCell;
                const cage = currentPuzzle.cages.find(cg => cg.cells.some(([cr, cc]) => cr === r && cc === c));
                if (cage) {
                    const op = cage.op ? cage.op.replace('*', '×').replace('/', '÷') : '';
                    left.innerHTML = `<span>Jaula objetivo: <strong>${cage.target}${op}</strong> (${cage.cells.length} casillas)</span>`;
                }
            }

            return {
                init,
                render,
                setNumber,
                hint,
                restart,
                getSize: () => currentSize
            };
        })();

        /* ==============================================================
           3. MOTOR NATIVO: KAKURO
           ============================================================== */
        const KakuroEngine = (function() {
            let currentSize = 6;
            let currentPuzzle = null;
            let userGrid = [];
            let selectedCell = null;

            const KAKURO_BANK_6X6 = [
                {
                    size: 6,
                    grid: [
                        ['B', 'B', 'B', { down: 3 }, { down: 5 }, { down: 7 }],
                        ['B', 'B', { down: 11, across: 6 }, { val: 1 }, { val: 2 }, { val: 3 }],
                        ['B', { down: 6, across: 10 }, { val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }],
                        [{ across: 3 }, { val: 1 }, { val: 2 }, { down: 7 }, { down: 3 }, 'B'],
                        [{ across: 11 }, { val: 5 }, { val: 3 }, { val: 1 }, { val: 2 }, 'B'],
                        ['B', { across: 12 }, { val: 5 }, { val: 6 }, { val: 1 }, 'B']
                    ]
                },
                {
                    size: 6,
                    grid: [
                        ['B', { down: 5 }, { down: 3 }, 'B', 'B', 'B'],
                        [{ across: 3 }, { val: 2 }, { val: 1 }, { down: 18 }, { down: 10 }, 'B'],
                        [{ across: 14 }, { val: 3 }, { val: 2 }, { val: 5 }, { val: 4 }, { down: 15 }],
                        ['B', 'B', { across: 20 }, { val: 9 }, { val: 3 }, { val: 8 }],
                        ['B', 'B', { across: 10 }, { val: 1 }, { val: 2 }, { val: 7 }],
                        ['B', 'B', { across: 4 }, { val: 3 }, { val: 1 }, 'B']
                    ]
                }
            ];

            const KAKURO_BANK_7X7 = [
                {
                    size: 7,
                    grid: [
                        ['B', 'B', 'B', 'B', 'B', { down: 6 }, { down: 7 }],
                        ['B', 'B', 'B', 'B', { across: 5 }, { val: 3 }, { val: 2 }],
                        ['B', 'B', 'B', { down: 5 }, { down: 29, across: 3 }, { val: 2 }, { val: 1 }],
                        ['B', { down: 3 }, { down: 17, across: 16 }, { val: 2 }, { val: 9 }, { val: 1 }, { val: 4 }],
                        [{ across: 21 }, { val: 1 }, { val: 9 }, { val: 3 }, { val: 8 }, { down: 16 }, { down: 14 }],
                        [{ across: 10 }, { val: 2 }, { val: 8 }, { across: 18 }, { val: 5 }, { val: 7 }, { val: 6 }],
                        ['B', 'B', 'B', { across: 24 }, { val: 7 }, { val: 9 }, { val: 8 }]
                    ]
                }
            ];

            function init(size = 6) {
                currentSize = size;
                selectedCell = null;
                const todayStr = getTodayString();
                const bank = currentSize === 6 ? KAKURO_BANK_6X6 : KAKURO_BANK_7X7;
                const dayNum = parseInt(todayStr.replace(/-/g, ''), 10);
                currentPuzzle = bank[dayNum % bank.length];

                userGrid = Array.from({ length: currentSize }, () => Array(currentSize).fill(0));

                const savedRaw = localStorage.getItem(`mr_kakuro_state_${currentSize}_${todayStr}`);
                if (savedRaw) {
                    try {
                        const saved = JSON.parse(savedRaw);
                        userGrid = saved.grid || userGrid;
                        gameStates.kakuro.timerSecs = saved.timerSeconds || 0;
                        gameStates.kakuro.isCompleted = !!saved.isCompleted;
                    } catch(e) {}
                }

                render();
            }

            function render() {
                const board = document.getElementById('kakuroGrid');
                if (!board) return;
                board.innerHTML = '';
                board.style.gridTemplateColumns = `repeat(${currentSize}, 1fr)`;
                board.style.gridTemplateRows = `repeat(${currentSize}, 1fr)`;

                for (let r = 0; r < currentSize; r++) {
                    for (let c = 0; c < currentSize; c++) {
                        const cellData = currentPuzzle.grid[r][c];
                        const cell = document.createElement('div');
                        cell.className = 'kakuro-cell';
                        cell.dataset.r = r;
                        cell.dataset.c = c;

                        if (cellData === 'B') {
                            cell.classList.add('block');
                        } else if (cellData.val !== undefined) {
                            cell.classList.add('white-cell');
                            const val = userGrid[r][c];
                            cell.textContent = val !== 0 ? val : '';
                            cell.addEventListener('click', () => {
                                ensureActiveTimerRunning();
                                onCellClick(r, c);
                            });
                        } else {
                            // Celda de pista con diagonal
                            cell.classList.add('clue-cell');
                            cell.innerHTML = `
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <line x1="0" y1="0" x2="100" y2="100" stroke="#bbb2a6" stroke-width="2" />
                                </svg>
                                ${cellData.across ? `<span class="clue-across">${cellData.across}</span>` : ''}
                                ${cellData.down ? `<span class="clue-down">${cellData.down}</span>` : ''}
                            `;
                        }

                        board.appendChild(cell);
                    }
                }
                updateHighlights();
            }

            function onCellClick(r, c) {
                selectedCell = { r, c };
                updateHighlights();
                updateHelperText();
            }

            function updateHighlights() {
                const cells = document.querySelectorAll('.kakuro-cell.white-cell');
                cells.forEach(el => el.classList.remove('selected', 'highlight'));

                if (!selectedCell) return;
                const { r, c } = selectedCell;

                cells.forEach(el => {
                    const er = parseInt(el.dataset.r, 10);
                    const ec = parseInt(el.dataset.c, 10);
                    if (er === r && ec === c) el.classList.add('selected');
                    else if (er === r || ec === c) el.classList.add('highlight');
                });
            }

            function setNumber(num) {
                if (!selectedCell || gameStates.kakuro.isCompleted || gameStates.kakuro.isPaused) return;
                const { r, c } = selectedCell;

                ensureActiveTimerRunning();
                userGrid[r][c] = num;

                const cellEl = document.querySelector(`.kakuro-cell[data-r="${r}"][data-c="${c}"]`);
                if (cellEl) cellEl.textContent = num !== 0 ? num : '';

                saveProgress();
                checkVictory();
            }

            function hint() {
                if (!selectedCell || gameStates.kakuro.isCompleted) return;
                const { r, c } = selectedCell;
                const target = currentPuzzle.grid[r][c];
                if (target && target.val !== undefined) {
                    ensureActiveTimerRunning();
                    setNumber(target.val);
                    showToast(`💡 Pista revelada: ${target.val}`);
                }
            }

            function restart() {
                if (!confirm('¿Reiniciar el Kakuro de hoy?')) return;
                userGrid = Array.from({ length: currentSize }, () => Array(currentSize).fill(0));
                gameStates.kakuro.timerSecs = 0;
                gameStates.kakuro.isCompleted = false;
                gameStates.kakuro.hasStarted = false;
                gameStates.kakuro.timerRunning = false;
                selectedCell = null;
                saveProgress();
                render();
                updateTimerDisplay();
                showToast('↺ Kakuro reiniciado');
            }

            function checkVictory() {
                for (let r = 0; r < currentSize; r++) {
                    for (let c = 0; c < currentSize; c++) {
                        const cellData = currentPuzzle.grid[r][c];
                        if (cellData && cellData.val !== undefined) {
                            if (userGrid[r][c] !== cellData.val) return;
                        }
                    }
                }
                gameStates.kakuro.isCompleted = true;
                gameStates.kakuro.timerRunning = false;
                saveProgress();
                onGameComplete('kakuro', gameStates.kakuro.timerSecs);
            }

            function saveProgress() {
                const todayStr = getTodayString();
                try {
                    localStorage.setItem(`mr_kakuro_state_${currentSize}_${todayStr}`, JSON.stringify({
                        grid: userGrid,
                        timerSeconds: gameStates.kakuro.timerSecs,
                        isCompleted: gameStates.kakuro.isCompleted
                    }));
                } catch(e) {}
            }

            function updateHelperText() {
                const left = document.getElementById('helperLeftText');
                if (!left) return;
                if (!selectedCell) {
                    left.innerHTML = `<span>Toca una casilla blanca para ver sus sumas</span>`;
                    return;
                }
                const { r, c } = selectedCell;
                // Buscar pistas hacia arriba y hacia la izquierda
                let acrossClue = null;
                for (let col = c - 1; col >= 0; col--) {
                    const item = currentPuzzle.grid[r][col];
                    if (item === 'B') break;
                    if (item && item.across !== undefined) { acrossClue = item.across; break; }
                }
                let downClue = null;
                for (let row = r - 1; row >= 0; row--) {
                    const item = currentPuzzle.grid[row][c];
                    if (item === 'B') break;
                    if (item && item.down !== undefined) { downClue = item.down; break; }
                }

                const parts = [];
                if (acrossClue) parts.push(`Suma horizontal: <strong>${acrossClue} →</strong>`);
                if (downClue) parts.push(`Suma vertical: <strong>${downClue} ↓</strong>`);
                left.innerHTML = `<span>${parts.join(' &nbsp;|&nbsp; ') || 'Casilla blanca'}</span>`;
            }

            return {
                init,
                render,
                setNumber,
                hint,
                restart,
                getSize: () => currentSize
            };
        })();

        /* ==============================================================
           4. MOTOR NATIVO: CRUZADAS (WORD FIT)
           ============================================================== */
        const CruzadasEngine = (function() {
            const THEMES = [
                { theme: "Desconexión", words: ["PAUSA", "CALMA", "PAPEL", "RITMO", "SILENCIO", "LENTO", "TIEMPO", "AIRE", "SOL", "LIBRO", "MENTE", "FOCO", "SERENO"] },
                { theme: "Naturaleza", words: ["BOSQUE", "SENDERO", "ARBOL", "HOJA", "RAMA", "BARRO", "RIO", "FLOR", "LAGO", "VIENTO", "PIEDRA", "VERDE", "TIERRA"] },
                { theme: "Café y Mañanas", words: ["AROMA", "GRANO", "MOLINO", "TAZA", "LECHE", "CALOR", "VAPOR", "SABOR", "ORIGEN", "AGUA", "NEGRO", "TOSTADO"] },
                { theme: "Agilidad Mental", words: ["LOGICA", "ENIGMA", "PISTA", "CLAVE", "RETO", "IDEAS", "FOCO", "MEMORIA", "ORDEN", "PASO", "RANGO", "CRUZADA"] },
                { theme: "Lectura y Papel", words: ["PAGINA", "PLUMA", "TEXTO", "TINTA", "LETRA", "VERSO", "AUTOR", "HOJA", "LIBRO", "PROSA", "LECTURA", "OBRA"] }
            ];

            let currentPuzzle = null;
            let currentGrid = [];
            let solutionGrid = [];
            let isBlackGrid = [];
            let isStarterGrid = [];
            let selectedRow = -1;
            let selectedCol = -1;
            let currentDir = "H";

            function getDaySeed(dateStr) {
                let hash = 0;
                for (let i = 0; i < dateStr.length; i++) hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
                return Math.abs(hash);
            }

            function generateDailyLayout(themeObj, seed) {
                const GRID_DIM = 10;
                const prng = createPRNG(seed);
                const cleanWords = themeObj.words.map(w => w.toUpperCase().trim()).filter(w => w.length >= 3 && w.length <= 8);

                let bestGrid = null;
                let bestPlaced = [];

                for (let attempt = 0; attempt < 16; attempt++) {
                    const grid = Array.from({ length: GRID_DIM }, () => Array(GRID_DIM).fill(null));
                    const placed = [];
                    const pool = cleanWords.slice().sort(() => prng() - 0.5);
                    const first = pool.find(w => w.length >= 5 && w.length <= 7) || pool[0];
                    if (!first) continue;

                    const firstHoriz = prng() > 0.5;
                    const startR = firstHoriz ? Math.floor(GRID_DIM / 2) : Math.floor((GRID_DIM - first.length) / 2);
                    const startC = firstHoriz ? Math.floor((GRID_DIM - first.length) / 2) : Math.floor(GRID_DIM / 2);

                    const firstCells = [];
                    for (let k = 0; k < first.length; k++) {
                        const r = firstHoriz ? startR : startR + k;
                        const c = firstHoriz ? startC + k : startC;
                        grid[r][c] = first[k];
                        firstCells.push([r, c]);
                    }
                    placed.push({ word: first, r: startR, c: startC, isHoriz: firstHoriz, cells: firstCells });

                    const remaining = pool.filter(w => w !== first);
                    for (const word of remaining) {
                        const len = word.length;
                        const validPlacements = [];

                        for (const p of placed) {
                            const targetHoriz = !p.isHoriz;
                            for (let i = 0; i < len; i++) {
                                for (let j = 0; j < p.word.length; j++) {
                                    if (p.word[j] === word[i]) {
                                        const intersectR = p.isHoriz ? p.r : p.r + j;
                                        const intersectC = p.isHoriz ? p.c + j : p.c;
                                        const candR = targetHoriz ? intersectR : intersectR - i;
                                        const candC = targetHoriz ? intersectC - i : intersectC;
                                        const candEndR = targetHoriz ? candR : candR + len - 1;
                                        const candEndC = targetHoriz ? candC + len - 1 : candC;

                                        if (candR >= 0 && candEndR < GRID_DIM && candC >= 0 && candEndC < GRID_DIM) {
                                            let canPlace = true;
                                            const cells = [];
                                            for (let k = 0; k < len; k++) {
                                                const r = targetHoriz ? candR : candR + k;
                                                const c = targetHoriz ? candC + k : candC;
                                                if (grid[r][c] !== null && grid[r][c] !== word[k]) { canPlace = false; break; }
                                                cells.push([r, c]);
                                            }
                                            if (canPlace) validPlacements.push({ word, r: candR, c: candC, isHoriz: targetHoriz, cells });
                                        }
                                    }
                                }
                            }
                        }

                        if (validPlacements.length > 0) {
                            const chosen = validPlacements[Math.floor(prng() * validPlacements.length)];
                            for (let k = 0; k < len; k++) {
                                const [r, c] = chosen.cells[k];
                                grid[r][c] = word[k];
                            }
                            placed.push(chosen);
                        }
                    }

                    if (!bestGrid || placed.length > bestPlaced.length) {
                        bestGrid = grid;
                        bestPlaced = placed;
                    }
                }

                // Pistas iniciales
                const starterClues = [];
                if (bestPlaced.length > 0) {
                    const sorted = bestPlaced.slice().sort((a,b) => a.word.length - b.word.length);
                    sorted[0].cells.forEach(([r, c]) => {
                        starterClues.push({ row: r, col: c, letter: bestGrid[r][c] });
                    });
                }

                const words = bestPlaced.map(p => ({
                    word: p.word,
                    row: p.r,
                    col: p.c,
                    dir: p.isHoriz ? "H" : "V",
                    cells: p.cells
                }));

                return {
                    theme: themeObj.theme,
                    size: GRID_DIM,
                    grid: bestGrid,
                    words: words,
                    starterClues: starterClues
                };
            }

            function init() {
                const todayStr = getTodayString();
                const seed = getDaySeed(todayStr);
                const themeObj = THEMES[seed % THEMES.length];
                currentPuzzle = generateDailyLayout(themeObj, seed);

                const N = currentPuzzle.size;
                solutionGrid = currentPuzzle.grid;
                isBlackGrid = Array.from({ length: N }, () => Array(N).fill(true));
                isStarterGrid = Array.from({ length: N }, () => Array(N).fill(false));
                currentGrid = Array.from({ length: N }, () => Array(N).fill(null));

                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < N; c++) {
                        if (solutionGrid[r][c] !== null) {
                            isBlackGrid[r][c] = false;
                            currentGrid[r][c] = "";
                        }
                    }
                }

                currentPuzzle.starterClues.forEach(clue => {
                    currentGrid[clue.row][clue.col] = clue.letter.toUpperCase();
                    isStarterGrid[clue.row][clue.col] = true;
                });

                // Cargar progreso previo
                const savedRaw = localStorage.getItem(`mr_cruzadas_daily_${todayStr}`);
                if (savedRaw) {
                    try {
                        const saved = JSON.parse(savedRaw);
                        if (saved.grid) currentGrid = saved.grid;
                        gameStates.cruzadas.timerSecs = saved.timerSeconds || 0;
                        gameStates.cruzadas.isCompleted = !!saved.completed;
                    } catch(e) {}
                }

                render();
                renderWordBank();
                buildQwerty();
            }

            function render() {
                const board = document.getElementById('cruzadasGrid');
                if (!board) return;
                board.innerHTML = '';
                const N = currentPuzzle.size;
                board.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
                board.style.gridTemplateRows = `repeat(${N}, 1fr)`;

                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < N; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'cruzadas-cell';
                        cell.dataset.r = r;
                        cell.dataset.c = c;

                        if (isBlackGrid[r][c]) {
                            cell.classList.add('cell-black');
                        } else {
                            if (isStarterGrid[r][c]) cell.classList.add('starter-clue');
                            cell.textContent = currentGrid[r][c] || '';
                            cell.addEventListener('click', () => {
                                ensureActiveTimerRunning();
                                onCellClick(r, c);
                            });
                        }
                        board.appendChild(cell);
                    }
                }
                updateHighlights();
            }

            function onCellClick(r, c) {
                if (isBlackGrid[r][c]) return;
                if (selectedRow === r && selectedCol === c) {
                    currentDir = currentDir === "H" ? "V" : "H";
                } else {
                    selectedRow = r;
                    selectedCol = c;
                    const hasHoriz = (c > 0 && !isBlackGrid[r][c-1]) || (c < currentPuzzle.size - 1 && !isBlackGrid[r][c+1]);
                    const hasVert = (r > 0 && !isBlackGrid[r-1][c]) || (r < currentPuzzle.size - 1 && !isBlackGrid[r+1][c]);
                    if (currentDir === "H" && !hasHoriz && hasVert) currentDir = "V";
                    if (currentDir === "V" && !hasVert && hasHoriz) currentDir = "H";
                }
                updateHighlights();
                updateHelperText();
            }

            function getSlotCells(r, c, dir) {
                const list = [];
                const N = currentPuzzle.size;
                if (dir === "H") {
                    let startC = c;
                    while (startC > 0 && !isBlackGrid[r][startC - 1]) startC--;
                    let endC = c;
                    while (endC < N - 1 && !isBlackGrid[r][endC + 1]) endC++;
                    for (let col = startC; col <= endC; col++) list.push({ r, c: col });
                } else {
                    let startR = r;
                    while (startR > 0 && !isBlackGrid[startR - 1][c]) startR--;
                    let endR = r;
                    while (endR < N - 1 && !isBlackGrid[endR + 1][c]) endR++;
                    for (let row = startR; row <= endR; row++) list.push({ r: row, c });
                }
                return list;
            }

            function updateHighlights() {
                const cells = document.querySelectorAll('.cruzadas-cell');
                cells.forEach(el => el.classList.remove('selected', 'in-slot', 'conflict'));

                if (selectedRow < 0 || selectedCol < 0) return;

                const slotCells = getSlotCells(selectedRow, selectedCol, currentDir);
                slotCells.forEach(pos => {
                    const el = document.querySelector(`.cruzadas-cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
                    if (el) el.classList.add('in-slot');
                });

                const activeEl = document.querySelector(`.cruzadas-cell[data-r="${selectedRow}"][data-c="${selectedCol}"]`);
                if (activeEl) activeEl.classList.add('selected');

                // Resaltar letras incorrectas
                for (let r = 0; r < currentPuzzle.size; r++) {
                    for (let c = 0; c < currentPuzzle.size; c++) {
                        if (!isBlackGrid[r][c] && !isStarterGrid[r][c]) {
                            const val = currentGrid[r][c];
                            if (val && val !== solutionGrid[r][c]) {
                                const el = document.querySelector(`.cruzadas-cell[data-r="${r}"][data-c="${c}"]`);
                                if (el) el.classList.add('conflict');
                            }
                        }
                    }
                }
            }

            function renderWordBank() {
                const container = document.getElementById('cruzadasWordGroups');
                if (!container) return;
                container.innerHTML = '';

                const grouped = {};
                currentPuzzle.words.forEach(w => {
                    const len = w.word.length;
                    if (!grouped[len]) grouped[len] = [];
                    grouped[len].push(w.word.toUpperCase());
                });

                Object.keys(grouped).map(Number).sort((a,b) => a - b).forEach(len => {
                    const row = document.createElement('div');
                    row.className = 'cruzadas-group-row';
                    const badge = document.createElement('span');
                    badge.className = 'cruzadas-len-badge';
                    badge.textContent = `${len} letras`;
                    row.appendChild(badge);

                    const chipsBox = document.createElement('div');
                    chipsBox.className = 'cruzadas-chips-box';
                    grouped[len].sort().forEach(word => {
                        const chip = document.createElement('span');
                        chip.className = 'word-chip';
                        chip.id = `crz-chip-${word}`;
                        chip.textContent = word;
                        chip.addEventListener('click', () => {
                            ensureActiveTimerRunning();
                            fitWordToSlot(word);
                        });
                        chipsBox.appendChild(chip);
                    });
                    row.appendChild(chipsBox);
                    container.appendChild(row);
                });

                updateWordChipsState();
            }

            function fitWordToSlot(word) {
                if (selectedRow < 0 || selectedCol < 0) return;
                const slotCells = getSlotCells(selectedRow, selectedCol, currentDir);
                if (slotCells.length === word.length) {
                    slotCells.forEach((pos, i) => {
                        if (!isStarterGrid[pos.r][pos.c]) {
                            currentGrid[pos.r][pos.c] = word[i];
                            const el = document.querySelector(`.cruzadas-cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
                            if (el) el.textContent = word[i];
                        }
                    });
                    saveProgress();
                    updateHighlights();
                    updateWordChipsState();
                    checkVictory();
                } else {
                    showToast(`La palabra tiene ${word.length} letras y el hueco tiene ${slotCells.length}`);
                }
            }

            function updateWordChipsState() {
                let count = 0;
                currentPuzzle.words.forEach(wObj => {
                    const word = wObj.word.toUpperCase();
                    const chip = document.getElementById(`crz-chip-${word}`);
                    let matches = true;
                    for (let i = 0; i < word.length; i++) {
                        const r = wObj.dir === "H" ? wObj.row : wObj.row + i;
                        const c = wObj.dir === "H" ? wObj.col + i : wObj.col;
                        if (currentGrid[r][c] !== word[i]) { matches = false; break; }
                    }
                    if (chip) chip.classList.toggle('found', matches);
                    if (matches) count++;
                });

                const counter = document.getElementById('helperRightText');
                if (counter && activeGame === 'cruzadas') {
                    counter.textContent = `${count} / ${currentPuzzle.words.length} encajadas`;
                }
            }

            function handleLetterInput(letter) {
                if (selectedRow < 0 || selectedCol < 0 || gameStates.cruzadas.isCompleted || gameStates.cruzadas.isPaused) return;
                if (isBlackGrid[selectedRow][selectedCol]) return;

                ensureActiveTimerRunning();
                if (!isStarterGrid[selectedRow][selectedCol]) {
                    currentGrid[selectedRow][selectedCol] = letter.toUpperCase();
                    const el = document.querySelector(`.cruzadas-cell[data-r="${selectedRow}"][data-c="${selectedCol}"]`);
                    if (el) el.textContent = letter.toUpperCase();
                }

                // Avanzar cursor en el slot
                advanceCursor();
                saveProgress();
                updateHighlights();
                updateWordChipsState();
                checkVictory();
            }

            function advanceCursor() {
                const N = currentPuzzle.size;
                let nr = selectedRow;
                let nc = selectedCol;
                if (currentDir === "H") {
                    nc++;
                    if (nc < N && !isBlackGrid[nr][nc]) selectedCol = nc;
                } else {
                    nr++;
                    if (nr < N && !isBlackGrid[nr][nc]) selectedRow = nr;
                }
            }

            function handleBackspace() {
                if (selectedRow < 0 || selectedCol < 0 || gameStates.cruzadas.isCompleted || gameStates.cruzadas.isPaused) return;
                ensureActiveTimerRunning();

                if (!isStarterGrid[selectedRow][selectedCol] && currentGrid[selectedRow][selectedCol] !== "") {
                    currentGrid[selectedRow][selectedCol] = "";
                    const el = document.querySelector(`.cruzadas-cell[data-r="${selectedRow}"][data-c="${selectedCol}"]`);
                    if (el) el.textContent = "";
                } else {
                    // Retroceder cursor
                    if (currentDir === "H" && selectedCol > 0 && !isBlackGrid[selectedRow][selectedCol-1]) selectedCol--;
                    else if (currentDir === "V" && selectedRow > 0 && !isBlackGrid[selectedRow-1][selectedCol]) selectedRow--;
                    if (!isStarterGrid[selectedRow][selectedCol]) {
                        currentGrid[selectedRow][selectedCol] = "";
                        const el = document.querySelector(`.cruzadas-cell[data-r="${selectedRow}"][data-c="${selectedCol}"]`);
                        if (el) el.textContent = "";
                    }
                }
                saveProgress();
                updateHighlights();
                updateWordChipsState();
            }

            function buildQwerty() {
                const r1 = document.getElementById('qwertyRow1');
                const r2 = document.getElementById('qwertyRow2');
                const r3 = document.getElementById('qwertyRow3');
                if (!r1 || !r2 || !r3) return;

                r1.innerHTML = 'QWERTYUIOP'.split('').map(k => `<button type="button" class="qwerty-key" data-k="${k}">${k}</button>`).join('');
                r2.innerHTML = 'ASDFGHJKLÑ'.split('').map(k => `<button type="button" class="qwerty-key" data-k="${k}">${k}</button>`).join('');
                r3.innerHTML = `
                    <button type="button" class="qwerty-key qwerty-action" id="btnToggleDir">DIR ⇄</button>
                    ${'ZXCVBNM'.split('').map(k => `<button type="button" class="qwerty-key" data-k="${k}">${k}</button>`).join('')}
                    <button type="button" class="qwerty-key qwerty-action" data-k="BACKSPACE">⌫</button>
                `;

                document.querySelectorAll('.qwerty-key').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const k = btn.dataset.k;
                        if (k === 'BACKSPACE') handleBackspace();
                        else if (k) handleLetterInput(k);
                    });
                });

                document.getElementById('btnToggleDir')?.addEventListener('click', () => {
                    currentDir = currentDir === "H" ? "V" : "H";
                    updateHighlights();
                    updateHelperText();
                });
            }

            function hint() {
                if (selectedRow < 0 || selectedCol < 0 || gameStates.cruzadas.isCompleted) return;
                ensureActiveTimerRunning();
                const sol = solutionGrid[selectedRow][selectedCol];
                if (sol) {
                    currentGrid[selectedRow][selectedCol] = sol;
                    const el = document.querySelector(`.cruzadas-cell[data-r="${selectedRow}"][data-c="${selectedCol}"]`);
                    if (el) el.textContent = sol;
                    saveProgress();
                    updateHighlights();
                    updateWordChipsState();
                    showToast(`💡 Letra revelada: ${sol}`);
                    checkVictory();
                }
            }

            function restart() {
                if (!confirm('¿Reiniciar las Cruzadas de hoy?')) return;
                for (let r = 0; r < currentPuzzle.size; r++) {
                    for (let c = 0; c < currentPuzzle.size; c++) {
                        if (!isBlackGrid[r][c] && !isStarterGrid[r][c]) {
                            currentGrid[r][c] = "";
                        }
                    }
                }
                gameStates.cruzadas.timerSecs = 0;
                gameStates.cruzadas.isCompleted = false;
                gameStates.cruzadas.hasStarted = false;
                gameStates.cruzadas.timerRunning = false;
                saveProgress();
                render();
                updateWordChipsState();
                updateTimerDisplay();
                showToast('↺ Cruzadas reiniciadas');
            }

            function checkVictory() {
                const N = currentPuzzle.size;
                for (let r = 0; r < N; r++) {
                    for (let c = 0; c < N; c++) {
                        if (!isBlackGrid[r][c] && currentGrid[r][c] !== solutionGrid[r][c]) return;
                    }
                }
                gameStates.cruzadas.isCompleted = true;
                gameStates.cruzadas.timerRunning = false;
                saveProgress();
                onGameComplete('cruzadas', gameStates.cruzadas.timerSecs);
            }

            function saveProgress() {
                const todayStr = getTodayString();
                try {
                    localStorage.setItem(`mr_cruzadas_daily_${todayStr}`, JSON.stringify({
                        grid: currentGrid,
                        timerSeconds: gameStates.cruzadas.timerSecs,
                        completed: gameStates.cruzadas.isCompleted
                    }));
                } catch(e) {}
            }

            function updateHelperText() {
                const left = document.getElementById('helperLeftText');
                if (!left) return;
                if (selectedRow < 0 || selectedCol < 0) {
                    left.innerHTML = `<span>Toca una casilla blanca para empezar</span>`;
                } else {
                    const slotCells = getSlotCells(selectedRow, selectedCol, currentDir);
                    const dirStr = currentDir === "H" ? "Horizontal (→)" : "Vertical (↓)";
                    left.innerHTML = `<span>Palabra de <strong>${slotCells.length} letras</strong> · ${dirStr}</span>`;
                }
            }

            return {
                init,
                render,
                handleLetterInput,
                handleBackspace,
                hint,
                restart,
                getTheme: () => currentPuzzle?.theme || 'Deducción'
            };
        })();

        /* ==============================================================
           5. MOTOR NATIVO: SOPA DE LETRAS
           ============================================================== */
        const SopaEngine = (function() {
            const THEMES = [
                { name: 'Desconexión', words: ['PAPEL', 'TINTA', 'LIBRO', 'CALMA', 'PAUSA', 'FOCO', 'RITMO', 'TRAZO'] },
                { name: 'Naturaleza', words: ['BOSQUE', 'MONTE', 'RIO', 'ARBOL', 'VIENTO', 'VALLE', 'HOJAS', 'PIEDRA'] },
                { name: 'Café y Mañanas', words: ['AROMA', 'TAZA', 'MAÑANA', 'VAPOR', 'GRANOS', 'LECHE', 'CALOR', 'MESA'] },
                { name: 'Agilidad Mental', words: ['LOGICA', 'MEMORIA', 'ENFOQUE', 'REFLEJO', 'ATENCION', 'AGILIDAD', 'RAZON', 'INGENIO'] },
                { name: 'Cocina', words: ['HORNO', 'ACEITE', 'GUISO', 'CALDO', 'HARINA', 'HUEVO', 'SABOR', 'AROMA'] }
            ];

            const SPANISH_POOL = 'AAAAAAEEEEEEEEIIIIIOOOOOOUUUBCCDDDEEFGGHHJJLLMMNNNÑOOPPQRRRSSSTTTUVXYZ';
            const GRID_SIZE = 10;
            const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];

            let currentTheme = null;
            let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
            let placedWords = [];
            let foundCount = 0;

            function init() {
                const todayStr = getTodayString();
                let seedNum = 0;
                for (let i = 0; i < todayStr.length; i++) seedNum = ((seedNum << 5) - seedNum) + todayStr.charCodeAt(i);
                seedNum = Math.abs(seedNum);
                const rand = createPRNG(seedNum);

                currentTheme = THEMES[seedNum % THEMES.length];
                grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
                placedWords = [];
                foundCount = 0;

                const wordsList = currentTheme.words.slice().sort((a,b) => b.length - a.length);

                for (const word of wordsList) {
                    const len = word.length;
                    let placed = false;

                    // Cruce con letras existentes
                    if (placedWords.length > 0) {
                        const candidates = [];
                        for (let k = 0; k < len; k++) {
                            const char = word[k];
                            for (let r = 0; r < GRID_SIZE; r++) {
                                for (let c = 0; c < GRID_SIZE; c++) {
                                    if (grid[r][c] === char) {
                                        for (const [dr, dc] of DIRS) {
                                            const sr = r - k * dr;
                                            const sc = c - k * dc;
                                            const er = sr + (len - 1) * dr;
                                            const ec = sc + (len - 1) * dc;
                                            if (sr >= 0 && er >= 0 && sr < GRID_SIZE && er < GRID_SIZE &&
                                                sc >= 0 && ec >= 0 && sc < GRID_SIZE && ec < GRID_SIZE) {
                                                let fits = true;
                                                const cells = [];
                                                for (let s = 0; s < len; s++) {
                                                    const cr = sr + s * dr;
                                                    const cc = sc + s * dc;
                                                    if (grid[cr][cc] !== '' && grid[cr][cc] !== word[s]) { fits = false; break; }
                                                    cells.push([cr, cc]);
                                                }
                                                if (fits) candidates.push({ cells });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (candidates.length > 0) {
                            const pick = candidates[Math.floor(rand() * candidates.length)];
                            for (let s = 0; s < len; s++) {
                                const [cr, cc] = pick.cells[s];
                                grid[cr][cc] = word[s];
                            }
                            placedWords.push({ word, cells: pick.cells, found: false });
                            placed = true;
                        }
                    }

                    if (!placed) {
                        for (let att = 0; att < 80; att++) {
                            const [dr, dc] = DIRS[Math.floor(rand() * DIRS.length)];
                            const minR = dr < 0 ? len - 1 : 0;
                            const maxR = dr > 0 ? GRID_SIZE - len : GRID_SIZE - 1;
                            const minC = dc < 0 ? len - 1 : 0;
                            const maxC = dc > 0 ? GRID_SIZE - len : GRID_SIZE - 1;
                            if (minR > maxR || minC > maxC) continue;

                            const sr = Math.floor(rand() * (maxR - minR + 1)) + minR;
                            const sc = Math.floor(rand() * (maxC - minC + 1)) + minC;
                            let fits = true;
                            const cells = [];
                            for (let i = 0; i < len; i++) {
                                const cr = sr + i * dr;
                                const cc = sc + i * dc;
                                if (grid[cr][cc] !== '' && grid[cr][cc] !== word[i]) { fits = false; break; }
                                cells.push([cr, cc]);
                            }
                            if (fits) {
                                for (let i = 0; i < len; i++) {
                                    const [cr, cc] = cells[i];
                                    grid[cr][cc] = word[i];
                                }
                                placedWords.push({ word, cells, found: false });
                                placed = true;
                                break;
                            }
                        }
                    }
                }

                // Relleno de huecos
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (grid[r][c] === '') {
                            grid[r][c] = SPANISH_POOL[Math.floor(rand() * SPANISH_POOL.length)];
                        }
                    }
                }

                // Cargar progreso previo si ya se resolvió hoy
                if (localStorage.getItem(`mr_sopa_solved_${todayStr}`) === 'true') {
                    placedWords.forEach(pw => pw.found = true);
                    foundCount = placedWords.length;
                    gameStates.sopa.isCompleted = true;
                }

                render();
                renderWordChips();
                setupEvents();
            }

            function render() {
                const board = document.getElementById('sopaGrid');
                if (!board) return;
                board.innerHTML = '';

                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        const cell = document.createElement('div');
                        cell.className = 'sopa-cell';
                        cell.dataset.r = r;
                        cell.dataset.c = c;
                        cell.textContent = grid[r][c];

                        // Si ya está encontrada
                        if (placedWords.some(pw => pw.found && pw.cells.some(([pr, pc]) => pr === r && pc === c))) {
                            cell.classList.add('found-cell');
                        }

                        board.appendChild(cell);
                    }
                }
            }

            function renderWordChips() {
                const container = document.getElementById('sopaChipsGrid');
                if (!container) return;
                container.innerHTML = '';

                placedWords.forEach((pw, idx) => {
                    const chip = document.createElement('span');
                    chip.className = 'word-chip' + (pw.found ? ' found' : '');
                    chip.id = `sopa-chip-${idx}`;
                    chip.innerHTML = `${pw.found ? '✓' : '○'} ${pw.word}`;
                    container.appendChild(chip);
                });

                updateHelperText();
            }

            // Manejo de arrastre e interacción
            let isDragging = false;
            let startCell = null;
            let currentPath = [];

            function getCellFromCoords(x, y) {
                const el = document.elementFromPoint(x, y);
                if (el && el.classList.contains('sopa-cell')) {
                    return { r: parseInt(el.dataset.r, 10), c: parseInt(el.dataset.c, 10) };
                }
                return null;
            }

            function calculateLine(r0, c0, r1, c1) {
                const dr = r1 - r0;
                const dc = c1 - c0;
                const absR = Math.abs(dr);
                const absC = Math.abs(dc);
                if (dr !== 0 && dc !== 0 && absR !== absC) return null;
                const steps = Math.max(absR, absC);
                if (steps === 0) return [[r0, c0]];
                const sr = dr === 0 ? 0 : dr / steps;
                const sc = dc === 0 ? 0 : dc / steps;
                const cells = [];
                for (let i = 0; i <= steps; i++) cells.push([r0 + i * sr, c0 + i * sc]);
                return cells;
            }

            function updatePathVisual(path) {
                document.querySelectorAll('.sopa-cell.selecting').forEach(el => el.classList.remove('selecting'));
                if (!path) return;
                currentPath = path;
                path.forEach(([r, c]) => {
                    const cell = document.querySelector(`.sopa-cell[data-r="${r}"][data-c="${c}"]`);
                    if (cell) cell.classList.add('selecting');
                });
            }

            function evaluatePath() {
                if (!currentPath || currentPath.length < 3) {
                    updatePathVisual(null);
                    return;
                }
                const fwd = currentPath.map(([r, c]) => grid[r][c]).join('');
                const rev = fwd.split('').reverse().join('');

                placedWords.forEach((pw, idx) => {
                    if (pw.found) return;
                    if (pw.word === fwd || pw.word === rev) {
                        pw.found = true;
                        foundCount++;
                        currentPath.forEach(([r, c]) => {
                            const cell = document.querySelector(`.sopa-cell[data-r="${r}"][data-c="${c}"]`);
                            if (cell) cell.classList.add('found-cell');
                        });
                        renderWordChips();
                        showToast(`✓ ¡Encontraste: ${pw.word}!`);
                        if (foundCount >= placedWords.length) {
                            gameStates.sopa.isCompleted = true;
                            gameStates.sopa.timerRunning = false;
                            const todayStr = getTodayString();
                            localStorage.setItem(`mr_sopa_solved_${todayStr}`, 'true');
                            onGameComplete('sopa', gameStates.sopa.timerSecs);
                        }
                    }
                });
                updatePathVisual(null);
            }

            function setupEvents() {
                const board = document.getElementById('sopaGrid');
                if (!board) return;

                // Touch
                board.addEventListener('touchstart', (e) => {
                    if (gameStates.sopa.isPaused || gameStates.sopa.isCompleted) return;
                    ensureActiveTimerRunning();
                    const touch = e.touches[0];
                    const cell = getCellFromCoords(touch.clientX, touch.clientY);
                    if (cell) {
                        isDragging = true;
                        startCell = cell;
                        updatePathVisual([[cell.r, cell.c]]);
                    }
                }, { passive: false });

                board.addEventListener('touchmove', (e) => {
                    if (!isDragging || !startCell) return;
                    e.preventDefault();
                    const touch = e.touches[0];
                    const cell = getCellFromCoords(touch.clientX, touch.clientY);
                    if (cell) {
                        const line = calculateLine(startCell.r, startCell.c, cell.r, cell.c);
                        if (line) updatePathVisual(line);
                    }
                }, { passive: false });

                board.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    evaluatePath();
                    startCell = null;
                });

                // Mouse
                board.addEventListener('mousedown', (e) => {
                    if (gameStates.sopa.isPaused || gameStates.sopa.isCompleted) return;
                    ensureActiveTimerRunning();
                    const cell = getCellFromCoords(e.clientX, e.clientY);
                    if (cell) {
                        isDragging = true;
                        startCell = cell;
                        updatePathVisual([[cell.r, cell.c]]);
                    }
                });

                window.addEventListener('mousemove', (e) => {
                    if (!isDragging || !startCell) return;
                    const cell = getCellFromCoords(e.clientX, e.clientY);
                    if (cell) {
                        const line = calculateLine(startCell.r, startCell.c, cell.r, cell.c);
                        if (line) updatePathVisual(line);
                    }
                });

                window.addEventListener('mouseup', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    evaluatePath();
                    startCell = null;
                });
            }

            function hint() {
                if (gameStates.sopa.isCompleted) return;
                ensureActiveTimerRunning();
                const unread = placedWords.find(pw => !pw.found);
                if (unread && unread.cells.length > 0) {
                    const firstCell = unread.cells[0];
                    const cellEl = document.querySelector(`.sopa-cell[data-r="${firstCell[0]}"][data-c="${firstCell[1]}"]`);
                    if (cellEl) {
                        cellEl.classList.add('selecting');
                        setTimeout(() => cellEl.classList.remove('selecting'), 1800);
                        showToast(`💡 Pista: «${unread.word}» empieza en esa casilla`);
                    }
                }
            }

            function restart() {
                if (!confirm('¿Reiniciar la Sopa de Letras de hoy?')) return;
                placedWords.forEach(pw => pw.found = false);
                foundCount = 0;
                gameStates.sopa.isCompleted = false;
                gameStates.sopa.hasStarted = false;
                gameStates.sopa.timerRunning = false;
                gameStates.sopa.timerSecs = 0;
                document.querySelectorAll('.sopa-cell.found-cell').forEach(el => el.classList.remove('found-cell'));
                renderWordChips();
                updateTimerDisplay();
                showToast('↺ Sopa reiniciada');
            }

            function updateHelperText() {
                const left = document.getElementById('helperLeftText');
                const right = document.getElementById('helperRightText');
                if (left && activeGame === 'sopa') left.innerHTML = `<span>Desliza para conectar las letras</span>`;
                if (right && activeGame === 'sopa') right.textContent = `${foundCount} / ${placedWords.length} encontradas`;
            }

            return {
                init,
                render,
                hint,
                restart,
                getTheme: () => currentTheme?.name || 'Palabras'
            };
        })();

        /* ==============================================================
           GESTIÓN CENTRALIZADA DE LA INTERFAZ Y CAMBIO DE JUEGOS
           ============================================================== */
        function switchGame(targetGame) {
            if (!GAME_KEYS.includes(targetGame)) return;

            // 1. Pausar el cronómetro del juego que se abandona
            if (gameStates[activeGame]) {
                gameStates[activeGame].timerRunning = false;
            }

            activeGame = targetGame;

            // 2. Actualizar botones de pestaña
            document.querySelectorAll('.today-tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.game === targetGame);
            });

            // 3. Conmutar el tablero dentro del Viewport
            document.querySelectorAll('.board-stage-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === `pane-${targetGame}`);
            });

            // 4. Ocultar el overlay de pausa en caso de que estuviera abierto
            document.getElementById('boardPauseOverlay')?.classList.remove('active');
            const pauseBtn = document.getElementById('btnOuterPause');
            if (pauseBtn) pauseBtn.textContent = '⏸ Pausa';

            // 5. Configurar selector de variante o etiqueta temática
            setupOuterToolbar();

            // 6. Configurar el dock de teclado según el tipo de juego
            setupOuterInputDock();

            // 7. Actualizar el cronómetro mostrado
            updateTimerDisplay();

            // 8. Actualizar las estadísticas exteriores del juego activo
            updateOuterStatsDisplay();

            // 9. Actualizar texto de reglas
            const ruleText = document.getElementById('outerRuleHintText');
            if (ruleText) ruleText.textContent = GAME_RULES[targetGame] || '';

            // 10. Actualizar texto de ayuda
            updateActiveGameHelper();

            // Guardar hash en URL
            try { history.replaceState(null, '', `#juego-${targetGame}`); } catch(e) {}
        }
        window.switchGame = switchGame;

        function setupOuterToolbar() {
            const toggles = document.getElementById('outerModeToggles');
            const badge = document.getElementById('outerThemeBadge');
            if (!toggles || !badge) return;

            toggles.innerHTML = '';
            toggles.style.display = 'none';
            badge.style.display = 'none';

            if (activeGame === 'sudoku') {
                toggles.style.display = 'inline-flex';
                const cur = SudokuEngine.getMode();
                toggles.innerHTML = `
                    <button type="button" class="mode-chip-btn ${cur === 'classic' ? 'active' : ''}" data-sm="classic">Clásico 9×9</button>
                    <button type="button" class="mode-chip-btn ${cur === 'mini' ? 'active' : ''}" data-sm="mini">Mini 4×4</button>
                `;
                toggles.querySelectorAll('.mode-chip-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        SudokuEngine.init(btn.dataset.sm);
                        setupOuterToolbar();
                        setupOuterInputDock();
                    });
                });
            } else if (activeGame === 'calcudoku') {
                toggles.style.display = 'inline-flex';
                const sz = CalcudokuEngine.getSize();
                toggles.innerHTML = `
                    <button type="button" class="mode-chip-btn ${sz === 4 ? 'active' : ''}" data-cs="4">4×4</button>
                    <button type="button" class="mode-chip-btn ${sz === 5 ? 'active' : ''}" data-cs="5">5×5</button>
                `;
                toggles.querySelectorAll('.mode-chip-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        CalcudokuEngine.init(parseInt(btn.dataset.cs, 10));
                        setupOuterToolbar();
                        setupOuterInputDock();
                    });
                });
            } else if (activeGame === 'kakuro') {
                toggles.style.display = 'inline-flex';
                const sz = KakuroEngine.getSize();
                toggles.innerHTML = `
                    <button type="button" class="mode-chip-btn ${sz === 6 ? 'active' : ''}" data-ks="6">6×6</button>
                    <button type="button" class="mode-chip-btn ${sz === 7 ? 'active' : ''}" data-ks="7">7×7</button>
                `;
                toggles.querySelectorAll('.mode-chip-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        KakuroEngine.init(parseInt(btn.dataset.ks, 10));
                        setupOuterToolbar();
                        setupOuterInputDock();
                    });
                });
            } else if (activeGame === 'cruzadas') {
                badge.style.display = 'inline-block';
                badge.textContent = `Tema: ${CruzadasEngine.getTheme()}`;
            } else if (activeGame === 'sopa') {
                badge.style.display = 'inline-block';
                badge.textContent = `Tema: ${SopaEngine.getTheme()}`;
            }
        }

        function setupOuterInputDock() {
            const numDock = document.getElementById('dockNumericKeypad');
            const cruzadasDock = document.getElementById('dockCruzadasWords');
            const sopaDock = document.getElementById('dockSopaWords');

            if (numDock) numDock.style.display = 'none';
            if (cruzadasDock) cruzadasDock.style.display = 'none';
            if (sopaDock) sopaDock.style.display = 'none';

            if (activeGame === 'sudoku') {
                if (numDock) {
                    numDock.style.display = 'flex';
                    const max = SudokuEngine.getSize();
                    buildNumericButtons(max, (num) => SudokuEngine.setNumber(num));
                }
            } else if (activeGame === 'calcudoku') {
                if (numDock) {
                    numDock.style.display = 'flex';
                    const max = CalcudokuEngine.getSize();
                    buildNumericButtons(max, (num) => CalcudokuEngine.setNumber(num));
                }
            } else if (activeGame === 'kakuro') {
                if (numDock) {
                    numDock.style.display = 'flex';
                    buildNumericButtons(9, (num) => KakuroEngine.setNumber(num));
                }
            } else if (activeGame === 'cruzadas') {
                if (cruzadasDock) cruzadasDock.style.display = 'flex';
            } else if (activeGame === 'sopa') {
                if (sopaDock) sopaDock.style.display = 'flex';
            }
        }

        function buildNumericButtons(max, onSelect) {
            const numDock = document.getElementById('dockNumericKeypad');
            if (!numDock) return;
            numDock.innerHTML = '';

            for (let i = 1; i <= max; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'key-num-btn';
                btn.textContent = i;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    onSelect(i);
                });
                numDock.appendChild(btn);
            }

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'key-num-btn key-backspace';
            delBtn.textContent = '⌫';
            delBtn.title = 'Borrar casilla';
            delBtn.addEventListener('click', (e) => {
                e.preventDefault();
                onSelect(0);
            });
            numDock.appendChild(delBtn);
        }

        function updateActiveGameHelper() {
            const left = document.getElementById('helperLeftText');
            const right = document.getElementById('helperRightText');
            if (right) right.textContent = '';

            if (activeGame === 'sudoku') {
                if (left) left.innerHTML = `<span>Toca una casilla para colocar un número</span>`;
            } else if (activeGame === 'calcudoku') {
                if (left) left.innerHTML = `<span>Toca una casilla para ver su jaula</span>`;
            } else if (activeGame === 'kakuro') {
                if (left) left.innerHTML = `<span>Toca una casilla blanca para ver sus sumas</span>`;
            } else if (activeGame === 'cruzadas') {
                if (left) left.innerHTML = `<span>Toca una casilla blanca para ver el hueco</span>`;
            } else if (activeGame === 'sopa') {
                if (left) left.innerHTML = `<span>Desliza para conectar las letras</span>`;
            }
        }

        /* ==============================================================
           ESTADÍSTICAS Y SINCRONIZACIÓN CON LOCALSTORAGE Y FIRESTORE
           ============================================================== */
        function isGameSolvedToday(key, todayStr) {
            try {
                if (key === 'sudoku') {
                    const s = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}');
                    if (s.lastSolvedDate === todayStr) return true;
                    const c9 = JSON.parse(localStorage.getItem(`menosruido_sudoku_state_v1_classic_${todayStr}`) || '{}');
                    if (c9.isCompleted) return true;
                    const c4 = JSON.parse(localStorage.getItem(`menosruido_sudoku_state_v1_mini_${todayStr}`) || '{}');
                    if (c4.isCompleted) return true;
                } else if (key === 'calcudoku') {
                    const c = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}');
                    if (c.lastDate === todayStr) return true;
                    const st4 = JSON.parse(localStorage.getItem(`mr_calcudoku_state_4_${todayStr}`) || '{}');
                    if (st4.isCompleted) return true;
                    const st5 = JSON.parse(localStorage.getItem(`mr_calcudoku_state_5_${todayStr}`) || '{}');
                    if (st5.isCompleted) return true;
                } else if (key === 'kakuro') {
                    const k = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}');
                    if (k.lastDate === todayStr) return true;
                    const k6 = JSON.parse(localStorage.getItem(`mr_kakuro_state_6_${todayStr}`) || '{}');
                    if (k6.isCompleted) return true;
                    const k7 = JSON.parse(localStorage.getItem(`mr_kakuro_state_7_${todayStr}`) || '{}');
                    if (k7.isCompleted) return true;
                } else if (key === 'cruzadas') {
                    const cr = JSON.parse(localStorage.getItem(`mr_cruzadas_daily_${todayStr}`) || '{}');
                    if (cr.completed) return true;
                    const crs = JSON.parse(localStorage.getItem('mr_cruzadas_stats') || localStorage.getItem('mr_cruzadas_daily_stats') || '{}');
                    if (crs.lastSolvedDate === todayStr) return true;
                } else if (key === 'sopa') {
                    if (localStorage.getItem(`mr_sopa_solved_${todayStr}`) === 'true') return true;
                }
            } catch(e) {}
            return false;
        }

        function updateGlobalDailyProgress() {
            const todayStr = getTodayString();
            let done = 0;

            GAME_KEYS.forEach(k => {
                const solved = isGameSolvedToday(k, todayStr);
                const btn = document.querySelector(`.today-tab-btn[data-game="${k}"]`);
                if (btn) btn.classList.toggle('solved', solved);
                if (solved) done++;
            });

            const fill = document.getElementById('progressBarFill');
            const ratioText = document.getElementById('progressRatioText');
            const pct = (done / GAME_KEYS.length) * 100;

            if (fill) {
                fill.style.width = `${pct}%`;
                fill.classList.toggle('all-done', done === GAME_KEYS.length);
            }

            if (ratioText) {
                if (done === GAME_KEYS.length) ratioText.innerHTML = `<strong>¡Todos los retos completados!</strong> 🎉`;
                else ratioText.innerHTML = `<strong>${done}</strong> de ${GAME_KEYS.length} resueltos`;
            }

            // Actualizar racha global
            let maxStreak = 0;
            try {
                const s = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}').streak || 0;
                const c = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}').streak || 0;
                const k = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}').streak || 0;
                const cr = JSON.parse(localStorage.getItem('mr_cruzadas_stats') || localStorage.getItem('mr_cruzadas_daily_stats') || '{}').streak || 0;
                const sp = parseInt(localStorage.getItem('mr_sopa_streak') || '0', 10);
                maxStreak = Math.max(s, c, k, cr, sp, done > 0 ? 1 : 0);
            } catch(e) {}

            const streakVal = document.getElementById('globalStreakVal');
            if (streakVal) streakVal.textContent = `${maxStreak} día${maxStreak === 1 ? '' : 's'}`;
        }

        function updateOuterStatsDisplay() {
            let completed = 0, streak = 0, bestTime = '--:--';
            try {
                if (activeGame === 'sudoku') {
                    const st = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}');
                    completed = st.totalCompleted || 0;
                    streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'calcudoku') {
                    const st = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}');
                    completed = st.completed || 0;
                    streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'kakuro') {
                    const st = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}');
                    completed = st.completed || 0;
                    streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'cruzadas') {
                    const st = JSON.parse(localStorage.getItem('mr_cruzadas_stats') || localStorage.getItem('mr_cruzadas_daily_stats') || '{}');
                    completed = st.completed || 0;
                    streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'sopa') {
                    completed = parseInt(localStorage.getItem('mr_sopa_total_wins') || '0', 10);
                    streak = parseInt(localStorage.getItem('mr_sopa_streak') || '0', 10);
                    const bt = localStorage.getItem('mr_sopa_best_time');
                    bestTime = bt && bt !== '99999' ? formatTime(parseInt(bt, 10)) : '--:--';
                }
            } catch(e) {}

            const cEl = document.getElementById('statValCompleted');
            const sEl = document.getElementById('statValStreak');
            const bEl = document.getElementById('statValBestTime');

            if (cEl) cEl.textContent = completed;
            if (sEl) sEl.textContent = `${streak} día${streak === 1 ? '' : 's'}`;
            if (bEl) bEl.textContent = bestTime;
        }

        function onGameComplete(gameKey, timeSecs) {
            const todayStr = getTodayString();

            try {
                if (gameKey === 'sudoku') {
                    const st = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}');
                    const comp = (st.totalCompleted || 0) + 1;
                    const strk = (st.streak || 0) + 1;
                    const bt = st.bestTime ? Math.min(st.bestTime, timeSecs) : timeSecs;
                    localStorage.setItem('menosruido_sudoku_stats_v1', JSON.stringify({
                        totalCompleted: comp, streak: strk, bestTime: bt, lastSolvedDate: todayStr
                    }));
                } else if (gameKey === 'calcudoku') {
                    const st = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}');
                    const comp = (st.completed || 0) + 1;
                    const strk = (st.streak || 0) + 1;
                    const bt = st.bestTime ? Math.min(st.bestTime, timeSecs) : timeSecs;
                    localStorage.setItem('mr_calcudoku_stats', JSON.stringify({
                        completed: comp, streak: strk, bestTime: bt, lastDate: todayStr
                    }));
                } else if (gameKey === 'kakuro') {
                    const st = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}');
                    const comp = (st.completed || 0) + 1;
                    const strk = (st.streak || 0) + 1;
                    const bt = st.bestTime ? Math.min(st.bestTime, timeSecs) : timeSecs;
                    localStorage.setItem('mr_kakuro_stats', JSON.stringify({
                        completed: comp, streak: strk, bestTime: bt, lastDate: todayStr
                    }));
                } else if (gameKey === 'cruzadas') {
                    const st = JSON.parse(localStorage.getItem('mr_cruzadas_stats') || localStorage.getItem('mr_cruzadas_daily_stats') || '{}');
                    const comp = (st.completed || 0) + 1;
                    const strk = (st.streak || 0) + 1;
                    const bt = st.bestTime ? Math.min(st.bestTime, timeSecs) : timeSecs;
                    const obj = { completed: comp, streak: strk, bestTime: bt, lastSolvedDate: todayStr };
                    localStorage.setItem('mr_cruzadas_stats', JSON.stringify(obj));
                    localStorage.setItem('mr_cruzadas_daily_stats', JSON.stringify(obj));
                } else if (gameKey === 'sopa') {
                    const strk = parseInt(localStorage.getItem('mr_sopa_streak') || '0', 10) + 1;
                    const comp = parseInt(localStorage.getItem('mr_sopa_total_wins') || '0', 10) + 1;
                    const prevBt = parseInt(localStorage.getItem('mr_sopa_best_time') || '99999', 10);
                    const bt = Math.min(prevBt, timeSecs);
                    localStorage.setItem('mr_sopa_streak', strk.toString());
                    localStorage.setItem('mr_sopa_total_wins', comp.toString());
                    localStorage.setItem('mr_sopa_best_time', bt.toString());
                    localStorage.setItem(`mr_sopa_solved_${todayStr}`, 'true');
                }
            } catch(e) {}

            updateGlobalDailyProgress();
            updateOuterStatsDisplay();

            if (auth.currentUser) {
                syncWithFirestore(auth.currentUser);
            }

            showVictoryModal(gameKey, timeSecs);
        }

        function showVictoryModal(gameKey, timeSecs) {
            const modal = document.getElementById('victoryModalOverlay');
            const title = document.getElementById('victoryModalTitle');
            const desc = document.getElementById('victoryModalDesc');
            const timeEl = document.getElementById('vicStatTime');

            if (title) title.textContent = `¡${GAME_TITLES[gameKey]} Resuelto!`;
            if (desc) desc.textContent = `Has completado el reto diario en ${formatTime(timeSecs)}.`;
            if (timeEl) timeEl.textContent = formatTime(timeSecs);

            if (modal) modal.classList.add('open');
        }

        function getNextUnfinishedGame(currentKey) {
            const todayStr = getTodayString();
            const startIdx = GAME_KEYS.indexOf(currentKey);
            for (let i = 1; i <= GAME_KEYS.length; i++) {
                const checkKey = GAME_KEYS[(startIdx + i) % GAME_KEYS.length];
                if (!isGameSolvedToday(checkKey, todayStr)) return checkKey;
            }
            return GAME_KEYS[(startIdx + 1) % GAME_KEYS.length];
        }

        /* ==============================================================
           SINCRONIZACIÓN CLOUD FIRESTORE
           ============================================================== */
        function getLocalPuzzleStats(todayStr) {
            let sudoku = {}, calcudoku = {}, kakuro = {}, cruzadas = {};
            try { sudoku = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}'); } catch(e) {}
            try { calcudoku = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}'); } catch(e) {}
            try { kakuro = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}'); } catch(e) {}
            try { cruzadas = JSON.parse(localStorage.getItem('mr_cruzadas_stats') || localStorage.getItem('mr_cruzadas_daily_stats') || '{}'); } catch(e) {}
            const sopa = {
                streak: parseInt(localStorage.getItem('mr_sopa_streak') || '0', 10),
                completed: parseInt(localStorage.getItem('mr_sopa_total_wins') || '0', 10),
                bestTime: parseInt(localStorage.getItem('mr_sopa_best_time') || '0', 10),
                lastDate: localStorage.getItem(`mr_sopa_solved_${todayStr}`) === 'true' ? todayStr : ''
            };
            return { sudoku, calcudoku, kakuro, cruzadas, sopa };
        }

        async function syncWithFirestore(user) {
            if (!user) return;
            const badge = document.getElementById('syncStatusBadge');
            if (badge) badge.textContent = '↻ Sincronizando...';
            const todayStr = getTodayString();
            const local = getLocalPuzzleStats(todayStr);

            try {
                const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);
                const remote = snap.exists() ? snap.data()?.puzzleStats || null : null;

                // Fusión simple
                function merge(l = {}, r = {}) {
                    const completed = Math.max(l.totalCompleted || l.completed || 0, r.totalCompleted || r.completed || 0);
                    const streak = Math.max(l.streak || 0, r.streak || 0);
                    let bestTime = null;
                    if (l.bestTime && r.bestTime) bestTime = Math.min(l.bestTime, r.bestTime);
                    else bestTime = l.bestTime || r.bestTime || null;
                    const lastDate = (l.lastSolvedDate || l.lastDate || '') > (r.lastSolvedDate || r.lastDate || '') ? (l.lastSolvedDate || l.lastDate) : (r.lastSolvedDate || r.lastDate);
                    return { completed, totalCompleted: completed, streak, bestTime, lastDate, lastSolvedDate: lastDate };
                }

                const merged = {
                    sudoku: merge(local.sudoku, remote?.sudoku),
                    calcudoku: merge(local.calcudoku, remote?.calcudoku),
                    kakuro: merge(local.kakuro, remote?.kakuro),
                    cruzadas: merge(local.cruzadas, remote?.cruzadas),
                    sopa: merge(local.sopa, remote?.sopa)
                };

                await setDoc(userRef, { puzzleStats: merged, lastPuzzleSync: new Date().toISOString() }, { merge: true });
                if (badge) badge.textContent = '✓ Sincronizado';
            } catch(err) {
                console.warn('Firestore sync warning:', err);
                if (badge) badge.textContent = '✓ Guardado local';
            }
        }

        /* ==============================================================
           EVENTOS DE BOTONES EXTERNOS Y MODALES
           ============================================================== */
        document.getElementById('btnOuterPause')?.addEventListener('click', () => {
            const st = gameStates[activeGame];
            if (!st) return;
            st.isPaused = !st.isPaused;
            st.timerRunning = !st.isPaused;

            const overlay = document.getElementById('boardPauseOverlay');
            const btn = document.getElementById('btnOuterPause');

            if (st.isPaused) {
                overlay?.classList.add('active');
                if (btn) btn.textContent = '▶ Reanudar';
            } else {
                overlay?.classList.remove('active');
                if (btn) btn.textContent = '⏸ Pausa';
            }
        });

        document.getElementById('btnResumeOverlay')?.addEventListener('click', () => {
            const st = gameStates[activeGame];
            if (st) {
                st.isPaused = false;
                st.timerRunning = true;
                document.getElementById('boardPauseOverlay')?.classList.remove('active');
                document.getElementById('btnOuterPause').textContent = '⏸ Pausa';
            }
        });

        document.getElementById('btnOuterHint')?.addEventListener('click', () => {
            if (activeGame === 'sudoku') SudokuEngine.hint();
            else if (activeGame === 'calcudoku') CalcudokuEngine.hint();
            else if (activeGame === 'kakuro') KakuroEngine.hint();
            else if (activeGame === 'cruzadas') CruzadasEngine.hint();
            else if (activeGame === 'sopa') SopaEngine.hint();
        });

        document.getElementById('btnOuterRestart')?.addEventListener('click', () => {
            if (activeGame === 'sudoku') SudokuEngine.restart();
            else if (activeGame === 'calcudoku') CalcudokuEngine.restart();
            else if (activeGame === 'kakuro') KakuroEngine.restart();
            else if (activeGame === 'cruzadas') CruzadasEngine.restart();
            else if (activeGame === 'sopa') SopaEngine.restart();
        });

        document.getElementById('btnOuterStats')?.addEventListener('click', () => {
            const modal = document.getElementById('statsModalOverlay');
            const title = document.getElementById('statsModalGameTitle');
            if (title) title.textContent = `Estadísticas · ${GAME_TITLES[activeGame]}`;

            let completed = 0, streak = 0, bestTime = '--:--';
            try {
                if (activeGame === 'sudoku') {
                    const st = JSON.parse(localStorage.getItem('menosruido_sudoku_stats_v1') || '{}');
                    completed = st.totalCompleted || 0; streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'calcudoku') {
                    const st = JSON.parse(localStorage.getItem('mr_calcudoku_stats') || '{}');
                    completed = st.completed || 0; streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'kakuro') {
                    const st = JSON.parse(localStorage.getItem('mr_kakuro_stats') || '{}');
                    completed = st.completed || 0; streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'cruzadas') {
                    const st = JSON.parse(localStorage.getItem('mr_cruzadas_stats') || localStorage.getItem('mr_cruzadas_daily_stats') || '{}');
                    completed = st.completed || 0; streak = st.streak || 0;
                    bestTime = st.bestTime ? formatTime(st.bestTime) : '--:--';
                } else if (activeGame === 'sopa') {
                    completed = parseInt(localStorage.getItem('mr_sopa_total_wins') || '0', 10);
                    streak = parseInt(localStorage.getItem('mr_sopa_streak') || '0', 10);
                    const bt = localStorage.getItem('mr_sopa_best_time');
                    bestTime = bt && bt !== '99999' ? formatTime(parseInt(bt, 10)) : '--:--';
                }
            } catch(e) {}

            document.getElementById('modalStatCompleted').textContent = completed;
            document.getElementById('modalStatStreak').textContent = streak;
            document.getElementById('modalStatBestTime').textContent = bestTime;

            if (modal) modal.classList.add('open');
        });

        document.getElementById('btnCloseStatsModal')?.addEventListener('click', () => {
            document.getElementById('statsModalOverlay')?.classList.remove('open');
        });

        document.getElementById('btnCloseVictoryModal')?.addEventListener('click', () => {
            document.getElementById('victoryModalOverlay')?.classList.remove('open');
        });

        document.getElementById('btnNextGameModal')?.addEventListener('click', () => {
            document.getElementById('victoryModalOverlay')?.classList.remove('open');
            const nextKey = getNextUnfinishedGame(activeGame);
            switchGame(nextKey);
        });

        // Tabs click
        document.querySelectorAll('.today-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchGame(btn.dataset.game);
            });
        });

        // Teclado físico de ordenador
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (activeGame === 'sudoku') {
                if (e.key >= '1' && e.key <= '9') SudokuEngine.setNumber(parseInt(e.key, 10));
                else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') SudokuEngine.setNumber(0);
            } else if (activeGame === 'calcudoku') {
                if (e.key >= '1' && e.key <= '5') CalcudokuEngine.setNumber(parseInt(e.key, 10));
                else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') CalcudokuEngine.setNumber(0);
            } else if (activeGame === 'kakuro') {
                if (e.key >= '1' && e.key <= '9') KakuroEngine.setNumber(parseInt(e.key, 10));
                else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') KakuroEngine.setNumber(0);
            } else if (activeGame === 'cruzadas') {
                if (/^[a-zA-ZñÑ]$/.test(e.key)) CruzadasEngine.handleLetterInput(e.key);
                else if (e.key === 'Backspace') CruzadasEngine.handleBackspace();
            }
        });

        // Gestión Auth Firebase
        onAuthStateChanged(auth, async (user) => {
            const unauthBox = document.getElementById('syncUnauthBox');
            const authBox = document.getElementById('syncAuthBox');
            const nameEl = document.getElementById('syncUserName');
            const emailEl = document.getElementById('syncUserEmail');
            const avatarEl = document.getElementById('syncAvatar');

            if (user) {
                if (unauthBox) unauthBox.style.display = 'none';
                if (authBox) authBox.style.display = 'flex';

                const name = getUserDisplayName(user);
                const email = getUserEmail(user);
                if (nameEl) nameEl.textContent = name;
                if (emailEl) emailEl.textContent = email;

                if (avatarEl) {
                    if (user.photoURL) avatarEl.innerHTML = `<img src="${user.photoURL}" alt="" />`;
                    else avatarEl.textContent = (name || email || 'U').charAt(0).toUpperCase();
                }
                await syncWithFirestore(user);
            } else {
                if (unauthBox) unauthBox.style.display = 'flex';
                if (authBox) authBox.style.display = 'none';
            }
        });

        document.getElementById('btnSyncLogin')?.addEventListener('click', () => {
            openAuthModal({
                title: 'Tu Perfil de Pasatiempos',
                subtitle: 'Accede para sincronizar tus avances diarios, tiempos y rachas en todos tus dispositivos.'
            });
        });

        document.getElementById('btnManualSync')?.addEventListener('click', () => {
            if (auth.currentUser) syncWithFirestore(auth.currentUser);
            else showToast('Inicia sesión para sincronizar');
        });

        /* ==============================================================
           INICIALIZACIÓN DE LA PÁGINA
           ============================================================== */
        function initApp() {
            // Fecha del día
            const dateDisplay = document.getElementById('todayDateDisplay');
            if (dateDisplay) dateDisplay.textContent = formatDisplayDate();

            // Inicializar los motores nativos
            SudokuEngine.init('classic');
            CalcudokuEngine.init(4);
            KakuroEngine.init(6);
            CruzadasEngine.init();
            SopaEngine.init();

            // Revisar si la URL traía hash
            const hash = window.location.hash;
            if (hash && hash.startsWith('#juego-')) {
                const reqGame = hash.replace('#juego-', '');
                if (GAME_KEYS.includes(reqGame)) activeGame = reqGame;
            }

            // Iniciar ticker del cronómetro
            startGlobalTicker();

            // Configurar juego inicial
            switchGame(activeGame);

            // Actualizar progreso general del día
            updateGlobalDailyProgress();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
        } else {
            initApp();
        }
