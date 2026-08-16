/**
 * Portfolio — Premium Interactive Experience v2
 * Single animation system (GSAP only — no CSS hidden states)
 * All content visible by default; GSAP enhances with entrance animations
 */

/* ═══════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ═══════════════════════════════════════════════════════════════ */

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const map   = (v, i0, i1, o0, o1) => o0 + ((v - i0) / (i1 - i0)) * (o1 - o0);

const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

const isTouch = () => window.matchMedia('(hover: none)').matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════════════════════════════
   1. CANVAS ENGINE BOOT
   ═══════════════════════════════════════════════════════════════ */

let canvasEngine = null;

function bootCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas || reducedMotion()) return;

  try {
    canvasEngine = new CanvasEngine(canvas);
  } catch (e) {
    console.warn('CanvasEngine failed to init:', e);
  }
}

/* ═══════════════════════════════════════════════════════════════
   2. CUSTOM CURSOR
   ═══════════════════════════════════════════════════════════════ */

class CursorSystem {
  constructor() {
    if (isTouch()) return;

    this.dot  = document.getElementById('cursorDot');
    this.ring = document.getElementById('cursorRing');
    this.glow = document.getElementById('cursorGlow');

    if (!this.dot) return;

    this.tx = window.innerWidth / 2;
    this.ty = window.innerHeight / 2;
    this.dx = this.tx; this.dy = this.ty;
    this.rx = this.tx; this.ry = this.ty;
    this.gx = this.tx; this.gy = this.ty;

    this.state = 'default';
    this._raf  = null;

    this._onMove  = this._onMove.bind(this);
    this._onDown  = this._onDown.bind(this);
    this._onUp    = this._onUp.bind(this);
    this._tick    = this._tick.bind(this);

    document.addEventListener('mousemove', this._onMove, { passive: true });
    document.addEventListener('mousedown', this._onDown);
    document.addEventListener('mouseup',   this._onUp);

    this._bindHoverTargets();
    this._raf = requestAnimationFrame(this._tick);
  }

  _bindHoverTargets() {
    const hover = 'a, button, [data-magnetic], .project-card, .skill-chip, .cert-item, .bento-card';

    const attach = () => {
      document.querySelectorAll(hover).forEach(el => {
        if (el._cursorBound) return;
        el._cursorBound = true;
        el.addEventListener('mouseenter', () => this._set('hover'));
        el.addEventListener('mouseleave', () => this._set('default'));
      });
    };

    attach();
    new MutationObserver(debounce(attach, 250))
      .observe(document.body, { childList: true, subtree: true });
  }

  _set(state) {
    this.state = state;
    document.body.classList.remove('cursor-hover', 'cursor-text', 'cursor-click');
    if (state !== 'default') document.body.classList.add(`cursor-${state}`);
  }

  _onMove(e) { this.tx = e.clientX; this.ty = e.clientY; }
  _onDown()  { this._set('click'); }
  _onUp()    { this._set('default'); }

  _tick() {
    this.dx = lerp(this.dx, this.tx, 0.8);
    this.dy = lerp(this.dy, this.ty, 0.8);
    this.rx = lerp(this.rx, this.tx, 0.12);
    this.ry = lerp(this.ry, this.ty, 0.12);
    this.gx = lerp(this.gx, this.tx, 0.055);
    this.gy = lerp(this.gy, this.ty, 0.055);

    const t = (x, y) => `translate(${x}px,${y}px) translate(-50%,-50%)`;
    if (this.dot)  this.dot.style.transform  = t(this.dx, this.dy);
    if (this.ring) this.ring.style.transform  = t(this.rx, this.ry);
    if (this.glow) this.glow.style.transform  = t(this.gx, this.gy);

    this._raf = requestAnimationFrame(this._tick);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    document.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('mousedown', this._onDown);
    document.removeEventListener('mouseup',   this._onUp);
  }
}

/* ═══════════════════════════════════════════════════════════════
   3. MAGNETIC BUTTONS
   ═══════════════════════════════════════════════════════════════ */

