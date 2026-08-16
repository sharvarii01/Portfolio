/**
 * CanvasEngine — Cinematic Background Renderer
 * Premium fluid ribbons + ambient depth particles
 * Performance-first: GPU-only, adaptive quality, pauses when hidden
 */

class CanvasEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.raf = null;
    this.running = false;
    this.startTime = performance.now();

    // Mouse / scroll state (lerped targets)
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.scrollY = 0;
    this.scrollTarget = 0;

    // Quality tier: 'high' | 'medium' | 'low'
    this.quality = 'high';
    this.theme = 'dark'; // 'dark' | 'light'

    // Ribbon & particle data (populated after quality probe)
    this.ribbons = [];
    this.particles = [];

    // Bound handlers (kept for cleanup)
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._render = this._render.bind(this);

    this._setupResize();
    this._probe().then(() => {
      this._buildScene();
      this._attachListeners();
      this.resume();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  setTheme(theme) {
    this.theme = theme; // 'dark' | 'light'
  }

  pause() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this._render);
  }

  destroy() {
    this.pause();
    this._resizeObserver?.disconnect();
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('scroll', this._onScroll);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }

  // ─────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────

  /** ResizeObserver — debounced, keeps canvas in sync */
  _setupResize() {
    let timer;
    this._resizeObserver = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => this._resize(), 150);
    });
    this._resizeObserver.observe(document.documentElement);
    this._resize();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this.W = w;
    this.H = h;
    // Rebuild scene when resized so positions are correct
    if (this.ribbons.length) this._buildScene();
  }

  /**
   * FPS probe — runs 60 frames, measures average FPS,
   * sets quality tier accordingly
   */
  _probe() {
    return new Promise(resolve => {
      // Honour reduced-motion immediately
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.quality = 'off';
        resolve();
        return;
      }

      // Mobile gets medium quality by default
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile) {
        this.quality = 'medium';
        resolve();
        return;
      }

      let frames = 0;
      let t0 = performance.now();
      const probe = () => {
        frames++;
        if (frames < 30) {
          requestAnimationFrame(probe);
        } else {
          const fps = frames / ((performance.now() - t0) / 1000);
          if (fps >= 50) this.quality = 'high';
          else if (fps >= 35) this.quality = 'medium';
          else this.quality = 'low';
          resolve();
        }
      };
      requestAnimationFrame(probe);
    });
  }

  /** Build ribbons and particles based on quality tier */
  _buildScene() {
    const q = this.quality;
    const W = this.W || window.innerWidth;
    const H = this.H || window.innerHeight;

    // ── Ribbon configuration ──
    const ribbonCounts = { high: 6, medium: 4, low: 2, off: 0 };
    const count = ribbonCounts[q] || 0;
    this.ribbons = [];

    for (let i = 0; i < count; i++) {
      this.ribbons.push({
        // Phase offset so each ribbon is different
        phase: (i / count) * Math.PI * 2,
        // Speed multiplier (subtle)
        speed: 0.0004 + i * 0.00008,
        // Vertical position as fraction of canvas height
        yBase: 0.15 + (i / count) * 0.75,
        // Parallax depth (0 = no parallax, 1 = full)
        depth: 0.2 + (i / count) * 0.6,
        // Width spread
        spread: 0.3 + Math.random() * 0.4,
        // Opacity
        alpha: 0.018 + Math.random() * 0.022,
        // Noise offsets
        noiseX: Math.random() * 100,
        noiseY: Math.random() * 100,
      });
    }

    // ── Particle configuration ──
    const particleCounts = { high: 55, medium: 30, low: 12, off: 0 };
    const pCount = particleCounts[q] || 0;
    this.particles = [];

    for (let i = 0; i < pCount; i++) {
      this.particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.04 + Math.random() * 0.14,
        depth: 0.3 + Math.random() * 0.7, // parallax depth
        phase: Math.random() * Math.PI * 2, // for pulsing alpha
      });
    }
  }

  _attachListeners() {
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('scroll', this._onScroll, { passive: true });
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────

  _onMouseMove(e) {
    this.mouse.tx = e.clientX;
    this.mouse.ty = e.clientY;
  }

  _onScroll() {
    this.scrollTarget = window.scrollY;
  }

  _onVisibilityChange() {
    if (document.hidden) this.pause();
    else this.resume();
  }

  // ─────────────────────────────────────────────────────────────
  // NOISE UTILITY (simple 2D value noise — no deps)
  // ─────────────────────────────────────────────────────────────

  /** 
   * Smooth value noise: returns value in [-1, 1]
   * Uses a permutation table for repeatability
   */
  _noise(x, y) {
    const ix = Math.floor(x) & 255;
    const iy = Math.floor(y) & 255;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);

    // Fade curve
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

    // Hash + gradient (simplified)
    const a = this._hash(ix, iy);
    const b = this._hash(ix + 1, iy);
    const c = this._hash(ix, iy + 1);
    const d = this._hash(ix + 1, iy + 1);

    return (
      a + u * (b - a) + v * (c - a) + u * v * (a - b - c + d)
    ) * 2 - 1;
  }

  _hash(x, y) {
    // Fast integer hash
    let n = x + y * 57;
    n = (n << 13) ^ n;
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
  }

  // ─────────────────────────────────────────────────────────────
  // DRAW METHODS
  // ─────────────────────────────────────────────────────────────

  _clearCanvas() {
    this.ctx.clearRect(0, 0, this.W, this.H);
  }

  /**
   * Draw fluid ribbon — each ribbon is a bezier curve with
   * noise-driven control points, shifted by mouse parallax
   */
  _drawRibbon(ribbon, t) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const isDark = this.theme === 'dark';

    // Mouse parallax offset
    const mx = (this.mouse.x / W - 0.5) * 60 * ribbon.depth;
    const my = (this.mouse.y / H - 0.5) * 30 * ribbon.depth;

    // Scroll parallax
    const sy = this.scrollY * ribbon.depth * 0.08;

    // Noise-driven y modulation
    const noiseVal = this._noise(
      ribbon.noiseX + t * ribbon.speed * 30,
      ribbon.noiseY + t * ribbon.speed * 15
    );
    const noiseVal2 = this._noise(
      ribbon.noiseX + t * ribbon.speed * 25 + 5,
      ribbon.noiseY + t * ribbon.speed * 12 + 5
    );

    const yCenter = ribbon.yBase * H + my - sy + noiseVal * 80;
    const yWave = noiseVal2 * 120;
    const ribbonH = ribbon.spread * H * 0.5;

    // Control points for the bezier ribbon
    const x0 = -W * 0.1 + mx;
    const x1 = W * 0.3 + mx * 0.5;
    const x2 = W * 0.7 + mx * 0.3;
    const x3 = W * 1.1 + mx * 0.1;

    const cp1x = W * 0.25;
    const cp1y = yCenter - ribbonH * 0.5 + yWave + my;
    const cp2x = W * 0.6;
    const cp2y = yCenter + ribbonH * 0.5 - yWave + my;

    // Build ribbon as a filled shape (two bezier curves)
    ctx.beginPath();
    ctx.moveTo(x0, yCenter - ribbonH);
    ctx.bezierCurveTo(cp1x, cp1y - ribbonH, cp2x, cp2y - ribbonH * 0.6, x3, yCenter);
    ctx.bezierCurveTo(cp2x, cp2y + ribbonH * 0.6, cp1x, cp1y + ribbonH, x0, yCenter + ribbonH);
    ctx.closePath();

    // Gradient fill — dark vs light mode
    let grad;
    if (isDark) {
      grad = ctx.createLinearGradient(x0, yCenter, x3, yCenter + ribbonH);
      grad.addColorStop(0, `rgba(99,102,241,${ribbon.alpha * 1.4})`);
      grad.addColorStop(0.4, `rgba(139,92,246,${ribbon.alpha})`);
      grad.addColorStop(0.7, `rgba(99,102,241,${ribbon.alpha * 0.6})`);
      grad.addColorStop(1, `rgba(79,70,229,${ribbon.alpha * 0.2})`);
    } else {
      // Light mode: soft pastel indigo ribbons
      grad = ctx.createLinearGradient(x0, yCenter, x3, yCenter + ribbonH);
      grad.addColorStop(0, `rgba(99,102,241,${ribbon.alpha * 0.5})`);
      grad.addColorStop(0.4, `rgba(139,92,246,${ribbon.alpha * 0.35})`);
      grad.addColorStop(0.7, `rgba(165,138,252,${ribbon.alpha * 0.25})`);
      grad.addColorStop(1, `rgba(196,181,253,${ribbon.alpha * 0.1})`);
    }

    ctx.fillStyle = grad;
    ctx.fill();
  }

  /**
   * Draw ambient depth particles — subtle floating dots
   * that shift slightly with mouse position
   */
  _drawParticles(t) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const isDark = this.theme === 'dark';

    for (const p of this.particles) {
      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      // Mouse parallax (subtle)
      const mx = (this.mouse.x / W - 0.5) * 20 * p.depth;
      const my = (this.mouse.y / H - 0.5) * 15 * p.depth;

      // Pulse alpha over time
      const pulse = Math.sin(t * 0.001 + p.phase) * 0.3 + 0.7;
      const alpha = p.alpha * pulse;

      ctx.beginPath();
      ctx.arc(p.x + mx, p.y + my, p.size, 0, Math.PI * 2);

      if (isDark) {
        ctx.fillStyle = `rgba(139,92,246,${alpha})`;
      } else {
        ctx.fillStyle = `rgba(99,102,241,${alpha * 0.45})`;
      }
      ctx.fill();
    }
  }

  /**
   * Draw a large ambient radial glow — gives the background
   * its "cinematic depth" feel, tracking mouse softly
   */
  _drawAmbientGlow(t) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const isDark = this.theme === 'dark';

    // Gentle pulse
    const pulse = Math.sin(t * 0.0008) * 0.15 + 0.85;

    // Glow follows mouse with heavy lag
    const gx = this.mouse.x || W * 0.35;
    const gy = this.mouse.y || H * 0.4;

    const r = Math.max(W, H) * 0.7 * pulse;

    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);

    if (isDark) {
      grad.addColorStop(0, 'rgba(99,102,241,0.06)');
      grad.addColorStop(0.4, 'rgba(139,92,246,0.03)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, 'rgba(99,102,241,0.035)');
      grad.addColorStop(0.4, 'rgba(196,181,253,0.02)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER LOOP
  // ─────────────────────────────────────────────────────────────

  _render(now) {
    if (!this.running) return;

    const t = now - this.startTime;

    // Smooth lerp for mouse (spring-like)
    const lerpFactor = 0.06;
    this.mouse.x += (this.mouse.tx - this.mouse.x) * lerpFactor;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * lerpFactor;

    // Smooth scroll lerp
    this.scrollY += (this.scrollTarget - this.scrollY) * 0.08;

    this._clearCanvas();

    if (this.quality !== 'off') {
      // 1. Ambient glow (bottom layer)
      this._drawAmbientGlow(t);

      // 2. Fluid ribbons
      for (const ribbon of this.ribbons) {
        this._drawRibbon(ribbon, t);
      }

      // 3. Depth particles (top layer)
      this._drawParticles(t);
    }

    this.raf = requestAnimationFrame(this._render);
  }
}
