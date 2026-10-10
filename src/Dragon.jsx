import { useEffect, useRef } from "react";

const SEGMENTS = 46; // number of body beads (head = 0, tail tip = last)
const WING_AT = 6; // which bead the wings grow from
const RIBS = 7; // ribs in each wing fan
const WING_LEN = 86; // wing size in px

/**
 * Builds the wing fan: ribs radiate from the origin and a scalloped
 * outline joins the rib tips with quadratic curves (same idea as the
 * sample code: pull each control point toward the origin).
 */
function buildWing(len) {
  const start = 0.32 * Math.PI;
  const end = 0.92 * Math.PI;
  const tips = [];
  for (let i = 0; i < RIBS; i++) {
    const t = i / (RIBS - 1);
    const angle = start + (end - start) * t;
    const radius = len * (0.7 + 0.3 * Math.sin(t * Math.PI));
    tips.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  let outline = `M0 0 L${tips[0][0].toFixed(1)} ${tips[0][1].toFixed(1)}`;
  let ribs = "";
  tips.forEach(([x, y], i) => {
    ribs += `M0 0 L${x.toFixed(1)} ${y.toFixed(1)} `;
    if (i > 0) {
      const [px, py] = tips[i - 1];
      const cx = (px + x) * 0.5 * 0.75;
      const cy = (py + y) * 0.5 * 0.75;
      outline += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });
  outline += " Z";
  return { outline, ribs };
}

/** Bead radius: thick near the neck, thin dotted trail at the tail. */
function beadRadius(i) {
  return Math.max(1, 6.5 * Math.pow(1 - i / SEGMENTS, 1.2) + 0.8);
}

export default function Dragon() {
  const beadRefs = useRef([]);
  const spineRef = useRef(null);
  const headRef = useRef(null);
  const wingRefs = useRef([null, null]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wing = buildWing(WING_LEN);

    // draw the wing shapes once, they only rotate after that
    wingRefs.current.forEach((g) => {
      g.children[0].setAttribute("d", wing.outline);
      g.children[1].setAttribute("d", wing.ribs);
    });

    // physics positions (the chain) and drawn positions (chain + wave)
    const pts = Array.from({ length: SEGMENTS }, () => ({
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
    }));
    const draw = pts.map((p) => ({ ...p }));

    const mouse = {
      x: window.innerWidth * 0.65,
      y: window.innerHeight * 0.4,
      last: performance.now() - 10000, // start in idle-wander mode
    };

    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      mouse.x = p.clientX;
      mouse.y = p.clientY;
      mouse.last = performance.now();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchstart", onMove, { passive: true });

    let raf;
    let prev = performance.now();
    let phase = 0;

    const frame = (now) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const t = now / 1000;

      // 1. where is the head going?
      let tx = mouse.x;
      let ty = mouse.y;
      if (!reduceMotion && now - mouse.last > 3500) {
        // no movement for a while: glide in a lazy figure-eight
        tx = window.innerWidth / 2 + Math.cos(t * 0.8) * window.innerWidth * 0.3;
        ty = window.innerHeight / 2 + Math.sin(t * 1.6) * window.innerHeight * 0.2;
      }

      // 2. ease the head toward the target
      const hx = pts[0].x;
      const hy = pts[0].y;
      pts[0].x += (tx - hx) * 0.09;
      pts[0].y += (ty - hy) * 0.09;
      const speed = Math.hypot(pts[0].x - hx, pts[0].y - hy);

      // 3. every bead follows the one in front of it at a fixed gap
      for (let i = 1; i < SEGMENTS; i++) {
        const a = pts[i - 1];
        const p = pts[i];
        const dx = p.x - a.x;
        const dy = p.y - a.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const gap = Math.max(5, 12 - i * 0.14);
        p.x = a.x + (dx / d) * gap;
        p.y = a.y + (dy / d) * gap;
      }

      // 4. add a snake-like wave sideways (drawing only)
      for (let i = 0; i < SEGMENTS; i++) {
        const a = pts[Math.max(i - 1, 0)];
        const b = pts[Math.min(i + 1, SEGMENTS - 1)];
        let nx = -(a.y - b.y);
        let ny = a.x - b.x;
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        const sway = Math.sin(t * 4 - i * 0.45) * Math.min(i, 20) * 0.35;
        draw[i].x = pts[i].x + nx * sway;
        draw[i].y = pts[i].y + ny * sway;
      }

      // 5. update the SVG
      let spine = "";
      for (let i = 0; i < SEGMENTS; i++) {
        const c = beadRefs.current[i];
        c.setAttribute("cx", draw[i].x.toFixed(1));
        c.setAttribute("cy", draw[i].y.toFixed(1));
        spine += (i === 0 ? "M" : "L") + draw[i].x.toFixed(1) + " " + draw[i].y.toFixed(1) + " ";
      }
      spineRef.current.setAttribute("d", spine);

      // head points the way it is travelling
      const headAngle = Math.atan2(draw[0].y - draw[2].y, draw[0].x - draw[2].x);
      headRef.current.setAttribute(
        "transform",
        `translate(${draw[0].x.toFixed(1)} ${draw[0].y.toFixed(1)}) rotate(${(
          (headAngle * 180) /
          Math.PI
        ).toFixed(1)})`
      );

      // wings flap faster when the dragon moves faster
      phase += dt * (3 + Math.min(speed, 25) * 0.25);
      const flap = Math.sin(phase) * 22;
      const bodyAngle =
        Math.atan2(draw[WING_AT - 2].y - draw[WING_AT + 2].y, draw[WING_AT - 2].x - draw[WING_AT + 2].x);
      const deg = (bodyAngle * 180) / Math.PI;
      const root = draw[WING_AT];
      [1, -1].forEach((side, k) => {
        wingRefs.current[k].setAttribute(
          "transform",
          `translate(${root.x.toFixed(1)} ${root.y.toFixed(1)}) rotate(${deg.toFixed(1)}) scale(1 ${side}) rotate(${flap.toFixed(1)})`
        );
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchstart", onMove);
    };
  }, []);

  return (
    <svg className="dragon" role="img" aria-label="A glowing orange dragon that follows the cursor">
      <defs>
        <radialGradient id="bead">
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset="0.45" stopColor="#ffb347" />
          <stop offset="1" stopColor="#ff4d00" />
        </radialGradient>
        <linearGradient id="wingFill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-30" y2="90">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff5a00" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#glow)">
        {/* wings first so the body sits on top */}
        {[0, 1].map((k) => (
          <g key={k} ref={(el) => (wingRefs.current[k] = el)}>
            <path fill="url(#wingFill)" fillOpacity="0.85" stroke="#ff8a1f" strokeWidth="1.2" strokeLinejoin="round" />
            <path fill="none" stroke="#7a1d00" strokeOpacity="0.7" strokeWidth="1" />
          </g>
        ))}

        <path ref={spineRef} fill="none" stroke="#ff6a1a" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />

        {Array.from({ length: SEGMENTS }, (_, i) => (
          <circle key={i} ref={(el) => (beadRefs.current[i] = el)} r={beadRadius(i)} fill="url(#bead)" />
        ))}

        {/* head: snout, two horns, two eyes (x axis = forward) */}
        <g ref={headRef}>
          <polygon points="18,0 -6,-9 -1,0 -6,9" fill="#ff7a00" stroke="#ffd27a" strokeWidth="1" strokeLinejoin="round" />
          <path d="M-2 -6 L-15 -14 M-2 6 L-15 14" stroke="#ffb347" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="4" cy="-3" r="1.6" fill="#fff" />
          <circle cx="4" cy="3" r="1.6" fill="#fff" />
        </g>
      </g>
    </svg>
  );
}
