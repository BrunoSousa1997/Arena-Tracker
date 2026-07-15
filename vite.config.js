import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  // "svgr" permite importar um .svg como componente React
  // (import Trophy from "./x.svg?react") em vez de como URL — é o que deixa
  // os emblemas das conquistas (src/assets/achievements/) manter o
  // "currentColor" e por isso serem tingidos pela cor do escalão. Com um
  // <img src="x.svg"> normal isso não seria possível: o browser trata o
  // ficheiro como imagem externa e a cor ficaria congelada no ficheiro.
  plugins: [react(), tailwindcss(), svgr()],
  base: "./"
});