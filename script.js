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

    // Mensaje del botón de WhatsApp dentro de la experiencia 3D (modal "Así se vería tu marca en 3D")
    whatsapp3dMessage: 'Hola Reality Studio, quiero cotizar esta experiencia en 3D',

    // Ruta de la página WebAR real (tracking con MindAR). Se usa tanto
    // para armar el QR de escritorio como para el redirect directo en móvil.
    arTrackingPageUrl: 'ar/tarjeta-corporativa.html',

    // 🔧 AUDIO — pega aquí las rutas cuando tengas los archivos reales.
    // Mientras estén en null, todo funciona igual mudo (sin errores):
    // el juego se juega sin efectos y la página carga sin música.
    audio: {
      shoot: null,   // ej. 'audio/shoot.mp3'
      hit: null,     // ej. 'audio/hit.mp3'
      gameOver: null,
      music: null,   // ej. 'audio/ambiente.mp3' — pista de fondo del sitio, arranca en el primer toque (ver initAmbientAudio)
    },

    // Endpoint del formulario de leads. Ejemplos válidos:
    //  - Formspree:  'https://formspree.io/f/TU_ID'
    //  - Webhook propio / Google Apps Script / Zapier, etc.
    // Déjalo en null para simular el envío sin backend (modo demo).
    formEndpoint: 'https://script.google.com/macros/s/AKfycbyV48Piw1Lsq5IE4TvUzMkNNLGk-cnhVwpw7-SUzJsTrSDwMocsANL9KllqkD5jhjlO/exec',

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
     0.5 AUDIO — reproduce efectos si CONFIG.audio tiene una ruta real;
     si está en null, no hace nada (sin errores, sin romper el juego).
     ------------------------------------------------------------------- */
  const audioCache = {};
  function playSfx(name) {
    const src = CONFIG.audio && CONFIG.audio[name];
    if (!src) return;
    try {
      if (!audioCache[name]) audioCache[name] = new Audio(src);
      const node = audioCache[name].cloneNode();
      node.volume = 0.6;
      node.play().catch(() => { /* autoplay bloqueado, silencioso */ });
    } catch (_) { /* silencioso */ }
  }

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
     6.5. PORTAL 3D — escena WebGL con scroll-scrub (carga diferida)
     NOTA (jul-2026): initGoldOrbit() del antiguo modo puerta→salón fue
     retirado junto con el portal — ya no hay puerta ni logo 3D orbitando
     partículas doradas en HTML/CSS; ese rol lo cumple ahora el modo
     "showcase" de three-portal.js dentro del modal 3D.
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

    // La sección ahora es una vista fija (100svh): el progreso de la cámara
    // y las partículas ya NO se calcula desde el scroll de la página, sino
    // que lo empuja initRaStepper() cada vez que cambia el paso activo,
    // usando la referencia a `scene` que este callback entrega más abajo.
    function loadScene() {
      if (loadStarted) return;
      loadStarted = true;
      import('./three-portal.js')
        .then(({ createPortalScene }) => {
          scene = createPortalScene({ canvas, isMobile: !isDesktop() });
          section.classList.add('is-webgl-active');

          window.addEventListener('resize', () => scene.resize());

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
     6.6. MODAL DE TRACKING RA — abierto desde "Probar RA"
     Comportamiento distinto por dispositivo:
     - ESCRITORIO: abre este modal con 2 pasos (QR → imagen trigger).
     - MÓVIL: NO abre modal — redirige directo a la página WebAR real,
       que activa la cámara del propio teléfono (ver CONFIG.arTrackingPageUrl).

     El portal puerta→salón fue retirado por completo del sitio; este
     modal reemplaza esa función anterior con el flujo de tracking real.
     ------------------------------------------------------------------- */
  function initRaTrackingModal() {
    const trigger = document.getElementById('probarRaBtn');
    const modal = document.getElementById('raTrackingModal');
    const closeBtn = document.getElementById('raTrackingClose');
    const stepQr = document.getElementById('raTrackingStepQr');
    const stepImage = document.getElementById('raTrackingStepImage');
    const qrContainer = document.getElementById('raTrackingQr');
    const toStep2Btn = document.getElementById('raTrackingToStep2');
    const backToQrBtn = document.getElementById('raTrackingBackToQr');
    const nextCardBtn = document.getElementById('raTrackingNextCard');
    const soonNote = document.getElementById('raTrackingSoonNote');
    if (!trigger || !modal || !stepQr || !stepImage) return;

    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    let qrBuilt = false;

    function buildQr() {
      if (qrBuilt || !qrContainer) return;
      qrBuilt = true;
      // URL absoluta de la página WebAR real, para que el QR funcione
      // sin importar desde dónde se sirva el sitio.
      const arUrl = new URL(CONFIG.arTrackingPageUrl, window.location.href).href;
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(arUrl)}`;
      img.alt = 'Código QR — escanéalo con tu celular para abrir la experiencia de Realidad Aumentada';
      img.width = 220;
      img.height = 220;
      qrContainer.appendChild(img);
    }

    function goToStepImage() {
      stepQr.hidden = true;
      stepImage.hidden = false;
      backToQrBtn.focus();
    }

    function goToStepQr() {
      stepImage.hidden = true;
      stepQr.hidden = false;
    }

    function openModal() {
      // Móvil: nada de modal — directo a la experiencia real de cámara.
      if (isTouch) {
        window.location.href = CONFIG.arTrackingPageUrl;
        return;
      }
      modal.hidden = false;
      document.body.classList.add('is-locked');
      goToStepQr();
      buildQr();
      closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove('is-locked');
      document.removeEventListener('keydown', onKeydown);
      trigger.focus();
    }

    function onKeydown(event) {
      if (event.key === 'Escape') closeModal();
    }

    trigger.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    toStep2Btn.addEventListener('click', goToStepImage);
    if (backToQrBtn) backToQrBtn.addEventListener('click', goToStepQr);

    // "Siguiente tarjeta": hoy solo existe 1 tarjeta real (la corporativa).
    // Mostramos el aviso de "próximamente" en vez de un salto vacío —
    // mismo patrón honesto usado en el lobby de juegos ("Próximo juego").
    // 🔧 Cuando agregues una segunda tarjeta real, reemplaza este bloque
    // por la navegación real entre tarjetas.
    if (nextCardBtn) {
      nextCardBtn.addEventListener('click', () => {
        if (soonNote) soonNote.hidden = false;
      });
    }
  }

  /* -------------------------------------------------------------------
     6.6.5 MODAL "ASÍ SE VERÍA TU MARCA EN 3D" — abierto desde #showcase3dBtn
     Imagen de fondo a pantalla completa + modelo 3D centrado + partículas
     doradas circulares en órbita (three-portal.js en modo showcase).
     Canvas WebGL independiente, creado al abrir y destruido al cerrar —
     mismo patrón de ciclo de vida ya validado en el resto del sitio.
     ------------------------------------------------------------------- */
  function initShowcase3dModal() {
    const trigger = document.getElementById('showcase3dBtn');
    const modal = document.getElementById('showcase3dModal');
    const closeBtn = document.getElementById('showcase3dClose');
    const canvas = document.getElementById('showcase3dCanvas');
    const whatsappBtn = document.getElementById('showcase3dWhatsapp');
    if (!trigger || !modal || !canvas) return;

    if (whatsappBtn) {
      const text = encodeURIComponent(CONFIG.whatsapp3dMessage);
      whatsappBtn.setAttribute('href', `https://wa.me/${CONFIG.whatsappNumber}?text=${text}`);
    }

    let scene = null;
    let sceneLoadStarted = false;

    function ensureScene() {
      if (sceneLoadStarted) return;
      sceneLoadStarted = true;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const supportsWebGL = (() => {
        try {
          const probe = document.createElement('canvas');
          return !!(window.WebGLRenderingContext &&
            (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
        } catch (_) {
          return false;
        }
      })();

      if (!prefersReducedMotion && supportsWebGL) {
        import('./three-portal.js')
          .then(({ createPortalScene }) => {
            const isDesktop = window.matchMedia('(min-width: 769px)').matches;
            scene = createPortalScene({ canvas, isMobile: !isDesktop, showcaseMode: true });
            scene.setActive(true);
          })
          .catch((err) => {
            console.warn('[Reality Studio] No se pudo cargar las partículas del modal 3D:', err);
          });
      }
      // Sin WebGL o con reduced-motion: el modal se queda con la imagen
      // de fondo y el modelo 3D estático — sigue siendo funcional.
    }

    function openModal() {
      modal.hidden = false;
      document.body.classList.add('is-locked');
      ensureScene();
      closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove('is-locked');
      if (scene) { scene.setActive(false); scene.destroy(); scene = null; }
      sceneLoadStarted = false;
      document.removeEventListener('keydown', onKeydown);
      trigger.focus();
    }

    function onKeydown(event) {
      if (event.key === 'Escape') closeModal();
    }

    trigger.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('pointermove', (event) => {
      if (!scene) return;
      const rect = modal.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      scene.setPointer(x, y);
    });
  }


  /* -------------------------------------------------------------------
     6.7. STEPPER "EXPERIMENTA LA RA" — vista fija, pasos por fundido
     Desktop: la rueda del mouse controla el paso. Al llegar a los bordes
     (paso 0 hacia atrás, paso 3 hacia adelante) se libera el scroll nativo
     de la página — mismo patrón de edge-detection ya validado en el bug
     de scroll horizontal/vertical, ahora aplicado a un eje de "pasos".
     Móvil (sin rueda): avance automático por tiempo, tap para saltar,
     long-press para pausar. En ambos casos, el fondo WebGL (partículas y
     figuras) NUNCA deja de animarse — solo recibe un progreso distinto.
     ------------------------------------------------------------------- */
  function initRaStepper(onStepChange) {
    const section = document.getElementById('experiencia-ra');
    const frames = Array.from(document.querySelectorAll('.ra-step-frame'));
    const dots = Array.from(document.querySelectorAll('.ra-progress__dot'));
    if (!section || !frames.length) return;

    const TOTAL = frames.length; // 4
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const AUTO_ADVANCE_MS = 4500;

    let current = 0;
    let sectionEngaged = false; // true cuando la sección ocupa la mayor parte del viewport
    let autoTimer = null;
    let autoPaused = false;

    function render() {
      frames.forEach((frame, i) => frame.classList.toggle('is-active', i === current));
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
      if (typeof onStepChange === 'function') onStepChange(current, TOTAL);
    }

    function goToStep(next) {
      current = Math.max(0, Math.min(TOTAL - 1, next));
      render();
    }

    // ---------------- Desktop: rueda del mouse ----------------
    let wheelCooldown = false;
    function onWheel(event) {
      if (!sectionEngaged) return;

      const goingForward = event.deltaY > 0;

      // Bordes: libera el scroll nativo hacia la sección siguiente/anterior
      // en vez de atraparlo — el mismo principio que evitó el bug anterior
      // de scroll horizontal/vertical simultáneo.
      if (goingForward && current === TOTAL - 1) return;
      if (!goingForward && current === 0) return;

      event.preventDefault();
      if (wheelCooldown) return;
      wheelCooldown = true;
      window.setTimeout(() => { wheelCooldown = false; }, 650);

      goToStep(current + (goingForward ? 1 : -1));
    }

    if (!isTouch) {
      section.addEventListener('wheel', onWheel, { passive: false });
    }

    // ---------------- Móvil: auto-avance + tap para saltar ----------------
    function stopAutoAdvance() {
      if (autoTimer) window.clearTimeout(autoTimer);
      autoTimer = null;
    }

    function scheduleAutoAdvance() {
      stopAutoAdvance();
      if (!isTouch || !sectionEngaged || autoPaused) return;
      if (current >= TOTAL - 1) return; // el último paso espera la acción del usuario
      autoTimer = window.setTimeout(() => {
        goToStep(current + 1);
        scheduleAutoAdvance();
      }, AUTO_ADVANCE_MS);
    }

    if (isTouch) {
      const LONG_PRESS_MS = 350;
      let pointerDownAt = 0;

      section.addEventListener('pointerdown', () => {
        pointerDownAt = Date.now();
        autoPaused = true; // pausa el avance automático mientras el dedo esté abajo
      });
      section.addEventListener('pointerup', (event) => {
        const heldMs = Date.now() - pointerDownAt;
        autoPaused = false;
        const isShortTap = heldMs < LONG_PRESS_MS;
        const hitsInteractive = event.target.closest('.ra-progress, .ra-step__cta');
        // Tap corto en zona no interactiva: avanza inmediato. Long-press:
        // solo pausó y reanuda el timer sin saltar de paso.
        if (isShortTap && !hitsInteractive) {
          goToStep(Math.min(current + 1, TOTAL - 1));
        }
        scheduleAutoAdvance();
      });
      section.addEventListener('pointercancel', () => { autoPaused = false; });
    }

    // ---------------- Puntos de progreso: saltar directo a un paso ----------------
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        stopAutoAdvance();
        goToStep(parseInt(dot.dataset.step, 10));
        scheduleAutoAdvance();
      });
    });

    // ---------------- Visibilidad: solo "engancha" la rueda / corre el timer
    // cuando la sección ocupa la mayor parte del viewport ----------------
    const engagementObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        sectionEngaged = entry.intersectionRatio > 0.6;
        if (sectionEngaged) {
          scheduleAutoAdvance();
        } else {
          stopAutoAdvance();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    engagementObserver.observe(section);

    render();
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
          // 🔧 FIX CORS: Google Apps Script no responde a la petición
          // "preflight" (OPTIONS) que el navegador dispara automáticamente
          // cuando el Content-Type es 'application/json'. Enviando el body
          // como 'text/plain' evitamos el preflight — Apps Script sigue
          // recibiendo el mismo JSON en e.postData.contents y lo parsea
          // igual con JSON.parse(), sin tocar nada del lado de Google.
          const response = await fetch(CONFIG.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
    const overlayNote = document.getElementById('arcadeOverlayNote');
    const playBtn = document.getElementById('arcadePlay');
    const scoreEl = document.getElementById('arcadeScore');
    const shootLeftBtn = document.getElementById('arcadeShootLeft');
    const shootRightBtn = document.getElementById('arcadeShootRight');
    const rotateEl = document.getElementById('arcadeRotate');
    const permissionDeniedEl = document.getElementById('arcadePermissionDenied');
    const permissionRetryBtn = document.getElementById('arcadePermissionRetry');
    const globalCta = document.getElementById('arcadeCta');
    const soundToggleBtn = document.getElementById('soundToggle');
    if (!section || !lobby || !stage || !canvas || !overlay || !playBtn) return;

    const defaultOverlayText = overlayText.textContent;
    const loadedGames = {}; // cache: no recargamos el módulo si ya se jugó
    let game = null;
    let controlsBound = false;

    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const isLandscape = () => window.matchMedia('(orientation: landscape)').matches;
    let waitingForRotation = false;
    let tiltListenerActive = false;

    // En móvil avisamos de entrada que el juego pedirá permiso de sensor
    if (overlayNote) overlayNote.hidden = !isTouch;

    function onScoreChange(score, lives, wave) {
      if (scoreEl) scoreEl.textContent = `PUNTAJE: ${score} · VIDAS: ${lives} · OLEADA ${wave}`;
    }

    // El CTA flotante de WhatsApp y el botón de sonido se ocultan mientras
    // se juega (vista plena del juego, sin nada compitiendo visualmente) y
    // solo reaparecen al terminar la partida (victoria o derrota) o al
    // salir del juego.
    function hideGlobalCta() {
      if (globalCta) globalCta.classList.add('is-hidden-ingame');
      if (soundToggleBtn) soundToggleBtn.classList.add('is-hidden-ingame');
    }
    function showGlobalCta() {
      if (globalCta) globalCta.classList.remove('is-hidden-ingame');
      if (soundToggleBtn) soundToggleBtn.classList.remove('is-hidden-ingame');
    }

    function onGameOver(finalScore, won) {
      playSfx('gameOver');
      overlay.hidden = false;
      if (overlayNote) overlayNote.hidden = true;
      overlayTitle.textContent = won ? '¡Los venciste a todos!' : 'Fin del juego';
      overlayText.textContent =
        `Puntaje final: ${finalScore}. ¿Y si tu próxima campaña fuera así de directa? ` +
        'Escríbenos por el botón de WhatsApp.';
      playBtn.querySelector('span').textContent = 'Jugar de nuevo';
      showGlobalCta();
    }

    // ---------------- Movimiento por inclinación (solo móvil/touch) ----------------
    // iOS 13+ exige permiso explícito, solicitado en el mismo toque de
    // "Jugar" para no sentirse como un paso adicional. Si el navegador no
    // requiere permiso (Android, la mayoría), se activa directo.
    // Calibración "arcade": inclinaciones pequeñas ya alcanzan buena
    // velocidad (TILT_SENSITIVITY bajo) + curva no lineal (TILT_CURVE)
    // para que la respuesta se sienta inmediata sin perder control fino
    // cerca del centro.
    const TILT_SENSITIVITY = 16; // grados de inclinación para velocidad máxima
    const TILT_CURVE = 0.6;      // <1 = respuesta más agresiva desde el centro

    function handleTilt(event) {
      if (!game) return;
      const angle = (window.screen && window.screen.orientation && window.screen.orientation.angle)
        ?? window.orientation ?? 0;
      let raw;
      // Ejes de deviceorientation según la rotación real de la pantalla —
      // corregido: los signos anteriores dejaban el movimiento invertido
      // (inclinar a la derecha movía la nave a la izquierda y viceversa).
      if (angle === 90) raw = event.beta;
      else if (angle === -90 || angle === 270) raw = -event.beta;
      else raw = event.gamma;
      if (raw == null) return;
      const normalized = Math.max(-1, Math.min(1, raw / TILT_SENSITIVITY));
      const curved = Math.sign(normalized) * Math.pow(Math.abs(normalized), TILT_CURVE);
      game.setMove(curved);
    }

    function startTiltListener() {
      if (tiltListenerActive) return;
      tiltListenerActive = true;
      window.addEventListener('deviceorientation', handleTilt);
    }

    function stopTiltListener() {
      if (!tiltListenerActive) return;
      tiltListenerActive = false;
      window.removeEventListener('deviceorientation', handleTilt);
      if (game) game.setMove(0);
    }

    function requestTiltPermission() {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        return DOE.requestPermission().then((state) => state === 'granted');
      }
      // Navegadores que no exigen permiso explícito (Android, escritorio)
      return Promise.resolve(true);
    }

    // ---------------- Pantalla completa horizontal (solo móvil/touch) ----------------
    function beginPlay() {
      waitingForRotation = false;
      if (rotateEl) rotateEl.hidden = true;
      overlay.hidden = true;
      if (permissionDeniedEl) permissionDeniedEl.hidden = true;
      hideGlobalCta();
      if (game) game.start();
    }

    function requestGameFullscreen() {
      const requestFs = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (requestFs) {
        try { requestFs.call(stage).catch(() => {}); } catch (_) { /* silencioso */ }
      }
      // screen.orientation.lock solo funciona en algunos navegadores (y
      // generalmente requiere estar ya en fullscreen). Si falla, no pasa
      // nada: igual detectamos el giro real del teléfono más abajo.
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        window.screen.orientation.lock('landscape').catch(() => { /* no soportado */ });
      }
    }

    function onRotationCheck() {
      if (!waitingForRotation) return;
      if (isLandscape()) {
        window.removeEventListener('resize', onRotationCheck);
        window.removeEventListener('orientationchange', onRotationCheck);
        requestGameFullscreen();
        startTiltListener();
        beginPlay();
      }
    }

    function proceedAfterPermission() {
      if (isLandscape()) {
        requestGameFullscreen();
        startTiltListener();
        beginPlay();
        return;
      }
      // Portrait en móvil: pedimos girar el teléfono antes de arrancar
      overlay.hidden = true;
      waitingForRotation = true;
      if (rotateEl) rotateEl.hidden = false;
      window.addEventListener('resize', onRotationCheck);
      window.addEventListener('orientationchange', onRotationCheck);
    }

    function startPlayFlow() {
      if (!isTouch) {
        beginPlay();
        return;
      }
      // Móvil: el juego SOLO arranca si el permiso de movimiento fue
      // aceptado — sin ese sensor no hay forma de moverse en pantalla.
      if (permissionDeniedEl) permissionDeniedEl.hidden = true;
      requestTiltPermission().then((granted) => {
        if (granted) {
          proceedAfterPermission();
        } else {
          overlay.hidden = true;
          if (permissionDeniedEl) permissionDeniedEl.hidden = false;
        }
      });
    }

    // Si el usuario sale de pantalla completa (botón atrás del sistema,
    // gesto, etc.) nunca lo dejamos "atrapado": cerramos el juego con
    // normalidad y lo regresamos al lobby.
    function onFullscreenChange() {
      const stillFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
      if (!stillFullscreen && !stage.hidden && game) {
        closeGame();
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    function bindControlsOnce() {
      if (controlsBound) return;
      controlsBound = true;

      playBtn.addEventListener('click', startPlayFlow);
      if (permissionRetryBtn) permissionRetryBtn.addEventListener('click', startPlayFlow);

      // Escritorio: flechas para moverse (fallback natural sin sensor)
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

      // Móvil: solo disparo por botón — dos, uno en cada esquina inferior,
      // para no tapar el centro de la vista con el pulgar.
      const bindShoot = (el) => {
        if (!el) return;
        el.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          if (game) game.shoot();
        });
      };
      bindShoot(shootLeftBtn);
      bindShoot(shootRightBtn);

      if (closeBtn) closeBtn.addEventListener('click', closeGame);
    }

    function closeGame() {
      if (game) game.stop();
      stopTiltListener();
      stage.hidden = true;
      lobby.hidden = false;
      overlay.hidden = false;
      overlayText.textContent = defaultOverlayText;
      if (overlayNote) overlayNote.hidden = !isTouch;
      if (permissionDeniedEl) permissionDeniedEl.hidden = true;
      playBtn.querySelector('span').textContent = 'Jugar';
      if (rotateEl) rotateEl.hidden = true;
      waitingForRotation = false;
      window.removeEventListener('resize', onRotationCheck);
      window.removeEventListener('orientationchange', onRotationCheck);
      showGlobalCta();
      // Nunca dejamos al usuario atrapado en pantalla completa u
      // orientación forzada al salir del juego.
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFs) { try { exitFs.call(document).catch(() => {}); } catch (_) { /* silencioso */ } }
      }
      if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
        try { window.screen.orientation.unlock(); } catch (_) { /* silencioso */ }
      }
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
      if (overlayNote) overlayNote.hidden = !isTouch;
      playBtn.querySelector('span').textContent = 'Jugar';
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });

      try {
        if (!loadedGames[gameId]) {
          const createGame = await entry.load();
          loadedGames[gameId] = createGame;
        }
        if (game) game.stop();
        game = loadedGames[gameId]({
          canvas,
          onScoreChange,
          onGameOver,
          onShoot: () => playSfx('shoot'),
          onHit: () => playSfx('hit'),
        });
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
     11. AUDIO AMBIENTAL — arranca en el primer toque de la página
     Ningún navegador permite reproducir audio con sonido de forma
     automática sin interacción previa (política de autoplay). Por eso
     se engancha al primer 'pointerdown'/'keydown' en cualquier parte de
     la página, una sola vez, y luego se desactiva a sí mismo.
     ------------------------------------------------------------------- */
  let ambientAudioEl = null;

  function initAmbientAudio() {
    if (!CONFIG.audio || !CONFIG.audio.music) return; // 🔧 placeholder null: no hace nada aún

    function startMusic() {
      if (!ambientAudioEl) {
        ambientAudioEl = new Audio(CONFIG.audio.music);
        ambientAudioEl.loop = true;
        ambientAudioEl.volume = 0.35;
      }
      ambientAudioEl.play().catch(() => { /* silencioso: el usuario podrá activarla con el botón de sonido */ });
      window.removeEventListener('pointerdown', startMusic);
      window.removeEventListener('keydown', startMusic);
    }

    window.addEventListener('pointerdown', startMusic, { once: true });
    window.addEventListener('keydown', startMusic, { once: true });
  }

  /* -------------------------------------------------------------------
     12. BOTÓN DE SONIDO — silencia/activa la pista ambiental
     Funciona incluso si CONFIG.audio.music sigue en null (el botón queda
     visible e interactivo, solo no hay nada que silenciar todavía).
     ------------------------------------------------------------------- */
  function initSoundToggle() {
    const btn = document.getElementById('soundToggle');
    const icon = document.getElementById('soundToggleIcon');
    if (!btn) return;

    let muted = false;

    btn.addEventListener('click', () => {
      muted = !muted;
      if (ambientAudioEl) {
        ambientAudioEl.muted = muted;
        if (!muted) ambientAudioEl.play().catch(() => { /* silencioso */ });
      }
      btn.setAttribute('aria-pressed', String(muted));
      btn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
      if (icon) icon.textContent = muted ? '🔇' : '🔊';
    });
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

    // El fondo WebGL (partículas/figuras) recibe su progreso desde el paso
    // narrativo activo, no desde el scroll — así nunca deja de animarse
    // mientras el texto se funde entre pasos.
    let raScene = null;
    initPortalScene((scene) => { raScene = scene; });
    initRaStepper((step, total) => {
      if (raScene) raScene.setProgress(step / (total - 1));
    });

    initRaTrackingModal();
    initShowcase3dModal();
    initLeadForm();
    initArcadeCta();
    initGameLobby();
    initAnalytics();
    initMisc();
    initAmbientAudio();
    initSoundToggle();
  });
})();