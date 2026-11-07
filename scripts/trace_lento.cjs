const fs = require('fs');

// Trace why two vertical words shared (5,4)
const grid = Array.from({ length: 10 }, () => Array(10).fill(null));

// Put CALMA at H (5, 2..6)
const calma = "CALMA";
for(let i=0; i<5; i++) grid[5][2+i] = calma[i];

// Put PAPEL at V (1..5, 4)
const papel = "PAPEL";
for(let i=0; i<5; i++) grid[1+i][4] = papel[i];

console.log("Grid before LENTO:");
for(let r=0; r<10; r++) console.log(grid[r].map(c=>c||'.').join(' '));

// Now test candidate LENTO (len=5) crossing CALMA at (5,4) with targetHoriz=false (vertical)
const word = "LENTO";
const candR = 5; // since LENTO[0] is 'L' at row 5
const candC = 4;
const candEndR = 5 + 5 - 1; // 9
const candEndC = 4;
const targetHoriz = false;

const beforeR = targetHoriz ? candR : candR - 1;
const beforeC = targetHoriz ? candC - 1 : candC;
const afterR = targetHoriz ? candR : candEndR + 1;
const afterC = targetHoriz ? candEndC + 1 : candC;

console.log("beforeR:", beforeR, "beforeC:", beforeC, "grid[beforeR][beforeC]:", grid[beforeR][beforeC]);
if (beforeR >= 0 && grid[beforeR][beforeC] !== null) {
    console.log("REJECTED by before cell!");
} else {
    console.log("ALLOWED by before cell!");
}