function initMagnetic() {
  if (isTouch() || reducedMotion()) return;

  document.querySelectorAll('[data-magnetic]').forEach(el => {
    let cx = 0, cy = 0, raf;

    el.addEventListener('mousemove', e => {
      const r  = el.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width  / 2;
      const my = e.clientY - r.top  - r.height / 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cx = lerp(cx, mx * 0.3, 0.2);
        cy = lerp(cy, my * 0.3, 0.2);
        el.style.transform = `translate(${cx}px,${cy}px)`;
      });
    });

    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      const release = () => {
        cx = lerp(cx, 0, 0.15);
        cy = lerp(cy, 0, 0.15);
        el.style.transform = `translate(${cx}px,${cy}px)`;
        if (Math.abs(cx) > 0.4 || Math.abs(cy) > 0.4) raf = requestAnimationFrame(release);
        else el.style.transform = '';
      };
      release();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. HERO 3D TILT
   ═══════════════════════════════════════════════════════════════ */

function initHeroTilt() {
  if (isTouch() || reducedMotion()) return;
  const wrapper = document.getElementById('heroTiltWrapper');
  if (!wrapper) return;

  let rx = 0, ry = 0, trx = 0, try_ = 0, raf;

  const tick = () => {
    rx = lerp(rx, trx, 0.06);
    ry = lerp(ry, try_, 0.06);
    wrapper.style.transform =
      `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    raf = requestAnimationFrame(tick);
  };

  window.addEventListener('mousemove', e => {
    trx = -map(e.clientY, 0, window.innerHeight, -5, 5);
    try_ = map(e.clientX, 0, window.innerWidth,  -6, 6);
  }, { passive: true });

  raf = requestAnimationFrame(tick);
}

/* ═══════════════════════════════════════════════════════════════
   5. PROJECT CARD 3D TILT
   ═══════════════════════════════════════════════════════════════ */

function initCardTilt() {
  if (isTouch() || reducedMotion()) return;
  const MAX = 6;

  document.querySelectorAll('.project-card').forEach(card => {
    let rx = 0, ry = 0, trx = 0, try_ = 0, raf = null;

    const tick = () => {
      rx = lerp(rx, trx, 0.09);
      ry = lerp(ry, try_, 0.09);
      card.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;

      if (Math.abs(rx - trx) > 0.05 || Math.abs(ry - try_) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else raf = null;
    };

    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top)  / r.height;
      try_ = map(nx, 0, 1, -MAX, MAX);
      trx  = map(ny, 0, 1,  MAX, -MAX);
      card.style.setProperty('--card-mx', `${nx * 100}%`);
      card.style.setProperty('--card-my', `${ny * 100}%`);
      if (!raf) raf = requestAnimationFrame(tick);
    });

    card.addEventListener('mouseleave', () => {
      trx = 0; try_ = 0;
      card.style.removeProperty('--card-mx');
      card.style.removeProperty('--card-my');
      if (!raf) raf = requestAnimationFrame(tick);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   6. BUTTON MOUSE GLOW
   ═══════════════════════════════════════════════════════════════ */

function initButtonGlow() {
  if (isTouch()) return;
  document.querySelectorAll('.btn, .btn-send').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      btn.style.setProperty('--my', `${((e.clientY - r.top)  / r.height) * 100}%`);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   7. SKILLS SPOTLIGHT
   ═══════════════════════════════════════════════════════════════ */

function initSkillsSpotlight() {
  const showcase = document.getElementById('skillsShowcase');
  if (!showcase || isTouch()) return;

  showcase.addEventListener('mousemove', e => {
    const r = showcase.getBoundingClientRect();
    showcase.style.setProperty('--spotlight-x', `${e.clientX - r.left}px`);
    showcase.style.setProperty('--spotlight-y', `${e.clientY - r.top}px`);
  });
}

/* ═══════════════════════════════════════════════════════════════
   8. NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

function initNavigation() {
  const header      = document.getElementById('siteHeader');
  const menuToggle  = document.getElementById('menuToggle');
  const drawer      = document.getElementById('mobileDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const progress    = document.getElementById('scrollProgress');
  const backToTop   = document.getElementById('backToTop');
  const navLinks    = document.querySelectorAll('.nav-links a');
  const sections    = [...document.querySelectorAll('main section[id]')];

  let drawerOpen = false;

  /* ── Scroll state ── */
  const onScroll = () => {
    const st = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (progress) progress.style.width = max > 0 ? `${(st / max) * 100}%` : '0%';
    if (header)   header.classList.toggle('scrolled', st > 50);
    if (backToTop) backToTop.classList.toggle('visible', st > 400);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Active section via IntersectionObserver ── */
  if (sections.length) {
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('active',
            a.getAttribute('href') === `#${entry.target.id}`));
        }
      });
    }, { threshold: 0.35 });
    sections.forEach(s => sectionObs.observe(s));
  }

  /* ── Mobile drawer ── */
  const openDrawer = () => {
    drawerOpen = true;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '0'));
    document.body.style.overflow = 'hidden';
    menuToggle.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    drawerOpen = false;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
    document.body.style.overflow = '';
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  menuToggle?.addEventListener('click', () => drawerOpen ? closeDrawer() : openDrawer());
  drawerClose?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawerOpen) closeDrawer();
  });

  /* ── Back to top ── */
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ── Smooth anchor scrolling ── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   9. THEME SYSTEM
   ═══════════════════════════════════════════════════════════════ */

