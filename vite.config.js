import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the built site work from any sub-path (GitHub Pages, Netlify, Vercel)
export default defineConfig({
  plugins: [react()],
  base: "./",
});
