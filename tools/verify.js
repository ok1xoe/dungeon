// Ověření úrovní: rozměry, povolené znaky, jediný start, východ, řešitelnost s klíči a dveřmi.
// Generátory (G/M) lze zničit, proto se berou jako průchozí; dveře stojí jeden klíč za každou otevřenou skupinu dveří.
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const base = __dirname + '/../js/';
const g = H.load([base + 'speccy.js', base + 'levels.js']);
const LV = g.sandbox.LEVELS;
let bad = 0;
function fail(n, msg) { console.log('CHYBA úroveň ' + n + ': ' + msg); bad++; }

function analyse(n) {
    const rows = LV.rows(n), h = rows.length, w = rows[0].length;
    const cnt = {};
    let start = null;
    for (let y = 0; y < h; y++) {
        if (rows[y].length !== w) { fail(n, 'řádek ' + y + ' má délku ' + rows[y].length + ' místo ' + w); return; }
        for (let x = 0; x < w; x++) {
            const c = rows[y][x];
            if ('#.SEDkftpGMgm'.indexOf(c) < 0) { fail(n, 'neznámý znak ' + c); }
            cnt[c] = (cnt[c] || 0) + 1;
            if (c === 'S') { start = [x, y]; }
            if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && c !== '#') { fail(n, 'otevřený okraj ' + x + ',' + y); }
        }
    }
    if (w < 16 || h < 11) { fail(n, 'mapa menší než obrazovka'); }
    if (cnt.S !== 1) { fail(n, 'počet startů ' + cnt.S); }
    if (!cnt.E) { fail(n, 'chybí východ'); }
    if (!start) { return; }
    // dveře -> skupiny (4-sousedství)
    const grp = {}; let ng = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (rows[y][x] === 'D' && grp[x + ',' + y] === undefined) {
            const q = [[x, y]]; grp[x + ',' + y] = ng;
            while (q.length) {
                const [a, b] = q.pop();
                [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                    const k = (a + dx) + ',' + (b + dy);
                    if (rows[b + dy] && rows[b + dy][a + dx] === 'D' && grp[k] === undefined) { grp[k] = ng; q.push([a + dx, b + dy]); }
                });
            }
            ng++;
        }
    }
    // DFS přes množiny otevřených dveří; stav = bitmaska
    const seenState = {};
    function flood(open) {
        const vis = new Set([start[0] + ',' + start[1]]), q = [start];
        let keys = 0, exit = false; const borderD = new Set();
        while (q.length) {
            const [x, y] = q.pop(), c = rows[y][x];
            if (c === 'k') { keys++; }
            if (c === 'E') { exit = true; }
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
                if (vis.has(k)) { return; }
                const t = rows[ny][nx];
                if (t === '#') { return; }
                if (t === 'D') { const gi = grp[k]; if (!(open & (1 << gi))) { borderD.add(gi); return; } }
                vis.add(k); q.push([nx, ny]);
            });
        }
        return { vis, keys, exit, borderD };
    }
    function solve(open, used) {
        if (seenState[open]) { return false; }
        seenState[open] = 1;
        const f = flood(open);
        if (f.exit) { return true; }
        if (f.keys - used <= 0) { return false; }
        for (const gi of f.borderD) { if (solve(open | (1 << gi), used + 1)) { return true; } }
        return false;
    }
    const ok = solve(0, 0);
    if (!ok) { fail(n, 'východ není dosažitelný (klíče/dveře)'); }
    // dosažitelnost všeho při otevření všech dveří
    const all = flood((1 << ng) - 1);
    let unreachable = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if ('kftpGMgm'.indexOf(rows[y][x]) >= 0 && !all.vis.has(x + ',' + y)) {
            // generátor stojí v dosažitelné buňce; kontrola, zda aspoň jeden soused je dosažitelný
            const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => all.vis.has((x + dx) + ',' + (y + dy)));
            if (!nb) { unreachable++; }
        }
    }
    if (unreachable) { fail(n, unreachable + ' objektů je nedosažitelných'); }
    // minimální počet potřebných klíčů vs. klíče celkem
    console.log('úr. ' + String(n).padStart(2) + ' ' + (LV.isHand(n) ? 'ruční ' : 'gener.') + ' ' + w + 'x' + h + ' dveře ' + ng + ' klíče ' + (cnt.k || 0) +
        ' jídlo ' + (cnt.f || 0) + ' poklady ' + (cnt.t || 0) + ' lektvary ' + (cnt.p || 0) + ' gen. ' + ((cnt.G || 0) + (cnt.M || 0)) +
        ' příšery ' + ((cnt.g || 0) + (cnt.m || 0)) + '  řešitelné: ' + (ok ? 'ANO' : 'NE'));
}
for (let n = 1; n <= LV.count; n++) { analyse(n); }
console.log(bad ? 'NALEZENO CHYB: ' + bad : 'VŠECH ' + LV.count + ' ÚROVNÍ V POŘÁDKU');
process.exit(bad ? 1 : 0);
