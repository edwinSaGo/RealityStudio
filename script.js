/* =====================================================================
   REALITY STUDIO — script.js
   Vanilla JS, sin dependencias externas.
   ===================================================================== */

(() => {
  'use strict';

  /* -------------------------------------------------------------------
     0. CONFIG — 🔧 EDITA AQUÍ tus valores reales antes de publicar
     ------------------------------------------------------------------- */
  const CONFIG = {
    // Número de WhatsApp Business en formato internacional sin "+" ni espacios
    whatsappNumber: '573173020116',
    whatsappMessage: 'Hola Reality Studio, quiero cotizar un proyecto',

    // Endpoint del formulario de leads. Ejemplos válidos:
    //  - Formspree:  'https://formspree.io/f/TU_ID'
    //  - Webhook propio / Google Apps Script / Zapier, etc.
    // Déjalo en null para simular el envío sin backend (modo demo).
    formEndpoint: null,

    // IDs de medición — actívalos cuando los tengas (ver INSTRUCCIONES.md)
    ga4Id: null,        // 'G-XXXXXXXXXX'
    clarityId: null,    // 'xxxxxxxxxx'

    // Duración mínima del preloader (ms) para que la animación se aprecie
    preloaderMinDuration: 2200,

    // Cantidad de partículas doradas orbitando el logo
    goldParticleCount: 14,

    // Cantidad de estrellas en el fondo de la sección "Experimenta la RA"
    starCount: 90,
  };

  /* -------------------------------------------------------------------
     1. PRELOADER DISRUPTIVO
     ------------------------------------------------------------------- */
  const WORDS = ['CREAR', 'INNOVAR', 'SORPRENDER', 'CONVERTIR', 'DISRUPCIÓN'];
  const CODES = ['SYS_INIT_RA_99', '01000011', 'CORE_LOAD_TRUE', 'RENDER::OK', 'AR_MODULE_READY', '0x4F2A9C', 'BOOT_WEBGL', '11010010'];

  function initPreloader() {
    const preloader = document.getElementById('preloader');
    const wordEl = document.getElementById('preloaderWord');
    if (!preloader || !wordEl) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let tick = 0;
    let intervalId = null;

    const cycle = () => {
      const isCodeFrame = tick % 3 === 2; // 2 palabras humanas por 1 fragmento de código
      const pool = isCodeFrame ? CODES : WORDS;
      const word = pool[Math.floor(Math.random() * pool.length)];
      wordEl.textContent = word;
      wordEl.dataset.mode = isCodeFrame ? 'code' : 'word';
      tick += 1;
    };

    if (prefersReducedMotion) {
      wordEl.textContent = 'REALITY STUDIO';
    } else {
      intervalId = window.setInterval(cycle, 90);
    }

    const finishPreloading = () => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(CONFIG.preloaderMinDuration - elapsed, 0);
      window.setTimeout(() => {
        if (intervalId) window.clearInterval(intervalId);
        preloader.classList.add('is-hidden');
        document.body.classList.remove('is-locked');

        // Respuesta háptica al revelar el sitio (solo dispositivos compatibles)
        if ('vibrate' in navigator) {
          try { navigator.vibrate([100, 50, 100]); } catch (_) { /* silencioso */ }
        }

        preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
      }, remaining);
    };

    if (document.readyState === 'complete') {
      finishPreloading();
    } else {
      window.addEventListener('load', finishPreloading, { once: true });
    }
  }

  /* -------------------------------------------------------------------
     2. NAVEGACIÓN — ocultar al bajar, mostrar al subir + link activo
     ------------------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById('siteNav');
    if (!nav) return;
    let lastY = window.scrollY;

    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      if (currentY > lastY && currentY > 120) {
        nav.classList.add('nav--hidden');
      } else {
        nav.classList.remove('nav--hidden');
      }
      lastY = currentY;
    }, { passive: true });

    // Scroll vertical nativo del navegador: no necesitamos calcular ejes,
    // scrollIntoView normal es suficiente y funciona igual en cualquier
    // dispositivo, sin dejar a nadie "atrapado" en una sección.
    document.querySelectorAll('[data-nav-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* -------------------------------------------------------------------
     2.5 INDICADOR DE SECCIÓN ACTIVA — resalta el link del nav correspondiente
     ------------------------------------------------------------------- */
  function initActiveNavLink() {
    const links = Array.from(document.querySelectorAll('[data-nav-link][href^="#"]'));
    if (!links.length) return;

    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);
    if (!sections.length) return;

    const linkFor = (id) => links.find((link) => link.getAttribute('href') === `#${id}`);

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = linkFor(entry.target.id);
        if (!link) return;
        link.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }

  /* -------------------------------------------------------------------
     3. PROGRESO DE SCROLL — barra vertical de avance de página
     ------------------------------------------------------------------- */
  function initScrollProgress() {
    const progressBar = document.getElementById('scrollProgressBar');
    if (!progressBar) return;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progressBar.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* -------------------------------------------------------------------
     4. REVEAL ON SCROLL — IntersectionObserver
     ------------------------------------------------------------------- */
  function initReveals() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    items.forEach((el) => observer.observe(el));
  }

  /* -------------------------------------------------------------------
     5. STARFIELD — campo de estrellas titilantes (CSS-driven, sin canvas)
     ------------------------------------------------------------------- */
  function initStarfield() {
    const field = document.getElementById('starfield');
    if (!field) return;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < CONFIG.starCount; i += 1) {
      const star = document.createElement('span');
      const size = (Math.random() * 2 + 1).toFixed(2);
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.animationDelay = `${(Math.random() * 3.4).toFixed(2)}s`;
      fragment.appendChild(star);
    }
    field.appendChild(fragment);
  }

  /* -------------------------------------------------------------------
     6. LOGO 3D + PARTÍCULAS DE ORO — órbitas elípticas reactivas
     ------------------------------------------------------------------- */
  function initGoldOrbit() {
    const orbit = document.getElementById('logoOrbit');
    const logo = document.getElementById('logo3d');
    if (!orbit || !logo) return null;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particles = [];
    for (let i = 0; i < CONFIG.goldParticleCount; i += 1) {
      const el = document.createElement('span');
      el.className = 'gold-particle';
      orbit.appendChild(el);
      particles.push({
        el,
        radiusX: 90 + Math.random() * 70,
        radiusY: 30 + Math.random() * 40,
        speed: 0.4 + Math.random() * 0.6,
        offset: Math.random() * Math.PI * 2,
        depthPhase: Math.random() * Math.PI * 2,
      });
    }

    let pointer = { x: 0, y: 0 }; // -1..1, relativo al centro de la órbita
    let frozen = false;

    orbit.addEventListener('pointermove', (event) => {
      const rect = orbit.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    orbit.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });

    // Giroscopio en móviles (si el usuario concede permiso implícitamente)
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (event) => {
        if (event.gamma == null || event.beta == null) return;
        pointer.x = Math.max(-1, Math.min(1, event.gamma / 45));
        pointer.y = Math.max(-1, Math.min(1, (event.beta - 45) / 45));
      });
    }

    let t = 0;
    function animate() {
      if (!frozen) {
        t += 0.016;
        particles.forEach((p) => {
          const angle = t * p.speed + p.offset;
          const wobbleX = pointer.x * 18;
          const wobbleY = pointer.y * 18;
          const x = Math.cos(angle) * p.radiusX + wobbleX;
          const y = Math.sin(angle) * p.radiusY * 0.6 + Math.sin(angle * 2 + p.depthPhase) * 6 + wobbleY;
          const scale = 0.6 + (Math.sin(angle) + 1) * 0.35; // simula profundidad 3D
          const z = Math.sin(angle);
          p.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
          p.el.style.opacity = String(0.5 + z * 0.4);
          p.el.style.zIndex = z > 0 ? '3' : '1';
        });
      }
      if (!prefersReducedMotion) window.requestAnimationFrame(animate);
    }

    if (prefersReducedMotion) {
      particles.forEach((p, i) => {
        p.el.style.transform = `translate(-50%, -50%) translate(${Math.cos(i) * p.radiusX}px, ${Math.sin(i) * p.radiusY}px)`;
      });
    } else {
      window.requestAnimationFrame(animate);
    }

    // initPortalHall() usa esto para congelar la órbita y encoger el logo
    // en el momento exacto en que el usuario cruza hacia el salón.
    return {
      setPortalActive(active) {
        frozen = active;
        logo.classList.toggle('is-portal-active', active);
      },
    };
  }

  /* -------------------------------------------------------------------
     6.5. PORTAL 3D — escena WebGL con scroll-scrub (carga diferida)
     ------------------------------------------------------------------- */
  function initPortalScene(onSceneReady) {
    const section = document.getElementById('experiencia-ra');
    const canvas = document.getElementById('portalCanvas');
    if (!section || !canvas) return;

    // Respeta accesibilidad y dispositivos de gama baja: se queda con el
    // starfield CSS estático que ya existe como fallback.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const supportsWebGL = (() => {
      try {
        const probe = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
          (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
      } catch (_) {
        return false;
      }
    })();
    if (!supportsWebGL) return;

    const isDesktop = () => window.matchMedia('(min-width: 769px)').matches;

    let scene = null;
    let loadStarted = false;
    let ticking = false;

    // El progreso de la escena 3D ahora se calcula siempre a partir del
    // scroll vertical (antes había una rama separada para desktop basada en
    // scroll horizontal — ya no existe ese eje, así que un solo cálculo
    // sirve para todos los tamaños de pantalla).
    function computeProgress() {
      if (!scene) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const progress = (vh - rect.top) / (vh + rect.height);
      scene.setProgress(Math.min(Math.max(progress, 0), 1));
    }

    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        computeProgress();
        ticking = false;
      });
    }

    function loadScene() {
      if (loadStarted) return;
      loadStarted = true;
      import('./three-portal.js')
        .then(({ createPortalScene }) => {
          scene = createPortalScene({ canvas, isMobile: !isDesktop() });
          section.classList.add('is-webgl-active');
          computeProgress();

          window.addEventListener('scroll', onScrollOrResize, { passive: true });
          window.addEventListener('resize', onScrollOrResize);

          const orbit = document.getElementById('logoOrbit');
          if (orbit) {
            orbit.addEventListener('pointermove', (event) => {
              const rect = orbit.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
              const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
              scene.setPointer(x, y);
            });
          }

          let isSectionVisible = false;
          const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              isSectionVisible = entry.isIntersecting;
              scene.setActive(isSectionVisible && !document.hidden);
            });
          }, { threshold: 0.05 });
          visibilityObserver.observe(section);

          document.addEventListener('visibilitychange', () => {
            scene.setActive(isSectionVisible && !document.hidden);
          });

          if (typeof onSceneReady === 'function') onSceneReady(scene);
        })
        .catch((err) => {
          // Si falla la carga (CDN bloqueado, red lenta, etc.) el sitio
          // conserva el starfield CSS sin ninguna ruptura visual.
          console.warn('[Reality Studio] No se pudo cargar la escena 3D del portal:', err);
        });
    }

    // Precarga la escena con antelación (aprox. un panel antes) para que
    // esté lista sin jank cuando el usuario llegue a la sección.
    const preloadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadScene();
          preloadObserver.disconnect();
        }
      });
    }, { rootMargin: '30% 100% 30% 100%' });
    preloadObserver.observe(section);
  }

  /* -------------------------------------------------------------------
     6.6. SALÓN DEL PORTAL — puerta → gran salón con transición narrativa
     ------------------------------------------------------------------- */
  function initPortalHall(goldOrbit) {
    const section = document.getElementById('experiencia-ra');
    const frame = document.getElementById('portalFrame');
    const doorStage = document.getElementById('doorStage');
    const hallStage = document.getElementById('hallStage');
    const backBtn = document.getElementById('hallBack');
    const loader = document.getElementById('portalLoader');
    const loaderWord = document.getElementById('portalLoaderWord');
    if (!section || !frame || !doorStage || !hallStage) return null;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const HALL_WORDS = ['ABRIENDO', 'CRUZANDO_UMBRAL', 'CORE_LOAD_TRUE', 'RENDER::SALON', '0x52534F', 'BIENVENIDO'];

    let state = 'door'; // 'door' | 'transitioning' | 'hall'
    let hallScene = null;

    function runLoader(durationMs, callback) {
      if (!loader || !loaderWord || prefersReducedMotion) {
        window.setTimeout(callback, prefersReducedMotion ? 150 : 0);
        return;
      }
      loader.classList.add('is-active');
      let i = 0;
      const intervalId = window.setInterval(() => {
        loaderWord.textContent = HALL_WORDS[i % HALL_WORDS.length];
        i += 1;
      }, 100);
      window.setTimeout(() => {
        window.clearInterval(intervalId);
        loader.classList.remove('is-active');
        callback();
      }, durationMs);
    }

    function enterHall() {
      if (state !== 'door') return;
      state = 'transitioning';

      if (goldOrbit) goldOrbit.setPortalActive(true);
      if ('vibrate' in navigator) {
        try { navigator.vibrate(60); } catch (_) { /* silencioso */ }
      }

      runLoader(prefersReducedMotion ? 150 : 1100, () => {
        doorStage.hidden = true;
        hallStage.hidden = false;
        section.classList.add('is-hall');
        state = 'hall';
        if (hallScene) hallScene.setHallMode(true);
        if (backBtn) backBtn.focus();
      });
    }

    function exitHall() {
      if (state !== 'hall') return;
      state = 'door';
      hallStage.hidden = true;
      doorStage.hidden = false;
      section.classList.remove('is-hall');
      if (hallScene) hallScene.setHallMode(false);
      if (goldOrbit) goldOrbit.setPortalActive(false);
      frame.focus();
    }

    // Clic o tap (y activación por teclado, nativa de <button>): funciona
    // igual en PC y en celular. Ya NO interceptamos la rueda del mouse aquí:
    // antes "cruzar con scroll" competía con el scroll normal de la página
    // y era una de las causas de que el usuario quedara atrapado.
    frame.addEventListener('click', enterHall);

    if (backBtn) backBtn.addEventListener('click', exitHall);

    // El remolino de partículas doradas necesita su propio seguimiento de
    // puntero: #logoOrbit (usado para el paralaje en la puerta) queda oculto
    // una vez dentro del salón y deja de recibir eventos de puntero.
    section.addEventListener('pointermove', (event) => {
      if (!hallScene || state !== 'hall') return;
      const rect = section.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      hallScene.setPointer(x, y);
    });

    return {
      connectScene(scene) {
        hallScene = scene;
        if (state === 'hall') hallScene.setHallMode(true);
      },
    };
  }


  /* -------------------------------------------------------------------
     7. FORMULARIO B2B — validación + envío (con o sin backend)
     ------------------------------------------------------------------- */
  function initLeadForm() {
    const form = document.getElementById('leadForm');
    const status = document.getElementById('formStatus');
    if (!form || !status) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.dataset.state = '';
      status.textContent = '';

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('.lead-form__submit');
      submitBtn.disabled = true;
      status.textContent = 'Enviando…';

      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        if (CONFIG.formEndpoint) {
          const response = await fetch(CONFIG.formEndpoint, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error('Respuesta no exitosa del servidor');
        } else {
          // Modo demo sin backend: simula latencia de red.
          await new Promise((resolve) => window.setTimeout(resolve, 700));
          console.info('[Reality Studio] Lead capturado (modo demo, sin backend):', payload);
        }

        status.dataset.state = 'ok';
        status.textContent = '¡Gracias! Te contactaremos en menos de 24 horas hábiles.';
        form.reset();
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = 'No pudimos enviar tu mensaje. Escríbenos por WhatsApp mientras lo resolvemos.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* -------------------------------------------------------------------
     8. CTA ARCADE — botón "invasor" con esquive corto y accesible
     ------------------------------------------------------------------- */
  function initArcadeCta() {
    const wrapper = document.getElementById('arcadeCta');
    const button = document.getElementById('arcadeCtaButton');
    if (!wrapper || !button) return;

    // Arma el enlace de WhatsApp desde CONFIG (mismo patrón que antes)
    const text = encodeURIComponent(CONFIG.whatsappMessage);
    button.setAttribute('href', `https://wa.me/${CONFIG.whatsappNumber}?text=${text}`);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    // En móvil / reduced-motion: sin esquive. Grande, quieto, siempre listo
    // para tocar de inmediato — no tiene sentido "huir" donde no hay cursor.
    if (prefersReducedMotion || isTouchDevice) {
      wrapper.classList.add('arcade-cta--static');
      return;
    }

    const DODGE_RADIUS = 70;  // px — a qué distancia "siente" el cursor
    const MAX_OFFSET = 46;    // px — qué tan lejos puede esquivar (esquive corto)
    const MAX_DODGES = 2;     // se deja atrapar rápido, como pediste

    let dodgeCount = 0;
    let cooling = false;
    let idleTimer = null;

    document.addEventListener('pointermove', (event) => {
      if (cooling || dodgeCount >= MAX_DODGES) return;

      const rect = button.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist >= DODGE_RADIUS) return;

      cooling = true;
      dodgeCount += 1;

      const angle = Math.atan2(dy, dx) + Math.PI; // dirección opuesta al cursor
      const magnitude = MAX_OFFSET * (0.6 + Math.random() * 0.4);
      wrapper.style.setProperty('--arcade-x', `${(Math.cos(angle) * magnitude).toFixed(1)}px`);
      wrapper.style.setProperty('--arcade-y', `${(Math.sin(angle) * magnitude).toFixed(1)}px`);
      wrapper.classList.add('is-dodging');

      if (dodgeCount >= MAX_DODGES) {
        wrapper.classList.add('is-caught'); // deja de esquivar, invita al clic
      }

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { dodgeCount = 0; }, 4000);
      window.setTimeout(() => { cooling = false; }, 260);
    }, { passive: true });

    // El foco de teclado NUNCA dispara esquive: siempre vuelve a su posición base
    button.addEventListener('focus', () => {
      wrapper.style.setProperty('--arcade-x', '0px');
      wrapper.style.setProperty('--arcade-y', '0px');
      wrapper.classList.remove('is-dodging');
    });
  }

  /* -------------------------------------------------------------------
     8.5. SALA DE JUEGOS — lobby extensible de mini-juegos (carga bajo demanda)

     Cada juego nuevo se agrega SOLO a este arreglo: una tarjeta en
     #gameLobby con data-game-id="ese-id" activa el registro correspondiente.
     No hay que tocar el resto del lobby para sumar títulos futuros.
     ------------------------------------------------------------------- */
  const GAMES = {
    'defiende-marca': {
      title: 'Defiende tu marca',
      load: () => import('./arcade-game.js').then((m) => m.createArcadeGame),
    },
  };

  function initGameLobby() {
    const section = document.getElementById('juegos');
    const lobby = document.getElementById('gameLobby');
    const stage = document.getElementById('arcadeGame');
    const closeBtn = document.getElementById('arcadeClose');
    const canvas = document.getElementById('arcadeCanvas');
    const overlay = document.getElementById('arcadeOverlay');
    const overlayTitle = document.getElementById('arcadeOverlayTitle');
    const overlayText = document.getElementById('arcadeOverlayText');
    const playBtn = document.getElementById('arcadePlay');
    const scoreEl = document.getElementById('arcadeScore');
    const leftBtn = document.getElementById('arcadeLeft');
    const rightBtn = document.getElementById('arcadeRight');
    const shootBtn = document.getElementById('arcadeShoot');
    if (!section || !lobby || !stage || !canvas || !overlay || !playBtn) return;

    const defaultOverlayText = overlayText.textContent;
    const loadedGames = {}; // cache: no recargamos el módulo si ya se jugó
    let game = null;
    let controlsBound = false;

    function onScoreChange(score, lives, wave) {
      if (scoreEl) scoreEl.textContent = `PUNTAJE: ${score} · VIDAS: ${lives} · OLEADA ${wave}`;
    }

    function onGameOver(finalScore, won) {
      overlay.hidden = false;
      overlayTitle.textContent = won ? '¡Los venciste a todos!' : 'Fin del juego';
      overlayText.textContent =
        `Puntaje final: ${finalScore}. ¿Y si tu próxima campaña fuera así de directa? ` +
        'Escríbenos por el botón de WhatsApp.';
      playBtn.querySelector('span').textContent = 'Jugar de nuevo';
    }

    function bindControlsOnce() {
      if (controlsBound) return;
      controlsBound = true;

      playBtn.addEventListener('click', () => {
        overlay.hidden = true;
        if (game) game.start();
      });

      window.addEventListener('keydown', (event) => {
        if (!game || stage.hidden) return;
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') game.setMove(-1);
        if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') game.setMove(1);
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          game.shoot();
        }
      });

      window.addEventListener('keyup', (event) => {
        if (!game) return;
        if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) game.setMove(0);
      });

      const pressAndHold = (el, dir) => {
        if (!el) return;
        el.addEventListener('pointerdown', () => { if (game) game.setMove(dir); });
        el.addEventListener('pointerup', () => { if (game) game.setMove(0); });
        el.addEventListener('pointerleave', () => { if (game) game.setMove(0); });
      };
      pressAndHold(leftBtn, -1);
      pressAndHold(rightBtn, 1);
      if (shootBtn) shootBtn.addEventListener('click', () => { if (game) game.shoot(); });

      if (closeBtn) closeBtn.addEventListener('click', closeGame);
    }

    function closeGame() {
      if (game) game.stop();
      stage.hidden = true;
      lobby.hidden = false;
      overlay.hidden = false;
      overlayText.textContent = defaultOverlayText;
      playBtn.querySelector('span').textContent = 'Jugar';
    }

    async function openGame(gameId) {
      const entry = GAMES[gameId];
      if (!entry) return;

      bindControlsOnce();
      lobby.hidden = true;
      stage.hidden = false;
      overlay.hidden = false;
      overlayTitle.textContent = entry.title;
      overlayText.textContent = defaultOverlayText;
      playBtn.querySelector('span').textContent = 'Jugar';
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });

      try {
        if (!loadedGames[gameId]) {
          const createGame = await entry.load();
          loadedGames[gameId] = createGame;
        }
        if (game) game.stop();
        game = loadedGames[gameId]({ canvas, onScoreChange, onGameOver });
      } catch (err) {
        console.warn(`[Reality Studio] No se pudo cargar el juego "${gameId}":`, err);
        overlayText.textContent = 'El juego no pudo cargar en este momento. Escríbenos igual, hablemos de tu proyecto.';
      }
    }

    lobby.querySelectorAll('[data-game-id]').forEach((card) => {
      card.addEventListener('click', () => openGame(card.dataset.gameId));
    });
  }

  /* -------------------------------------------------------------------
     9. ANALÍTICA — GA4 + Microsoft Clarity (se activan solo si hay ID)
     ------------------------------------------------------------------- */
  function initAnalytics() {
    if (CONFIG.ga4Id) {
      const s1 = document.createElement('script');
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
      document.head.appendChild(s1);

      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', CONFIG.ga4Id);
      window.gtag = gtag;
    }

    if (CONFIG.clarityId) {
      /* eslint-disable */
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', CONFIG.clarityId);
      /* eslint-enable */
    }
  }

  /* -------------------------------------------------------------------
     10. VARIOS — año del footer
     ------------------------------------------------------------------- */
  function initMisc() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  /* -------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initNav();
    initActiveNavLink();
    initScrollProgress();
    initReveals();
    initStarfield();
    const goldOrbit = initGoldOrbit();
    const hallApi = initPortalHall(goldOrbit);
    initPortalScene((scene) => {
      if (hallApi) hallApi.connectScene(scene);
    });
    initLeadForm();
    initArcadeCta();
    initGameLobby();
    initAnalytics();
    initMisc();
  });
})();