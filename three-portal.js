/* =====================================================================
   REALITY STUDIO — three-portal.js
   Motor de partículas WebGL reutilizable (Three.js), sin lógica propia
   de UI. Usado en dos lugares:

   1) Fondo ambiental de la sección "Experimenta la RA" (#experiencia-ra)
      → campo de estrellas + fragmentos geométricos de marca, con
        progreso controlado por el stepper de pasos (ver script.js).

   2) Modal "Así se vería tu marca en 3D" (#software) → modo "showcase":
      partículas doradas circulares en órbita, sobre una imagen de fondo
      a pantalla completa que sube el cliente, con un <model-viewer>
      superpuesto en HTML en el centro.

   NOTA DE ARQUITECTURA (jul-2026): el antiguo modo puerta→salón (portal
   SVG + transición a "hall") fue retirado por completo del sitio. Este
   archivo ya NO controla ningún flujo de puerta; solo anima partículas.
   ===================================================================== */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

/**
 * Genera una textura circular suave en un <canvas> para que
 * THREE.PointsMaterial dibuje puntos redondos en vez de cuadrados.
 * @param {string} hexColor - color CSS del núcleo del punto (ej. '#f9d779')
 */
function makeCircleTexture(hexColor = '#f9d779') {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.35, hexColor);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * @param {Object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {boolean} [opts.isMobile]
 * @param {boolean} [opts.showcaseMode] - true: modo "modal 3D" (partículas
 *   doradas circulares en órbita fija, sin campo de estrellas ni scroll-scrub).
 *   false (default): modo "fondo ambiental" de la sección Experimenta la RA.
 * @returns {{ setProgress, setActive, setPointer, resize, destroy }}
 */
export function createPortalScene({ canvas, isMobile = false, showcaseMode = false }) {
  const BRAND_COLORS = [0x23ced9, 0x097c87, 0xf9d779, 0xfca47c, 0xa1cca6];

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);

  const START_Z = 60;
  const END_Z = -170;
  camera.position.set(0, 0, showcaseMode ? 22 : START_Z);

  const circleTex = makeCircleTexture('#f9d779');

  /* ---------------- Campo de estrellas (solo modo ambiental) ---------------- */
  let stars = null;
  let starGeometry = null;
  let starMaterial = null;
  if (!showcaseMode) {
    const STAR_COUNT = isMobile ? 260 : 620;
    starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 140;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 90;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 260 - 40;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starMaterial = new THREE.PointsMaterial({
      color: 0xf6f1e7,
      size: 1.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: circleTex,
    });
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  /* ---------------- Fragmentos de marca (solo modo ambiental) ---------------- */
  const shards = [];
  let shardGroup = null;
  if (!showcaseMode) {
    const SHARD_COUNT = isMobile ? 7 : 13;
    shardGroup = new THREE.Group();
    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const size = 1.6 + Math.random() * 2.6;
      const geometry =
        i % 2 === 0
          ? new THREE.IcosahedronGeometry(size, 0)
          : new THREE.OctahedronGeometry(size, 0);
      const material = new THREE.MeshBasicMaterial({
        color: BRAND_COLORS[i % BRAND_COLORS.length],
        transparent: true,
        opacity: 0.82,
        wireframe: Math.random() > 0.65,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 70,
        (Math.random() - 0.5) * 44,
        (Math.random() - 0.5) * 220 - 30
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      shardGroup.add(mesh);
      shards.push({
        mesh,
        spin: {
          x: (Math.random() - 0.5) * 0.006,
          y: (Math.random() - 0.5) * 0.006,
        },
      });
    }
    scene.add(shardGroup);
  }

  /* ---------------- Partículas doradas (ambos modos) ----------------
     Se conserva intacta la física ya validada: vórtice alrededor del
     puntero + retorno elástico a la posición base + amortiguación.
     Único cambio: ahora usan una textura circular (map) en vez de
     dibujarse como cuadrados por defecto de PointsMaterial. */
  const HALL_COUNT = isMobile ? 220 : 460;
  const hallBase = new Float32Array(HALL_COUNT * 3);
  const hallPos = new Float32Array(HALL_COUNT * 3);
  const hallVel = new Float32Array(HALL_COUNT * 3);
  for (let i = 0; i < HALL_COUNT; i += 1) {
    const radius = 5 + Math.random() * 15;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 18;
    const x = Math.cos(angle) * radius;
    const y = height;
    const z = Math.sin(angle) * radius - 25;
    hallBase[i * 3] = x; hallBase[i * 3 + 1] = y; hallBase[i * 3 + 2] = z;
    hallPos[i * 3] = x; hallPos[i * 3 + 1] = y; hallPos[i * 3 + 2] = z;
  }
  const hallGeometry = new THREE.BufferGeometry();
  hallGeometry.setAttribute('position', new THREE.BufferAttribute(hallPos, 3));
  const hallMaterial = new THREE.PointsMaterial({
    color: 0xf9d779,
    size: showcaseMode ? 0.85 : 0.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: circleTex, // círculos reales, no cuadrados
  });
  const hallParticles = new THREE.Points(hallGeometry, hallMaterial);
  hallParticles.visible = showcaseMode; // en modo ambiental arrancan ocultas
  scene.add(hallParticles);

  /* ---------------- Estado de animación ---------------- */
  let targetProgress = 0;
  let displayProgress = 0;
  let pointer = { x: 0, y: 0 };
  let active = false;
  let rafId = null;

  function setProgress(p) {
    targetProgress = Math.min(Math.max(p, 0), 1);
  }

  function setPointer(x, y) {
    pointer.x = x;
    pointer.y = y;
  }

  function updateHallParticles(dt) {
    const px = pointer.x * 16;
    const py = pointer.y * -10;

    for (let i = 0; i < HALL_COUNT; i += 1) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      const dx = hallPos[ix] - px;
      const dy = hallPos[iy] - py;
      const dist = Math.hypot(dx, dy) + 0.0001;

      if (dist < 9) {
        const swirl = (9 - dist) * 1.4 * dt;
        hallVel[ix] += (-dy / dist) * swirl;
        hallVel[iy] += (dx / dist) * swirl;
      }

      hallVel[ix] += (hallBase[ix] - hallPos[ix]) * 0.12 * dt;
      hallVel[iy] += (hallBase[iy] - hallPos[iy]) * 0.12 * dt;
      hallVel[iz] += (hallBase[iz] - hallPos[iz]) * 0.12 * dt;

      const damping = 1 - Math.min(3.2 * dt, 0.9);
      hallVel[ix] *= damping;
      hallVel[iy] *= damping;
      hallVel[iz] *= damping;

      hallPos[ix] += hallVel[ix];
      hallPos[iy] += hallVel[iy];
      hallPos[iz] += hallVel[iz];
    }

    hallGeometry.attributes.position.needsUpdate = true;
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let lastTickTime = 0;
  function tick(time) {
    const dt = lastTickTime ? Math.min((time - lastTickTime) / 1000, 0.05) : 0.016;
    lastTickTime = time;

    if (showcaseMode) {
      // Cámara fija encuadrando el centro (donde vive el <model-viewer>
      // superpuesto en HTML), con leve parallax hacia el puntero.
      camera.position.x += (pointer.x * 3 - camera.position.x) * 0.05;
      camera.position.y += (2 + pointer.y * -1.5 - camera.position.y) * 0.05;
      camera.position.z += (22 - camera.position.z) * 0.05;
      camera.lookAt(0, 0, -25);
      updateHallParticles(dt);
    } else {
      displayProgress += (targetProgress - displayProgress) * 0.07;

      camera.position.z = THREE.MathUtils.lerp(START_Z, END_Z, displayProgress);
      camera.position.x = pointer.x * 4 + Math.sin(displayProgress * Math.PI) * 1.5;
      camera.position.y = pointer.y * -3;
      camera.lookAt(0, 0, camera.position.z - 40);

      const speedBoost = 1 + displayProgress * 3.2;
      shards.forEach(({ mesh, spin }) => {
        mesh.rotation.x += spin.x * speedBoost;
        mesh.rotation.y += spin.y * speedBoost;
      });

      if (stars) stars.rotation.y += 0.00025 + displayProgress * 0.0009;
    }

    renderer.render(scene, camera);
    if (active) rafId = window.requestAnimationFrame(tick);
  }

  function setActive(next) {
    if (next === active) return;
    active = next;
    if (active) {
      resize();
      lastTickTime = 0;
      rafId = window.requestAnimationFrame(tick);
    } else if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function destroy() {
    setActive(false);
    if (starGeometry) starGeometry.dispose();
    if (starMaterial) starMaterial.dispose();
    hallGeometry.dispose();
    hallMaterial.dispose();
    circleTex.dispose();
    shards.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    renderer.dispose();
  }

  resize();

  return { setProgress, setActive, setPointer, resize, destroy };
}