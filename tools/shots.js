// Screenshoty: titulní obrazovka, výběr hrdiny, herní obrazovky.
const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const base = __dirname + '/../js/';
const out = process.argv[2] || '/tmp';
const g = H.load([base + 'speccy.js', base + 'levels.js', base + 'game.js']);
const GAME = g.sandbox.GAME;
g.step(40); g.png(out + '/title.png', 3);
g.key(32, true); g.step(2); g.key(32, false); g.step(5);
g.png(out + '/select.png', 3);
g.key(39, true); g.step(2); g.key(39, false); g.step(2);
g.key(32, true); g.step(2); g.key(32, false);
g.step(10); g.png(out + '/banner.png', 3);
g.step(120);
// ruční nastavení: popojít, vystřelit
g.key(39, true); g.step(60); g.key(32, true); g.step(40);
g.png(out + '/play1.png', 3);
g.key(39, false); g.key(32, false);
GAME.startLevel(13); g.step(130); g.step(100);
g.png(out + '/play13.png', 3);
console.log('state', GAME.state, 'level', GAME.lvl);
// vítězství: dokonči poslední úroveň
GAME.newGame(2); GAME.startLevel(18); g.step(120);
const h = GAME.hero; const L = GAME.L;
for (let i = 0; i < L.t.length; i++) { if (L.t[i] === 'E') { h.x = (i % L.w) * 16 + 8; h.y = ((i / L.w) | 0) * 16 + 8; } }
g.step(3); console.log('po východu:', GAME.state);
g.png(out + '/clear.png', 3);
g.step(160); console.log('po bonusu:', GAME.state, 'won', GAME.won);
g.png(out + '/win.png', 3);
