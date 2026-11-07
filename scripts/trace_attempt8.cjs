const fs = require('fs');

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

function getDaySeed(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    return Math.abs(hash);
}

const THEMES = [
    { theme: "Desconexión", words: ["PAUSA", "CALMA", "PAPEL", "RITMO", "SILENCIO", "LENTO", "TIEMPO", "AIRE", "SOL", "LIBRO", "MENTE", "FOCO", "SERENO"] }
];
const todayStr = "2026-10-28";
const seed = getDaySeed(todayStr);
const themeObj = THEMES[0];
const GRID_DIM = 10;
const prng = createPRNG(seed);
const cleanWords = themeObj.words.map(w => w.toUpperCase().trim()).filter(w => w.length >= 3 && w.length <= 8);

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
                            const beforeR = targetHoriz ? candR : candR - 1;
                            const beforeC = targetHoriz ? candC - 1 : candC;
                            const afterR = targetHoriz ? candR : candEndR + 1;
                            const afterC = targetHoriz ? candEndC + 1 : candC;

                            if (beforeR >= 0 && beforeR < GRID_DIM && beforeC >= 0 && beforeC < GRID_DIM && grid[beforeR][beforeC] !== null) canPlace = false;
                            if (afterR >= 0 && afterR < GRID_DIM && afterC >= 0 && afterC < GRID_DIM && grid[afterR][afterC] !== null) canPlace = false;

                            if (canPlace) {
                                for (let k = 0; k < len; k++) {
                                    const r = targetHoriz ? candR : candR + k;
                                    const c = targetHoriz ? candC + k : candC;
                                    if (grid[r][c] !== null && grid[r][c] !== word[k]) { canPlace = false; break; }
                                    if (grid[r][c] === null) {
                                        const adj1R = targetHoriz ? r - 1 : r;
                                        const adj1C = targetHoriz ? c : c - 1;
                                        const adj2R = targetHoriz ? r + 1 : r;
                                        const adj2C = targetHoriz ? c : c + 1;
                                        if (adj1R >= 0 && adj1R < GRID_DIM && adj1C >= 0 && adj1C < GRID_DIM && grid[adj1R][adj1C] !== null) canPlace = false;
                                        if (adj2R >= 0 && adj2R < GRID_DIM && adj2C >= 0 && adj2C < GRID_DIM && grid[adj2R][adj2C] !== null) canPlace = false;
                                    }
                                    cells.push([r, c]);
                                }
                                if (canPlace) {
                                    validPlacements.push({ word, r: candR, c: candC, isHoriz: targetHoriz, cells });
                                }
                            }
                        }
                    }
                }
            }
        }

        if (validPlacements.length > 0) {
            const chosen = validPlacements[Math.floor(prng() * validPlacements.length)];
            if (attempt === 8 && (chosen.word === 'PAPEL' || chosen.word === 'LENTO')) {
                console.log(`Attempt 8 placed ${chosen.word} at r=${chosen.r}, c=${chosen.c}, isHoriz=${chosen.isHoriz}`);
            }
            for (let k = 0; k < len; k++) {
                const [r, c] = chosen.cells[k];
                grid[r][c] = word[k];
            }
            placed.push(chosen);
        }
    }
}
