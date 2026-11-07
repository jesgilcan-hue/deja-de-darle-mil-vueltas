const grid = Array.from({ length: 10 }, () => Array(10).fill(null));

// Put CALMA at H (5, 2..6)
const calma = "CALMA";
for(let i=0; i<5; i++) grid[5][2+i] = calma[i];

// Put LENTO at V (5..9, 4)
const lento = "LENTO";
for(let i=0; i<5; i++) grid[5+i][4] = lento[i];

// Now test PAPEL (len=5) crossing CALMA at (5,4): PAPEL[4] is 'L'
const word = "PAPEL";
const i = 4; // 'L' is at index 4 of PAPEL
const intersectR = 5;
const intersectC = 4;
const targetHoriz = false; // vertical
const candR = intersectR - i; // 5 - 4 = 1
const candC = intersectC; // 4
const candEndR = candR + 5 - 1; // 5
const candEndC = candC; // 4

const beforeR = targetHoriz ? candR : candR - 1; // 0
const beforeC = targetHoriz ? candC - 1 : candC; // 4
const afterR = targetHoriz ? candR : candEndR + 1; // 6
const afterC = targetHoriz ? candEndC + 1 : candC; // 4

console.log("candR:", candR, "candEndR:", candEndR);
console.log("afterR:", afterR, "afterC:", afterC, "grid[afterR][afterC]:", grid[afterR][afterC]);

let canPlace = true;
if (beforeR >= 0 && grid[beforeR][beforeC] !== null) canPlace = false;
if (afterR < 10 && grid[afterR][afterC] !== null) canPlace = false;
console.log("canPlace before cells loop:", canPlace);
