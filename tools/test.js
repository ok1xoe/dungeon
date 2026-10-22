// Test hry v Node: stavy title->select->lvl->play->dying->over->title, NaN, bot dokončující úrovně, rekord.
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const base = __dirname + '/../js/';
function boot() {
    const g = H.load([base + 'speccy.js', base + 'levels.js', base + 'game.js']);
    return { g, GAME: g.sandbox.GAME, Z: g.Z };
}
let fails = 0;
function check(c, msg) { console.log((c ? 'OK    ' : 'CHYBA ') + msg); if (!c) { fails++; } }
const T = 16;

// ---------- bot
function makeBot(g, GAME, aim) {
    if (aim === undefined) { aim = true; }
    const Z = g.Z;
    function dirs(dx, dy) {
        ['left', 'right', 'up', 'down'].forEach(a => Z.input.release(a));
        if (dx < 0) { Z.input.press('left'); } if (dx > 0) { Z.input.press('right'); }
        if (dy < 0) { Z.input.press('up'); } if (dy > 0) { Z.input.press('down'); }
    }
    function bfs(start, passable) {
        const L = GAME.L, w = L.w, par = new Int32Array(L.w * L.h).fill(-2), q = [start];
        par[start] = -1;
        for (let qi = 0; qi < q.length; qi++) {
            const c = q[qi], x = c % w, y = (c / w) | 0;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= L.h) { return; }
                const n = ny * w + nx;
                if (par[n] !== -2 || !passable(L.t[n])) { return; }
                par[n] = c; q.push(n);
            });
        }
        return par;
    }
    let lastPress = 0;
    return function step() {
        const st = GAME.state;
        if (st === 'title' || st === 'select' || st === 'over' || st === 'lvl') {
            if (lastPress++ % 4 === 0) { Z.input.press('fire'); } else { Z.input.release('fire'); }
            return;
        }
        if (st !== 'play') { return; }
        const h = GAME.hero, L = GAME.L, w = L.w;
        const tx = Math.floor(h.x / T), ty = Math.floor(h.y / T), me = ty * w + tx;
        const pass = c => c !== '#' && (c !== 'D' || h.keys > 0);
        const par = bfs(me, pass);
        const pathTo = (tile) => {   // první krok k dlaždici
            let c = tile; if (par[c] === -2) { return null; }
            while (par[c] !== me && par[c] !== -1) { c = par[c]; }
            return par[c] === -1 ? me : c;
        };
        let target = null;
        const reach = (x, y) => par[y * w + x] !== -2;
        // jídlo, když je hp nízké
        if (h.hp < 450) {
            let best = 1e9;
            GAME.items.forEach(it => { if (it.c === 'f' && reach(it.x, it.y)) { const d = Math.hypot(it.x * T - h.x, it.y * T - h.y); if (d < best) { best = d; target = [it.x, it.y]; } } });
        }
        if (!target) {
            // východ dosažitelný?
            for (let i = 0; i < L.t.length; i++) { if (L.t[i] === 'E' && par[i] !== -2) { target = [i % w, (i / w) | 0]; } }
        }
        if (!target) {
            // klíč
            let best = 1e9;
            GAME.items.forEach(it => { if (it.c === 'k' && reach(it.x, it.y)) { const d = Math.hypot(it.x * T - h.x, it.y * T - h.y); if (d < best) { best = d; target = [it.x, it.y]; } } });
        }
        if (!target) {
            // dveře dosažitelné s klíčem? jinak generátor: průchozí i přes G/M
            const par2 = bfs(me, c => c !== '#' && (c !== 'D' || h.keys > 0));
            void par2;
            const passG = bfs(me, c => c !== '#' && c !== 'D');
            let best = 1e9;
            for (let i = 0; i < L.t.length; i++) {
                if (L.t[i] === 'G' || L.t[i] === 'M') {
                    const d = Math.hypot((i % w) * T - h.x, ((i / w) | 0) * T - h.y); if (passG[i] !== -2 && d < best) { best = d; target = [i % w, (i / w) | 0]; }
                }
            }
        }
        // kouzlo, když je kolem hodně nepřátel
        const near = GAME.enemies.filter(e => Math.hypot(e.x - h.x, e.y - h.y) < 70).length;
        if (near >= 3 && h.pots > 0 && (GAME.t % 5 === 0)) { Z.input.press('alt'); } else { Z.input.release('alt'); }
        Z.input.press('fire');
        // nepřítel těsně -> otoč se k němu
        let ne = null, nd = 1e9;
        GAME.enemies.forEach(e => { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < nd) { nd = d; ne = e; } });
        if (aim && ne && nd < 60 && (GAME.t % 6 < 3)) {
            dirs(Math.abs(ne.x - h.x) > 4 ? Math.sign(ne.x - h.x) : 0, Math.abs(ne.y - h.y) > 4 ? Math.sign(ne.y - h.y) : 0);
            return;
        }
        if (!target) { dirs(0, 0); return; }
        const tIdx = target[1] * w + target[0];
        let step1 = tIdx === me ? me : pathTo(tIdx);
        if (step1 === null) {   // cílem je generátor (nedosažitelný): jdi k nejbližšímu sousedovi
            const passG = bfs(me, c => c !== '#' && c !== 'D');
            let c = tIdx; if (passG[c] === -2) { dirs(0, 0); return; }
            while (passG[c] !== me && passG[c] !== -1) { c = passG[c]; }
            step1 = c;
        }
        const cx = (step1 % w) * T + 8, cy = ((step1 / w) | 0) * T + 8;
        let ddx = cx - h.x, ddy = cy - h.y;
        // pokud je krok sousední dlaždice, nasměruj se na střed
        dirs(Math.abs(ddx) > 2 ? Math.sign(ddx) : 0, Math.abs(ddy) > 2 ? Math.sign(ddy) : 0);
    };
}

