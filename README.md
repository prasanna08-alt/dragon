# Cyber Dragon

A glowing orange dragon drawn with SVG that follows your cursor.
Built with React + Vite.

## Run it

```bash
npm install
npm run dev
```

Open the address shown in the terminal (usually http://localhost:5173) and move the mouse.

## How it works (Step 1: follow the cursor)

- `Dragon.jsx` draws the dragon as SVG: beads for the body, a head, and two wing fans.
- A `requestAnimationFrame` loop runs about 60 times a second.
  1. The head eases toward the mouse (`pts[0] += (target - pts[0]) * 0.09`).
  2. Each bead follows the bead in front of it at a fixed gap.
  3. A sine wave adds a sideways wiggle.
  4. Wings flap with `Math.sin(phase)`, faster when the dragon moves faster.
- The wing shape uses ribs plus `Q` (quadratic curve) edges, the same idea as the sample code.
- With no mouse movement for 3.5s, the dragon glides on its own.

## Build and publish

```bash
npm run build      # creates the dist/ folder
```

Upload the **source** (not `node_modules`, not `dist`) to GitHub.
For GitHub Pages: Settings > Pages > Source = GitHub Actions, or push the contents of `dist/` to a `gh-pages` branch.