function initTheme() {
  const html   = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('pf-theme') || 'dark';

  const apply = theme => {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('pf-theme', theme);
    canvasEngine?.setTheme(theme);

    const icon = toggle?.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    toggle?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  };

  apply(stored);
  toggle?.addEventListener('click', () => {
    apply(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. CONTACT FORM
   ═══════════════════════════════════════════════════════════════ */

function initContactForm() {
  const form    = document.getElementById('contactForm');
  const message = document.getElementById('formMessage');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name  = form.name.value.trim();
    const email = form.email.value.trim();
    const msg   = form.message.value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !msg) {
      showMsg('Please fill out all fields.', 'error');
      return;
    }
    if (!emailRe.test(email)) {
      showMsg('Please enter a valid email address.', 'error');
      return;
    }

    showMsg('✓  Message received — I\'ll be in touch soon!', 'success');
    form.reset();
  });

  function showMsg(text, type) {
    if (!message) return;
    message.textContent = text;
    message.style.color = type === 'success' ? 'var(--success)' : 'var(--error)';
  }
}

/* ═══════════════════════════════════════════════════════════════
   11. GSAP ANIMATIONS
   Key fix: Use gsap.fromTo with explicit end state + clearProps.
   NEVER start from opacity:0 without clearProps — elements get stuck.
   Elements are VISIBLE by default — GSAP only ENHANCES on scroll.
   ═══════════════════════════════════════════════════════════════ */

function initAnimations() {
  if (!window.gsap) return;

  const reduced = reducedMotion();

  /* ── Hero entrance (plays immediately) ── */
  if (!reduced) {
    // Reveal hero title lines via CSS class
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) {
      setTimeout(() => heroTitle.classList.add('revealed'), 80);
    }

    // Hero copy items fade up
    const heroItems = [
      '#heroKicker', '#heroSubtitle', '#heroActions'
    ].map(s => document.querySelector(s)).filter(Boolean);

    gsap.fromTo(heroItems,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75, ease: 'power2.out', stagger: 0.13,
        delay: 0.25, clearProps: 'opacity,transform' }
    );

    gsap.fromTo('#heroTiltWrapper',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power2.out',
        delay: 0.2, clearProps: 'opacity,transform' }
    );
  } else {
    // Immediately show title on reduced motion
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.classList.add('revealed');
  }

  if (!window.ScrollTrigger || reduced) return;

  gsap.registerPlugin(ScrollTrigger);

  /* Helper: safe fromTo with scroll trigger */
  const reveal = (targets, options = {}) => {
    const {
      delay = 0, stagger = 0, x = 0, y = 18,
      trigger = null, start = 'top 88%'
    } = options;

    // Only animate elements that are BELOW the current viewport
    // to prevent unnecessary animation of already-visible elements
    const els = typeof targets === 'string'
      ? [...document.querySelectorAll(targets)]
      : Array.isArray(targets) ? targets : [targets];

    if (!els.length) return;

    els.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const belowFold = rect.top > window.innerHeight;

      if (!belowFold) return; // already visible — no animation needed

      gsap.fromTo(el,
        { y, x, opacity: 0 },
        {
          y: 0, x: 0, opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
          delay: delay + i * stagger,
          clearProps: 'opacity,transform',
          scrollTrigger: {
            trigger: trigger || el,
            start,
            once: true
          }
        }
      );
    });
  };

  /* ── Section headers ── */
  reveal('.section-header h2, .section-header .label', { y: 14 });

  /* ── About bento ── */
  reveal('.bento-card', { stagger: 0.08, trigger: '#about .about-bento' });
  reveal('.fact-chip',  { stagger: 0.05, y: 10, trigger: '.about-facts' });

  /* ── Timeline items ── */
  document.querySelectorAll('.timeline-item').forEach((item, i) => {
    reveal(item, { delay: i * 0.1 });
  });

  /* ── Featured project ── */
  reveal('.project-featured', { y: 24 });

  /* ── Project cards ── */
  document.querySelectorAll('.project-card').forEach((card, i) => {
    reveal(card, { delay: (i % 3) * 0.07 });
  });

  /* ── Certificate groups ── */
  document.querySelectorAll('.cert-group').forEach((g, i) => {
    reveal(g, { delay: i * 0.08 });
  });

  /* ── Skill groups ── */
  document.querySelectorAll('.skill-group').forEach((g, i) => {
    reveal(g, { delay: i * 0.07 });
  });

  /* ── Contact ── */
  reveal('.contact-copy', { x: -16, y: 0 });
  reveal('.contact-form',  { x:  16, y: 0 });
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — BOOTSTRAP
   ═══════════════════════════════════════════════════════════════ */

function main() {
  bootCanvas();
  initTheme();

  if (!isTouch()) new CursorSystem();

  initNavigation();
  initMagnetic();
  initHeroTilt();
  initCardTilt();
  initButtonGlow();
  initSkillsSpotlight();
  initContactForm();
  initAnimations();

  /* Pause canvas when tab hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) canvasEngine?.pause();
    else canvasEngine?.resume();
  });

  /* Dev helpers */
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.__pf = { canvasEngine };
    console.log('%c🎨 Portfolio loaded', 'color:#6366f1;font-weight:700;');
  }
}

/* ── Wait for DOM ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
