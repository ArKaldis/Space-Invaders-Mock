const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const restartBtn = document.getElementById("restart");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const keys = new Set();

const state = {
  score: 0,
  lives: 3,
  wave: 1,
  gameOver: false,
  victory: false,
  flash: 0,
};

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 74,
  width: 38,
  height: 24,
  speedX: 0,
  maxSpeed: 380,
  friction: 0.88,
  cooldown: 0,
  dashCooldown: 0,
  invulnerable: 0,
};

let bullets = [];
let enemyBullets = [];
let invaders = [];
let asteroids = [];
let particles = [];
let lastTime = 0;
let enemyFireTimer = 0;
let asteroidTimer = 0;

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.wave = 1;
  state.gameOver = false;
  state.victory = false;
  state.flash = 0;

  player.x = WIDTH / 2;
  player.y = HEIGHT - 74;
  player.speedX = 0;
  player.cooldown = 0;
  player.dashCooldown = 0;
  player.invulnerable = 0;

  bullets = [];
  enemyBullets = [];
  asteroids = [];
  particles = [];
  enemyFireTimer = 0.8;
  asteroidTimer = 1.4;

  spawnWave();
  updateHud();
}

function spawnWave() {
  invaders = [];
  const rows = Math.min(3 + state.wave, 6);
  const cols = 8;
  const startX = 150;
  const startY = 90;
  const spacingX = 78;
  const spacingY = 58;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      invaders.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        width: 32,
        height: 22,
        alive: true,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }
}

function nextWave() {
  state.wave += 1;
  state.flash = 1;
  bullets = [];
  enemyBullets = [];
  asteroids = [];
  spawnWave();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  waveEl.textContent = state.wave;
}

function spawnBullet(x, y, velocityY) {
  bullets.push({ x, y, radius: 4, velocityY });
}

function spawnEnemyBullet(x, y, velocityY) {
  enemyBullets.push({ x, y, radius: 4, velocityY });
}

function spawnAsteroid() {
  const size = 18 + Math.random() * 34;
  asteroids.push({
    x: Math.random() * (WIDTH - size * 2) + size,
    y: -size - 40,
    radius: size,
    speedY: 90 + Math.random() * 120 + state.wave * 12,
    speedX: (Math.random() - 0.5) * 85,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.2,
  });
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      life: 0.4 + Math.random() * 0.5,
      color,
      velocityX: (Math.random() - 0.5) * 220,
      velocityY: (Math.random() - 0.5) * 220,
      size: 2 + Math.random() * 4,
    });
  }
}

function hitPlayer() {
  if (player.invulnerable > 0 || state.gameOver) {
    return;
  }

  state.lives -= 1;
  player.invulnerable = 1.6;
  state.flash = 1;
  burst(player.x, player.y, "#ff6b6b", 20);
  updateHud();

  if (state.lives <= 0) {
    state.gameOver = true;
  }
}

function rectsOverlap(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updatePlayer(dt) {
  let input = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
    input -= 1;
  }
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
    input += 1;
  }

  player.speedX += input * 1200 * dt;
  player.speedX *= Math.pow(player.friction, dt * 60);
  player.speedX = clamp(player.speedX, -player.maxSpeed, player.maxSpeed);
  player.x += player.speedX * dt;
  player.x = clamp(player.x, 40, WIDTH - 40);

  if ((keys.has("Shift") || keys.has("ShiftLeft") || keys.has("ShiftRight")) && player.dashCooldown <= 0) {
    if (input !== 0) {
      player.x += input * 80;
      player.x = clamp(player.x, 40, WIDTH - 40);
      player.dashCooldown = 1.5;
      burst(player.x, player.y + 10, "#6de2ff", 10);
    }
  }

  if ((keys.has(" ") || keys.has("Space")) && player.cooldown <= 0) {
    spawnBullet(player.x, player.y - 18, -560);
    player.cooldown = 0.18;
  }

  player.cooldown -= dt;
  player.dashCooldown -= dt;
  player.invulnerable -= dt;
}

function updateInvaders(dt, time) {
  const living = invaders.filter((invader) => invader.alive);
  if (living.length === 0) {
    nextWave();
    return;
  }

  const shift = Math.sin(time * 0.0014) * 18;
  for (const invader of living) {
    invader.y += dt * (4 + state.wave * 1.25);
    invader.renderX = invader.x + shift + Math.sin(time * 0.003 + invader.wobble) * 10;

    if (invader.y > HEIGHT - 160) {
      state.gameOver = true;
    }
  }

  enemyFireTimer -= dt;
  if (enemyFireTimer <= 0) {
    const shooter = living[Math.floor(Math.random() * living.length)];
    spawnEnemyBullet(shooter.renderX, shooter.y + 16, 260 + state.wave * 18);
    enemyFireTimer = Math.max(0.4, 1.2 - state.wave * 0.05);
  }
}

