/* =====================================================================
   REALITY STUDIO — arcade-game.js
   Mini-juego arcade original ("defiende tu marca") para demostrar el
   servicio de gamificación de marca. Canvas 2D, sin dependencias.

   No es un clon de Space Invaders (nombre y sprites son marca registrada
   de Taito): mismo género de juego, estética e identidad propias.

   Cargado de forma diferida desde script.js → initArcadeGame() solo
   cuando la sección se acerca al viewport.
   ===================================================================== */

const WIDTH = 640;
const HEIGHT = 420;
const TOTAL_WAVES = 3;

const BRAND_COLORS = ['#23ced9', '#f9d779', '#fca47c', '#a1cca6', '#097c87'];
const ENEMY_LABELS = ['SPAM', 'BANNER', 'POP-UP', 'CLICKBAIT', 'ADS FALSA', 'COPY IA'];

/**
 * @param {Object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {(score:number, lives:number, wave:number)=>void} opts.onScoreChange
 * @param {(finalScore:number, won:boolean)=>void} opts.onGameOver
 * @param {()=>void} [opts.onShoot] - hook opcional de audio, llamado al disparar
 * @param {()=>void} [opts.onHit] - hook opcional de audio, llamado al impactar (enemigo o jugador)
 */
export function createArcadeGame({ canvas, onScoreChange, onGameOver, onShoot, onHit }) {
  const ctx = canvas.getContext('2d');

  const player = { x: WIDTH / 2 - 26, y: HEIGHT - 34, w: 52, h: 16, speed: 320 };
  let moveDir = 0;
  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let score = 0;
  let lives = 3;
  let wave = 1;
  let running = false;
  let rafId = null;
  let lastTime = 0;
  let shootCooldown = 0;
  let groupDir = 1;
  let groupSpeed = 40; // px/seg

  function buildWave(waveNumber) {
    const cols = 6;
    const rows = 3;
    const cellW = 92;
    const cellH = 40;
    const startX = (WIDTH - cols * cellW) / 2 + cellW / 2;
    const startY = 56;
    const list = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        list.push({
          x: startX + col * cellW,
          y: startY + row * cellH,
          w: 76,
          h: 26,
          alive: true,
          label: ENEMY_LABELS[(row * cols + col) % ENEMY_LABELS.length],
          color: BRAND_COLORS[(row + col) % BRAND_COLORS.length],
        });
      }
    }
    groupSpeed = 40 + waveNumber * 18;
    return list;
  }

  function reset() {
    player.x = WIDTH / 2 - player.w / 2;
    bullets = [];
    enemyBullets = [];
    score = 0;
    lives = 3;
    wave = 1;
    groupDir = 1;
    enemies = buildWave(wave);
    if (onScoreChange) onScoreChange(score, lives, wave);
  }

  function setMove(dir) {
    moveDir = dir;
  }

  function shoot() {
    if (!running || shootCooldown > 0) return;
    bullets.push({ x: player.x + player.w / 2 - 2, y: player.y - 10, w: 4, h: 12 });
    shootCooldown = 0.28;
    if (onShoot) onShoot();
  }

  function aabbHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Los enemigos guardan (x, y) como su CENTRO (así los coloca buildWave y
  // así los dibuja draw()). aabbHit espera cajas en esquina superior
  // izquierda, así que convertimos antes de comparar. Este es el fix del
  // bug reportado: "el proyectil elimina bloques sin tocarlos" — antes la
  // hitbox real quedaba desplazada media anchura/altura respecto al sprite.
  function enemyBox(e) {
    return { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
  }

  function endGame(won) {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (onGameOver) onGameOver(score, won);
  }

  function update(dt) {
    // Jugador
    player.x += moveDir * player.speed * dt;
    player.x = Math.max(4, Math.min(WIDTH - player.w - 4, player.x));
    if (shootCooldown > 0) shootCooldown -= dt;

    // Balas del jugador
    bullets.forEach((b) => { b.y -= 480 * dt; });
    bullets = bullets.filter((b) => b.y + b.h > 0);

    // Balas enemigas
    enemyBullets.forEach((b) => { b.y += 220 * dt; });
    enemyBullets = enemyBullets.filter((b) => b.y < HEIGHT);

    // Formación enemiga: se mueve lateral y rebota
    const aliveEnemies = enemies.filter((e) => e.alive);
    let hitEdge = false;
    aliveEnemies.forEach((e) => {
      e.x += groupDir * groupSpeed * dt;
      if (e.x < 30 || e.x > WIDTH - 30) hitEdge = true;
    });
    if (hitEdge) {
      groupDir *= -1;
      aliveEnemies.forEach((e) => { e.y += 14; });
    }

    // Disparo enemigo aleatorio — sale del centro-abajo del atacante real
    if (aliveEnemies.length && Math.random() < 0.012 + wave * 0.004) {
      const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      enemyBullets.push({ x: shooter.x - 2, y: shooter.y + shooter.h / 2, w: 4, h: 10 });
    }

    // Colisiones: balas del jugador vs enemigos (hitbox real, no desplazada)
    bullets.forEach((b) => {
      aliveEnemies.forEach((e) => {
        if (e.alive && aabbHit(b, enemyBox(e))) {
          e.alive = false;
          b.hit = true;
          score += 10;
          if (onScoreChange) onScoreChange(score, lives, wave);
          if (onHit) onHit();
        }
      });
    });
    bullets = bullets.filter((b) => !b.hit);

    // Colisiones: balas enemigas vs jugador
    enemyBullets.forEach((b) => {
      if (aabbHit(b, player)) {
        b.hit = true;
        lives -= 1;
        if (onScoreChange) onScoreChange(score, lives, wave);
        if (onHit) onHit();
        if (lives <= 0) endGame(false);
      }
    });
    enemyBullets = enemyBullets.filter((b) => !b.hit);

    // ¿Enemigos llegaron muy abajo? pierde una vida y se reinicia oleada
    if (aliveEnemies.some((e) => e.y + e.h / 2 > player.y)) {
      lives = 0;
      if (onScoreChange) onScoreChange(score, lives, wave);
      endGame(false);
    }

    // ¿Oleada limpia?
    if (running && aliveEnemies.length === 0) {
      wave += 1;
      if (wave > TOTAL_WAVES) {
        endGame(true);
      } else {
        enemies = buildWave(wave);
        if (onScoreChange) onScoreChange(score, lives, wave);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Jugador (nave "RS")
    ctx.fillStyle = '#23ced9';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#06211f';
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RS', player.x + player.w / 2, player.y + player.h / 2 + 4);

    // Balas del jugador
    ctx.fillStyle = '#f9d779';
    bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

    // Balas enemigas
    ctx.fillStyle = '#fca47c';
    enemyBullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

    // Enemigos
    ctx.font = '8px "Space Mono", monospace';
    enemies.forEach((e) => {
      if (!e.alive) return;
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      ctx.fillStyle = '#06211f';
      ctx.fillText(e.label, e.x, e.y + 3);
    });
  }

  function loop(time) {
    if (!running) return;
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    reset();
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  return { start, stop, setMove, shoot };
}