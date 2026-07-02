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
    whatsappNumber: '573000000000',
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

    // Los enlaces del nav apuntan a secciones dentro del lienzo horizontal:
    // usamos scrollIntoView con inline:'start' para que funcione en ambos ejes.
    document.querySelectorAll('[data-nav-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'start' });
      });
    });
  }

  /* -------------------------------------------------------------------
     3. LIENZO HORIZONTAL — rueda vertical → scroll horizontal (desktop)
     ------------------------------------------------------------------- */
  function initHorizontalScroll() {
    const track = document.getElementById('horizontalScroll');
    const progressBar = document.getElementById('scrollProgressBar');
    if (!track) return;

    const isDesktop = () => window.matchMedia('(min-width: 769px)').matches;

    track.addEventListener('wheel', (event) => {
      if (!isDesktop()) return; // en móvil se apila verticalmente, scroll nativo
      // Si el gesto ya es predominantemente horizontal (trackpad), lo dejamos nativo.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      track.scrollLeft += event.deltaY;
    }, { passive: true });

    // Navegación con flechas del teclado cuando el foco está dentro del lienzo
    track.addEventListener('keydown', (event) => {
      if (!isDesktop()) return;
      const panelWidth = track.clientWidth;
      if (event.key === 'ArrowRight') track.scrollBy({ left: panelWidth, behavior: 'smooth' });
      if (event.key === 'ArrowLeft') track.scrollBy({ left: -panelWidth, behavior: 'smooth' });
    });

    const updateProgress = () => {
      if (!progressBar) return;
      if (!isDesktop()) { progressBar.style.width = '0%'; return; }
      const max = track.scrollWidth - track.clientWidth;
      const pct = max > 0 ? (track.scrollLeft / max) * 100 : 0;
      progressBar.style.width = `${pct}%`;
    };

    track.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
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
    if (!orbit || !logo) return;

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
    let portalActive = false;

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
      if (!portalActive) {
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

    /* ---------------- EVENTO PORTAL — zoom + redirección ---------------- */
    const enterPortal = () => {
      if (portalActive) return;
      portalActive = true;
      logo.classList.add('is-portal-active');
      if ('vibrate' in navigator) {
        try { navigator.vibrate(60); } catch (_) { /* silencioso */ }
      }
      window.setTimeout(() => {
        window.location.href = 'espacio-en-construccion.html';
      }, 420);
    };

    logo.addEventListener('click', enterPortal);
    logo.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        enterPortal();
      }
    });
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
     8. WHATSAPP CTA — arma el enlace desde CONFIG
     ------------------------------------------------------------------- */
  function initWhatsappCta() {
    const cta = document.getElementById('whatsappCta');
    if (!cta) return;
    const text = encodeURIComponent(CONFIG.whatsappMessage);
    cta.setAttribute('href', `https://wa.me/${CONFIG.whatsappNumber}?text=${text}`);
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
    initHorizontalScroll();
    initReveals();
    initStarfield();
    initGoldOrbit();
    initLeadForm();
    initWhatsappCta();
    initAnalytics();
    initMisc();
  });
})();