// ---------- 1) přechody stavů a prosté chování
{
    const { g, GAME, Z } = boot();
    check(GAME.state === 'title', 'start na titulní obrazovce');
    g.step(30);
    Z.input.press('fire'); g.step(2); Z.input.release('fire');
    check(GAME.state === 'select', 'title -> select');
    Z.input.press('right'); g.step(2); Z.input.release('right'); g.step(1);
    check(GAME.sel === 1, 'výběr hrdiny vpravo (čarodějka)');
    Z.input.press('fire'); g.step(2); Z.input.release('fire');
    check(GAME.state === 'lvl' && GAME.lvl === 1, 'select -> úroveň 1 (banner)');
    g.step(120);
    check(GAME.state === 'play', 'banner -> hra');
    check(Z.pauseOk === true, 'pauza povolena ve hře');
    // chůze doprava a střelba
    const x0 = GAME.hero.x;
    Z.input.press('right'); Z.input.press('fire'); g.step(40);
    check(GAME.hero.x > x0 + 20, 'hrdina se hýbe (' + x0 + ' -> ' + GAME.hero.x.toFixed(1) + ')');
    check(GAME.shots.length > 0, 'hrdina střílí');
    Z.input.release('right'); Z.input.release('fire');
    // hladovění: zdraví klesne
    const hp0 = GAME.hero.hp; g.step(100);
    check(GAME.hero.hp < hp0, 'zdraví ubývá časem');
    // pauza
    Z.input.press('pause'); g.step(2); Z.input.release('pause');
    const tk = Z.tickCount; g.step(20);
    check(Z.tickCount === tk, 'pauza zastaví hru');
    Z.input.press('pause'); g.step(2); Z.input.release('pause');
    // smrt
    GAME.hero.hp = 1; g.step(60);
    check(GAME.state === 'dying', 'zdraví 0 -> dying');
    g.step(110);
    check(GAME.state === 'over', 'dying -> over');
    check(GAME.hi >= 0, 'rekord vypočten');
    g.step(80); Z.input.press('fire'); g.step(2); Z.input.release('fire');
    check(GAME.state === 'title', 'over -> title');
    check(!g.hasNaN({ h: GAME.hero, e: GAME.enemies, c: GAME.cam }), 'žádné NaN');
}

// ---------- 2) bot: dokončí úrovně
{
    const { g, GAME, Z } = boot();
    const bot = makeBot(g, GAME);
    GAME.sel = 3; // valkýra
    let cleared = 0, maxLvl = 1, ticks = 0, over = false, prevLvl = 1, nanBad = false;
    GAME.noDraw = true;
    const limit = 18 * 12000;
    while (ticks < limit) {
        bot(); g.step(1); ticks++;
        if (GAME.lvl !== prevLvl) { cleared++; prevLvl = GAME.lvl; maxLvl = Math.max(maxLvl, GAME.lvl); }
        if (ticks % 500 === 0 && GAME.hero && g.hasNaN({ h: GAME.hero, e: GAME.enemies })) { nanBad = true; break; }
        if (GAME.state === 'over') { over = true; break; }
    }
    check(!nanBad, 'bot: žádné NaN');
    check(maxLvl >= 2, 'bot dokončil úroveň 1 (dosáhl úrovně ' + maxLvl + ', ' + ticks + ' ticků)');
    console.log('  bot: úrovní dokončeno ' + (GAME.won ? 18 : maxLvl - 1) + ', skóre ' + GAME.score + ', stav ' + GAME.state + ', zdraví ' + (GAME.hero && GAME.hero.hp) + (GAME.won ? ' VÍTĚZSTVÍ' : ''));
    GAME.noDraw = false;
}

// ---------- 3) každá úroveň: start hrdiny není ve zdi, počáteční snímky bez chyb a vykreslení
{
    const { g, GAME } = boot();
    let okAll = true;
    for (let n = 1; n <= 18; n++) {
        GAME.sel = n % 4; GAME.newGame(n % 4); GAME.startLevel(n);
        const L = GAME.L, h = GAME.hero;
        if (L.t[Math.floor(h.y / T) * L.w + Math.floor(h.x / T)] !== '.') { okAll = false; console.log('start není na podlaze v úrovni ' + n); }
        g.step(130 + 100);
        if (g.hasNaN({ h: GAME.hero, e: GAME.enemies })) { okAll = false; console.log('NaN v úrovni ' + n); }
    }
    check(okAll, 'všech 18 úrovní se spustí, vykreslí a nemají NaN');
}
// ---------- 4) skutečný průchod každé úrovně enginem (bot s nesmrtelným zdravím): východ se musí dát dosáhnout
{
    const { g, GAME } = boot();
    const bot = makeBot(g, GAME, false);
    GAME.noDraw = true;
    let allOk = true;
    for (let n = 1; n <= 18; n++) {
        GAME.newGame(n % 4);
        GAME.startLevel(n);
        let ticks = 0, done = false;
        while (ticks < 20000) {
            bot(); if (GAME.hero) { GAME.hero.hp = 999; } g.step(1); ticks++;
            if (GAME.state === 'clear') { done = true; break; }
        }
        console.log('  úroveň ' + n + ': ' + (done ? 'východ dosažen za ' + ticks + ' ticků' : 'NEDOKONČENO'));
        if (!done) { allOk = false; }
        g.Z.input.clear();
    }
    check(allOk, 'bot v enginu dosáhl východu ve všech 18 úrovních');
}
console.log(fails ? 'SELHÁNÍ: ' + fails : 'VŠE PROŠLO');
process.exit(fails ? 1 : 0);
