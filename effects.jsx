import { useEffect, useRef, useState, useCallback } from "react";

/* ==============================================================
   PREMIUM VISUAL EFFECTS LAYER
   Pure React + native browser APIs only (Canvas2D + CSS 3D transforms).
   No extra runtime dependencies — everything here is additive and
   safe to drop into existing screens without touching app logic.
   ============================================================== */

/** Tracks the user's reduced-motion preference (live-updating). */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/**
 * Ambient particle / constellation background rendered on a <canvas>.
 * Sits at z-index:-1 inside its (position:relative) parent so it never
 * intercepts clicks or sits above real UI. Pauses when the tab is hidden
 * and renders a single static frame under reduced-motion.
 */
export function ParticleField({ density = 60, colors, interactive = true, className = "", style = {} }) {
  const canvasRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const paletteRef = useRef(colors || ["#19e7ff", "#9b6bff", "#ff2bb5"]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let raf = null;
    let particles = [];
    let visible = typeof document !== "undefined" ? !document.hidden : true;
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const palette = paletteRef.current;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.max(14, Math.round(((width * height) / 16000) * (density / 60))));
      particles = Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        c: palette[Math.floor(Math.random() * palette.length)],
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onVisibility = () => { visible = !document.hidden; };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.015;
        if (p.x < -12) p.x = width + 12; else if (p.x > width + 12) p.x = -12;
        if (p.y < -12) p.y = height + 12; else if (p.y > height + 12) p.y = -12;
        if (interactive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12000) {
            const f = (12000 - d2) / 12000;
            p.x += dx * 0.012 * f;
            p.y += dy * 0.012 * f;
          }
        }
        const alpha = Math.max(0.08, 0.35 + Math.sin(p.tw) * 0.25);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 5400) {
            ctx.strokeStyle = `rgba(124,236,255,${0.12 * (1 - d2 / 5400)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (interactive && !reduced) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerleave", onPointerLeave);
    }

    if (reduced) {
      draw();
    } else {
      const loop = () => {
        if (visible) draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [density, interactive, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`rf-particle-canvas ${className}`}
      style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", ...style }}
    />
  );
}

/**
 * A small glowing, glass-faceted 3D object built entirely from CSS
 * transforms (perspective + preserve-3d + translateZ). Auto-rotates
 * gently and tilts toward the cursor for a premium "hero" feel.
 * Purely decorative — pointer-events are disabled.
 */
export function Hero3D({ size = 240, className = "", style = {} }) {
  const reduced = usePrefersReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced) return undefined;
    let raf = null;
    let target = { x: 0, y: 0 };
    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      target = { x: ny * -9, y: nx * 13 };
    };
    const loop = () => {
      setTilt((t) => ({
        x: t.x + (target.x - t.x) * 0.06,
        y: t.y + (target.y - t.y) * 0.06,
      }));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div className={`rf-hero3d ${className}`} style={{ width: size, height: size, ...style }}>
      <div
        className="rf-hero3d-tilt"
        style={{ transform: reduced ? "none" : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="rf-hero3d-spin">
          <div className="rf-hero3d-core" />
          <div className="rf-hero3d-ring a" />
          <div className="rf-hero3d-ring b" />
          <div className="rf-hero3d-ring c" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rf-hero3d-shard" style={{ "--i": i }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Real-time pointer-driven 3D tilt for cards/buttons. Spread the
 * returned handlers + style onto any element to make it track the
 * cursor with a smooth perspective tilt + specular glare highlight.
 * No-ops gracefully under reduced-motion.
 */
export function useTilt({ max = 9, glare = true, scale = 1.015 } = {}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [state, setState] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  const onPointerMove = useCallback((e) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setState({
      rx: (0.5 - py) * max * 2,
      ry: (px - 0.5) * max * 2,
      mx: px * 100,
      my: py * 100,
      active: true,
    });
  }, [max, reduced]);

  const onPointerLeave = useCallback(() => {
    setState((s) => ({ ...s, rx: 0, ry: 0, active: false }));
  }, []);

  const style = reduced
    ? {}
    : {
      transform: `perspective(900px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) ${state.active ? `scale(${scale})` : "scale(1)"}`,
      transition: state.active ? "transform .08s linear" : "transform .45s cubic-bezier(.16,1,.3,1)",
      "--glare-x": `${state.mx}%`,
      "--glare-y": `${state.my}%`,
      "--glare-o": glare && state.active ? 0.5 : 0,
    };

  return { ref, onPointerMove, onPointerLeave, style, active: state.active };
}

/**
 * Fades + slides children in the first time they scroll into view.
 * Renders visible immediately under reduced-motion (no observer needed).
 */
export function Reveal({ children, delay = 0, y = 16, once = true, className = "", style = {} }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) { setVisible(true); return undefined; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return undefined; }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, once]);

  return (
    <div
      ref={ref}
      className={`rf-reveal-io ${className}`}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}s, transform .7s cubic-bezier(.16,1,.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