function updateProjectiles(dt) {
  bullets = bullets.filter((bullet) => {
    bullet.y += bullet.velocityY * dt;

    for (const invader of invaders) {
      if (!invader.alive) {
        continue;
      }

      const target = {
        x: invader.renderX ?? invader.x,
        y: invader.y,
        width: invader.width,
        height: invader.height,
      };

      if (rectsOverlap(
        { x: bullet.x, y: bullet.y, width: bullet.radius * 2, height: bullet.radius * 2 },
        target
      )) {
        invader.alive = false;
        state.score += 100;
        burst(target.x, target.y, "#ffd166", 12);
        updateHud();
        return false;
      }
    }

    for (const asteroid of asteroids) {
      const dx = bullet.x - asteroid.x;
      const dy = bullet.y - asteroid.y;
      if (Math.hypot(dx, dy) < asteroid.radius + bullet.radius) {
        asteroid.hit = true;
        state.score += 25;
        burst(asteroid.x, asteroid.y, "#6de2ff", 8);
        updateHud();
        return false;
      }
    }

    return bullet.y > -30;
  });

  enemyBullets = enemyBullets.filter((bullet) => {
    bullet.y += bullet.velocityY * dt;

    if (rectsOverlap(
      { x: bullet.x, y: bullet.y, width: bullet.radius * 2, height: bullet.radius * 2 },
      player
    )) {
      hitPlayer();
      return false;
    }

    return bullet.y < HEIGHT + 40;
  });
}

function updateAsteroids(dt) {
  asteroidTimer -= dt;
  if (asteroidTimer <= 0) {
    spawnAsteroid();
    asteroidTimer = Math.max(0.45, 1.6 - state.wave * 0.08);
  }

  asteroids = asteroids.filter((asteroid) => {
    asteroid.x += asteroid.speedX * dt;
    asteroid.y += asteroid.speedY * dt;
    asteroid.angle += asteroid.spin * dt;

    if (Math.hypot(player.x - asteroid.x, player.y - asteroid.y) < asteroid.radius + 18) {
      hitPlayer();
      asteroid.hit = true;
    }

    return !asteroid.hit && asteroid.y < HEIGHT + asteroid.radius + 20;
  });
}

function updateParticles(dt) {
  particles = particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.velocityX * dt;
    particle.y += particle.velocityY * dt;
    particle.velocityX *= 0.98;
    particle.velocityY *= 0.98;
    return particle.life > 0;
  });
}

function update(dt, time) {
  if (state.gameOver) {
    updateParticles(dt);
    return;
  }

  state.flash = Math.max(0, state.flash - dt * 1.8);
  updatePlayer(dt);
  updateInvaders(dt, time);
  updateProjectiles(dt);
  updateAsteroids(dt);
  updateParticles(dt);
}

function drawBackground(time) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#081426");
  gradient.addColorStop(1, "#020814");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 70; i += 1) {
    const x = (i * 139) % WIDTH;
    const y = ((i * 97) + time * 0.02) % HEIGHT;
    const alpha = 0.25 + ((i % 5) * 0.08);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.12})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  ctx.fillStyle = "#6de2ff";
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(18, 12);
  ctx.lineTo(6, 8);
  ctx.lineTo(0, 18);
  ctx.lineTo(-6, 8);
  ctx.lineTo(-18, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffd166";
  ctx.fillRect(-4, 2, 8, 10);
  ctx.restore();
}

function drawInvaders(time) {
  for (const invader of invaders) {
    if (!invader.alive) {
      continue;
    }

    const x = invader.renderX ?? invader.x;
    const pulse = Math.sin(time * 0.008 + invader.wobble) * 3;
    ctx.save();
    ctx.translate(x, invader.y);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(-16, -10, 32, 20);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-12, -6, 6, 6);
    ctx.fillRect(6, -6, 6, 6);
    ctx.fillRect(-10, 10, 4, 8 + pulse);
    ctx.fillRect(6, 10, 4, 8 - pulse);
    ctx.restore();
  }
}

function drawAsteroids() {
  ctx.strokeStyle = "#99a8b6";
  ctx.lineWidth = 2;
  for (const asteroid of asteroids) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7;
      const radius = asteroid.radius * (0.72 + ((i % 2) * 0.18));
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawProjectiles() {
  ctx.fillStyle = "#6de2ff";
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ff6b6b";
  for (const bullet of enemyBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  if (!state.gameOver) {
    return;
  }

  ctx.fillStyle = "rgba(2, 8, 20, 0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#eef7ff";
  ctx.textAlign = "center";
  ctx.font = "900 46px Orbitron";
  ctx.fillText("Mission Lost", WIDTH / 2, HEIGHT / 2 - 20);

  ctx.font = "500 20px Orbitron";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`Final Score ${state.score}`, WIDTH / 2, HEIGHT / 2 + 20);

  ctx.fillStyle = "#eef7ff";
  ctx.fillText("Press Restart Mission to jump back in", WIDTH / 2, HEIGHT / 2 + 62);
}

function render(time) {
  drawBackground(time);
  drawInvaders(time);
  drawAsteroids();
  drawProjectiles();
  drawPlayer();
  drawParticles();
  drawOverlay();
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;

  update(dt, time);
  render(time);
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (["ArrowLeft", "ArrowRight", " ", "Space", "Shift"].includes(event.key)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

restartBtn.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
