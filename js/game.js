// Chodby labyrintu - hra shora ve stylu Gauntlet (ZX Spectrum). Logika a grafika; sada Z je v speccy.js, úrovně v levels.js.
(function () {
    'use strict';

    var T = 16, VY = 16, VW = 256, VH = 176, HIKEY = 'chodby', CAP = 36;
    var NLEV = window.LEVELS.count;

    // ---------- Sprity 8x8 (kreslí se 2x zvětšené na dlaždici 16x16)
    var SPR = {
        hero: ['..hhhh..', '.hhhhhh.', '.hfkfkh.', '..ffff..', '.bbbbbb.', 'fbbbbbbf', '.bb..bb.', '.ll..ll.'],
        ghost: ['..cccc..', '.cccccc.', '.ckcckc.', '.cccccc.', '.cccccc.', '.cccccc.', '.cccccc.', '.c.cc.c.'],
        demon: ['r.rrrr.r', 'rrrrrrrr', 'rykrrkyr', 'rrrrrrrr', '.rrwwrr.', '.rrrrrr.', '..r..r..', '.rr..rr.'],
        gen: ['aaaaaaaa', 'addaadda', 'addaadda', 'aaaaaaaa', 'adddddda', 'aaaaaaaa', 'adaddada', 'aaaaaaaa'],
        key: ['........', '..yyy...', '.y...y..', '.y...y..', '..yyy...', '...y....', '...yy...', '...yy...'],
        food: ['.....g..', '....g...', '..rrrrr.', '.rrrrrrr', '.rrwrrrr', '.rrrrrrr', '..rrrrr.', '...r.r..'],
        gold: ['........', '.yyyyyy.', 'yYYYYYYy', 'yyyyyyyy', 'yYYkkYYy', 'yYYYYYYy', 'yyyyyyyy', '........'],
        pot: ['...ww...', '...ww...', '..wmmw..', '.mmmmmm.', '.mmwmmm.', '.mmmmmm.', '.mmmmmm.', '..mmmm..'],
        door: ['yYYYYYYy', 'Yyyyyyyy', 'YyYYYYyY', 'YyYkkYyY', 'YyYkkYyY', 'YyYYYYyY', 'Yyyyyyyy', 'yYYYYYYy'],
        exit: ['..gggg..', '..gwwg..', '..gwwg..', 'gggwwggg', '.gwwwwg.', '..gwwg..', '...gg...', '........']
    };
    var PAL = { k: 0, r: 10, R: 2, y: 14, Y: 6, g: 12, G: 4, c: 13, C: 5, b: 9, B: 1, m: 11, M: 3, w: 15, W: 7 };

    // ---------- Hrdinové
    var HEROES = [
        { name: 'BOJOVNÍK', spd: 1.2, dmg: 4, cd: 16, arm: 0.85, pot: 5, bars: [2, 5, 3, 2], col: { h: 15, f: 14, b: 10, l: 2 }, weap: 15,
            desc: 'SILNÉ RÁNY, ROZBIJÍ GENERÁTORY' },
        { name: 'ČARODĚJKA', spd: 1.3, dmg: 2, cd: 9, arm: 1.2, pot: 12, bars: [3, 3, 1, 5], col: { h: 11, f: 14, b: 3, l: 11 }, weap: 13,
            desc: 'RYCHLÁ PALBA, SILNÁ KOUZLA' },
        { name: 'ELF', spd: 1.8, dmg: 2, cd: 11, arm: 1.0, pot: 6, bars: [5, 3, 2, 3], col: { h: 12, f: 14, b: 4, l: 6 }, weap: 14,
            desc: 'NEJRYCHLEJŠÍ BĚŽEC' },
        { name: 'VALKÝRA', spd: 1.3, dmg: 3, cd: 14, arm: 0.6, pot: 6, bars: [3, 4, 5, 2], col: { h: 14, f: 14, b: 13, l: 5 }, weap: 15,
            desc: 'PANCÍŘ, MALÉ ZRANĚNÍ' }
    ];
    var BARLAB = ['RYCHLOST', 'SÍLA', 'ODOLNOST', 'KOUZLO'];
    var THEMES = [[1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 14]];

    var G = window.GAME = { state: 'title', noDraw: false, t: 0 };
    var L = null, hero = null, HK = HEROES[0], lvl = 1, score = 0, hi = 0, newHi = false, sel = 0;
    var shots = [], fires = [], enemies = [], sparks = [], items = [], gens = [], dist = null, dirty = true;
    var cam = { x: 0, y: 0 }, timer = 0, flash = 0, drain = 0, bonus = 0, lastTx = -1, lastTy = -1, won = false, theme = THEMES[0];

    function expose() {
        G.L = L; G.hero = hero; G.enemies = enemies; G.items = items; G.gens = gens; G.shots = shots; G.fires = fires; G.cam = cam;
        G.dist = dist;
    }
    Object.defineProperty(G, 'lvl', { get: function () { return lvl; } });
    Object.defineProperty(G, 'score', { get: function () { return score; } });
    Object.defineProperty(G, 'hi', { get: function () { return hi; } });
    Object.defineProperty(G, 'timer', { get: function () { return timer; } });
    Object.defineProperty(G, 'won', { get: function () { return won; } });
    Object.defineProperty(G, 'sel', { get: function () { return sel; }, set: function (v) { sel = v; } });

    // ---------- Úroveň
    function parse(rows) {
        var w = rows[0].length, h = rows.length, o = { w: w, h: h, t: [], items: [], gens: [], mons: [], start: { x: 1, y: 1 } };
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var c = rows[y].charAt(x), tc = c;
                if (c === 'S') { o.start = { x: x, y: y }; tc = '.'; }
                else if ('kftp'.indexOf(c) >= 0) { o.items.push({ x: x, y: y, c: c }); tc = '.'; }
                else if (c === 'g' || c === 'm') { o.mons.push({ x: x, y: y, c: c }); tc = '.'; }
                else if (c === 'G' || c === 'M') { o.gens.push({ x: x, y: y, c: c }); }
                o.t.push(tc);
            }
        }
        return o;
    }

    function tileAt(tx, ty) { return (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) ? '#' : L.t[ty * L.w + tx]; }
    function setTile(tx, ty, c) { L.t[ty * L.w + tx] = c; dirty = true; }

    function ghostHp() { return 2 + (lvl >= 7 ? 1 : 0) + (lvl >= 13 ? 1 : 0); }
    function demonHp() { return 5 + Math.floor(lvl / 3); }

    function mkEnemy(kind, x, y) {
        var g = kind === 'g';
        return { t: kind, x: x, y: y, hp: g ? ghostHp() : demonHp(), spd: (g ? 0.7 + 0.015 * lvl : 0.5 + 0.01 * lvl) * (0.9 + Math.random() * 0.2),
            cd: 40 + ((Math.random() * 60) | 0), fl: 0, an: (Math.random() * 20) | 0 };
    }

    function startLevel(n) {
        lvl = n;
        L = parse(window.LEVELS.rows(n));
        theme = THEMES[(n - 1) % THEMES.length];
        shots = []; fires = []; enemies = []; sparks = [];
        items = L.items;
        gens = L.gens.map(function (g) { return { x: g.x, y: g.y, c: g.c, hp: 10 + lvl, cd: 20 + ((Math.random() * 60) | 0), fl: 0, dead: false }; });
        L.mons.forEach(function (m) { enemies.push(mkEnemy(m.c, m.x * T + 8, m.y * T + 8)); });
        if (!hero) { hero = { hp: 800, pots: 1 }; }
        hero.x = L.start.x * T + 8; hero.y = L.start.y * T + 8; hero.fx = 0; hero.fy = 1;
        hero.cd = 0; hero.keys = 0; hero.hurt = 0; hero.bob = 0;
        dirty = true; lastTx = -1; flash = 0; drain = 0;
        dist = new Int16Array(L.w * L.h);
        G.state = 'lvl'; timer = 110; Z.pauseOk = true;
        camera(); expose();
        Z.snd.seq([262, 330, 392], 0.08);
    }

    function newGame() {
        HK = HEROES[sel];
        hero = null; score = 0; newHi = false; won = false;
        startLevel(1);
        hero.pots = 1; hero.hp = 800;
    }
    G.newGame = function (i) { sel = i || 0; newGame(); };
    G.startLevel = function (n) { if (!hero) { HK = HEROES[sel]; } startLevel(n); };
    G.heroes = HEROES;

    // ---------- Kolize
    function solid(tx, ty, isHero) {
        var c = tileAt(tx, ty);
        if (c === '#' || c === 'G' || c === 'M') { return true; }
        if (c === 'D') {
            if (isHero && hero.keys > 0) { openDoor(tx, ty); return false; }
            return true;
        }
        return false;
    }
    function openDoor(tx, ty) {
        var q = [[tx, ty]];
        setTile(tx, ty, '.');
        while (q.length) {
            var p = q.pop();
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
                if (tileAt(p[0] + d[0], p[1] + d[1]) === 'D') { setTile(p[0] + d[0], p[1] + d[1], '.'); q.push([p[0] + d[0], p[1] + d[1]]); }
            });
        }
        hero.keys--;
        Z.snd.beep(300, 0.1, 600, 0.05); Z.snd.beep(600, 0.12, 900, 0.05, 0.1);
        burst(tx * T + 8, ty * T + 8, 14, 6);
    }
    function boxHit(x, y, r, isHero) {
        var x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r - 1) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r - 1) / T);
        for (var ty = y0; ty <= y1; ty++) { for (var tx = x0; tx <= x1; tx++) { if (solid(tx, ty, isHero)) { return true; } } }
        return false;
    }
    function move(e, dx, dy) {
        if (dx) { e.x += dx; if (boxHit(e.x, e.y, 5, true)) { e.x -= dx; } }
        if (dy) { e.y += dy; if (boxHit(e.x, e.y, 5, true)) { e.y -= dy; } }
    }

    // ---------- Pomocné efekty
    function burst(x, y, n, col) {
        for (var i = 0; i < n; i++) {
            var a = Math.random() * 6.283, s = 0.4 + Math.random() * 1.4;
            sparks.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 14 + ((Math.random() * 14) | 0), col: col });
        }
    }
    function addScore(n) { score += n; }
    function hurtHero(d) {
        hero.hp -= Math.max(1, Math.round(d * HK.arm));
        hero.hurt = 10;
        Z.snd.hit();
    }
    function killEnemy(e) {
        e.dead = true;
        addScore(e.t === 'g' ? 10 : 30);
        burst(e.x, e.y, 10, e.t === 'g' ? 13 : 10);
        Z.snd.beep(500, 0.08, 120, 0.04);
    }
    function hurtEnemy(e, d) { e.hp -= d; e.fl = 4; if (e.hp <= 0 && !e.dead) { killEnemy(e); } else { Z.snd.beep(200, 0.04, 0, 0.03); } }
    function genAt(tx, ty) { for (var i = 0; i < gens.length; i++) { if (!gens[i].dead && gens[i].x === tx && gens[i].y === ty) { return gens[i]; } } return null; }
    function hurtGen(g, d) {
        g.hp -= d; g.fl = 5;
        if (g.hp <= 0) {
            g.dead = true; setTile(g.x, g.y, '.'); addScore(50);
            burst(g.x * T + 8, g.y * T + 8, 26, g.c === 'G' ? 13 : 10);
            Z.snd.boom();
        } else { Z.snd.beep(160, 0.05, 0, 0.04); }
    }

    function camera() {
        cam.x = Math.max(0, Math.min(L.w * T - VW, Math.round(hero.x - VW / 2)));
        cam.y = Math.max(0, Math.min(L.h * T - VH, Math.round(hero.y - VH / 2)));
    }

    function potion() {
        if (hero.pots <= 0) { return; }
        hero.pots--; flash = 16;
        Z.snd.boom(); Z.snd.beep(900, 0.4, 100, 0.05);
        enemies.forEach(function (e) {
            if (e.x > cam.x - 8 && e.x < cam.x + VW + 8 && e.y > cam.y - 8 && e.y < cam.y + VH + 8 && !e.dead) { killEnemy(e); }
        });
        gens.forEach(function (g) {
            var gx = g.x * T + 8, gy = g.y * T + 8;
            if (!g.dead && gx > cam.x - 8 && gx < cam.x + VW + 8 && gy > cam.y - 8 && gy < cam.y + VH + 8) { hurtGen(g, HK.pot * 3); }
        });
        fires.length = 0;
    }

    // ---------- Proudové pole (vzdálenost k hrdinovi po dlaždicích)
    function walk(tx, ty) { var c = tileAt(tx, ty); return c !== '#' && c !== 'D' && c !== 'G' && c !== 'M'; }
    function flow() {
        var w = L.w, h = L.h, d = dist, i;
        for (i = 0; i < d.length; i++) { d[i] = -1; }
        var sx = Math.floor(hero.x / T), sy = Math.floor(hero.y / T);
        var q = [sy * w + sx];
        d[q[0]] = 0;
        for (var qi = 0; qi < q.length; qi++) {
            var cur = q[qi], cx = cur % w, cy = (cur / w) | 0, nd = d[cur] + 1;
            if (cx > 0 && d[cur - 1] < 0 && walk(cx - 1, cy)) { d[cur - 1] = nd; q.push(cur - 1); }
            if (cx < w - 1 && d[cur + 1] < 0 && walk(cx + 1, cy)) { d[cur + 1] = nd; q.push(cur + 1); }
            if (cy > 0 && d[cur - w] < 0 && walk(cx, cy - 1)) { d[cur - w] = nd; q.push(cur - w); }
            if (cy < h - 1 && d[cur + w] < 0 && walk(cx, cy + 1)) { d[cur + w] = nd; q.push(cur + w); }
        }
    }

    function spawn(g) {
        var o = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]], k = (Math.random() * 8) | 0;
        for (var i = 0; i < 8; i++) {
            var d = o[(i + k) % 8], tx = g.x + d[0], ty = g.y + d[1], c = tileAt(tx, ty);
            if (c === '.' || c === 'E') {
                enemies.push(mkEnemy(g.c === 'G' ? 'g' : 'm', tx * T + 8, ty * T + 8));
                return true;
            }
        }
        return false;
    }

    // ---------- Herní tik
    function playTick() {
        var inp = Z.input, i, e, s;
        // pohyb a směr
        var dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0), dy = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
        if (dx || dy) {
            hero.fx = dx; hero.fy = dy; hero.bob++;
            var sp = HK.spd * ((dx && dy) ? 0.7071 : 1);
            move(hero, dx * sp, 0); move(hero, 0, dy * sp);
        }
        camera();
        // střelba a kouzlo
        if (hero.cd > 0) { hero.cd--; }
        if (inp.down('fire') && hero.cd <= 0) {
            var n = Math.sqrt(hero.fx * hero.fx + hero.fy * hero.fy) || 1;
            shots.push({ x: hero.x + hero.fx / n * 6, y: hero.y + hero.fy / n * 6, vx: hero.fx / n * 3.6, vy: hero.fy / n * 3.6, life: 60 });
            hero.cd = HK.cd; Z.snd.shoot();
        }
        if (inp.hit('alt')) { potion(); }
        if (hero.hurt > 0) { hero.hurt--; }
        if (flash > 0) { flash--; }
        // zdraví ubývá
        if (++drain >= 25) { drain = 0; hero.hp--; }
        // dlaždice pod hrdinou
        var tx = Math.floor(hero.x / T), ty = Math.floor(hero.y / T);
        if (tx !== lastTx || ty !== lastTy) { lastTx = tx; lastTy = ty; dirty = true; }
        if (dirty) { flow(); dirty = false; }
        if (tileAt(tx, ty) === 'E' && Math.abs(hero.x - (tx * T + 8)) < 7 && Math.abs(hero.y - (ty * T + 8)) < 7) { levelClear(); return; }
        // sběr
        for (i = items.length - 1; i >= 0; i--) {
            var it = items[i];
            if (Math.abs(hero.x - (it.x * T + 8)) < 10 && Math.abs(hero.y - (it.y * T + 8)) < 10) {
                if (it.c === 'p' && hero.pots >= 9) { continue; }
                if (it.c === 'k') { hero.keys++; Z.snd.beep(1000, 0.08, 1500, 0.05); }
                else if (it.c === 'f') { hero.hp = Math.min(999, hero.hp + 100); Z.snd.seq([523, 659], 0.06); }
                else if (it.c === 't') { addScore(100); Z.snd.coin(); }
                else if (it.c === 'p') { hero.pots++; Z.snd.beep(400, 0.1, 900, 0.05); }
                items.splice(i, 1);
            }
        }
        // střely hrdiny
        for (i = shots.length - 1; i >= 0; i--) {
            s = shots[i]; s.x += s.vx; s.y += s.vy;
            var stx = Math.floor(s.x / T), sty = Math.floor(s.y / T), sc = tileAt(stx, sty), gone = --s.life <= 0;
            if (sc === '#' || sc === 'D') { gone = true; if (sparks.length < 120) { burst(s.x, s.y, 2, 7); } }
            else if (sc === 'G' || sc === 'M') { var gg = genAt(stx, sty); if (gg) { hurtGen(gg, HK.dmg); } gone = true; }
            else {
                for (var j = 0; j < enemies.length; j++) {
                    e = enemies[j];
                    if (!e.dead && Math.abs(s.x - e.x) < 7 && Math.abs(s.y - e.y) < 7) { hurtEnemy(e, HK.dmg); gone = true; break; }
                }
            }
            if (gone) { shots.splice(i, 1); }
        }
        // generátory
        gens.forEach(function (g) {
            if (g.dead) { return; }
            if (g.fl > 0) { g.fl--; }
            var d = Math.hypot(hero.x - (g.x * T + 8), hero.y - (g.y * T + 8));
            if (d < 190) {
                if (--g.cd <= 0 && enemies.length < CAP) {
                    spawn(g);
                    g.cd = (g.c === 'G' ? Math.max(55, 150 - 5 * lvl) : Math.max(110, 250 - 8 * lvl)) + ((Math.random() * 30) | 0);
                }
            }
        });
        // nepřátelé
        for (i = 0; i < enemies.length; i++) {
            e = enemies[i];
            if (e.dead) { continue; }
            if (e.fl > 0) { e.fl--; }
            e.an++;
            var hd = Math.hypot(hero.x - e.x, hero.y - e.y);
            if (hd > 240) { continue; }
            var ex = Math.floor(e.x / T), ey = Math.floor(e.y / T), d0 = (ex >= 0 && ey >= 0 && ex < L.w && ey < L.h) ? dist[ey * L.w + ex] : -1;
            var tgx = hero.x, tgy = hero.y;
            if (d0 > 1) {
                var best = d0, bx = -1, by = -1, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                for (var k = 0; k < 4; k++) {
                    var nx = ex + nb[k][0], ny = ey + nb[k][1];
                    if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) { continue; }
                    var dn = dist[ny * L.w + nx];
                    if (dn >= 0 && dn < best) { best = dn; bx = nx; by = ny; }
                }
                if (bx >= 0) { tgx = bx * T + 8; tgy = by * T + 8; }
            }
            var vx = tgx - e.x, vy = tgy - e.y, vl = Math.hypot(vx, vy) || 1;
            if (e.t === 'm' && hd < 44) { vl = 1e9; }          // démon se při přiblížení zastaví
            e.x += vx / vl * e.spd; e.y += vy / vl * e.spd;
            // odpuzování
            for (var m = i + 1; m < enemies.length; m++) {
                var o = enemies[m];
                if (!o.dead && Math.abs(o.x - e.x) < 7 && Math.abs(o.y - e.y) < 7) {
                    var ox = e.x - o.x, oy = e.y - o.y, ol = Math.hypot(ox, oy) || 1;
                    e.x += ox / ol * 0.3; e.y += oy / ol * 0.3; o.x -= ox / ol * 0.3; o.y -= oy / ol * 0.3;
                }
            }
            // útok
            if (e.cd > 0) { e.cd--; }
            if (hd < 10) {
                if (e.t === 'g') { hurtHero(6 + Math.floor(lvl / 2)); e.dead = true; burst(e.x, e.y, 8, 13); }
                else if (e.cd <= 0) { hurtHero(10 + Math.floor(lvl / 3)); e.cd = 45; }
            } else if (e.t === 'm' && hd < 150 && e.cd <= 0) {
                fires.push({ x: e.x, y: e.y, vx: (hero.x - e.x) / hd * 1.5, vy: (hero.y - e.y) / hd * 1.5, life: 130 });
                e.cd = 90 + ((Math.random() * 60) | 0); Z.snd.beep(500, 0.12, 250, 0.025);
            }
        }
        enemies = enemies.filter(function (q) { return !q.dead; }); G.enemies = enemies;
        // ohnivé koule
        for (i = fires.length - 1; i >= 0; i--) {
            s = fires[i]; s.x += s.vx; s.y += s.vy;
            var rm = --s.life <= 0 || solid(Math.floor(s.x / T), Math.floor(s.y / T), false);
            if (!rm && Math.abs(s.x - hero.x) < 7 && Math.abs(s.y - hero.y) < 7) { hurtHero(8 + Math.floor(lvl / 3)); rm = true; }
            if (rm) { fires.splice(i, 1); }
        }
        // jiskry
        for (i = sparks.length - 1; i >= 0; i--) {
            s = sparks[i]; s.x += s.vx; s.y += s.vy; if (--s.life <= 0) { sparks.splice(i, 1); }
        }
        // konec
        if (hero.hp <= 0) {
            hero.hp = 0; G.state = 'dying'; timer = 100; Z.pauseOk = false; Z.snd.die(); burst(hero.x, hero.y, 30, 10);
        }
    }

    function levelClear() {
        bonus = 200 + 50 * lvl;
        addScore(bonus);
        hero.hp = Math.min(999, hero.hp + 60);
        G.state = 'clear'; timer = 150; Z.snd.win();
    }

    function finish() {
        var prev = Z.hi.get(HIKEY);
        hi = Z.hi.submit(HIKEY, score);
        newHi = score > prev && score > 0;
        G.state = 'over'; timer = 70; Z.pauseOk = false;
    }

    function tick() {
        G.t++;
        var st = G.state, fire = Z.input.hit('fire');
        Z.border = 0;
        if (st === 'title') {
            if (fire) { G.state = 'select'; Z.snd.coin(); }
        } else if (st === 'select') {
            if (Z.input.hit('left')) { sel = (sel + 3) % 4; Z.snd.tick(); }
            if (Z.input.hit('right')) { sel = (sel + 1) % 4; Z.snd.tick(); }
            if (fire) { newGame(); }
        } else if (st === 'lvl') {
            if (--timer <= 0 || fire) { G.state = 'play'; }
        } else if (st === 'play') {
            playTick();
            Z.border = flash > 0 ? (flash % 4 < 2 ? 7 : 5) : (hero.hurt > 6 ? 2 : 0);
        } else if (st === 'dying') {
            sparks.forEach(function (s) { s.x += s.vx; s.y += s.vy; s.life--; });
            Z.border = timer % 8 < 4 ? 2 : 0;
            if (--timer <= 0) { finish(); }
        } else if (st === 'clear') {
            if (--timer <= 0) {
                if (lvl >= NLEV) { won = true; addScore(hero.hp * 2); finish(); Z.snd.win(); }
                else { startLevel(lvl + 1); }
            }
        } else if (st === 'over') {
            if (timer > 0) { timer--; } else if (fire) { G.state = 'title'; Z.snd.coin(); }
        }
        if (G.state === 'title' || G.state === 'select') { Z.pauseOk = false; }
    }

    // ---------- Kreslení
    function spr(rows, pal, x, y, flip) { Z.spriteCS(x, y, rows, pal, 2, flip); }
    function pad6(n) { return Z.pad(n, 6); }

    function drawTile(tx, ty, px, py) {
        var c = tileAt(tx, ty);
        if (c === '#') {
            Z.rect(px, py, T, T, theme[0]);
            Z.rect(px, py, T, 1, theme[1]); Z.rect(px, py + 8, T, 1, theme[1]);
            Z.rect(px + 8, py + 1, 1, 7, theme[1]); Z.rect(px + 3, py + 9, 1, 7, theme[1]); Z.rect(px + 12, py + 9, 1, 7, theme[1]);
        } else {
            if (((tx * 7 + ty * 13) & 3) === 0) { Z.pix(px + 5 + ((tx + ty) & 3) * 2, py + 6 + (tx & 3) * 2, theme[0]); }
            if (c === 'D') { spr(SPR.door, PAL, px, py); }
            else if (c === 'E') {
                var pe = { g: (G.t >> 3) & 1 ? 12 : 4, w: 15 };
                Z.rect(px, py, T, T, 1); spr(SPR.exit, pe, px, py);
            }
        }
    }

    function drawWorld() {
        var x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T), x1 = Math.floor((cam.x + VW - 1) / T), y1 = Math.floor((cam.y + VH - 1) / T);
        var tx, ty, i;
        for (ty = y0; ty <= y1; ty++) { for (tx = x0; tx <= x1; tx++) { drawTile(tx, ty, tx * T - cam.x, ty * T - cam.y + VY); } }
        items.forEach(function (it) {
            if (it.x < x0 - 1 || it.x > x1 + 1 || it.y < y0 - 1 || it.y > y1 + 1) { return; }
            var rows = it.c === 'k' ? SPR.key : it.c === 'f' ? SPR.food : it.c === 't' ? SPR.gold : SPR.pot;
            spr(rows, PAL, it.x * T - cam.x, it.y * T - cam.y + VY + (((G.t >> 4) + it.x) & 1));
        });
        gens.forEach(function (g) {
            if (g.dead || g.x < x0 - 1 || g.x > x1 + 1 || g.y < y0 - 1 || g.y > y1 + 1) { return; }
            var a = g.c === 'G' ? 7 : 2, d = g.c === 'G' ? 5 : 10;
            if (g.fl > 0) { a = 15; }
            spr(SPR.gen, { a: a, d: d }, g.x * T - cam.x, g.y * T - cam.y + VY);
        });
        enemies.forEach(function (e) {
            var sx = Math.round(e.x - cam.x) - 8, sy = Math.round(e.y - cam.y) + VY - 8;
            if (sx < -16 || sx > VW || sy < VY - 16 || sy > 192) { return; }
            var rows = e.t === 'g' ? SPR.ghost : SPR.demon, pal = PAL;
            if (e.fl > 0) { pal = { k: 0, r: 15, y: 15, w: 15, c: 15 }; }
            spr(rows, pal, sx, sy + ((e.an >> 3) & 1), (e.an >> 4) & 1);
        });
        if (hero) {
            var hx = Math.round(hero.x - cam.x), hy = Math.round(hero.y - cam.y) + VY;
            if (G.state !== 'dying' || (timer & 4)) {
                var hc = HK.col, hp2 = { k: 0, h: hc.h, f: hc.f, b: hc.b, l: hc.l };
                if (hero.hurt > 0 && (hero.hurt & 2)) { hp2 = { k: 0, h: 10, f: 10, b: 10, l: 10 }; }
                spr(SPR.hero, hp2, hx - 8, hy - 8 + ((hero.bob >> 3) & 1), hero.fx < 0);
                var n = Math.sqrt(hero.fx * hero.fx + hero.fy * hero.fy) || 1;
                Z.rect(hx + Math.round(hero.fx / n * 8) - 1, hy + Math.round(hero.fy / n * 8) - 1, 3, 3, HK.weap);
            }
        }
        shots.forEach(function (s) { Z.rect(Math.round(s.x - cam.x) - 1, Math.round(s.y - cam.y) + VY - 1, 3, 3, 15); });
        fires.forEach(function (s) {
            var fx = Math.round(s.x - cam.x), fy = Math.round(s.y - cam.y) + VY;
            Z.disc(fx, fy, 3, 10); Z.disc(fx, fy, 1, 14);
        });
        sparks.forEach(function (s) { Z.rect(Math.round(s.x - cam.x), Math.round(s.y - cam.y) + VY, 2, 2, s.col); });
        if (flash > 0 && hero) {
            Z.ring(Math.round(hero.x - cam.x), Math.round(hero.y - cam.y) + VY, (16 - flash) * 12, 15);
            Z.ring(Math.round(hero.x - cam.x), Math.round(hero.y - cam.y) + VY, (16 - flash) * 12 - 3, 11);
        }
    }

    function drawHud() {
        Z.rect(0, 0, VW, VY, 0);
        var low = hero.hp < 150 && (G.t & 16);
        Z.text(2, -1, 'ZDRAVÍ ' + Z.pad(hero.hp, 4), low ? 10 : 12);
        Z.text(92, -1, 'SKÓRE ' + pad6(score), 14);
        Z.text(254, -1, 'ÚROVEŇ ' + Z.pad(lvl, 2), 13, { align: 'right' });
        Z.text(2, 7, 'KLÍČE ' + hero.keys, 14);
        Z.text(62, 7, 'KOUZLA ' + hero.pots, 11);
        Z.text(130, 7, HK.name, 15);
        Z.text(254, 7, 'REK ' + pad6(Math.max(hi, score)), 7, { align: 'right' });
    }

    function box(x, y, w, h) { Z.rect(x, y, w, h, 0); Z.frame(x, y, w, h, 14); Z.frame(x + 2, y + 2, w - 4, h - 4, 6); }

    function drawTitle() {
        var i;
        for (i = 0; i < 16; i++) {
            Z.rect(i * 16, 0, 16, 16, 1); Z.rect(i * 16, 0, 16, 1, 9); Z.rect(i * 16 + (i & 1 ? 3 : 11), 1, 1, 7, 9); Z.rect(i * 16, 8, 16, 1, 9);
            Z.rect(i * 16, 176, 16, 16, 1); Z.rect(i * 16, 176, 16, 1, 9); Z.rect(i * 16, 184, 16, 1, 9);
        }
        var c = (G.t >> 3) & 1 ? 14 : 6;
        Z.text(128, 22, 'CHODBY', c, { scale: 3, align: 'center' });
        Z.text(128, 46, 'LABYRINTU', c === 14 ? 6 : 14, { scale: 3, align: 'center' });
        var xs = [60, 90, 120, 150, 180];
        spr(SPR.hero, { k: 0, h: 15, f: 14, b: 10, l: 2 }, 40, 78);
        spr(SPR.hero, { k: 0, h: 11, f: 14, b: 3, l: 11 }, 64, 78);
        spr(SPR.hero, { k: 0, h: 12, f: 14, b: 4, l: 6 }, 88, 78);
        spr(SPR.hero, { k: 0, h: 14, f: 14, b: 13, l: 5 }, 112, 78);
        spr(SPR.ghost, PAL, 148 + ((G.t >> 4) & 1) * 2, 78, (G.t >> 5) & 1);
        spr(SPR.demon, PAL, 172, 78 + ((G.t >> 3) & 1));
        spr(SPR.gen, { a: 7, d: 5 }, 196, 78);
        void xs;
        Z.text(128, 100, 'STŘÍLEJ DUCHY A DÉMONY, NIČ JEJICH ZDROJE.', 15, { align: 'center' });
        Z.text(128, 110, 'SBÍREJ KLÍČE (DVEŘE), JÍDLO (ZDRAVÍ),', 14, { align: 'center' });
        Z.text(128, 120, 'POKLADY A KOUZLA. ZDRAVÍ UBÝVÁ ČASEM!', 14, { align: 'center' });
        Z.text(128, 130, 'DOJDI K VÝCHODU V KAŽDÉ Z ' + NLEV + ' ÚROVNÍ.', 12, { align: 'center' });
        Z.text(128, 145, 'ŠIPKY/WASD CHŮZE  MEZERNÍK PALBA', 13, { align: 'center' });
        Z.text(128, 154, 'X KOUZLO  P PAUZA  M ZVUK', 13, { align: 'center' });
        Z.text(128, 165, 'REKORD ' + pad6(Z.hi.get(HIKEY)), 10, { align: 'center' });
        if ((G.t >> 5) & 1) { Z.text(128, 177, 'STISKNI OHEŇ', 15, { align: 'center' }); }
    }

    function drawSelect() {
        Z.text(128, 6, 'VYBER HRDINU', 14, { scale: 2, align: 'center' });
        for (var i = 0; i < 4; i++) {
            var x = 8 + i * 61, hc = HEROES[i].col, on = i === sel;
            Z.rect(x, 34, 57, 62, 0); Z.frame(x, 34, 57, 62, on ? 14 : 8 + 1);
            if (on) { Z.frame(x + 2, 36, 53, 58, 6); }
            spr(SPR.hero, { k: 0, h: hc.h, f: hc.f, b: hc.b, l: hc.l }, x + 8, 44 + (on ? ((G.t >> 3) & 1) : 0));
            Z.rect(x + 8 + 8, 44, 1, 1, 0);
            Z.text(x + 28, 70, HEROES[i].name, on ? 15 : 7, { align: 'center' });
            // šipky
        }
        // zvětšený náhled vybraného
        var H = HEROES[sel];
        Z.rect(8, 100, 240, 70, 0); Z.frame(8, 100, 240, 70, 6);
        spr(SPR.hero, { k: 0, h: H.col.h, f: H.col.f, b: H.col.b, l: H.col.l }, 18, 106);
        Z.text(44, 104, H.name, 14);
        Z.text(44, 115, H.desc, 15);
        for (var b = 0; b < 4; b++) {
            Z.text(18, 130 + b * 9, BARLAB[b], 7);
            for (var k = 0; k < 5; k++) { Z.rect(90 + k * 12, 133 + b * 9, 10, 5, k < H.bars[b] ? 12 : 1); }
        }
        Z.text(128, 174, '< > VÝBĚR  OHEŇ START', 13, { align: 'center' });
    }

    function drawBanner(lines, colors) {
        var w = 176, h = 14 + lines.length * 12 + 6, x = (VW - w) / 2, y = VY + (VH - h) / 2;
        box(x, y, w, h);
        lines.forEach(function (ln, i) { Z.text(128, y + 8 + i * 12, ln.t, colors[i] || 15, { align: 'center', scale: ln.s || 1 }); });
    }

    function draw() {
        if (G.noDraw) { return; }
        var st = G.state;
        Z.cls(0, 7);
        if (st === 'title') { drawTitle(); return; }
        if (st === 'select') { drawSelect(); return; }
        drawWorld();
        drawHud();
        if (st === 'lvl') {
            drawBanner([{ t: 'ÚROVEŇ ' + lvl, s: 2 }, { t: window.LEVELS.names[lvl - 1].toUpperCase() }, { t: HK.name }], [14, 15, 12]);
        } else if (st === 'clear') {
            drawBanner([{ t: lvl >= NLEV ? 'LABYRINT DOBYT!' : 'ÚROVEŇ SPLNĚNA!', s: lvl >= NLEV ? 1 : 1 }, { t: 'BONUS ' + bonus }, { t: 'ZDRAVÍ +60' }], [14, 12, 11]);
        } else if (st === 'dying') {
            drawBanner([{ t: 'HRDINA PADL...' }], [10]);
        } else if (st === 'over') {
            Z.rect(0, VY, VW, VH, 0);
            Z.text(128, 36, won ? 'VÍTĚZSTVÍ!' : 'KONEC HRY', won ? 12 : 10, { scale: 3, align: 'center' });
            if (won) { Z.text(128, 66, 'PROŠEL JSI VŠECH ' + NLEV + ' ÚROVNÍ!', 14, { align: 'center' }); }
            else { Z.text(128, 66, 'ZDRAVÍ DOŠLO NA ÚROVNI ' + lvl, 15, { align: 'center' }); }
            Z.text(128, 88, 'SKÓRE ' + pad6(score), 14, { scale: 2, align: 'center' });
            Z.text(128, 112, 'REKORD ' + pad6(hi), 13, { align: 'center' });
            if (newHi) { Z.text(128, 126, 'NOVÝ REKORD!', (G.t >> 3) & 1 ? 14 : 10, { scale: 2, align: 'center' }); }
            if (timer <= 0 && ((G.t >> 5) & 1)) { Z.text(128, 160, 'STISKNI OHEŇ', 15, { align: 'center' }); }
        }
    }

    hi = Z.hi.get(HIKEY);
    Z.init({
        title: 'Chodby labyrintu',
        touch: [
            { act: 'left', label: '◀' }, { act: 'up', label: '▲' }, { act: 'down', label: '▼' }, { act: 'right', label: '▶' },
            { act: 'alt', label: 'KOUZLO' }, { act: 'fire', label: 'OHEŇ', cls: 'big' }
        ]
    });
    Z.run({ tick: tick, draw: draw });
})();
