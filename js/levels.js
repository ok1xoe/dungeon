// Úrovně: ručně kreslené mapy (1, 4, 8, 12, 16) + generovaná bludiště (ostatní). 18 úrovní.
// Znaky: # zeď, . podlaha, S start, E východ, D dveře, k klíč, f jídlo, t poklad, p lektvar (kouzlo),
//        G generátor duchů, M generátor démonů, g duch, m démon.
(function (root) {
    'use strict';
    var Z = root.Z;
    var NLEV = 18;

    var NAMES = ['Vstupní síň', 'Kamenné chodby', 'Hrobka strážců', 'Komnaty ticha', 'Kostnice', 'Prašná cesta',
        'Podzemní jezero', 'Zrcadlový sál', 'Černé štoly', 'Věž stínů', 'Ztracený důl', 'Aréna duchů',
        'Katakomby', 'Pekelné sklepy', 'Kovárna démonů', 'Zlá hlubina', 'Síň tisíce dveří', 'Srdce labyrintu'];

    function mirror(half) {
        return half.map(function (r) { return r + r.split('').reverse().join('').replace(/S/g, '.'); });
    }

    var HAND = {};

    HAND[1] = [
        '########################',
        '#S.....#...............#',
        '#......#...t...........#',
        '#..f...#.......#..#....#',
        '#......#...p...#..#.k..#',
        '####.###.......#..#....#',
        '#......#########..######',
        '#......................#',
        '#..t.......G...........#',
        '#......................#',
        '######.###########.#####',
        '#....#.#.........#.#...#',
        '#.f..#.#...tt....#.#.E.#',
        '#....D.#.........#.#...#',
        '#....#...........#.....#',
        '########################'
    ];

    HAND[4] = [
        '############################',
        '#S...#.......#.............#',
        '#....#...f...#....t....p...#',
        '#....D.......D.............#',
        '#....#...G...#.....g.......#',
        '##.###.......####.##########',
        '#..........................#',
        '#..t..#####..######..f.....#',
        '#.....#...#..#....#........#',
        '#..G..#.k.#..#.M..#...p....#',
        '#.....#...#..#....#........#',
        '###.###.#.####....###.######',
        '#..........................#',
        '#.f....................t..E#',
        '############################'
    ];

    HAND[8] = mirror([
        '##############',
        '#S....#.....k.',
        '#.....#..G....',
        '#..f..D.......',
        '#.....#...p...',
        '####.#####.###',
        '#...........t.',
        '#.####.####.##',
        '#.#f...#t...M.',
        '#.#.####.##...',
        '#.#......#.D..',
        '#.####.###.###',
        '#......#......',
        '#.####.#.####.',
        '#.#..p.#..f#..',
        '#.#.####.###..',
        '#........t....',
        '#.######.#####',
        '#E.....t.....f',
        '##############'
    ]);

    HAND[12] = mirror([
        '#############',
        '#.....#.....E',
        '#.....D......',
        '#..t..#...G..',
        '#.....#......',
        '###.###.#####',
        '#............',
        '#.##.#####.##',
        '#.#M.......G.',
        '#.#...###....',
        '#.##.#p.#.##.',
        '#............',
        '#.###.#.##..#',
        '#.k#f.#.#t.#.',
        '#.###.#.###.#',
        '#............',
        '#S..f....p...',
        '#############'
    ]);

    HAND[16] = mirror([
        '#############',
        '#.....M#...E.',
        '#.....D.....D',
        '#..pp.#.....G',
        '#.....#M.....',
        '##.####.#####',
        '#...........#',
        '#.#########.#',
        '#.#k..G...#..',
        '#.#.######.#.',
        '#.#.#f..f#.#.',
        '#.#...##.#.#.',
        '#.#.#..t.#.#.',
        '#.#.#####.#.#',
        '#.#...M...#..',
        '#.####.####.#',
        '#...f......t.',
        '#.##########.',
        '#S...........',
        '#############'
    ]);

    // ---------- Generátor bludišť: buňka = 2x2 dlaždice podlahy + 1 dlaždice zdi (chodby široké 2 dlaždice)
    function genRows(n) {
        var rnd = Z.rng(n * 7919 + 17);
        var cw = Math.min(6 + (n >> 1), 10), ch = Math.min(5 + Math.floor(n / 3), 8), nc = cw * ch;
        var W = cw * 3 + 1, H = ch * 3 + 1, g = [], x, y, i, c;
        for (y = 0; y < H; y++) { g.push([]); for (x = 0; x < W; x++) { g[y].push('#'); } }
        for (i = 0; i < nc; i++) {
            var cx = i % cw, cy = (i / cw) | 0;
            for (var dy = 0; dy < 2; dy++) { for (var dx = 0; dx < 2; dx++) { g[1 + 3 * cy + dy][1 + 3 * cx + dx] = '.'; } }
        }
        function tilesOf(a, b) {
            var ax = a % cw, ay = (a / cw) | 0, bx = b % cw, by = (b / cw) | 0;
            if (ay === by) { var gx = 3 + 3 * Math.min(ax, bx), y0 = 1 + 3 * ay; return [[gx, y0], [gx, y0 + 1]]; }
            var gy = 3 + 3 * Math.min(ay, by), x0 = 1 + 3 * ax;
            return [[x0, gy], [x0 + 1, gy]];
        }
        var adj = [], tiles = {};
        for (i = 0; i < nc; i++) { adj.push([]); }
        function link(a, b) {
            var k = Math.min(a, b) + '-' + Math.max(a, b);
            if (tiles[k]) { return; }
            tiles[k] = tilesOf(a, b);
            tiles[k].forEach(function (t) { g[t[1]][t[0]] = '.'; });
            adj[a].push({ to: b, key: k }); adj[b].push({ to: a, key: k });
        }
        function nbrs(c) {
            var r = [], cx = c % cw, cy = (c / cw) | 0;
            if (cx > 0) { r.push(c - 1); } if (cx < cw - 1) { r.push(c + 1); }
            if (cy > 0) { r.push(c - cw); } if (cy < ch - 1) { r.push(c + cw); }
            return r;
        }
        var seen = {}, stack = [0];
        seen[0] = 1;
        while (stack.length) {
            c = stack[stack.length - 1];
            var cand = nbrs(c).filter(function (v) { return !seen[v]; });
            if (!cand.length) { stack.pop(); continue; }
            var nx = cand[(rnd() * cand.length) | 0];
            seen[nx] = 1; link(c, nx); stack.push(nx);
        }
        for (c = 0; c < nc; c++) { nbrs(c).forEach(function (nb) { if (nb > c && rnd() < 0.08) { link(c, nb); } }); }

        function bfs(s, blocked) {
            var d = {}, par = {}, q = [s];
            d[s] = 0;
            for (var qi = 0; qi < q.length; qi++) {
                var cur = q[qi];
                adj[cur].forEach(function (e) {
                    if (blocked[e.key] || d[e.to] !== undefined) { return; }
                    d[e.to] = d[cur] + 1; par[e.to] = { from: cur, key: e.key }; q.push(e.to);
                });
            }
            return { d: d, par: par, order: q };
        }

        var used = {};
        function place(cell, chr) {
            var cx2 = cell % cw, cy2 = (cell / cw) | 0;
            var opts = [[0, 0], [1, 0], [0, 1], [1, 1]];
            for (var a = 3; a > 0; a--) { var j = (rnd() * (a + 1)) | 0, t = opts[a]; opts[a] = opts[j]; opts[j] = t; }
            for (var k = 0; k < 4; k++) {
                var px = 1 + 3 * cx2 + opts[k][0], py = 1 + 3 * cy2 + opts[k][1];
                if (!used[px + ',' + py]) { used[px + ',' + py] = 1; g[py][px] = chr; return true; }
            }
            return false;
        }
        function placeAny(cells, chr) {
            if (!cells.length) { return false; }
            for (var tr = 0; tr < 80; tr++) { if (place(cells[(rnd() * cells.length) | 0], chr)) { return true; } }
            return false;
        }

        var startCell = [0, cw - 1, nc - cw, nc - 1][(rnd() * 4) | 0];
        var b0 = bfs(startCell, {});
        var exitCell = b0.order[b0.order.length - 1];
        // cesta start -> východ
        var path = [];
        for (c = exitCell; c !== startCell; c = b0.par[c].from) { path.unshift(b0.par[c].key); }
        place(startCell, 'S');
        place(exitCell, 'E');

        var nd = n >= 2 ? Math.min(1 + Math.floor(n / 4), 4) : 0;
        nd = Math.min(nd, Math.max(0, path.length - 2));
        var doors = [];
        for (i = 0; i < nd; i++) {
            var idx = Math.min(path.length - 1, Math.floor(path.length * (i + 1) / (nd + 1)));
            if (doors.indexOf(path[idx]) < 0) { doors.push(path[idx]); }
        }
        doors.forEach(function (k) { tiles[k].forEach(function (t) { g[t[1]][t[0]] = 'D'; }); });
        doors.forEach(function (k, di) {
            var blocked = {};
            doors.forEach(function (k2, dj) { if (dj >= di) { blocked[k2] = true; } });
            var reg = bfs(startCell, blocked).order.filter(function (v) { return v !== startCell && v !== exitCell; });
            if (!reg.length) { reg = [startCell]; }
            placeAny(reg, 'k');
        });

        var allCells = [], far = [];
        for (c = 0; c < nc; c++) {
            if (c !== startCell) { allCells.push(c); }
            if (b0.d[c] >= 3 && c !== exitCell) { far.push(c); }
        }
        var ng = Math.min(2 + (n >> 1), 10, far.length), gc = far.slice();
        for (i = 0; i < ng; i++) {
            var gi = (rnd() * gc.length) | 0, cell = gc.splice(gi, 1)[0];
            place(cell, (n >= 4 && rnd() < 0.2 + 0.025 * n) ? 'M' : 'G');
        }
        var nf = 3 + Math.floor(nc / 10), nt = Math.floor(nc / 2.5), np = 2 + Math.floor(n / 4);
        for (i = 0; i < nf; i++) { placeAny(allCells, 'f'); }
        for (i = 0; i < nt; i++) { placeAny(allCells, 't'); }
        for (i = 0; i < np; i++) { placeAny(allCells, 'p'); }
        for (i = 0; i < Math.floor(nc / 6); i++) { placeAny(far, 'g'); }
        if (n >= 6) { for (i = 0; i < Math.floor(n / 5); i++) { placeAny(far, 'm'); } }
        return g.map(function (r) { return r.join(''); });
    }

    function levelRows(n) { return HAND[n] ? HAND[n].slice() : genRows(n); }

    root.LEVELS = { count: NLEV, names: NAMES, rows: levelRows, isHand: function (n) { return !!HAND[n]; } };
})(typeof window !== 'undefined' ? window : globalThis);
